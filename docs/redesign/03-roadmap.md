# 03 Roadmap

Arbeitstitel: **PROJEKT NOVA**. Grundlage: Architektur (Dokument 01) und Mechanik-Katalog (Dokument 02).

## Stand (26.11.2026)

**Phase 0 bis 3 sind umgesetzt, inklusive Konvoi-Missionen. Neu dazu: die Werft mit sechs Schiffen und sechs Modulen als Geldsenke. Aus Phase 4 steht der simulierte Teil vollständig:** Saison-Charter mit Gratis- und Premium-Spur, Saison-Edition mit zwölf Sonderkarten und eigenem Album, Wochenliga mit Auf- und Abstieg gegen simulierte Rivalen, das Wochenend-Event Blockade-Lauf, der Rückkehr-Bonus, Profil mit Titeln, Lackierungen und Schaukasten, der Ticker und Prestige. Aus Phase 3 spielbar: grosses Kartenset mit Aufwertung und Schmieden, Container-Stufen mit Slots und Timern, Sammelalben, Tagesaufträge, Login-Kalender, Handelsserie, Handelsposten mit Offline-Ertrag, Glücksrad, Tages-Shop, Manifeste, Bergungs-Auktion und das Auktionshaus.

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
| Saison-Edition: zwölf Sonderkarten pro Saison (6 seltene, 4 Elite, 2 Legenden), erzeugt allein aus der Saison-Nummer. Sie fallen nur während ihrer Saison: rund 15 % der seltenen und besseren Karten aus Containern, dazu aus Auktionen, dem Premium-Charter und der Schmiede | fertig | Tests: Anteil über 2'100 Karten gemessen, Seltenheits-Quoten bleiben unverändert, nächste Saison bringt ihre eigene Edition, Werte liegen am oberen Rand der Seltenheit und nie darüber |
| Saison-Album: Belohnungen bei 4, 8 und 12 Karten. Ein komplettes Album hinterlässt einen Titel und den Lack Prisma auf Dauer | fertig | Tests: Reihenfolge, Titel überlebt den Saisonwechsel, Fortschritt nicht |
| Profil: 11 Titel für Leistungen plus einer pro Saison, 6 Lackierungen (2 gegen Quanten, 4 verdient), Schaukasten mit 3 Karten | fertig | Tests: nichts davon ändert eine Zahl, Gesperrtes lässt sich nicht setzen |
| Prestige ab Stufe 22, bis Rang 5: Stufe, Credits, Schiffe, Module und Posten weg, dafür 3 % besserer Verkaufspreis auf Dauer pro Rang | fertig | Tests: was geht, was bleibt, Bonus wirkt im Markt, Obergrenze |
| Ticker auf der Station: Liga-Abstand zum Vordermann, Saisonende und fehlende Edition-Karten, Event, Legenden im Auktionshaus, Konvois | fertig | Liest nur den echten Spielstand, keine erfundenen Meldungen |
| Mobile-Hülle (Phase 5): Android-Projekt baut zu einer installierbaren App, iOS-Projekt angelegt, Icon und Startbild, Haptik, lokale Erinnerungen mit Opt-in und Nachtruhe, Zurück-Taste, installierbare Web-App. Details in Dokument 05 | fertig bis auf Gerätetest | App hier gebaut und ihr Inhalt geprüft, 7 Tests, Durchlauf im Browser. Nicht auf einem Gerät gestartet |
| Spielstand übersteht Regeländerungen: Ältere Stände werden übernommen, neue Systeme starten leer | fertig | Tests und Durchlauf mit einem alten Spielstand |
| Design-Runde 1 nach zwei unabhängigen Prüfungen (Art Direction, UX und Fairness): Lesbarkeit, Farbrollen, Vollbild-Momente, gestufte Verkaufs-Rückmeldung, Zwei-Tipp-Bestätigung für Quanten, Schliessen-Knopf in jedem Fenster, Einstieg für neue Spieler. Details in Dokument 07 | fertig | Eigener Durchlauf mit 12 Prüfungen, dabei einen Fehler gefunden und behoben |
| Grafik-Auftrag: Stil, Formate, Dateinamen und Prompts für 127 Bilder in 11 Paketen. Dokument 06 | Pakete A bis M geliefert und eingebaut: 6 Schiffe, 4 Container, 12 Saison-Karten, 20 Elite-Karten, 4 Begegnungen, 27 Waren, 6 Module, 10 Embleme und Abzeichen, 6 Banner und Titelbild, 20 Archetypen, 3 Währungen, 8 Stationen. Dazu Paket L (4 Stationen), Paket M (6 Schiffe von hinten) und die Ersatzkarte `g094`: 137 Bilder, nichts offen | Import-Werkzeug prüft Name, Format und Hintergrund. Sichtprüfung jedes Bilds im Spiel |
| Container-Öffnung in Akten: Aufprall, drei Schläge per Tipp, Explosion mit Lichtsäule, Karten steigen verdeckt auf, Farbsignal, Umdrehen, Regen bei Legenden. Schiffe als Bilder mit Lackierung als Farbschicht | fertig | Bild-für-Bild-Aufnahmen für Standard, Legende, Singularität und Aufwertung |
| Sektor mit Raum: zwölf Stationen auf einer Sternkarte, verbunden durch Sprungbahnen. Ein Sprung folgt einer Bahn, ferne Ziele brauchen bis zu vier Sprünge. Ersetzt die drei zufälligen Routen | fertig | Tests: Karte ist zusammenhängend, Kurs ist eine Kette von Bahnen, Sprung nur entlang einer Bahn |
| Krisen (Krieg, Seuche, Versorgungskrise und weitere): bis zu zwei gleichzeitig, mindestens zwei Sprünge entfernt. Der Bedarf sinkt mit jedem Sprung um eine angezeigte Menge, weil andere liefern, und um jede Einheit, die man selbst dort verkauft | fertig | Tests: Bedarf sinkt genau wie angezeigt, direkte Fahrt kommt rechtzeitig an, eigene Lieferung beendet die Krise |
| Sternkarte mit Fraktionsgebieten, Kurs über mehrere Stationen, Anzeige "bei Ankunft noch N". Der Hauptknopf folgt dem Kurs | fertig | Eigener Durchlauf mit 13 Prüfungen |
| Expressrouten: sechs Bahnen durch die Mitte des Sektors sparen Sprünge und kosten zwei Einheiten Treibstoff statt einer. Der Kurs nimmt den Weg mit den wenigsten Sprüngen und bei Gleichstand den sparsameren. Neue Spieler starten am Ring (Lumen-Reede) | fertig | Tests: Kosten je Bahn, Kurs und Treibstoff, Sprung scheitert bei zu wenig Treibstoff |
| Lieferaufträge mit Frist (Frachtbörse, ab Stufe 3): Eine Station bestellt eine feste Menge zu festem Preis über ihrem Markt, lieferbar innert einer Anzahl Sprünge. Pfand von 10 % beim Annehmen, zurück bei Lieferung, weg bei Fristablauf. Die bestellende Station verkauft die Ware selbst nicht. Höchstens zwei gleichzeitig, drei neue Angebote an jeder Station | fertig | 10 Tests: Preis über Markt, Frist, Pfand, letzter Sprung zählt, Ausverkauf am Ziel, alte Spielstände. Eigener Durchlauf mit 23 Prüfungen |
| Rivalen bei Krisen: Zwei bis drei namentliche Händler sind mit je einem Teil des Bedarfs unterwegs. Sie rücken pro eigenem Sprung eine Bahn vor und liefern bei Ankunft ihre ganze Ladung. Die Sternkarte zeigt, wo sie sind, die Zielkarte, wer wann wie viel liefert. "Bei Ankunft Bedarf N" rechnet sie ein | fertig | Tests: Rivalen rücken genau eine Bahn vor, liefern bei Ankunft, und was die Anzeige für eine direkte Fahrt verspricht, findet man vor |
| Aufträge für Schmuggelware: Rund jeder dritte Aushang verlangt Ware, die am Ziel verboten ist. Er zahlt 30 % mehr, und der Zoll kann die Ladung unterwegs nehmen. Angeboten nur dort, wo sich die Ware legal laden lässt | fertig | Test über 60 Börsen: Anteil, Legalität an beiden Enden, Lieferung am Hehler vorbei |
| Konvoi-Rückkehr als Moment: zuerst die Chance, mit der er losfuhr, dann nach einem immer gleich langen Augenblick das Ergebnis | fertig | Durchlauf prüft, dass das Ergebnis erst nach dem Augenblick erscheint, für Erfolg und Misserfolg gleich |
| Kartenrahmen nach Seltenheit: Standard dünn und matt, Selten schimmernd, Elite mit Eckwinkeln, Legende in Gold, Singularität als Prisma | fertig | Sichtprüfung aller fünf nebeneinander |
| Schrittweise Freischaltung: Ein neuer Kapitän beginnt mit Station, Markt und Containern. Der Rest kommt bis Stufe 6 dazu, jeweils im Stufenaufstieg angekündigt und mit einer Marke versehen, bis man es geöffnet hat. Ändert keine Regel | fertig | 6 Tests, eigener Durchlauf mit 19 Prüfungen |
| Sprung direkt auf der Sternkarte: eine Zielkarte mit Sprung-Knopf statt einer Liste von Sprungzielen | fertig | Durchläufe angepasst |
| Einheitliche Gestaltung: sechs Textgrössen, vier Eckenradien, Leuchten nur für Hauptknopf, Abholbares und Seltenheit | fertig | Sichtprüfung aller Durchläufe |
| Design-Runde 2: Tabs neu geordnet (Hangar: Container, Shop, Werft. Deck: Brücke, Sammlung, Konvois), Einstellungen an einem Ort, Glücksrad überarbeitet, Belohnungen fliegen zum Geldbeutel, Markt mit Waren-Symbolen, Hinweis auf bessere Crew | fertig | Durchläufe an die neue Struktur angepasst |
| Begegnungen mit Spannungsmoment, kürzerer und überspringbarer Warp, Ankunft mit Kurierpost, Serie und Frachtwert. Währungen als Bilder im Charter | fertig | Durchlauf prüft, dass das Ergebnis erst nach dem Spannungsmoment erscheint |
| Gemalte Kartenporträts mit Rückfall auf prozedurale Avatare | fertig, alle 10 Legenden und Singularitäten | Screenshots, siehe Dokument 04 |
| Rote Punkte für alles Abholbare | fertig | Tests |
| Bot-Simulation | fertig | Drei Spielertypen (legal, Schmuggel, Kurier mit Lieferaufträgen und Krisen), dazu Leitplanken-Test für alle drei |
| Autoritativer Server (Skelett) | fertig | 27 Betrugsversuche gegen die Befehle aus Phase 3 abgewiesen, dazu 7 gegen Charter, Liga, Event und Rückkehr-Bonus 16 gegen Werft und Konvois und 14 gegen Saison-Album, Titel, Lackierungen und Prestige, dazu 9 gegen Lieferaufträge |
| Bühne, UI, Musik und Effekte | fertig | Vierzehn automatische Durchläufe ohne Konsolenfehler |

