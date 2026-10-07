# ⚡ J.A.R.V.I.S. // Personal AI Operating System

> **“Your Personal AI. Your Digital Intelligence.”**  
> *Inspired by the concept of J.A.R.V.I.S. (Just A Rather Very Intelligent System).*

---

## 🏛️ Architecture & Overview

J.A.R.V.I.S. is a production-grade personal AI operating system assistant built with a modern decoupled full-stack architecture:

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + Framer Motion + Recharts
- **Backend:** Python 3.14 + FastAPI + Pydantic v2 + Uvicorn + SQLite3
- **Hardware Probes:** Real-time kernel & hardware diagnostics via `psutil` and macOS native subsystems
- **Security Matrix:** Tri-tier command classification (`SAFE`, `CONFIRMATION_REQUIRED`, `BLOCKED`)
- **Speech Engine:** Web Speech API + Native macOS speech synthesizer (`Daniel` / British Butler tone)
- **Computer Vision:** User-authorized screen analysis & Pillow/OpenAI Vision diagnostic pipeline

```
jarvis/
├── frontend/
│   ├── src/
│   │   ├── components/    # AICore, Header, Sidebar, QuickCommands, ConfirmationModal
│   │   ├── pages/         # Home, Assistant, Notifications, Memory, System, Files, Automation, Reminders, Settings
│   │   ├── services/      # Typed API client & WebSocket streaming
│   │   ├── types/         # SystemMetrics, NotificationItem, MemoryItem, etc.
│   │   └── App.tsx        # Central state, audio synthesis, and wake-word loop
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── ai/            # Tool router, intent classifier, and Stark persona
│   │   ├── commands/      # Safe OS app launch, URL execution, and security matrix
│   │   ├── notifications/ # 4-tier notification engine, smart summary, simulator
│   │   ├── memory/        # SQLite long-term knowledge vault
│   │   ├── reminders/     # Natural language time parser & persistent scheduler
│   │   ├── system/        # Real hardware telemetry & process probes
│   │   ├── vision/        # Explicit screen capture & AI vision analysis
│   │   ├── files/         # Sandboxed workspace file assistant
│   │   ├── search/        # Real DuckDuckGo web search
│   │   ├── voice/         # Native macOS speech synthesis
│   │   └── api/           # REST endpoints & WebSockets
│   ├── requirements.txt
│   └── .env.example
├── data/                  # SQLite database & captured screenshots
├── logs/                  # System event logs
├── run.py                 # Full-stack launcher
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Run the Full-Stack Application
You can run the full-stack system in a single command:

```bash
python3 run.py
```

This starts the FastAPI backend on **`http://localhost:8000`** serving the compiled React frontend, live WebSockets, and real system probes.

### 3. Frontend Development (HMR Mode)
If you wish to run the Vite dev server with Hot Module Reloading:

```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`**.

---

## ⚡ Core Capabilities

### 1. 🎙️ Voice & Wake-Word
- Default Wake-Word: `"Hey Jarvis"` or `"Jarvis"`.
- Real speech synthesis using British butler persona (`say -v Daniel` on macOS).
- Push-to-talk and continuous listening fallbacks.

### 2. 🛡️ Command Security Enclave
Every directive is classified before execution:
- **`SAFE`**: `Open Chrome`, `Open VS Code`, `System Status`, `Search Web`. Executed immediately.
- **`CONFIRMATION_REQUIRED`**: Modifying system files, installing packages, killing processes. Triggers an explicit user authorization dialog.
- **`BLOCKED`**: Destructive patterns (`rm -rf /`, fork bombs, credential theft) are stopped.

### 3. 🔔 Intelligent Notification Matrix
- **`CRITICAL`**: Immediate voice interruption (Security alerts, system failures, critical battery).
- **`IMPORTANT`**: Voice announcement if not in Quiet Mode (Deadlines, meetings, calendar, GitHub issues).
- **`NORMAL`**: Logged in notification center without interruption.
- **`LOW PRIORITY`**: Silently grouped (Promotions, marketing, likes).
- **Smart Summary**: `"You have 25 notifications. Three require your attention: one important email, one GitHub issue, and one calendar reminder."`
- **Notification Simulator**: Test classification and voice alerts live in the UI.

### 4. 🧠 Long-Term Memory
- Store user preferences, projects, and goals.
- Persisted in SQLite and automatically injected into conversational context.

### 5. 📊 Real Hardware Diagnostics
- Real CPU load, Memory usage, Disk volume, Battery level, and active processes.
- Zero fake or random numbers — verified with `psutil`.

---

## 🧪 Testing

Run the automated test suite:

```bash
python3 -m unittest backend/tests/test_jarvis.py
```

All 7 integration tests verify hardware telemetry, command security, memory persistence, notification classification, reminder parsing, and file sandboxing.
