from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.database import get_db

class AutomationEngine:
    def add_automation(self, name: str, trigger_type: str, trigger_value: str, action_type: str, action_value: str) -> Dict[str, Any]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO automations (name, trigger_type, trigger_value, action_type, action_value, enabled)
               VALUES (?, ?, ?, ?, ?, 1)""",
            (name, trigger_type, trigger_value, action_type, action_value)
        )
        auto_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {
            "id": auto_id,
            "name": name,
            "trigger_type": trigger_type,
            "trigger_value": trigger_value,
            "action_type": action_type,
            "action_value": action_value,
            "enabled": True
        }

    def get_automations(self) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, trigger_type, trigger_value, action_type, action_value, enabled, created_at FROM automations ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def toggle_automation(self, auto_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE automations SET enabled = 1 - enabled WHERE id = ?", (auto_id,))
        conn.commit()
        conn.close()
        return True

    def delete_automation(self, auto_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM automations WHERE id = ?", (auto_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    def seed_default_automations_if_empty(self):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM automations")
        count = cursor.fetchone()[0]
        conn.close()

        if count == 0:
            defaults = [
                ("Morning Notification Digest", "TIME", "08:00", "NOTIFICATION_SUMMARY", "Speak morning briefing"),
                ("Low Battery Protocol", "BATTERY_LESS_THAN", "20", "ALERT", "Alert low battery critical condition"),
                ("Evening Project Reminder", "TIME", "18:00", "REMINDER", "Work on Quantum Traffic Optimization"),
            ]
            for n, tt, tv, at, av in defaults:
                self.add_automation(n, tt, tv, at, av)

automation_engine = AutomationEngine()
automation_engine.seed_default_automations_if_empty()
