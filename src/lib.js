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
const STORAGE_KEY='tacky.boards.v1';
const NOTES_STORAGE_KEY='tacky.notes.v1';
const CANVAS_STORAGE_KEY='tacky.canvas.v1';

function sanitizeBoard(b){
  const safe={ id:b?.id??`b_${Math.random().toString(36).slice(2,9)}`,
    name:b?.name??'Untitled',
    wallpaper:b?.wallpaper??WALLPAPERS[0],
    createdAt: typeof b?.createdAt==='number'? b.createdAt : Date.now(),
    lists: Array.isArray(b?.lists)? b.lists : [] };
  safe.lists = safe.lists.map(l=>({ id:l?.id??`l_${Math.random().toString(36).slice(2,9)}`,
    title:l?.title??'List', cards: Array.isArray(l?.cards)? l.cards : [] }));
  return safe;
}
export function loadBoards(){ try{ const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return []; const data=JSON.parse(raw); if(!Array.isArray(data)) return []; return data.map(sanitizeBoard);} catch{ return []; } }
export function saveBoards(boards){ const safe = Array.isArray(boards)? boards.map(sanitizeBoard) : []; localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); }
export function uid(prefix='id'){ return prefix+'_'+Math.random().toString(36).slice(2,9); }
export function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

function sanitizeNote(n){
  const safe={
    id:n?.id ?? uid('n'),
    title: typeof n?.title === 'string' && n.title.trim().length ? n.title.trim() : 'Untitled note',
    content: typeof n?.content === 'string' ? n.content : '',
    parentId: typeof n?.parentId === 'string' ? n.parentId : null,
    tags: Array.isArray(n?.tags) ? n.tags.filter(t=>typeof t === 'string' && t.trim().length).map(t=>t.trim()) : [],
    createdAt: typeof n?.createdAt === 'number' ? n.createdAt : Date.now(),
    updatedAt: typeof n?.updatedAt === 'number' ? n.updatedAt : Date.now(),
    isDaily: Boolean(n?.isDaily)
  };
  return safe;
}

export function loadNotes(){
  try{
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if(!raw) return [];
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return [];
    return data.map(sanitizeNote);
  } catch {
    return [];
  }
}

export function saveNotes(notes){
  const safe = Array.isArray(notes) ? notes.map(sanitizeNote) : [];
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(safe));
}

export function defaultNote(title='Untitled note', content=''){
  return sanitizeNote({ id: uid('n'), title, content, createdAt: Date.now(), updatedAt: Date.now(), parentId:null, tags: [] });
}

export function sanitizeCanvasScene(scene){
  const elements = Array.isArray(scene?.elements)
    ? scene.elements.map(el => (typeof el === 'object' && el !== null ? { ...el } : el))
    : [];

  const appState = typeof scene?.appState === 'object' && scene?.appState !== null
    ? { ...scene.appState }
    : {};

  let files = {};
  if (scene?.files instanceof Map){
    files = Object.fromEntries(Array.from(scene.files.entries(), ([key, value]) => [
      key,
      typeof value === 'object' && value !== null ? { ...value } : value
    ]));
  } else if (typeof scene?.files === 'object' && scene?.files !== null){
    files = Object.fromEntries(
      Object.entries(scene.files).map(([key, value]) => [
        key,
        typeof value === 'object' && value !== null ? { ...value } : value
      ])
    );
  }

  if(appState && typeof appState === 'object'){
    delete appState.collaborators;
  }

  return {
    elements,
    appState,
    files
  };
}

function sanitizeCanvas(c){
  const safe = {
    id: c?.id ?? uid('c'),
    name: typeof c?.name === 'string' && c.name.trim().length ? c.name.trim() : 'Untitled canvas',
    scene: sanitizeCanvasScene(c?.scene),
    createdAt: typeof c?.createdAt === 'number' ? c.createdAt : Date.now(),
    updatedAt: typeof c?.updatedAt === 'number' ? c.updatedAt : Date.now()
  };
  return safe;
}

export function loadCanvases(){
  try{
    const raw = localStorage.getItem(CANVAS_STORAGE_KEY);
    if(!raw) return [];
    const data = JSON.parse(raw);
    if(!Array.isArray(data)) return [];
    return data.map(sanitizeCanvas);
  } catch {
    return [];
  }
}

export function saveCanvases(canvases){
  const safe = Array.isArray(canvases) ? canvases.map(sanitizeCanvas) : [];
  localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(safe));
}

export function defaultCanvas(name='Untitled canvas'){
  return sanitizeCanvas({
    id: uid('c'),
    name,
    scene: sanitizeCanvasScene({ elements: [], appState: {}, files:{} }),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
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
export function defaultBoard(name='New Board'){ return { id:uid('b'), name, createdAt:Date.now(), wallpaper:WALLPAPERS[0], lists:[] }; }
