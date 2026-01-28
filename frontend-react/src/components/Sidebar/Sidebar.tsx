import React from 'react';
import { X, Monitor, MonitorOff, Volume2, VolumeX, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../types';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isSharing: boolean;
  onToggleSharing: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isSharing,
  onToggleSharing,
  soundEnabled,
  onToggleSound
}: SidebarProps) {
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={16} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
    { value: 'system', icon: <Laptop size={16} />, label: 'System' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(styles.backdrop, { [styles.open]: isOpen })}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={clsx(styles.sidebar, { [styles.open]: isOpen })}
        aria-label="Settings"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Screen Sharing */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Screen Sharing</h3>
            <button
              className={clsx(styles.optionButton, { [styles.active]: isSharing })}
              onClick={onToggleSharing}
            >
              {isSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              <span>{isSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
            <p className={styles.hint}>
              Share your screen to get visual assistance
            </p>
          </section>

          {/* Sound */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Voice Response</h3>
            <button
              className={clsx(styles.optionButton, { [styles.active]: soundEnabled })}
              onClick={onToggleSound}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>
            <p className={styles.hint}>
              Enable text-to-speech for AI responses
            </p>
          </section>

          {/* Theme */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Appearance</h3>
            <div className={styles.themeSelector}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={clsx(styles.themeOption, {
                    [styles.selected]: theme === option.value
                  })}
                  onClick={() => setTheme(option.value)}
                  aria-pressed={theme === option.value}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* About */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>About</h3>
            <div className={styles.about}>
              <p className={styles.version}>Akai v1.0.0</p>
              <p className={styles.description}>
                AI-powered assistant with screen vision, voice input, and UI analysis capabilities.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
