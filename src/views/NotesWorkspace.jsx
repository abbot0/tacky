import React, { useEffect, useMemo, useRef, useState } from 'react';

const EMPTY_MESSAGE = 'Create a note to start writing.';

export default function NotesWorkspace({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onShowDashboard
}){
  const textareaRef = useRef(null);
  const suppressChangeRef = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [caret, setCaret] = useState({ line: 1, column: 1 });

  const orderedNotes = useMemo(()=>{
    return (Array.isArray(notes) ? notes : [])
      .slice()
      .sort((a,b)=> (a.createdAt || 0) - (b.createdAt || 0));
  },[notes]);

  const selectedNote = useMemo(()=>{
    return orderedNotes.find(n=>n.id===selectedNoteId) ?? orderedNotes[0] ?? null;
  },[orderedNotes, selectedNoteId]);

  useEffect(()=>{
    if(!selectedNoteId && orderedNotes.length){
      onSelectNote?.(orderedNotes[0].id);
    }
  },[selectedNoteId, orderedNotes, onSelectNote]);

  const lineNumbers = useMemo(()=>{
    if(!selectedNote) return ['1'];
    return (selectedNote.content ?? '').split(/\r?\n/).map((_, idx)=>String(idx+1));
  },[selectedNote]);

  const wordCount = useMemo(()=>{
    if(!selectedNote) return 0;
    const words = (selectedNote.content ?? '').trim().split(/\s+/).filter(Boolean);
    return words.length;
  },[selectedNote]);

  useEffect(()=>{
    setConfirmDelete(false);
    updateCaretPosition();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedNote?.id]);

  const updateCaretPosition = ()=>{
    const el = textareaRef.current;
    if(!el) return;
    const value = el.value;
    const caretIndex = el.selectionStart ?? 0;
    const untilCaret = value.slice(0, caretIndex);
    const lines = untilCaret.split(/\r?\n/);
    const line = lines.length;
    const column = lines[lines.length-1].length + 1;
    setCaret({ line, column });
  };

  const handleTabClick = (id)=>{
    if(id===selectedNoteId) return;
    onSelectNote?.(id);
  };

  const handleNewNote = ()=>{
    onCreateNote?.();
  };

  const handleRename = (evt)=>{
    if(!selectedNote) return;
    onUpdateNote?.({ ...selectedNote, title: evt.target.value, updatedAt: Date.now() });
  };

  const handleContentChange = (evt)=>{
    if(!selectedNote) return;
    if(suppressChangeRef.current){
      suppressChangeRef.current = false;
      return;
    }
    onUpdateNote?.({ ...selectedNote, content: evt.target.value, updatedAt: Date.now() });
    requestAnimationFrame(updateCaretPosition);
  };

  const handleKeyDown = (evt)=>{
    if(!selectedNote) return;
    if(evt.key === 'Tab'){
      evt.preventDefault();
      const el = textareaRef.current;
      if(!el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const value = selectedNote.content ?? '';
      const insert = '\t';
      const next = value.slice(0, start) + insert + value.slice(end);
      suppressChangeRef.current = true;
      onUpdateNote?.({ ...selectedNote, content: next, updatedAt: Date.now() });
      requestAnimationFrame(()=>{
        if(textareaRef.current){
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + insert.length;
          updateCaretPosition();
        }
      });
    }
  };

  const handleDelete = ()=>{
    if(!selectedNote) return;
    setConfirmDelete(true);
  };

  const confirmDeleteNote = ()=>{
    if(!selectedNote) return;
    onDeleteNote?.(selectedNote.id);
    setConfirmDelete(false);
  };

  const cancelDelete = ()=> setConfirmDelete(false);

  return (
    <div className="notes-workspace notepad-theme">
      <div className="workspace-view-toggle">
        {onShowDashboard && (
          <button type="button" className="view-toggle-btn" onClick={onShowDashboard}>
            Dashboard
          </button>
        )}
      </div>

      {!onShowDashboard && (
        <div className="note-tabs">
          <div className="tab-strip">
            {orderedNotes.map(note=>(
              <button
                key={note.id}
                className={`note-tab ${note.id===selectedNote?.id ? 'is-active' : ''}`}
                onClick={()=>handleTabClick(note.id)}
              >
                <span className="note-tab-title">{note.title || 'Untitled'}</span>
              </button>
            ))}
          </div>
          <button className="note-tab new-tab" onClick={handleNewNote}>+</button>
        </div>
      )}

      {selectedNote ? (
        <>
          <div className="note-toolbar">
            <input
              className="note-title-field"
              value={selectedNote.title}
              onChange={handleRename}
              placeholder="Note title"
            />
            <div className="note-toolbar-actions">
              <button className="toolbar-btn" onClick={handleNewNote}>New</button>
              {confirmDelete ? (
                <>
                  <span className="toolbar-prompt">Delete this note?</span>
                  <button className="toolbar-btn danger" onClick={confirmDeleteNote}>Delete</button>
                  <button className="toolbar-btn" onClick={cancelDelete}>Cancel</button>
                </>
              ) : (
                <button className="toolbar-btn danger" onClick={handleDelete}>Delete</button>
              )}
            </div>
          </div>

          <div className="note-editor-pane">
            <div className="note-gutter">
              {lineNumbers.map(num=>(
                <div key={num} className="note-gutter-line">{num}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="note-textarea"
              value={selectedNote.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onClick={updateCaretPosition}
              onKeyUp={updateCaretPosition}
              onSelect={updateCaretPosition}
              spellCheck={false}
            />
          </div>

          <div className="note-status">
            <span>Ln {caret.line}, Col {caret.column}</span>
            <span>Words: {wordCount}</span>
            <span>Chars: {(selectedNote.content ?? '').length}</span>
            <span>Updated: {new Date(selectedNote.updatedAt || selectedNote.createdAt).toLocaleString()}</span>
          </div>
        </>
      ) : (
        <div className="note-empty">
          <p>{EMPTY_MESSAGE}</p>
          <button className="toolbar-btn" onClick={handleNewNote}>Create Note</button>
        </div>
      )}
    </div>
  );
}
