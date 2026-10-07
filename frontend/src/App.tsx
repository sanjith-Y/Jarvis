import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HomePage } from './pages/HomePage';
import { AssistantPage } from './pages/AssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MemoryPage } from './pages/MemoryPage';
import { SystemPage } from './pages/SystemPage';
import { FilesPage } from './pages/FilesPage';
import { AutomationPage } from './pages/AutomationPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';

import { JarvisState, ChatMessage, SystemMetrics, DiagnosticEntry } from './types';
import { api } from './services/api';
import { speechManager } from './services/SpeechManager';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [jarvisState, setJarvisState] = useState<JarvisState>('SLEEPING');
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    const stored = localStorage.getItem('jarvis_user_name');
    if (!stored || stored.toLowerCase() === 'sanjith' || stored.toLowerCase() === 'sir' || stored.toLowerCase() === 'user') {
      localStorage.setItem('jarvis_user_name', 'Boss');
      return 'Boss';
    }
    return stored;
  });

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    command: string;
  }>({ isOpen: false, message: '', command: '' });

  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionActiveRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  // Sync refs
  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  // 1. WebSocket Live Stream
  useEffect(() => {
    let ws: WebSocket;
    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry_update') {
            setMetrics(data.metrics);
          } else if (data.type === 'initial_handshake') {
            setMetrics(data.metrics);
            setUnreadCount(data.unread_notifications || 0);
          } else if (data.type === 'notification_alert') {
            setUnreadCount((c) => c + 1);
            if (data.notification?.should_speak && sessionActiveRef.current) {
              speakResponse(data.notification.proactive_message || data.notification.title);
            }
          } else if (data.type === 'jarvis_session_update') {
            if (data.session) {
              setSessionActive(data.session.active);
              sessionActiveRef.current = data.session.active;
              if (!data.session.active) {
                setJarvisState('SLEEPING');
              }
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // 2. Fetch Initial Notifications & Hardware Metrics
  useEffect(() => {
    api.getSystemStatus().then(setMetrics).catch(() => {});
    api.getUnreadCount().then((res) => setUnreadCount(res.count)).catch(() => {});
  }, []);

  // Helper: Start / Stop listening safely
  const startListening = () => {
    if (!recognitionRef.current) return;
    if (speechManager.isSpeaking()) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Speech recognition may already be active or transitioning
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
  };

  // 3. Centralized Single-Male-Voice TTS Output
  const speakResponse = (text: string, onEndCallback?: () => void) => {
    stopListening();
    setJarvisState('SPEAKING');

    speechManager.speak(
      text,
      () => {
        if (onEndCallback) {
          onEndCallback();
        } else if (sessionActiveRef.current) {
          // Default transition: SPEAKING -> LISTENING
          setJarvisState('LISTENING');
          startListening();
        }
      },
      () => {
        setJarvisState('SPEAKING');
      }
    );
  };

  // 4. Continuous Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        if (sessionActiveRef.current && !speechManager.isSpeaking() && !isProcessingRef.current) {
          setJarvisState('LISTENING');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatic restart loop: keep listening if session is active and not currently speaking
        if (sessionActiveRef.current && !speechManager.isSpeaking() && !isProcessingRef.current) {
          setTimeout(() => {
            if (sessionActiveRef.current && !speechManager.isSpeaking() && !isProcessingRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          }, 250);
        } else if (!sessionActiveRef.current) {
          // If sleeping, restart in low-overhead mode to catch wake word "Jarvis"
          setTimeout(() => {
            if (!sessionActiveRef.current && !speechManager.isSpeaking()) {
              try {
                recognition.start();
              } catch (e) {}
            }
          }, 800);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Silence is normal; loop will restart
          return;
        }
        if (event.error === 'not-allowed') {
          console.warn("Microphone access is unavailable. Please check browser permissions.");
          return;
        }
      };

      recognition.onresult = (event: any) => {
        if (speechManager.isSpeaking()) {
          // Ignore echo while JARVIS is speaking
          return;
        }

        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (!transcript) return;

        handleIncomingTranscript(transcript);
      };

      recognitionRef.current = recognition;

      // Start recognition in background to listen for wake words or active commands
      try {
        recognition.start();
      } catch (e) {}
    }
  }, [userName]);

  // 5. Handle Transcript & Intent Router
  const handleIncomingTranscript = (transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    // Explicit Sleep Commands
    const isSleep = [
      "stop listening", "stop jarvis", "go to sleep", "sleep jarvis",
      "deactivate jarvis", "turn off listening", "that's all", "good night jarvis",
      "standby", "enter standby"
    ].some(kw => lower === kw || lower.startsWith(kw));

    // Wake Words: "Jarvis", "Jarvin", "Travis", "Hey Jarvis", "Okay Jarvis"
    const isWakeWord = /^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis)\b/i.test(lower) || lower === "wake up";

    if (!sessionActiveRef.current) {
      // JARVIS IS CURRENTLY SLEEPING
      if (isWakeWord) {
        // WAKE UP!
        setSessionActive(true);
        sessionActiveRef.current = true;
        setJarvisState('ACTIVATING');

        // Extract command following wake word if user said e.g. "Jarvis to open Instagram"
        let cleanCommand = transcript.trim();
        let changed = true;
        while (changed) {
          const prev = cleanCommand;
          cleanCommand = cleanCommand.replace(/^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)/i, '').trim();
          cleanCommand = cleanCommand.replace(/^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*/i, '').trim();
          cleanCommand = cleanCommand.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)/i, '').trim();
          cleanCommand = cleanCommand.replace(/^(?:to|now)\s+/i, '').trim();
          changed = (cleanCommand !== prev);
        }

        if (cleanCommand && cleanCommand.toLowerCase() !== "wake up") {
          processDirective(cleanCommand);
        } else {
          speakResponse(`Yes, ${userName}? I'm listening.`, () => {
            if (sessionActiveRef.current) {
              setJarvisState('LISTENING');
              startListening();
            }
          });
        }
      }
      return;
    }

    // SESSION IS ACTIVE
    if (isSleep) {
      // Explicit deactivation
      setSessionActive(false);
      sessionActiveRef.current = false;
      stopListening();

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: transcript,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);

      speakResponse(`Understood, ${userName}. I'll stand by.`, () => {
        setJarvisState('SLEEPING');
      });
      return;
    }

    // Clean preamble & wake word from active command
    let activeCommand = transcript.trim();
    let actChanged = true;
    while (actChanged) {
      const prev = activeCommand;
      activeCommand = activeCommand.replace(/^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)/i, '').trim();
      activeCommand = activeCommand.replace(/^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*/i, '').trim();
      activeCommand = activeCommand.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)/i, '').trim();
      activeCommand = activeCommand.replace(/^(?:to|now)\s+/i, '').trim();
      actChanged = (activeCommand !== prev);
    }

    if (!activeCommand) {
      speakResponse(`Yes, ${userName}?`, () => {
        if (sessionActiveRef.current) {
          setJarvisState('LISTENING');
          startListening();
        }
      });
      return;
    }

    // Process Directive
    processDirective(activeCommand);
  };

  // 6. Manual Session Toggle Button
  const toggleVoice = async () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (sessionActiveRef.current) {
      // Deactivate session -> SLEEPING
      setSessionActive(false);
      sessionActiveRef.current = false;
      stopListening();
      speakResponse(`Understood, ${userName}. I'll stand by.`, () => {
        setJarvisState('SLEEPING');
      });
    } else {
      // 1. Explicitly request microphone access if needed
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (e) {
        console.warn("Microphone access prompt:", e);
      }

      // 2. Activate session -> LISTENING
      setSessionActive(true);
      sessionActiveRef.current = true;
      setJarvisState('ACTIVATING');

      // 3. Spoken greeting: "JARVIS online. I'm listening, Boss."
      speakResponse(`JARVIS online. I'm listening, ${userName}.`, () => {
        if (sessionActiveRef.current) {
          setJarvisState('LISTENING');
          startListening();
        }
      });
    }
  };

  // 7. Execute Directive through Backend Command Engine
  const processDirective = async (text: string) => {
    if (!text.trim()) return;

    // Temporarily pause microphone during processing and execution to prevent self-echo
    stopListening();
    isProcessingRef.current = true;
    setJarvisState('PROCESSING');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.sendMessage(text.trim());
      isProcessingRef.current = false;

      // Record diagnostic entry (Requirement 35)
      const isApp = res.intent === 'OPEN_APPLICATION';
      const appFound = isApp ? (res.tool_result?.not_installed ? 'NO' : 'YES') : (res.tool_result ? 'YES' : 'N/A');
      const launchResult = res.tool_result?.not_installed ? 'NOT_INSTALLED' : (res.tool_status === 'FAILED' ? 'FAILURE' : 'SUCCESS');

      const diagEntry: DiagnosticEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        transcript: text,
        intent: res.intent || res.tool_action || "GENERAL_CHAT",
        targetOrQuery: res.tool_result?.app_name || res.tool_result?.query || res.tool_result?.url || text,
        appFound: appFound,
        launchResult: launchResult
      };
      setDiagnostics((prev) => [diagEntry, ...prev.slice(0, 24)]);

      if (res.tool_status === 'CONFIRMATION_REQUIRED') {
        setConfirmModal({
          isOpen: true,
          message: res.reply,
          command: res.target || text
        });
        speakResponse(res.reply, () => {
          if (sessionActiveRef.current) {
            setJarvisState('LISTENING');
            startListening();
          }
        });
        return;
      }

      // Check if command put assistant to sleep
      if (res.is_sleep) {
        setSessionActive(false);
        sessionActiveRef.current = false;
      }

      if (res.tool_action) {
        setJarvisState('EXECUTING');
      }

      const jarvisMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'jarvis',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolAction: res.tool_action,
        toolStatus: res.tool_status,
        toolResult: res.tool_result
      };
      setMessages((prev) => [...prev, jarvisMsg]);

      // Speak response, then AUTOMATICALLY return to LISTENING
      speakResponse(res.reply, () => {
        if (res.is_sleep || !sessionActiveRef.current) {
          setJarvisState('SLEEPING');
        } else {
          // CRITICAL REQUIREMENT: SPEAKING -> LISTENING (NEVER IDLE!)
          setJarvisState('LISTENING');
          startListening();
        }
      });

    } catch (e: any) {
      isProcessingRef.current = false;
      setJarvisState('ERROR');
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'jarvis',
        text: "I encountered an anomaly processing that directive.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
      speakResponse("I encountered an anomaly processing that directive.", () => {
        if (sessionActiveRef.current) {
          setJarvisState('LISTENING');
          startListening();
        } else {
          setJarvisState('SLEEPING');
        }
      });
    }
  };

  const handleSendMessage = (text: string) => {
    processDirective(text);
  };

  const handleConfirmAction = async () => {
    setConfirmModal({ isOpen: false, message: '', command: '' });
    setJarvisState('EXECUTING');
    try {
      const res = await api.executeCommand(confirmModal.command, 'shell', true);
      const jarvisMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'jarvis',
        text: res.message || "Authorized action executed successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolAction: "Authorized Execution",
        toolStatus: "COMPLETED"
      };
      setMessages((prev) => [...prev, jarvisMsg]);
      speakResponse(res.message || "Authorized action executed successfully.", () => {
        if (sessionActiveRef.current) {
          setJarvisState('LISTENING');
          startListening();
        }
      });
    } catch (e) {
      setJarvisState('ERROR');
      setTimeout(() => {
        if (sessionActiveRef.current) {
          setJarvisState('LISTENING');
          startListening();
        } else {
          setJarvisState('SLEEPING');
        }
      }, 2000);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-jarvis-dark text-slate-100 hud-grid-overlay font-sans select-none">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        unreadCount={unreadCount} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Status Bar */}
        <Header 
          metrics={metrics}
          unreadCount={unreadCount}
          onNotificationClick={() => setActiveTab('notifications')}
          isConnected={isConnected}
        />

        {/* Tab Content Display */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'home' && (
            <HomePage 
              jarvisState={jarvisState}
              sessionActive={sessionActive}
              messages={messages}
              diagnostics={diagnostics}
              onSendMessage={handleSendMessage}
              isListening={isListening}
              onToggleVoice={toggleVoice}
              metrics={metrics}
              userName={userName}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantPage 
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearMessages={() => setMessages([])}
              userName={userName}
            />
          )}

          {activeTab === 'notifications' && <NotificationsPage />}

          {activeTab === 'memory' && <MemoryPage />}

          {activeTab === 'system' && <SystemPage metrics={metrics} />}

          {activeTab === 'files' && <FilesPage />}

          {activeTab === 'automation' && <AutomationPage />}

          {activeTab === 'reminders' && <RemindersPage />}

          {activeTab === 'settings' && (
            <SettingsPage 
              userName={userName}
              onUpdateUserName={setUserName}
            />
          )}
        </main>
      </div>

      {/* Security Confirmation Modal */}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        command={confirmModal.command}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', command: '' })}
      />
    </div>
  );
};
