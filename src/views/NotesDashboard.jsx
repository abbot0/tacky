import React, { useMemo, useState } from 'react';

export default function NotesDashboard({ notes, onSelect, onCreate }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');

  const items = useMemo(()=>{
    const source = Array.isArray(notes) ? notes.slice() : [];
    const filtered = source.filter(note=>{
      if(!query.trim()) return true;
      const target = `${note.title ?? ''} ${note.content ?? ''}`.toLowerCase();
      return target.includes(query.toLowerCase());
    });
    const sorted = filtered.sort((a,b)=>{
      if(sort === 'title'){
        return (a.title ?? '').localeCompare(b.title ?? '');
      }
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
    return sorted;
  },[notes, query, sort]);

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

      <div className="collection-grid">
        <article className="collection-card collection-card-cta" onClick={onCreate}>
          <h3>Start a note</h3>
          <p>Capture quick thoughts, meeting minutes, or docs.</p>
          <span className="link-label">Create</span>
        </article>
        {items.map(note=>(
          <article
            key={note.id}
            className="collection-card"
            onClick={()=>onSelect?.(note.id)}
          >
            <header className="collection-card-header">
              <h3>{note.title || 'Untitled note'}</h3>
            </header>
            <div className="collection-card-body">
              <p>{(note.content ?? '').slice(0,140) || 'No content yet.'}</p>
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
    </div>
  );
}
