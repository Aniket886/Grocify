import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Theme control for Grocify.
// - Dark theme is the DEFAULT. The light theme is reachable from Settings.
// - The current theme is applied to <html data-theme="..."> so every page inherits it.
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = 'grocify_theme';

function readStored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export function ThemeProvider({ children }) {
  // Only "dark" or "light". New visitors land on dark.
  const [theme, setThemeState] = useState(() => (readStored(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.removeAttribute('data-diwali');
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    diwali: false,
    setTheme: (t) => { setThemeState(t); writeStored(THEME_KEY, t); },
    toggleTheme: () => setThemeState((prev) => { const next = prev === 'dark' ? 'light' : 'dark'; writeStored(THEME_KEY, next); return next; }),
    setDiwali: () => {},
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
