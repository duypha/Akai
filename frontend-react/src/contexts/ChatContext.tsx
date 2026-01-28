import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Message, Session } from '../types';

interface ChatContextType {
  session: Session | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  createSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/session/create', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();

      setSession({
        id: data.session_id,
        code: data.code,
        createdAt: new Date(data.created_at),
        messages: []
      });

      // Add welcome message
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hello, I\'m Akai.\n\nHow can I help you today?',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages([welcomeMessage]);
      setIsConnected(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!session || !content.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', content.trim());
      formData.append('session_id', session.id);

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Update user message status
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));

      // Add assistant response - split by double newlines for multiple bubbles
      const responseChunks = data.response.split(/\n\n+/).filter((chunk: string) => chunk.trim());

      responseChunks.forEach((chunk: string, index: number) => {
        setTimeout(() => {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: chunk.trim(),
            timestamp: new Date(),
            status: 'sent'
          };
          setMessages(prev => [...prev, assistantMessage]);
        }, index * 150); // Stagger messages for effect
      });

    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      ));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ChatContext.Provider value={{
      session,
      messages,
      isConnected,
      isLoading,
      error,
      createSession,
      sendMessage,
      addMessage,
      clearError
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
