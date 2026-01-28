import React from 'react';
import { format } from 'date-fns';
import { User, Bot, AlertCircle, Check, Clock } from 'lucide-react';
import { Message } from '../../types';
import styles from './ChatMessage.module.css';
import clsx from 'clsx';

interface ChatMessageProps {
  message: Message;
  showTimestamp?: boolean;
}

export function ChatMessage({ message, showTimestamp = true }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const StatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock size={12} className={styles.statusIcon} />;
      case 'sent':
        return <Check size={12} className={styles.statusIcon} />;
      case 'error':
        return <AlertCircle size={12} className={clsx(styles.statusIcon, styles.errorIcon)} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx(styles.messageContainer, {
        [styles.user]: isUser,
        [styles.assistant]: !isUser
      })}
      role="article"
      aria-label={`${isUser ? 'You' : 'Akai'} said`}
    >
      <div className={styles.avatar}>
        {isUser ? (
          <User size={18} />
        ) : (
          <Bot size={18} />
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.bubble}>
          <p className={styles.text}>{message.content}</p>
        </div>

        {showTimestamp && (
          <div className={styles.meta}>
            <span className={styles.timestamp}>
              {format(message.timestamp, 'h:mm a')}
            </span>
            {isUser && <StatusIcon />}
          </div>
        )}
      </div>
    </div>
  );
}
