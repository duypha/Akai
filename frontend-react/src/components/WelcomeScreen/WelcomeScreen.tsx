import React from 'react';
import { MessageSquare, Monitor, Mic, Palette, Loader2 } from 'lucide-react';
import styles from './WelcomeScreen.module.css';

interface WelcomeScreenProps {
  onStart: () => void;
  isLoading: boolean;
}

export function WelcomeScreen({ onStart, isLoading }: WelcomeScreenProps) {
  const features = [
    {
      icon: <MessageSquare size={24} />,
      title: 'Smart Chat',
      description: 'Natural conversations with AI assistance'
    },
    {
      icon: <Monitor size={24} />,
      title: 'Screen Vision',
      description: 'Share your screen for visual help'
    },
    {
      icon: <Mic size={24} />,
      title: 'Voice Input',
      description: 'Speak naturally, get instant responses'
    },
    {
      icon: <Palette size={24} />,
      title: 'UI Analysis',
      description: 'Get feedback on designs and interfaces'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Akai</h1>
          <p className={styles.subtitle}>Your AI Assistant</p>
        </div>

        <p className={styles.tagline}>
          Chat, share your screen, and get help with anything.
        </p>

        <button
          className={styles.startButton}
          onClick={onStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className={styles.spinner} />
              Connecting...
            </>
          ) : (
            'Start Conversation'
          )}
        </button>

        <div className={styles.features}>
          {features.map((feature, index) => (
            <div key={index} className={styles.feature}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div className={styles.featureText}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
