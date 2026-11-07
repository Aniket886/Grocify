import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Theme and the Diwali seasonal decoration are controlled from here.
// Rules (from the redesign brief):
// - Dark theme is the DEFAULT. The light theme is only reachable from Settings.
// - The current theme is applied to <html data-theme="..."> so every page inherits it.
// - The Diwali decoration is on by default and can be turned off in Settings.
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = 'grocify_theme';
const DIWALI_KEY = 'grocify_diwali';

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
  const [diwali, setDiwaliState] = useState(() => readStored(DIWALI_KEY, 'on') !== 'off');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-diwali', diwali ? 'on' : 'off');
  }, [theme, diwali]);

  const value = useMemo(() => ({
    theme,
    diwali,
    setTheme: (t) => { setThemeState(t); writeStored(THEME_KEY, t); },
    toggleTheme: () => setThemeState((prev) => { const next = prev === 'dark' ? 'light' : 'dark'; writeStored(THEME_KEY, next); return next; }),
    setDiwali: (on) => { setDiwaliState(on); writeStored(DIWALI_KEY, on ? 'on' : 'off'); },
  }), [theme, diwali]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
