# 01 Architektur

Stand: 25.11.2026. Arbeitstitel des neuen Spiels: **PROJEKT NOVA** (Platzhalter, Namens- und Markenprüfung vor Release).

## 1. Ausgangslage

Das bestehende Repo ist ein originalgetreuer Web-Port von Space Trader (Palm OS, 2002, Pieter Spronck, GPL v2): React 19, Zustand, Tailwind, rund 6'300 Zeilen, 14 Screens.

Für den Neustart heisst das zwei Dinge:

1. **Neues, eigenes Spiel statt Port.** Wir übernehmen das Genre (Weltraumhandel), aber keine Namen, Schiffe, Quests, Systemdaten oder Tabellen des Originals. Das ist inhaltlich gewollt (neues Erlebnis) und rechtlich nötig: Wer GPL-Code oder aus dem C-Quelltext portierte Daten weiterverwendet, muss das ganze Spiel unter GPL offenlegen. Für ein Spiel mit Shop und Live-Betrieb ist das ein Problem.
2. **Sauberer Schnitt im Repo.** Der bisherige Port liegt unverändert in `legacy/classic`. Der neue Code startet in einer leeren Struktur ohne Übernahme.

## 2. Was das Spiel technisch wirklich braucht

Der entscheidende Punkt für die Engine-Wahl: Ein Spiel nach dem Muster von FIFA Ultimate Team besteht zu etwa 80 Prozent aus Menüs, Karten, Listen, Shops und Timern. Die restlichen 20 Prozent sind wenige, dafür extrem aufwendig inszenierte Momente (Pack-Öffnung, Sprung, Begegnung).

| Anforderung | Konsequenz |
|---|---|
| UI-lastig, viel Text, Listen, Karten, Shops | Erstklassiges Layout, Typografie und Touch-Verhalten sind wichtiger als eine 3D-Pipeline |
| Wenige Hero-Momente mit sehr hoher visueller Qualität | GPU-Rendering mit eigenen Shadern, Partikeln, Post-Processing |
| Mobile first, Hochformat, einhändig, Sessions von 2 bis 5 Minuten | Schneller Start (unter 3 Sekunden), kleiner Download, 60 fps auf Mittelklasse-Geräten |
| Adaptive Musik und dichtes Sounddesign | Eigene Audio-Engine mit Stems und Zuständen |
| Timer, Streaks, tägliche Rotation, Saisons | Zeit als sauber modellierte Eingangsgrösse, später Server-Zeit |
| Zufall mit kontrollierten Quoten (Packs, Loot) | Deterministischer, testbarer Kern mit Seeds und Monte-Carlo-Tests |
| Erst Desktop/Browser, später iOS und Android | Eine Codebasis, die in App-Hüllen verpackt werden kann |
| Später Ranglisten, Events, evtl. Käufe | Kern muss serverseitig lauffähig sein (gleicher Code validiert Aktionen) |

## 3. Optionen im Vergleich

Bewertet nach drei Fragen: Passt es zum Spieltyp? Wie tief ist mein Umsetzungswissen? Kann ich das Ergebnis in dieser Umgebung selbst sehen und prüfen?

| Option | Passung zum Spieltyp | Mein Wissen | Selbst prüfbar | Urteil |
|---|---|---|---|---|
| **TypeScript + PixiJS 8 (WebGL2) + React-UI + Capacitor** | Sehr gut: UI-Stärke des Webs plus GPU-Bühne | Am tiefsten | Ja: Headless-Chromium mit WebGL2 und Audio läuft hier, Screenshots in Handy-Auflösung möglich | **Empfehlung** |
| Rust + Bevy | Mässig: ECS ist stark für Simulation und Action, die UI-Schicht ist für ein menülastiges Spiel der Schwachpunkt | Gut, aber veraltend: aktuell ist 0.20.1, die API bricht alle paar Monate, mein Wissen hinkt mehrere Versionen hinterher | Schlecht: kein WASM-Target installiert, lange Kompilierzeiten, kein GPU hier | Nicht empfohlen |
| Godot 4 (GDScript) | Gut: solide 2D- und UI-Werkzeuge, guter Mobile-Export | Gut | Schlecht: nicht installiert, Szenen entstehen sinnvoll nur im Editor, den ich nicht bedienen kann | Zweite Wahl, falls später native Performance nötig wird |
| Unity | Gut, Industriestandard für Mobile | Mittel | Nein: proprietär, editorzentriert | Nicht sinnvoll in diesem Setup |
| Flutter + Flame | Gut für UI, schwächer bei eigenen Shadern | Mittel | Eingeschränkt | Kein Vorteil gegenüber Web |
| Three.js / React Three Fiber (3D) | 3D sieht spektakulär aus, braucht aber Modelle und Texturen, die niemand von uns liefert | Tief | Ja | Punktuell möglich (z. B. 3D-Karte beim Reveal), nicht als Basis |
| Phaser 4 | Gutes 2D-Framework, aber eigene UI-Welt statt DOM | Tief | Ja | PixiJS + DOM ist für uns flexibler |

