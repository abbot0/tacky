import React, { useMemo, useRef, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { uid, deepClone } from '../lib.js';
import ListModal from '../components/ListModal.jsx';
import CardModal from '../components/CardModal.jsx';
import Confirm from '../components/Confirm.jsx';
import Portal from '../components/Portal.jsx';

function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
}

const buildDragStyle = (style = {}, snapshot, options = {}) => {
  const result = { ...style };
  if (style.transform) {
    result.transform = style.transform;
  }
  if (snapshot.isDragging) {
    if (options.dragZIndex !== undefined) {
      result.zIndex = options.dragZIndex;
    }
    if (options.dragOpacity !== undefined) {
      result.opacity = options.dragOpacity;
    }
  }
  if (snapshot.isDropAnimating) {
    result.transition = options.dropTransition ?? 'transform 180ms cubic-bezier(.2,1,.2,1)';
  }
  return result;
};

export default function Board({board, onUpdate, onDelete}){
  const [local, setLocal] = useState(deepClone(board));
  const [showList, setShowList] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const boardScrollerRef = useRef(null);
  const autoScrollFrame = useRef(null);

  React.useEffect(()=> setLocal(deepClone(board)), [board.id]);
  React.useEffect(()=> onUpdate(local), [local]); // persist

  const addList = (title)=> setLocal(prev => { const c = deepClone(prev); c.lists.push({id:uid('l'), title, cards:[]}); return c; });
  const deleteList = (listId)=> setLocal(prev => ({...prev, lists: prev.lists.filter(l=>l.id!==listId)}));
  const addCard = (listId)=>{
    const c = { id: uid('c'), title:'New Card', description:'', due:'', labels:[] };
    setLocal(prev => { const copy = deepClone(prev); const L = copy.lists.find(l=>l.id===listId); L.cards.push(c); return copy; });
    setEditCard({listId, cardId:c.id});
  };
  const updateCard = (listId, card)=> setLocal(prev => { const copy = deepClone(prev); const L = copy.lists.find(l=>l.id===listId); const i = L.cards.findIndex(x=>x.id===card.id); L.cards[i] = deepClone(card); return copy; });
  const deleteCard = (listId, cardId)=> setLocal(prev => { const copy = deepClone(prev); const L = copy.lists.find(l=>l.id===listId); if (L) L.cards = L.cards.filter(c=>c.id!==cardId); return copy; });

  const cancelAutoScroll = useCallback(()=>{
    if (autoScrollFrame.current && typeof cancelAnimationFrame === 'function'){
      cancelAnimationFrame(autoScrollFrame.current);
    }
    autoScrollFrame.current = null;
  },[]);

  const getDroppableElement = useCallback((id)=>{
    if (!id || typeof document === 'undefined') return null;
    const nodes = document.querySelectorAll('[data-rbd-droppable-id]');
    for (let i = 0; i < nodes.length; i += 1){
      if (nodes[i].getAttribute('data-rbd-droppable-id') === id){
        return nodes[i];
      }
    }
    return null;
  },[]);

  const applyAutoScroll = useCallback((update)=>{
    if (!update) return;
    const selection = update.client?.selection;
    if (!selection) return;

    const container = boardScrollerRef.current;
    if (container){
      const rect = container.getBoundingClientRect();
      const threshold = 80;
      const maxStep = 22;

      const leftOffset = selection.x - rect.left;
      const rightOffset = rect.right - selection.x;
      let deltaX = 0;
      if (leftOffset < threshold){
        const intensity = Math.min(1, (threshold - leftOffset) / threshold);
        deltaX = -intensity * maxStep;
      } else if (rightOffset < threshold){
        const intensity = Math.min(1, (threshold - rightOffset) / threshold);
        deltaX = intensity * maxStep;
      }

      const topOffset = selection.y - rect.top;
      const bottomOffset = rect.bottom - selection.y;
      let deltaY = 0;
      if (topOffset < threshold){
        const intensity = Math.min(1, (threshold - topOffset) / threshold);
        deltaY = -intensity * maxStep;
      } else if (bottomOffset < threshold){
        const intensity = Math.min(1, (threshold - bottomOffset) / threshold);
        deltaY = intensity * maxStep;
      }

      if (deltaX) container.scrollLeft += deltaX;
      if (deltaY) container.scrollTop += deltaY;
    }

    if (update.type === 'CARD'){
      const droppableId = update.destination?.droppableId ?? update.source.droppableId;
      const droppableEl = getDroppableElement(droppableId);
      if (droppableEl){
        const rect = droppableEl.getBoundingClientRect();
        const thresholdY = 60;
        const maxStepY = 18;
        const topOffset = selection.y - rect.top;
        const bottomOffset = rect.bottom - selection.y;
        let delta = 0;
        if (topOffset < thresholdY){
          const intensity = Math.min(1, (thresholdY - topOffset) / thresholdY);
          delta = -intensity * maxStepY;
        } else if (bottomOffset < thresholdY){
          const intensity = Math.min(1, (thresholdY - bottomOffset) / thresholdY);
          delta = intensity * maxStepY;
        }
        if (delta) droppableEl.scrollTop += delta;
      }
    }
  },[getDroppableElement]);

  const scheduleAutoScroll = useCallback((update)=>{
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;
    if (autoScrollFrame.current && typeof cancelAnimationFrame === 'function'){
      cancelAnimationFrame(autoScrollFrame.current);
    }
    autoScrollFrame.current = requestAnimationFrame(()=>{
      applyAutoScroll(update);
      autoScrollFrame.current = null;
    });
  },[applyAutoScroll]);

  React.useEffect(()=>()=>{ cancelAutoScroll(); }, [cancelAutoScroll]);

  const handleDragStart = useCallback(()=>{
    if (typeof document === 'undefined') return;
    cancelAutoScroll();
    document.body.classList.add('is-dragging');
  },[cancelAutoScroll]);

  const handleDragEnd = useCallback((result)=>{
    const { destination, source, type } = result;

    if (typeof document !== 'undefined'){
      document.body.classList.remove('is-dragging');
    }
    cancelAutoScroll();
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setLocal(prev => {
      const draft = deepClone(prev);

      if (type === 'COLUMN'){
        const [removed] = draft.lists.splice(source.index, 1);
        if (!removed) return prev;
        draft.lists.splice(destination.index, 0, removed);
        return draft;
      }

      const sourceIndex = draft.lists.findIndex(l => l.id === source.droppableId);
      const destinationIndex = draft.lists.findIndex(l => l.id === destination.droppableId);
      if (sourceIndex === -1 || destinationIndex === -1) return prev;

      const sourceList = draft.lists[sourceIndex];
      const destinationList = draft.lists[destinationIndex];
      if (!sourceList || source.index >= sourceList.cards.length) return prev;

      const [movedCard] = sourceList.cards.splice(source.index, 1);
      if (!movedCard) return prev;

      destinationList.cards.splice(destination.index, 0, movedCard);
      return draft;
    });
  },[cancelAutoScroll]);

  const handleDragUpdate = useCallback((update)=>{
    scheduleAutoScroll(update);
  },[scheduleAutoScroll]);

  const exportJSON = ()=>{ const data = JSON.stringify(local,null,2); const blob = new Blob([data],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${local.name.replace(/\s+/g,'_')}.tacky.json`; a.click(); URL.revokeObjectURL(url); };
  const importJSON = (file)=>{
    const reader = new FileReader();
    reader.onload = ()=>{ try{ const parsed = JSON.parse(reader.result); if (!parsed || !parsed.id || !Array.isArray(parsed.lists)) throw new Error('Invalid board file'); setLocal(prev => ({ ...prev, name:parsed.name || prev.name, wallpaper:parsed.wallpaper || prev.wallpaper, lists: parsed.lists || prev.lists })); }catch(e){ alert('Failed to import: '+e.message); } };
    reader.readAsText(file);
  };

  const labelsForCard = (labels)=> labels?.slice(0,6)?.map((c,i)=>(<span key={i} className="label" style={{background:c}}/>));
  const bgStyle = useMemo(()=>({
    background: local.wallpaper
      ? `linear-gradient(rgba(9,13,21,0.85), rgba(9,13,21,0.85)), ${local.wallpaper}`
      : 'var(--panel-soft)',
    backgroundSize:'cover',
    backgroundPosition:'center',
    minHeight:'100%',
    width:'100%'
  }),[local.wallpaper]);

  return (
    <div className="board-wrap" style={bgStyle}>
      <div className="board-header">
        <h3 style={{margin:0}}>{local.name}</h3>
        <div className="spacer"/>
        <div className="footer-actions">
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={(e)=>{ if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; }}/>
          <button className="button" onClick={()=>setShowList(true)}>+ Add List</button>
          <button className="button" onClick={exportJSON}>Export JSON</button>
          <button className="button" onClick={()=>fileRef.current?.click()}>Import JSON</button>
          <button className="button" onClick={()=>setConfirm('board')}>Delete Board</button>
        </div>
      </div>

      <div className="board-scroller" ref={boardScrollerRef}>
        <DragDropContext onDragStart={handleDragStart} onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided)=> (
              <div className="lists" ref={provided.innerRef} {...provided.droppableProps}>
                {local.lists.map((list, li)=>(
                  <Draggable key={list.id} draggableId={list.id} index={li}>
                    {(provided2, snapList)=>(
                      (()=>{
                        const listContent = (
                          <div
                            className={`list${snapList.isDragging ? ' list--dragging' : ''}`}
                            ref={provided2.innerRef}
                            {...provided2.draggableProps}
                            style={buildDragStyle(provided2.draggableProps.style, snapList, { dragZIndex: 30 })}
                          >
                            <div className="list-header" {...provided2.dragHandleProps}>
                              <h4 className="list-title">{list.title}</h4>
                              <div className="list-actions">
                                <button
                                  type="button"
                                  className="icon-small accent"
                                  onClick={()=>addCard(list.id)}
                                  title="Add card"
                                  aria-label="Add card"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6V5a1 1 0 0 1 1-1z" fill="currentColor"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="icon-small danger"
                                  onClick={()=>setConfirm({type:'list', id:list.id, name:list.title})}
                                  title="Delete list"
                                  aria-label="Delete list"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h5a1 1 0 1 1 0 2h-1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 0 1 0-2h6zm9 2H6v14h12z" fill="currentColor"/>
                                    <path d="M10 9a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1zm4 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1z" fill="currentColor"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <StrictModeDroppable droppableId={list.id} type="CARD">
                              {(p, snapshotCards)=>(
                                <div
                                  ref={p.innerRef}
                                  className={`list-body${snapshotCards.isDraggingOver ? ' list-body--drag-over' : ''}`}
                                  {...p.droppableProps}
                                >
                                  {list.cards.map((card, ci)=>(
                                    <Draggable key={card.id} draggableId={card.id} index={ci}>
                                      {(p2, snapshot)=>(
                                        (()=>{
                                          const cardContent = (
                                            <div
                                              className={`card${snapshot.isDragging ? ' card--dragging' : ''}`}
                                              ref={p2.innerRef}
                                              {...p2.draggableProps}
                                              {...p2.dragHandleProps}
                                              style={buildDragStyle(p2.draggableProps.style, snapshot, { dragZIndex: 40, dragOpacity: 0.98 })}
                                              onClick={()=> setEditCard({listId:list.id, cardId:card.id}) }
                                            >
                                              <div className="card-actions">
                                                <button
                                                  type="button"
                                                  className="icon-small"
                                                  onClick={(event)=>{
                                                    event.stopPropagation();
                                                    setEditCard({listId:list.id, cardId:card.id});
                                                  }}
                                                  title="Edit card"
                                                  aria-label="Edit card"
                                                >
                                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M14.69 3.16a2 2 0 0 1 2.83 0l3.32 3.32a2 2 0 0 1 0 2.83l-8.81 8.82a2 2 0 0 1-.94.53l-4.27.95a1 1 0 0 1-1.18-1.18l.95-4.27a2 2 0 0 1 .53-.94zM7.09 13.68 6.5 16.5l2.82-.59z" fill="currentColor"/>
                                                    <path d="M4 20h16a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2z" fill="currentColor" opacity=".3"/>
                                                  </svg>
                                                </button>
                                                <button
                                                  type="button"
                                                  className="icon-small danger"
                                                  onClick={(event)=>{
                                                    event.stopPropagation();
                                                    setConfirm({type:'card', listId:list.id, cardId:card.id, name:card.title});
                                                  }}
                                                  title="Delete card"
                                                  aria-label="Delete card"
                                                >
                                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2h5a1 1 0 1 1 0 2h-1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 0 1 0-2h6zm9 2H6v14h12z" fill="currentColor"/>
                                                    <path d="M10 9a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1zm4 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1z" fill="currentColor"/>
                                                  </svg>
                                                </button>
                                              </div>
                                              <div className="card-labels">{labelsForCard(card.labels)}</div>
                                              <div className="card-title">{card.title}</div>
                                              {card.description && <div className="card-desc">{card.description}</div>}
                                              {card.due && <div className="card-due">Due: {card.due}</div>}
                                            </div>
                                          );
                                          return snapshot.isDragging ? <Portal>{cardContent}</Portal> : cardContent;
                                        })()
                                      )}
                                    </Draggable>
                                  ))}
                                  {p.placeholder}
                                  {list.cards.length===0 && <div className="empty">No cards</div>}
                                </div>
                              )}
                            </StrictModeDroppable>
                          </div>
                        );
                        return snapList.isDragging ? <Portal>{listContent}</Portal> : listContent;
                      })()
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>
      </div>

      {showList && <ListModal title="Add List" onClose={()=>setShowList(false)} onSubmit={(vals)=>{ addList(vals.title); setShowList(false); }}/>
      }

      {editCard && (()=>{ const L = local.lists.find(l=>l.id===editCard.listId); const C = L?.cards.find(c=>c.id===editCard.cardId); if(!L||!C) return null; return (
        <CardModal key={C.id} initial={C} onClose={()=>setEditCard(null)} onSubmit={(vals)=>{ updateCard(L.id, {...C, ...vals}); setEditCard(null);} }/>
      );})()}

      {confirm && confirm==='board' && (
        <Confirm
          title="Delete board?"
          confirmLabel="Delete board"
          tone="danger"
          onCancel={()=>setConfirm(null)}
          onConfirm={()=> onDelete(local.id)}
        >
          <div className="confirm-copy">This will remove the entire board.</div>
        </Confirm>
      )}
      {confirm && confirm.type==='list' && (
        <Confirm
          title="Delete list?"
          confirmLabel="Delete list"
          tone="danger"
          onCancel={()=>setConfirm(null)}
          onConfirm={()=>{ deleteList(confirm.id); setConfirm(null);} }
        >
          <div className="confirm-copy">Cards inside <b>{confirm.name}</b> will also be deleted.</div>
        </Confirm>
      )}
      {confirm && confirm.type==='card' && (
        <Confirm
          title="Delete card?"
          confirmLabel="Delete card"
          tone="danger"
          onCancel={()=>setConfirm(null)}
          onConfirm={()=>{ deleteCard(confirm.listId, confirm.cardId); setConfirm(null);} }
        >
          <div className="confirm-copy">Remove <b>{confirm.name}</b> from this list?</div>
        </Confirm>
      )}
    </div>
  );
}




