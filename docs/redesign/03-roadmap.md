# 03 Roadmap

Arbeitstitel: **PROJEKT NOVA**. Grundlage: Architektur (Dokument 01) und Mechanik-Katalog (Dokument 02).

## Stand (25.11.2026)

**Phase 0 und 1 sind umgesetzt, Phase 2 zum grössten Teil.** Spielbar sind Handel mit 27 Waren, Schmuggel mit Hehler und Fahndung, Sprünge mit Begegnungen, das Crew-Deck mit Chemie, Container und Laderaum-Ausbau.

| Baustein | Stand | Geprüft durch |
|---|---|---|
| Kern: Commands, Events, Seed-RNG, Zeit als Eingabe | fertig | 50 Unit-Tests |
| Container mit Quoten, Garantie, Pity, Splitter | fertig | Monte Carlo über 60'000 Container |
| Waren: 27 Güter in 8 Kategorien, drei Legalitätsstufen, Verbote pro Fraktion | fertig | Tests zur Rechtslage pro Fraktion |
| Markt: Preisprofile pro Station, Drift, Preiswirkung grosser Mengen, Knappheits-Ereignisse | fertig | Tests: Hin- und Rückkauf verliert immer, Ereignis-Station ist immer erreichbar |
| Schmuggel: Hehler mit Tageslimit, Heisse Fracht, Fahndungsstufe mit Abklingen und Freikauf | fertig | Tests zu Limit, Hitze, Sternen, Beschlagnahmung nur verbotener Ware |
| Deck: fünf Plätze, Rollen-Passung, Fraktions-Chemie, automatische Aufstellung | fertig | Tests: Werte, Chemie, angezeigte Quoten ändern sich mit der Crew |
| Sprung, Begegnungen, Treibstoff, Stufen, Kurierprämie, Laderaum-Ausbau | fertig | Tests und Browser-Durchläufe |
| Bot-Simulation für die Balance | fertig | Zwei Spielertypen, je 40 Spieler über 14 Tage, dazu Leitplanken-Test |
| Autoritativer Server (Skelett) | fertig | Browser-Durchlauf gegen den Server, manipulierte Befehle abgewiesen |
| Bühne, UI, Musik und Effekte | fertig | Automatische Durchläufe ohne Konsolenfehler, Pegelmessung |

### Balance nach Simulation

Die erste Simulation zeigte, dass die Wirtschaft unbrauchbar war: Stufe 22 und 400'000 Credits an Tag 1, weil jeder Stufenaufstieg den Tank füllte und Margen ohne Grenze skalierten. Nach den Korrekturen (Preiswirkung, engere Preisspannen, steilere Stufenkurve, Laderaum als Investition) sieht der Median so aus:

| | Tag 1 | Tag 3 | Tag 7 | Tag 14 |
|---|---|---|---|---|
| Sprünge kumuliert | 25 | 61 | 129 | 242 |
| Stufe | 4 bis 5 | 7 | 10 | 12 bis 13 |
| Vermögen legal | 15'000 | 70'000 | 162'000 | 295'000 |
| Vermögen Schmuggel | 18'000 | 76'000 | 184'000 | 363'000 |
| Gewinn pro Sprung legal | 1'400 | 2'500 | 3'400 | 3'800 |
| Gewinn pro Sprung Schmuggel | 1'700 | 3'300 | 4'700 | 5'500 |
| Beschlagnahmungen Schmuggel | 0.6 | 1.9 | 4.8 | 9.7 |

Lesart: Der erste Tag ist grosszügig (25 Sprünge statt 15, vier Stufen), danach taktet der Treibstoff auf rund 17 Sprünge pro Tag. Schmuggel bringt etwa 1.4-mal so viel wie legaler Handel, mit deutlich breiterer Streuung: Das schwächste Zehntel der Schmuggler steht an Tag 2 bei 2'500 Credits, das der legalen Händler bei 21'000.

Die Bots spielen vernünftig, aber nicht klug. Echte Spieler finden bessere Routen. Die Zahlen sind eine Untergrenze für geschicktes Spiel und kein Ersatz für Messung an Menschen.

