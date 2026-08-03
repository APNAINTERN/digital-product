import { create } from 'zustand';
import type { ThemePreference } from '@/types';

const themeStorageKey = 'seo-vision-theme';

type ThemeState = {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
  hydrate: () => void;
};

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const applyTheme = (theme: ThemePreference) => {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.classList.toggle('light', resolvedTheme === 'light');
  document.documentElement.dataset.theme = resolvedTheme;
  return resolvedTheme;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: (theme) => {
    window.localStorage.setItem(themeStorageKey, theme);
    set({ theme, resolvedTheme: applyTheme(theme) });
  },
  hydrate: () => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const theme = isThemePreference(storedTheme) ? storedTheme : 'dark';
    set({ theme, resolvedTheme: applyTheme(theme) });
  },
}));

export const hydrateThemeStore = () => useThemeStore.getState().hydrate();