### Warum nicht Bevy, obwohl es als Beispiel genannt war

- Ich habe es geprüft: `cargo` 1.97 ist vorhanden, aber nur das Linux-Target. Bevy steht bei 0.20.1. Bei jedem Schritt müsste ich gegen eine API arbeiten, die sich seit meinem Wissensstand mehrfach geändert hat. Das kostet Tempo und erzeugt Fehler, die mit der eigentlichen Spielqualität nichts zu tun haben.
- Die Stärken von Bevy (ECS, tausende Entitäten, native Performance) brauchen wir nicht. Unser Engpass ist Gestaltung, nicht Rechenleistung.
- Mobile mit Bevy geht, aber Plugins für Käufe, Push und Haptik sind dünn. Capacitor hat dafür gepflegte Standardlösungen.

### Was ich hier konkret verifiziert habe

| Test | Ergebnis |
|---|---|
| Headless-Chromium, WebGL2 | Verfügbar (SwiftShader). Shader und Effekte lassen sich rendern und als Screenshot prüfen |
| WebGPU | Hier nicht verfügbar. Baseline ist darum WebGL2, WebGPU bleibt optional |
| AudioContext | Verfügbar (44.1 kHz). Musik-Engine lässt sich offline rendern und analysieren |
| Node 22, pnpm 10, Vite 8, PixiJS 8.23, React 19.3, Capacitor 8.6 | Alles installierbar und aktuell |

Der wichtigste Vorteil dieser Wahl: Ich kann jeden Screen bauen, in einem 390 x 844 Viewport rendern, selbst anschauen und nachbessern. Bei den anderen Optionen würde ich blind arbeiten, und du müsstest jede visuelle Iteration selbst testen.

## 4. Zielarchitektur

```
┌──────────────────────────────────────────────────────────────┐
│  App-Hülle      PWA (Phase 1) → Capacitor iOS/Android (Ph. 5) │
├──────────────────────────────────────────────────────────────┤
│  UI-Schicht (DOM)            │  Bühne (Canvas, WebGL2)        │
│  React 19, Design-Tokens,    │  PixiJS 8, eigene GLSL-Shader, │
│  Motion für Übergänge,       │  Partikel, Post-Processing,    │
│  Gesten, Safe Areas          │  Galaxie, Warp, Karten-Reveal  │
├──────────────────────────────┴───────────────────────────────┤
│  Präsentations-Director                                       │
│  übersetzt Spiel-Events in Choreografien: Bild, Ton, Haptik   │
├──────────────────────────────────────────────────────────────┤
│  Audio-Engine   Web Audio: adaptive Musik (Stems), SFX, Duck  │
├──────────────────────────────────────────────────────────────┤
│  Spielkern (reines TypeScript, kein DOM, deterministisch)     │
│  Commands rein → Zustand + Events raus                        │
│  Ökonomie, Reisen, Begegnungen, Karten, Packs, Timer, Saisons │
├──────────────────────────────────────────────────────────────┤
│  Content (Daten + Schema)    │  Persistenz                    │
│  Karten, Güter, Sektoren,    │  IndexedDB lokal, versionierte │
│  Loot-Tabellen, Quoten       │  Saves, später Cloud-Sync      │
└──────────────────────────────┴───────────────────────────────┘
        GameService-Grenze: dahinter autoritativer Server (Abschnitt 6)
```

### Repo-Struktur (pnpm-Workspace)

