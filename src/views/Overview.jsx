import React, { useMemo } from 'react';
import { collectAgenda, todayNoteTitle } from '../lib.js';

function AgendaGroup({ title, tone, items, onOpen }) {
  if (!items.length) return null;
  return (
    <div className={`agenda-group tone-${tone}`}>
      <h4>{title} <span>{items.length}</span></h4>
      <ul>
        {items.map(({ card, boardId, boardName, listName, status }) => (
          <li key={card.id}>
            <button type="button" onClick={()=>onOpen?.(boardId, card.id)}>
              <span className="agenda-title">
                {card.priority && card.priority !== 'none' && <span className={`priority-pip priority-${card.priority}`} />}
                {card.title}
              </span>
              <span className="agenda-meta">{boardName} · {listName}</span>
              <span className={`card-due due-${status.tone}`}>{status.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryTile({ title, value, subtitle, icon, onAction, actionLabel }) {
  return (
    <div className="overview-tile">
      <div className="overview-tile-header">
        <div className="overview-tile-icon">{icon}</div>
        <div className="overview-tile-meta">
          <span className="overview-tile-title">{title}</span>
          {subtitle && <span className="overview-tile-subtitle">{subtitle}</span>}
        </div>
      </div>
      <div className="overview-tile-value">{value}</div>
      {onAction && (
        <button type="button" className="button accent-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function RecentList({ title, items, emptyLabel, onOpen }) {
  return (
    <section className="overview-list">
      <header className="overview-list-header">
        <h3>{title}</h3>
      </header>
      <div className="overview-list-body">
        {items.length === 0 && (
          <div className="overview-list-empty">{emptyLabel}</div>
        )}
        {items.map(item => (
          <button
            key={item.id}
            className="overview-list-item"
            onClick={()=>onOpen?.(item.id)}
          >
            <div className="overview-list-item-title">{item.name || item.title || 'Untitled'}</div>
            <div className="overview-list-item-meta">
              {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Overview({
  boards,
  notes,
  canvases,
  onCreateBoard,
  onCreateNote,
  onCreateCanvas,
  onOpenBoard,
  onOpenNote,
  onOpenCanvas,
  onShowBoards,
  onShowNotes,
  onShowCanvases,
  onOpenDailyNote
}) {
  const agenda = useMemo(()=> collectAgenda(boards),[boards]);
  const agendaCount = agenda.overdue.length + agenda.today.length + agenda.soon.length;
  const recentBoards = boards.slice(0, 4);
  const orderedNotes = notes
    .slice()
    .sort((a,b)=> (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .slice(0, 6);
  const orderedCanvases = canvases
    .slice()
    .sort((a,b)=> (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .slice(0, 6);

  return (
    <div className="overview-shell">
      <header className="overview-hero">
        <div className="overview-hero-copy">
          <h1>{todayNoteTitle()}</h1>
          <p>
            {agendaCount === 0
              ? 'Nothing is due this week. Jump back into your projects, notes, and canvases.'
              : `${agenda.overdue.length} overdue · ${agenda.today.length} due today · ${agenda.soon.length} due this week`}
          </p>
        </div>
        <div className="overview-hero-actions">
          <button type="button" className="button accent-button" onClick={onOpenDailyNote}>
            Today's note
          </button>
          <button type="button" className="button" onClick={onCreateBoard}>
            New board
          </button>
          <button type="button" className="button" onClick={onCreateNote}>
            New note
          </button>
          <button type="button" className="button" onClick={onCreateCanvas}>
            New canvas
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <SummaryTile
          title="Boards"
          subtitle="Plan & deliver"
          value={boards.length}
          icon={<span className="dot dot-purple" />}
          onAction={onShowBoards}
          actionLabel="View boards"
        />
        <SummaryTile
          title="Notes"
          subtitle="Ideas & docs"
          value={notes.length}
          icon={<span className="dot dot-teal" />}
          onAction={onShowNotes}
          actionLabel="View notes"
        />
        <SummaryTile
          title="Canvases"
          subtitle="Sketch & iterate"
          value={canvases.length}
          icon={<span className="dot dot-blue" />}
          onAction={onShowCanvases}
          actionLabel="View canvases"
        />
      </section>

      {agendaCount > 0 && (
        <section className="agenda">
          <header className="overview-list-header"><h3>Agenda</h3></header>
          <div className="agenda-groups">
            <AgendaGroup title="Overdue" tone="overdue" items={agenda.overdue} onOpen={onOpenBoard} />
            <AgendaGroup title="Due today" tone="today" items={agenda.today} onOpen={onOpenBoard} />
            <AgendaGroup title="This week" tone="soon" items={agenda.soon} onOpen={onOpenBoard} />
          </div>
        </section>
      )}

      <section className="overview-columns">
        <section className="overview-column">
          <RecentList
            title="Recent boards"
            items={recentBoards}
            emptyLabel="Create your first board to see it here."
            onOpen={onOpenBoard}
          />
        </section>
        <section className="overview-column">
          <RecentList
            title="Recent notes"
            items={orderedNotes}
            emptyLabel="Capture your first note to see it here."
            onOpen={onOpenNote}
          />
        </section>
        <section className="overview-column">
          <RecentList
            title="Recent canvases"
            items={orderedCanvases}
            emptyLabel="Create a canvas to see it here."
            onOpen={onOpenCanvas}
          />
        </section>
      </section>
    </div>
  );
}
