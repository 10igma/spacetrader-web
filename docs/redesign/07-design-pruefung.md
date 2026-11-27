# 07 Design-Prüfung: Befunde und Runden

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
| 4 | Erledigt am 26.11.: Wenn Credits oder Quanten steigen, fliegen Symbole vom letzten Tipp zum Zähler | |
| 5 | Erledigt am 26.11.: Der Markt zeigt für alle 27 Waren ein Symbol, auch im Handelsfenster. Offen: Zeilen in gemeinsamen Flächen | Rest S |
| 6 | Erledigt am 26.11.: Beschriftung läuft von der Nabe zum Rand und steht in Ruhe nie kopf, Rand mit Lichtern, Ticken und Haptik pro Feld, Gewinnfeld leuchtet | |
| 7 | Schriftgrössen vereinheitlichen: 25 Grössen auf 6 | M |
| 8 | Kartenrahmen soll die Seltenheit tragen, nicht nur die Farbe | M |
| 9 | Erledigt am 26.11.: Das eigene Schiff liegt in der Mitte der Station am Dock | |
| 10 | Erledigt am 26.11.: Hangar in Container, Shop und Werft. Deck in Brücke, Sammlung und Konvois. Manifeste liegen bei der Sammlung. Das Wochenend-Event steht oben in "Heute", solange es läuft | |
| 11 | Erledigt am 26.11.: Zahnrad oben rechts öffnet Ton, Haptik und Erinnerungen | |
| 12 | Erledigt am 26.11.: Plätze zeigen "▲ +N", wenn die Reserve jemand Besseren hat. Nach einem Container bietet die Zusammenfassung "Crew neu aufstellen" an | |
| 13 | Teilweise am 26.11.: "Alle abholen" bei zwei oder mehr fertigen Aufträgen. Offen: Truhe mit Fortschritt im Kopf | Rest S |
| 14 | Konvoi-Rückkehr als kurzer Moment mit Chance und Ergebnis | M |
| 15 | Radien vereinheitlichen, weniger Leuchten pro Bildschirm | S |

## Runde 3: Entschlackung (26.11.2026)

Anlass: Nach dem ersten Spielen auf dem Handy wirkte vieles überladen. Die Informationen liessen sich nicht sauber aufnehmen.

### Befund

Jedes neue System hatte eine weitere Textkarte auf denselben Bildschirm gelegt. Auf der Station standen im vollsten Zustand rund 30 Elemente: bis zu fünf Chips, bis zu vier Textkarten mit ganzen Sätzen, ein laufender Ticker, das Schiff, drei Kacheln, der Hauptknopf. Dieselbe Krise stand an drei Stellen: als Karte, im Ticker und nochmals in der Routenwahl. In der Routenwahl schob das die eigentlichen Sprungziele aus dem Bild.

### Wie andere Mobile-Games das lösen

Aus meiner Kenntnis der Genre-Vertreter, nicht aus einer neuen Recherche:

| Muster | Beispiele | Für Nova |
|---|---|---|
| Der Startbildschirm hat eine Figur in der Mitte und einen grossen Knopf. Alles andere sind kleine Symbole am Rand mit einer Marke | Clash Royale, Brawl Stars | Schiff in der Mitte, ein Hauptknopf, Symbolleiste am Rand |
| Symbole und Zahlen statt Sätze. Der Satz kommt erst nach dem Tipp | Fast alle | Karten mit ganzen Sätzen ersetzt |
| Ereignisse erscheinen nacheinander, nicht gestapelt | Monopoly Go, Coin Master | Meldungen und grosse Momente laufen schon in einer Warteschlange |
| Listenzeilen zeigen zwei bis drei Werte | Handels- und Aufbauspiele | Marktzeile: Name, Abweichung, Preis |
| Systeme werden über die ersten Stunden freigeschaltet, jedes mit einem kleinen Auftritt | Fast alle | Noch offen, siehe unten |
| Der Hauptknopf beantwortet immer "was jetzt" | Clash Royale (Kampf), Marvel Snap (Spielen) | Abliefern, Fracht kaufen, Weiter nach X, Sternkarte |

Nichts davon nimmt eine Mechanik weg. Es ändert nur, wann und wie viel man davon sieht.

### Umgesetzt