### Balance nach Simulation

Median von je 10 simulierten Spielern, drei Sessions pro Tag, 90 Tage:

| | Tag 7 | Tag 14 | Tag 30 | Tag 42 | Tag 60 | Tag 90 |
|---|---|---|---|---|---|---|
| Sprünge kumuliert | 127 | 256 | 560 | 780 | 1'129 | 1'703 |
| Stufe | 10 | 14 | 19 | 21 | 9 | 21 |
| Gewinn pro Sprung legal | 4'500 | 5'900 | 6'600 | 6'900 | 7'600 | 8'300 |
| Gewinn pro Sprung Schmuggel | 6'400 | 8'200 | 10'100 | 10'700 | 11'400 | 12'400 |
| Vermögen legal | 101'000 | 308'000 | 531'000 | 1'617'000 | 185'000 | 1'169'000 |
| Schiff | Kormoran | Lanze | Basilisk | Basilisk | neu ab Sperling | Basilisk |
| Karten der Grundsammlung von 130 | 96 | 121 | 126 | 129 | 130 | 130 |
| Legenden von 10 (Durchschnitt) | 0.6 | 2.4 | 6.1 | 8.4 | 9.8 | 9.8 |
| Saison-Edition von 12 | 6 | 10 | 12 | 12 | neue Saison | neue Saison |
| Container geöffnet | 39 | 89 | 209 | 295 | 429 | 665 |

