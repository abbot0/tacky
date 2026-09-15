import { readKey, writeKey, flushWrites } from './storage.js';

export const LABELS=['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#38d9a9','#4dabf7','#9775fa','#f783ac'];
export const WALLPAPERS=[
  'linear-gradient(135deg,#1d2b64,#f8cdda)',
  'linear-gradient(135deg,#141e30,#243b55)',
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)',
  'linear-gradient(135deg,#2b5876,#4e4376)',
  'linear-gradient(135deg,#bdc3c7,#2c3e50)',
  'linear-gradient(135deg,#16222A,#3A6073)',
  'linear-gradient(135deg,#20002c,#cbb4d4)'
];
export const PRIORITIES = [
  { id:'none', label:'None' },
  { id:'low', label:'Low' },
  { id:'medium', label:'Medium' },
  { id:'high', label:'High' },
  { id:'urgent', label:'Urgent' }
];
const PRIORITY_IDS = new Set(PRIORITIES.map(p=>p.id));

// Storage keys. The `tacky.*.v1` names are the legacy localStorage keys; the new
// file store uses short names and migrates the old values on first launch.
export const STORE_KEYS = {
  boards: { key:'boards', legacy:['tacky.boards.v1'] },
  notes: { key:'notes', legacy:['tacky.notes.v1'] },
  canvases: { key:'canvases', legacy:['tacky.canvas.v1'] }
};

export function uid(prefix='id'){ return prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3); }
export function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

const num = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const str = (value, fallback='') => (typeof value === 'string' ? value : fallback);

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------
export function sanitizeChecklistItem(item){
  return {
    id: str(item?.id) || uid('ck'),
    text: str(item?.text),
    done: Boolean(item?.done)
  };
}

export function sanitizeCard(card){
  const now = Date.now();
  return {
    id: str(card?.id) || uid('c'),
    title: str(card?.title, 'Untitled card'),
    description: str(card?.description),
    due: str(card?.due),
    labels: Array.isArray(card?.labels) ? card.labels.filter(l=>typeof l === 'string') : [],
    priority: PRIORITY_IDS.has(card?.priority) ? card.priority : 'none',
    checklist: Array.isArray(card?.checklist) ? card.checklist.map(sanitizeChecklistItem) : [],
    createdAt: num(card?.createdAt, now),
    updatedAt: num(card?.updatedAt, now)
  };
}

export function sanitizeList(list){
  return {
    id: str(list?.id) || uid('l'),
    title: str(list?.title, 'List'),
    collapsed: Boolean(list?.collapsed),
    cards: Array.isArray(list?.cards) ? list.cards.map(sanitizeCard) : []
  };
}

export function sanitizeBoard(b){
  const now = Date.now();
  return {
    id: str(b?.id) || uid('b'),
    name: str(b?.name, 'Untitled'),
    wallpaper: str(b?.wallpaper) || WALLPAPERS[0],
    createdAt: num(b?.createdAt, now),
    updatedAt: num(b?.updatedAt, num(b?.createdAt, now)),
    lists: Array.isArray(b?.lists) ? b.lists.map(sanitizeList) : []
  };
}

export function defaultBoard(name='New Board'){
  return sanitizeBoard({ id:uid('b'), name, createdAt:Date.now(), updatedAt:Date.now(), wallpaper:WALLPAPERS[0], lists:[] });
}

export function defaultCard(title='New card'){
  return sanitizeCard({ id: uid('c'), title });
}

export function boardLabelColors(board){
  const set = new Set();
  const lists = Array.isArray(board?.lists)? board.lists : [];
  lists.forEach(list=>{
    const cards = Array.isArray(list?.cards)? list.cards : [];
    cards.forEach(c => (Array.isArray(c?.labels)? c.labels : []).forEach(l=>set.add(l)));
  });
  return Array.from(set);
}

export function boardCardCount(board){
  return (board?.lists ?? []).reduce((sum, list)=> sum + (list?.cards?.length ?? 0), 0);
}

