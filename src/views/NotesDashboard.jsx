import React, { useMemo, useState } from 'react';
import Confirm from '../components/Confirm.jsx';
import { SvgIcon } from '../components/icons.jsx';

export default function NotesDashboard({ notes, onSelect, onCreate, onUpdateNote, onDeleteNote }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(()=>{
    const counts = new Map();
    (Array.isArray(notes) ? notes : []).forEach(n => (n.tags ?? []).forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]));
  },[notes]);

  const items = useMemo(()=>{
    const source = Array.isArray(notes) ? notes.slice() : [];
    const q = query.trim().toLowerCase();
    const filtered = source.filter(note=>{
      if(activeTag && !(note.tags ?? []).includes(activeTag)) return false;
      if(!q) return true;
      return `${note.title ?? ''} ${note.content ?? ''} ${(note.tags ?? []).join(' ')}`.toLowerCase().includes(q);
    });
    return filtered.sort((a,b)=>{
      const pin = Number(b.pinned) - Number(a.pinned);
      if (pin) return pin;
      if(sort === 'title') return (a.title ?? '').localeCompare(b.title ?? '');
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  },[notes, query, sort, activeTag]);

  const startEditing = (note)=> setEditing({ id:note.id, value:note.title ?? '' });
  const commitEditing = ()=>{
    if(!editing) return;
    const next = editing.value.trim();
    if(next && typeof onUpdateNote === 'function'){
      onUpdateNote({ id: editing.id, title: next, updatedAt: Date.now() });
    }
    setEditing(null);
  };
  const cancelEditing = ()=> setEditing(null);

  return (
    <div className="collection-dashboard">
      <header className="collection-header">
        <div className="collection-header-copy">
          <h1>Notes</h1>
          <p>Search and organise your documents, then jump into the editor when ready.</p>
        </div>
        <div className="collection-header-actions">
          <button type="button" className="button accent-button" onClick={onCreate}>
            New note
          </button>
        </div>
      </header>

      <div className="collection-controls">
        <label className="collection-control">
          <span className="collection-control-label">Search</span>
          <input
            className="collection-input"
            placeholder="Find notes..."
            value={query}
            onChange={evt=>setQuery(evt.target.value)}
          />
        </label>
        <label className="collection-control">
          <span className="collection-control-label">Sort</span>
          <select value={sort} onChange={evt=>setSort(evt.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="title">Title A-Z</option>
          </select>
        </label>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter-row">
          <button type="button" className={`tag-chip${activeTag ? '' : ' is-active'}`} onClick={()=>setActiveTag(null)}>All</button>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip${activeTag === tag ? ' is-active' : ''}`}
              onClick={()=>setActiveTag(activeTag === tag ? null : tag)}
            >
              #{tag} <span>{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="collection-grid">
        <article className="collection-card collection-card-cta" onClick={onCreate}>
          <h3>Start a note</h3>
          <p>Capture quick thoughts, meeting minutes, or docs.</p>
          <span className="link-label">Create</span>
        </article>
        {items.map(note=>(
          <article
            key={note.id}
            className={`collection-card${note.pinned ? ' is-pinned' : ''}`}
            onClick={()=>onSelect?.(note.id)}
          >
            <header className="collection-card-header">
              {editing?.id === note.id ? (
                <div className="card-rename" onClick={event=>event.stopPropagation()} role="presentation">
                  <input
                    className="card-rename-input"
                    autoFocus
                    value={editing.value}
                    onChange={event=>setEditing(prev=>({ ...prev, value:event.target.value }))}
                    onBlur={commitEditing}
                    onKeyDown={event=>{
                      if(event.key==='Enter'){ event.preventDefault(); commitEditing(); }
                      if(event.key==='Escape'){ event.preventDefault(); cancelEditing(); }
                    }}
                  />
                </div>
              ) : (
                <h3>{note.pinned && <SvgIcon name="pin" className="icon-xs" />}{note.title || 'Untitled note'}</h3>
              )}
              <div className="card-actions-row">
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={event=>{ event.stopPropagation(); onUpdateNote?.({ id: note.id, pinned: !note.pinned }); }}
                >
                  {note.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={event=>{ event.stopPropagation(); startEditing(note); }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="card-action-btn danger"
                  onClick={event=>{ event.stopPropagation(); setConfirm({ id:note.id, title:note.title }); }}
                >
                  Delete
                </button>
              </div>
            </header>
            <div className="collection-card-body">
              <p>{(note.content ?? '').slice(0,140) || 'No content yet.'}</p>
              {note.tags?.length > 0 && (
                <div className="collection-card-tags">{note.tags.map(t => <span key={t} className="tag-chip">#{t}</span>)}</div>
              )}
            </div>
            <footer className="collection-card-footer">
              Updated {new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleString()}
            </footer>
          </article>
        ))}
        {!items.length && (
          <div className="collection-empty">
            <p>No notes match your filters.</p>
            <button type="button" className="button accent-button" onClick={onCreate}>
              Create your first note
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <Confirm
          title="Delete note?"
          confirmLabel="Delete note"
          tone="danger"
          onCancel={()=>setConfirm(null)}
          onConfirm={()=>{ onDeleteNote?.(confirm.id); setConfirm(null); }}
        >
          <div className="confirm-copy">
            This will remove <strong>{confirm.title || 'this note'}</strong>. You can undo for a few seconds afterwards.
          </div>
        </Confirm>
      )}
    </div>
  );
}
