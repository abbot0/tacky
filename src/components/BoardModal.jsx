import React, { useState } from 'react';
import { WALLPAPERS, BOARD_TEMPLATES } from '../lib.js';
import Modal from './Modal.jsx';

export default function BoardModal({
  title = 'Create board',
  initial,
  onClose,
  onSubmit
}){
  const [name, setName] = useState(initial?.name ?? '');
  const [wallpaper, setWallpaper] = useState(initial?.wallpaper ?? WALLPAPERS[0]);
  const [template, setTemplate] = useState(initial?.template ?? 'kanban');

  const submit = ()=>{
    if(!name.trim()) return;
    onSubmit?.({ name: name.trim(), wallpaper, template });
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
            disabled={!name.trim()}
          >
            Create board
          </button>
        </div>
      )}
    >
      <div className="modal-section">
        <label className="field-label" htmlFor="board-name-input">Board name</label>
        <input
          id="board-name-input"
          className="field-input"
          value={name}
          onChange={(event)=>setName(event.target.value)}
          autoFocus
          onKeyDown={(event)=>{ if(event.key==="Enter"){ event.preventDefault(); submit(); } }}
          placeholder="Project X"
        />
      </div>

      <div className="modal-section">
        <label className="field-label">Template</label>
        <div className="template-grid">
          {BOARD_TEMPLATES.map(option => (
            <button
              key={option.id}
              type="button"
              className={`template-card${option.id===template ? ' is-selected' : ''}`}
              onClick={()=>setTemplate(option.id)}
              aria-pressed={option.id===template}
            >
              <span className="template-name">{option.name}</span>
              <span className="template-desc">{option.description}</span>
              {option.lists.length > 0 && (
                <span className="template-lists" aria-hidden="true">
                  {option.lists.map(l => <span key={l} />)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-section">
        <label className="field-label">Wallpaper</label>
        <div className="wallpaper-grid">
          {WALLPAPERS.map((option, index)=>(
            <button
              key={index}
              type="button"
              className={`wallpaper${option===wallpaper ? ' is-selected' : ''}`}
              style={{ background:option }}
              onClick={()=>setWallpaper(option)}
              aria-label={`Select wallpaper ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
