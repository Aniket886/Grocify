import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Theme control for Grocify.
// - Pure niche e-commerce theme system: Dark theme is the DEFAULT, light mode is toggleable.
// - The active theme is applied to <html data-theme="...">.
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
  // Only "dark" or "light". Visitors land on dark.
  const [theme, setThemeState] = useState(() => (readStored(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Explicitly purge any legacy attributes or keys
    try {
      document.documentElement.removeAttribute('data-diwali');
      localStorage.removeItem('grocify_diwali');
      sessionStorage.removeItem('grocify_diwali');
    } catch { /* storage blocked */ }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (t) => { setThemeState(t); writeStored(THEME_KEY, t); },
    toggleTheme: () => setThemeState((prev) => { const next = prev === 'dark' ? 'light' : 'dark'; writeStored(THEME_KEY, next); return next; }),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
