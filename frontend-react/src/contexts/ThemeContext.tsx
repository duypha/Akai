import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('akai-theme');
    return (saved as Theme) || 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActualTheme(prefersDark ? 'dark' : 'light');
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateActualTheme);

    return () => mediaQuery.removeEventListener('change', updateActualTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    localStorage.setItem('akai-theme', theme);
  }, [theme, actualTheme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return actualTheme === 'light' ? 'dark' : 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
