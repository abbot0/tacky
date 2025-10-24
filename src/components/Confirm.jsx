import React from 'react';
import Modal from './Modal.jsx';

const ICON_PATHS = {
  default: [
    'M12 5.5a1.5 1.5 0 0 1 1.5 1.5v4.2c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V7a1.5 1.5 0 0 1 1.5-1.5z',
    'M12 16.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z'
  ],
  accent: [
    'M12 4l2.1 4.73 5.2.72-3.8 3.62.9 5.15-4.4-2.36-4.4 2.36.9-5.15-3.8-3.62 5.2-.72L12 4z'
  ],
  danger: [
    'M11.06 4.17a1.5 1.5 0 0 1 2.68 0l7.18 13.74A1.5 1.5 0 0 1 19.57 20H4.43a1.5 1.5 0 0 1-1.35-2.09l7.18-13.74z',
    'M12 9.25a1.25 1.25 0 0 0-1.25 1.25v3.25a1.25 1.25 0 1 0 2.5 0V10.5A1.25 1.25 0 0 0 12 9.25zm0 7.25a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z'
  ]
};

function ToneIcon({ tone }) {
  const key = tone === 'danger' ? 'danger' : tone === 'accent' ? 'accent' : 'default';
  const paths = ICON_PATHS[key];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((d, index) => (
        <path key={index} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function Confirm({
  title = 'Confirm',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onCancel,
  onConfirm
}){
  const confirmClass = tone === 'danger'
    ? 'button danger-button'
    : tone === 'accent'
      ? 'button accent-button'
      : 'button accent-button';

  const toneClass = tone === 'danger'
    ? 'confirm-tone-danger'
    : tone === 'accent'
      ? 'confirm-tone-accent'
      : 'confirm-tone-default';

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={(
        <div className="modal-actions">
          <button type="button" className="button ghost-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      )}
    >
      <div className={`confirm-shell ${toneClass}`}>
        <span className="confirm-icon">
          <ToneIcon tone={tone} />
        </span>
        <div className="confirm-copy">
          {children}
        </div>
      </div>
    </Modal>
  );
}
