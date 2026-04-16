import { useState } from 'react';

/**
 * Simple toast notification system.
 * Push a toast, it auto-disappears after a delay.
 * You can also dismiss it manually.
 */
export default function useToasts() {
  const [toasts, setToasts] = useState([]);

  // Generate a short random ID for each toast
  function generateId() {
    return Math.random().toString(36).slice(2, 9);
  }

  // Show a new toast notification
  function pushToast({ title, message = '', tone = 'info', ttl = 3800 }) {
    const id = generateId();

    const newToast = { id, title, message, tone, ttl };
    setToasts((previous) => [...previous, newToast]);

    // Auto-remove the toast after it expires (ttl + small buffer for animation)
    const removalDelay = ttl + 250;
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, removalDelay);
  }

  // Manually dismiss a toast by its ID
  function dismissToast(id) {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }

  return { toasts, pushToast, dismissToast };
}
