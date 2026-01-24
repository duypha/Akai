"""
Database Service - SQLite persistence for sessions, KB feedback, and tasks
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from contextlib import contextmanager


class Database:
    """SQLite database for persistent storage"""

    def __init__(self, db_path: str = "data/support_agent.db"):
        self.db_path = db_path

        # Ensure data directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        self._init_db()

    @contextmanager
    def _get_conn(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _init_db(self):
        """Initialize database tables"""
        with self._get_conn() as conn:
            cursor = conn.cursor()

            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    code TEXT UNIQUE,
                    created_at TEXT,
                    updated_at TEXT,
                    messages TEXT DEFAULT '[]'
                )
            """)

            # KB feedback table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kb_feedback (
                    solution_id TEXT PRIMARY KEY,
                    success_count INTEGER DEFAULT 0,
                    failure_count INTEGER DEFAULT 0,
                    updated_at TEXT
                )
            """)

            # Task plans table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_plans (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    title TEXT,
                    description TEXT,
                    template_id TEXT,
                    status TEXT DEFAULT 'created',
                    steps TEXT DEFAULT '[]',
                    created_at TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id)
                )
            """)

            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_plans_session ON task_plans(session_id)")

    # ========================================================================
    # Sessions
    # ========================================================================

    def save_session(self, session_id: str, code: str, messages: List[Dict] = None):
        """Save or update a session"""
        now = datetime.now().isoformat()
        messages_json = json.dumps(messages or [])

        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (id, code, created_at, updated_at, messages)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    updated_at = excluded.updated_at,
                    messages = excluded.messages
            """, (session_id, code, now, now, messages_json))

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get a session by ID"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()

            if row:
                return {
                    "id": row["id"],
                    "code": row["code"],
                    "created_at": row["created_at"],
                    "messages": json.loads(row["messages"])
                }
        return None

    def get_session_by_code(self, code: str) -> Optional[Dict]:
        """Get a session by short code"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions WHERE code = ?", (code,))
            row = cursor.fetchone()

            if row:
                return {
                    "id": row["id"],
                    "code": row["code"],
                    "created_at": row["created_at"],
                    "messages": json.loads(row["messages"])
                }
        return None

    def update_session_messages(self, session_id: str, messages: List[Dict]):
        """Update session messages"""
        now = datetime.now().isoformat()
        messages_json = json.dumps(messages)

        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions SET messages = ?, updated_at = ?
                WHERE id = ?
            """, (messages_json, now, session_id))

    # ========================================================================
    # KB Feedback
    # ========================================================================

    def get_solution_feedback(self, solution_id: str) -> Dict:
        """Get feedback stats for a solution"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM kb_feedback WHERE solution_id = ?", (solution_id,))
            row = cursor.fetchone()

            if row:
                return {
                    "solution_id": row["solution_id"],
                    "success_count": row["success_count"],
                    "failure_count": row["failure_count"]
                }
        return {"solution_id": solution_id, "success_count": 0, "failure_count": 0}

    def record_solution_feedback(self, solution_id: str, success: bool):
        """Record feedback for a solution"""
        now = datetime.now().isoformat()

        with self._get_conn() as conn:
            cursor = conn.cursor()

            # Get current counts
            cursor.execute("SELECT * FROM kb_feedback WHERE solution_id = ?", (solution_id,))
            row = cursor.fetchone()

            if row:
                if success:
                    cursor.execute("""
                        UPDATE kb_feedback
                        SET success_count = success_count + 1, updated_at = ?
                        WHERE solution_id = ?
                    """, (now, solution_id))
                else:
                    cursor.execute("""
                        UPDATE kb_feedback
                        SET failure_count = failure_count + 1, updated_at = ?
                        WHERE solution_id = ?
                    """, (now, solution_id))
            else:
                cursor.execute("""
                    INSERT INTO kb_feedback (solution_id, success_count, failure_count, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (solution_id, 1 if success else 0, 0 if success else 1, now))

    def get_all_feedback(self) -> List[Dict]:
        """Get all solution feedback for loading into KB"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM kb_feedback")
            rows = cursor.fetchall()

            return [{
                "solution_id": row["solution_id"],
                "success_count": row["success_count"],
                "failure_count": row["failure_count"]
            } for row in rows]

    # ========================================================================
    # Task Plans
    # ========================================================================

    def save_task_plan(self, plan: Dict):
        """Save or update a task plan"""
        now = datetime.now().isoformat()
        steps_json = json.dumps(plan.get("steps", []))

        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO task_plans (id, session_id, title, description, template_id,
                                        status, steps, created_at, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    steps = excluded.steps,
                    started_at = excluded.started_at,
                    completed_at = excluded.completed_at
            """, (
                plan["id"],
                plan.get("session_id"),
                plan.get("title"),
                plan.get("description"),
                plan.get("template_id"),
                plan.get("status", "created"),
                steps_json,
                plan.get("created_at", now),
                plan.get("started_at"),
                plan.get("completed_at")
            ))

    def get_task_plan(self, plan_id: str) -> Optional[Dict]:
        """Get a task plan by ID"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM task_plans WHERE id = ?", (plan_id,))
            row = cursor.fetchone()

            if row:
                return {
                    "id": row["id"],
                    "session_id": row["session_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "template_id": row["template_id"],
                    "status": row["status"],
                    "steps": json.loads(row["steps"]),
                    "created_at": row["created_at"],
                    "started_at": row["started_at"],
                    "completed_at": row["completed_at"]
                }
        return None

    def get_session_plans(self, session_id: str) -> List[Dict]:
        """Get all plans for a session"""
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM task_plans WHERE session_id = ?
                ORDER BY created_at DESC
            """, (session_id,))
            rows = cursor.fetchall()

            return [{
                "id": row["id"],
                "session_id": row["session_id"],
                "title": row["title"],
                "status": row["status"],
                "created_at": row["created_at"]
            } for row in rows]


# Singleton instance
db = Database()
