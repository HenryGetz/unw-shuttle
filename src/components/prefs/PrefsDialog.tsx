import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null,
  );
}

export interface PrefsDialogProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  size?: 'onboarding' | 'editor';
  dismissOnBackdrop?: boolean;
  decor?: ReactNode;
  footer: ReactNode;
  onDismiss: () => void;
  children: ReactNode;
}

/**
 * Shared modal shell for personalization surfaces. Desktop gets a centered dialog,
 * mobile a bottom sheet with the same focus, scroll-lock and Escape behavior.
 */
export function PrefsDialog({
  eyebrow,
  title,
  subtitle,
  size = 'editor',
  dismissOnBackdrop = true,
  decor,
  footer,
  onDismiss,
  children,
}: PrefsDialogProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dismissRef = useRef(onDismiss);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    sheetRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = sheetRef.current;
      if (!root) return;
      const items = focusableWithin(root);
      if (items.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && root.contains(active);
      if (event.shiftKey && (!inside || active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div
      className="prefs-overlay"
      onClick={(event) => {
        if (!dismissOnBackdrop) return;
        if (event.target === event.currentTarget) dismissRef.current();
      }}
    >
      <div
        ref={sheetRef}
        className={`prefs-sheet prefs-sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
      >
        {decor}
        <div className="prefs-grip" aria-hidden="true" />
        <header className="prefs-head">
          <div className="prefs-head__text">
            <p className="prefs-eyebrow">{eyebrow}</p>
            <h2 className="prefs-title" id={titleId}>
              {title}
            </h2>
            {subtitle && (
              <p className="prefs-sub" id={subtitleId}>
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="prefs-close" onClick={onDismiss} aria-label="Close">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="prefs-body">{children}</div>
        <footer className="prefs-foot">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}
