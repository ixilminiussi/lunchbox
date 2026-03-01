import { useState, useEffect } from 'preact/hooks';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lunchbox-theme';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemTheme();
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      class="theme-switch"
      role="switch"
      aria-checked={isDark}
      aria-label={`Dark mode: ${isDark ? 'on' : 'off'}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span class="theme-switch__icon" aria-hidden="true">light</span>
      <span class="theme-switch__icon" aria-hidden="true">dark</span>
    </button>
  );
}
