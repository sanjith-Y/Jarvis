#!/usr/bin/env python3
"""
J.A.R.V.I.S. Operating System Launcher
Runs the production full-stack FastAPI application serving the React frontend.
"""

import sys
import os
import uvicorn
from pathlib import Path

# Add current directory to python path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from backend.app.config import settings

def main():
    print("=" * 60)
    print("⚡ J.A.R.V.I.S. Personal AI Operating System")
    print(f"📡 Interface: http://{settings.HOST}:{settings.PORT}")
    print(f"🤖 Protocol: Online & Listening")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=False)

if __name__ == "__main__":
    main()