export function checklistProgress(card){
  const items = Array.isArray(card?.checklist) ? card.checklist : [];
  const done = items.filter(i=>i.done).length;
  return { total: items.length, done, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Classify a YYYY-MM-DD due date relative to today. */
export function dueStatus(due){
  if (!due) return null;
  const date = new Date(`${due}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays < 0) return { tone:'overdue', label:`Overdue ${-diffDays}d`, diffDays };
  if (diffDays === 0) return { tone:'today', label:'Due today', diffDays };
  if (diffDays === 1) return { tone:'soon', label:'Due tomorrow', diffDays };
  if (diffDays <= 7) return { tone:'soon', label:`Due in ${diffDays}d`, diffDays };
  return { tone:'later', label: date.toLocaleDateString(undefined, { month:'short', day:'numeric' }), diffDays };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export function sanitizeNote(n){
  const now = Date.now();
  return {
    id: str(n?.id) || uid('n'),
    title: str(n?.title).trim() || 'Untitled note',
    content: str(n?.content),
    parentId: typeof n?.parentId === 'string' ? n.parentId : null,
    tags: Array.isArray(n?.tags)
      ? Array.from(new Set(n.tags.filter(t=>typeof t === 'string').map(t=>t.trim().toLowerCase()).filter(Boolean)))
      : [],
    pinned: Boolean(n?.pinned),
    createdAt: num(n?.createdAt, now),
    updatedAt: num(n?.updatedAt, now),
    isDaily: Boolean(n?.isDaily)
  };
}

export function defaultNote(title='Untitled note', content=''){
  return sanitizeNote({ id: uid('n'), title, content, createdAt: Date.now(), updatedAt: Date.now(), parentId:null, tags: [] });
}

// ---------------------------------------------------------------------------
// Canvases
// ---------------------------------------------------------------------------
// Only the parts of Excalidraw's appState worth persisting. The full object is
// huge, changes on every pointer move, and contains runtime-only fields
// (collaborators, cursor, open menus) that must not be restored.
const CANVAS_APPSTATE_KEYS = [
  'viewBackgroundColor','zenModeEnabled','gridSize','gridModeEnabled','theme',
  'scrollX','scrollY','zoom','currentItemStrokeColor','currentItemBackgroundColor',
  'currentItemFillStyle','currentItemStrokeWidth','currentItemStrokeStyle',
  'currentItemRoughness','currentItemOpacity','currentItemFontFamily','currentItemFontSize',
  'currentItemTextAlign','currentItemStartArrowhead','currentItemEndArrowhead','currentItemRoundness'
];

export function pickCanvasAppState(appState){
  const out = {};
  if (!appState || typeof appState !== 'object') return out;
  for (const key of CANVAS_APPSTATE_KEYS){
    if (appState[key] !== undefined) out[key] = appState[key];
  }
  return out;
}

export function sanitizeCanvasScene(scene){
  const elements = Array.isArray(scene?.elements)
    ? scene.elements.filter(el => el && typeof el === 'object' && !el.isDeleted)
    : [];

  const appState = pickCanvasAppState(scene?.appState);

  let files = {};
  const rawFiles = scene?.files;
  if (rawFiles instanceof Map){
    rawFiles.forEach((value, key) => { if (value) files[key] = value; });
  } else if (rawFiles && typeof rawFiles === 'object'){
    for (const [key, value] of Object.entries(rawFiles)){
      if (value) files[key] = value;
    }
  }

  // Drop files no element references anymore so deleted images don't bloat storage.
  const referenced = new Set(elements.map(el => el.fileId).filter(Boolean));
  if (referenced.size !== Object.keys(files).length){
    files = Object.fromEntries(Object.entries(files).filter(([id]) => referenced.has(id)));
  }

  return { elements, appState, files };
}

export function sanitizeCanvas(c){
  const now = Date.now();
  return {
    id: str(c?.id) || uid('c'),
    name: str(c?.name).trim() || 'Untitled canvas',
    scene: sanitizeCanvasScene(c?.scene),
    createdAt: num(c?.createdAt, now),
    updatedAt: num(c?.updatedAt, now)
  };
}

export function defaultCanvas(name='Untitled canvas'){
  return sanitizeCanvas({
    id: uid('c'),
    name,
    scene: { elements: [], appState: {}, files:{} },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------
const asArray = (value) => (Array.isArray(value) ? value : []);

export async function loadWorkspace(){
  const [boards, notes, canvases] = await Promise.all([
    readKey(STORE_KEYS.boards.key, STORE_KEYS.boards.legacy),
    readKey(STORE_KEYS.notes.key, STORE_KEYS.notes.legacy),
    readKey(STORE_KEYS.canvases.key, STORE_KEYS.canvases.legacy)
  ]);
  return {
    boards: asArray(boards).map(sanitizeBoard),
    notes: asArray(notes).map(sanitizeNote),
    canvases: asArray(canvases).map(sanitizeCanvas)
  };
}

export function saveBoards(boards){ writeKey(STORE_KEYS.boards.key, asArray(boards)); }
export function saveNotes(notes){ writeKey(STORE_KEYS.notes.key, asArray(notes)); }
export function saveCanvases(canvases){ writeKey(STORE_KEYS.canvases.key, asArray(canvases), { delay: 600 }); }
export { flushWrites };

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------
export const BACKUP_FORMAT = 'tacky-backup';

export function buildBackup({ boards, notes, canvases, preferences }){
  return {
    format: BACKUP_FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    boards: asArray(boards).map(sanitizeBoard),
    notes: asArray(notes).map(sanitizeNote),
    canvases: asArray(canvases).map(sanitizeCanvas),
    preferences: preferences && typeof preferences === 'object' ? preferences : undefined
  };
}

export function parseBackup(raw){
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') throw new Error('Not a Tacky backup file.');
  if (data.format !== BACKUP_FORMAT) throw new Error('Unrecognised backup format.');
  return {
    boards: asArray(data.boards).map(sanitizeBoard),
    notes: asArray(data.notes).map(sanitizeNote),
    canvases: asArray(data.canvases).map(sanitizeCanvas),
    preferences: data.preferences && typeof data.preferences === 'object' ? data.preferences : null
  };
}

/** Merge a backup into existing data, keeping whichever copy of an id is newer. */
export function mergeById(existing, incoming){
  const map = new Map(asArray(existing).map(item => [item.id, item]));
  for (const item of asArray(incoming)){
    const current = map.get(item.id);
    if (!current || (item.updatedAt ?? 0) >= (current.updatedAt ?? 0)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
/**
 * Lightweight subsequence fuzzy match. Returns a score (higher is better) or 0.
 * Consecutive matches and matches at word starts score more.
 */
export function fuzzyScore(query, text){
  if (!query) return 1;
  if (!text) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return 100 - Math.min(direct, 40) + (direct === 0 || /\s/.test(t[direct-1]) ? 20 : 0);
  let score = 0, ti = 0, streak = 0;
  for (let qi = 0; qi < q.length; qi += 1){
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return 0;
    streak = idx === ti ? streak + 1 : 0;
    score += 1 + streak * 2 + (idx === 0 || /\s/.test(t[idx-1]) ? 3 : 0);
    ti = idx + 1;
  }
  return score;
}

export function buildSearchIndex({ boards, notes, canvases }){
  const items = [];
  for (const board of asArray(boards)){
    items.push({ type:'board', id:board.id, title:board.name, subtitle:`${boardCardCount(board)} cards`, updatedAt:board.updatedAt });
    for (const list of board.lists ?? []){
      for (const card of list.cards ?? []){
        items.push({
          type:'card', id:card.id, boardId:board.id, listId:list.id,
          title:card.title, subtitle:`${board.name} · ${list.title}`,
          body: card.description, updatedAt:card.updatedAt
        });
      }
    }
  }
  for (const note of asArray(notes)){
    items.push({ type:'note', id:note.id, title:note.title, subtitle: note.tags?.length ? note.tags.map(t=>`#${t}`).join(' ') : 'Note', body: note.content, updatedAt: note.updatedAt });
  }
  for (const canvas of asArray(canvases)){
    items.push({ type:'canvas', id:canvas.id, title:canvas.name, subtitle:`${canvas.scene?.elements?.length ?? 0} elements`, updatedAt: canvas.updatedAt });
  }
  return items;
}

export function searchIndex(index, query, limit=12){
  const q = query.trim();
  if (!q){
    return index.slice().sort((a,b)=>(b.updatedAt ?? 0)-(a.updatedAt ?? 0)).slice(0, limit);
  }
  const scored = [];
  for (const item of index){
    let score = fuzzyScore(q, item.title) * 3;
    if (!score && item.body){
      const idx = item.body.toLowerCase().indexOf(q.toLowerCase());
      if (idx !== -1) score = 30;
    }
    if (!score && item.subtitle) score = fuzzyScore(q, item.subtitle);
    if (score) scored.push({ item, score });
  }
  scored.sort((a,b)=> b.score - a.score || (b.item.updatedAt ?? 0) - (a.item.updatedAt ?? 0));
  return scored.slice(0, limit).map(s=>s.item);
}

export function formatBytes(bytes){
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(2)} MB`;
}
