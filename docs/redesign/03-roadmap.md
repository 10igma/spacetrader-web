# 03 Roadmap

Arbeitstitel: **PROJEKT NOVA**. Grundlage: Architektur (Dokument 01) und Mechanik-Katalog (Dokument 02).

## Stand (25.11.2026)

**Phase 0 bis 2 sind umgesetzt, Phase 3 bis auf das Auktionshaus.** Aus Phase 3 spielbar: grosses Kartenset mit Aufwertung und Schmieden, Container-Stufen mit Slots und Timern, Sammelalben, Tagesaufträge, Login-Kalender, Handelsserie, Handelsposten mit Offline-Ertrag, Glücksrad, Tages-Shop, Manifeste und Bergungs-Auktion.

| Baustein | Stand | Geprüft durch |
|---|---|---|
| Kern: Commands, Events, Seed-RNG, Zeit als Eingabe | fertig | 83 Unit-Tests |
| Handel, Schmuggel, Sprünge, Begegnungen, Crew-Deck, Laderaum (Phase 1 und 2) | fertig | Tests und Browser-Durchläufe |
| Kartenset: 130 Karten, je Fraktion und Rolle gleich tief | fertig | Test zur Verteilung |
| Kartenstufen (Aufwerten mit Splittern) und Schmieden fehlender Karten | fertig | Tests zu Kosten, Wirkung, Obergrenze |
| Container: Standard und Premium, Aufwertungs-Moment, veröffentlichte Quoten inklusive Aufwertung | fertig | Monte Carlo über 60'000 Container, Aufwertungsrate über 20'000 |
| Gratis-Container (alle 12 Stunden, höchstens 2 gestaut) | fertig | Test mit einer Woche Abwesenheit |
| Container-Slots: entsiegeln, einer nach dem andern, mit Quanten beschleunigen, voller Hangar verliert Beute | fertig | Tests zu Reihenfolge, Kosten, Verlust |
| Kauf: Standard wird pro Tag mit jedem Kauf teurer, Premium kostet Quanten | fertig | Tests zu Preisstufen und Tageslimit |
| Tagesaufträge mit Tagesbonus, Login-Kalender, Handelsserie mit Urlaubsschein | fertig | Tests über Tagesgrenzen hinweg |
| Sammelalben pro Fraktion mit Meilensteinen und Dauerbonus | fertig | Tests |
| Handelsposten: Bauzeit, Ertrag pro Stunde, Lager voll nach 6 Stunden, Ausbau, Beschleunigen | fertig | Tests zu Bau, Ertrag, Lagergrenze, Abholen |
| Glücksrad: ein Dreh pro Tag, Segmentgrösse entspricht der Quote | fertig | Test über 6'000 Drehs gegen die angezeigten Quoten |
| Tages-Shop: fünf Angebote, eines reduziert, je einmal kaufbar | fertig | Tests |
| Manifeste: Duplikate abgeben, die letzte Kopie bleibt immer | fertig | Tests |
| Bergungs-Auktion: versiegelter Container, Quoten vor dem Kauf sichtbar | fertig | Test über 4'000 Käufe gegen die angezeigten Quoten |
| Gemalte Kartenporträts mit Rückfall auf prozedurale Avatare | fertig, 1 Beispielkarte | Screenshot, siehe Dokument 04 |
| Rote Punkte für alles Abholbare | fertig | Tests |
| Bot-Simulation | fertig | Zwei Spielertypen, je 20 Spieler über 30 Tage, dazu Leitplanken-Test |
| Autoritativer Server (Skelett) | fertig | Zwanzig Betrugsversuche gegen die Befehle aus Phase 3 abgewiesen |
| Bühne, UI, Musik und Effekte | fertig | Fünf automatische Durchläufe ohne Konsolenfehler |

### Balance nach Simulation

Median von je 20 simulierten Spielern, drei Sessions pro Tag, 30 Tage:

