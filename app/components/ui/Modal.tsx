import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  /** Test hook, so a spec can target one dialog when several exist. */
  testId?: string;
}

/**
 * Modal dialog built on Radix.
 *
 * Radix is doing real work here, not just styling: it moves focus into the
 * dialog on open, traps Tab within it, restores focus to the trigger on close,
 * marks the rest of the page `aria-hidden`, and wires Escape. Those are exactly
 * the behaviours the accessibility and keyboard-navigation tests assert on, and
 * hand-rolling them is how you end up with a dialog that a keyboard user can
 * tab straight out of behind the overlay.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  testId,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          data-testid={testId}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-raised',
            size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
          )}
        >
          <Dialog.Title className="font-display text-xl text-fg">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1.5 text-sm text-fg-muted">{description}</Dialog.Description>
          ) : (
            // Radix warns without a description; an explicit empty one keeps
            // the console clean without inventing copy.
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}

          <div className="mt-5">{children}</div>

          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}

          <Dialog.Close
            aria-label="Close dialog"
            className="absolute top-4 right-4 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
