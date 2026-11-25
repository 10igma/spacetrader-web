# 03 Roadmap

Arbeitstitel: **PROJEKT NOVA**. Grundlage: Architektur (Dokument 01) und Mechanik-Katalog (Dokument 02).

## Stand (25.11.2026)

**Phase 0 bis 3 sind umgesetzt, inklusive Konvoi-Missionen. Neu dazu: die Werft mit sechs Schiffen und sechs Modulen als Geldsenke. Aus Phase 4 steht der simulierte Teil:** Saison-Charter mit Gratis- und Premium-Spur, Wochenliga mit Auf- und Abstieg gegen simulierte Rivalen, das Wochenend-Event Blockade-Lauf und der Rückkehr-Bonus. Aus Phase 3 spielbar: grosses Kartenset mit Aufwertung und Schmieden, Container-Stufen mit Slots und Timern, Sammelalben, Tagesaufträge, Login-Kalender, Handelsserie, Handelsposten mit Offline-Ertrag, Glücksrad, Tages-Shop, Manifeste, Bergungs-Auktion und das Auktionshaus.

| Baustein | Stand | Geprüft durch |
|---|---|---|
| Kern: Commands, Events, Seed-RNG, Zeit als Eingabe | fertig | 99 Unit-Tests |
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
| Auktionshaus: acht laufende Auktionen, Bieten mit Limit und hinterlegtem Betrag, Sofortkauf, eigene Duplikate anbieten | fertig | 16 Tests: Limit des Gegenbieters erreicht den Client nie, Gewinner zahlt nie mehr als sein Limit, Angebot hängt nicht vom Mindestpreis ab |
| Saison (6 Wochen) mit Charter: 40 Stufen, Gratis-Spur und Premium-Spur für 500 erspielte Quanten, schon Erspieltes wird beim Kauf nachgezahlt | fertig | Tests: Reihenfolge, Nachzahlung, kein doppeltes Abholen, Saisonwechsel setzt zurück |
| Wochenliga: 30er-Tabelle, 5 Ligen von Bronze bis Diamant, Platz 1 bis 7 steigt auf, 26 bis 30 steigt ab. Wertung ist der Handelsgewinn der Woche | fertig | Tests: Rivalen hängen nie vom Spieler ab, Punkte fallen nie, Endstand ist reproduzierbar, ungespielte Wochen zählen nicht |
| Wochenend-Event Blockade-Lauf (Samstag und Sonntag): mehr Zoll, bessere Hehlerpreise, Meilensteine mit Belohnungen | fertig | Tests: wirkt nur am Wochenende, Meilensteine der Reihe nach, neue Woche setzt zurück |
| Rückkehr-Bonus nach 3 Tagen Pause: Credits nach Stufe, Quanten, Container, voller Tank | fertig | Tests |
| Werft: sechs Schiffe von 45'000 bis 2.8 Millionen Credits mit Stufengrenze. Sie bringen Laderaum, Tank, Modulplätze und Boni auf Kampf, Flucht und Scan | fertig | Tests: Kauf, Wechsel nur mit passender Fracht, angezeigte Chancen sind die gewürfelten |
| Module in drei Stufen: Schildgitter, Nachbrenner, Signalstörer, Frachtgondeln, Fusionslader, Schmuggelfach. Sie wirken nur eingebaut | fertig | Tests: Preise, Plätze, Schmuggelfach rettet die wertvollsten Einheiten durch einen Scan |
| Konvois: Reserve-Crew fliegt Aufträge von 1, 4 und 8 Stunden. Vier Aufträge pro Tag, zwei gleichzeitig, Sofort-Rückkehr gegen Quanten | fertig | Tests: Erfolg tritt so oft ein wie angezeigt (1'500 Würfe), Karten gehen nie verloren, Crew im Konvoi kann nicht auf die Brücke |
| Gemalte Kartenporträts mit Rückfall auf prozedurale Avatare | fertig, alle 10 Legenden und Singularitäten | Screenshots, siehe Dokument 04 |
| Rote Punkte für alles Abholbare | fertig | Tests |
| Bot-Simulation | fertig | Zwei Spielertypen, je 12 Spieler über 60 Tage, dazu Leitplanken-Test |
| Autoritativer Server (Skelett) | fertig | 27 Betrugsversuche gegen die Befehle aus Phase 3 abgewiesen, dazu 7 gegen Charter, Liga, Event und Rückkehr-Bonus und 16 gegen Werft und Konvois |
| Bühne, UI, Musik und Effekte | fertig | Acht automatische Durchläufe ohne Konsolenfehler |

### Balance nach Simulation

Median von je 12 simulierten Spielern, drei Sessions pro Tag, 60 Tage:

| | Tag 1 | Tag 7 | Tag 14 | Tag 30 | Tag 60 |
|---|---|---|---|---|---|
| Sprünge kumuliert | 26 | 125 | 256 | 558 | 1'127 |
| Stufe | 5 | 10 | 14 | 19 | 24 |
| Gewinn pro Sprung legal | 1'500 | 4'400 | 5'700 | 6'600 | 7'600 |
| Gewinn pro Sprung Schmuggel | 1'900 | 6'300 | 8'000 | 9'900 | 11'200 |
| Vermögen legal | 16'000 | 100'000 | 217'000 | 654'000 | 1'620'000 |
| Schiff | Sperling | Kormoran | Nachtfalter | Basilisk | Leviathan |
| Modul-Stufen von 18 | 0 | 7 | 12 | 18 | 18 |
| Karten von 130 | 12 | 98 | 122 | 127 | 130 |
| Legenden von 10 (Durchschnitt) | 0.0 | 0.8 | 2.8 | 6.8 | 9.8 |
| Container geöffnet | 3 | 38 | 89 | 210 | 440 |
| Beschlagnahmungen Schmuggel | 0.8 | 4.8 | 10.0 | 18.6 | 36.3 |

- **Werft:** Kormoran in der ersten Woche, Lanze und Nachtfalter in der zweiten, Basilisk um Tag 30, Leviathan zwischen Tag 45 und 55. Alle Module sind um Tag 30 auf Stufe 3. Schiffe und Module binden zusammen rund 6 Millionen Credits.
- **Konvois:** rund 4 pro Spieler und Tag, 87 Prozent erfolgreich. Die Anforderung wächst mit der Stufe des Kapitäns, damit lange Aufträge ein Risiko bleiben und Splitter für die Reserve einen Sinn haben.
- **Erste Legende:** Median Tag 6 bis 7, schnellstes Zehntel Tag 4, langsamstes Tag 9. Ziel war Tag 5 bis 10.
- **Erstes volles Album:** Median Tag 17 bis 23 je nach Lauf (vor Phase 4: Tag 24 bis 28). Ziel war um Tag 30, siehe Offen.
- **Energie:** erster Tag grosszügig (26 Sprünge), danach rund 16 pro Tag, mit grösserem Tank und Fusionslader rund 19.
- **Auktionshaus:** rund 1 bis 2 Gebote und 5 eigene Angebote pro Spieler und Tag.
- **Charter:** Wer dreimal täglich spielt, steht an Tag 7 auf Stufe 8, an Tag 14 auf Stufe 19 und schliesst die 40 Stufen vor Tag 30 von 42 ab. Eine Stufe braucht jetzt 1'800 statt 1'500 Erfahrung, weil Konvois zusätzliche Erfahrung bringen. Die Premium-Spur leisten sich die Bots im Median an Tag 9 aus erspielten Quanten.
- **Liga:** Aufstieg bis Gold in zwei Wochen, Platin nach drei bis vier.

Was die Simulation unterwegs aufgedeckt hat:

1. **Erste Fassung der Wirtschaft:** Stufe 22 und 400'000 Credits an Tag 1. Behoben durch Preiswirkung grosser Mengen, engere Preisspannen und eine steilere Stufenkurve.
2. **Erste Fassung von Phase 3:** erste Legende an Tag 3 bis 4, 120 von 130 Karten nach zwei Wochen. Ein Tageslimit allein half nicht, weil reiche Spieler einfach täglich das Maximum kauften. Jetzt steigt der Standard-Preis pro Tag mit jedem Kauf auf das Vierfache, Premium kostet Quanten, Gratis-Container kommen alle 12 statt 4 Stunden, und Legenden sind seltener.
3. **Nebeneffekt:** Die steigenden Container-Preise binden überschüssige Credits. Das Vermögen an Tag 30 fiel von 1.7 Millionen auf rund 530'000.
4. **Mit Shop, Manifesten und Auktionshaus** kam das erste Album wieder zu früh (Tag 15 bis 20). Höhere Schmiedekosten änderten nichts. Der Treiber war die schiere Menge an Containern (rund 7 pro Tag). Gelöst über die Legenden-Quote: 0.5 statt 0.8 Prozent pro Karte im Standard-Container, weniger Legenden in Auktionen und im Shop.
5. **Der Leitplanken-Test** hat einen Fehler in den Bots gefunden: Sie gaben ein zweites Manifest ab, nachdem das erste dieselben Duplikate verbraucht hatte. Die Regeln haben es korrekt abgelehnt.
6. **Erste Fassung der Konvois:** 100 Prozent Erfolg, weil eine breite Sammlung jede Anforderung mühelos erfüllte. Jetzt wächst die Anforderung mit der Stufe.
7. **Erste Fassung der Werft:** Der Leviathan war nach sechs Wochen gekauft. Die beiden grossen Schiffe und die dritte Modulstufe kosten jetzt deutlich mehr.

Die Bots spielen diszipliniert und holen jeden Tag alles ab. Echte Spieler lassen Tage aus und kommen langsamer voran, finden dafür bessere Routen. Die Zahlen sind eine Planungsgrundlage und kein Ersatz für Messung an Menschen.

**Nicht geprüft, weil hier nicht prüfbar:** wie Musik und Effekte klingen, Bildrate auf echten Handys, Verhalten in Safari, Gyroskop und Haptik. Das braucht deinen Test auf dem Gerät.

**Offen:**
- **Auktionshaus und Liga sind simuliert.** Gegenbieter, Käufer und Liga-Rivalen sind Zufallsgrössen mit festen Grenzen, keine echten Spieler. Die Liga sagt das auf dem Bildschirm. Echte Mitspieler brauchen Konten, Datenbank und Schutz gegen Absprachen (zweiter Teil von Phase 4).
- **Rest von Phase 4:** Sonderkarten der Saison, Ticker, Schaukasten und Kosmetik, Prestige, Telemetrie. Die Saison wechselt bisher nur Name und Charter, noch keine Karten-Edition.
- **Premium-Charter ist für fleissige Spieler gratis.** 500 Quanten sind nach gut einer Woche erspielt. Das ist gewollt, solange es kein Echtgeld gibt, muss aber vor Phase 6 neu gerechnet werden.
- **Sammeltempo.** Das erste Album kommt mit Phase 4 rund eine Woche früher als geplant. Sobald Saison-Karten das Set vergrössern, verschiebt sich das wieder. Bis dahin lasse ich die Quoten stehen.
- **Geld im Spätspiel.** Die Werft bindet das Geld bis etwa Tag 50. Danach sammelt es sich wieder an (Schmuggler: 3 Millionen an Tag 60). Für die Zeit danach braucht es Saison-Inhalte, Kosmetik oder Prestige.
- **Vermögen der Bots täuscht.** Sie sparen stur auf das nächste Schiff und kaufen dann nur zwei Container pro Tag. Echte Spieler verteilen ihr Geld anders.
- **Schiffe sind Umrisse.** Die sechs Schiffe haben einfache Vektor-Silhouetten, keine gemalte Kunst, und fliegen noch nicht sichtbar durch die Warp-Szene.
- **Kartenkunst.** Die 10 höchsten Karten sind gemalt, 120 zeigen Helme. Vorgehen in Dokument 04.
- **Legenden-Tempo.** 7 von 10 nach 30 Tagen passt nur zu Saisons von sechs Wochen mit neuen Karten. Die Saison-Edition fehlt noch.
- **Tages- und Wochengrenze.** Mitternacht und Montag nach mitteleuropäischer Winterzeit, ohne Sommerzeit und ohne Zeitzone des Spielers.
- **Push-Nachrichten fehlen.** Serie in Gefahr und volle Lager wirken erst mit Erinnerung richtig (Phase 5).
- **Aus Phase 2:** Lizenzen, gefälschte Papiere, Veredelung, Versicherung. Verstecke gibt es jetzt als Modul Schmuggelfach.
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
| 5 | Backend und echte Mitspieler? | Entschieden: zuerst simuliert, Backend später | Rest von Phase 4 |
| 6 | Echtgeld? | Entscheid nach der Beta | Phase 6 |

## Nächster Schritt

Zur Wahl stehen drei Stränge. Meine Empfehlung ist die Reihenfolge, in der sie hier stehen:

1. **Saison-Inhalt:** Sonderkarten pro Saison (nach 60 Tagen ist das Set komplett), Ticker, Schaukasten und Kosmetik, Prestige.
2. **Phase 5:** Capacitor-Hülle, Push-Nachrichten (Konvoi zurück, Serie in Gefahr, Lager voll), Haptik, Test auf echten Geräten.
3. **Rest aus Phase 2:** Lizenzen, gefälschte Papiere, Veredelung, Versicherung.

Unabhängig davon lohnt sich jetzt ein Test auf dem Handy: Die Schleife aus Handel, Sammeln, Werft, Konvois, Saison und Liga ist vollständig.
