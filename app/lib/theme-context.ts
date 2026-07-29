import { createContext, use } from 'react';

export const THEME_STORAGE_KEY = 'yarra-theme';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  /** The user's stored preference, which may be 'system'. */
  theme: Theme;
  /** The theme actually being rendered right now. */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
