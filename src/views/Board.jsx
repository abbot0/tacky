import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { uid, defaultCard, sanitizeBoard, checklistProgress, dueStatus, sortCards, LABELS, PRIORITIES } from '../lib.js';
import { saveTextFile, openTextFile } from '../storage.js';
import ListModal from '../components/ListModal.jsx';
import CardModal from '../components/CardModal.jsx';
import Confirm from '../components/Confirm.jsx';
import Portal from '../components/Portal.jsx';
import { SvgIcon } from '../components/icons.jsx';

function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
}

const buildDragStyle = (style = {}, snapshot, options = {}) => {
  const result = { ...style };
  if (snapshot.isDragging) {
    if (options.dragZIndex !== undefined) result.zIndex = options.dragZIndex;
    if (options.dragOpacity !== undefined) result.opacity = options.dragOpacity;
  }
  if (snapshot.isDropAnimating) {
    result.transition = options.dropTransition ?? 'transform 180ms cubic-bezier(.2,1,.2,1)';
  }
  return result;
};

const EMPTY_FILTER = { query:'', labels:[], due:'any', priority:'any' };

function cardMatchesFilter(card, filter){
  if (filter.query){
    const q = filter.query.toLowerCase();
    if (!card.title.toLowerCase().includes(q) && !(card.description ?? '').toLowerCase().includes(q)) return false;
  }
  if (filter.labels.length && !filter.labels.some(l => card.labels?.includes(l))) return false;
  if (filter.priority !== 'any' && card.priority !== filter.priority) return false;
  if (filter.due !== 'any'){
    const status = dueStatus(card.due);
    if (filter.due === 'overdue' && status?.tone !== 'overdue') return false;
    if (filter.due === 'soon' && !(status && ['today','soon','overdue'].includes(status.tone))) return false;
    if (filter.due === 'none' && card.due) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
const CardItem = memo(function CardItem({ card, listId, index, muted, onEdit, onDelete }) {
  const progress = card.checklist?.length ? checklistProgress(card) : null;
  const due = dueStatus(card.due);
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        const content = (
          <div
            className={`card${snapshot.isDragging ? ' card--dragging' : ''}${muted ? ' card--muted' : ''} priority-${card.priority ?? 'none'}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={buildDragStyle(provided.draggableProps.style, snapshot, { dragZIndex: 40, dragOpacity: 0.98 })}
            onClick={() => onEdit(listId, card.id)}
          >
            <div className="card-actions">
              <button
                type="button"
                className="icon-small"
                onClick={(event) => { event.stopPropagation(); onEdit(listId, card.id); }}
                title="Edit card"
                aria-label="Edit card"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.69 3.16a2 2 0 0 1 2.83 0l3.32 3.32a2 2 0 0 1 0 2.83l-8.81 8.82a2 2 0 0 1-.94.53l-4.27.95a1 1 0 0 1-1.18-1.18l.95-4.27a2 2 0 0 1 .53-.94zM7.09 13.68 6.5 16.5l2.82-.59z" fill="currentColor"/>
                </svg>
              </button>
              <button
                type="button"
                className="icon-small danger"
                onClick={(event) => { event.stopPropagation(); onDelete(listId, card.id, card.title); }}
                title="Delete card"
                aria-label="Delete card"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h5a1 1 0 1 1 0 2h-1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 0 1 0-2h6zm9 2H6v14h12z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            {card.labels?.length > 0 && (
              <div className="card-labels">
                {card.labels.slice(0, 6).map((c, i) => <span key={i} className="label" style={{ background: c }} />)}
              </div>
            )}
            <div className="card-title">
              {card.priority && card.priority !== 'none' && (
                <span className={`priority-pip priority-${card.priority}`} title={`Priority: ${card.priority}`} />
              )}
              {card.title}
            </div>
            {card.description && <div className="card-desc">{card.description}</div>}
            {(due || progress) && (
              <div className="card-meta">
                {due && <span className={`card-due due-${due.tone}`}>{due.label}</span>}
                {progress && (
                  <span className={`card-checklist${progress.done === progress.total ? ' is-complete' : ''}`}>
                    <SvgIcon name="check" className="icon-xs" />
                    {progress.done}/{progress.total}
                  </span>
                )}
              </div>
            )}
            {progress && (
              <div className="card-progress" aria-hidden="true">
                <span style={{ width: `${progress.percent}%` }} />
              </div>
            )}
          </div>
        );
        return snapshot.isDragging ? <Portal>{content}</Portal> : content;
      }}
    </Draggable>
  );
});

// ---------------------------------------------------------------------------
// Quick-add composer at the bottom of a list
// ---------------------------------------------------------------------------
function QuickAdd({ onAdd, onCancel }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = () => {
    const title = value.trim();
    if (!title) { onCancel(); return; }
    onAdd(title);
    setValue('');
  };
  return (
    <div className="quick-add">
      <textarea
        ref={ref}
        className="quick-add-input"
        rows={2}
        value={value}
        placeholder="Card title… (Enter to add, Esc to close)"
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => { if (!value.trim()) onCancel(); }}
      />
      <div className="quick-add-actions">
        <button type="button" className="button accent-button" onMouseDown={e => e.preventDefault()} onClick={submit}>Add card</button>
        <button type="button" className="button ghost-button" onMouseDown={e => e.preventDefault()} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List column
// ---------------------------------------------------------------------------
const ListColumn = memo(function ListColumn({
  list, index, filter, filterActive,
  onEditCard, onDeleteCard, onAddCard, onRenameList, onToggleCollapse, onDeleteList, onClearDone, onSortList
}) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);
  const doneCount = list.cards.filter(c => c.checklist?.length && c.checklist.every(i => i.done)).length;
  const [draft, setDraft] = useState(list.title);
  const [composing, setComposing] = useState(false);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== list.title) onRenameList(list.id, next);
    else setDraft(list.title);
    setRenaming(false);
  };

  const matchCount = filterActive ? list.cards.filter(c => cardMatchesFilter(c, filter)).length : list.cards.length;

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => {
        const content = (
          <div
            className={`list${snapshot.isDragging ? ' list--dragging' : ''}${list.collapsed ? ' list--collapsed' : ''}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={buildDragStyle(provided.draggableProps.style, snapshot, { dragZIndex: 30 })}
          >
            <div className="list-header" {...provided.dragHandleProps}>
              {renaming ? (
                <input
                  className="list-title-input"
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                    if (e.key === 'Escape') { e.preventDefault(); setDraft(list.title); setRenaming(false); }
                  }}
                />
              ) : (
                <h4 className="list-title" onDoubleClick={() => { setDraft(list.title); setRenaming(true); }} title="Double-click to rename">
                  {list.title}
                  <span className="list-count">{filterActive ? `${matchCount}/${list.cards.length}` : list.cards.length}</span>
                </h4>
              )}
              <div className="list-actions">
                <button type="button" className="icon-small accent" onClick={() => { if (list.collapsed) onToggleCollapse(list.id); setComposing(true); }} title="Add card" aria-label="Add card">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6V5a1 1 0 0 1 1-1z" fill="currentColor"/>
                  </svg>
                </button>
                <div className="list-menu" ref={menuRef}>
                  <button type="button" className="icon-small" onClick={() => setMenuOpen(o => !o)} title="List actions" aria-label="List actions" aria-expanded={menuOpen}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="currentColor"/></svg>
                  </button>
                  {menuOpen && (
                    <div className="list-menu-popover" role="menu">
                      <span className="list-menu-title">Sort cards</span>
                      <button type="button" role="menuitem" onClick={() => { onSortList(list.id, 'due'); setMenuOpen(false); }}>By due date</button>
                      <button type="button" role="menuitem" onClick={() => { onSortList(list.id, 'priority'); setMenuOpen(false); }}>By priority</button>
                      <button type="button" role="menuitem" onClick={() => { onSortList(list.id, 'title'); setMenuOpen(false); }}>Alphabetically</button>
                      <button type="button" role="menuitem" onClick={() => { onSortList(list.id, 'newest'); setMenuOpen(false); }}>Newest first</button>
                      <span className="list-menu-sep" />
                      <button type="button" role="menuitem" onClick={() => { setDraft(list.title); setRenaming(true); setMenuOpen(false); }}>Rename list</button>
                      <button type="button" role="menuitem" disabled={!doneCount} onClick={() => { onClearDone(list.id); setMenuOpen(false); }}>
                        Clear completed{doneCount ? ` (${doneCount})` : ''}
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" className="icon-small" onClick={() => onToggleCollapse(list.id)} title={list.collapsed ? 'Expand list' : 'Collapse list'} aria-label={list.collapsed ? 'Expand list' : 'Collapse list'}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: list.collapsed ? 'rotate(-90deg)' : 'none' }}>
                    <path d="M6.3 9.3a1 1 0 0 1 1.4 0L12 13.59l4.3-4.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.42z" fill="currentColor"/>
                  </svg>
                </button>
                <button type="button" className="icon-small danger" onClick={() => onDeleteList(list.id, list.title)} title="Delete list" aria-label="Delete list">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h5a1 1 0 1 1 0 2h-1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 0 1 0-2h6zm9 2H6v14h12z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
            {!list.collapsed && (
              <StrictModeDroppable droppableId={list.id} type="CARD">
                {(dropProvided, dropSnapshot) => (
                  <div
                    ref={dropProvided.innerRef}
                    className={`list-body${dropSnapshot.isDraggingOver ? ' list-body--drag-over' : ''}`}
                    {...dropProvided.droppableProps}
                  >
                    {list.cards.map((card, ci) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        listId={list.id}
                        index={ci}
                        muted={filterActive && !cardMatchesFilter(card, filter)}
                        onEdit={onEditCard}
                        onDelete={onDeleteCard}
                      />
                    ))}
                    {dropProvided.placeholder}
                    {list.cards.length === 0 && !composing && <div className="empty">No cards</div>}
                  </div>
                )}
              </StrictModeDroppable>
            )}
            {!list.collapsed && (
              composing ? (
                <QuickAdd onAdd={(title) => onAddCard(list.id, title)} onCancel={() => setComposing(false)} />
              ) : (
                <button type="button" className="list-add-btn" onClick={() => setComposing(true)}>+ Add a card</button>
              )
            )}
          </div>
        );
        return snapshot.isDragging ? <Portal>{content}</Portal> : content;
      }}
    </Draggable>
  );
});

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
export default function Board({ board, focusCardId, onUpdate, onDelete, onToast, otherBoards = [], onMoveCardOut }){
  const [local, setLocal] = useState(board);
  const [showList, setShowList] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [boardDraft, setBoardDraft] = useState(board.name);
  const boardScrollerRef = useRef(null);
  const autoScrollFrame = useRef(null);
  const firstRender = useRef(true);

  // Push local edits up to App (which persists them). Skip the mount pass so
  // opening a board never triggers a redundant save.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    onUpdate(local);
  }, [local, onUpdate]);

  // Deep-link from search: open the card's editor.
  useEffect(() => {
    if (!focusCardId) return;
    const list = local.lists.find(l => l.cards.some(c => c.id === focusCardId));
    if (list) setEditCard({ listId: list.id, cardId: focusCardId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCardId]);

  const touch = (next) => ({ ...next, updatedAt: Date.now() });
  const updateList = (listId, fn) => setLocal(prev => touch({
    ...prev,
    lists: prev.lists.map(l => (l.id === listId ? fn(l) : l))
  }));

  const addList = useCallback((title) => setLocal(prev => touch({ ...prev, lists: [...prev.lists, { id: uid('l'), title, collapsed:false, cards: [] }] })), []);
  const renameList = useCallback((listId, title) => updateList(listId, l => ({ ...l, title })), []);
  const toggleCollapse = useCallback((listId) => updateList(listId, l => ({ ...l, collapsed: !l.collapsed })), []);
  const deleteList = useCallback((listId) => setLocal(prev => touch({ ...prev, lists: prev.lists.filter(l => l.id !== listId) })), []);
  const addCard = useCallback((listId, title) => {
    const card = defaultCard(title);
    updateList(listId, l => ({ ...l, cards: [...l.cards, card] }));
  }, []);
  const updateCard = useCallback((listId, card) => updateList(listId, l => ({
    ...l,
    cards: l.cards.map(c => (c.id === card.id ? { ...c, ...card, updatedAt: Date.now() } : c))
  })), []);
  const deleteCard = useCallback((listId, cardId) => updateList(listId, l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })), []);
  const sortList = useCallback((listId, mode) => updateList(listId, l => ({ ...l, cards: sortCards(l.cards, mode) })), []);
  /** Move a card to another list on this board, or hand it to App for another board. */
  const moveCard = useCallback((fromListId, cardId, toBoardId, toListId) => {
    const card = local.lists.find(l => l.id === fromListId)?.cards.find(c => c.id === cardId);
    if (!card) return;
    if (!toBoardId || toBoardId === local.id){
      if (toListId === fromListId) return;
      setLocal(prev => touch({
        ...prev,
        lists: prev.lists.map(l => {
          if (l.id === fromListId) return { ...l, cards: l.cards.filter(c => c.id !== cardId) };
          if (l.id === toListId) return { ...l, cards: [...l.cards, card] };
          return l;
        })
      }));
    } else {
      setLocal(prev => touch({ ...prev, lists: prev.lists.map(l => (l.id === fromListId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l)) }));
      onMoveCardOut?.(card, toBoardId, toListId);
      onToast?.({ message: `Moved “${card.title}” to ${otherBoards.find(b => b.id === toBoardId)?.name ?? 'another board'}.` });
    }
  }, [local, onMoveCardOut, onToast, otherBoards]);
  const clearDone = useCallback((listId) => updateList(listId, l => ({
    ...l,
    cards: l.cards.filter(c => !(c.checklist?.length && c.checklist.every(i => i.done)))
  })), []);

  const openEditCard = useCallback((listId, cardId) => setEditCard({ listId, cardId }), []);
  const requestDeleteCard = useCallback((listId, cardId, name) => setConfirm({ type:'card', listId, cardId, name }), []);
  const requestDeleteList = useCallback((id, name) => setConfirm({ type:'list', id, name }), []);

  // ---- auto-scroll while dragging near the edges ---------------------------
  const cancelAutoScroll = useCallback(() => {
    if (autoScrollFrame.current) cancelAnimationFrame(autoScrollFrame.current);
    autoScrollFrame.current = null;
  }, []);

  const applyAutoScroll = useCallback((update) => {
    const selection = update?.client?.selection;
    if (!selection) return;
    const container = boardScrollerRef.current;
    if (container){
      const rect = container.getBoundingClientRect();
      const threshold = 80, maxStep = 22;
      const edge = (offset) => (offset < threshold ? Math.min(1, (threshold - offset) / threshold) * maxStep : 0);
      const dx = -edge(selection.x - rect.left) || edge(rect.right - selection.x);
      const dy = -edge(selection.y - rect.top) || edge(rect.bottom - selection.y);
      if (dx) container.scrollLeft += dx;
      if (dy) container.scrollTop += dy;
    }
    if (update.type === 'CARD'){
      const droppableId = update.destination?.droppableId ?? update.source.droppableId;
      const el = document.querySelector(`[data-rbd-droppable-id="${droppableId}"]`);
      if (el){
        const rect = el.getBoundingClientRect();
        const threshold = 60, maxStep = 18;
        const edge = (offset) => (offset < threshold ? Math.min(1, (threshold - offset) / threshold) * maxStep : 0);
        const dy = -edge(selection.y - rect.top) || edge(rect.bottom - selection.y);
        if (dy) el.scrollTop += dy;
      }
    }
  }, []);

  const handleDragUpdate = useCallback((update) => {
    if (autoScrollFrame.current) cancelAnimationFrame(autoScrollFrame.current);
    autoScrollFrame.current = requestAnimationFrame(() => { applyAutoScroll(update); autoScrollFrame.current = null; });
  }, [applyAutoScroll]);

  useEffect(() => () => cancelAutoScroll(), [cancelAutoScroll]);

  const handleDragStart = useCallback(() => {
    cancelAutoScroll();
    document.body.classList.add('is-dragging');
  }, [cancelAutoScroll]);

  const handleDragEnd = useCallback((result) => {
    const { destination, source, type } = result;
    document.body.classList.remove('is-dragging');
    cancelAutoScroll();
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setLocal(prev => {
      if (type === 'COLUMN'){
        const lists = prev.lists.slice();
        const [removed] = lists.splice(source.index, 1);
        if (!removed) return prev;
        lists.splice(destination.index, 0, removed);
        return touch({ ...prev, lists });
      }
      const sourceList = prev.lists.find(l => l.id === source.droppableId);
      const destList = prev.lists.find(l => l.id === destination.droppableId);
      if (!sourceList || !destList || source.index >= sourceList.cards.length) return prev;
      const moved = sourceList.cards[source.index];
      const sourceCards = sourceList.cards.filter((_, i) => i !== source.index);
      const destCards = sourceList === destList ? sourceCards.slice() : destList.cards.slice();
      destCards.splice(destination.index, 0, moved);
      return touch({
        ...prev,
        lists: prev.lists.map(l => {
          if (l.id === destList.id) return { ...l, cards: destCards };
          if (l.id === sourceList.id) return { ...l, cards: sourceCards };
          return l;
        })
      });
    });
  }, [cancelAutoScroll]);

  // ---- import / export -----------------------------------------------------
  const exportJSON = async () => {
    const result = await saveTextFile({
      defaultName: `${local.name.replace(/[^\w-]+/g, '_')}.tacky.json`,
      contents: JSON.stringify(local, null, 2),
      filters: [{ name: 'Tacky board', extensions: ['json'] }]
    });
    if (!result?.canceled) onToast?.({ message: 'Board exported.', tone: 'success' });
  };
  const importJSON = async () => {
    try{
      const result = await openTextFile({ filters: [{ name: 'Tacky board', extensions: ['json'] }] });
      if (result?.canceled) return;
      const parsed = JSON.parse(result.contents);
      if (!parsed || !Array.isArray(parsed.lists)) throw new Error('Invalid board file');
      const safe = sanitizeBoard(parsed);
      setLocal(prev => touch({ ...prev, name: safe.name || prev.name, wallpaper: safe.wallpaper || prev.wallpaper, lists: safe.lists }));
      onToast?.({ message: `Imported ${safe.lists.length} lists.`, tone: 'success' });
    } catch (e){
      onToast?.({ message: `Import failed: ${e.message}`, tone: 'danger' });
    }
  };

  // ---- filter --------------------------------------------------------------
  const filterActive = Boolean(filter.query || filter.labels.length || filter.due !== 'any' || filter.priority !== 'any');
  const boardLabels = useMemo(() => {
    const used = new Set();
    local.lists.forEach(l => l.cards.forEach(c => (c.labels ?? []).forEach(x => used.add(x))));
    return LABELS.filter(l => used.has(l));
  }, [local.lists]);
  const totals = useMemo(() => {
    let cards = 0, overdue = 0, done = 0;
    local.lists.forEach(l => l.cards.forEach(c => {
      cards += 1;
      if (dueStatus(c.due)?.tone === 'overdue') overdue += 1;
      if (c.checklist?.length && c.checklist.every(i => i.done)) done += 1;
    }));
    return { cards, overdue, done };
  }, [local.lists]);

  const commitBoardRename = () => {
    const next = boardDraft.trim();
    if (next && next !== local.name) setLocal(prev => touch({ ...prev, name: next }));
    else setBoardDraft(local.name);
    setRenamingBoard(false);
  };

  const bgStyle = useMemo(() => ({
    background: local.wallpaper
      ? `linear-gradient(rgba(9,13,21,0.85), rgba(9,13,21,0.85)), ${local.wallpaper}`
      : 'var(--panel-soft)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100%',
    width: '100%'
  }), [local.wallpaper]);

  const editingTarget = editCard
    ? (() => { const L = local.lists.find(l => l.id === editCard.listId); const C = L?.cards.find(c => c.id === editCard.cardId); return L && C ? { L, C } : null; })()
    : null;

  return (
    <div className="board-wrap" style={bgStyle}>
      <div className="board-header">
        {renamingBoard ? (
          <input
            className="board-title-input"
            autoFocus
            value={boardDraft}
            onChange={e => setBoardDraft(e.target.value)}
            onBlur={commitBoardRename}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitBoardRename(); }
              if (e.key === 'Escape') { e.preventDefault(); setBoardDraft(local.name); setRenamingBoard(false); }
            }}
          />
        ) : (
          <h3 className="board-title" onDoubleClick={() => { setBoardDraft(local.name); setRenamingBoard(true); }} title="Double-click to rename">{local.name}</h3>
        )}
        <div className="board-stats">
          <span>{local.lists.length} lists</span>
          <span>{totals.cards} cards</span>
          {totals.overdue > 0 && <span className="is-overdue">{totals.overdue} overdue</span>}
          {totals.done > 0 && <span className="is-done">{totals.done} complete</span>}
        </div>
        <div className="spacer"/>
        <div className="footer-actions">
          <button className={`button${filterActive ? ' is-active' : ''}`} onClick={() => setShowFilters(v => !v)}>
            {filterActive ? 'Filters on' : 'Filter'}
          </button>
          <button className="button" onClick={() => setShowList(true)}>+ Add List</button>
          <button className="button" onClick={exportJSON}>Export</button>
          <button className="button" onClick={importJSON}>Import</button>
          <button className="button" onClick={() => setConfirm('board')}>Delete Board</button>
        </div>
      </div>

      {showFilters && (
        <div className="board-filters">
          <input
            className="field-input"
            placeholder="Filter cards by text…"
            value={filter.query}
            onChange={e => setFilter(f => ({ ...f, query: e.target.value }))}
          />
          <div className="badge-row">
            {boardLabels.length === 0 && <span className="field-hint">No labels in use.</span>}
            {boardLabels.map(color => (
              <button
                key={color}
                type="button"
                className={`badge${filter.labels.includes(color) ? ' is-active' : ''}`}
                style={{ background: color }}
                onClick={() => setFilter(f => ({ ...f, labels: f.labels.includes(color) ? f.labels.filter(x => x !== color) : [...f.labels, color] }))}
                aria-label="Toggle label filter"
              />
            ))}
          </div>
          <select value={filter.due} onChange={e => setFilter(f => ({ ...f, due: e.target.value }))}>
            <option value="any">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="soon">Due within a week</option>
            <option value="none">No due date</option>
          </select>
          <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
            <option value="any">Any priority</option>
            {PRIORITIES.filter(p => p.id !== 'none').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button type="button" className="button ghost-button" onClick={() => setFilter(EMPTY_FILTER)} disabled={!filterActive}>Clear</button>
        </div>
      )}

      <div className="board-scroller" ref={boardScrollerRef}>
        <DragDropContext onDragStart={handleDragStart} onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div className="lists" ref={provided.innerRef} {...provided.droppableProps}>
                {local.lists.map((list, li) => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    index={li}
                    filter={filter}
                    filterActive={filterActive}
                    onEditCard={openEditCard}
                    onDeleteCard={requestDeleteCard}
                    onAddCard={addCard}
                    onRenameList={renameList}
                    onToggleCollapse={toggleCollapse}
                    onDeleteList={requestDeleteList}
                    onClearDone={clearDone}
                    onSortList={sortList}
                  />
                ))}
                {provided.placeholder}
                <button type="button" className="list list-ghost" onClick={() => setShowList(true)}>+ Add another list</button>
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>
      </div>

      {showList && <ListModal title="Add List" onClose={() => setShowList(false)} onSubmit={(vals) => { addList(vals.title); setShowList(false); }}/>}

      {editingTarget && (
        <CardModal
          key={editingTarget.C.id}
          initial={editingTarget.C}
          onClose={() => setEditCard(null)}
          onDelete={() => { setEditCard(null); requestDeleteCard(editingTarget.L.id, editingTarget.C.id, editingTarget.C.title); }}
          onSubmit={(vals) => { updateCard(editingTarget.L.id, { ...editingTarget.C, ...vals }); setEditCard(null); }}
          moveTargets={[
            { id: local.id, name: `${local.name} (this board)`, lists: local.lists.map(l => ({ id: l.id, title: l.title })) },
            ...otherBoards
          ]}
          currentListId={editingTarget.L.id}
          onMove={(toBoardId, toListId) => { setEditCard(null); moveCard(editingTarget.L.id, editingTarget.C.id, toBoardId, toListId); }}
        />
      )}

      {confirm === 'board' && (
        <Confirm title="Delete board?" confirmLabel="Delete board" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => onDelete(local.id)}>
          <div className="confirm-copy">This will remove the entire board. You can undo from the toast for a few seconds.</div>
        </Confirm>
      )}
      {confirm && confirm.type === 'list' && (
        <Confirm title="Delete list?" confirmLabel="Delete list" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => { deleteList(confirm.id); setConfirm(null); }}>
          <div className="confirm-copy">Cards inside <b>{confirm.name}</b> will also be deleted.</div>
        </Confirm>
      )}
      {confirm && confirm.type === 'card' && (
        <Confirm title="Delete card?" confirmLabel="Delete card" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => { deleteCard(confirm.listId, confirm.cardId); setConfirm(null); }}>
          <div className="confirm-copy">Remove <b>{confirm.name}</b> from this list?</div>
        </Confirm>
      )}
    </div>
  );
}
