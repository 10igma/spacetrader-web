# 06 Grafik-Auftrag: Anleitung und Prompts

Stand: 26.11.2026. Dieses Dokument ist ein vollständiger Auftrag für eine Sitzung mit Bildgenerierung (Gemini, ChatGPT oder ein anderes Werkzeug). Es sagt, **was** gebraucht wird, **in welchem Format**, **unter welchem Dateinamen** und **mit welchem Prompt**.

Was das Spiel schon hat: gemalte Porträts für die zehn höchsten Karten (`c21` bis `c30`). Alles andere ist prozedural oder Vektor. Die Pakete unten sind nach Wirkung geordnet.

---

## 1. So arbeitest du das ab

1. Neue Sitzung mit Bildgenerierung öffnen und den **Auftragstext aus Abschnitt 2** als erste Nachricht einfügen.
2. Ein Paket nach dem anderen. Pro Paket **in derselben Unterhaltung bleiben**, damit der Stil hält.
3. Pro Bild: festen Anfang, Mittelteil aus der Tabelle und festes Ende zu einem Prompt zusammensetzen. Die Vorlagen stehen bei jedem Paket.
4. Bild gegen die **Abnahme-Liste** des Pakets prüfen. Was durchfällt, neu erzeugen.
5. In Originalgrösse herunterladen und **exakt nach Tabelle benennen** (zum Beispiel `g008.png`, `leviathan.png`).
6. Dateien in dieser Sitzung hochladen oder ins Repository nach `art-inbox/<Paket>/` legen. Zuschneiden, Umwandeln in WebP und Einbauen übernehme ich. Jedes Bild hat einen Rückfall: Fehlt eine Datei, zeigt das Spiel das bisherige Bild.

**Stand der Lieferung (26.11.2026):** Pakete A, B, C und D sind geliefert und eingebaut, 35 von 36 Bildern. Zurückgehalten: `g094.png`, weil die weisse Rüstung stark an eine bekannte Film-Rüstung erinnert. Der Prompt in Paket D ist angepasst, bitte dieses eine Bild neu erzeugen.

**Reihenfolge und Umfang**

| Paket | Inhalt | Bilder | Wirkung |
|---|---|---|---|
| A | Schiffe | 6 | Sehr hoch: Werft und Profil zeigen heute nur Umrisse |
| B | Container | 4 | Sehr hoch: der Moment vor jeder Enthüllung |
| C | Saison-Karten "Glut über Varn" | 6 | Hoch: die neue Saison startet in wenigen Tagen |
| D | Elite-Karten | 20 | Hoch: die Stufe unter den Legenden |
| E | Begegnungen | 4 | Hoch: Piraten und Zoll haben heute kein Bild |
| F | Waren | 27 | Mittel bis hoch: der Markt ist heute reine Schrift |
| G | Module | 6 | Mittel |
| H | Embleme und Abzeichen | 10 | Mittel |
| I | Saison-Banner, Event, Titelbild | 7 | Mittel, das Titelbild braucht es für die Stores |
| J | Archetypen für seltene und Standard-Karten, Währungen | 23 | Hoch: beendet den Eindruck, 100 Karten zeigten denselben Helm |
| K | Optional: Saison-Karten "Zenit unter Verdacht", Stationen | 6 und 8 | Niedrig |

Seltene und Standard-Karten (100) bekommen keine Einzelporträts. Sie teilen sich 20 Archetypen aus Paket J, einen pro Fraktion und Rolle. Der Abstand zu Elite und Legende bleibt damit sichtbar.

---

## 2. Auftragstext für die Bild-Sitzung

Diesen Block als erste Nachricht einfügen:

```
Du erzeugst Spielgrafiken für "Projekt Nova", ein Sci-Fi-Handelsspiel für das Handy mit
Sammelkarten. Ich gebe dir pro Bild einen fertigen englischen Prompt. Regeln:

1. Erzeuge genau ein Bild pro Prompt, im verlangten Seitenverhältnis, so gross wie möglich.
2. Verändere den Prompt nicht. Wenn ein Bild die Vorgaben verfehlt, erzeuge es neu.
3. Niemals Text, Buchstaben, Zahlen, Logos, Rahmen oder Wasserzeichen im Bild.
4. Halte innerhalb eines Pakets Stil, Pinselführung, Kamera und Licht gleich wie beim
   ersten Bild des Pakets.
5. Nach jedem Bild nennst du mir den Dateinamen, den ich dir zum Prompt gebe.
6. Wo "pure black background" steht, muss der Hintergrund überall reines Schwarz sein:
   keine Sterne, kein Nebel, kein Boden, kein Schatten, kein Verlauf.
```

---

## 3. Stil-Bibel

**Welt:** dunkle, hochwertige Science-Fiction. Handelsstationen, Werften, Neonmärkte, Konzerntürme. Gebraucht und bewohnt, nicht steril, ausser bei Zenit.

