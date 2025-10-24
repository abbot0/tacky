import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { sanitizeCanvasScene } from '../lib.js';

export default function CanvasWorkspace({
  canvases,
  selectedCanvasId,
  onUpdateCanvas,
}){
  const excalidrawAPI = useRef(null);
  const lastSceneRef = useRef(null);
  const syncingRef = useRef(false);
  const [editorReady, setEditorReady] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const selectedCanvas = useMemo(()=>{
    const found = (Array.isArray(canvases) ? canvases : []).find(c=>c.id===selectedCanvasId) ?? null;
    if(!found) return null;
    const scene = sanitizeCanvasScene(found.scene);
    return { ...found, scene };
  },[canvases, selectedCanvasId]);

  const syncSceneToEditor = useCallback((scene)=>{
    if(!scene || !excalidrawAPI.current) return;
    const sanitized = sanitizeCanvasScene(scene);
    const serialized = JSON.stringify(sanitized);
    if(lastSceneRef.current === serialized) return;
    lastSceneRef.current = serialized;
    syncingRef.current = true;
    setIsZenMode(Boolean(sanitized.appState?.zenModeEnabled));

    const filesRecord = sanitized.files && typeof sanitized.files === 'object'
      ? sanitized.files
      : {};

    if (excalidrawAPI.current.addFiles && filesRecord && Object.keys(filesRecord).length){
      const binaryFiles = Object.values(filesRecord).filter(Boolean);
      if (binaryFiles.length){
        excalidrawAPI.current.addFiles(binaryFiles);
      }
    }

    excalidrawAPI.current.updateScene({
      elements: sanitized.elements,
      appState: sanitized.appState
    });
  },[]);

  useEffect(()=>{
    if(!selectedCanvas || !excalidrawAPI.current || !editorReady) return;
    syncSceneToEditor(selectedCanvas.scene);
  },[selectedCanvas?.id, selectedCanvas?.scene, syncSceneToEditor, editorReady]);

  const handleSceneChange = (elements, appState, files)=>{
    if(!selectedCanvas) return;
    const mergedFiles = new Map();
    const existingFiles = selectedCanvas.scene?.files;
    if (existingFiles && typeof existingFiles === 'object'){
      Object.entries(existingFiles).forEach(([key, value])=>{
        if (value) mergedFiles.set(key, value);
      });
    }
    if (files){
      if (files instanceof Map){
        files.forEach((value, key)=>{
          if (value) mergedFiles.set(key, value);
        });
      } else if (typeof files === 'object'){
        Object.entries(files).forEach(([key, value])=>{
          if (value) mergedFiles.set(key, value);
        });
      }
    }

    const sanitized = sanitizeCanvasScene({
      elements,
      appState,
      files: mergedFiles.size ? mergedFiles : files
    });
    setIsZenMode(Boolean(sanitized.appState?.zenModeEnabled));

    const serialized = JSON.stringify(sanitized);
    if(syncingRef.current){
      syncingRef.current = false;
      if(lastSceneRef.current === serialized) return;
    }
    if(lastSceneRef.current === serialized) return;
    lastSceneRef.current = serialized;
    onUpdateCanvas?.(selectedCanvas.id, sanitized);
  };

  useEffect(()=>{
    if (typeof document === 'undefined' || typeof Element === 'undefined') return undefined;
    const proto = Element.prototype;
    const original = proto.requestFullscreen;
    if (typeof original !== 'function') return undefined;
    const patched = function patchedFullscreen(...args){
      try{
        const el = this;
        const classList = el?.classList;
        const shouldBypass =
          classList?.contains?.('excalidraw') ||
          el?.closest?.('.canvas-editor') ||
          el?.closest?.('.canvas-standalone');
        if (shouldBypass){
          return Promise.resolve();
        }
      }catch(_){}
      return original.apply(this, args);
    };
    proto.requestFullscreen = patched;
    return ()=>{ proto.requestFullscreen = original; };
  },[]);

  return (
    <div className={`canvas-standalone${isZenMode ? ' canvas-zen' : ''}`}>
      <section className="workspace-content">
        {selectedCanvas && (
          <div className="canvas-editor">
            <Excalidraw
              excalidrawAPI={api=>{ excalidrawAPI.current = api; }}
              initialData={sanitizeCanvasScene(selectedCanvas.scene)}
              onChange={handleSceneChange}
              onReady={()=>{
                setEditorReady(true);
                if(selectedCanvas){
                  syncSceneToEditor(selectedCanvas.scene);
                }
              }}
            />
          </div>
        )}
        {!selectedCanvas && (
          <div className="canvas-empty">
            Select a canvas from the dashboard to start drawing.
          </div>
        )}
      </section>
    </div>
  );
}
