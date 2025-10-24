import React, { useState } from 'react';
import Modal from './Modal.jsx';

export default function ListModal({ title = 'Add list', onClose, onSubmit }){
  const [listTitle, setListTitle] = useState('');

  const submit = ()=>{
    if(!listTitle.trim()) return;
    onSubmit?.({ title:listTitle.trim() });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <div className="modal-actions">
          <button type="button" className="button ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button accent-button"
            onClick={submit}
            disabled={!listTitle.trim()}
          >
            Add list
          </button>
        </div>
      )}
    >
      <div className="modal-section">
        <label className="field-label" htmlFor="list-title-input">List title</label>
        <input
          id="list-title-input"
          className="field-input"
          value={listTitle}
          onChange={(event)=>setListTitle(event.target.value)}
          placeholder="To do"
        />
      </div>
    </Modal>
  );
}
