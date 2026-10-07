import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.app.config import settings

def get_db():
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        preferences TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Conversations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_action TEXT,
        tool_status TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
    """)

    # Memories
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT DEFAULT 'general',
        key TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Notifications
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        sender TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL, -- CRITICAL, IMPORTANT, NORMAL, LOW
        is_read INTEGER DEFAULT 0,
        is_simulated INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Notification Sources
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notification_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL, -- CONNECTED, NOT_CONNECTED, PERMISSION_REQUIRED
        icon TEXT,
        enabled INTEGER DEFAULT 1
    );
    """)

    # Reminders
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        due_time TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'UPCOMING', -- UPCOMING, COMPLETED, OVERDUE
        priority TEXT DEFAULT 'NORMAL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Automations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS automations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_value TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_value TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Command History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        action_type TEXT NOT NULL,
        security_level TEXT NOT NULL, -- SAFE, CONFIRMATION_REQUIRED, BLOCKED
        status TEXT NOT NULL, -- COMPLETED, FAILED, CANCELLED
        result TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # System Events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Prepopulate default notification sources if empty
    cursor.execute("SELECT COUNT(*) FROM notification_sources")
    if cursor.fetchone()[0] == 0:
        sources = [
            ("system", "macOS System Alerts", "CONNECTED", "Laptop"),
            ("calendar", "Calendar Events", "CONNECTED", "Calendar"),
            ("github", "GitHub Repository", "PERMISSION_REQUIRED", "Github"),
            ("email", "Mail Inbox", "NOT_CONNECTED", "Mail"),
            ("tasks", "Task Manager", "CONNECTED", "CheckSquare"),
        ]
        cursor.executemany("INSERT INTO notification_sources (id, name, status, icon) VALUES (?, ?, ?, ?)", sources)
        conn.commit()

    # Prepopulate initial default memories if empty
    cursor.execute("SELECT COUNT(*) FROM memories")
    if cursor.fetchone()[0] == 0:
        default_memories = [
            ("preferences", "Assistant Persona", "Tony Stark's JARVIS: Intelligent, calm, professional, slightly witty, concise."),
            ("projects", "Main Project", "Quantum Traffic Optimization and AI Operating Systems."),
            ("user", "User Name", settings.USER_NAME)
        ]
        cursor.executemany("INSERT INTO memories (category, key, content) VALUES (?, ?, ?)", default_memories)
        conn.commit()

    conn.close()

# Auto initialize schema
init_db()

if __name__ == "__main__":
    print("Database initialized successfully.")
