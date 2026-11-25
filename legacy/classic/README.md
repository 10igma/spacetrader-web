# 🚀 Space Trader Web

A faithful web port of **Space Trader** (Palm OS, 2002) by Pieter Spronck.

Trade goods, fight pirates, upgrade ships, and explore 120 solar systems — all in your browser.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Zustand** for state management
- Pure game logic — no heavy game framework needed

## Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
```

## Project Structure

```
src/
  data/         — Game constants, tables, and static data (from original C source)
  models/       — TypeScript interfaces for all game entities
  engine/       — Core game logic (TODO)
  state/        — Zustand store (TODO)
  ui/           — React components for each game screen (TODO)
  utils/        — Helpers (TODO)
```

## Status

- ✅ All game data faithfully ported from C source
- ✅ TypeScript types for all game entities
- ⬜ Game engine (trading, combat, travel, encounters)
- ⬜ Game state management
- ⬜ UI screens
- ⬜ Save/Load

## Credits

- Original game: **Pieter Spronck** (GPL v2)
- Web port: 2026
