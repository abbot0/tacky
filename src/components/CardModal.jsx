import React, { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { LABELS } from '../lib.js';

export default function CardModal({ initial, onClose, onSubmit }){
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [due, setDue] = useState(initial?.due ?? '');
  const [labels, setLabels] = useState(initial?.labels ?? []);

  const orderedLabels = useMemo(()=> LABELS ?? [], []);

  const toggleLabel = (color)=>{
    setLabels(prev => prev.includes(color)
      ? prev.filter(item=>item!==color)
      : [...prev, color]);
  };

  const submit = ()=>{
    if(!title.trim()) return;
    onSubmit?.({
      title: title.trim(),
      description,
      due,
      labels
    });
  };

  return (
    <Modal
      title="Edit card"
      onClose={onClose}
      footer={(
        <div className="modal-actions">
          <button type="button" className="button ghost-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="button accent-button" onClick={submit} disabled={!title.trim()}>
            Save card
          </button>
        </div>
      )}
    >
      <div className="modal-section">
        <label className="field-label" htmlFor="card-title-input">Title</label>
        <input
          id="card-title-input"
          className="field-input"
          value={title}
          onChange={(event)=>setTitle(event.target.value)}
        />
      </div>

      <div className="modal-section">
        <label className="field-label" htmlFor="card-description-input">Description</label>
        <textarea
          id="card-description-input"
          className="field-textarea"
          value={description}
          onChange={(event)=>setDescription(event.target.value)}
          placeholder="Add more context, links, or checklists."
        />
      </div>

      <div className="modal-section modal-inline">
        <div className="modal-field">
          <label className="field-label" htmlFor="card-due-input">Due date</label>
          <input
            id="card-due-input"
            className="field-input field-date"
            type="date"
            value={due}
            onChange={(event)=>setDue(event.target.value)}
          />
        </div>
      </div>

      <div className="modal-section">
        <label className="field-label">Labels</label>
        <div className="badge-row">
          {orderedLabels.map((color, index)=>(
            <button
              key={index}
              type="button"
              className={`badge${labels.includes(color) ? ' is-active' : ''}`}
              style={{ background:color }}
              onClick={()=>toggleLabel(color)}
              aria-label={`Toggle label ${index + 1}`}
            />
          ))}
        </div>
        <span className="field-hint">Click colors to toggle.</span>
      </div>
    </Modal>
  );
}
