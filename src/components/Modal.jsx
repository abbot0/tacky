import React, { useId } from 'react';

const CloseIcon = ()=>(
  <svg className="icon icon-xs" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.7 6.7a1 1 0 0 1 1.4 0L12 10.59l3.9-3.9a1 1 0 1 1 1.4 1.42L13.41 12l3.9 3.9a1 1 0 0 1-1.42 1.4L12 13.41l-3.9 3.9a1 1 0 0 1-1.4-1.42L10.59 12l-3.9-3.9a1 1 0 0 1 0-1.4z" fill="currentColor"/>
  </svg>
);

export default function Modal({ title, children, onClose, footer }){
  const headingId = useId();

  const handleBackdropClick = (event)=>{
    if(event.target === event.currentTarget){
      onClose?.();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="modal-header">
          <div className="modal-title" id={headingId}>{title}</div>
          <button type="button" className="icon-button ghost" onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