Der Einbruch an Tag 60 ist gewollt: Die Bots machen zwischen Tag 51 und 57 ihr erstes Prestige und fangen neu an.

- **Prestige:** erstes im Median an Tag 51 (Schmuggler) bis 57 (legal). 30 Tage später stehen die Bots wieder auf Stufe 21 mit dem Basilisk. Ein Durchgang dauert damit rund 45 Tage, etwa eine Saison.
- **Saison-Edition:** 6 Karten nach einer Woche, 10 nach zwei. Die beiden Legenden sind der Engpass: Alle Bots schliessen das Album ab, aber erst zwischen Tag 28 und 37 von 42, meist über die Schmiede oder den Premium-Charter. Wer seltener spielt, schafft es nicht.
- **Werft:** Kormoran in der ersten Woche, Lanze und Nachtfalter in der zweiten und dritten, Basilisk um Tag 30, Leviathan um Tag 50. Alle Module sind um Tag 30 auf Stufe 3. Schiffe und Module binden zusammen rund 6 Millionen Credits, und mit jedem Prestige von vorn.
- **Konvois:** rund 4 pro Spieler und Tag, 90 Prozent erfolgreich.
- **Erste Legende:** Median Tag 6 (Schmuggler) bis 10 (legal), schnellstes Zehntel Tag 4, langsamstes Tag 14. Ziel war Tag 5 bis 10.
- **Erstes volles Album:** Median Tag 17 (Schmuggler) bis 27 (legal). Die Saison-Edition nimmt der Grundsammlung einen Teil der Ziehungen ab, das bremst wie gewünscht. Ziel war um Tag 30.
- **Energie:** erster Tag grosszügig (26 Sprünge), danach rund 16 pro Tag, mit grösserem Tank und Fusionslader rund 19.
- **Charter:** Stufe 8 an Tag 7, Stufe 19 an Tag 14, voll vor Tag 30 von 42. Die Premium-Spur leisten sich die Bots im Median an Tag 9 aus erspielten Quanten.
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

