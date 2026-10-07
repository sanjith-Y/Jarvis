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

import { JarvisState, ChatMessage, SystemMetrics } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [jarvisState, setJarvisState] = useState<JarvisState>('ONLINE');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('jarvis_user_name') || 'Sanjith');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    command: string;
  }>({ isOpen: false, message: '', command: '' });

  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
        setJarvisState('ONLINE');
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
            if (data.notification?.should_speak) {
              setJarvisState('SPEAKING');
              setTimeout(() => setJarvisState('ONLINE'), 3000);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        setJarvisState('OFFLINE');
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

  // 3. Speech Recognition & Wake-Word
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setJarvisState('LISTENING');
      };

      recognition.onend = () => {
        setIsListening(false);
        setJarvisState('ONLINE');
      };

      recognition.onerror = () => {
        setIsListening(false);
        setJarvisState('ONLINE');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        handleSpeechTranscript(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, [userName]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleSpeechTranscript = (transcript: string) => {
    const lower = transcript.toLowerCase();
    
    // Check wake word: "Jarvis" or "Hey Jarvis"
    if (lower.startsWith("jarvis") || lower.startsWith("hey jarvis")) {
      const clean = transcript.replace(/^(hey\s+)?jarvis[:,]?\s*/i, '').trim();
      if (clean) {
        handleSendMessage(clean);
      } else {
        handleSendMessage("Good evening Jarvis");
      }
    } else if (isListening) {
      handleSendMessage(transcript);
    }
  };

  // 4. Send Message to AI Core
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setJarvisState('THINKING');

    try {
      const res = await api.sendMessage(text.trim());

      if (res.tool_status === 'CONFIRMATION_REQUIRED') {
        setConfirmModal({
          isOpen: true,
          message: res.reply,
          command: res.target || text
        });
        setJarvisState('ONLINE');
        return;
      }

      setJarvisState(res.tool_action ? 'EXECUTING' : 'SPEAKING');

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

      // Revert to ONLINE after speech duration estimate
      const speakDuration = Math.min(8000, Math.max(2500, res.reply.length * 50));
      setTimeout(() => {
        setJarvisState('ONLINE');
      }, speakDuration);

    } catch (e: any) {
      setJarvisState('ERROR');
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'jarvis',
        text: "I encountered an anomaly processing that directive, sir.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
      setTimeout(() => setJarvisState('ONLINE'), 3000);
    }
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
    } catch (e) {
      setJarvisState('ERROR');
    } finally {
      setTimeout(() => setJarvisState('ONLINE'), 2000);
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
              messages={messages}
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
