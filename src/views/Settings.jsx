import React from 'react';

function ThemeCard({ theme, isActive, onSelect, renderIcon }) {
  const render = typeof renderIcon === 'function' ? renderIcon : () => null;
  const handleSelect = () => {
    if (typeof onSelect === 'function') {
      onSelect(theme.id);
    }
  };

  return (
    <button
      type="button"
      className={`theme-card ${isActive ? 'is-active' : ''}`}
      onClick={handleSelect}
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
          <span
            key={`${theme.id}-${idx}`}
            className="theme-swatch"
            style={{ background: color }}
            aria-hidden="true"
          />
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

export default function Settings({
  themes = [],
  selectedTheme = 'midnight',
  onSelectTheme,
  reducedMotion = false,
  focusMode = false,
  onToggleReducedMotion,
  onToggleFocusMode,
  renderIcon
}) {
  const themeList = Array.isArray(themes) ? themes : [];
  const activeTheme =
    themeList.find(theme => theme.id === selectedTheme)
    || themeList[0]
    || { name: 'Midnight Dark', description: 'Deep focus with neon accents.', swatch: ['#0b1b3a', '#121d34', '#9f7aea'] };
  const render = typeof renderIcon === 'function' ? renderIcon : () => null;

  return (
    <div className="settings-shell">
      <header className="settings-hero">
        <div className="settings-hero-copy">
          <span className="settings-section-eyebrow">Workspace</span>
          <h1>Settings & appearance</h1>
          <p>Pick a theme, trim motion, and keep distractions low. Changes apply instantly.</p>
          <div className="settings-hero-pills">
            <span className="settings-pill">
              {render('palette', 'icon-sm')}
              <span>
                Current: <strong>{activeTheme.name}</strong>
              </span>
            </span>
            <span className="settings-pill subtle">Default: Midnight Dark</span>
          </div>
        </div>
        <div className="settings-hero-card">
          <p className="settings-hero-card-title">{activeTheme.name}</p>
          <p className="settings-hero-card-desc">{activeTheme.description}</p>
          <div className="theme-swatches mini">
            {(activeTheme.swatch || []).map((color, idx) => (
              <span
                key={`active-${idx}`}
                className="theme-swatch"
                style={{ background: color }}
                aria-hidden="true"
              />
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
          <span className="settings-pill">
            {render('sparkle', 'icon-sm')}
            <span>
              Active: <strong>{activeTheme.name}</strong>
            </span>
          </span>
        </div>
        <div className="theme-grid">
          {themeList.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === selectedTheme}
              onSelect={onSelectTheme}
              renderIcon={renderIcon}
            />
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <span className="settings-section-eyebrow">Comfort</span>
            <h3>Session controls</h3>
            <p>Trim motion and reduce glow when you need to stay focused.</p>
          </div>
        </div>
        <div className="settings-grid">
          <ToggleRow
            label="Reduce motion"
            description="Shorten transitions and animations."
            checked={reducedMotion}
            onChange={onToggleReducedMotion}
          />
          <ToggleRow
            label="Focus mode"
            description="Dim glows and keep the workspace minimal."
            checked={focusMode}
            onChange={onToggleFocusMode}
          />
        </div>
      </section>
    </div>
  );
}
