from datetime import datetime, timedelta
import re
from typing import List, Dict, Any, Optional
from backend.app.database import get_db

class ReminderManager:
    def parse_time(self, time_str: str) -> datetime:
        now = datetime.now()
        t = time_str.lower().strip()

        # In X minutes/hours
        min_match = re.search(r"in\s+(\d+)\s+min", t)
        if min_match:
            return now + timedelta(minutes=int(min_match.group(1)))

        hour_match = re.search(r"in\s+(\d+)\s+hour", t)
        if hour_match:
            return now + timedelta(hours=int(hour_match.group(1)))

        # Specific time like "8 pm", "20:00", "8:30 am"
        time_match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", t)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2) or 0)
            ampm = time_match.group(3)

            if ampm == "pm" and hour < 12:
                hour += 12
            elif ampm == "am" and hour == 12:
                hour = 0

            target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if "tomorrow" in t or target < now:
                target += timedelta(days=1)
            return target

        # Default fallback: 1 hour from now
        return now + timedelta(hours=1)

    def create_reminder(self, title: str, due_time: Any, priority: str = "NORMAL") -> Dict[str, Any]:
        if isinstance(due_time, str):
            due_dt = self.parse_time(due_time)
        else:
            due_dt = due_time

        due_iso = due_dt.strftime("%Y-%m-%d %H:%M:%S")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO reminders (title, due_time, status, priority) VALUES (?, ?, 'UPCOMING', ?)",
            (title.strip(), due_iso, priority)
        )
        rem_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "id": rem_id,
            "title": title,
            "due_time": due_iso,
            "status": "UPCOMING",
            "priority": priority
        }

    def get_reminders(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Automatically update overdue reminders
        cursor.execute("UPDATE reminders SET status = 'OVERDUE' WHERE status = 'UPCOMING' AND due_time < ?", (now_str,))
        conn.commit()

        if status:
            cursor.execute("SELECT id, title, due_time, status, priority, created_at FROM reminders WHERE status = ? ORDER BY due_time ASC", (status,))
        else:
            cursor.execute("SELECT id, title, due_time, status, priority, created_at FROM reminders ORDER BY due_time ASC")

        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def complete_reminder(self, reminder_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE reminders SET status = 'COMPLETED' WHERE id = ?", (reminder_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    def delete_reminder(self, reminder_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

reminder_manager = ReminderManager()
