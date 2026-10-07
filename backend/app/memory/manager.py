from typing import List, Dict, Any, Optional
from backend.app.database import get_db

class MemoryManager:
    def add_memory(self, content: str, category: str = "general", key: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO memories (category, key, content) VALUES (?, ?, ?)",
            (category, key, content.strip())
        )
        mem_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": mem_id, "category": category, "key": key, "content": content}

    def get_memories(self, search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        query = "SELECT id, category, key, content, created_at FROM memories"
        params = []
        conditions = []

        if category:
            conditions.append("category = ?")
            params.append(category)

        if search:
            conditions.append("(content LIKE ? OR key LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY id DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def delete_memory(self, memory_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        return affected > 0

    def get_context_string(self) -> str:
        memories = self.get_memories()
        if not memories:
            return ""
        items = [f"- {m['content']}" for m in memories[:15]]
        return "USER MEMORIES & KNOWLEDGE:\n" + "\n".join(items)

memory_manager = MemoryManager()
