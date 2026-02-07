# ATLAS - Voice-Guided Safety Sentinel

## Core Promise
Construction workers speak safety checks → AI logs automatically → AI warns out loud → Supervisors see live data

## Tech Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Voice In: Web Speech API
- AI: Google Gemini API
- Database: Google Sheets API
- Voice Out: ElevenLabs API
- Deploy: Vercel (frontend) + Render (backend)

## Data Model
*Sheet Name*: ATLAS – Safety Logs

*Columns*: Timestamp | Worker | Zone | Hazard Type | Severity (%) | Risk Level | AI Notes

*Zones*: Zone 1-Ground, Zone 2-Mid Scaffold, Zone 3-Upper Scaffold, Zone 4-Roof

## Demo Flow
1. Worker speaks: "Scaffold shaky in Zone 3, 80% stable"
2. System transcribes
3. Gemini extracts: zone, hazard, severity, risk
4. Writes to Sheet
5. ElevenLabs speaks warning
6. Supervisor sees update

## Risk Logic
- Severity < 90% → HIGH
- Repeat hazard in zone → escalate
- Gemini generates summary

## What Works
✅ Voice input, Sheets logging, AI response, audio playback

## What Doesn't
❌ Real sensors, GPS, OSHA automation, ML models

## Design Inspiration
- Dark hero section with construction site background
- Bold white typography on dark overlay
- Glassmorphism cards (frosted glass effect)
- Minimal icons (mic, document, brain, warning, eye)
- Clean stat cards (100%, <3s, Real-Time)
- High contrast, professional, construction-meets-tech aesthetic

## MVP Success
- Voice command logs to Sheet live
- AI voice responds with appropriate tone
- Supervisor view shows data
- Demo under 60 seconds