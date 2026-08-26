import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeMode } from '../theme/nsTokens';

const STORAGE_KEY = 'ns-theme-mode';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined
);

const getInitialMode = (): ThemeMode => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // No explicit preference saved yet — default to whatever the OS/browser
  // already reports, rather than always forcing light on a first visit.
  const prefersDark = window.matchMedia?.(
    '(prefers-color-scheme: dark)'
  ).matches;
  return prefersDark ? 'dark' : 'light';
};

export const ThemeModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (next: ThemeMode) => setModeState(next);
  const toggleMode = () =>
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeModeContextValue => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
};
