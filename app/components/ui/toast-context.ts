import { createContext, use } from 'react';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  toast: (message: Omit<ToastMessage, 'id' | 'variant'> & { variant?: ToastVariant }) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

/**
 * How long a toast stays on screen.
 *
 * Exported because the E2E suite needs to reason about it — not to sleep for
 * this long, but to prove the toast is asserted on with a web-first expectation
 * that resolves before the toast auto-dismisses.
 */
export const TOAST_DURATION_MS = 4000;
