import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.app.database import get_db
from backend.app.config import settings

class NotificationPriority:
    CRITICAL = "CRITICAL"
    IMPORTANT = "IMPORTANT"
    NORMAL = "NORMAL"
    LOW = "LOW"

CRITICAL_KEYWORDS = ["security", "suspicious", "breach", "fail", "failure", "unauthorized", "emergency", "fatal", "battery critical", "error 500"]
IMPORTANT_KEYWORDS = ["deadline", "assignment", "meeting", "calendar", "due today", "urgent", "payment", "github issue", "pr review", "flight", "interview"]
LOW_KEYWORDS = ["discount", "sale", "promo", "deal", "unsubscribe", "liked your", "followed you", "newsletter", "off your next"]

class NotificationEngine:
    def classify(self, source: str, sender: str, title: str, content: str) -> str:
        text = f"{source} {sender} {title} {content}".lower()

        for kw in CRITICAL_KEYWORDS:
            if kw in text:
                return NotificationPriority.CRITICAL

        for kw in IMPORTANT_KEYWORDS:
            if kw in text:
                return NotificationPriority.IMPORTANT

        for kw in LOW_KEYWORDS:
            if kw in text:
                return NotificationPriority.LOW

        return NotificationPriority.NORMAL

    def is_quiet_time(self) -> bool:
        if not settings.QUIET_MODE:
            return False

        now_str = datetime.now().strftime("%H:%M")
        start = settings.QUIET_HOURS_START
        end = settings.QUIET_HOURS_END

        if start > end: # Overnight e.g. 22:00 -> 07:00
            return now_str >= start or now_str < end
        return start <= now_str <= end

    def add_notification(self, source: str, sender: str, title: str, content: str, is_simulated: bool = False, force_priority: Optional[str] = None) -> Dict[str, Any]:
        priority = force_priority or self.classify(source, sender, title, content)
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO notifications (source, sender, title, content, priority, is_read, is_simulated)
               VALUES (?, ?, ?, ?, ?, 0, ?)""",
            (source, sender, title, content, priority, 1 if is_simulated else 0)
        )
        notif_id = cursor.lastrowid
        conn.commit()
        conn.close()

        should_speak = False
        proactive_msg = None

        # Determine proactive alert behavior
        if priority == NotificationPriority.CRITICAL:
            should_speak = True
            proactive_msg = f"{settings.USER_NAME}, you have a critical security notification from {source}: {title}."
        elif priority == NotificationPriority.IMPORTANT and not self.is_quiet_time():
            should_speak = True
            proactive_msg = f"You have an important notification: {title}."

        return {
            "id": notif_id,
            "source": source,
            "sender": sender,
            "title": title,
            "content": content,
            "priority": priority,
            "is_simulated": is_simulated,
            "should_speak": should_speak,
            "proactive_message": proactive_msg,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

    def get_notifications(self, filter_priority: Optional[str] = None, unread_only: bool = False) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        query = "SELECT id, source, sender, title, content, priority, is_read, is_simulated, timestamp FROM notifications"
        conditions = []
        params = []

        if filter_priority:
            conditions.append("priority = ?")
            params.append(filter_priority)

        if unread_only:
            conditions.append("is_read = 0")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY id DESC LIMIT 50"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def mark_as_read(self, notif_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
        conn.commit()
        conn.close()
        return True

    def mark_all_read(self) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1")
        conn.commit()
        conn.close()
        return True

    def generate_smart_summary(self) -> Dict[str, Any]:
        notifs = self.get_notifications(unread_only=True)
        if not notifs:
            notifs = self.get_notifications() # fallback to recent if none unread

        total = len(notifs)
        critical = [n for n in notifs if n['priority'] == NotificationPriority.CRITICAL]
        important = [n for n in notifs if n['priority'] == NotificationPriority.IMPORTANT]

        if total == 0:
            summary_text = "You have no pending notifications at this time, sir."
            return {"total": 0, "critical_count": 0, "important_count": 0, "summary": summary_text}

        urgent_count = len(critical) + len(important)
        
        details = []
        if critical:
            details.append(f"{len(critical)} critical security alert{'s' if len(critical)>1 else ''}")
        if important:
            titles = [f"'{n['title']}'" for n in important[:2]]
            details.append(f"{len(important)} important item{'s' if len(important)>1 else ''} ({', '.join(titles)})")

        if urgent_count > 0:
            summary_text = f"You have {total} notification{'s' if total>1 else ''}. {urgent_count} require your attention: {'; '.join(details)}."
        else:
            summary_text = f"You have {total} notification{'s' if total>1 else ''}. None require urgent attention."

        return {
            "total": total,
            "critical_count": len(critical),
            "important_count": len(important),
            "summary": summary_text,
            "critical_items": critical,
            "important_items": important
        }

    def seed_initial_notifications_if_empty(self):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM notifications")
        count = cursor.fetchone()[0]
        conn.close()

        if count == 0:
            sample_notifs = [
                ("Calendar", "Google Calendar", "Assignment Deadline: AI OS Project", "Final submission due tonight at 11:59 PM.", False),
                ("System", "macOS Security", "System Firewall Active", "Network conduits secured. No suspicious traffic detected.", False),
                ("GitHub", "GitHub Bot", "Issue #42 Opened", "New issue opened on Jarvis repository: Feature request for screen vision.", False),
                ("Store", "Nike Store", "20% Discount on Running Shoes", "Limited time flash sale on all sneakers.", False),
            ]
            for src, snd, ttl, cnt, sim in sample_notifs:
                self.add_notification(src, snd, ttl, cnt, is_simulated=sim)

notification_engine = NotificationEngine()
notification_engine.seed_initial_notifications_if_empty()