```
packages/
  core/       Spielkern: Regeln, Zustand, Commands, Events, RNG, Content. Kein DOM
  server/     Autoritativer Server. Importiert core, hält Zustand, Uhr und Würfel
  client/     Vite-App: stage/ (PixiJS, Shader), audio/, ui/, net/ (Service-Schicht)
tools/
  shots/      Playwright-Skripte für Screenshots in Geräte-Auflösungen
  balance/    (ab Phase 2) Bot-Spieler und Monte-Carlo-Simulationen
legacy/
  classic/    Der bisherige Space-Trader-Port, unverändert, nicht Teil des Builds
```

Stage, Audio und UI sind vorerst Ordner im Client statt eigene Pakete. Getrennt wird, sobald ein zweiter Abnehmer existiert.

## 5. Schlüsselentscheide

**Deterministischer Kern mit Commands und Events.** Die UI schickt Befehle (`JumpTo`, `BuyGoods`, `OpenPack`), der Kern antwortet mit neuem Zustand und einer Event-Liste (`PackOpened`, `CardRevealed{rarity}`, `StreakExtended`). Der Kern kennt weder Bildschirm noch Ton. Vorteile: vollständig testbar, tausende simulierte Spielertage in Sekunden für das Balancing, und derselbe Code kann später auf dem Server laufen und Aktionen validieren.

**Zufall mit Seeds und getrennten Strömen.** Eigener PRNG, getrennte Ströme für Packs, Loot, Märkte und Begegnungen. Damit sind Quoten reproduzierbar testbar (eine Million Packs im Test, Abweichung von der deklarierten Quote unter 0.1 Prozentpunkten) und Pity-Zähler nachvollziehbar.

**Zeit ist ein Eingabewert.** Der Kern liest nie selbst die Uhr. Timer, Energie, Tagesrotation und Streaks rechnen mit einer übergebenen Zeit. Lokal kommt sie vom Gerät, später vom Server. Das macht Tests trivial (Zeit vorspulen) und verhindert später den Klassiker "Uhr am Handy vorstellen".

**Präsentations-Director.** Die Inszenierung ist vom Regelwerk getrennt. Der Kern weiss sofort, was im Pack ist. Der Director entscheidet, wie lange die Spannung gehalten wird, welche Farbe der Lichtstrahl hat, wann der Bass einsetzt und wann das Gerät vibriert. So lässt sich die Dramaturgie feinjustieren, ohne Regeln anzufassen.

**DOM für UI, Canvas für Spektakel.** Text, Listen, Buttons und Formulare im DOM (gestochen scharfe Typografie, Barrierefreiheit, Systemschrift-Skalierung). Dahinter und darüber eine WebGL-Bühne für alles, was leuchtet, sich bewegt oder explodiert. Animiert werden im DOM nur `transform` und `opacity`.

**Content als Daten.** Karten, Güter, Sektoren, Loot-Tabellen und Shop-Angebote sind validierte Datendateien. Neue Saisons und Events sind Datenänderungen, keine Programmierarbeit. Das ist die Voraussetzung für einen Live-Betrieb.

**Autoritativer Server von Anfang an in der Architektur.** Details in Abschnitt 6. Kurz: Der Client ist nur Anzeige und Eingabe. Er spricht ausschliesslich über die Schnittstelle `GameService` mit dem Spiel. Dahinter läuft entweder der echte Server oder, für Entwicklung und Vorschau, derselbe Kern im Browser.

**State im Client.** Zustand als schlanker Store, der den Kern-Zustand spiegelt. Die UI abonniert gezielt einzelne Ausschnitte.

## 6. Autoritativer Server

**Ziel:** Das Handy ist nur Client. Alles, was zählt, entscheidet der Server. Ein manipulierter Client kann sich höchstens selbst falsche Bilder zeigen.

### Wie es gebaut ist

```
Client (Handy)                          Server
┌──────────────────────┐   Command    ┌───────────────────────────────┐
│ UI, Bühne, Ton       │ ───────────▶ │ prüft Sitzung und Befehlsform  │
│                      │              │ applyCommand(state, cmd, now)  │
│ kennt: ClientView    │ ◀─────────── │ hält: Zustand, Uhr, Seed, RNG  │
│ kennt nicht: Seed,   │ View+Events  │ sendet: gefilterte Sicht       │
│ RNG, fremde Daten    │              └───────────────────────────────┘
└──────────────────────┘
```

