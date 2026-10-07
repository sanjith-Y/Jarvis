import re
from typing import Tuple, Dict, Any

class SecurityLevel:
    SAFE = "SAFE"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    BLOCKED = "BLOCKED"

# Patterns strictly blocked
BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/",
    r":\(\)\{:\s*\|\s*:&\}\s*;", # fork bomb
    r"/etc/shadow",
    r"/etc/passwd",
    r"dd\s+if=.*of=/dev/",
    r"mkfs",
    r"curl.*\|\s*(?:bash|sh)",
    r"wget.*\|\s*(?:bash|sh)",
    r"chmod\s+-R\s+777\s+/",
]

# Patterns requiring user confirmation
CONFIRMATION_PATTERNS = [
    r"rm\s+",
    r"unlink\s+",
    r"kill\s+-9",
    r"pkill",
    r"brew\s+(?:install|uninstall)",
    r"npm\s+(?:install|uninstall)\s+-g",
    r"pip\s+uninstall",
    r"git\s+reset\s+--hard",
    r"git\s+clean\s+-fd",
]

def classify_command(cmd_text: str, action_type: str = "shell") -> Tuple[str, str]:
    """
    Returns (SecurityLevel, Reason)
    """
    cmd = cmd_text.strip().lower()

    # Blocked check
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, cmd, re.IGNORECASE):
            return SecurityLevel.BLOCKED, "Dangerous pattern detected that could compromise the host system."

    # Confirmation required check
    for pattern in CONFIRMATION_PATTERNS:
        if re.search(pattern, cmd, re.IGNORECASE):
            return SecurityLevel.CONFIRMATION_REQUIRED, "This action can modify or delete files on your system. Explicit confirmation required."

    # Safe app/URL commands
    if action_type in ["open_app", "open_url", "open_folder", "screenshot", "system_status", "web_search", "memory", "reminder"]:
        return SecurityLevel.SAFE, "Action verified safe."

    return SecurityLevel.SAFE, "Standard safe command."
