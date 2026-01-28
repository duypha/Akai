import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice';
import styles from './ChatInput.module.css';
import clsx from 'clsx';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  sessionId: string | null;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, sessionId, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isProcessing,
    error: voiceError,
    startRecording,
    stopRecording
  } = useVoice(sessionId);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceStart = async () => {
    if (!disabled && !isRecording) {
      await startRecording();
    }
  };

  const handleVoiceEnd = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        onSend(transcript);
      }
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.inputWrapper} onSubmit={handleSubmit}>
        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isLoading}
            rows={1}
            aria-label="Message input"
          />

          <div className={styles.actions}>
            {/* Voice Button */}
            <button
              type="button"
              className={clsx(styles.voiceButton, {
                [styles.recording]: isRecording,
                [styles.processing]: isProcessing
              })}
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceEnd}
              onMouseLeave={handleVoiceEnd}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceEnd}
              disabled={disabled || isLoading}
              aria-label={isRecording ? 'Recording...' : 'Hold to speak'}
            >
              {isProcessing ? (
                <Loader2 size={20} className={styles.spinner} />
              ) : isRecording ? (
                <MicOff size={20} />
              ) : (
                <Mic size={20} />
              )}
              <span className={styles.voiceLabel}>
                {isProcessing ? 'Processing' : isRecording ? 'Release' : 'Hold'}
              </span>
            </button>

            {/* Send Button */}
            <button
              type="submit"
              className={clsx(styles.sendButton, {
                [styles.active]: message.trim().length > 0
              })}
              disabled={!message.trim() || isLoading || disabled}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={20} className={styles.spinner} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>

        {voiceError && (
          <p className={styles.error}>{voiceError}</p>
        )}
      </form>

      <p className={styles.hint}>
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
