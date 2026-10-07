export type JarvisState = 
  | 'OFFLINE'
  | 'ONLINE'
  | 'IDLE'
  | 'ACTIVATING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'THINKING'
  | 'EXECUTING'
  | 'SPEAKING'
  | 'ERROR'
  | 'SLEEPING';

export type NotificationPriority = 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'LOW';

export interface BatteryInfo {
  percent: number;
  power_plugged: boolean;
  status: string;
}

export interface NetworkInfo {
  bytes_sent_mb: number;
  bytes_recv_mb: number;
  connected: boolean;
}

export interface SystemMetrics {
  timestamp: string;
  cpu_percent: number;
  cpu_cores: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_free_gb: number;
  disk_total_gb: number;
  battery: BatteryInfo;
  network: NetworkInfo;
  os: string;
  hostname: string;
  uptime: string;
}

export interface NotificationItem {
  id: number;
  source: string;
  sender: string;
  title: string;
  content: string;
  priority: NotificationPriority;
  is_read: number;
  is_simulated: number;
  timestamp: string;
}

export interface MemoryItem {
  id: number;
  category: string;
  key: string | null;
  content: string;
  created_at: string;
}

export interface ReminderItem {
  id: number;
  title: string;
  due_time: string;
  status: 'UPCOMING' | 'COMPLETED' | 'OVERDUE';
  priority: string;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  action_value: string;
  enabled: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  toolAction?: string;
  toolStatus?: 'COMPLETED' | 'EXECUTING' | 'CONFIRMATION_REQUIRED' | 'BLOCKED' | 'FAILED';
  toolResult?: any;
}

export interface FileEntry {
  name: string;
  is_dir: boolean;
  size_bytes: number;
  rel_path: string;
}

export interface CommandHistoryItem {
  id: number;
  command: string;
  action_type: string;
  security_level: 'SAFE' | 'CONFIRMATION_REQUIRED' | 'BLOCKED';
  status: 'COMPLETED' | 'FAILED' | 'BLOCKED';
  result: string;
  timestamp: string;
}

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  transcript: string;
  intent: string;
  targetOrQuery: string;
  appFound?: string;
  launchResult: string;
}
