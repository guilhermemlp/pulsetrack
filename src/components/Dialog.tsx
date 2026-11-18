import React, { useEffect, useRef } from 'react';

interface DialogProps {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Modal compartilhado: prende o foco, fecha com Escape quando seguro e devolve
 * o foco ao disparador. O conteúdo de fundo continua visível, mas não recebe foco.
 */
export const Dialog: React.FC<DialogProps> = ({
  labelledBy,
  describedBy,
  onClose,
  closeOnEscape = true,
  initialFocusRef,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const target =
        initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog;
      target.focus();
    };

    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (closeOnEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === dialog || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || active === dialog || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !dialog.contains(event.target) &&
        dialog.isConnected
      ) {
        focusFirst();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [initialFocusRef]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 32, 0.55)' }}
    >
      {children}
    </div>
  );
};