**Bildsprache:** malerische digitale Illustration, filmisches Licht, dunkle Gesamtpalette mit wenigen leuchtenden Akzenten. Kein Comic, kein Anime, kein Fotorealismus, keine Stockfoto-Anmutung.

**Licht, überall gleich:** kräftiges farbiges Streiflicht von links, warmes Bernstein-Hauptlicht von rechts.

**Farben des Spiels**

| Rolle | Farbe | Hex |
|---|---|---|
| Hintergrund | fast schwarzes Blau | `#02030A` |
| Hauptakzent | Cyan | `#3BE3FF` |
| Belohnung | Bernstein und Gold | `#FFC24A` |
| Gefahr | Rot | `#FF5468` |
| Erfolg | Mint | `#4DFFB5` |
| Selten, Elite, Legende, Singularität | Blau, Violett, Gold, Magenta | `#4DA3FF`, `#B06CFF`, `#FFC24A`, `#FF4DD2` |

**Fraktionen**

| Fraktion | Lichtfarbe im Prompt | Ort im Hintergrund | Charakter |
|---|---|---|---|
| Freie Gilde Tessera | cyan | trade station, window to space, teal nebula | Händler, pragmatisch, bunt gemischt |
| Aschenorden | orange | shipyard foundry, sparks, glowing metal | Werftleute, Soldaten, rau |
| Helix-Kartell | magenta | neon night market, haze, silhouettes | Schmuggler, elegant, gefährlich |
| Zenit-Konsortium | cool white-blue | glass corporate tower, sterile light bands | Konzern, makellos, kalt |

**Festes Ende für jeden Prompt**

```
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

---

## 4. Technische Vorgaben

| Art | Seitenverhältnis | Liefergrösse mindestens | Hintergrund | Dateiname |
|---|---|---|---|---|
| Karten | 4:5 hoch | 1024 x 1280 | gemalte Szene | `<Karten-ID>.png` |
| Schiffe | 1:1 | 1024 x 1024 | reines Schwarz | `<Schiff>.png` |
| Container | 1:1 | 1024 x 1024 | reines Schwarz | `standard.png` usw. |
| Begegnungen | 3:2 quer | 1536 x 1024 | gemalte Szene | `pirates-1.png` usw. |
| Waren, Module | 1:1 | 1024 x 1024 | reines Schwarz | `<Waren-ID>.png` |
| Embleme | 1:1 | 1024 x 1024 | reines Schwarz, Motiv reinweiss | `<Fraktion>.png` |
| Archetypen | 4:5 hoch | 1024 x 1280 | gemalte Szene | `<Fraktion>-<Rolle>.png` |
| Liga-Abzeichen | 1:1 | 1024 x 1024 | reines Schwarz | `bronze.png` usw. |
| Banner | 3:1 quer | 1536 x 512 | gemalte Szene | `season-0.png` usw. |
| Titelbild | 9:16 hoch | 1080 x 1920 | gemalte Szene | `keyart.png` |

- **PNG oder JPG in bester Qualität.** Nicht selbst verkleinern oder zuschneiden.
- **Schwarzer Hintergrund statt Transparenz:** Bildgeneratoren liefern selten saubere Transparenz. Auf dem dunklen Spiel verschmilzt reines Schwarz von selbst, den Rest stelle ich frei.
- **Motiv mittig, rundum 10 Prozent Rand.** Nichts darf angeschnitten sein, ausser bei Karten und Szenen.
- **Kein Text im Bild.** Namen, Werte und Rahmen setzt das Spiel.

---

## Paket A: Schiffe (6 Bilder)

**Wo:** Werft, Profil, später Warp-Szene. **Ordner:** `art-inbox/ships/`.

**Wichtig:** Alle sechs müssen wie eine Flotte desselben Zeichners wirken. Rumpf neutral in Dunkelgrau und gebrochenem Weiss, weil das Spiel die Schiffe selbst einfärbt (Lackierungen).

**Vorlage**

```
Top-down orthographic view of a sci-fi spaceship, seen exactly from above, nose pointing
straight up, perfectly centred, the whole ship visible with a clear margin on all sides.
[SCHIFF].
Hull in neutral gunmetal grey and off-white armour panels with fine panel lines, small pale
cyan running lights, soft pale cyan engine glow at the stern. Premium game asset render,
painterly digital illustration with crisp edges, subtle rim light, highly detailed.
Pure black background, nothing else in the image, no stars, no shadow, no ground.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Schiff | Mittelteil |
|---|---|---|
| `sperling.png` | Sperling, Kurier | A tiny single-seat courier ship, dart-shaped, short swept wings, one small engine, a little worn, humble and nimble |
| `kormoran.png` | Kormoran, Frachter | A stocky medium freighter, boxy hull with two bulging cargo holds on the sides, blunt nose, three engines, utilitarian and sturdy |
| `lanze.png` | Lanze, Abfangjäger | A slim aggressive interceptor, long needle nose, sharply swept-back wings, twin cannons along the fuselage, two bright engines, fast and dangerous |
| `nachtfalter.png` | Nachtfalter, Schmugglerjacht | A sleek stealth yacht shaped like a moth, wide curved wings with matte radar-absorbing surfaces, almost no visible lights, hidden cargo bays, elegant and secretive |
| `basilisk.png` | Basilisk, Blockadebrecher | A heavy armoured blockade runner, arrowhead hull with two forward prongs like fangs, thick layered armour plates, three large engines, menacing |
| `leviathan.png` | Leviathan, Schwerfrachter | A massive heavy freighter, long spine with rows of cargo containers on both sides, bridge tower near the bow, four huge engines, the size of a flying harbour |