**Nicht geprüft, weil hier nicht prüfbar:** wie Musik und Effekte klingen, Bildrate auf echten Handys, Verhalten in Safari, Gyroskop und Haptik. Das braucht deinen Test auf dem Gerät.

**Offen aus Phase 2:**
- **Sammlung zu klein.** 24 Karten sind nach zwei Wochen fast komplett (Median 22). Das grosse Set kommt mit Phase 3.
- **Geld ohne Ziel im Spätspiel.** Nach dem letzten Laderaum-Ausbau fehlt eine Senke. Schiffe, Module (Verstecke) und teurere Container-Stufen sind geplant.
- **Lizenzen.** Die Stufe "lizenziert" aus dem Katalog ist noch nicht gebaut, ebenso Veredelung, Versicherung und Bestechungs-Varianten.
- **Porträts.** Einfache prozedurale Helme, der schwächste Teil der Optik.
- **Speicherstand.** Im Offline-Modus lokal, bei Regeländerungen wird er verworfen. Der Server hält Sitzungen nur im Arbeitsspeicher.

## Prinzipien

1. **Zuerst das Gefühl, dann die Breite.** Phase 1 liefert fünf Minuten Spiel auf Endniveau. Erst wenn das überzeugt, wird Inhalt skaliert.
2. **Jede Phase endet spielbar.** Am Ende jeder Phase steht ein Build, den du auf deinem Handy im Browser öffnen kannst.
3. **Zahlen vor Meinungen.** Ökonomie und Quoten werden mit simulierten Spielern geprüft, bevor sie ins Spiel kommen.
4. **Echtgeld zuletzt und bewusst.** Bis Phase 5 gibt es nur erspielte Währungen.

Grössenangaben sind relativ (S, M, L, XL) und keine Kalenderzusage. Eine belastbare Zeitschätzung gebe ich nach Phase 1, wenn das Tempo real gemessen ist.

## Übersicht

| Phase | Titel | Ergebnis | Grösse |
|---|---|---|---|
| 0 | Fundament | Leeres Projekt, das rendert, klingt und sich testen lässt | S |
| 1 | Vertical Slice | Fünf Minuten auf Endniveau: ein Sprung, ein Handel, ein Container | L |
| 2 | Kern-Loop | Vollständiges Spiel ohne Metaschicht, 30 Minuten tragfähig | L |
| 3 | Sammeln und Wiederkehr | Karten, Packs, Tagesrhythmus. Trägt über Tage | XL |
| 4 | Saisons und Wettbewerb | Charter, Ligen, Events. Trägt über Wochen | L |
| 5 | Mobile-Release | Apps für Android und iOS, Haptik, Push | M |
| 6 | Monetarisierung (Tor) | Shop und Käufe, nach bewusstem Entscheid und Rechtsprüfung | M |

## Phase 0: Fundament (S)

**Inhalt**
- Bestehenden Port nach `legacy/classic` verschieben, neue Workspace-Struktur anlegen
- Kern-Gerüst: Command- und Event-System, PRNG mit Seeds, Zeit als Eingabe, Save mit Versionierung
- Bühne: PixiJS-Setup, Shader-Pipeline, Qualitätsstufen
- Audio: Engine mit Zuständen, Entsperren auf iOS
- Design-Tokens: Farben, Typografie, Abstände, Motion-Kurven
- Werkzeuge: Unit-Tests, Screenshot-Skript für Geräte-Auflösungen, CI, Vorschau-Deployment

**Fertig, wenn:** Ein animierter Sternenhintergrund mit Musik läuft in der Handy-Ansicht, Tests und Screenshot-Pipeline sind grün.

## Phase 1: Vertical Slice (L)

Das wichtigste Stück der ganzen Roadmap. Hier entscheidet sich, ob Optik und Gefühl tragen.

