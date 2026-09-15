import React, { useEffect, useState } from 'react';
import Confirm from '../components/Confirm.jsx';
import { storageStats, openStorageDir } from '../storage.js';
import { formatBytes } from '../lib.js';

function ThemeCard({ theme, isActive, onSelect, renderIcon }) {
  const render = typeof renderIcon === 'function' ? renderIcon : () => null;
  return (
    <button
      type="button"
      className={`theme-card ${isActive ? 'is-active' : ''}`}
      onClick={() => onSelect?.(theme.id)}
      aria-pressed={isActive}
    >
      <div className="theme-card-header">
        <div className="theme-card-icon">{render('palette', 'icon-sm')}</div>
        <div className="theme-card-meta">
          <p className="theme-name">{theme.name}</p>
          <p className="theme-desc">{theme.description}</p>
        </div>
        <span className={`theme-chip ${theme.id === 'midnight' ? 'default' : ''}`}>
          {isActive ? 'Active' : theme.id === 'midnight' ? 'Default' : 'Preview'}
        </span>
      </div>
      <div className="theme-swatches">
        {(theme.swatch || []).map((color, idx) => (
          <span key={`${theme.id}-${idx}`} className="theme-swatch" style={{ background: color }} aria-hidden="true" />
        ))}
      </div>
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="setting-row">
      <div className="setting-row-copy">
        <span className="setting-row-title">{label}</span>
        {description && <span className="setting-row-desc">{description}</span>}
      </div>
      <span className={`toggle ${checked ? 'is-on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="toggle-handle" />
      </span>
    </label>
  );
}

const SHORTCUTS = [
  ['Ctrl + K', 'Search everything / command palette'],
  ['Ctrl + 1…5', 'Overview, Boards, Notes, Canvas, Settings'],
  ['Ctrl + N', 'New item in the current workspace'],
  ['Ctrl + B', 'Toggle sidebar'],
  ['Ctrl + Enter', 'Save card (in card editor)'],
  ['Double-click', 'Rename a board, list, or canvas title']
];

export default function Settings({
  themes = [],
  selectedTheme = 'midnight',
  onSelectTheme,
  preferences = {},
  onTogglePreference,
  onExportBackup,
  onImportBackup,
  onClearWorkspace,
  counts = {},
  renderIcon
}) {
  const themeList = Array.isArray(themes) ? themes : [];
  const activeTheme = themeList.find(theme => theme.id === selectedTheme) || themeList[0]
    || { name: 'Midnight Dark', description: 'Deep focus with neon accents.', swatch: ['#0b1b3a', '#121d34', '#9f7aea'] };
  const render = typeof renderIcon === 'function' ? renderIcon : () => null;

  const [stats, setStats] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const refreshStats = () => { storageStats().then(setStats).catch(() => setStats(null)); };
  useEffect(() => { refreshStats(); }, [counts.boards, counts.notes, counts.canvases]);

  const totalBytes = stats?.files?.reduce((sum, f) => sum + (f.bytes ?? 0), 0) ?? 0;
  const isFileStore = stats?.dir && stats.dir !== 'localStorage';

  return (
    <div className="settings-shell">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <span className="settings-section-eyebrow">Workspace</span>
          <h1>Settings & appearance</h1>
          <p>Pick a theme, trim motion, and keep your data safe. Changes apply instantly.</p>
          <div className="settings-hero-pills">
            <span className="settings-pill">
              {render('palette', 'icon-sm')}
              <span>Current: <strong>{activeTheme.name}</strong></span>
            </span>
            <span className="settings-pill subtle">{counts.boards ?? 0} boards · {counts.notes ?? 0} notes · {counts.canvases ?? 0} canvases</span>
          </div>
        </div>
        <div className="settings-hero-card">
          <p className="settings-hero-card-title">{activeTheme.name}</p>
          <p className="settings-hero-card-desc">{activeTheme.description}</p>
          <div className="theme-swatches mini">
            {(activeTheme.swatch || []).map((color, idx) => (
              <span key={`active-${idx}`} className="theme-swatch" style={{ background: color }} aria-hidden="true" />
            ))}
          </div>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <span className="settings-section-eyebrow">Themes</span>
            <h3>Pick your vibe</h3>
            <p>Switch between Midnight Dark, Graphite Grey, Noir Black, or a bright Light mode.</p>
          </div>
        </div>
        <div className="theme-grid">
          {themeList.map(theme => (
            <ThemeCard key={theme.id} theme={theme} isActive={theme.id === selectedTheme} onSelect={onSelectTheme} renderIcon={renderIcon} />
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <span className="settings-section-eyebrow">Comfort</span>
            <h3>Session controls</h3>
            <p>Trim motion, reduce glow, and tighten layouts when you need to stay focused.</p>
          </div>
        </div>
        <div className="settings-grid">
          <ToggleRow label="Reduce motion" description="Shorten transitions and animations." checked={Boolean(preferences.reducedMotion)} onChange={() => onTogglePreference?.('reducedMotion')} />
          <ToggleRow label="Focus mode" description="Dim glows and keep the workspace minimal." checked={Boolean(preferences.focusMode)} onChange={() => onTogglePreference?.('focusMode')} />
          <ToggleRow label="Compact cards" description="Hide descriptions on board cards to fit more per column." checked={Boolean(preferences.compactCards)} onChange={() => onTogglePreference?.('compactCards')} />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <span className="settings-section-eyebrow">Data</span>
            <h3>Backup & storage</h3>
            <p>
              {isFileStore
                ? 'Your workspace is saved as JSON files on disk. Export a backup before big changes or to move between machines.'
                : 'Your workspace is saved in browser storage. Export a backup to keep a copy.'}
            </p>
          </div>
          <span className="settings-pill">
            {render('database', 'icon-sm')}
            <span>Using <strong>{formatBytes(totalBytes)}</strong></span>
          </span>
        </div>
        <div className="data-grid">
          <div className="data-card">
            <h4>Export backup</h4>
            <p>Saves every board, note, canvas and your preferences to a single JSON file.</p>
            <button type="button" className="button accent-button" onClick={onExportBackup}>Export backup…</button>
          </div>
          <div className="data-card">
            <h4>Restore backup</h4>
            <p><strong>Merge</strong> keeps existing items and adds or updates from the file. <strong>Replace</strong> wipes the workspace first.</p>
            <div className="data-card-actions">
              <button type="button" className="button" onClick={() => onImportBackup?.('merge')}>Merge…</button>
              <button type="button" className="button ghost-button" onClick={() => setConfirm('replace')}>Replace…</button>
            </div>
          </div>
          <div className="data-card">
            <h4>Storage</h4>
            {stats?.files?.length ? (
              <ul className="data-list">
                {stats.files.map(file => (
                  <li key={file.key}><span>{file.key}</span><span>{formatBytes(file.bytes)}</span></li>
                ))}
              </ul>
            ) : (
              <p>No data written yet.</p>
            )}
            <div className="data-card-actions">
              {isFileStore && <button type="button" className="button ghost-button" onClick={openStorageDir}>Open data folder</button>}
              <button type="button" className="button ghost-button" onClick={refreshStats}>Refresh</button>
            </div>
          </div>
          <div className="data-card data-card-danger">
            <h4>Clear workspace</h4>
            <p>Removes every board, note and canvas. Export a backup first — this cannot be undone.</p>
            <button type="button" className="button danger-button" onClick={() => setConfirm('clear')}>Clear all data…</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <span className="settings-section-eyebrow">Keyboard</span>
            <h3>Shortcuts</h3>
          </div>
        </div>
        <ul className="shortcut-list">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={keys}><kbd>{keys}</kbd><span>{label}</span></li>
          ))}
        </ul>
      </section>

      {confirm === 'replace' && (
        <Confirm title="Replace workspace?" confirmLabel="Choose file & replace" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); onImportBackup?.('replace'); }}>
          <div className="confirm-copy">Everything currently in Tacky will be replaced with the contents of the backup you pick next.</div>
        </Confirm>
      )}
      {confirm === 'clear' && (
        <Confirm title="Clear all data?" confirmLabel="Clear everything" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); onClearWorkspace?.(); }}>
          <div className="confirm-copy">This deletes all {counts.boards ?? 0} boards, {counts.notes ?? 0} notes and {counts.canvases ?? 0} canvases permanently.</div>
        </Confirm>
      )}
    </div>
  );
}
