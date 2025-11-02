import React, { useMemo, useState } from 'react';
import Confirm from '../components/Confirm.jsx';

const coverGradients = [
  'linear-gradient(135deg,#2563eb,#7c3aed)',
  'linear-gradient(135deg,#ec4899,#ef4444)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#6366f1,#22d3ee)',
  'linear-gradient(135deg,#8b5cf6,#d946ef)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#14b8a6,#3b82f6)',
];

const formatDate = (value) => {
  if (!value) return 'Just now';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Just now';
  }
};

const pickCover = (id, index) => {
  if (!id) return coverGradients[index % coverGradients.length];
  const code = Array.from(String(id)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return coverGradients[code % coverGradients.length];
};

export default function CanvasDashboard({
  canvases,
  onOpen,
  onCreate,
  onRename,
  onDelete,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filteredCanvases = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    const mapped = (canvases ?? []).map((canvas, index) => ({
      ...canvas,
      index,
      searchable: (canvas?.name ?? '').toLowerCase(),
    }));

    const filtered = normalisedQuery.length
      ? mapped.filter((canvas) => canvas.searchable.includes(normalisedQuery))
      : mapped;

    const sorted = filtered.sort((a, b) => {
      if (sort === 'name-az') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sort === 'name-za') return (b.name ?? '').localeCompare(a.name ?? '');
      const aDate = a.updatedAt ?? a.createdAt ?? 0;
      const bDate = b.updatedAt ?? b.createdAt ?? 0;
      return bDate - aDate;
    });

    return sorted;
  }, [canvases, query, sort]);

  const stats = useMemo(() => {
    if (!Array.isArray(canvases) || canvases.length === 0) {
      return {
        total: 0,
        updatedToday: 0,
        lastEdited: null,
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let updatedToday = 0;
    let lastEdited = null;

    canvases.forEach((canvas) => {
      const edited = canvas.updatedAt ?? canvas.createdAt ?? null;
      if (edited && edited >= startOfToday.getTime()) {
        updatedToday += 1;
      }
      if (!lastEdited || (edited && edited > lastEdited)) {
        lastEdited = edited;
      }
    });

    return {
      total: canvases.length,
      updatedToday,
      lastEdited,
    };
  }, [canvases]);

  const primaryCanvasId = filteredCanvases[0]?.id ?? canvases?.[0]?.id ?? null;

  const startEditing = (canvas) => {
    setEditing({
      id: canvas.id,
      value: canvas.name ?? '',
    });
  };

  const commitEditing = () => {
    if (!editing) return;
    const nextValue = editing.value.trim();
    if (nextValue.length) {
      onRename?.(editing.id, nextValue);
    }
    setEditing(null);
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const handleCreate = () => {
    onCreate?.('New canvas');
  };

  return (
    <div className="canvas-dashboard">
      <header className="canvas-dashboard-hero">
        <div className="canvas-dashboard-hero-copy">
          <h1>Canvas Studio</h1>
          <p>
            Organise visual thinking spaces, keep track of iterations, and jump into ideas in one place.
          </p>
        </div>
        <div className="canvas-dashboard-hero-actions">
          <button type="button" className="button accent-button" onClick={handleCreate}>
            Create canvas
          </button>
          <button
            type="button"
            className="button ghost-button"
            onClick={() => primaryCanvasId && onOpen?.(primaryCanvasId)}
            disabled={!primaryCanvasId}
          >
            Quick open
          </button>
        </div>
      </header>

      <section className="canvas-dashboard-metrics">
        <div className="canvas-metric-card">
          <span className="canvas-metric-label">Total canvases</span>
          <span className="canvas-metric-value">{stats.total}</span>
        </div>
        <div className="canvas-metric-card">
          <span className="canvas-metric-label">Updated today</span>
          <span className="canvas-metric-value">{stats.updatedToday}</span>
        </div>
        <div className="canvas-metric-card">
          <span className="canvas-metric-label">Last edited</span>
          <span className="canvas-metric-value">
            {stats.lastEdited ? formatDate(stats.lastEdited) : '—'}
          </span>
        </div>
      </section>

      <section className="canvas-dashboard-toolbar">
        <label className="canvas-toolbar-field">
          <span className="canvas-toolbar-label">Search</span>
          <input
            className="canvas-toolbar-input"
            placeholder="Search canvases..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="canvas-toolbar-field">
          <span className="canvas-toolbar-label">Sort by</span>
          <select
            className="canvas-toolbar-select"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">Recently edited</option>
            <option value="name-az">Name A-Z</option>
            <option value="name-za">Name Z-A</option>
          </select>
        </label>
        <div className="canvas-toolbar-spacer" />
        <button type="button" className="button accent-button" onClick={handleCreate}>
          New canvas
        </button>
      </section>

      <section className="canvas-grid">
        <article className="canvas-card canvas-card-new" onClick={handleCreate}>
          <div className="canvas-card-badge">Start fresh</div>
          <h3 className="canvas-card-title">Create a canvas</h3>
          <p className="canvas-card-caption">
            Spin up a blank space to map user flows, brainstorm features, or sketch visuals.
          </p>
        </article>

        {filteredCanvases.map((canvas) => (
          <article
            key={canvas.id}
            className="canvas-card"
            onClick={() => onOpen?.(canvas.id)}
          >
            <div
              className="canvas-card-cover"
              style={{ backgroundImage: pickCover(canvas.id, canvas.index) }}
            />
            <div className="canvas-card-body">
              <header className="canvas-card-header">
                {editing?.id === canvas.id ? (
                  <div
                    className="canvas-card-rename"
                    onClick={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(event) => setEditing((prev) => ({ ...prev, value: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitEditing();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelEditing();
                        }
                      }}
                      onBlur={commitEditing}
                      className="canvas-card-rename-input"
                      placeholder="Canvas name"
                    />
                  </div>
                ) : (
                  <h3 className="canvas-card-title">{canvas.name || 'Untitled canvas'}</h3>
                )}
                <div className="canvas-card-actions">
                  <button
                    type="button"
                    className="canvas-card-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditing(canvas);
                    }}
                    title="Rename canvas"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="canvas-card-action danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirm({ id: canvas.id, name: canvas.name });
                    }}
                    title="Delete canvas"
                  >
                    Delete
                  </button>
                </div>
              </header>
              <div className="canvas-card-meta">
                <span>Updated {formatDate(canvas.updatedAt || canvas.createdAt)}</span>
              </div>
              <footer className="canvas-card-footer">
                <span className="link-label">Open canvas</span>
              </footer>
            </div>
          </article>
        ))}

        {filteredCanvases.length === 0 && (
          <div className="canvas-dashboard-empty">
            <p>
              {query.trim().length
                ? `No canvases matching "${query}".`
                : 'You have no canvases yet. Create one to get started.'}
            </p>
            <button type="button" className="button accent-button" onClick={handleCreate}>
              Create your first canvas
            </button>
          </div>
        )}
      </section>

      {confirm && (
        <Confirm
          title="Delete canvas?"
          confirmLabel="Delete canvas"
          tone="danger"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            onDelete?.(confirm.id);
            setConfirm(null);
          }}
        >
          <div className="confirm-copy">
            This will permanently remove <strong>{confirm.name || 'this canvas'}</strong>.
          </div>
        </Confirm>
      )}
    </div>
  );
}