**Abnahme:** exakt von oben, Bug zeigt nach oben, ganz im Bild, Hintergrund reines Schwarz, Rumpf neutral grau und weiss, sechs Schiffe wirken wie eine Familie, die Grösse steigt sichtbar von Sperling bis Leviathan.

---

## Paket B: Container (4 Bilder)

**Wo:** Hangar, Enthüllung, Charter, Belohnungen. **Ordner:** `art-inbox/crates/`.

**Vorlage**

```
A sealed sci-fi cargo container, three-quarter front view from slightly above, perfectly
centred, the whole object visible with a clear margin.
[CONTAINER].
Premium game loot crate, painterly digital illustration with crisp edges, cinematic rim
light, highly detailed, glowing seams, desirable and mysterious.
Pure black background, nothing else in the image, no ground, no shadow, no particles
outside the object.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Mittelteil |
|---|---|
| `standard.png` | A compact hexagonal container of dark gunmetal with brushed steel edges, thin glowing cyan light seams, a round locking mechanism on the front, a few scratches from transport |
| `premium.png` | A larger ornate hexagonal container of black lacquer and polished gold trim, glowing amber light seams, an intricate vault-style lock on the front, immaculate and precious |
| `standard-open.png` | The same compact gunmetal hexagonal container with cyan seams, lid split open, a strong cyan-white light beam bursting upward from inside |
| `premium-open.png` | The same black and gold hexagonal container with amber seams, lid split open, a strong golden light beam bursting upward from inside |

**Abnahme:** geschlossen und offen sind erkennbar derselbe Container, Hintergrund reines Schwarz, Standard wirkt gut, Premium wirkt deutlich kostbarer.

---

## Paket C: Saison-Karten "Glut über Varn" (6 Bilder)

**Wo:** Saison-Album, Charter-Belohnung, Enthüllung. **Ordner:** `art-inbox/cards/`. Die Saison beginnt am Montag nach diesem Stand.

Saison-Thema für den Hintergrund: Minenkolonie im Glutlicht, Hochöfen, Schlacke, Funkenflug. Die Fraktion bestimmt weiter die Farbe des Streiflichts.

**Karten-Vorlage** (gilt auch für Paket D und K)

```
Character portrait for a premium sci-fi collectible trading card, bust shot from the chest up,
subject placed slightly right of centre, dark empty space in the top-left corner.
[FIGUR].
Background: [ORT], soft out-of-focus lights.
Strong [LICHTFARBE] rim light from the left, warm amber key light from the right,
cinematic, painterly digital illustration, highly detailed face, moody, dark overall palette.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Karte | Figur | Ort | Lichtfarbe |
|---|---|---|---|---|
| `s495-11.png` | Tamsin Gault, Die Unverbrannte (Legende, Händlerin, Helix) | A striking woman in her forties, cartel trader who walked out of a furnace fire unharmed, calm superior smile, platinum hair in a tight braid, a fine burn scar like gold filigree across one cheek, heat-proof black silk coat with glowing magenta lining | a blast furnace hall with rivers of molten slag behind her | magenta |
| `s495-12.png` | Rada Corvane, Herr der Glut (Legende, Technik, Zenit) | An imposing man in his fifties, corporate master of the smelters, shaved head, mirror-polished white heat armour with thin blue light strips, one arm a refined white prosthetic holding a floating sphere of molten metal | a pristine control gallery above a sea of glowing furnaces | cool white-blue |
| `s495-07.png` | Cira Eames, Russfängerin (Elite, Technik, Helix) | A wiry woman in her thirties, soot-catcher engineer, soot-smudged face, respirator hanging at her neck, tool harness with filter cartridges, sharp amused eyes | a chimney shaft full of drifting embers | magenta |
| `s495-08.png` | Xander Mertz, Der Schmelzer (Elite, Kanonier, Zenit) | A heavy-set man in his forties, corporate gunner, thermal visor pushed up on his forehead, white armour scorched at the edges, a compact plasma lance resting on his shoulder | a firing platform over glowing ore crucibles | cool white-blue |
| `s495-09.png` | Nilo Kestrel, Funkenleserin (Elite, Schmuggel, Tessera) | A young woman in her twenties, spark-reader and smuggler, short teal hair, goggles with amber lenses, patched trader jacket, tiny sparks dancing above her open palm | a slag heap at night with a freighter waiting in the distance | cyan |
| `s495-10.png` | Ada Gault, Kesselwart (Elite, Pilotin, Aschenorden) | A tough woman in her fifties, boiler-keeper turned pilot, grey crew cut, burn-marked flight jacket with brass gauges sewn on the chest, steady unimpressed gaze | the cockpit of a tug ship lit by furnace glow from outside | orange |

