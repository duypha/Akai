import React from 'react';
import { Moon, Sun, Settings, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  sessionCode?: string;
}

export function Header({ onMenuClick, onSettingsClick, sessionCode }: HeaderProps) {
  const { actualTheme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className={styles.brand}>
          <h1 className={styles.title}>Akai</h1>
          <span className={styles.subtitle}>AI Assistant</span>
        </div>
      </div>

      <div className={styles.right}>
        {sessionCode && (
          <div className={styles.sessionBadge}>
            <span className={styles.sessionLabel}>Session</span>
            <span className={styles.sessionCode}>{sessionCode}</span>
          </div>
        )}

        <button
          className={styles.iconButton}
          onClick={toggleTheme}
          aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
        >
          {actualTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          className={styles.iconButton}
          onClick={onSettingsClick}
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
