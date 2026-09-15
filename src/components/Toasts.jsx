import React from 'react';
import { SvgIcon } from './icons.jsx';

export default function Toasts({ items, onDismiss }) {
  if (!items?.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.tone ?? 'default'}`}>
          <span className="toast-message">{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="toast-action"
              onClick={() => { toast.onAction?.(); onDismiss?.(toast.id); }}
            >
              {toast.actionLabel === 'Undo' && <SvgIcon name="undo" className="icon-xs" />}
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="toast-close" onClick={() => onDismiss?.(toast.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