**Abnahme:** Kopf und Schultern leicht rechts der Mitte, oben links dunkel und ruhig (dort stehen Wertung und Rolle), Gesicht scharf, Streiflicht in der Fraktionsfarbe, keine Schrift, gleicher Malstil wie die vorhandenen Legenden (Vergleich: `docs/redesign/preview/42-painted-legends.jpg`).

---

## Paket D: Elite-Karten (20 Bilder)

**Wo:** überall, wo Karten erscheinen. **Ordner:** `art-inbox/cards/`. Karten-Vorlage aus Paket C.

Elite-Karten sollen stark wirken, aber eine Spur bodenständiger als die Legenden: erfahrene Spezialisten in Arbeitskleidung, keine Herrscherposen.

**Freie Gilde Tessera** (Ort: `a busy trade station concourse with a window to space, teal nebula`, Lichtfarbe: `cyan`)

| Datei | Karte | Figur |
|---|---|---|
| `c20.png` | Raffa Delacroix, Sternenläufer (Pilot) | A charismatic pilot in his thirties, easy grin, wind-tousled dark curls, worn leather flight jacket with a teal scarf, star charts tattooed along his neck |
| `g008.png` | Orla Kestrel, Maklerin (Händlerin) | A sharp-eyed broker in her forties, auburn hair in a neat twist, layered teal trader robes over a practical vest, a cluster of floating price holograms beside her |
| `g013.png` | Ulla Stroud, Bordtechnikerin (Technik) | A cheerful ship technician in her thirties, blonde undercut, grease on her hands, teal coverall tied at the waist, a multi-tool behind her ear |
| `g019.png` | Nilo Rusk, Bordschütze (Kanonier) | A calm ship gunner in his forties, dark skin, cropped hair, targeting monocle over one eye, padded teal gunner vest with ammunition loops |
| `g025.png` | Mila Gault, Hehlerbotin (Schmuggel) | A quick young courier in her twenties, hood half up, mischievous look, plain grey trader cloak hiding a sealed parcel, a teal light bracelet |

**Aschenorden** (Ort: `a shipyard foundry with sparks and glowing molten metal`, Lichtfarbe: `orange`)

| Datei | Karte | Figur |
|---|---|---|
| `c18.png` | Cmdr. Asko Thane, Eiserne Hand (Kanonier) | A stern commander in his fifties, square jaw, grey temples, a heavy iron prosthetic hand resting on his chest plate, charcoal armoured uniform with brass rank bars |
| `g031.png` | Soren Gault, Sprungnavigator (Pilot) | A focused navigator in his thirties, shaved head with a navigation implant glowing at the temple, scorched orange flight suit, calm far-away stare |
| `g037.png` | Quen Isaksen, Feilscher (Händler) | A wily old trader in his sixties, white stubble, sly half smile, heavy work coat with many pockets, counting brass tokens between his fingers |
| `g041.png` | Ulla Ashby, Hüllenschweisserin (Technik) | A strong hull welder in her forties, welding mask pushed up, freckles and burn marks, thick leather gloves, a welding torch glowing at her side |
| `g050.png` | Xander Yarrow, Schieber (Schmuggel) | A broad fixer in his forties, slicked-back hair, gold tooth, ash-grey long coat over a foundry apron, a sealed crate under his arm |

**Helix-Kartell** (Ort: `a neon night market in haze with shadowy silhouettes`, Lichtfarbe: `magenta`)

| Datei | Karte | Figur |
|---|---|---|
| `c17.png` | Sable Meridian, Die Unverzollte (Schmuggel) | An elegant smuggler in her thirties, sleek black hair, knowing smile, a high-collared iridescent black jacket with thin magenta seams, a customs seal broken between her fingers |
| `g056.png` | Juno Holloway, Gleiterass (Pilotin) | A fearless racing pilot in her twenties, shaved sides and a magenta mohawk, mirrored visor on her forehead, tight racing suit with sponsor-free plain panels |
| `g061.png` | Soren Oster, Feilscher (Händler) | A smooth cartel dealer in his forties, neat beard, rings on every finger, dark velvet coat, weighing a glowing crystal on a tiny scale |
| `g067.png` | Ada Rusk, Bordtechnikerin (Technik) | A quiet cyberware technician in her thirties, one mechanical eye with a magenta lens, short dark bob, soldering tool in hand, black work vest |
| `g072.png` | Kato Lindqvist, Söldner (Kanonier) | A scarred mercenary in his thirties, tattooed neck, cold eyes, mismatched combat armour, a heavy rifle slung across his back |

**Zenit-Konsortium** (Ort: `a glass corporate tower at night with sterile light bands`, Lichtfarbe: `cool white-blue`)

