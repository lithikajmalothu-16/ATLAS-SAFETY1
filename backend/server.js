// Load environment variables (must be first)
require("dotenv").config({ path: "./.env" });

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3001;

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());

// =====================
// Gemini Initialization
// =====================
if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview"
});

// =====================
// Google Sheets Setup
// =====================
const auth = new google.auth.GoogleAuth({
  keyFile: './service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// =====================
// Utilities
// =====================
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ JSON parse failed. Raw output:\n", text);
    throw new Error("Invalid JSON returned from Gemini");
  }
}

// =====================
// Gemini Analysis
// =====================
async function analyzeHazard(transcript) {
  const prompt = `
You are a safety assistant for construction workers.
Analyze the following voice transcript and extract structured safety data.

Transcript:
"${transcript}"

Respond ONLY with raw JSON.
Do not include markdown, backticks, comments, or explanations.

Schema:
{
  "zone": "Zone number (1-4) or 'Unknown'",
  "hazardType": "Brief description of the hazard",
  "severity": number between 0 and 100,
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "aiNotes": "Brief explanation of the risk assessment"
}

Rules:
- Severity represents danger level (higher = more dangerous)
- severity >= 90 → HIGH
- severity 70–89 → MEDIUM
- severity < 70 → LOW
- Extract zone from phrases like "Zone 3", "zone three", "upper scaffold" (Zone 3)
- Extract severity from phrases like "80%", "80 percent", "mostly stable" (~85)
- If data is missing, infer reasonably and note uncertainty in aiNotes
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    return safeJsonParse(responseText);
  } catch (error) {
    console.error("❌ Gemini API error:", error);
    throw error;
  }
}

// =====================
// Google Sheets Logging
// =====================
async function writeToSheet(analysis) {
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    month: '2-digit',
    day: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const values = [[
    timestamp,                    // Timestamp
    'Demo Worker',                // Worker (hardcoded for now)
    analysis.zone,                // Zone
    analysis.hazardType,          // Hazard Type
    analysis.severity,            // Severity (%)
    analysis.riskLevel,           // Risk Level
    analysis.aiNotes,
    'Open'             // AI Notes
  ]];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H',
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log('✅ Written to Google Sheets:', response.data.updates.updatedRows, 'row(s)');
    return response.data;
  } catch (error) {
    console.error('❌ Google Sheets error:', error);
    throw error;
  }
}

// =====================
// Routes
// =====================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/process-voice", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (typeof transcript !== "string" || transcript.trim().length < 10) {
      return res.status(400).json({
        error: "Transcript too short or invalid"
      });
    }

    console.log("📝 Transcript received:", transcript);
    console.log("🤖 Analyzing with Gemini...");
    
    const analysis = await analyzeHazard(transcript);
    
    console.log("✅ Gemini analysis:", analysis);

    // Write to Google Sheets
    console.log("📊 Writing to Google Sheets...");
    await writeToSheet(analysis);

    res.json({
      success: true,
      transcript,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error processing voice:", error);
    res.status(500).json({
      error: "Failed to process voice input",
      details: error.message
    });
  }
});

// =====================
// Server Start
// =====================
app.listen(PORT, () => {
  console.log('🚀 ATLAS Backend running on http://localhost:${PORT}');
  console.log('📊 Google Sheets ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? "Configured ✅" : "Missing ❌"}');
  console.log('🤖 Gemini API: ${process.env.GEMINI_API_KEY ? "Configured ✅" : "Missing ❌"}');
});