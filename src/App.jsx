import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Overview from './views/Overview.jsx';
import BoardsDashboard from './views/Dashboard.jsx';
import Board from './views/Board.jsx';
import NotesWorkspace from './views/NotesWorkspace.jsx';
import CanvasWorkspace from './views/CanvasWorkspace.jsx';
import CanvasDashboard from './views/CanvasDashboard.jsx';
import NotesDashboard from './views/NotesDashboard.jsx';
import Settings from './views/Settings.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import Toasts from './components/Toasts.jsx';
import { SvgIcon, THEMES } from './components/icons.jsx';
import {
  loadWorkspace,
  saveBoards,
  saveNotes,
  saveCanvases,
  flushWrites,
  defaultBoard,
  defaultNote,
  defaultCanvas,
  sanitizeCanvasScene,
  buildSearchIndex,
  buildBackup,
  parseBackup,
  mergeById
} from './lib.js';
import { saveTextFile, openTextFile } from './storage.js';

const PREFERENCES_KEY = 'tacky.preferences.v1';
const DEFAULT_PREFERENCES = { theme:'midnight', reducedMotion:false, focusMode:false, compactCards:false };
const NARROW_BREAKPOINT = 1024;

function loadPreferences(){
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try{
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    if(!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored);
    if(parsed && typeof parsed === 'object'){
      const theme = THEMES.some(t=>t.id===parsed.theme) ? parsed.theme : 'midnight';
      return { ...DEFAULT_PREFERENCES, ...parsed, theme };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT;

export default function App(){
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState({ name:'overview' });
  const [boards, setBoards] = useState([]);
  const [notes, setNotes] = useState([]);
  const [canvases, setCanvases] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [currentCanvasId, setCurrentCanvasId] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(()=> !isNarrow());
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [updateStatus, setUpdateStatus] = useState({ status:'idle', version:null, progress:null, message:null });
  const [preferences, setPreferences] = useState(loadPreferences);
  const appVersion = (typeof window !== 'undefined' && window.tacky?.version) || '1.1.0';

  // -------------------------------------------------------------------------
  // Toasts (used for undo-able deletes and import/export feedback)
  // -------------------------------------------------------------------------
  const toastTimers = useRef(new Map());
  const dismissToast = useCallback((id)=>{
    const timer = toastTimers.current.get(id);
    if (timer){ clearTimeout(timer); toastTimers.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  },[]);
  const pushToast = useCallback(({ message, actionLabel, onAction, tone='default', duration=6000 })=>{
    const id = `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    setToasts(prev => [...prev.slice(-3), { id, message, actionLabel, onAction, tone }]);
    const timer = setTimeout(()=> dismissToast(id), duration);
    toastTimers.current.set(id, timer);
    return id;
  },[dismissToast]);
  useEffect(()=>()=>{ toastTimers.current.forEach(clearTimeout); },[]);

  // Latest collections, readable from callbacks without re-creating them.
  const latest = useRef({ boards, notes, canvases });
  latest.current = { boards, notes, canvases };

  /** Remove item `id` from a collection and offer to put it back. */
  const removeWithUndo = useCallback((collection, setter, id, label)=>{
    const items = latest.current[collection];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    const removed = items[index];
    setter(prev => prev.filter(item => item.id !== id));
    pushToast({
      message: `Deleted ${label} “${removed.name ?? removed.title}”`,
      actionLabel: 'Undo',
      onAction: ()=> setter(cur => cur.some(item => item.id === id)
        ? cur
        : [...cur.slice(0, Math.min(index, cur.length)), removed, ...cur.slice(Math.min(index, cur.length))])
    });
    return true;
  },[pushToast]);

  // -------------------------------------------------------------------------
  // Load + persist
  // -------------------------------------------------------------------------
  useEffect(()=>{
    let cancelled = false;
    loadWorkspace().then(data=>{
      if (cancelled) return;
      setBoards(data.boards);
      setCanvases(data.canvases);
      if (data.notes.length){
        setNotes(data.notes);
      } else {
        const starter = defaultNote('Welcome to Notes', [
          '# Welcome!',
          '',
          'Start capturing ideas in the editor. Notes support **Markdown** — toggle the preview to see it rendered.',
          '',
          '- Press `Ctrl+K` to search everything.',
          '- Add #tags from the toolbar to organise notes.',
          '- [ ] Task lists work too.',
          '- Everything saves automatically.'
        ].join('\n'));
        setNotes([starter]);
        setCurrentNoteId(starter.id);
      }
      setReady(true);
    }).catch(err=>{
      console.error('Failed to load workspace', err);
      setReady(true);
    });
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{ if (ready) saveBoards(boards); },[ready, boards]);
  useEffect(()=>{ if (ready) saveNotes(notes); },[ready, notes]);
  useEffect(()=>{ if (ready) saveCanvases(canvases); },[ready, canvases]);

  useEffect(()=>{
    if (typeof document === 'undefined') return;
    const body = document.body;
    body.dataset.theme = preferences.theme || 'midnight';
    body.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal';
    body.classList.toggle('focus-mode', Boolean(preferences.focusMode));
    body.classList.toggle('compact-cards', Boolean(preferences.compactCards));
  },[preferences]);

  useEffect(()=>{
    try{ window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch {}
  },[preferences]);

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------
  useEffect(()=>{
    const handleResize = ()=>{ if (!isNarrow()) setSidebarOpen(true); };
    window.addEventListener('resize', handleResize);
    return ()=> window.removeEventListener('resize', handleResize);
  },[]);

  useEffect(()=>{
    if (isNarrow()) setSidebarOpen(false);
  },[route.name, route.id]);

  useEffect(()=>{
    document.body.classList.toggle('quick-actions-open', isPaletteOpen);
    return ()=> document.body.classList.remove('quick-actions-open');
  },[isPaletteOpen]);

  // -------------------------------------------------------------------------
  // Updates
  // -------------------------------------------------------------------------
  const applyUpdateStatus = useCallback(partial=>{
    setUpdateStatus(prev => ({ ...prev, ...partial }));
  },[]);

  useEffect(()=>{
    const api = window?.tacky;
    if(!api?.checkForUpdates) return undefined;

    applyUpdateStatus({ status:'checking', message:null, progress:null });

    const disposers = [];
    const addListener = (register, handler)=>{
      if (typeof register !== 'function') return;
      const dispose = register(handler);
      if (typeof dispose === 'function') disposers.push(dispose);
    };

    addListener(api.onUpdateAvailable, info=>{
      applyUpdateStatus({ status:'available', version: info?.version ?? null, message:null, progress:null });
    });
    addListener(api.onUpdateProgress, progress=>{
      applyUpdateStatus({
        status:'downloading',
        progress:{ percent: Math.round(progress?.percent ?? 0), bytesPerSecond: progress?.bytesPerSecond ?? 0 },
        message:null
      });
    });
    addListener(api.onUpdateDownloaded, info=>{
      applyUpdateStatus({ status:'downloaded', version: info?.version ?? null, progress:null });
    });
    addListener(api.onUpdateError, error=>{
      applyUpdateStatus({ status:'error', message: error?.message ?? 'Something went wrong while fetching the update.', progress:null });
    });
    addListener(api.onUpdateNotAvailable, ()=>{
      applyUpdateStatus({ status:'idle', progress:null, message:null });
    });

    api.checkForUpdates().then(result=>{
      if (result?.skipped) applyUpdateStatus({ status:'idle' });
      else if (result?.error) applyUpdateStatus({ status:'error', message: result.error });
    }).catch(err=>{
      applyUpdateStatus({ status:'error', message: err?.message ?? 'Unable to check for updates.' });
    });

    return ()=>{ disposers.forEach(dispose=>{ try{ dispose(); } catch(_){} }); };
  },[applyUpdateStatus]);

  const startDownload = ()=>{
    const api = window?.tacky;
    if(!api?.downloadUpdate) return;
    applyUpdateStatus({ status:'downloading', progress:{ percent:0, bytesPerSecond:0 }, message:null });
    api.downloadUpdate().catch(err=>{
      applyUpdateStatus({ status:'error', message: err?.message ?? 'Failed to download the update.', progress:null });
    });
  };
  const installUpdate = ()=>{ flushWrites().finally(()=> window?.tacky?.installUpdate?.()); };
  const retryCheck = ()=>{
    const api = window?.tacky;
    if(!api?.checkForUpdates) return;
    applyUpdateStatus({ status:'checking', message:null, progress:null });
    api.checkForUpdates().then(result=>{
      if (result?.skipped) applyUpdateStatus({ status:'idle' });
      else if (result?.error) applyUpdateStatus({ status:'error', message: result.error });
    }).catch(err=>{
      applyUpdateStatus({ status:'error', message: err?.message ?? 'Unable to check for updates.' });
    });
  };

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const showOverview = useCallback(()=> setRoute({ name:'overview' }),[]);
  const showBoards = useCallback(()=> setRoute({ name:'boards' }),[]);
  const showNotesDashboard = useCallback(()=> setRoute({ name:'notes-dashboard' }),[]);
  const showCanvasDashboard = useCallback(()=> setRoute({ name:'canvas-dashboard' }),[]);
  const showSettings = useCallback(()=> setRoute({ name:'settings' }),[]);
  const openBoard = useCallback((id, cardId)=> setRoute({ name:'board', id, cardId: cardId ?? null }),[]);

  // -------------------------------------------------------------------------
  // Boards
  // -------------------------------------------------------------------------
  const createBoard = useCallback((name, wallpaper)=>{
    const b = defaultBoard(name);
    if (wallpaper) b.wallpaper = wallpaper;
    setBoards(prev => [b, ...prev]);
    setRoute({ name:'board', id:b.id });
  },[]);

  const updateBoard = useCallback((board)=>{
    setBoards(prev => prev.map(b => b.id===board.id ? board : b));
  },[]);

  const renameBoard = useCallback((id, name)=>{
    setBoards(prev => prev.map(b => b.id===id ? { ...b, name, updatedAt: Date.now() } : b));
  },[]);

  const duplicateBoard = useCallback((id)=>{
    setBoards(prev => {
      const source = prev.find(b=>b.id===id);
      if (!source) return prev;
      const copy = defaultBoard(`${source.name} copy`);
      copy.wallpaper = source.wallpaper;
      copy.lists = source.lists.map(list => ({
        ...list,
        id: `l_${Math.random().toString(36).slice(2,10)}`,
        cards: list.cards.map(card => ({ ...card, id: `c_${Math.random().toString(36).slice(2,10)}` }))
      }));
      const index = prev.indexOf(source);
      const next = prev.slice();
      next.splice(index + 1, 0, copy);
      return next;
    });
  },[]);

  const deleteBoard = useCallback((id)=>{
    removeWithUndo('boards', setBoards, id, 'board');
    setRoute(cur => (cur.name==='board' && cur.id===id) ? { name:'boards' } : cur);
  },[removeWithUndo]);

  // -------------------------------------------------------------------------
  // Notes
  // -------------------------------------------------------------------------
  const createNote = useCallback((title)=>{
    const note = defaultNote(title && title.trim().length ? title.trim() : 'Untitled note');
    setNotes(prev => [note, ...prev]);
    setCurrentNoteId(note.id);
    setRoute({ name:'notes' });
  },[]);

  const updateNote = useCallback((nextNote)=>{
    if(!nextNote?.id) return;
    setNotes(prev => prev.map(n => n.id===nextNote.id ? { ...n, ...nextNote } : n));
  },[]);

  const deleteNote = useCallback((id)=>{
    removeWithUndo('notes', setNotes, id, 'note');
    setCurrentNoteId(cur => (cur===id ? null : cur));
  },[removeWithUndo]);

  const selectNote = useCallback((id)=>{
    setCurrentNoteId(id);
    setRoute({ name:'notes' });
  },[]);

  // -------------------------------------------------------------------------
  // Canvases
  // -------------------------------------------------------------------------
  const createCanvas = useCallback((name)=>{
    const canvas = defaultCanvas(name && name.trim().length ? name.trim() : 'Untitled canvas');
    setCanvases(prev => [canvas, ...prev]);
    setCurrentCanvasId(canvas.id);
    setRoute({ name:'canvas' });
  },[]);

  const selectCanvas = useCallback((id)=>{
    setCurrentCanvasId(id);
    setRoute({ name:'canvas' });
  },[]);

  const deleteCanvas = useCallback((id)=>{
    removeWithUndo('canvases', setCanvases, id, 'canvas');
    setCurrentCanvasId(cur => (cur===id ? null : cur));
  },[removeWithUndo]);

  const renameCanvas = useCallback((id, name)=>{
    setCanvases(prev => prev.map(canvas => canvas.id===id ? { ...canvas, name, updatedAt: Date.now() } : canvas));
  },[]);

  const updateCanvasScene = useCallback((id, scene)=>{
    const safeScene = sanitizeCanvasScene(scene);
    setCanvases(prev => prev.map(canvas => canvas.id===id ? { ...canvas, scene: safeScene, updatedAt: Date.now() } : canvas));
  },[]);

  // -------------------------------------------------------------------------
  // Backup / restore
  // -------------------------------------------------------------------------
  const exportBackup = useCallback(async ()=>{
    const stamp = new Date().toISOString().slice(0,10);
    const payload = buildBackup({ boards, notes, canvases, preferences });
    try{
      const result = await saveTextFile({
        defaultName:`tacky-backup-${stamp}.json`,
        contents: JSON.stringify(payload),
        filters:[{ name:'Tacky backup', extensions:['json'] }]
      });
      if (!result?.canceled) pushToast({ message:'Backup saved.', tone:'success' });
    } catch (err){
      pushToast({ message:`Backup failed: ${err?.message ?? err}`, tone:'danger' });
    }
  },[boards, notes, canvases, preferences, pushToast]);

  const importBackup = useCallback(async (mode='merge')=>{
    try{
      const result = await openTextFile({ filters:[{ name:'Tacky backup', extensions:['json'] }] });
      if (result?.canceled) return;
      const data = parseBackup(result.contents);
      if (mode === 'replace'){
        setBoards(data.boards);
        setNotes(data.notes);
        setCanvases(data.canvases);
      } else {
        setBoards(prev => mergeById(prev, data.boards));
        setNotes(prev => mergeById(prev, data.notes));
        setCanvases(prev => mergeById(prev, data.canvases));
      }
      if (data.preferences) setPreferences(prev => ({ ...prev, ...data.preferences }));
      pushToast({
        message:`Restored ${data.boards.length} boards, ${data.notes.length} notes, ${data.canvases.length} canvases.`,
        tone:'success'
      });
    } catch (err){
      pushToast({ message:`Import failed: ${err?.message ?? err}`, tone:'danger' });
    }
  },[pushToast]);

  const clearWorkspace = useCallback(()=>{
    setBoards([]);
    setNotes([]);
    setCanvases([]);
    setCurrentNoteId(null);
    setCurrentCanvasId(null);
    setRoute({ name:'overview' });
    pushToast({ message:'Workspace cleared.' });
  },[pushToast]);

  // -------------------------------------------------------------------------
  // Search + palette
  // -------------------------------------------------------------------------
  const searchIndexData = useMemo(()=> buildSearchIndex({ boards, notes, canvases }),[boards, notes, canvases]);

  const openSearchResult = useCallback((item)=>{
    switch(item.type){
      case 'board': openBoard(item.id); break;
      case 'card': openBoard(item.boardId, item.id); break;
      case 'note': selectNote(item.id); break;
      case 'canvas': selectCanvas(item.id); break;
      default: break;
    }
  },[openBoard, selectNote, selectCanvas]);

  const navigateQuick = useCallback((target)=>{
    switch(target){
      case 'overview': showOverview(); break;
      case 'boards': showBoards(); break;
      case 'notes-dashboard': showNotesDashboard(); break;
      case 'canvas-dashboard': showCanvasDashboard(); break;
      case 'settings': showSettings(); break;
      case 'notes': setRoute({ name:'notes' }); break;
      case 'canvas': setRoute({ name:'canvas' }); break;
      default: break;
    }
  },[showOverview, showBoards, showNotesDashboard, showCanvasDashboard, showSettings]);

  const createInContext = useCallback(()=>{
    switch(route.name){
      case 'boards': case 'board': createBoard('New board'); break;
      case 'canvas': case 'canvas-dashboard': createCanvas('New canvas'); break;
      default: createNote('New note'); break;
    }
  },[route.name, createBoard, createCanvas, createNote]);

  const paletteCommands = useMemo(()=>[
    { id:'new-board', label:'New board', hint:'Create', run:()=>createBoard('New board') },
    { id:'new-note', label:'New note', hint:'Create', run:()=>createNote('New note') },
    { id:'new-canvas', label:'New canvas', hint:'Create', run:()=>createCanvas('New canvas') },
    { id:'go-overview', label:'Go to overview', hint:'Ctrl+1', run:showOverview },
    { id:'go-boards', label:'Go to boards', hint:'Ctrl+2', run:showBoards },
    { id:'go-notes', label:'Go to notes', hint:'Ctrl+3', run:showNotesDashboard },
    { id:'go-canvas', label:'Go to canvases', hint:'Ctrl+4', run:showCanvasDashboard },
    { id:'go-settings', label:'Open settings', hint:'Ctrl+,', run:showSettings },
    { id:'toggle-sidebar', label:'Toggle sidebar', hint:'Ctrl+B', run:()=>setSidebarOpen(v=>!v) },
    { id:'toggle-focus', label: preferences.focusMode ? 'Disable focus mode' : 'Enable focus mode', hint:'Comfort', run:()=>setPreferences(p=>({ ...p, focusMode:!p.focusMode })) },
    ...THEMES.map(theme => ({ id:`theme-${theme.id}`, label:`Theme: ${theme.name}`, hint:'Appearance', run:()=>setPreferences(p=>({ ...p, theme:theme.id })) })),
    { id:'export-backup', label:'Export backup', hint:'Data', run:exportBackup },
    { id:'import-backup', label:'Import backup (merge)', hint:'Data', run:()=>importBackup('merge') }
  ],[createBoard, createNote, createCanvas, showOverview, showBoards, showNotesDashboard, showCanvasDashboard, showSettings, preferences.focusMode, exportBackup, importBackup]);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  const shortcutRefs = useRef({});
  shortcutRefs.current = { navigateQuick, createInContext };

  useEffect(()=>{
    const handler = (event)=>{
      const key = event.key?.toLowerCase?.() ?? '';
      const mod = event.metaKey || event.ctrlKey;
      if (key === 'escape'){ setPaletteOpen(false); return; }
      if (!mod) return;
      const { navigateQuick: nav, createInContext: create } = shortcutRefs.current;
      const routes = { '1':'overview', '2':'boards', '3':'notes-dashboard', '4':'canvas-dashboard', '5':'settings', ',':'settings' };
      if (key === 'k'){ event.preventDefault(); setPaletteOpen(prev => !prev); return; }
      if (routes[key]){ event.preventDefault(); nav(routes[key]); return; }
      if (key === 'b' && !event.shiftKey){ event.preventDefault(); setSidebarOpen(prev => !prev); return; }
      if (key === 'n' && !event.shiftKey){ event.preventDefault(); create(); }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  },[]);

  // Keep a note / canvas selected when entering those workspaces.
  useEffect(()=>{
    if(route.name==='notes' && !currentNoteId && notes.length) setCurrentNoteId(notes[0].id);
  },[route.name, currentNoteId, notes]);
  useEffect(()=>{
    if(route.name==='canvas' && !currentCanvasId && canvases.length) setCurrentCanvasId(canvases[0].id);
  },[route.name, currentCanvasId, canvases]);

  // -------------------------------------------------------------------------
  // Derived UI state
  // -------------------------------------------------------------------------
  const activeBoard = route.name==='board' ? boards.find(b=>b.id===route.id) : null;
  const shouldShowBanner = ['available','downloading','downloaded','error'].includes(updateStatus.status)
    && isSidebarOpen
    && !['notes','canvas'].includes(route.name);
  const percent = updateStatus.progress?.percent ?? 0;
  const activeCategory = (() => {
    if(route.name === 'board' || route.name === 'boards') return 'boards';
    if(route.name === 'notes' || route.name === 'notes-dashboard') return 'notes';
    if(route.name === 'canvas' || route.name === 'canvas-dashboard') return 'canvas';
    if(route.name === 'settings') return 'settings';
    return 'overview';
  })();
  const activeLabel = (()=> {
    if(route.name === 'board') return activeBoard?.name ?? 'Board';
    switch(route.name){
      case 'overview': return 'Overview';
      case 'boards': return 'Boards';
      case 'notes-dashboard': return 'Notes';
      case 'notes': return 'Notes workspace';
      case 'canvas-dashboard': return 'Canvas library';
      case 'canvas': return 'Canvas workspace';
      case 'settings': return 'Settings';
      default: return 'Workspace';
    }
  })();

  const sidebarLinks = [
    { key:'overview', label:'Overview', hint:'Home base', icon:'sparkle', isActive: activeCategory==='overview', onClick: showOverview },
    { key:'boards', label:'Boards', hint:'Plan projects', icon:'boards', isActive: activeCategory==='boards', onClick: showBoards },
    { key:'notes', label:'Notes', hint:'Capture ideas', icon:'notes', isActive: activeCategory==='notes', onClick: showNotesDashboard },
    { key:'canvas', label:'Canvas', hint:'Sketch freely', icon:'canvas', isActive: activeCategory==='canvas', onClick: showCanvasDashboard },
    { key:'settings', label:'Settings', hint:'Themes & data', icon:'palette', isActive: activeCategory==='settings', onClick: showSettings }
  ];

  const openPalette = useCallback(()=> setPaletteOpen(true),[]);
  const closePalette = useCallback(()=> setPaletteOpen(false),[]);

  const handleNavSelect = useCallback((handler)=>{
    if (typeof handler === 'function') handler();
    closePalette();
    if (isNarrow()) setSidebarOpen(false);
  },[closePalette]);

  const footerStatus = (()=> {
    switch(updateStatus.status){
      case 'checking': return 'Checking for updates...';
      case 'available': return updateStatus.version ? `v${updateStatus.version} ready` : 'Update available';
      case 'downloading': return `Downloading... ${percent}%`;
      case 'downloaded': return 'Ready to install';
      case 'error': return 'Update unavailable';
      default: return 'You are up to date';
    }
  })();

  const toggleSidebar = ()=> setSidebarOpen(prev => !prev);

  if (!ready){
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="app-loading-spinner" aria-hidden="true" />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  return (
    <div className={`app-frame ${isSidebarOpen ? 'nav-open' : 'nav-collapsed'}`}>
      <div className="app-frame-backdrop" aria-hidden="true" />
      <aside className="nav-panel">
        <div className="nav-panel-inner">
          <div className="nav-brand">
            <span className="nav-logo">
              <SvgIcon name="sparkle" className="brand-icon" />
            </span>
            <div className="nav-brand-copy">
              <span className="nav-brand-title">Tacky Studio</span>
              <span className="nav-brand-subtitle">Boards · Notes · Canvas</span>
            </div>
          </div>
          <div className="nav-section">
            <span className="nav-section-title">Navigate</span>
            <nav className="nav-links">
              {sidebarLinks.map(item => (
                <button
                  type="button"
                  key={item.key}
                  className={`nav-link ${item.isActive ? 'is-active' : ''}`}
                  onClick={()=>handleNavSelect(item.onClick)}
                  title={item.hint}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  <span className="nav-link-icon">
                    <SvgIcon name={item.icon} />
                  </span>
                  <div className="nav-link-copy">
                    <span className="nav-link-label">{item.label}</span>
                    <span className="nav-link-hint">{item.hint}</span>
                  </div>
                  <span className="nav-link-indicator" aria-hidden="true" />
                </button>
              ))}
            </nav>
          </div>
          <div className="nav-section nav-create">
            <span className="nav-section-title">Create</span>
            <div className="nav-create-actions">
              <button type="button" onClick={()=>handleNavSelect(()=>createBoard('New board'))}>Board</button>
              <button type="button" onClick={()=>handleNavSelect(()=>createNote('New note'))}>Note</button>
              <button type="button" onClick={()=>handleNavSelect(()=>createCanvas('New canvas'))}>Canvas</button>
            </div>
          </div>
          <div className="nav-compact-actions">
            <button type="button" onClick={openPalette} title="Search & commands (Ctrl+K)" aria-label="Open command palette">
              <span className="nav-compact-icon">+</span>
            </button>
          </div>
          <div className="nav-footer">
            <div className="nav-footer-status">
              <span className="nav-footer-label">Status</span>
              <span className={`nav-footer-value status-${updateStatus.status}`}>{footerStatus}</span>
            </div>
            <div className="nav-footer-meta">
              <span className="nav-footer-label">Version</span>
              <span className="nav-footer-value">v{appVersion}</span>
            </div>
            <button type="button" className="nav-footer-btn" onClick={retryCheck}>
              <SvgIcon name="refresh" className="nav-footer-icon" />
              <span>{updateStatus.status === 'checking' ? 'Checking...' : 'Check updates'}</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="main-panel">
        <header className="global-header">
          <div className="header-left">
            <button
              type="button"
              className="nav-trigger"
              onClick={toggleSidebar}
              title={isSidebarOpen ? 'Hide navigation (Ctrl+B)' : 'Show navigation (Ctrl+B)'}
            >
              <SvgIcon name="menu" />
            </button>
            <div className="header-titles">
              <span className="header-crumb">{route.name==='board' ? 'Boards' : 'Workspace'}</span>
              <h1 className="header-title">{activeLabel}</h1>
            </div>
          </div>
          <div className="header-right">
            <button type="button" className="header-search" onClick={openPalette} aria-label="Search everything">
              <SvgIcon name="search" className="icon-sm" />
              <span className="header-search-label">Search everything…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className="header-counters">
              <div className="header-counter">
                <span className="header-counter-value">{boards.length}</span>
                <span className="header-counter-label">Boards</span>
              </div>
              <div className="header-counter">
                <span className="header-counter-value">{notes.length}</span>
                <span className="header-counter-label">Notes</span>
              </div>
              <div className="header-counter">
                <span className="header-counter-value">{canvases.length}</span>
                <span className="header-counter-label">Canvases</span>
              </div>
            </div>
            <div className="header-controls">
              {route.name==='board' && (
                <button type="button" className="header-pill" onClick={showBoards}>
                  <SvgIcon name="arrowLeft" className="icon-sm" />
                  <span>Back to boards</span>
                </button>
              )}
              {updateStatus.status === 'available' && (
                <button type="button" className="header-pill accent" onClick={startDownload}>
                  <SvgIcon name="download" className="icon-sm" />
                  <span>Download update</span>
                </button>
              )}
              {updateStatus.status === 'downloaded' && (
                <button type="button" className="header-pill accent" onClick={installUpdate}>
                  <SvgIcon name="sparkle" className="icon-sm" />
                  <span>Install update</span>
                </button>
              )}
            </div>
          </div>
        </header>
        {shouldShowBanner && (
          <div className={`system-banner system-banner-${updateStatus.status}`}>
            <div className="system-banner-icon">
              <SvgIcon
                name={updateStatus.status === 'error' ? 'alert' : updateStatus.status === 'downloading' ? 'download' : 'sparkle'}
                className="banner-icon"
              />
            </div>
            <div className="system-banner-copy">
              {updateStatus.status === 'available' && (
                <>
                  <p className="banner-title">Update{updateStatus.version ? ` ${updateStatus.version}` : ''} is ready.</p>
                  <p className="banner-subtitle">Grab the latest improvements when it suits you.</p>
                </>
              )}
              {updateStatus.status === 'downloading' && (
                <>
                  <p className="banner-title">Downloading update...</p>
                  <p className="banner-subtitle">Progress {percent}%</p>
                </>
              )}
              {updateStatus.status === 'downloaded' && (
                <>
                  <p className="banner-title">Update{updateStatus.version ? ` ${updateStatus.version}` : ''} ready to install.</p>
                  <p className="banner-subtitle">Restart to finish updating.</p>
                </>
              )}
              {updateStatus.status === 'error' && (
                <>
                  <p className="banner-title">Update failed.</p>
                  <p className="banner-subtitle">{updateStatus.message ?? 'Something went wrong while downloading the update.'}</p>
                </>
              )}
            </div>
            <div className="system-banner-actions">
              {updateStatus.status === 'available' && (
                <button type="button" className="header-pill ghost" onClick={startDownload}><span>Download</span></button>
              )}
              {updateStatus.status === 'downloaded' && (
                <button type="button" className="header-pill accent" onClick={installUpdate}><span>Restart and install</span></button>
              )}
              {updateStatus.status === 'error' && (
                <button type="button" className="header-pill ghost" onClick={retryCheck}><span>Retry</span></button>
              )}
              {updateStatus.status === 'downloading' && (
                <span className="banner-progress">{percent}%</span>
              )}
            </div>
          </div>
        )}
        <div className="main-scroll">
          <main className="workspace-view">
            {route.name==='overview' && (
              <Overview
                boards={boards}
                notes={notes}
                canvases={canvases}
                onCreateBoard={()=>createBoard('New board')}
                onCreateNote={()=>createNote('New note')}
                onCreateCanvas={()=>createCanvas('New canvas')}
                onOpenBoard={openBoard}
                onOpenNote={selectNote}
                onOpenCanvas={selectCanvas}
                onShowBoards={showBoards}
                onShowNotes={showNotesDashboard}
                onShowCanvases={showCanvasDashboard}
              />
            )}
            {route.name==='boards' && (
              <BoardsDashboard
                boards={boards}
                onOpen={openBoard}
                onCreate={createBoard}
                onRename={renameBoard}
                onDuplicate={duplicateBoard}
                onDelete={deleteBoard}
              />
            )}
            {route.name==='board' && (
              activeBoard ? (
                <Board
                  key={activeBoard.id}
                  board={activeBoard}
                  focusCardId={route.cardId ?? null}
                  onUpdate={updateBoard}
                  onDelete={deleteBoard}
                  onToast={pushToast}
                />
              ) : (
                <div className="board-missing">
                  <p>That board no longer exists.</p>
                  <button type="button" className="button accent-button" onClick={showBoards}>Back to boards</button>
                </div>
              )
            )}
            {route.name==='notes-dashboard' && (
              <NotesDashboard
                notes={notes}
                onSelect={selectNote}
                onCreate={()=>createNote('New note')}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
              />
            )}
            {route.name==='notes' && (
              <NotesWorkspace
                notes={notes}
                selectedNoteId={currentNoteId}
                onSelectNote={selectNote}
                onCreateNote={createNote}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onShowDashboard={showNotesDashboard}
                onToast={pushToast}
              />
            )}
            {route.name==='canvas-dashboard' && (
              <CanvasDashboard
                canvases={canvases}
                onOpen={selectCanvas}
                onCreate={createCanvas}
                onRename={renameCanvas}
                onDelete={deleteCanvas}
              />
            )}
            {route.name==='canvas' && (
              <CanvasWorkspace
                canvases={canvases}
                selectedCanvasId={currentCanvasId}
                onUpdateCanvas={updateCanvasScene}
                onRenameCanvas={renameCanvas}
                onShowDashboard={showCanvasDashboard}
                theme={preferences.theme}
              />
            )}
            {route.name==='settings' && (
              <Settings
                themes={THEMES}
                selectedTheme={preferences.theme}
                onSelectTheme={(id)=>setPreferences(prev=>({ ...prev, theme:id }))}
                preferences={preferences}
                onTogglePreference={(key)=>setPreferences(prev=>({ ...prev, [key]:!prev[key] }))}
                onExportBackup={exportBackup}
                onImportBackup={importBackup}
                onClearWorkspace={clearWorkspace}
                counts={{ boards: boards.length, notes: notes.length, canvases: canvases.length }}
                renderIcon={(name, className)=> <SvgIcon name={name} className={className} />}
              />
            )}
          </main>
        </div>
      </div>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        index={searchIndexData}
        commands={paletteCommands}
        onOpenItem={openSearchResult}
        onNavigate={navigateQuick}
      />
      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}
