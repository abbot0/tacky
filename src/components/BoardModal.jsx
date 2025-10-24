import React, { useState } from 'react';
import { WALLPAPERS } from '../lib.js';
import Modal from './Modal.jsx';

export default function BoardModal({
  title = 'Create board',
  initial,
  onClose,
  onSubmit
}){
  const [name, setName] = useState(initial?.name ?? '');
  const [wallpaper, setWallpaper] = useState(initial?.wallpaper ?? WALLPAPERS[0]);

  const submit = ()=>{
    if(!name.trim()) return;
    onSubmit?.({ name: name.trim(), wallpaper });
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
          placeholder="Project X"
        />
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
