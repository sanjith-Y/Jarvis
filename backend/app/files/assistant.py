import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.app.config import settings

class FileAssistant:
    def get_workspace_root(self) -> Path:
        return Path(settings.WORKSPACE_PATH).resolve()

    def _is_safe_path(self, target: Path) -> bool:
        root = self.get_workspace_root()
        try:
            target.resolve().relative_to(root)
            return True
        except ValueError:
            return False

    def list_files(self, subpath: str = "") -> Dict[str, Any]:
        root = self.get_workspace_root()
        target = (root / subpath).resolve()

        if not self._is_safe_path(target) or not target.exists():
            return {"success": False, "message": "Access restricted to configured workspace root."}

        items = []
        try:
            for entry in sorted(os.scandir(target), key=lambda e: (not e.is_dir(), e.name.lower())):
                if entry.name.startswith("."):
                    continue
                items.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir(),
                    "size_bytes": entry.stat().st_size if entry.is_file() else 0,
                    "rel_path": str(Path(entry.path).relative_to(root))
                })
            return {"success": True, "files": items, "current_dir": str(target.relative_to(root))}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def read_file(self, rel_path: str) -> Dict[str, Any]:
        root = self.get_workspace_root()
        target = (root / rel_path).resolve()

        if not self._is_safe_path(target):
            return {"success": False, "message": "Path is outside the allowed workspace."}

        if not target.exists() or not target.is_file():
            return {"success": False, "message": "File not found."}

        # Size safeguard (max 1MB)
        if target.stat().st_size > 1024 * 1024:
            return {"success": False, "message": "File is larger than 1MB safety limit."}

        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {"success": True, "content": content, "path": rel_path, "lines": len(content.splitlines())}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def create_file(self, rel_path: str, content: str) -> Dict[str, Any]:
        root = self.get_workspace_root()
        target = (root / rel_path).resolve()

        if not self._is_safe_path(target):
            return {"success": False, "message": "Path is outside workspace."}

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)
            return {"success": True, "message": f"File '{rel_path}' created successfully.", "path": rel_path}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def search_files(self, keyword: str) -> Dict[str, Any]:
        root = self.get_workspace_root()
        matches = []
        keyword_lower = keyword.lower()

        for cur_root, dirs, files in os.walk(root):
            # Skip hidden dirs
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for file in files:
                if file.startswith("."):
                    continue
                file_path = Path(cur_root) / file
                if keyword_lower in file.lower():
                    matches.append(str(file_path.relative_to(root)))
                if len(matches) >= 20:
                    break

        return {"success": True, "keyword": keyword, "matches": matches}

file_assistant = FileAssistant()
