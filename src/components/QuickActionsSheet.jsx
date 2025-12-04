import React, { useEffect, useRef } from 'react';

const QUICK_LINKS = [
  { key: 'overview', label: 'Go to overview', hint: 'Cmd/Ctrl+1', action: 'overview' },
  { key: 'boards', label: 'Boards dashboard', hint: 'Cmd/Ctrl+2', action: 'boards' },
  { key: 'notes', label: 'Notes workspace', hint: 'Cmd/Ctrl+3', action: 'notes-dashboard' },
  { key: 'canvas', label: 'Canvas studio', hint: 'Cmd/Ctrl+4', action: 'canvas-dashboard' },
  { key: 'settings', label: 'Open settings', hint: 'Cmd/Ctrl+,', action: 'settings' },
];

export default function QuickActionsSheet({
  isOpen,
  onClose,
  onCreateBoard,
  onCreateNote,
  onCreateCanvas,
  onNavigate,
}) {
  const firstButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const target = firstButtonRef.current;
    if (target) target.focus();
    return () => {
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="quick-actions-overlay" role="dialog" aria-modal="true">
      <div className="quick-actions-backdrop" onClick={onClose} />
      <div className="quick-actions-panel">
        <header className="quick-actions-header">
          <div>
            <h2>Quick actions</h2>
            <p>Jump to workspaces or create something new without leaving your flow.</p>
          </div>
          <button type="button" className="quick-actions-close" onClick={onClose} aria-label="Close quick actions">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="quick-actions-body">
          <section className="quick-actions-group">
            <h3>Create</h3>
            <div className="quick-actions-grid">
              <button
                type="button"
                ref={firstButtonRef}
                onClick={() => {
                  onClose?.();
                  onCreateBoard?.();
                }}
              >
                <span className="qa-title">New board</span>
                <span className="qa-subtitle">Plan a new project with lists and cards.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onCreateNote?.();
                }}
              >
                <span className="qa-title">New note</span>
                <span className="qa-subtitle">Capture ideas and documentation instantly.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onCreateCanvas?.();
                }}
              >
                <span className="qa-title">New canvas</span>
                <span className="qa-subtitle">Sketch flows or concepts in the canvas studio.</span>
              </button>
            </div>
          </section>
          <section className="quick-actions-group">
            <h3>Navigate</h3>
            <ul className="quick-actions-links">
              {QUICK_LINKS.map(link => (
                <li key={link.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      if (link.action && typeof onNavigate === 'function') {
                        onNavigate(link.action);
                      }
                    }}
                  >
                    <span className="qa-title">{link.label}</span>
                    <span className="qa-hint">{link.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <footer className="quick-actions-footer">
          <span>Tip: Press Cmd/Ctrl+K anytime to open quick actions.</span>
        </footer>
      </div>
    </div>
  );
}
