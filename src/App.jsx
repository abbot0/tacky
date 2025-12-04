import React, { useCallback, useEffect, useState } from 'react';
import Overview from './views/Overview.jsx';
import BoardsDashboard from './views/Dashboard.jsx';
import Board from './views/Board.jsx';
import NotesWorkspace from './views/NotesWorkspace.jsx';
import CanvasWorkspace from './views/CanvasWorkspace.jsx';
import CanvasDashboard from './views/CanvasDashboard.jsx';
import NotesDashboard from './views/NotesDashboard.jsx';
import Settings from './views/Settings.jsx';
import QuickActionsSheet from './components/QuickActionsSheet.jsx';
import {
  loadBoards,
  saveBoards,
  defaultBoard,
  deepClone,
  loadNotes,
  saveNotes,
  defaultNote,
  loadCanvases,
  saveCanvases,
  defaultCanvas,
  sanitizeCanvasScene
} from './lib.js';

const ICONS = {
  boards: [
    'M4 3h6.5a1.5 1.5 0 0 1 1.5 1.5V11H3V4.5A1.5 1.5 0 0 1 4.5 3H4z',
    'M3 13h9v7H4.5A1.5 1.5 0 0 1 3 18.5V13z',
    'M13 3h6.5A1.5 1.5 0 0 1 21 4.5V13h-8V3z',
    'M13 15h8v3.5a1.5 1.5 0 0 1-1.5 1.5H13v-5z'
  ],
  notes: [
    'M6 3h7.5a1.5 1.5 0 0 1 1.06.44l3 3A1.5 1.5 0 0 1 18 7.5V20a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M14 4.56V7h2.44z',
    'M8 11a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H8z',
    'M8 15a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H8z'
  ],
  canvas: [
    'M5 4h9a1 1 0 0 1 1 1v3h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M12.84 6.3 7.1 16.11a1 1 0 0 0 .38 1.38 1 1 0 0 0 1.38-.37l5.27-9.1a1 1 0 1 0-1.29-1.43z',
    'M15 18a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-4a1 1 0 0 0-1 1v3z'
  ],
  menu: [
    'M4 6a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z',
    'M4 12a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z',
    'M4 18a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z'
  ],
  download: [
    'M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42L11 12.59V4a1 1 0 0 1 1-1z',
    'M5 18a1 1 0 0 0 0 2h14a1 1 0 1 0 0-2H5z'
  ],
  sparkle: [
    'M12 3l1.9 4.06L18 8l-4.1 1.06L12 13l-1.9-3.94L6 8l4.1-0.94L12 3z',
    'M6 17l.95 2.03L9 20l-2.05.52L6 23l-.95-2.48L3 20l2.05-.97L6 17z',
    'M18 15l1.3 2.6L22 18l-2.69.4L18 21l-.61-2.6L14.7 18l2.69-.4L18 15z'
  ],
  alert: [
    'M12.94 3.34a1 1 0 0 0-1.88 0l-7.5 15.5A1 1 0 0 0 4.44 20h15.12a1 1 0 0 0 .88-1.16l-7.5-15.5zM12 9a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V10a1 1 0 0 1 1-1zm0 8a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 17z'
  ],
  arrowLeft: [
    'M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H18a1 1 0 1 1 0 2h-7.59l4.3 4.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0z'
  ],
  refresh: [
    'M19 4.5a1 1 0 0 0-2 0v1.26a7 7 0 0 0-11.64 5.08 1 1 0 0 0 2 0 5 5 0 0 1 8.17-3.8l-1.46 1.46a1 1 0 1 0 1.42 1.42l3.17-3.18a1 1 0 0 0 .29-.7V4.5zM5 19.5a1 1 0 0 0 2 0v-1.26a7 7 0 0 0 11.64-5.08 1 1 0 0 0-2 0 5 5 0 0 1-8.17 3.8l1.46-1.46a1 1 0 0 0-1.42-1.42l-3.17 3.18a1 1 0 0 0-.29.7v1.54z'
  ],
  palette: [
    'M12 3a9 9 0 1 0 0 18h1.35a2.15 2.15 0 0 0 2.05-2.9l-.33-.96a1 1 0 0 1 .95-1.34H17a3 3 0 0 0 1.73-5.46A9.5 9.5 0 0 0 12 3z',
    'M8 9.5a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 8 9.5z',
    'M12 7a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 12 7z',
    'M15.5 9.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z',
    'M13.5 13.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0z'
  ]
};

