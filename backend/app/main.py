"""
IT Support Agent - Main FastAPI Application
Phase 1: Foundation
"""

import os
import uuid
import base64
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from app.services.claude_service import ClaudeService
from app.services.speech_service import SpeechService
from app.services.session_manager import SessionManager

# Initialize services
claude_service = ClaudeService()
speech_service = SpeechService()
session_manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("🚀 IT Support Agent starting up...")
    print(f"📍 Server running at http://localhost:{os.getenv('PORT', 8000)}")
    yield
    print("👋 IT Support Agent shutting down...")


# Create FastAPI app
app = FastAPI(
    title="IT Support Agent",
    description="AI-Powered IT Support Agent - Phase 1",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
templates = Jinja2Templates(directory="../frontend/templates")


# ============================================================================
# REST API Endpoints
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the main web interface"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/session/create")
async def create_session():
    """Create a new support session"""
    session = session_manager.create_session()
    return {
        "session_id": session["id"],
        "code": session["code"],
        "created_at": session["created_at"],
        "message": "Session created successfully"
    }


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/session/join")
async def join_session(code: str = Form(...)):
    """Join a session using short code"""
    session = session_manager.get_session_by_code(code)
    if not session:
        raise HTTPException(status_code=404, detail="Invalid session code")
    return {
        "session_id": session["id"],
        "message": "Joined session successfully"
    }


@app.post("/api/voice/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), session_id: str = Form(...)):
    """Transcribe audio using Whisper API"""
    try:
        # Read audio data
        audio_data = await audio.read()

        # Transcribe using Whisper
        transcript = await speech_service.transcribe(audio_data, audio.filename)

        # Add to session history
        session_manager.add_message(session_id, "user", transcript)

        return {
            "transcript": transcript,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice/synthesize")
async def synthesize_speech(text: str = Form(...)):
    """Convert text to speech using TTS"""
    try:
        audio_base64 = await speech_service.synthesize(text)
        return {
            "audio": audio_base64,
            "format": "mp3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/screen/analyze")
async def analyze_screen(
    screenshot: UploadFile = File(...),
    session_id: str = Form(...),
    user_message: Optional[str] = Form(None)
):
    """Analyze screenshot using Claude Vision"""
    try:
        # Read image data
        image_data = await screenshot.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # Get session context
        session = session_manager.get_session(session_id)
        conversation_history = session.get("messages", []) if session else []

        # Analyze with Claude Vision
        analysis = await claude_service.analyze_screen(
            image_base64=image_base64,
            user_message=user_message,
            conversation_history=conversation_history
        )

        # Add AI response to session
        session_manager.add_message(session_id, "assistant", analysis["response"])

        return {
            "response": analysis["response"],
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(
    message: str = Form(...),
    session_id: str = Form(...),
    screenshot: Optional[UploadFile] = File(None)
):
    """Chat with AI assistant, optionally with screenshot"""
    try:
        # Get session context
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        conversation_history = session.get("messages", [])

        # Add user message to history
        session_manager.add_message(session_id, "user", message)

        # Process with or without screenshot
        if screenshot:
            image_data = await screenshot.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')

            response = await claude_service.analyze_screen(
                image_base64=image_base64,
                user_message=message,
                conversation_history=conversation_history
            )
        else:
            response = await claude_service.chat(
                message=message,
                conversation_history=conversation_history
            )

        # Add AI response to session
        session_manager.add_message(session_id, "assistant", response["response"])

        return {
            "response": response["response"],
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WebSocket for Real-time Communication
# ============================================================================

class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        print(f"✅ Client connected: {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            print(f"❌ Client disconnected: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(websocket, session_id)

    try:
        while True:
            data = await websocket.receive_json()

            # Handle different message types
            msg_type = data.get("type")

            if msg_type == "screen_share":
                # Received screen frame
                frame_data = data.get("frame")
                user_message = data.get("message")

                if frame_data and user_message:
                    # Analyze screen with Claude
                    response = await claude_service.analyze_screen(
                        image_base64=frame_data,
                        user_message=user_message,
                        conversation_history=session_manager.get_session(session_id).get("messages", [])
                    )

                    session_manager.add_message(session_id, "assistant", response["response"])

                    await manager.send_message(session_id, {
                        "type": "ai_response",
                        "response": response["response"]
                    })

            elif msg_type == "voice":
                # Received voice data (base64 encoded)
                audio_data = base64.b64decode(data.get("audio", ""))

                # Transcribe
                transcript = await speech_service.transcribe(audio_data)

                session_manager.add_message(session_id, "user", transcript)

                await manager.send_message(session_id, {
                    "type": "transcript",
                    "text": transcript
                })

            elif msg_type == "chat":
                # Text chat message
                message = data.get("message")
                session = session_manager.get_session(session_id)

                session_manager.add_message(session_id, "user", message)

                response = await claude_service.chat(
                    message=message,
                    conversation_history=session.get("messages", [])
                )

                session_manager.add_message(session_id, "assistant", response["response"])

                await manager.send_message(session_id, {
                    "type": "ai_response",
                    "response": response["response"]
                })

            elif msg_type == "ping":
                await manager.send_message(session_id, {"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(session_id)


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "phase": "1 - Foundation"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "true").lower() == "true"
    )