**Inhalt**
- Startbildschirm und 60-Sekunden-Einstieg ohne Textwände
- Stations-Hub mit Glas-Panels, Bottom-Navigation, lebendigem Hintergrund
- Ein kompletter Sprung: Routenwahl aus 3 Zielen, Laden, Warp-Tunnel, eine Begegnung, Ankunft, Verkauf mit hochzählendem Gewinn
- Ein Container-Reveal in voller Choreografie für alle fünf Seltenheiten (A2)
- Karten-Darstellung mit Holo-Folie und Neigungs-Parallaxe
- Adaptive Musik in vier Zuständen, Klangmotiv pro Seltenheit
- Katalog-Mechanismen: G1, A2

**Fertig, wenn:**
- Du den Slice auf deinem Handy spielst und sagst: Das ist das Niveau
- 60 fps auf einem Mittelklasse-Gerät, Start unter 3 Sekunden
- Der Reveal einer Legende macht auch beim zehnten Mal noch Freude

**Entscheidungstor 1:** Stil und Stack bestätigen oder korrigieren, bevor Inhalt entsteht.

## Phase 2: Kern-Loop (L)

**Inhalt**
- Prozedurale Galaxie mit Sektoren, Fraktionen, Welten mit eigenem Profil
- Ökonomie-Simulation: Güter, Angebot und Nachfrage, Ereignisse, Jackpot-Märkte (A8)
- Deck: Schiff, Crew-Plätze, Module, Chemie-System
- Begegnungen: Piraten, Zoll, Händler, Anomalien mit sichtbaren Quoten
- Heisse Fracht (A10), Beute (A7), Versicherung (G6)
- Treibstoff als Energie (C1), Level und XP, Flitterwochen-Kurve (G2)
- Währungen: Credits und Quanten (D1), Schiff personalisieren (G5)
- Lokales Speichern, Einstellungen, Barrierefreiheit (reduzierte Bewegung, Schriftgrösse)
- Balance-Werkzeug: Bot-Spieler über 30 simulierte Tage

**Fertig, wenn:** Eine Testperson freiwillig 30 Minuten spielt und "noch ein Sprung" sagt. Die Simulation zeigt eine Einkommenskurve ohne Ausreisser und ohne Sackgassen.

## Phase 3: Sammeln und Wiederkehr (XL)

Hier kommt der grösste Teil des Katalogs.

**Inhalt, in dieser Reihenfolge**
1. Kartensystem komplett: rund 150 Karten im ersten Set, Seltenheiten, Aufwertung
2. Container-Stufen, Pity (A3), Aufwertungs-Moment (A4), Splitter (A6), sichtbare Quoten
3. Sammelalben mit Set-Bonus (F3)
4. Tagesaufträge (B4), Login-Kalender (B1), Streak mit Schutz (B2, B3)
5. Gratis-Container und Slots mit Timern (B5, B6), Bauzeiten und Beschleunigen (C2, C3)
6. Handelsposten mit Offline-Ertrag (B7), Konvoi-Missionen (C4)
7. Tages-Shop (D11), Glücksrad (A11), Bergungs-Auktion (A9)
8. Auktionshaus mit simulierten Händlern (E2), Manifeste (F5)
9. Rote Punkte (G4), geschenkter Fortschritt (G3), überlappende Ziele (F4), Session-End-Haken (B11)

**Fertig, wenn:**
- Monte-Carlo-Test über eine Million Container bestätigt die deklarierten Quoten
- Bot-Simulation über 90 Tage: Gratis-Spieler erreicht definierte Meilensteine (z. B. erste Legende zwischen Tag 5 und 10, erstes volles Album um Tag 30)
- Es gibt an jedem Tag und zu jeder Tageszeit einen Grund, kurz hineinzuschauen

**Entscheidungstor 2:** Bleibt es ein Einzelspieler-Erlebnis mit simuliertem Wettbewerb, oder bauen wir ein Backend für echte Spieler? Das bestimmt den Umfang von Phase 4.

## Phase 4: Saisons und Wettbewerb (L)

