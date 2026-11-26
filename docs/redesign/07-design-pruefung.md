# 07 Design-Prüfung: Befunde und Runde 1

Stand: 26.11.2026. Zwei unabhängige Prüfungen über alle Bildschirme: eine als Art Director (Optik), eine als UX-Designer mit Schwerpunkt Belohnungsgefühl und Fairness. Grundlage waren 60 Screenshots und der Code.

## Gesamturteil

**Was trägt:** der Planet als Bühne, die Schrift, der Kartenrahmen mit Folie, die zehn gemalten Porträts, Startbild, Warp, Ankunft und die Routenwahl. Dazu ungewöhnlich ehrliche Offenlegung: Quoten, Glücksrad im Verhältnis der Chancen, Hinweis auf den Verlust bei der Bergung, "Rivalen sind simuliert".

**Was bremste:**

1. Das Spiel sah dort hochwertig aus, wo nichts auf dem Spiel steht, und billig dort, wo es zählt: Container, Schiffe und 120 von 130 Karten sind Platzhalter.
2. Text lag oft auf der hellsten Stelle des Planeten und war nicht lesbar.
3. Fast jede Belohnung kam als dieselbe kleine Meldung, die auch Fehler trägt.
4. Es gab keine Farbrollen: vier bis fünf Akzentfarben pro Bildschirm, der Umschalter war das hellste Element.
5. Quanten liessen sich mit einem einzigen Tipp ausgeben, und beim Container war der Countdown selbst der Kauf-Knopf.
6. Neue Spieler bekamen keinen nächsten Schritt, und der erste Verkauf feierte einen Gewinn von 1.

## Runde 1: umgesetzt

| Bereich | Änderung |
|---|---|
| Lesbarkeit | Dunkler Verlauf unter der Kopfzeile auf jedem Bildschirm. Auf allen Arbeits-Bildschirmen ist der Planet abgedunkelt. Ticker läuft in einem eigenen Streifen. Kopf- und Fussleiste sind deckender |
| Farbrollen | Gold heisst Belohnung abholen. Cyan heisst Auswahl und Navigation. Der Umschalter ist nur noch umrandet. Punkte für "etwas wartet" sind gold statt rot: Rot bleibt Gefahr |
| Meldungen | Erscheinen oben statt über dem Inhalt und fangen keine Tipps mehr ab |
| Grosse Momente | Stufenaufstieg, neues Schiff, Liga-Aufstieg, komplettes Saison-Album, Premium-Charter und Prestige bekommen einen Vollbild-Auftritt mit Strahlen, Klang und Haptik |
| Verkauf | Drei Grössen je nach Gewinn im Verhältnis zum Vermögen. Ein Verlust wackelt rot und klimpert nicht mehr. Der Klang folgt dem Gewinn statt dem Umsatz |
| Geldbeutel | Credits und Quanten pulsieren und zählen hoch, wenn etwas dazukommt |
| Quanten ausgeben | Jede Ausgabe braucht zwei Tipps: Der erste sagt, was es kostet, der zweite bestätigt. Gilt für Beschleunigen, Premium-Container, Charter, Lackierung, Urlaubsschein, Konvoi und Freikaufen |
| Container-Plätze | Der Countdown ist nur noch Text. "Sofort" ist ein eigener Knopf |
| Auswege | Jedes Fenster hat oben rechts ein X |
| Auktion | "Sofort kaufen" ist nicht mehr der goldene Hauptknopf und sagt, wie weit der Preis über dem Schätzwert liegt. "Überboten" pulsiert nicht mehr und fragt nicht mehr "erhöhen?" |
| Serie | Rot und pulsierend erst in den letzten drei Stunden. Davor ruhig in Bernstein |
| Prestige | "Neu anfangen" trägt nicht mehr die Belohnungsfarbe |
| Einstieg | Karte "Erste Schritte" mit vier Schritten auf der Station. Der Hauptknopf heisst "Fracht kaufen", solange der Laderaum leer ist, und nennt sonst die beste Route für die geladene Ware. Der erste Kauf schlägt einen vollen Laderaum vor |
| Hangar | "Garantiert in N Containern" steht direkt unter dem Gratis-Container |
| Charter | Belohnungen als Kacheln mit Symbol an einer Schiene statt als Texttabelle. Abgeholtes trägt einen Haken statt durchgestrichen zu sein |
| Kalender | Grössere Tage zum Wischen statt sieben winziger Felder |
| Karten | Fehlende Karten zeigen eine Silhouette in Fraktionsfarbe statt eines schwarzen Kastens. Miniaturen zeigen nur Bild und Wertung |
| Tippflächen | Knöpfe sind mindestens 44 Pixel hoch |
| Fehler | Die Haptik in Enthüllung und Sprung umging den Haptik-Schalter. Nach einem Sprung öffnete der Markt die Auktionen statt der Waren |