| Datei | Karte | Figur |
|---|---|---|
| `c19.png` | Dr. Mirelle Koss, Architektin (Technik) | A brilliant systems architect in her forties, silver bob, thin smart glasses, white lab coat over a grey high-collar suit, a rotating wireframe station model above her palm |
| `g080.png` | Zeno Lund, Testflieger (Pilot) | A composed test pilot in his thirties, perfect posture, white pressure suit with blue trim, helmet under his arm, faint smile |
| `g084.png` | Lars Kestrel, Börsenläufer (Händler) | A restless young trader in his twenties, loosened tie, sleeves rolled up on a white shirt, earpiece, three data streams reflected in his eyes |
| `g094.png` | Elio Maddox, Kanonenlader (Kanonier) | A disciplined corporate gunner in his thirties, clean-shaven, slate-grey padded security uniform with a dark blue armoured vest, high collar and a small silver corporate pin, an energy cell magazine held ready in both hands. Original design, not resembling armour from any film |
| `g100.png` | Falk Cato, Papiermacher (Schmuggel) | A meticulous forger in his fifties, thin, grey suit, magnifier loupe over one eye, a forged holographic permit glowing between his fingertips |

**Abnahme:** wie Paket C. Zusätzlich: Jede Fraktion ist an Lichtfarbe und Ort sofort erkennbar, keine zwei Figuren sehen sich zum Verwechseln ähnlich.

---

## Paket E: Begegnungen (4 Bilder)

**Wo:** über dem Entscheidungs-Fenster bei Piraten und Zoll. **Ordner:** `art-inbox/encounters/`.

**Vorlage**

