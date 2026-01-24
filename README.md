# Akai - AI Screen Assistant

Your friendly AI buddy that can see your screen and help with anything.

## Overview

Akai is an AI-powered screen assistant that can:
- 🎤 Listen to users via voice
- 📺 See user's screen through screen sharing
- 🤖 Analyze problems using Claude Vision AI
- 🔊 Respond with voice and text
- 💬 Have natural conversations about IT issues

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure API Keys

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add:
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com/
- `OPENAI_API_KEY` - Get from https://platform.openai.com/

### 3. Run the Server

```bash
cd backend
python run.py
```

### 4. Open in Browser

Go to: http://localhost:8000

## Features (Phase 1)

- ✅ Session management with short codes
- ✅ Text chat with Claude AI
- ✅ Screen sharing via WebRTC
- ✅ Screenshot capture and analysis
- ✅ Voice input (Whisper STT)
- ✅ Voice output (OpenAI TTS)
- ✅ Real-time WebSocket communication

## Project Structure

```
it-support-agent/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   └── services/
│   │       ├── claude_service.py    # Claude Vision & Chat
│   │       ├── speech_service.py    # Whisper STT & TTS
│   │       └── session_manager.py   # Session handling
│   ├── requirements.txt
│   ├── run.py
│   └── .env
├── frontend/
│   ├── templates/
│   │   └── index.html
│   └── static/
│       ├── css/style.css
│       └── js/app.js
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/api/session/create` | POST | Create new session |
| `/api/session/join` | POST | Join with code |
| `/api/chat` | POST | Send chat message |
| `/api/screen/analyze` | POST | Analyze screenshot |
| `/api/voice/transcribe` | POST | Speech to text |
| `/api/voice/synthesize` | POST | Text to speech |
| `/ws/{session_id}` | WS | Real-time communication |

## Usage

1. **Start a Session**: Click "Start New Session" or enter a code
2. **Describe Your Problem**: Type or speak your issue
3. **Share Screen**: Click "Share Screen" to let AI see your computer
4. **Get Help**: AI will analyze and guide you step by step

## Next Phases

- **Phase 2**: Core AI improvements, task planning
- **Phase 3**: Mouse/keyboard control, camera integration
- **Phase 4**: Enterprise deployment, MDM support

## License

Internal use only.
