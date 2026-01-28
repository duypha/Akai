import React, { useState, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import {
  Header,
  ChatArea,
  ChatInput,
  Sidebar,
  WelcomeScreen
} from './components';
import './styles/global.css';

function ChatApp() {
  const {
    session,
    messages,
    isConnected,
    isLoading,
    createSession,
    sendMessage
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleToggleSharing = useCallback(async () => {
    if (isSharing) {
      setIsSharing(false);
      // Stop sharing logic here
    } else {
      try {
        // Request screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        setIsSharing(true);

        // Handle stream end
        stream.getVideoTracks()[0].onended = () => {
          setIsSharing(false);
        };
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    }
  }, [isSharing]);

  if (!isConnected) {
    return (
      <WelcomeScreen
        onStart={createSession}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        onMenuClick={() => setIsSidebarOpen(true)}
        onSettingsClick={() => setIsSidebarOpen(true)}
        sessionCode={session?.code}
      />

      <main className="app-main">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
        />

        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          sessionId={session?.id || null}
        />
      </main>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSharing={isSharing}
        onToggleSharing={handleToggleSharing}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <ChatApp />
      </ChatProvider>
    </ThemeProvider>
  );
}
