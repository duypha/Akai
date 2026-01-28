// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

// Session types
export interface Session {
  id: string;
  code: string;
  createdAt: Date;
  messages: Message[];
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Voice state
export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  error?: string;
}

// Screen sharing state
export interface ScreenState {
  isSharing: boolean;
  stream?: MediaStream;
}

// Chat input state
export interface ChatInputState {
  message: string;
  isLoading: boolean;
}

// Settings
export interface Settings {
  theme: Theme;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// API Response types
export interface SessionResponse {
  session_id: string;
  code: string;
  created_at: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
}

export interface TranscribeResponse {
  transcript: string;
  session_id: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  name: string;
  capabilities: string[];
}
