// Persistence adapter.
//
// Inside Electron every key is written to its own JSON file in userData via the
// preload bridge (no size cap, atomic writes). In a plain browser (dev previews,
// tests) it falls back to localStorage so the app still works.
//
// Writes are debounced per key and skipped entirely when the serialised payload
// has not changed, so a burst of edits costs one JSON.stringify + one disk write
// rather than one per keystroke.

const bridge = () => (typeof window !== 'undefined' ? window.tacky : null);
const hasFileStore = () => Boolean(bridge()?.storage);

const pending = new Map(); // key -> { timer, serialized }
const lastWritten = new Map(); // key -> serialized

// Browser fallback keys are namespaced so they sit next to the legacy ones.
const localKey = (key) => (key.startsWith('tacky.') ? key : 'tacky.' + key);
function localGet(key){
  try { return window.localStorage.getItem(localKey(key)); } catch { return null; }
}
function localSet(key, value){
  try { window.localStorage.setItem(localKey(key), value); } catch {}
}
function localRemove(key){
  try { window.localStorage.removeItem(localKey(key)); } catch {}
}

function parse(raw){
  if (typeof raw !== 'string' || !raw.length) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Read a key. `legacyKeys` lists localStorage keys from older versions; if the
 * file store is empty but a legacy value exists it is migrated transparently.
 */
export async function readKey(key, legacyKeys = []){
  if (hasFileStore()){
    try {
      const raw = await bridge().storage.read(key);
      if (typeof raw === 'string' && raw.length){
        lastWritten.set(key, raw);
        return parse(raw);
      }
    } catch (err) {
      console.warn(`[storage] read failed for ${key}`, err);
    }
    for (const legacy of legacyKeys){
      const raw = localGet(legacy);
      if (raw){
        const value = parse(raw);
        if (value !== null){
          await commitWrite(key, raw);
          localRemove(legacy);
          return value;
        }
      }
    }
    return null;
  }
  const raw = localGet(key) ?? legacyKeys.map(localGet).find(Boolean) ?? null;
  if (raw) lastWritten.set(key, raw);
  return parse(raw);
}

async function commitWrite(key, serialized){
  if (lastWritten.get(key) === serialized) return;
  lastWritten.set(key, serialized);
  if (hasFileStore()){
    try {
      await bridge().storage.write(key, serialized);
    } catch (err) {
      console.error(`[storage] write failed for ${key}`, err);
      lastWritten.delete(key);
    }
  } else {
    localSet(key, serialized);
  }
}

/** Debounced write. Returns immediately; use flushWrites() to force. */
export function writeKey(key, value, { delay = 350 } = {}){
  const serialized = JSON.stringify(value);
  const entry = pending.get(key);
  if (entry){
    clearTimeout(entry.timer);
    if (entry.serialized === serialized && lastWritten.get(key) === serialized){
      pending.delete(key);
      return;
    }
  } else if (lastWritten.get(key) === serialized){
    return;
  }
  const timer = setTimeout(() => {
    pending.delete(key);
    commitWrite(key, serialized);
  }, delay);
  pending.set(key, { timer, serialized });
}

/** Flush every pending debounced write right now. */
export function flushWrites(){
  const writes = [];
  pending.forEach(({ timer, serialized }, key) => {
    clearTimeout(timer);
    writes.push(commitWrite(key, serialized));
  });
  pending.clear();
  return Promise.allSettled(writes);
}

export async function removeKey(key){
  const entry = pending.get(key);
  if (entry){ clearTimeout(entry.timer); pending.delete(key); }
  lastWritten.delete(key);
  if (hasFileStore()){
    try { await bridge().storage.remove(key); } catch {}
  } else {
    localRemove(key);
  }
}

export async function storageStats(){
  if (hasFileStore()){
    try { return await bridge().storage.stats(); } catch { return { dir: null, files: [] }; }
  }
  const files = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1){
      const key = window.localStorage.key(i);
      if (!key?.startsWith('tacky.')) continue;
      const value = window.localStorage.getItem(key) ?? '';
      files.push({ key, bytes: new Blob([value]).size, modifiedAt: null });
    }
  } catch {}
  return { dir: 'localStorage', files };
}

export function openStorageDir(){
  return bridge()?.storage?.openDir?.() ?? Promise.resolve(false);
}

/**
 * Save text to a file. Uses the native save dialog inside Electron, otherwise a
 * browser download. Resolves to { canceled, filePath }.
 */
export async function saveTextFile({ defaultName = 'export.json', contents = '', filters } = {}){
  const files = bridge()?.files;
  if (files?.save){
    return files.save({ defaultName, contents, filters });
  }
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { canceled: false, filePath: defaultName };
}

/** Pick a file and read it as text. Resolves to { canceled, contents, filePath }. */
export function openTextFile({ filters, accept = '.json' } = {}){
  const files = bridge()?.files;
  if (files?.open){
    return files.open({ filters });
  }
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve({ canceled: true });
      const reader = new FileReader();
      reader.onload = () => resolve({ canceled: false, filePath: file.name, contents: String(reader.result ?? '') });
      reader.onerror = () => resolve({ canceled: true });
      reader.readAsText(file);
    };
    input.click();
  });
}

if (typeof window !== 'undefined'){
  window.addEventListener('pagehide', () => { flushWrites(); });
  window.addEventListener('beforeunload', () => { flushWrites(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushWrites();
  });
}
