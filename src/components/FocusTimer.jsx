import React, { useCallback, useEffect, useRef, useState } from 'react';

const PRESETS = [
  { id:'focus', label:'Focus', minutes:25 },
  { id:'short', label:'Short break', minutes:5 },
  { id:'long', label:'Long break', minutes:15 }
];

const format = (secs) => `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;

/**
 * Pomodoro-style timer that lives in the header. Counts from a wall-clock
 * deadline so it stays accurate even if the renderer is throttled in the
 * background, and notifies when a session ends.
 */
export default function FocusTimer({ onToast }) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [remaining, setRemaining] = useState(PRESETS[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState(0);
  const deadlineRef = useRef(null);
  const wrapRef = useRef(null);

  const finish = useCallback(()=>{
    setRunning(false);
    deadlineRef.current = null;
    if (preset.id === 'focus') setSessions(s => s + 1);
    const message = preset.id === 'focus' ? 'Focus session complete — take a break.' : 'Break over — back to it.';
    onToast?.({ message, tone:'success', duration: 8000 });
    try{
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted'){
        new Notification('Tacky', { body: message });
      }
    } catch {}
  },[preset, onToast]);

  useEffect(()=>{
    if (!running) return undefined;
    const tick = ()=>{
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) finish();
    };
    tick();
    const id = setInterval(tick, 500);
    return ()=> clearInterval(id);
  },[running, finish]);

  useEffect(()=>{
    if (!open) return undefined;
    const onDoc = (e)=>{ if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return ()=> document.removeEventListener('mousedown', onDoc);
  },[open]);

  const start = ()=>{
    try{ if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch {}
    deadlineRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };
  const pause = ()=>{ setRunning(false); deadlineRef.current = null; };
  const reset = (next = preset)=>{ setRunning(false); deadlineRef.current = null; setPreset(next); setRemaining(next.minutes * 60); };

  const total = preset.minutes * 60;
  const progress = total ? 1 - remaining / total : 0;
  const active = running || remaining !== total;

  return (
    <div className={`focus-timer${running ? ' is-running' : ''}${active ? ' is-active' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="focus-timer-pill"
        onClick={()=>setOpen(o => !o)}
        title="Focus timer"
        aria-expanded={open}
        style={{ '--progress': `${Math.round(progress * 100)}%` }}
      >
        <span className="focus-timer-ring" aria-hidden="true" />
        <span className="focus-timer-time">{format(remaining)}</span>
        {sessions > 0 && <span className="focus-timer-count" title="Focus sessions today">{sessions}</span>}
      </button>
      {open && (
        <div className="focus-timer-popover" role="dialog" aria-label="Focus timer">
          <div className="segmented">
            {PRESETS.map(p => (
              <button key={p.id} type="button" className={p.id === preset.id ? 'is-active' : ''} onClick={()=>reset(p)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="focus-timer-big">{format(remaining)}</div>
          <div className="focus-timer-actions">
            {running ? (
              <button type="button" className="button" onClick={pause}>Pause</button>
            ) : (
              <button type="button" className="button accent-button" onClick={start} disabled={remaining === 0}>
                {remaining === total ? 'Start' : 'Resume'}
              </button>
            )}
            <button type="button" className="button ghost-button" onClick={()=>reset()}>Reset</button>
          </div>
          <p className="focus-timer-hint">{sessions} focus session{sessions === 1 ? '' : 's'} completed this run.</p>
        </div>
      )}
    </div>
  );
}
