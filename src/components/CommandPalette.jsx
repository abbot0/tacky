import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchIndex, fuzzyScore } from '../lib.js';
import { SvgIcon } from './icons.jsx';

const TYPE_META = {
  board: { icon:'boards', label:'Board' },
  card: { icon:'check', label:'Card' },
  note: { icon:'notes', label:'Note' },
  canvas: { icon:'canvas', label:'Canvas' },
  command: { icon:'sparkle', label:'Command' }
};

/**
 * Ctrl+K palette: fuzzy search across boards, cards, notes and canvases plus a
 * list of app commands. Prefix a query with ">" to search commands only.
 */
export default function CommandPalette({ isOpen, onClose, index, commands, onOpenItem }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setCursor(0);
    const previous = document.activeElement;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => { if (previous && typeof previous.focus === 'function') previous.focus(); };
  }, [isOpen]);

  const results = useMemo(() => {
    if (!isOpen) return [];
    const trimmed = query.trim();
    const commandsOnly = trimmed.startsWith('>');
    const q = commandsOnly ? trimmed.slice(1).trim() : trimmed;

    const commandHits = (commands ?? [])
      .map(cmd => ({ cmd, score: fuzzyScore(q, cmd.label) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => ({ type:'command', id:cmd.id, title:cmd.label, subtitle:cmd.hint, run:cmd.run }));

    if (commandsOnly) return commandHits;
    if (!q) return [...commandHits.slice(0, 4), ...searchIndex(index, '', 8)];
    const items = searchIndex(index, q, 10);
    return [...items, ...commandHits.slice(0, 4)];
  }, [isOpen, query, index, commands]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    const node = listRef.current?.children?.[cursor];
    node?.scrollIntoView?.({ block:'nearest' });
  }, [cursor]);

  if (!isOpen) return null;

  const activate = (item) => {
    if (!item) return;
    onClose?.();
    if (item.type === 'command') item.run?.();
    else onOpenItem?.(item);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown'){ event.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)); }
    else if (event.key === 'ArrowUp'){ event.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (event.key === 'Enter'){ event.preventDefault(); activate(results[cursor]); }
    else if (event.key === 'Escape'){ event.preventDefault(); onClose?.(); }
  };

  return (
    <div className="quick-actions-overlay" role="dialog" aria-modal="true" aria-label="Search and commands">
      <div className="quick-actions-backdrop" onClick={onClose} />
      <div className="palette-panel">
        <div className="palette-search">
          <SvgIcon name="search" className="icon-sm" />
          <input
            ref={inputRef}
            className="palette-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search boards, cards, notes, canvases… or type > for commands"
            spellCheck={false}
            aria-label="Search"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-results" ref={listRef} role="listbox">
          {results.length === 0 && (
            <li className="palette-empty">Nothing matched “{query}”.</li>
          )}
          {results.map((item, idx) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.command;
            return (
              <li
                key={`${item.type}-${item.id}`}
                role="option"
                aria-selected={idx === cursor}
                className={`palette-result${idx === cursor ? ' is-active' : ''}`}
                onMouseEnter={() => setCursor(idx)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => activate(item)}
              >
                <span className={`palette-result-icon type-${item.type}`}><SvgIcon name={meta.icon} /></span>
                <span className="palette-result-copy">
                  <span className="palette-result-title">{item.title}</span>
                  {item.subtitle && <span className="palette-result-subtitle">{item.subtitle}</span>}
                </span>
                <span className="palette-result-type">{meta.label}</span>
              </li>
            );
          })}
        </ul>
        <footer className="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>&gt;</kbd> commands</span>
        </footer>
      </div>
    </div>
  );
}
