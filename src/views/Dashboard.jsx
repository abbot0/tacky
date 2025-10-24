import React, { useMemo, useState } from 'react';
import { boardLabelColors, WALLPAPERS } from '../lib.js';
import BoardModal from '../components/BoardModal.jsx';
import Confirm from '../components/Confirm.jsx';

const SearchIcon = ()=>(
  <svg className="icon icon-xs" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 4a7 7 0 1 1-4.95 11.95l-1.63 1.63a1 1 0 0 1-1.41-1.41l1.63-1.63A7 7 0 0 1 11 4zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" fill="currentColor"/>
  </svg>
);

const PlusIcon = ()=>(
  <svg className="icon icon-xs" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 0 1 0-2h5V6a1 1 0 0 1 1-1z" fill="currentColor"/>
  </svg>
);

const DotsIcon = ()=>(
  <svg className="icon icon-xs" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm5.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm5.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z" fill="currentColor"/>
  </svg>
);

export default function Dashboard({ boards, onOpen, onCreate, onDelete }) {
  const [showNew, setShowNew] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const filteredBoards = useMemo(()=>{
    const normalisedQuery = query.trim().toLowerCase();
    const mapped = boards.map(board=>({
      ...board,
      dots: boardLabelColors(board),
      searchable: board.name?.toLowerCase() ?? ''
    }));

    const filtered = normalisedQuery.length
      ? mapped.filter(board=>board.searchable.includes(normalisedQuery))
      : mapped;

    const sorted = filtered.sort((a,b)=>{
      if(sort==='name-az') return (a.name ?? '').localeCompare(b.name ?? '');
      if(sort==='name-za') return (b.name ?? '').localeCompare(a.name ?? '');
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    return sorted;
  },[boards, query, sort]);

  const hasBoards = boards.length > 0;
  const hasMatches = filteredBoards.length > 0;
  const emptyMessage = hasBoards
    ? `No boards matched “${query}”.`
    : 'No boards yet. Create one to get started.';

  const openCreateBoard = ()=> setShowNew(true);
  const closeCreateBoard = ()=> setShowNew(false);

  const handleCreateBoard = (vals)=>{
    onCreate(vals.name, vals.wallpaper);
    closeCreateBoard();
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-toolbar">
        <div className="dashboard-toolbar-left">
          <h1 className="dashboard-title">Boards</h1>
          <p className="dashboard-subtitle">
            Collect every project in one place. Search, sort, and dive back in fast.
          </p>
        </div>
        <div className="dashboard-toolbar-actions">
          <button type="button" className="button accent-button" onClick={openCreateBoard}>
            <PlusIcon />
            <span>New board</span>
          </button>
        </div>
      </header>

      <div className="dashboard-controls">
        <label className="dashboard-control">
          <span className="control-label">Search</span>
          <div className="dashboard-search">
            <SearchIcon />
            <input
              className="dashboard-search-input"
              placeholder="Search boards..."
              value={query}
              onChange={(event)=>setQuery(event.target.value)}
            />
          </div>
        </label>
        <label className="dashboard-control">
          <span className="control-label">Sort</span>
          <div className="dashboard-sort">
            <select value={sort} onChange={(event)=>setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="name-az">Name A–Z</option>
              <option value="name-za">Name Z–A</option>
            </select>
          </div>
        </label>
        <div className="dashboard-controls-spacer" />
        <button type="button" className="button ghost-button" onClick={openCreateBoard}>
          <PlusIcon />
          <span>Create board</span>
        </button>
      </div>

      <section className="board-grid">
        <article className="board-card board-card-new" onClick={openCreateBoard}>
          <div className="board-card-icon">
            <PlusIcon />
          </div>
          <h3 className="board-card-title">Create a board</h3>
          <p className="board-card-caption">
            Spin up a fresh workspace with wallpaper and lists ready to go.
          </p>
          <div className="board-card-footer">
            <span className="link-label">Start</span>
          </div>
        </article>

        {filteredBoards.map(board=>(
          <article
            key={board.id}
            className="board-card"
            onClick={()=>onOpen(board.id)}
            style={{ '--board-cover': board.wallpaper ?? 'var(--panel)' }}
          >
            <div className="board-card-cover" />
            <div className="board-card-body">
              <header className="board-card-header">
                <h3 className="board-card-title">{board.name || 'Untitled board'}</h3>
                <button
                  type="button"
                  className="icon-button subtle"
                  onClick={(event)=>{ event.stopPropagation(); setConfirm({ id:board.id, name:board.name }); }}
                  title="Board options"
                >
                  <DotsIcon />
                </button>
              </header>
              <div className="board-card-meta">
                {board.dots.slice(0,6).map((color, index)=>(
                  <span key={index} className="board-card-dot" style={{ background:color }} />
                ))}
              </div>
              <footer className="board-card-footer">
                <span>{new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString()}</span>
                <span className="link-label">Open</span>
              </footer>
            </div>
          </article>
        ))}

        {!hasMatches && (
          <div className="board-empty">
            <p>{emptyMessage}</p>
            {!hasBoards && (
              <button type="button" className="button accent-button" onClick={openCreateBoard}>
                <PlusIcon />
                <span>Create your first board</span>
              </button>
            )}
          </div>
        )}
      </section>

      {showNew && (
        <BoardModal
          title="Create board"
          initial={{ name:'', wallpaper:WALLPAPERS[0] }}
          onClose={closeCreateBoard}
          onSubmit={handleCreateBoard}
        />
      )}

      {confirm && (
        <Confirm
          title="Delete board?"
          confirmLabel="Delete board"
          tone="danger"
          onCancel={()=>setConfirm(null)}
          onConfirm={()=>{ onDelete(confirm.id); setConfirm(null); }}
        >
          <div className="confirm-copy">
            This will permanently remove <strong>{confirm.name || 'this board'}</strong> and all of its lists and cards.
          </div>
        </Confirm>
      )}
    </div>
  );
}
