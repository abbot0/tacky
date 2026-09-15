# Tacky

Tacky is an offline-first productivity workspace built with **Electron** and **React**. It bundles kanban boards, a Markdown notes editor, and an Excalidraw-powered canvas into a single desktop app — no accounts, no cloud, your data stays in plain JSON files on your machine.

## ✨ Features

### Boards
- Lists and cards with drag-and-drop (cards and whole columns).
- **Quick-add** cards inline (`Enter` to add, `Shift+Enter` for a new line).
- Cards carry a description, due date, colour labels, **priority** (low → urgent) and a **checklist** with a progress bar.
- Due-date badges: overdue / today / this week, with an overdue counter in the board header.
- **Filter** a board by text, label, due status or priority — non-matching cards dim instead of disappearing, so drag-and-drop stays consistent.
- Rename boards and lists inline (double-click a title), collapse lists, duplicate boards.
- Export / import a single board as JSON.

### Notes
- Plain-text editor with line numbers, tab support and a live word/character count.
- **Markdown preview** — Edit, Split or Preview modes (headings, lists, task lists, code blocks, quotes, links).
- `Ctrl+B` / `Ctrl+I` / `Ctrl+E` for bold / italic / inline code.
- **Tags** (`#tag`) with a tag filter on the notes dashboard, and **pinned** notes that stay at the top.
- Export any note as `.md`.

### Canvas
- Full Excalidraw editor, lazy-loaded so it doesn't slow down app start.
- Scenes (including embedded images) persist automatically; only the meaningful parts of the editor state are stored.
- Follows the app theme (dark / light).

### Everywhere
- **Search everything** with `Ctrl+K`: boards, cards, notes and canvases, plus app commands (type `>` to search commands only). Opening a card result jumps straight to its editor.
- **Undo** after deleting a board, note or canvas — a toast offers to put it back.
- Keyboard shortcuts: `Ctrl+1…5` to switch workspaces, `Ctrl+N` to create in the current one, `Ctrl+B` to toggle the sidebar.
- Four themes (Midnight, Graphite, Noir, Light), reduced-motion, focus mode and compact-card options.
- **Backup & restore**: export the whole workspace to one JSON file; restore by merging or replacing. Storage usage is shown in Settings with a shortcut to the data folder.
- Remembers window size / position between launches, and auto-updates from GitHub Releases.

## 💾 Where your data lives

Everything is stored as JSON in the app's user-data folder (`%APPDATA%\Tacky\data` on Windows — *Settings → Data → Open data folder*). Writes are debounced and atomic, so a crash mid-save can't corrupt a file. Data from Tacky 1.0 (which used browser `localStorage`) is migrated automatically on first launch.

## 📦 Tech Stack

React 18 · Electron 44 · Webpack 5 · @hello-pangea/dnd · @excalidraw/excalidraw · Babel

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+

```bash
git clone https://github.com/abbot0/tacky.git
cd tacky
npm install
```

### Development

```bash
npm run dev
```

Builds the renderer in watch mode and launches Electron with DevTools. To try the renderer in a normal browser (data goes to `localStorage` in that case):

```bash
npm run build
npm run preview   # http://localhost:4173
```

### Packaging

```bash
npm run package:win   # NSIS installer in ./release
```

Tagged pushes (`v*`) build and publish a Windows installer through GitHub Actions.

## ⌨️ Shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl+K` | Search everything / command palette |
| `Ctrl+1` … `Ctrl+5` | Overview, Boards, Notes, Canvas, Settings |
| `Ctrl+N` | New board / note / canvas (depending on where you are) |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Enter` | Save card (in the card editor) |
| `Esc` | Close dialogs and the palette |
| Double-click a title | Rename board / list / canvas |
