import { useCallback, useMemo, useState, type ReactNode } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { cn } from '@/lib/cn';
import {
  ToastContext,
  TOAST_DURATION_MS,
  type ToastContextValue,
  type ToastMessage,
  type ToastVariant,
} from './toast-context';

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-border',
  success: 'border-success/40',
  error: 'border-danger/50',
};

/**
 * Toasts auto-dismiss after four seconds.
 *
 * That is a deliberate testing hazard: any assertion that waits before looking
 * will miss the toast, and any test that pauses between the action and the
 * check becomes flaky. It forces the suite to use web-first assertions that
 * poll from the moment they are called.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>((message) => {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), variant: 'default', ...message },
    ]);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      <RadixToast.Provider duration={TOAST_DURATION_MS} swipeDirection="right">
        {children}

        {messages.map((message) => (
          <RadixToast.Root
            key={message.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(message.id);
            }}
            data-testid="toast"
            data-variant={message.variant}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-surface p-4 shadow-raised',
              variantClasses[message.variant],
            )}
          >
            <div className="flex-1">
              <RadixToast.Title className="text-sm font-medium text-fg">{message.title}</RadixToast.Title>
              {message.description ? (
                <RadixToast.Description className="mt-1 text-sm text-fg-muted">
                  {message.description}
                </RadixToast.Description>
              ) : null}
            </div>
            <RadixToast.Close
              aria-label="Dismiss notification"
              className="rounded-sm p-1 text-fg-muted transition-colors hover:text-fg"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}

        <RadixToast.Viewport className="fixed right-4 bottom-4 z-100 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext>
  );
}