```
Cinematic sci-fi scene seen through the wide cockpit window of a small trading ship.
[SZENE].
Motif in the centre, edges of the image dark and calm. Painterly digital illustration,
dramatic lighting, moody, dark overall palette, highly detailed.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Szene |
|---|---|
| `pirates-1.png` | A jagged pirate raider ship closing in fast out of an asteroid field, weapons glowing red, red warning light on the cockpit frame |
| `pirates-2.png` | Three small pirate fighters with red running lights surrounding the viewer in open space, one of them firing a warning shot across the bow |
| `customs-1.png` | A large grey customs patrol cutter blocking the way, sweeping the viewer with a wide blue scanning beam, a station in the distance |
| `customs-2.png` | A customs inspection drone hovering right in front of the window, shining a cold white scanning light into the cockpit, patrol ship behind it |

**Abnahme:** Gefahr auf einen Blick lesbar (Piraten rot, Zoll kaltes Blau), Motiv in der Mitte, Ränder dunkel, keine Schrift.

---

## Paket F: Waren (27 Bilder)

**Wo:** Marktliste, Handelsfenster, Laderaum. **Ordner:** `art-inbox/goods/`.

**Vorlage**

```
Game item icon, a single object, three-quarter view, perfectly centred, filling about
70 percent of the image.
[GEGENSTAND].
Premium sci-fi inventory icon, painterly digital illustration with crisp edges, cyan rim
light from the left, warm amber key light from the right, highly detailed, clear silhouette.
Pure black background, nothing else in the image, no ground, no shadow.
No text, no letters, no numbers, no logo, no label, no frame, no border, no watermark.
```

| Datei | Ware | Gegenstand |
|---|---|---|
| `water.png` | Wasser | A sturdy transparent water canister with a metal frame, clear blue water inside |
| `hydro.png` | Hydrokultur | A sealed hydroponic tray with fresh green plants under a glass dome |
| `ore.png` | Erze | A chunk of raw metallic ore with glittering copper and silver veins |
| `fuelcells.png` | Treibstoffzellen | A cylindrical fuel cell with a glowing orange core behind a glass window |
| `machines.png` | Maschinen | A compact industrial machine part, a heavy gearbox with exposed cogs |
| `reactor.png` | Reaktorteile | A reactor coil ring with blue energy humming between metal segments |
| `drones.png` | Drohnen | A small folded cargo drone with four rotor pods and a single lens |
| `jammers.png` | Störsender | A military signal jammer device with a short antenna array and a red status light |
| `meds.png` | Medikamente | A white medical case, open, showing rows of sealed ampoules |
| `stims.png` | Stimulanzien | An auto-injector pen with a bright green liquid chamber |
| `prosthetics.png` | Prothesen | A finely built mechanical prosthetic hand in brushed steel |
| `neurolinks.png` | Neuro-Schnittstellen | A delicate neural interface headband with thin gold contacts and a tiny blue light |
| `boosters.png` | Reflexbooster | A small spinal implant module with needle contacts and a pulsing violet core |
| `implants.png` | Kampfimplantate | An armoured cybernetic forearm implant with a retracted blade housing |
| `starcharts.png` | Sternkarten | A brass star chart projector showing a small glowing constellation above it |
| `secrets.png` | Firmengeheimnisse | A sealed black data vault cube with a white corporate lock and a red seal strip |
| `blackcode.png` | Schwarzcode | A matte black data spike with corrupted magenta light flickering along its edge |
| `aicores.png` | KI-Kerne | A crystalline AI core sphere in a metal cradle, soft white light swirling inside |
| `huntarms.png` | Jagdwaffen | A sleek sci-fi hunting rifle with a wooden stock and a long scope |
| `plasma.png` | Plasmagewehre | A bulky sci-fi plasma rifle with a glowing blue-white energy chamber |
| `emp.png` | EMP-Sprengköpfe | A sealed cylindrical electromagnetic pulse device with warning stripes and coiled copper rings |
| `lumen.png` | Lumen | A small glass vial filled with softly glowing yellow liquid |
| `neurostaub.png` | Neurostaub | A sealed petri capsule containing fine shimmering violet powder |
| `schlaftau.png` | Schlaftau | A teardrop-shaped flask with a deep blue liquid and a silver stopper |
| `spices.png` | Gewürze | An open wooden spice box with compartments of colourful exotic spices |
| `art.png` | Kunst | A small abstract sculpture of bronze and glass on a transport mount |
| `artifacts.png` | Xeno-Artefakte | An ancient alien artefact, a dark stone ring carved with faintly glowing turquoise glyph-like grooves |

**Abnahme:** ein einzelner Gegenstand, mittig, Hintergrund reines Schwarz, bei 64 Pixeln Kantenlänge noch erkennbar (zum Prüfen stark verkleinern), alle 27 im selben Stil und Licht, keine Etiketten mit Schrift.

---

## Paket G: Module (6 Bilder)

**Wo:** Werft, Modulplätze. **Ordner:** `art-inbox/modules/`. Vorlage aus Paket F, erste Zeile ersetzt durch `Game item icon, a single spaceship module, three-quarter view, perfectly centred, filling about 70 percent of the image.`

| Datei | Modul | Gegenstand |
|---|---|---|
| `shield.png` | Schildgitter | A hexagonal shield emitter plate with a faint blue energy lattice hovering above it |
| `drive.png` | Nachbrenner | A compact afterburner nozzle with a bright blue-white flame cone |
| `jammer.png` | Signalstörer | A flat stealth emitter dish with concentric rings and a dim violet glow |
| `pods.png` | Frachtgondeln | Two external cargo pods joined by a mounting bracket |
| `charger.png` | Fusionslader | A small fusion charging unit with a glowing ring and thick power couplings |
| `stash.png` | Schmuggelfach | A hidden compartment box disguised as a hull panel, lid slightly open, soft magenta light inside |

---

## Paket H: Embleme und Abzeichen (10 Bilder)

**Ordner:** `art-inbox/emblems/`.

**Fraktions-Embleme (4):** einfarbig weiss auf reinem Schwarz. Das Spiel färbt sie selbst.

```
Flat minimalist emblem, a single bold symbol, pure white on a pure black background,
perfectly centred, symmetrical, thick clean shapes, no gradients, no shading, no outline box.
[SYMBOL].
No text, no letters, no numbers, no frame, no border, no watermark.
```

| Datei | Symbol |
|---|---|
| `tessera.png` | An abstract mosaic of four interlocking tiles forming a compass star, symbol of a free merchant guild |
| `asche.png` | An abstract anvil merged with a rising flame, symbol of a shipyard order |
| `helix.png` | An abstract double helix twisted into a closed loop like a serpent, symbol of a smuggling cartel |
| `zenit.png` | An abstract sun at its highest point above a thin horizon line inside a perfect circle, symbol of a corporation |

**Liga-Abzeichen (5):** dieselbe Form in fünf Materialien.

```
A hexagonal shield badge for a competitive league rank, front view, perfectly centred.
Made of [MATERIAL], with a raised star motif in the centre and bevelled edges.
Premium game rank badge, painterly digital render with crisp edges, strong specular
highlights, highly detailed.
Pure black background, nothing else in the image, no ground, no shadow.
No text, no letters, no numbers, no logo, no frame, no watermark.
```

| Datei | Material |
|---|---|
| `bronze.png` | weathered bronze with a warm brown patina |
| `silber.png` | polished silver with cool reflections |
| `gold.png` | rich polished gold with warm reflections |
| `platin.png` | pale platinum with ice-blue enamel inlays |
| `diamant.png` | faceted diamond crystal set in white gold, prismatic rainbow glints |

**Prestige-Abzeichen (1):** `prestige.png`, Vorlage der Liga-Abzeichen, erste Zeile ersetzt durch `A five-pointed star medal with a laurel ring, front view, perfectly centred.`, Material: `black enamel and polished gold with a glowing amber core`.

**Abnahme:** Embleme sind reinweiss ohne Graustufen und bei 32 Pixeln noch lesbar. Die fünf Liga-Abzeichen haben exakt dieselbe Form und unterscheiden sich nur im Material.

---

## Paket I: Banner und Titelbild (7 Bilder)

**Ordner:** `art-inbox/banners/`.

**Saison-Banner (4) und Event-Banner (1)**, 3:1 quer:

```
Wide cinematic sci-fi panorama, 3:1 aspect ratio. [SZENE].
The left third of the image dark and calm for overlaid text, the main motif on the right.
Painterly digital illustration, dramatic lighting, moody, dark overall palette.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Thema | Szene |
|---|---|---|
| `season-0.png` | Blockade von Kessin | A line of grey warships blockading a rust-orange shipyard planet, searchlights sweeping, a small trader slipping through |
| `season-1.png` | Der Helix-Riss | A glowing magenta rift tearing through a neon cartel harbour in space, ships fleeing both ways |
| `season-2.png` | Zenit unter Verdacht | A flawless white corporate tower at night with one floor lit red, investigators' drones circling in cold blue light |
| `season-3.png` | Glut über Varn | A mining colony on an asteroid belt glowing with furnaces and rivers of molten slag, ember clouds drifting into space |
| `event-blockade.png` | Blockade-Lauf | A small trading ship racing between two customs cruisers through a web of red scanning beams |