| Bereich | Vorher | Nachher |
|---|---|---|
| Station | Textkarten für Krisen, Lieferaufträge und Bergung, dazu ein laufender Ticker | Symbolleiste am rechten Rand: je ein rundes Symbol mit Marke für Fracht, Krisen und Bergung. Der Ticker ist weg |
| Station, Chips | Bis zu fünf (Zoll, gefragte Ware, Event, Serie, Fahndung) | Zoll und höchstens ein Zustand. Rangfolge: Fahndung, Serie in Gefahr, Event |
| Station, Hauptknopf | Sternkarte oder Fracht kaufen | Zuerst "Abliefern", wenn eine Lieferung hier bereit ist |
| Sternkarte | Je eine Textkarte pro Krise und Auftrag unter der Karte | Eine Zeile mit Zielen zum Antippen |
| Sprungziele | Name, Fraktion und Beiname, Risiken, alle Warenhinweise, Hinweistext | Name, Risiken, die zwei besten Waren. Krise als ein Etikett |
| Kurs | Weg über alle Zwischenstationen, Krise als ganzer Satz | Sprünge und Treibstoff, Krise und Auftrag je eine kurze Zeile |
| Markt | Kategorie und Verkaufspreis in jeder Zeile | Name, Abweichung, Preis. Eine zweite Zeile nur für Ware an Bord oder verbotene Ware |
| Frachtbörse | Drei Zeilen Fliesstext pro Angebot | Drei Werte: Frist, Pfand, Gewinn. Erklärung in einem Satz |
| Vibration im Browser | Jeder Tipp vibrierte | Nur noch Ereignisse: Geld, Warnung, Verlust, Sprung, Karten. In der App bleibt der leichte Tipp |

### Runde 4: die vier Vorschläge aus Runde 3 (27.11.2026)

| # | Thema | Stand |
|---|---|---|
| 1 | Schrittweise Freischaltung | Erledigt. Ein neuer Kapitän sieht Station, Markt und Hangar mit Containern. Das Deck kommt mit der ersten Crew, Aufträge ab Stufe 2, Handelsposten, Shop und Frachtbörse ab 3, Werft, Saison-Charter und Bergung ab 4, Auktionshaus und Liga ab 5, Konvois ab 6. Der Stufenaufstieg nennt, was neu ist. Neues trägt eine türkise Marke, bis man es einmal geöffnet hat. Wer schon spielt, bekommt keine Marken. Nach einem Prestige bleibt alles offen |
| 2 | Sprung direkt auf der Sternkarte | Erledigt. Statt einer Liste von Sprungzielen gibt es eine einzige Zielkarte: Station antippen, die Karte zeigt Weg, Risiko des nächsten Sprungs, die zwei besten Waren und den Sprung-Knopf. Ohne Kurs schlägt die Karte das Ziel vor, das am besten verkauft. Das ganze Fenster passt ohne Scrollen auf einen Bildschirm |
| 3 | Schrift, Ecken und Leuchten vereinheitlichen | Erledigt. Sechs Textgrössen statt 20 (10, 12, 14, 16, 20, 26 Pixel), vier Eckenradien statt 16. Leuchten gibt es nur noch für drei Dinge: den Hauptknopf, Abholbares und Seltenheit. 33 Leuchteffekte an Balken, Punkten und Chips sind weg. Punkte pulsieren nicht mehr. 67 Regeln für entfernte Elemente sind gelöscht |
| 4 | Tab "Aufträge": Serie, Glücksrad und Kalender als Symbolreihe | Erledigt. Drei Symbole oben: Serie mit Tageszahl, Glücksrad, Kalender mit der Belohnung von heute. Ein Tipp auf den Kalender holt sie direkt ab, Serie und Kalender klappen ihre Details auf. Der Tagesbonus steht mit Fortschritt über den Tagesaufträgen |
| 5 | Kacheln der Station in die Symbolleiste | Erledigt. Container und Handelsposten sind Symbole am linken Rand, der Tank ist eine Zeile über dem Hauptknopf. Die Mitte gehört der Station und dem Schiff |

**Wichtig zur Freischaltung:** Sie ändert keine Regel. Jedes System läuft von der ersten Minute an, und was es einbringt, wartet. Gesperrt ist nur der Weg dorthin in der Oberfläche. Der Server prüft die Stufen nicht, mit Ausnahme der Frachtbörse, die schon vorher ab Stufe 3 galt.

### Container-Öffnung, zweite Fassung (27.11.2026)

Anlass: Die Öffnung wirkte zu brav. Der Container stand im Leeren, wackelte kurz und wurde gegen ein offenes Bild getauscht.

