# Tacky — lightweight kanban you can run locally

Tacky is a small kanban-style app built with Flask and SQLite. It supports boards, lists, and cards, drag-and-drop reordering, dark mode, per-board wallpapers, and JSON import/export. You can run it from source or package it as a single Windows executable.

![Screenshot](docs/og.png)

---

## Features

- Boards with lists and cards
- Quick add card button on each list
- Drag and drop lists and cards
- Dark mode (remembered per browser)
- Per-board wallpapers (upload and remove)
- Import and export boards as JSON
- Optional AI task-plan generator that produces strict JSON
- Local-first: data stored on your machine

---

## Quick start (from source)

```bash
python -m venv .venv
# PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
