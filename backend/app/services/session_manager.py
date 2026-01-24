"""
Session Manager - Handles support session creation and management
"""

import os
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

load_dotenv()


class SessionManager:
    """Manages support sessions with conversation history"""

    def __init__(self):
        # In-memory session storage (would use Redis/DB in production)
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.code_to_session: Dict[str, str] = {}  # Maps short codes to session IDs
        self.timeout_minutes = int(os.getenv("SESSION_TIMEOUT_MINUTES", 30))

    def _generate_code(self, length: int = 4) -> str:
        """Generate a short numeric code for easy verbal sharing"""
        return ''.join(random.choices(string.digits, k=length))

    def _cleanup_expired_sessions(self):
        """Remove expired sessions"""
        now = datetime.now()
        expired = []

        for session_id, session in self.sessions.items():
            created_at = datetime.fromisoformat(session["created_at"])
            if now - created_at > timedelta(minutes=self.timeout_minutes):
                expired.append(session_id)

        for session_id in expired:
            self.delete_session(session_id)

    def create_session(self) -> Dict[str, Any]:
        """
        Create a new support session

        Returns:
            Session dict with id, code, and metadata
        """
        # Cleanup old sessions first
        self._cleanup_expired_sessions()

        # Generate unique ID and code
        session_id = str(uuid.uuid4())

        # Generate unique short code (retry if collision)
        code = self._generate_code()
        while code in self.code_to_session:
            code = self._generate_code()

        # Create session
        session = {
            "id": session_id,
            "code": code,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "active",
            "messages": [],
            "screenshots": [],
            "metadata": {
                "user_agent": None,
                "platform": None,
                "resolution": None
            }
        }

        # Store session
        self.sessions[session_id] = session
        self.code_to_session[code] = session_id

        print(f"📝 Created session: {session_id} (code: {code})")

        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a session by ID

        Args:
            session_id: The session UUID

        Returns:
            Session dict or None if not found
        """
        session = self.sessions.get(session_id)

        if session:
            # Update last accessed time
            session["updated_at"] = datetime.now().isoformat()

        return session

    def get_session_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """
        Get a session by short code

        Args:
            code: The 4-digit short code

        Returns:
            Session dict or None if not found
        """
        session_id = self.code_to_session.get(code)
        if session_id:
            return self.get_session(session_id)
        return None

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Add a message to session history

        Args:
            session_id: The session UUID
            role: 'user' or 'assistant'
            content: Message content
            metadata: Optional additional data

        Returns:
            True if successful, False otherwise
        """
        session = self.get_session(session_id)
        if not session:
            return False

        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }

        if metadata:
            message["metadata"] = metadata

        session["messages"].append(message)
        session["updated_at"] = datetime.now().isoformat()

        return True

    def add_screenshot(
        self,
        session_id: str,
        screenshot_data: str,
        description: Optional[str] = None
    ) -> bool:
        """
        Add a screenshot to session

        Args:
            session_id: The session UUID
            screenshot_data: Base64 encoded image
            description: Optional description of what's shown

        Returns:
            True if successful
        """
        session = self.get_session(session_id)
        if not session:
            return False

        screenshot = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "data": screenshot_data[:100] + "...",  # Store reference, not full data
            "description": description
        }

        session["screenshots"].append(screenshot)
        session["updated_at"] = datetime.now().isoformat()

        # Keep only last 20 screenshots
        if len(session["screenshots"]) > 20:
            session["screenshots"] = session["screenshots"][-20:]

        return True

    def update_metadata(
        self,
        session_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Update session metadata

        Args:
            session_id: The session UUID
            metadata: Dict of metadata to update

        Returns:
            True if successful
        """
        session = self.get_session(session_id)
        if not session:
            return False

        session["metadata"].update(metadata)
        session["updated_at"] = datetime.now().isoformat()

        return True

    def set_status(self, session_id: str, status: str) -> bool:
        """
        Update session status

        Args:
            session_id: The session UUID
            status: New status (active, resolved, escalated, closed)

        Returns:
            True if successful
        """
        session = self.get_session(session_id)
        if not session:
            return False

        valid_statuses = ["active", "resolved", "escalated", "closed"]
        if status not in valid_statuses:
            return False

        session["status"] = status
        session["updated_at"] = datetime.now().isoformat()

        print(f"📊 Session {session_id} status changed to: {status}")

        return True

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session

        Args:
            session_id: The session UUID

        Returns:
            True if deleted, False if not found
        """
        session = self.sessions.get(session_id)
        if not session:
            return False

        # Remove code mapping
        code = session.get("code")
        if code and code in self.code_to_session:
            del self.code_to_session[code]

        # Remove session
        del self.sessions[session_id]

        print(f"🗑️ Deleted session: {session_id}")

        return True

    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a summary of the session for handoff

        Args:
            session_id: The session UUID

        Returns:
            Summary dict or None
        """
        session = self.get_session(session_id)
        if not session:
            return None

        # Extract key information
        messages = session.get("messages", [])
        user_messages = [m for m in messages if m["role"] == "user"]

        return {
            "session_id": session_id,
            "code": session.get("code"),
            "created_at": session.get("created_at"),
            "duration_minutes": self._calculate_duration(session),
            "status": session.get("status"),
            "message_count": len(messages),
            "user_problem": user_messages[0]["content"] if user_messages else "Unknown",
            "last_message": messages[-1]["content"] if messages else None,
            "screenshot_count": len(session.get("screenshots", []))
        }

    def _calculate_duration(self, session: Dict) -> int:
        """Calculate session duration in minutes"""
        created = datetime.fromisoformat(session["created_at"])
        updated = datetime.fromisoformat(session["updated_at"])
        return int((updated - created).total_seconds() / 60)

    def get_all_active_sessions(self) -> List[Dict[str, Any]]:
        """
        Get all active sessions (for admin/monitoring)

        Returns:
            List of session summaries
        """
        self._cleanup_expired_sessions()

        return [
            self.get_session_summary(sid)
            for sid, session in self.sessions.items()
            if session.get("status") == "active"
        ]
