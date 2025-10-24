import React, { useEffect, useMemo, useState } from 'react';
import { buildNoteIndex } from '../lib.js';

const WIDTH = 960;
const HEIGHT = 640;

export default function GraphWorkspace({ notes, selectedNoteId, onSelectNode, onOpenNote }){
  const [focusedId, setFocusedId] = useState(selectedNoteId ?? null);
  const { nodes, edges, index } = useMemo(()=>createGraph(notes),[notes]);

  useEffect(()=>{
    if(!nodes.length){
      setFocusedId(null);
      return;
    }
    if(selectedNoteId && nodes.some(n=>n.id===selectedNoteId)){
      setFocusedId(selectedNoteId);
      return;
    }
    if(!focusedId || !nodes.some(n=>n.id===focusedId)){
      setFocusedId(nodes[0].id);
    }
  },[selectedNoteId, nodes, focusedId]);

  const selected = focusedId ? nodes.find(n=>n.id===focusedId) ?? null : null;
  const backlinks = selected ? index.backlinks[selected.id] ?? { incoming: [], outgoing: [] } : { incoming: [], outgoing: [] };

  const handleSelect = (id)=>{
    setFocusedId(id);
    onSelectNode?.(id);
  };

  return (
    <div className="workspace-shell graph-workspace">
      <section className="workspace-content graph-content">
        <svg className="graph-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" />
            </marker>
          </defs>
          {edges.map((edge)=>(
            <line
              key={`${edge.source.id}-${edge.target.id}-${edge.index}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              className={`graph-edge ${focusedId===edge.source.id || focusedId===edge.target.id ? 'is-active' : ''}`}
              markerEnd="url(#arrowhead)"
            />
          ))}
          {nodes.map(node=>(
            <g
              key={node.id}
              className={`graph-node ${focusedId===node.id ? 'is-active' : ''}`}
              onClick={()=>handleSelect(node.id)}
            >
              <circle cx={node.x} cy={node.y} r={node.radius} />
              <text x={node.x} y={node.y} className="graph-node-label">{node.title}</text>
            </g>
          ))}
        </svg>
      </section>
      <aside className="graph-sidebar">
        {selected ? (
          <>
            <div className="graph-sidebar-title">{selected.title}</div>
            <div className="graph-sidebar-section">
              <div className="graph-sidebar-heading">Outgoing links</div>
              {backlinks.outgoing?.length
                ? backlinks.outgoing.map(name=>(
                  <div key={name} className="graph-pill">{name}</div>
                ))
                : <div className="graph-placeholder">No outgoing links.</div>}
            </div>
            <div className="graph-sidebar-section">
              <div className="graph-sidebar-heading">Backlinks</div>
              {backlinks.incoming?.length
                ? backlinks.incoming.map(name=>(
                  <div key={name} className="graph-pill">{name}</div>
                ))
                : <div className="graph-placeholder">No backlinks yet.</div>}
            </div>
            <button className="button ghost" onClick={()=>onOpenNote?.(selected.id)}>Open note</button>
          </>
        ) : (
          <div className="graph-placeholder">Add some notes with [[links]] to see the graph.</div>
        )}
      </aside>
    </div>
  );
}

function createGraph(notes){
  const safe = Array.isArray(notes) ? notes : [];
  const index = buildNoteIndex(safe);
  const nodes = safe.map((note, idx)=>{
    const angle = (2 * Math.PI * idx) / Math.max(safe.length, 1);
    const radius = Math.min(WIDTH, HEIGHT) / 3;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    return {
      id: note.id,
      title: note.title,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      radius: 32 + Math.min((note.content?.length ?? 0) / 600, 30)
    };
  });

  const nameToNode = new Map(nodes.map(n=>[n.title.toLowerCase(), n]));
  const edges = [];

  safe.forEach((note, idx)=>{
    const from = nodes[idx];
    const backlinks = index.backlinks[note.id];
    const outgoing = backlinks?.outgoing ?? [];

    outgoing.forEach((title, edgeIdx)=>{
      const target = nameToNode.get(title.toLowerCase());
      if(!target) return;
      edges.push({
        source: from,
        target,
        index: edgeIdx
      });
    });
  });

  return { nodes, edges, index };
}