- **Eine Schnittstelle.** `GameService` hat zwei Methoden: `connect()` und `send(command)`. Kein Screen ruft Regeln direkt auf.
- **Ein Regelwerk.** `packages/core` läuft unverändert auf dem Server. Es gibt keine zweite Implementierung, die auseinanderlaufen könnte.
- **Würfel bleiben auf dem Server.** Seed und Zufallszustand sind Teil des Server-Zustands. `toClientView` entfernt sie, ein Test stellt das sicher. Der Client erfährt den Inhalt eines Containers erst als Ergebnis.
- **Die Uhr gehört dem Server.** Timer, Energie und Fristen rechnen mit Server-Zeit. Die Geräte-Uhr zu verstellen bringt nichts.
- **Inszenierung ist getrennt.** Der Reveal spielt nur ab, was der Server bereits entschieden hat.

### Was schon läuft

`packages/server` ist ein lauffähiges Skelett (Node, ohne Abhängigkeiten ausser dem Kern). Geprüft: Sitzung anlegen, Container öffnen, zweiten Gratis-Container ablehnen, erfundene Befehle ablehnen, Anfragen ohne Sitzung ablehnen. Der Client läuft im Browser gegen diesen Server (`?server=http://...`) und schreibt dabei keinen lokalen Spielstand.

### Was für den Produktivbetrieb noch fehlt

| Baustein | Zweck | Phase |
|---|---|---|
| Konten und Anmeldung (Geräte-Konto, später Apple, Google, E-Mail) | Spielstand gehört einer Person, nicht einem Gerät | 4 |
| Datenbank (Postgres) mit Transaktionen pro Befehl | Zustand überlebt Neustarts, kein Doppel-Ausgeben | 4 |
| Idempotenz-Schlüssel pro Befehl | Wiederholte Anfrage bei schlechtem Netz zählt nur einmal | 4 |
| Rate-Limits und Anomalie-Erkennung | Bots und Skripte bremsen | 4 |
| Kaufbeleg-Prüfung gegen Apple und Google | Kein Guthaben ohne bestätigte Zahlung | 6 |
| Betrieb: Hosting, TLS, Backups, Monitoring | Verfügbarkeit | 4 |

### Ehrliche Grenzen

- **Online-Pflicht.** Ein autoritativer Server heisst: ohne Verbindung kein Fortschritt, wie bei FUT. Der Offline-Modus bleibt als Entwicklungs- und Vorschau-Werkzeug, nicht als Spielmodus mit Wert.
- **Nicht hackbar gibt es nicht, nur: Hacken bringt nichts.** Der Server verhindert gefälschte Ergebnisse, Guthaben und Zeiten. Er verhindert nicht, dass jemand den Client automatisiert (Bots). Dagegen helfen Limits und Auswertung, nie vollständig.
- **Latenz.** Jede Aktion braucht eine Antwort. Darum ist die Inszenierung so gebaut, dass sie die Wartezeit überdeckt (der Riss lädt, während die Antwort kommt).

## 7. Art Direction und Design-System

Was "state of the art" hier konkret heisst, und was ich ohne Grafikteam liefern kann:

- **Stil: Holo-Glass auf Tiefschwarz.** OLED-schwarzer Grund, tiefe Nebelfarben, zwei Signalfarben (Plasma-Cyan und Glut-Amber) plus Seltenheitsfarben. Panels als geschliffenes Glas mit echter Unschärfe, feinen Lichtkanten und Körnung.
- **Alles prozedural.** Nebel, Sterne, Planeten, Warp-Tunnel, Schilde und Karten-Folien entstehen als Shader. Das ist kein Kompromiss: Es ist auflösungsunabhängig, winzig im Download, und jede Welt sieht anders aus.
- **Karten als Hero-Objekt.** Holografische Folie, die auf Neigung des Geräts reagiert (Gyroskop), Parallaxe in mehreren Ebenen, animierte Seltenheits-Rahmen. Die Karte ist das Objekt, das man besitzen und zeigen will.
- **Motion-Sprache.** Federbasierte Animationen statt linearer Tweens, 120 Hz wo verfügbar, keine Übergänge ohne Bedeutung. Jede Zahl, die sich ändert, zählt sichtbar hoch.
- **Daumenzone.** Hochformat, alle primären Aktionen im unteren Drittel, Bottom-Navigation, Sheets von unten, Wischgesten für Hauptwege. Touch-Ziele mindestens 48 px.
- **Typografie.** Eine technische Display-Schrift mit Charakter für Zahlen und Titel (variable Font), eine neutrale Leseschrift. Zahlen immer tabellarisch gesetzt, damit hochzählende Werte nicht zittern.
- **Haptik als dritte Ebene.** Eigenes Vokabular: leichter Tick bei Auswahl, doppelter Schlag bei Gewinn, anschwellendes Muster bei Reveal.
- **Illustrationen (Crew-Porträts).** Die einzige Lücke: Gesichter und Figuren kann ich nicht per Shader erzeugen. Optionen: stilisierte prozedurale Avatare (Silhouetten, Helme, Hologramm-Look), KI-generierte Porträts, oder ein Illustrator. Empfehlung für den Start: prozedurale Hologramm-Avatare, weil sie zum Stil passen und rechtlich sauber sind.

## 8. Audio

- **Adaptive Musik in Schichten.** Vier Zustände in derselben Tonart: Hub (ruhige Flächen), Reise (Puls und Arpeggio), Spannung (Begegnung), Reveal (Riser und Auflösung). Übergänge taktgenau, damit ein Seltenheits-Treffer immer musikalisch auflöst.
- **Synthese statt Samples.** Musik und Effekte werden zur Laufzeit erzeugt (Web Audio). Kein Lizenzproblem, wenige Kilobyte, unendlich variierbar.
- **Sounddesign als Belohnungssystem.** Jede Seltenheit hat ein eigenes Klangmotiv, das man nach drei Packs wiedererkennt. Münzen, Tick beim Hochzählen, satter Schlag bei Abschluss.
- **Ehrliche Grenze.** Generative Synth-Musik (Ambient, Synthwave, elektronisch) kann ich auf gutem Niveau liefern. Einen orchestralen oder gesungenen Titeltrack nicht. Die Engine ist so gebaut, dass sich später komponierte oder lizenzierte Stems einsetzen lassen.

## 9. Weg aufs Handy

| Stufe | Was | Hinweis |
|---|---|---|
| 1 | PWA im Browser, installierbar, offline | Deployment über die bestehende GitHub-Pages-Pipeline. Sofort auf dem eigenen Handy testbar |
| 2 | Capacitor-Hülle für Android | Build in CI möglich |
| 3 | Capacitor-Hülle für iOS | **Braucht einen Mac mit Xcode und einen Apple-Developer-Account.** Das kann ich in dieser Cloud-Umgebung nicht bauen |
| 4 | Native Plugins: Haptik, Push, Käufe | iOS-Safari kennt keine Vibration und nur eingeschränkt Push, darum sind diese Funktionen an die App-Hülle gebunden |

## 10. Risiken und Grenzen

| Risiko | Einschätzung | Gegenmassnahme |
|---|---|---|
| WebView-Performance auf älteren Geräten | Mittel. Shader und Unschärfe sind teuer | Qualitätsstufen (hoch, mittel, sparsam), automatische Erkennung, Budget von 16 ms pro Frame, Test mit CPU-Drosselung |
| Audio-Start auf iOS | Bekannt: Ton erst nach erster Berührung | Start-Screen "Tippen zum Starten" als Teil der Inszenierung |
| Visuelle Qualität ohne Grafikteam | Der grösste Hebel und das grösste Risiko | Stil konsequent um Prozedurales bauen. Vertical Slice in Phase 1 beweist das Niveau, bevor Inhalt in die Breite geht |
| Balancing einer Ökonomie mit Zufall | Hoch, ohne Werkzeuge nicht beherrschbar | Bot-Simulationen von Tag 1 bis Tag 90 als fester Teil der Pipeline |
| Manipulation (Uhr, Speicherstand) | Im Offline-Modus nicht verhinderbar | Gelöst durch den autoritativen Server (Abschnitt 6). Offline bleibt Entwicklungswerkzeug |
| Ich kann nur in Chromium prüfen | Safari-Eigenheiten sehe ich hier nicht | Früh und regelmässig auf deinem echten iPhone gegentesten |