**Nachtrag Sektor (26.11.2026):** Mit festen Sprungbahnen verdienten legale Händler zuerst das Doppelte. Ursache war eine alte Regel: Schmuggelware wurde mit jedem Sprung teurer, auch im Kartellraum ohne Zoll. Der Aufschlag gilt jetzt nur dort, wo die Ware verboten ist. Dazu erholen sich überschwemmte Märkte langsamer, damit Pendeln zwischen zwei Stationen weniger bringt als eine Rundreise.

**Nachtrag Feinschliff (26.11.2026):** Der Schmuggel-Vorsprung war auf 14 % geschrumpft. Der eigentliche Engpass war der Hehler: Er nahm 16 Einheiten pro Station, ein spätes Schiff lädt 80 und mehr. Jetzt nimmt er 30 und erholt sich um 8 pro Sprung. Dazu steigt der Preis heisser Ware pro Sprung um 17 % statt 11 %, der Zoll findet etwas seltener (Grundchance 70 % statt 80 %) und die Busse ist kleiner (15 % statt 20 %). Stand nach 30 Tagen mit 8 Spielern je Typ:

| | legal | Schmuggel |
|---|---|---|
| Gewinn pro Sprung | 7'100 | 10'000 (41 % mehr) |
| Sprünge in 30 Tagen | 551 | 482 |
| Handelsgewinn gesamt | 3.9 Millionen | 4.8 Millionen (23 % mehr) |
| Vermögen Median | 609'000 | 683'000 |
| Erwischt | 0.3 mal | 14 mal |

