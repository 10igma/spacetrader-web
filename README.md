# Projekt Nova

Arbeitstitel. Ein eigenständiges Weltraum-Handelsspiel für Mobilgeräte: handeln, schmuggeln, Crew sammeln.

Der frühere Space-Trader-Port liegt unverändert unter `legacy/classic` und ist nicht Teil des Builds.

## Dokumente

- [Architektur](docs/redesign/01-architektur.md)
- [Spielkonzept und Mechanik-Katalog](docs/redesign/02-mechanik-katalog.md)
- [Roadmap und Stand](docs/redesign/03-roadmap.md)
- [Mobile-Hülle: Android und iOS bauen](docs/redesign/05-mobile.md)
- [Grafik-Auftrag: Anleitung und Prompts für die Bildgenerierung](docs/redesign/06-grafik-prompts.md)
- [Kartenkunst](docs/redesign/04-kartenkunst.md)

## Aufbau

```
packages/core     Spielregeln, Zustand, Zufall. Läuft im Server und im Offline-Modus
packages/server   Autoritativer Server (Skelett)
packages/client   Vite-App: Bühne (PixiJS, Shader), Audio, UI
tools/shots       Screenshot-Durchläufe in Handy-Auflösung
```

## Entwickeln

```bash
pnpm install
pnpm dev          # Client im Offline-Modus, http://localhost:5173
pnpm dev:server   # Server auf Port 8787
pnpm test         # Tests des Spielkerns
pnpm balance      # Bot-Simulation: Wirtschaft über 14 Tage, legal und Schmuggel
pnpm typecheck
pnpm build        # Produktions-Build nach packages/client/dist
```

Client gegen den Server: `http://localhost:5173/?server=http://localhost:8787`

Weitere URL-Parameter für die Entwicklung: `?q=high` oder `?q=low` legt die Grafikqualität fest, `?seed=abc` startet im Offline-Modus ein reproduzierbares Spiel.