**Inhalt**
- Saison-System als reine Datenänderung: Thema, Karten-Edition, Zeitplan
- Saison-Charter mit Gratis-Spur (D6), Sonderkarten (A12), Leistungsinflation mit Leitplanke (F2)
- Ligen (E1), Wochenend-Event Blockade-Lauf (F8), Ticker (E4), Schaukasten und Kosmetik (E5)
- Rückkehr-Bonus (B10), Prestige (F6)
- Falls Backend: Konto, Cloud-Speicher, Server-Zeit, echte Ranglisten, Validierung über den geteilten Kern
- Telemetrie (datensparsam, mit Einwilligung): Wiederkehr an Tag 1, 7 und 30, Session-Länge, Sessions pro Tag, Abbruchstellen

**Fertig, wenn:** Eine komplette Saison lässt sich nur über Daten ausrollen. Zwei aufeinanderfolgende Saisons laufen in der Simulation ohne Eingriff.

## Phase 5: Mobile-Release (M)

**Inhalt**
- Capacitor-Projekte für Android und iOS, Icons, Splash, Safe Areas
- Haptik-Vokabular, Push-Nachrichten mit feinem Opt-in (B9), Gyroskop für Karten
- Performance-Runde auf echten Geräten, Akku und Wärme
- Store-Anforderungen: Altersfreigabe, Datenschutzerklärung, Quoten-Offenlegung
- Geschlossener Betatest (TestFlight, Play Internal Testing)

**Voraussetzung von deiner Seite:** Mac mit Xcode und Apple-Developer-Account für iOS, Google-Play-Konto für Android.

**Fertig, wenn:** Beta läuft bei 20 bis 50 Testpersonen, Absturzrate unter 1 Prozent, Wiederkehr-Zahlen sind gemessen.

## Phase 6: Monetarisierung (M, nur nach Entscheid)

**Vorbedingung:** Die Wiederkehr-Zahlen aus der Beta stimmen. Ein Spiel, das ohne Käufe nicht bindet, wird durch einen Shop nicht besser.

**Inhalt**
- Rechtsprüfung für Zielmärkte, Entscheid zu Lootboxen pro Land
- Käufe über die Stores mit Server-Validierung (Backend dann zwingend)
- Shop mit Paketen, Starter-Angebot (D5), Anker (D4), Charter Premium (D6), Abo (D10), Sparschwein (D7), optional belohnte Werbung (D9)
- Schutzfunktionen: Echtgeld-Gegenwert, Ausgabenlimit, Kaufbestätigung
- Die roten Katalog-Einträge bleiben draussen

## Laufende Arbeitsstränge

| Strang | Was | Ab Phase |
|---|---|---|
| Balancing | Bot-Simulationen bei jeder Regeländerung | 2 |
| Visuelle Qualität | Screenshot-Vergleich aller Screens in drei Geräte-Grössen | 0 |
| Performance | Frame-Budget und Download-Grösse als automatischer Test | 1 |
| Content | Neue Karten, Güter, Ereignisse als Daten | 2 |
| Echtgeräte-Test | Regelmässig auf deinem iPhone, weil ich Safari hier nicht sehe | 1 |

## Offene Entscheide

| # | Frage | Meine Empfehlung | Blockiert |
|---|---|---|---|
| 1 | Stack | Entschieden: Web (PixiJS, React, Capacitor) mit autoritativem Server | nichts |
| 2 | Altes Spiel | Erledigt: liegt unverändert in `legacy/classic`, `main` ist unberührt | nichts |
| 3 | Name des Spiels | Arbeitstitel behalten, Namensfindung nach Phase 1 | nichts |
| 4 | Crew-Porträts: prozedural, KI-generiert oder illustriert? | Prozedurale Hologramm-Avatare für den Start | Phase 3 |
| 5 | Backend und echte Mitspieler? | Entscheid nach Phase 3 | Phase 4 |
| 6 | Echtgeld? | Entscheid nach der Beta | Phase 6 |

## Nächster Schritt

Phase 3 (Sammeln und Wiederkehr): grosses Kartenset mit Aufwertung, Container-Stufen, Sammelalben, Tagesaufträge, Login-Kalender, Streak, Gratis-Container-Slots mit Timern, Handelsposten mit Offline-Ertrag. Davor steht dein Test auf dem Handy, weil Phase 3 viel Inhalt auf das jetzige Fundament setzt.