Schmuggler springen seltener, weil ihre Wege öfter über die teuren Expressrouten führen.

**Nachtrag Kurier (27.11.2026):** Ein dritter Bot nimmt Lieferaufträge an und fährt ferne Krisen an. Er handelt legal und füllt den Rest des Laderaums unterwegs normal. Die erste Messung zeigte, dass Aufträge sich nicht lohnten: pro Sprung 8 % mehr als normaler Handel, über den Tag aber 12 % weniger, weil ein Kurs die wenigsten Sprünge nimmt und damit die Expressrouten zu zwei Einheiten Treibstoff. Aufträge zahlen deshalb jetzt 35 % statt 20 % über dem Marktpreis am Ziel und 9 % statt 6 % pro Sprung des direkten Wegs. Stand nach 30 Tagen mit 8 Spielern je Typ:

| | legal | Kurier | Schmuggel |
|---|---|---|---|
| Gewinn pro Sprung | 7'100 | 9'900 | 10'000 |
| Sprünge in 30 Tagen | 551 | 446 | 482 |
| Handelsgewinn gesamt | 3.9 Millionen | 4.4 Millionen (13 % mehr) | 4.8 Millionen (23 % mehr) |
| Erwischt | 0.3 mal | 0.5 mal | 14 mal |

Der Kurier nimmt 4.6 Aufträge pro Tag an und liefert 95 % davon. Die übrigen platzen meist, weil Piraten unterwegs einen Teil der Ladung nehmen. Eine Lieferung bringt im Schnitt 20'800 Credits Gewinn, Aufträge machen 64 % seines Handelsgewinns aus und Krisen 5 % (0.4 Fahrten pro Tag, 384 Credits pro verkaufter Einheit). Die Reihenfolge stimmt damit: Aufträge sind besser als Pendeln, Schmuggel bleibt wegen des Risikos am einträglichsten. Mit Rivalen bei Krisen und heissen Aufträgen auf der Börse blieb das Bild in einer weiteren Messung gleich: legal 3.8 Millionen, Kurier 4.3 Millionen (13 % mehr), Schmuggel 4.6 Millionen (22 % mehr).