**Titelbild (1)**, 9:16 hoch, `keyart.png`:

```
Vertical key art for a sci-fi trading game, 9:16 aspect ratio. A small trading ship in the
foreground seen from behind, flying toward a huge ringed planet with a glowing cyan
atmosphere, a busy trade station orbiting it, lanes of ship lights, distant magenta and
amber nebula. Upper third calm and dark for a title, lower third calm for a button.
Painterly digital illustration, epic scale, cinematic lighting, dark overall palette with
cyan and amber accents.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

Dasselbe Motiv zusätzlich quer für den Play Store (1024 x 500): denselben Prompt mit `Horizontal key art, 2:1 aspect ratio` beginnen, Datei `feature.png`.

---

## Paket J: Archetypen und Währungen (23 Bilder)

**Archetypen (20):** ein Brustbild pro Fraktion und Rolle. Jede seltene und jede Standard-Karte dieser Kombination zeigt es. **Ordner:** `art-inbox/archetypes/`.

Bewusst einfacher als die Porträts: Gesicht verdeckt oder im Schatten, damit fünf Karten dasselbe Bild tragen können, ohne dass es wie dieselbe Person wirkt.

```
Bust portrait of an anonymous sci-fi crew member for a collectible trading card, chest up,
subject placed slightly right of centre, dark empty space in the top-left corner.
[ROLLE], [FRAKTION]. Face hidden by a helmet visor, mask or deep shadow, no recognisable
facial features.
Background: [ORT], heavily blurred. Strong [LICHTFARBE] rim light from the left, dim amber
key light from the right. Graphic painterly illustration, simplified shapes, limited palette,
dark overall, less detailed than a hero portrait.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Rolle | Text für [ROLLE] | Dateiendung |
|---|---|---|
| Pilot | A pilot in a flight suit with a closed flight helmet and a tinted visor | `-pilot` |
| Händler | A trader in a high-collared coat, hood up, a small glowing ledger tablet in hand | `-trader` |
| Technik | A technician in a work suit with a welding mask and tool harness | `-tech` |
| Kanonier | A gunner in combat armour with a full-face tactical helmet | `-gunner` |
| Schmuggel | A smuggler in a cloak with a scarf mask and goggles | `-smuggler` |

| Fraktion | Text für [FRAKTION] | Ort | Lichtfarbe | Dateianfang |
|---|---|---|---|---|
| Tessera | practical mixed gear in teal and grey of a free merchant guild | a trade station concourse | cyan | `tessera` |
| Aschenorden | heavy scorched gear in charcoal and rust of a shipyard order | a shipyard foundry with sparks | orange | `asche` |
| Helix | sleek dark gear with thin neon seams of a smuggling cartel | a neon night market in haze | magenta | `helix` |
| Zenit | spotless white and grey corporate gear | a glass corporate tower | cool white-blue | `zenit` |

Dateinamen aus Anfang und Endung, zum Beispiel `helix-smuggler.png`, `zenit-pilot.png`. Das ergibt 4 mal 5 Bilder.

**Währungen (3):** für Belohnungsmomente und den Charter. **Ordner:** `art-inbox/currency/`. Vorlage aus Paket F.

| Datei | Gegenstand |
|---|---|
| `credits.png` | A stack of three hexagonal credit chips of brushed gold with a faint amber glow |
| `quanta.png` | A cut diamond-shaped energy crystal glowing bright cyan from within |
| `shards.png` | A small heap of sharp violet crystal shards with a soft inner glow |

**Abnahme:** Kein Archetyp zeigt ein erkennbares Gesicht. Fraktion an Farbe und Kleidung, Rolle an der Silhouette erkennbar. Alle 20 im selben Stil.

---

## Paket K (optional)

**Saison-Karten "Zenit unter Verdacht"** (die Saison endet in wenigen Tagen, lohnt nur fürs Archiv). Karten-Vorlage aus Paket C, Hintergrund-Thema: Konzernturm unter Ermittlung, rote Warnlichter in sterilem Weiss.