## Runde 2: offen

Nach Wirkung geordnet. S unter einer halben Stunde, M Stunden, L ein Tag oder mehr.

| # | Thema | Aufwand |
|---|---|---|
| 1 | Erledigt am 26.11.: Der Container erscheint, wackelt immer stärker und bricht mit einem Blitz auf, für jeden Container gleich. Die beste Karte ist in der Zusammenfassung hervorgehoben. Offen bleibt der Knopf "Aufstellen" | Rest S |
| 2 | Erledigt am 26.11.: Zwischen Wahl und Ergebnis liegt gut eine Sekunde mit gleichmässigem Puls, für jede Wahl und jedes Ergebnis gleich. Kein Zeiger, der knapp daneben stehen bleibt | |
| 3 | Erledigt am 26.11.: Ab dem vierten Sprung einer Sitzung ist der Start kürzer, und ein Tipp überspringt ihn. Die Ankunft zeigt Kurierpost, Serie und was die Fracht am Ziel wert ist | |
| 4 | Belohnungen fliegen sichtbar zum Geldbeutel | M |
| 5 | Markt ist reine Schrift. Waren-Symbole und Zeilen in gemeinsamen Flächen statt einzelner Kästen | M, mit Grafik aus Paket F |
| 6 | Glücksrad: Beschriftung stellenweise kopfüber oder abgeschnitten, kein Ticken beim Drehen | M |
| 7 | Schriftgrössen vereinheitlichen: 25 Grössen auf 6 | M |
| 8 | Kartenrahmen soll die Seltenheit tragen, nicht nur die Farbe | M |
| 9 | Station: Mitte des Bildschirms ist leer. Platz für Schiff oder Station | M, mit Grafik aus Paket A oder K |
| 10 | Tab "Aufträge" ist überladen. Vorschlag: Manifeste zur Sammlung, Deck in Brücke, Sammlung und Konvois teilen, Hangar in Container, Shop und Werft | M |
| 11 | Einstellungen (Ton, Haptik, Erinnerungen) an einen Ort mit eigenem Symbol | S |
| 12 | Deck zeigt, wenn eine bessere Karte für einen Platz vorhanden ist | M |
| 13 | Tagesaufträge: Truhe mit Fortschritt im Kopf, "Alles abholen" | M |
| 14 | Konvoi-Rückkehr als kurzer Moment mit Chance und Ergebnis | M |
| 15 | Radien vereinheitlichen, weniger Leuchten pro Bildschirm | S |

## Bewusst nicht umgesetzt

- **Prestige mit gedrückt halten:** Die Bestätigung in zwei Schritten mit Verlustliste reicht fürs Erste.
- **Umbenennung des Tabs "Aufträge" in "Ziele":** erst zusammen mit der Neuordnung in Runde 2.

## Fairness-Prüfung

Im Code bestätigt und unverändert sauber: Enthüllung und Glücksrad spielen nur ab, was die Regeln entschieden haben. Das Rad hält in der Mitte des Gewinnfelds. Timer laufen nach Server-Zeit. Der Streichpreis im Tagesangebot ist der echte Normalpreis. Bei Verlust (Begegnung, Serie, Abstieg) erscheint kein Angebot.

Die acht beanstandeten Stellen (Countdown als Kauf-Knopf, Ausgaben mit einem Tipp, fehlende Schliessen-Knöpfe, Formulierung beim Premium-Charter, "Sofort kaufen" als Hauptknopf, "Überboten: erhöhen?", früher Serien-Alarm, umgangener Haptik-Schalter) sind in Runde 1 behoben.

Für später, sobald es Echtgeld gibt: Die Preise sind heute 40, 120, 150 und 500 Quanten. Pakete müssen dazu glatt passen.
