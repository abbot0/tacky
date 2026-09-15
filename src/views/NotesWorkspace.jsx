import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from '../markdown.js';
import { saveTextFile } from '../storage.js';
import { SvgIcon } from '../components/icons.jsx';

const EMPTY_MESSAGE = 'Create a note to start writing.';
const VIEW_MODES = [
  { id:'edit', label:'Edit' },
  { id:'split', label:'Split' },
  { id:'preview', label:'Preview' }
];
const VIEW_KEY = 'tacky.notes.view';

export default function NotesWorkspace({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onShowDashboard,
  onToast
}){
  const textareaRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [caret, setCaret] = useState({ line: 1, column: 1 });
  const [viewMode, setViewMode] = useState(()=>{
    try { return window.localStorage.getItem(VIEW_KEY) || 'edit'; } catch { return 'edit'; }
  });
  const [tagDraft, setTagDraft] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');

  const orderedNotes = useMemo(()=>{
    return (Array.isArray(notes) ? notes : [])
      .slice()
      .sort((a,b)=> (Number(b.pinned) - Number(a.pinned)) || ((b.updatedAt || 0) - (a.updatedAt || 0)));
  },[notes]);

  const visibleNotes = useMemo(()=>{
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return orderedNotes;
    return orderedNotes.filter(n => n.title.toLowerCase().includes(q) || n.tags?.some(t => t.includes(q)));
  },[orderedNotes, sidebarQuery]);

  const selectedNote = useMemo(()=>{
    return orderedNotes.find(n=>n.id===selectedNoteId) ?? orderedNotes[0] ?? null;
  },[orderedNotes, selectedNoteId]);

  useEffect(()=>{
    if(!selectedNoteId && orderedNotes.length) onSelectNote?.(orderedNotes[0].id);
  },[selectedNoteId, orderedNotes, onSelectNote]);

  useEffect(()=>{ try { window.localStorage.setItem(VIEW_KEY, viewMode); } catch {} },[viewMode]);

  // -------------------------------------------------------------------------
  // Local draft buffer. Typing updates local state instantly; the global note
  // list (and therefore App + persistence) only sees changes after a short
  // pause, so long notes stay responsive.
  // -------------------------------------------------------------------------
  const [draft, setDraft] = useState({ title:'', content:'' });
  const draftTimer = useRef(null);
  const pendingRef = useRef(null);

  const flushDraft = useCallback(()=>{
    if (draftTimer.current){ clearTimeout(draftTimer.current); draftTimer.current = null; }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    onUpdateNote?.(pending);
  },[onUpdateNote]);

  useEffect(()=>{
    flushDraft();
    setDraft({ title: selectedNote?.title ?? '', content: selectedNote?.content ?? '' });
    setConfirmDelete(false);
    setTagDraft('');
    requestAnimationFrame(updateCaretPosition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedNote?.id]);

  useEffect(()=>()=>{ flushDraft(); },[flushDraft]);

  const scheduleUpdate = useCallback((patch)=>{
    if (!selectedNote) return;
    pendingRef.current = { id: selectedNote.id, ...(pendingRef.current ?? {}), ...patch, updatedAt: Date.now() };
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(()=>{ draftTimer.current = null; flushDraft(); }, 250);
  },[selectedNote, flushDraft]);

  const lineCount = useMemo(()=> (draft.content.match(/\n/g)?.length ?? 0) + 1,[draft.content]);
  const wordCount = useMemo(()=> draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0,[draft.content]);
  const previewHtml = useMemo(()=> (viewMode === 'edit' ? '' : renderMarkdown(draft.content)),[draft.content, viewMode]);

  const updateCaretPosition = ()=>{
    const el = textareaRef.current;
    if(!el) return;
    const caretIndex = el.selectionStart ?? 0;
    const untilCaret = el.value.slice(0, caretIndex);
    const lastBreak = untilCaret.lastIndexOf('\n');
    setCaret({ line: (untilCaret.match(/\n/g)?.length ?? 0) + 1, column: caretIndex - lastBreak });
  };

  const handleRename = (evt)=>{
    setDraft(d => ({ ...d, title: evt.target.value }));
    scheduleUpdate({ title: evt.target.value });
  };

  const handleContentChange = (evt)=>{
    setDraft(d => ({ ...d, content: evt.target.value }));
    scheduleUpdate({ content: evt.target.value });
    updateCaretPosition();
  };

  const insertAtCursor = (before, after='')=>{
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = draft.content;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setDraft(d => ({ ...d, content: next }));
    scheduleUpdate({ content: next });
    requestAnimationFrame(()=>{
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
      updateCaretPosition();
    });
  };

  const handleKeyDown = (evt)=>{
    if (evt.key === 'Tab'){
      evt.preventDefault();
      insertAtCursor('\t');
      return;
    }
    if ((evt.ctrlKey || evt.metaKey) && !evt.shiftKey){
      const key = evt.key.toLowerCase();
      if (key === 'b'){ evt.preventDefault(); evt.stopPropagation(); insertAtCursor('**', '**'); }
      else if (key === 'i'){ evt.preventDefault(); insertAtCursor('_', '_'); }
      else if (key === 'e'){ evt.preventDefault(); insertAtCursor('`', '`'); }
    }
  };

  const addTag = ()=>{
    const tag = tagDraft.trim().replace(/^#/, '').toLowerCase();
    if (!tag || !selectedNote) return;
    const tags = Array.from(new Set([...(selectedNote.tags ?? []), tag]));
    onUpdateNote?.({ id: selectedNote.id, tags, updatedAt: Date.now() });
    setTagDraft('');
  };
  const removeTag = (tag)=>{
    if (!selectedNote) return;
    onUpdateNote?.({ id: selectedNote.id, tags: (selectedNote.tags ?? []).filter(t => t !== tag), updatedAt: Date.now() });
  };
  const togglePin = (note)=> onUpdateNote?.({ id: note.id, pinned: !note.pinned });

  const exportMarkdown = async ()=>{
    if (!selectedNote) return;
    flushDraft();
    const result = await saveTextFile({
      defaultName: `${draft.title.replace(/[^\w-]+/g, '_') || 'note'}.md`,
      contents: draft.content,
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }]
    });
    if (!result?.canceled) onToast?.({ message: 'Note exported.', tone: 'success' });
  };

  const confirmDeleteNote = ()=>{
    if(!selectedNote) return;
    pendingRef.current = null;
    onDeleteNote?.(selectedNote.id);
    setConfirmDelete(false);
  };

  return (
    <div className="notes-workspace notepad-theme">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-header">
          <button type="button" className="view-toggle-btn" onClick={onShowDashboard}>Dashboard</button>
          <button type="button" className="button accent-button" onClick={()=>onCreateNote?.()}>New</button>
        </div>
        <input
          className="notes-sidebar-search"
          placeholder="Filter notes…"
          value={sidebarQuery}
          onChange={e=>setSidebarQuery(e.target.value)}
        />
        <div className="notes-sidebar-list">
          {visibleNotes.map(note=>(
            <button
              key={note.id}
              type="button"
              className={`notes-sidebar-item${note.id===selectedNote?.id ? ' is-active' : ''}`}
              onClick={()=>{ if (note.id !== selectedNote?.id) onSelectNote?.(note.id); }}
            >
              <span className="notes-sidebar-title">
                {note.pinned && <SvgIcon name="pin" className="icon-xs" />}
                {note.title || 'Untitled'}
              </span>
              <span className="notes-sidebar-meta">
                {note.tags?.slice(0,3).map(t => <span key={t} className="tag-chip">#{t}</span>)}
                <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
              </span>
            </button>
          ))}
          {visibleNotes.length === 0 && <div className="notes-sidebar-empty">No notes match.</div>}
        </div>
      </aside>

      <section className="notes-main">
        {selectedNote ? (
          <>
            <div className="note-toolbar">
              <input
                className="note-title-field"
                value={draft.title}
                onChange={handleRename}
                placeholder="Note title"
              />
              <div className="note-toolbar-actions">
                <div className="segmented" role="tablist" aria-label="View mode">
                  {VIEW_MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      aria-selected={viewMode === mode.id}
                      className={viewMode === mode.id ? 'is-active' : ''}
                      onClick={()=>setViewMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <button className={`toolbar-btn${selectedNote.pinned ? ' is-active' : ''}`} onClick={()=>togglePin(selectedNote)} title={selectedNote.pinned ? 'Unpin' : 'Pin to top'}>
                  <SvgIcon name="pin" className="icon-xs" />
                </button>
                <button className="toolbar-btn" onClick={exportMarkdown} title="Export as Markdown">Export</button>
                {confirmDelete ? (
                  <>
                    <span className="toolbar-prompt">Delete this note?</span>
                    <button className="toolbar-btn danger" onClick={confirmDeleteNote}>Delete</button>
                    <button className="toolbar-btn" onClick={()=>setConfirmDelete(false)}>Cancel</button>
                  </>
                ) : (
                  <button className="toolbar-btn danger" onClick={()=>setConfirmDelete(true)}>Delete</button>
                )}
              </div>
            </div>

            <div className="note-tags">
              {(selectedNote.tags ?? []).map(tag => (
                <span key={tag} className="tag-chip removable">
                  #{tag}
                  <button type="button" onClick={()=>removeTag(tag)} aria-label={`Remove tag ${tag}`}>×</button>
                </span>
              ))}
              <input
                className="tag-input"
                placeholder="+ tag"
                value={tagDraft}
                onChange={e=>setTagDraft(e.target.value)}
                onKeyDown={e=>{ if (e.key === 'Enter' || e.key === ','){ e.preventDefault(); addTag(); } }}
                onBlur={addTag}
              />
            </div>

            <div className={`note-editor-split mode-${viewMode}`}>
              {viewMode !== 'preview' && (
                <div className="note-editor-pane">
                  <div className="note-gutter" aria-hidden="true">
                    {Array.from({ length: lineCount }, (_, idx) => (
                      <div key={idx} className="note-gutter-line">{idx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="note-textarea"
                    value={draft.content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onClick={updateCaretPosition}
                    onKeyUp={updateCaretPosition}
                    onSelect={updateCaretPosition}
                    spellCheck={false}
                    placeholder="Write in Markdown…"
                  />
                </div>
              )}
              {viewMode !== 'edit' && (
                <div className="note-preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="note-preview-empty">Nothing to preview yet.</p>' }} />
              )}
            </div>

            <div className="note-status">
              <span>Ln {caret.line}, Col {caret.column}</span>
              <span>Words: {wordCount}</span>
              <span>Chars: {draft.content.length}</span>
              <span>Updated: {new Date(selectedNote.updatedAt || selectedNote.createdAt).toLocaleString()}</span>
              <span className="note-status-hint">Ctrl+B bold · Ctrl+I italic · Ctrl+E code</span>
            </div>
          </>
        ) : (
          <div className="note-empty">
            <p>{EMPTY_MESSAGE}</p>
            <button className="toolbar-btn" onClick={()=>onCreateNote?.()}>Create Note</button>
          </div>
        )}
      </section>
    </div>
  );
}