| Datei | Karte | Figur | Lichtfarbe |
|---|---|---|---|
| `s494-11.png` | Yara Zabel, Die Unbestechliche (Legende, Kanonier, Tessera) | A fierce investigator-marshal in her forties, tight dark braid, scar through one eyebrow, long teal duster coat with an inspector's badge plate, a heavy sidearm held low | cyan |
| `s494-12.png` | Nilo Eames, Der Generalrevisor (Legende, Schmuggel, Aschenorden) | A gaunt auditor in his sixties who knows every hidden compartment, round dark glasses, ash-grey greatcoat, a ledger tablet chained to his wrist, thin dangerous smile | orange |
| `s494-07.png` | Piet Brandl, Protokollführer (Elite, Schmuggel, Tessera) | A nervous clerk in his thirties with a recorder drone on his shoulder, ink-stained fingers, plain teal office jacket | cyan |
| `s494-08.png` | Wren Stroud, Der Gutachter (Elite, Pilot, Aschenorden) | A weathered inspector pilot in his fifties, grey moustache, old flight jacket, measuring calipers in his chest pocket | orange |
| `s494-09.png` | Vito Oduya, Datenforensiker (Elite, Händler, Helix) | A sharp data forensics expert in his thirties, dark skin, cropped hair, translucent data gloves, strings of magenta code reflected on his face | magenta |
| `s494-10.png` | Tamsin Juhl, Verbindungsfrau (Elite, Technik, Zenit) | A discreet liaison in her forties, pale blonde chignon, grey suit, a small encrypted communicator held to her lips | cool white-blue |

**Stationen (8):** eine Raumstation als Vordergrund vor dem Planeten auf der Stationsseite. 4:3 quer, reines Schwarz, `art-inbox/stations/`.

```
A sci-fi space station seen from a distance in space, three-quarter view, perfectly centred,
the whole structure visible with a clear margin. [STATION].
Painterly digital illustration with crisp edges, strong rim light, many tiny lit windows,
highly detailed. Pure black background, nothing else in the image, no stars, no planet.
No text, no letters, no numbers, no logo, no frame, no border, no watermark.
```

| Datei | Station |
|---|---|
| `meridian.png` | A bright bustling free-trade ring station with docking arms and teal lights |
| `kessin.png` | A sprawling orbital shipyard with half-built hulls in scaffolds, orange welding sparks |
| `helixtor.png` | A dark tower-like cartel harbour wrapped in magenta neon bands |
| `zenit.png` | An immaculate white corporate spire with clean blue-white light lines |
| `varn.png` | A mining platform bolted to a broken asteroid, furnace glow from inside |
| `lumen.png` | A wide floating anchorage of tethered trade ships and turquoise beacon lights |
| `corvus.png` | A patched-together black market hideout built into a derelict hull, violet lights |
| `aurel.png` | An elegant golden residential habitat with glass domes and warm lights |

---

## 5. Häufige Fehler und was dann zu tun ist

| Fehler | Abhilfe |
|---|---|
| Schrift, Zahlen oder Fantasie-Logos im Bild | Neu erzeugen. Bei Wiederholung im Prompt die betroffene Stelle umschreiben (zum Beispiel `plain unmarked surface`) |
| Rahmen oder Kartenrand um das Bild | Neu erzeugen und `full bleed image, no card frame` anfügen |
| Hintergrund nicht reines Schwarz (Sterne, Boden, Verlauf) | Neu erzeugen und `isolated on solid black #000000` anfügen |
| Stil kippt ins Comic oder Fotorealistische | In derselben Unterhaltung anfügen: `Same art style, brushwork and lighting as the first image of this set` |
| Schiff schräg statt von oben | `strict top-down plan view, like a blueprint, no perspective` anfügen |
| Motiv angeschnitten | `zoomed out, the whole subject inside the frame with empty margin` anfügen |
| Verformte Hände oder Gesichter | Neu erzeugen. Hände möglichst nicht im Vordergrund |
| Zwei Figuren sehen gleich aus | Alter, Frisur oder Haltung im Mittelteil deutlicher machen |

---

## 6. Rechte und Offenlegung

Vor einer Veröffentlichung zu prüfen (ausführlicher in Dokument 04):

- Lizenz des Bildwerkzeugs für kommerzielle Nutzung.
- Der Urheberschutz rein KI-erzeugter Bilder ist in vielen Ländern unsicher.
- Manche Plattformen verlangen einen Hinweis auf KI-erzeugte Inhalte.
- Keine Prompts mit Namen lebender Künstler, echter Personen oder fremder Marken. Die Prompts in diesem Dokument enthalten keine.

---

## 7. Was nach der Lieferung passiert

Ich schneide zu, wandle in WebP um, stelle die Motive auf schwarzem Grund frei und baue jedes Paket mit Rückfall ein. Danach zeige ich Vorher und Nachher als Screenshots. Karten funktionieren sofort (Datei nach Karten-ID). Für Schiffe, Container, Waren, Module, Embleme, Begegnungen und Banner baue ich die Plätze ein, sobald die ersten Dateien da sind.