| | Tag 1 | Tag 7 | Tag 14 | Tag 30 |
|---|---|---|---|---|
| Sprünge kumuliert | 26 | 130 | 243 | 495 |
| Stufe | 5 | 10 | 13 | 17 |
| Gewinn pro Sprung legal | 2'200 | 4'600 | 5'700 | 6'600 |
| Gewinn pro Sprung Schmuggel | 2'800 | 5'800 | 7'400 | 8'800 |
| Vermögen legal | 23'000 | 165'000 | 175'000 | 451'000 |
| Karten von 130 | 9 | 82 | 119 | 127 |
| Legenden von 10 (Durchschnitt) | 0.1 | 1.5 | 3.4 | 6.3 |
| Container geöffnet | 3 | 39 | 88 | 201 |
| Beschlagnahmungen Schmuggel | 0.6 | 5.5 | 9.7 | 20.4 |

- **Erste Legende:** Median Tag 5 bis 6, schnellstes Zehntel Tag 2, langsamstes Tag 10. Ziel war Tag 5 bis 10.
- **Erstes volles Album:** Median Tag 19 bis 20. Ziel war um Tag 30. Shop, Manifeste und Bergung haben es gegenüber der Fassung davor (Tag 26) beschleunigt.
- **Energie:** erster Tag grosszügig (26 Sprünge), danach rund 16 bis 17 pro Tag.
- **Handelsposten:** nach 30 Tagen im Median 21 Ausbaustufen über alle Stationen. Sie binden Credits: Das Vermögen stagniert zwischen Tag 7 und 14, weil investiert wird.

Was die Simulation unterwegs aufgedeckt hat:

1. **Erste Fassung der Wirtschaft:** Stufe 22 und 400'000 Credits an Tag 1. Behoben durch Preiswirkung grosser Mengen, engere Preisspannen und eine steilere Stufenkurve.
2. **Erste Fassung von Phase 3:** erste Legende an Tag 3 bis 4, 120 von 130 Karten nach zwei Wochen. Ein Tageslimit allein half nicht, weil reiche Spieler einfach täglich das Maximum kauften. Jetzt steigt der Standard-Preis pro Tag mit jedem Kauf auf das Vierfache, Premium kostet Quanten, Gratis-Container kommen alle 12 statt 4 Stunden, und Legenden sind seltener.
3. **Nebeneffekt:** Die steigenden Container-Preise binden überschüssige Credits. Das Vermögen an Tag 30 fiel von 1.7 Millionen auf rund 530'000.

Die Bots spielen diszipliniert und holen jeden Tag alles ab. Echte Spieler lassen Tage aus und kommen langsamer voran, finden dafür bessere Routen. Die Zahlen sind eine Planungsgrundlage und kein Ersatz für Messung an Menschen.

**Nicht geprüft, weil hier nicht prüfbar:** wie Musik und Effekte klingen, Bildrate auf echten Handys, Verhalten in Safari, Gyroskop und Haptik. Das braucht deinen Test auf dem Gerät.

**Offen:**
- **Rest von Phase 3:** Auktionshaus mit Bieten gegen simulierte Händler, Konvoi-Missionen.
- **Album-Tempo.** Tag 19 bis 20 statt 30. Manifeste werden von fleissigen Spielern fast täglich erfüllt und bringen Container. Vor der Beta nachziehen.
- **Kartenkunst.** Eine Beispielkarte mit generiertem Porträt, Vorgehen und offene Fragen in Dokument 04.
- **Legenden-Tempo.** 6.5 von 10 nach 30 Tagen passt zu Saisons von sechs Wochen mit neuen Karten (Phase 4). Ohne Saisons wäre es zu schnell.
- **Tagesgrenze.** Mitternacht nach mitteleuropäischer Winterzeit, ohne Sommerzeit und ohne Zeitzone des Spielers.
- **Push-Nachrichten fehlen.** Serie in Gefahr und volle Lager wirken erst mit Erinnerung richtig (Phase 5).
- **Aus Phase 2:** Lizenzen, Verstecke, gefälschte Papiere, Veredelung, Versicherung.
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

Auktionshaus (Bieten und Verkaufen gegen simulierte Händler) als letzter grosser Baustein von Phase 3, dazu die Porträts der zehn Legenden und Singularitäten, sobald der Weg dafür entschieden ist. Danach Phase 4 mit Saisons, Ligen und Events.