| Akt | Was passiert |
|---|---|
| Aufprall | Der Container fällt von oben herein, federt nach und schlägt eine Druckwelle |
| Drei Schläge | Jeder Tipp ist ein Schlag: Der Container zuckt, Licht drückt stärker aus den Fugen, Ton und Vibration steigen. Wer nicht tippt, sieht ihn nach je einer Sekunde von selbst aufbrechen |
| Explosion | Blitz, Druckring, Trümmerfunken, der Bildschirm bebt kurz, eine Lichtsäule schiesst nach oben. Dieser Moment lässt sich nicht überspringen |
| Karte steigt auf | Jede Karte kommt einzeln verdeckt aus dem Container. Oben zeigen Marken, wie viele noch drin sind |
| Farbsignal | Das Licht hinter der Kartenrückseite nimmt die Farbe der Seltenheit an. Je seltener, desto länger die Spannung: Ab Elite zittert die Karte, bei Legende und Singularität wird der Bildschirm dunkel und die Karte schwillt an |
| Umdrehen | Die Karte dreht sich mit einem Lichtblitz um. Das Wort der Seltenheit fährt hinter ihr ein, Funken und Strahlen wachsen mit der Seltenheit, bei Legenden regnet es in ihrer Farbe |
| Abgang und Übersicht | Die Karte fliegt weg, die nächste steigt auf. Am Ende werden alle Karten ausgeteilt, die beste leuchtet auf |

**Fairness, unverändert:** Die Karten stehen fest, bevor die Öffnung beginnt. Aufprall, Schläge und Explosion sind für jeden Container gleich und sagen nichts über den Inhalt. Das erste Signal ist die Farbe hinter der Karte, und sie ist immer die echte Seltenheit. Beim Aufwertungs-Moment zeigt sie zuerst die gewürfelte und dann die höhere Seltenheit, wie die Regeln es entschieden haben. Es gibt kein Beinahe-Treffer-Bild.

### Letzte Reste aus Runde 2 (27.11.2026)

| Thema | Stand |
|---|---|
| Kartenrahmen trägt die Seltenheit | Erledigt. Der Rahmen wird Stufe um Stufe dicker und reicher: Standard dünn und matt, Selten schimmernd, Elite mit Eckwinkeln, Legende in Gold, Singularität als Prisma. Auch in der Miniatur ohne Schrift lesbar |
| Konvoi-Rückkehr als Moment | Erledigt. Zuerst die Chance als Ring, dann nach einem immer gleich langen Augenblick das Ergebnis mit Belohnung. Kein Zeiger, der knapp daneben stehen bleibt |
| Schiff im Sprung | Erledigt. Die Sprung-Szene zeigt das Schiff von hinten, in den Tunnel gedreht |

### Sternkarte als ein Bildschirm (27.11.2026)

Anlass: Die Sternkarte wirkte falsch zusammengesetzt. Titel, Karte und Zielkarte schwebten einzeln über dem abgedunkelten Hintergrund, und der Sektor lag als Oval in einem eckigen Rahmen mit toten Ecken.

| Vorher | Nachher |
|---|---|
| Einzelne Teile ohne gemeinsame Fläche | Eine geschlossene Fläche hält Titel, Karte und Ziel zusammen |
| Sektor als Oval im Rechteck | Die Gebiete füllen den Rahmen bis an den Rand, mit feinem Raster wie auf einer gedruckten Karte |
| Auf hohen Bildschirmen blieb die Karte klein, auf kurzen rutschte der Sprung-Knopf aus dem Bild | Die Karte behält ihre Form und gibt auf kurzen Bildschirmen zuerst nach. Der Sprung-Knopf bleibt immer sichtbar |

Geprüft bei 390 mal 844, 360 mal 640 und 731 mal 993 Pixeln.

## Bewusst nicht umgesetzt

- **Prestige mit gedrückt halten:** Die Bestätigung in zwei Schritten mit Verlustliste reicht fürs Erste.
- **Umbenennung des Tabs "Aufträge" in "Ziele":** erst zusammen mit der Neuordnung in Runde 2.

## Fairness-Prüfung

Im Code bestätigt und unverändert sauber: Enthüllung und Glücksrad spielen nur ab, was die Regeln entschieden haben. Das Rad hält in der Mitte des Gewinnfelds. Timer laufen nach Server-Zeit. Der Streichpreis im Tagesangebot ist der echte Normalpreis. Bei Verlust (Begegnung, Serie, Abstieg) erscheint kein Angebot.

Die acht beanstandeten Stellen (Countdown als Kauf-Knopf, Ausgaben mit einem Tipp, fehlende Schliessen-Knöpfe, Formulierung beim Premium-Charter, "Sofort kaufen" als Hauptknopf, "Überboten: erhöhen?", früher Serien-Alarm, umgangener Haptik-Schalter) sind in Runde 1 behoben.

Für später, sobald es Echtgeld gibt: Die Preise sind heute 40, 120, 150 und 500 Quanten. Pakete müssen dazu glatt passen.
