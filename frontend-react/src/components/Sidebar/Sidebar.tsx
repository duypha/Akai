import React, { useState, useEffect } from 'react';
import { X, Monitor, MonitorOff, Volume2, VolumeX, Sun, Moon, Laptop, RefreshCw, PanelRight, Download } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../types';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isSharing: boolean;
  onToggleSharing: () => void;
  onSelectScreen?: (sourceId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isSharing,
  onToggleSharing,
  onSelectScreen,
  soundEnabled,
  onToggleSound
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [screenSources, setScreenSources] = useState<ScreenSource[]>([]);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={16} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
    { value: 'system', icon: <Laptop size={16} />, label: 'System' }
  ];

  // Load screen sources when in Electron
  const loadScreenSources = async () => {
    if (window.electronAPI?.getScreenSources) {
      try {
        const sources = await window.electronAPI.getScreenSources();
        setScreenSources(sources);
        setShowScreenPicker(true);
      } catch (err) {
        console.error('Failed to get screen sources:', err);
      }
    }
  };

  const handleShareScreen = () => {
    if (isElectron) {
      if (isSharing) {
        onToggleSharing();
      } else {
        loadScreenSources();
      }
    } else {
      onToggleSharing();
    }
  };

  const handleSelectSource = (sourceId: string) => {
    setShowScreenPicker(false);
    onSelectScreen?.(sourceId);
  };

  const handleRefreshSession = () => {
    if (window.electronAPI?.refreshSession) {
      window.electronAPI.refreshSession();
    } else {
      window.location.reload();
    }
  };

  const handleSnapToRight = () => {
    window.electronAPI?.snapToRight();
  };

  const handleCreateShortcut = () => {
    window.electronAPI?.createShortcut();
  };

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
          {/* Quick Actions */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Quick Actions</h3>
            <div className={styles.quickActions}>
              <button
                className={styles.actionButton}
                onClick={handleRefreshSession}
                title="Start new session"
              >
                <RefreshCw size={18} />
                <span>New Session</span>
              </button>
              {isElectron && (
                <button
                  className={styles.actionButton}
                  onClick={handleSnapToRight}
                  title="Snap window to right"
                >
                  <PanelRight size={18} />
                  <span>Snap Right</span>
                </button>
              )}
            </div>
          </section>

          {/* Screen Sharing - More Prominent */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Screen Sharing</h3>
            <button
              className={clsx(styles.shareButton, { [styles.sharing]: isSharing })}
              onClick={handleShareScreen}
            >
              {isSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
              <div className={styles.shareText}>
                <span className={styles.shareLabel}>
                  {isSharing ? 'Stop Sharing' : 'Share Screen'}
                </span>
                <span className={styles.shareHint}>
                  {isSharing ? 'Click to stop' : 'Let AI see your screen'}
                </span>
              </div>
            </button>

            {/* Screen Picker (Electron only) */}
            {showScreenPicker && screenSources.length > 0 && (
              <div className={styles.screenPicker}>
                <p className={styles.pickerLabel}>Select a screen or window:</p>
                <div className={styles.sourceGrid}>
                  {screenSources.map((source) => (
                    <button
                      key={source.id}
                      className={styles.sourceItem}
                      onClick={() => handleSelectSource(source.id)}
                    >
                      <img src={source.thumbnail} alt={source.name} />
                      <span>{source.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowScreenPicker(false)}
                >
                  Cancel
                </button>
              </div>
            )}
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

          {/* Desktop Shortcut (Electron only) */}
          {isElectron && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Desktop</h3>
              <button
                className={styles.optionButton}
                onClick={handleCreateShortcut}
              >
                <Download size={20} />
                <span>Create Desktop Shortcut</span>
              </button>
              <p className={styles.hint}>
                Add Akai icon to your desktop
              </p>
            </section>
          )}

          {/* About */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>About</h3>
            <div className={styles.about}>
              <p className={styles.version}>Akai v1.0.0</p>
              <p className={styles.description}>
                AI-powered assistant with screen vision, voice input, and UI analysis.
              </p>
              {isElectron && (
                <p className={styles.shortcut}>
                  <strong>Ctrl+Shift+A</strong> - Toggle window
                </p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
