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
          } else if (data.type === 'voice_state_update') {
            if (data.state) {
              setJarvisState(data.state as JarvisState);
              if (data.state === 'LISTENING') {
                setSessionActive(true);
                sessionActiveRef.current = true;
              } else if (data.state === 'SLEEPING') {
                setSessionActive(false);
                sessionActiveRef.current = false;
              }
            }
          } else if (data.type === 'command_activity') {
            const cmd = data.command;
            const res = data.result;
            if (cmd) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  sender: 'user',
                  text: cmd,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                },
                {
                  id: (Date.now() + 1).toString(),
                  sender: 'jarvis',
                  text: res?.message || 'Directive executed, Boss.',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  toolAction: res?.tool || res?.intent,
                  toolStatus: res?.success ? 'COMPLETED' : 'FAILED'
                }
              ]);
            }
          } else if (data.type === 'jarvis_session_update') {
            if (data.session) {
              setSessionActive(data.session.isActive || data.session.active);
              sessionActiveRef.current = data.session.isActive || data.session.active;
              if (!data.session.isActive && !data.session.active) {
                setJarvisState('SLEEPING');
              } else {
                setJarvisState((data.session.currentState as JarvisState) || 'LISTENING');
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
    api.getJarvisStatus().then((status) => {
      if (status && status.isActive) {
        setSessionActive(true);
        sessionActiveRef.current = true;
        setJarvisState((status.currentState as JarvisState) || 'LISTENING');
      }
    }).catch(() => {});
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

  // 4. Native Voice Lifecycle
  // All speech recognition is handled system-wide by the native macOS CoreAudio daemon.
  // The browser interface synchronizes state and transcripts via WebSocket events.

  // 6. Manual Session Toggle Button
  const toggleVoice = async () => {
    if (sessionActiveRef.current) {
      // Deactivate session -> SLEEPING
      setSessionActive(false);
      sessionActiveRef.current = false;
      stopListening();
      try {
        await api.deactivateJarvis();
      } catch (e) {}
      setJarvisState('SLEEPING');
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
      setJarvisState('LISTENING');
      try {
        await api.activateJarvis();
      } catch (e) {}
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
