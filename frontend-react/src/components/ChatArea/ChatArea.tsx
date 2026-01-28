import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import styles from './ChatArea.module.css';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatArea({ messages, isLoading }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.messagesWrapper}>
        <div className={styles.messages}>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              showTimestamp={
                // Show timestamp if it's the last message or if there's a gap
                index === messages.length - 1 ||
                messages[index + 1]?.role !== message.role
              }
            />
          ))}

          {isLoading && (
            <div className={styles.typingIndicator}>
              <div className={styles.dot} />
              <div className={styles.dot} />
              <div className={styles.dot} />
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}
