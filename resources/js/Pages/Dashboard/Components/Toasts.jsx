import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders toast notifications.
 * Uses a portal to render them at the top of the page (in document.body).
 */
export default function Toasts({ toasts, onDismiss }) {
  const toastElements = (
    <div className="toast-wrap" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.tone ? `toast--${toast.tone}` : ''}`}
        >
          <div className="toast__title">{toast.title}</div>

          {toast.message && (
            <div className="toast__msg">{toast.message}</div>
          )}

          <button className="toast__close" onClick={() => onDismiss(toast.id)}>
            ✕
          </button>

          <div
            className="toast__bar"
            style={{ animationDuration: `${toast.ttl}ms` }}
          />
        </div>
      ))}
    </div>
  );

  // Use a portal so toasts always appear on top of everything
  const canUsePortal = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (canUsePortal) {
    return createPortal(toastElements, document.body);
  }

  return toastElements;
}
