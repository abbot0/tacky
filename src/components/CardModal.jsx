import React, { useState } from 'react';
import Modal from './Modal.jsx';
import { LABELS, PRIORITIES, uid, dueStatus } from '../lib.js';

export default function CardModal({ initial, onClose, onSubmit, onDelete }){
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [due, setDue] = useState(initial?.due ?? '');
  const [labels, setLabels] = useState(initial?.labels ?? []);
  const [priority, setPriority] = useState(initial?.priority ?? 'none');
  const [checklist, setChecklist] = useState(initial?.checklist ?? []);
  const [newItem, setNewItem] = useState('');

  const toggleLabel = (color)=>{
    setLabels(prev => prev.includes(color) ? prev.filter(item=>item!==color) : [...prev, color]);
  };

  const addChecklistItem = ()=>{
    const text = newItem.trim();
    if (!text) return;
    setChecklist(prev => [...prev, { id: uid('ck'), text, done:false }]);
    setNewItem('');
  };
  const updateItem = (id, patch)=> setChecklist(prev => prev.map(item => item.id===id ? { ...item, ...patch } : item));
  const removeItem = (id)=> setChecklist(prev => prev.filter(item => item.id!==id));

  const submit = ()=>{
    if(!title.trim()) return;
    onSubmit?.({ title: title.trim(), description, due, labels, priority, checklist });
  };

  const handleKeyDown = (event)=>{
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter'){ event.preventDefault(); submit(); }
  };

  const done = checklist.filter(i=>i.done).length;
  const status = dueStatus(due);

  return (
    <Modal
      title="Edit card"
      onClose={onClose}
      footer={(
        <div className="modal-actions modal-actions-split">
          {onDelete && (
            <button type="button" className="button danger-button" onClick={onDelete}>Delete</button>
          )}
          <span className="spacer" />
          <button type="button" className="button ghost-button" onClick={onClose}>Close</button>
          <button type="button" className="button accent-button" onClick={submit} disabled={!title.trim()} title="Ctrl+Enter">
            Save card
          </button>
        </div>
      )}
    >
      <div onKeyDown={handleKeyDown}>
        <div className="modal-section">
          <label className="field-label" htmlFor="card-title-input">Title</label>
          <input
            id="card-title-input"
            className="field-input"
            value={title}
            autoFocus
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
            placeholder="Add more context, links, or notes."
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
            {status && <span className={`field-hint due-${status.tone}`}>{status.label}</span>}
          </div>
          <div className="modal-field">
            <label className="field-label" htmlFor="card-priority-input">Priority</label>
            <select
              id="card-priority-input"
              className="field-input"
              value={priority}
              onChange={(event)=>setPriority(event.target.value)}
            >
              {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-section">
          <label className="field-label">Labels</label>
          <div className="badge-row">
            {LABELS.map((color, index)=>(
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
        </div>

        <div className="modal-section">
          <div className="checklist-header">
            <label className="field-label">Checklist</label>
            {checklist.length > 0 && <span className="field-hint">{done}/{checklist.length} done</span>}
          </div>
          {checklist.length > 0 && (
            <div className="card-progress" aria-hidden="true">
              <span style={{ width: `${Math.round((done / checklist.length) * 100)}%` }} />
            </div>
          )}
          <ul className="checklist">
            {checklist.map(item => (
              <li key={item.id} className={item.done ? 'is-done' : ''}>
                <input type="checkbox" checked={item.done} onChange={(e)=>updateItem(item.id, { done: e.target.checked })} aria-label="Toggle item" />
                <input
                  className="checklist-text"
                  value={item.text}
                  onChange={(e)=>updateItem(item.id, { text: e.target.value })}
                />
                <button type="button" className="icon-small danger" onClick={()=>removeItem(item.id)} aria-label="Remove item">×</button>
              </li>
            ))}
          </ul>
          <div className="checklist-add">
            <input
              className="field-input"
              placeholder="Add an item and press Enter"
              value={newItem}
              onChange={(e)=>setNewItem(e.target.value)}
              onKeyDown={(e)=>{ if (e.key === 'Enter'){ e.preventDefault(); addChecklistItem(); } }}
            />
            <button type="button" className="button ghost-button" onClick={addChecklistItem} disabled={!newItem.trim()}>Add</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
