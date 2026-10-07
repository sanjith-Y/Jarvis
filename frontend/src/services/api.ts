import { 
  SystemMetrics, 
  NotificationItem, 
  MemoryItem, 
  ReminderItem, 
  AutomationRule, 
  FileEntry, 
  CommandHistoryItem 
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Chat & AI
  async sendMessage(message: string, conversation_id = 'default') {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_id })
    });
    if (!res.ok) throw new Error('AI service is currently unavailable.');
    return res.json();
  },

  // Voice
  async speak(text: string, voice?: string) {
    return fetch(`${BASE_URL}/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    }).then(r => r.json());
  },

  async stopVoice() {
    return fetch(`${BASE_URL}/voice/stop`, { method: 'POST' }).then(r => r.json());
  },

  // Computer Command
  async executeCommand(command: string, action_type = 'shell', confirmed = false) {
    const res = await fetch(`${BASE_URL}/command/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, action_type, confirmed })
    });
    if (!res.ok) throw new Error('Command execution failed or was blocked.');
    return res.json();
  },

  async getCommandHistory(): Promise<CommandHistoryItem[]> {
    return fetch(`${BASE_URL}/command/history`).then(r => r.json());
  },

  // System Monitor
  async getSystemStatus(): Promise<SystemMetrics> {
    return fetch(`${BASE_URL}/system/status`).then(r => r.json());
  },

  async getSystemHistory() {
    return fetch(`${BASE_URL}/system/history`).then(r => r.json());
  },

  async getSystemProcesses() {
    return fetch(`${BASE_URL}/system/processes`).then(r => r.json());
  },

  // Web Search
  async searchWeb(query: string) {
    const res = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  // Screen Vision
  async analyzeScreen(prompt = 'Analyze visible content on screen') {
    const res = await fetch(`${BASE_URL}/screen/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  // Memory
  async getMemories(search?: string): Promise<MemoryItem[]> {
    const url = search ? `${BASE_URL}/memory?search=${encodeURIComponent(search)}` : `${BASE_URL}/memory`;
    return fetch(url).then(r => r.json());
  },

  async createMemory(content: string, category = 'general', key?: string) {
    const res = await fetch(`${BASE_URL}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category, key })
    });
    return res.json();
  },

  async deleteMemory(id: number) {
    return fetch(`${BASE_URL}/memory/${id}`, { method: 'DELETE' }).then(r => r.json());
  },

  // Reminders
  async getReminders(status?: string): Promise<ReminderItem[]> {
    const url = status ? `${BASE_URL}/reminders?status=${status}` : `${BASE_URL}/reminders`;
    return fetch(url).then(r => r.json());
  },

  async createReminder(title: string, due_time: string, priority = 'NORMAL') {
    const res = await fetch(`${BASE_URL}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, due_time, priority })
    });
    return res.json();
  },

  async completeReminder(id: number) {
    return fetch(`${BASE_URL}/reminders/${id}/complete`, { method: 'POST' }).then(r => r.json());
  },

  async deleteReminder(id: number) {
    return fetch(`${BASE_URL}/reminders/${id}`, { method: 'DELETE' }).then(r => r.json());
  },

  // Notifications
  async getNotifications(priority?: string, unread_only = false): Promise<NotificationItem[]> {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    if (unread_only) params.append('unread_only', 'true');
    return fetch(`${BASE_URL}/notifications?${params.toString()}`).then(r => r.json());
  },

  async getUnreadCount() {
    return fetch(`${BASE_URL}/notifications/unread`).then(r => r.json());
  },

  async markNotificationRead(id: number) {
    return fetch(`${BASE_URL}/notifications/read/${id}`, { method: 'POST' }).then(r => r.json());
  },

  async markAllNotificationsRead() {
    return fetch(`${BASE_URL}/notifications/read-all`, { method: 'POST' }).then(r => r.json());
  },

  async simulateNotification(source: string, sender: string, title: string, content: string, priority?: string) {
    const res = await fetch(`${BASE_URL}/notifications/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, sender, title, content, priority })
    });
    return res.json();
  },

  async getNotificationSummary() {
    return fetch(`${BASE_URL}/notifications/summary`).then(r => r.json());
  },

  // Files
  async listFiles(path = ''): Promise<{ success: boolean; files: FileEntry[]; current_dir: string }> {
    return fetch(`${BASE_URL}/files/list?path=${encodeURIComponent(path)}`).then(r => r.json());
  },

  async readFile(path: string): Promise<{ success: boolean; content: string; path: string }> {
    return fetch(`${BASE_URL}/files/read?path=${encodeURIComponent(path)}`).then(r => r.json());
  },

  async createFile(path: string, content: string) {
    const res = await fetch(`${BASE_URL}/files/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    return res.json();
  },

  // Automations
  async getAutomations(): Promise<AutomationRule[]> {
    return fetch(`${BASE_URL}/automations`).then(r => r.json());
  },

  async createAutomation(rule: { name: string; trigger_type: string; trigger_value: string; action_type: string; action_value: string }) {
    const res = await fetch(`${BASE_URL}/automations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    return res.json();
  },

  async toggleAutomation(id: number) {
    return fetch(`${BASE_URL}/automations/${id}/toggle`, { method: 'POST' }).then(r => r.json());
  },

  async deleteAutomation(id: number) {
    return fetch(`${BASE_URL}/automations/${id}`, { method: 'DELETE' }).then(r => r.json());
  },

  // JARVIS Session & Voice
  async activateJarvis() {
    return fetch(`${BASE_URL}/jarvis/activate`, { method: 'POST' }).then(r => r.json());
  },

  async deactivateJarvis() {
    return fetch(`${BASE_URL}/jarvis/deactivate`, { method: 'POST' }).then(r => r.json());
  },

  async getJarvisStatus() {
    return fetch(`${BASE_URL}/jarvis/status`).then(r => r.json());
  },

  async sendJarvisCommand(command: string) {
    const res = await fetch(`${BASE_URL}/jarvis/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    return res.json();
  },

  async launchApp(name: string) {
    const res = await fetch(`${BASE_URL}/applications/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return res.json();
  },

  async getInstalledApps() {
    return fetch(`${BASE_URL}/applications/installed`).then(r => r.json());
  },

  async playMusic(query: string) {
    const res = await fetch(`${BASE_URL}/youtube/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  async searchYouTube(query: string) {
    const res = await fetch(`${BASE_URL}/youtube/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  }
};