**Offen:**
- **Sektor ist neu und kaum gespielt.** Die Karte hat zwölf Stationen, vier davon neu (Tessera-Kreuz, Eisenfurt, Nimbus-Riff, Solace-Labor). Ihre Preise sind gesetzt, aber nur von Bots geprüft. Die Bots planen keine fernen Krisen an, sie handeln nur von Bahn zu Bahn.
- **Rivalen sind simuliert.** Die Händler, die zu Krisen unterwegs sind, haben Namen, Ladung und einen Weg, aber sie sind keine echten Spieler und handeln sonst nicht. Blockaden auf Bahnen gibt es nicht.
- **Lieferaufträge sind gemessen, aber kaum gespielt.** Der Kurier-Bot fährt stur den direkten Weg. Ob Frist (direkter Weg plus ein bis zwei Sprünge) und Aufpreis sich für einen Menschen richtig anfühlen, zeigt erst das Spielen. Aufträge für Schmuggelware nimmt kein Bot an: Ihr Aufpreis von 30 % ist geschätzt, nicht gemessen.
- **Treibstoff kennt zwei Preise.** Ringbahn eine Einheit, Expressroute zwei. Die Länge einer Bahn auf der Karte spielt sonst keine Rolle.
- **Auktionshaus und Liga sind simuliert.** Gegenbieter, Käufer und Liga-Rivalen sind Zufallsgrössen mit festen Grenzen, keine echten Spieler. Die Liga sagt das auf dem Bildschirm. Echte Mitspieler brauchen Konten, Datenbank und Schutz gegen Absprachen (zweiter Teil von Phase 4).
- **Rest von Phase 4:** Telemetrie und alles, was echte Mitspieler braucht (Konten, Datenbank, echte Ranglisten).
- **Saison-Karten brauchen jede Saison neue Kunst.** "Glut über Varn" hat Porträts für die sechs hohen Karten. Jede weitere Saison braucht wieder sechs, sonst zeigen ihre Karten den Helm oder den Archetyp.
- **Saison-Karten und Namen.** Die Edition wird aus Namenslisten erzeugt. Beinamen passen nicht immer zum Vornamen.
- **Kosmetik ist schmal.** Sechs Lackierungen und Titel. Kartenrahmen, Schiffs-Skins und Emotes fehlen. Der Schaukasten hat ohne echte Mitspieler noch kein Publikum.
- **Premium-Charter ist für fleissige Spieler gratis.** 500 Quanten sind nach gut einer Woche erspielt. Das ist gewollt, solange es kein Echtgeld gibt, muss aber vor Phase 6 neu gerechnet werden.
- **Sammeltempo.** Die Grundsammlung ist nach 60 Tagen komplett. Danach tragen nur die Saison-Edition (zwölf neue Karten alle sechs Wochen) und das Aufwerten.
- **Geld im Spätspiel.** Die Werft bindet das Geld bis etwa Tag 50, Prestige setzt es zurück. Nach Rang 5 (rund 230 Tage) fehlt wieder ein Ziel.
- **Vermögen der Bots täuscht.** Sie sparen stur auf das nächste Schiff und kaufen dann nur zwei Container pro Tag. Echte Spieler verteilen ihr Geld anders.
- **Kartenkunst.** 42 Karten haben ein eigenes Porträt (10 Legenden, 20 Elite, je 6 Karten der laufenden und der nächsten Saison), die 100 seltenen und Standard-Karten teilen sich 20 Archetypen. Alle zwölf Stationen haben ein Bild.
- **Kippeffekt nicht auf einem Gerät geprüft.** Die Folie aller Karten folgt dem Lagesensor. Geprüft ist das nur mit nachgestellten Sensordaten im Browser. Auf dem iPhone fragt das System beim ersten Öffnen von Deck oder Hangar um Erlaubnis.
- **Tages- und Wochengrenze.** Mitternacht und Montag nach mitteleuropäischer Winterzeit, ohne Sommerzeit und ohne Zeitzone des Spielers.
- **Erinnerungen sind lokal.** Sie werden auf dem Gerät geplant, wenn die App in den Hintergrund geht. Was erst danach passiert (zum Beispiel ein überbotenes Gebot), kann die App nicht melden. Dafür braucht es einen Server.
- **Gerätetest steht aus.** Die Android-App ist gebaut, aber nicht auf einem Gerät gelaufen. iOS braucht einen Mac.
- **Aus Phase 2:** Lizenzen, gefälschte Papiere, Veredelung, Versicherung. Verstecke gibt es jetzt als Modul Schmuggelfach.
- **Speicherstand.** Im Offline-Modus lokal auf dem Gerät. Wer die App löscht, verliert ihn: Ein Konto mit Cloud-Speicher fehlt. Der Server hält Sitzungen nur im Arbeitsspeicher.

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

1. **Grafiken:** Alle Pakete A bis M sind eingebaut. Die nächste Lieferung sind sechs Porträts für die übernächste Saison.
2. **Gerätetest** (deine Seite): die Android-App installieren und spielen.
3. **Sektor messen:** ein Schmuggler-Bot, der heisse Aufträge fährt, damit ihr Aufpreis gemessen ist.
5. Danach zur Wahl: Backend für echte Mitspieler mit Konten und Cloud-Speicher, oder der Rest aus Phase 2.
