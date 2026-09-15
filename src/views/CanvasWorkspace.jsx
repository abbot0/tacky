import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeCanvasScene, pickCanvasAppState } from '../lib.js';

// Excalidraw is ~1.5 MB of JS. Loading it on demand keeps app startup fast for
// people who mostly use boards and notes.
const excalidrawModule = () => import(/* webpackChunkName: "excalidraw" */ '@excalidraw/excalidraw').then(mod => {
  // The CSS import is side-effect only; bundle it with the chunk.
  return import('@excalidraw/excalidraw/index.css').then(() => mod);
});
const Excalidraw = lazy(() => excalidrawModule().then(mod => ({ default: mod.Excalidraw })));

let getSceneVersionFn = null;
excalidrawModule().then(mod => { getSceneVersionFn = mod.getSceneVersion; }).catch(() => {});

// Cheap fingerprint of what we persist. Element edits bump Excalidraw's scene
// version; the whitelisted appState keys are small enough to stringify.
function sceneSignature(elements, appState, fileCount){
  const version = getSceneVersionFn
    ? getSceneVersionFn(elements)
    : elements.reduce((sum, el) => sum + (el.version ?? 0), 0);
  return `${version}|${elements.length}|${fileCount}|${JSON.stringify(pickCanvasAppState(appState))}`;
}

const DARK_THEMES = new Set(['midnight', 'graphite', 'noir']);

export default function CanvasWorkspace({
  canvases,
  selectedCanvasId,
  onUpdateCanvas,
  onRenameCanvas,
  onShowDashboard,
  theme
}){
  const excalidrawAPI = useRef(null);
  const lastSignatureRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const selectedCanvas = useMemo(()=>{
    return (Array.isArray(canvases) ? canvases : []).find(c=>c.id===selectedCanvasId) ?? null;
  },[canvases, selectedCanvasId]);

  const initialData = useMemo(()=>{
    if (!selectedCanvas) return null;
    const scene = sanitizeCanvasScene(selectedCanvas.scene);
    return {
      elements: scene.elements,
      appState: { ...scene.appState, collaborators: new Map() },
      files: scene.files,
      scrollToContent: scene.appState.scrollX === undefined
    };
  // Only rebuild when switching canvases; live edits flow through onChange.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedCanvas?.id]);

  const flushPending = useCallback(()=>{
    if (saveTimerRef.current){ clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    onUpdateCanvas?.(pending.id, pending.scene);
  },[onUpdateCanvas]);

  useEffect(()=>{
    lastSignatureRef.current = null;
    setIsZenMode(Boolean(selectedCanvas?.scene?.appState?.zenModeEnabled));
    return ()=> flushPending();
  },[selectedCanvas?.id, flushPending]);

  const handleSceneChange = useCallback((elements, appState, files)=>{
    if(!selectedCanvas) return;
    setIsZenMode(prev => (prev === Boolean(appState?.zenModeEnabled) ? prev : Boolean(appState?.zenModeEnabled)));

    const fileCount = files ? (files instanceof Map ? files.size : Object.keys(files).length) : 0;
    const signature = sceneSignature(elements, appState, fileCount);
    if (lastSignatureRef.current === null){
      // First change after mount is Excalidraw echoing initialData; record it, don't save.
      lastSignatureRef.current = signature;
      return;
    }
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    pendingRef.current = {
      id: selectedCanvas.id,
      scene: { elements, appState, files }
    };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(()=>{ saveTimerRef.current = null; flushPending(); }, 400);
  },[selectedCanvas, flushPending]);

  // Excalidraw asks for browser fullscreen when toggling zen mode; inside the
  // app frame that fights with the window, so swallow those requests.
  useEffect(()=>{
    const proto = Element.prototype;
    const original = proto.requestFullscreen;
    if (typeof original !== 'function') return undefined;
    proto.requestFullscreen = function patchedFullscreen(...args){
      if (this?.closest?.('.canvas-editor')) return Promise.resolve();
      return original.apply(this, args);
    };
    return ()=>{ proto.requestFullscreen = original; };
  },[]);

  const commitRename = ()=>{
    const next = draftName.trim();
    if (next && selectedCanvas && next !== selectedCanvas.name) onRenameCanvas?.(selectedCanvas.id, next);
    setRenaming(false);
  };

  return (
    <div className={`canvas-standalone${isZenMode ? ' canvas-zen' : ''}`}>
      {selectedCanvas && (
        <div className="canvas-topbar">
          <button type="button" className="view-toggle-btn" onClick={onShowDashboard}>Library</button>
          {renaming ? (
            <input
              className="canvas-title-input"
              autoFocus
              value={draftName}
              onChange={e=>setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e=>{
                if (e.key === 'Enter'){ e.preventDefault(); commitRename(); }
                if (e.key === 'Escape'){ e.preventDefault(); setRenaming(false); }
              }}
            />
          ) : (
            <h3 className="canvas-title" onDoubleClick={()=>{ setDraftName(selectedCanvas.name); setRenaming(true); }} title="Double-click to rename">
              {selectedCanvas.name}
            </h3>
          )}
          <span className="canvas-topbar-meta">{selectedCanvas.scene?.elements?.length ?? 0} elements · saved {new Date(selectedCanvas.updatedAt).toLocaleTimeString()}</span>
        </div>
      )}
      <section className="workspace-content">
        {selectedCanvas && initialData && (
          <div className="canvas-editor">
            <Suspense fallback={<div className="canvas-loading"><span className="app-loading-spinner" /> Loading canvas…</div>}>
              <Excalidraw
                key={selectedCanvas.id}
                excalidrawAPI={api=>{ excalidrawAPI.current = api; }}
                initialData={initialData}
                onChange={handleSceneChange}
                theme={DARK_THEMES.has(theme) ? 'dark' : 'light'}
                UIOptions={{ canvasActions: { toggleTheme: false } }}
              />
            </Suspense>
          </div>
        )}
        {!selectedCanvas && (
          <div className="canvas-empty">
            <p>Select a canvas from the library to start drawing.</p>
            <button type="button" className="button accent-button" onClick={onShowDashboard}>Open library</button>
          </div>
        )}
      </section>
    </div>
  );
}