const THEMES = [
  {
    id:'midnight',
    name:'Midnight Dark',
    description:'The original neon midnight glow.',
    accent:'#9f7aea',
    swatch:['#0b1b3a','#121d34','#9f7aea']
  },
  {
    id:'graphite',
    name:'Graphite Grey',
    description:'Smoky charcoal with soft edges.',
    accent:'#22d3ee',
    swatch:['#0f121a','#1d232f','#22d3ee']
  },
  {
    id:'noir',
    name:'Noir Black',
    description:'Pure blacks with crisp cyan highlights.',
    accent:'#38bdf8',
    swatch:['#050505','#0f0f0f','#38bdf8']
  },
  {
    id:'light',
    name:'Lumen Light',
    description:'Bright, low-glare surfaces with clean contrast.',
    accent:'#6366f1',
    swatch:['#ffffff','#eef2ff','#6366f1']
  }
];

const PREFERENCES_KEY = 'tacky.preferences.v1';

function SvgIcon({ name, className }) {
  const paths = ICONS[name];
  if (!paths) return null;
  const data = Array.isArray(paths) ? paths : [paths];
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {data.map((d, idx) => (
        <path key={idx} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function App(){
  const [route, setRoute] = useState({ name:'overview' });
  const [boards, setBoards] = useState([]);
  const [notes, setNotes] = useState([]);
  const [canvases, setCanvases] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [currentCanvasId, setCurrentCanvasId] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(()=>{
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const [isQuickActionsOpen, setQuickActionsOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState({ status:'idle', version:null, progress:null, message:null });
  const [preferences, setPreferences] = useState(()=>{
    const fallback = { theme:'midnight', reducedMotion:false, focusMode:false };
    if (typeof window === 'undefined') return fallback;
    try{
      const stored = window.localStorage.getItem(PREFERENCES_KEY);
      if(!stored) return fallback;
      const parsed = JSON.parse(stored);
      if(parsed && typeof parsed === 'object'){
        return {
          ...fallback,
          ...parsed,
          theme: parsed.theme || 'midnight'
        };
      }
      return fallback;
    } catch {
      return fallback;
    }
  });
  const appVersion = typeof window !== 'undefined' && window?.tacky?.version ? window.tacky.version : '1.0.2';

  const applyUpdateStatus = useCallback(partial=>{
    setUpdateStatus(prev => ({ ...prev, ...partial }));
  },[]);

  useEffect(()=>{
    if (typeof window === 'undefined') return undefined;
    const handleResize = ()=>{
      if (window.innerWidth >= 1024){
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return ()=> window.removeEventListener('resize', handleResize);
  },[]);

  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024){
      setSidebarOpen(false);
    }
  },[route]);

  useEffect(()=>{
    if (typeof document === 'undefined') return undefined;
    const nextTheme = preferences.theme || 'midnight';
    const body = document.body;
    body.dataset.theme = nextTheme;
    body.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal';
    body.classList.toggle('focus-mode', Boolean(preferences.focusMode));
    return undefined;
  },[preferences]);

  useEffect(()=>{
    if (typeof window === 'undefined') return;
    try{
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {}
  },[preferences]);

  useEffect(()=>{
    setBoards(loadBoards());

    const loadedNotes = loadNotes();
    if (loadedNotes.length){
      setNotes(loadedNotes);
    } else {
      const starter = defaultNote('Welcome to Notes', [
        '# Welcome!',
        '',
        'Start capturing ideas in the editor below.',
        '',
        '- Use the + tab to create more notes.',
        '- Rename a tab by changing the title field.',
        '- Everything saves automatically.'
      ].join('\n'));
      setNotes([starter]);
      setCurrentNoteId(starter.id);
    }

    setCanvases(loadCanvases());
  },[]);

  useEffect(()=>{ saveBoards(boards); },[boards]);
  useEffect(()=>{ saveNotes(notes); },[notes]);
  useEffect(()=>{ saveCanvases(canvases); },[canvases]);

  useEffect(()=>{
    const api = window?.tacky;
    if(!api) return undefined;

    applyUpdateStatus({ status:'checking', message:null, progress:null });

    const disposers = [];
    const addListener = (register, handler)=>{
      if (typeof register !== 'function') return;
      const dispose = register(handler);
      if (typeof dispose === 'function') disposers.push(dispose);
    };

    addListener(api.onUpdateAvailable, info=>{
      applyUpdateStatus({
        status:'available',
        version: info?.version ?? null,
        message:null,
        progress:null
      });
    });

    addListener(api.onUpdateProgress, progress=>{
      applyUpdateStatus({
        status:'downloading',
        progress:{
          percent: Math.round(progress?.percent ?? 0),
          bytesPerSecond: progress?.bytesPerSecond ?? 0
        },
        message:null
      });
    });

    addListener(api.onUpdateDownloaded, info=>{
      applyUpdateStatus({
        status:'downloaded',
        version: info?.version ?? null,
        progress:null
      });
    });

    addListener(api.onUpdateError, error=>{
      applyUpdateStatus({
        status:'error',
        message: error?.message ?? 'Something went wrong while fetching the update.',
        progress:null
      });
    });

    addListener(api.onUpdateNotAvailable, ()=>{
      applyUpdateStatus({ status:'idle', progress:null, message:null });
    });

    api.checkForUpdates?.().catch(err=>{
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

  const installUpdate = ()=>{
    window?.tacky?.installUpdate?.();
  };

  const retryCheck = ()=>{
    const api = window?.tacky;
    if(!api?.checkForUpdates) return;
    applyUpdateStatus({ status:'checking', message:null, progress:null });
    api.checkForUpdates().catch(err=>{
      applyUpdateStatus({ status:'error', message: err?.message ?? 'Unable to check for updates.' });
    });
  };

  const openBoard = (id)=> setRoute({ name:'board', id });
  const showBoards = ()=> setRoute({ name:'boards' });
  const showNotesDashboard = ()=> setRoute({ name:'notes-dashboard' });
  const showCanvasDashboard = ()=> setRoute({ name:'canvas-dashboard' });
  const showSettings = ()=> setRoute({ name:'settings' });
  const backHome = ()=> showBoards();

  const createBoard = (name, wallpaper)=>{
    const b = defaultBoard(name);
    if (wallpaper) b.wallpaper = wallpaper;
    setBoards(prev => [b, ...prev]);
    setRoute({ name:'board', id:b.id });
  };

  const updateBoard = (board)=> setBoards(prev => prev.map(b => b.id===board.id ? deepClone(board) : b));
  const renameBoard = (id, name)=> setBoards(prev => prev.map(b => b.id===id ? { ...b, name, updatedAt: Date.now() } : b));
  const deleteBoard = (id)=>{
    setBoards(prev => prev.filter(b => b.id!==id));
    showBoards();
  };

  const createNote = (title)=>{
    const note = defaultNote(title && title.trim().length ? title.trim() : 'Untitled note');
    setNotes(prev => [note, ...prev]);
    setCurrentNoteId(note.id);
    setRoute({ name:'notes' });
  };

  const updateNote = (nextNote)=>{
    if(!nextNote?.id) return;
    setNotes(prev => prev.map(n => n.id===nextNote.id ? { ...n, ...nextNote } : n));
  };

  const deleteNote = (id)=>{
    setNotes(prev => prev.filter(n => n.id!==id));
    if(currentNoteId===id) setCurrentNoteId(null);
  };

  const selectNote = (id)=>{
    setCurrentNoteId(id);
    setRoute({ name:'notes' });
  };

  const createCanvas = (name)=>{
    const canvas = defaultCanvas(name && name.trim().length ? name.trim() : 'Untitled canvas');
    setCanvases(prev => [canvas, ...prev]);
    setCurrentCanvasId(canvas.id);
    setRoute({ name:'canvas' });
  };

  const selectCanvas = (id)=>{
    setCurrentCanvasId(id);
    setRoute({ name:'canvas' });
  };

  const deleteCanvas = (id)=>{
    setCanvases(prev => prev.filter(c=>c.id!==id));
    if(currentCanvasId===id) setCurrentCanvasId(null);
  };

  const renameCanvas = (id, name)=>{
    setCanvases(prev => prev.map(canvas => canvas.id===id ? { ...canvas, name, updatedAt: Date.now() } : canvas));
  };

  const updateCanvasScene = (id, scene)=>{
    const safeScene = sanitizeCanvasScene(scene);
    setCanvases(prev => prev.map(canvas => canvas.id===id ? { ...canvas, scene: safeScene, updatedAt: Date.now() } : canvas));
  };

  const navigateQuick = useCallback((target)=>{
    switch(target){
      case 'overview':
        setRoute({ name:'overview' });
        break;
      case 'boards':
        showBoards();
        break;
      case 'notes-dashboard':
        showNotesDashboard();
        break;
      case 'canvas-dashboard':
        showCanvasDashboard();
        break;
      case 'settings':
        setRoute({ name:'settings' });
        break;
      case 'notes':
        setRoute({ name:'notes' });
        break;
      case 'canvas':
        setRoute({ name:'canvas' });
        break;
      default:
        break;
    }
  },[showBoards, showNotesDashboard, showCanvasDashboard]);

  useEffect(()=>{
    if(route.name==='notes' && !currentNoteId && notes.length){
      setCurrentNoteId(notes[0].id);
    }
  },[route, currentNoteId, notes]);

  useEffect(()=>{
    if(route.name==='canvas' && !currentCanvasId && canvases.length){
      setCurrentCanvasId(canvases[0].id);
    }
  },[route, currentCanvasId, canvases]);

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
    if(route.name === 'board'){
      return boards.find(b=>b.id===route.id)?.name ?? 'Board';
    }
    switch(route.name){
      case 'overview':
        return 'Overview';
      case 'boards':
        return 'Boards';
      case 'notes-dashboard':
        return 'Notes';
      case 'notes':
        return 'Notes workspace';
      case 'canvas-dashboard':
        return 'Canvas library';
      case 'canvas':
        return 'Canvas workspace';
      case 'settings':
        return 'Settings';
      default:
        return 'Workspace';
    }
  })();

  const sidebarLinks = [
    {
      key:'overview',
      label:'Overview',
      hint:'Home base',
      icon:'sparkle',
      isActive: activeCategory==='overview',
      onClick: ()=> setRoute({ name:'overview' })
    },
    {
      key:'boards',
      label:'Boards',
      hint:'Plan projects',
      icon:'boards',
      isActive: activeCategory==='boards',
      onClick: showBoards
    },
    {
      key:'notes',
      label:'Notes',
      hint:'Capture ideas',
      icon:'notes',
      isActive: activeCategory==='notes',
      onClick: showNotesDashboard
    },
    {
      key:'canvas',
      label:'Canvas',
      hint:'Sketch freely',
      icon:'canvas',
      isActive: activeCategory==='canvas',
      onClick: showCanvasDashboard
    },
    {
      key:'settings',
      label:'Settings',
      hint:'Themes & controls',
      icon:'palette',
      isActive: activeCategory==='settings',
      onClick: showSettings
    }
  ];

  const openQuickActions = useCallback(()=> setQuickActionsOpen(true),[]);
  const closeQuickActions = useCallback(()=> setQuickActionsOpen(false),[]);

  const handleNavSelect = useCallback((handler)=>{
    if (typeof handler === 'function'){
      handler();
    }
    closeQuickActions();
    if (typeof window !== 'undefined' && window.innerWidth < 1024){
      setSidebarOpen(false);
    }
  },[closeQuickActions]);

  const footerStatus = (()=> {
    switch(updateStatus.status){
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return updateStatus.version ? `v${updateStatus.version} ready` : 'Update available';
      case 'downloading':
        return `Downloading... ${percent}%`;
      case 'downloaded':
        return 'Ready to install';
      case 'error':
        return 'Update unavailable';
      default:
      return 'You are up to date';
    }
  })();

  const toggleSidebar = ()=> setSidebarOpen(prev => !prev);

  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1280){
      setSidebarOpen(false);
    }
  },[route?.name, route?.id]);

  useEffect(()=>{
    if (typeof document === 'undefined') return undefined;
    const cls = document.body.classList;
    if (isQuickActionsOpen){
      cls.add('quick-actions-open');
    } else {
      cls.remove('quick-actions-open');
    }
    return ()=> cls.remove('quick-actions-open');
  },[isQuickActionsOpen]);

  useEffect(()=>{
    if (typeof window === 'undefined') return undefined;
    const handler = (event)=>{
      const key = event.key?.toLowerCase?.() ?? '';
      const isModifier = event.metaKey || event.ctrlKey;
      const tag = (event.target?.tagName ?? '').toLowerCase();
      const isFormField = ['input','textarea','select'].includes(tag) || event.target?.isContentEditable;
      if (isModifier && key === 'k'){
        if (isFormField) return;
        event.preventDefault();
        setQuickActionsOpen(prev => !prev);
      }
      if (key === 'escape'){
        setQuickActionsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  },[]);

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
              <span className="nav-brand-subtitle">Creative control</span>
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
            <button
              type="button"
              onClick={openQuickActions}
              title="Quick actions"
              aria-label="Open quick actions"
            >
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
            <button
              type="button"
              className="nav-footer-btn"
              onClick={retryCheck}
            >
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
              title={isSidebarOpen ? 'Hide navigation' : 'Show navigation'}
            >
              <SvgIcon name="menu" />
            </button>
            <div className="header-titles">
              <span className="header-crumb">Workspace</span>
              <h1 className="header-title">{activeLabel}</h1>
            </div>
          </div>
          <div className="header-right">
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
              <button
                type="button"
                className="header-pill ghost quick-actions-trigger"
                onClick={openQuickActions}
              >
                <SvgIcon name="sparkle" className="icon-sm" />
                <span>Quick actions</span>
              </button>
              <button
                type="button"
                className="header-pill ghost"
                onClick={showSettings}
              >
                <SvgIcon name="palette" className="icon-sm" />
                <span>Settings</span>
              </button>
              {route.name==='board' && (
                <button type="button" className="header-pill" onClick={backHome}>
                  <SvgIcon name="arrowLeft" className="icon-sm" />
                  <span>Back to boards</span>
                </button>
              )}
              {updateStatus.status === 'available' && (
                <button
                  type="button"
                  className="header-pill accent"
                  onClick={startDownload}
                >
                  <SvgIcon name="download" className="icon-sm" />
                  <span>Download update</span>
                </button>
              )}
              {updateStatus.status === 'downloaded' && (
                <button
                  type="button"
                  className="header-pill accent"
                  onClick={installUpdate}
                >
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
                name={
                  updateStatus.status === 'error'
                    ? 'alert'
                    : updateStatus.status === 'downloading'
                      ? 'download'
                      : 'sparkle'
                }
                className="banner-icon"
              />
            </div>
            <div className="system-banner-copy">
              {updateStatus.status === 'available' && (
                <>
                  <p className="banner-title">
                    Update{updateStatus.version ? ` ${updateStatus.version}` : ''} is ready.
                  </p>
                  <p className="banner-subtitle">
                    Grab the latest improvements when it suits you.
                  </p>
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
                  <p className="banner-title">
                    Update{updateStatus.version ? ` ${updateStatus.version}` : ''} ready to install.
                  </p>
                  <p className="banner-subtitle">Restart to finish updating.</p>
                </>
              )}
              {updateStatus.status === 'error' && (
                <>
                  <p className="banner-title">Update failed.</p>
                  <p className="banner-subtitle">
                    {updateStatus.message ?? 'Something went wrong while downloading the update.'}
                  </p>
                </>
              )}
            </div>
            <div className="system-banner-actions">
              {updateStatus.status === 'available' && (
                <button type="button" className="header-pill ghost" onClick={startDownload}>
                  <span>Download</span>
                </button>
              )}
              {updateStatus.status === 'downloaded' && (
                <button type="button" className="header-pill accent" onClick={installUpdate}>
                  <span>Restart and install</span>
                </button>
              )}
              {updateStatus.status === 'error' && (
                <button type="button" className="header-pill ghost" onClick={retryCheck}>
                  <span>Retry</span>
                </button>
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
                onDelete={deleteBoard}
              />
            )}
            {route.name==='board' && (
              <Board
                board={boards.find(b=>b.id===route.id)}
                onUpdate={updateBoard}
                onDelete={deleteBoard}
              />
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
              />
            )}
            {route.name==='settings' && (
              <Settings
                themes={THEMES}
                selectedTheme={preferences.theme}
                onSelectTheme={(id)=>setPreferences(prev=>({ ...prev, theme:id }))}
                reducedMotion={preferences.reducedMotion}
                focusMode={preferences.focusMode}
                onToggleReducedMotion={()=>setPreferences(prev=>({ ...prev, reducedMotion:!prev.reducedMotion }))}
                onToggleFocusMode={()=>setPreferences(prev=>({ ...prev, focusMode:!prev.focusMode }))}
                renderIcon={(name, className)=> <SvgIcon name={name} className={className} />}
              />
            )}
          </main>
        </div>
      </div>
      <QuickActionsSheet
        isOpen={isQuickActionsOpen}
        onClose={closeQuickActions}
        onCreateBoard={()=>createBoard('New board')}
        onCreateNote={()=>createNote('New note')}
        onCreateCanvas={()=>createCanvas('New canvas')}
        onNavigate={navigateQuick}
      />
    </div>
  );
}








