# 04 Kartenkunst

Stand: 25.11.2026. Versuch mit KI-generierten Porträts statt der prozeduralen Helme.

## Ergebnis des ersten Versuchs

Eine Karte (Vesper Nakai, `c21`) hat ein generiertes Porträt bekommen. Vergleich in `preview/40-painted-card.jpg` und `preview/41-painted-vs-procedural.jpg`. Der Unterschied zum prozeduralen Avatar ist gross: Die Karte wirkt wie ein Sammelobjekt.

## So funktioniert es technisch

- Datei nach `packages/client/src/assets/cards/<Karten-ID>.webp` legen, zum Beispiel `c21.webp`. Mehr braucht es nicht.
- Format: Hochformat 4:5, im Spiel 640 x 800 Pixel, WebP mit Qualität um 80 (rund 50 kB pro Karte).
- Karten ohne Datei zeigen weiter den prozeduralen Avatar. Die Kunst kann also Karte für Karte nachkommen, Legenden zuerst.
- Motiv leicht rechts der Mitte, oben links dunkel und ruhig: Dort stehen Wertung und Rolle.

## Prompt-Vorlage

Der feste Teil sorgt für einen einheitlichen Stil, nur die Beschreibung der Figur und die Lichtfarbe der Fraktion wechseln.

```
Character portrait for a premium sci-fi collectible trading card, bust shot from the chest up,
subject placed slightly right of centre, dark empty space in the top-left corner.
[FIGUR: Alter, Rolle, Ausdruck, Haare, Kleidung, ein markantes Detail].
Background: [ORT, passend zur Fraktion], soft out-of-focus lights.
Strong [FRAKTIONSFARBE] rim light from the left, warm amber key light from the right,
cinematic, painterly digital illustration, highly detailed face, moody, dark overall palette.
No text, no letters, no numbers, no frame, no border, no watermark.
```

| Fraktion | Lichtfarbe | Ort im Hintergrund |
|---|---|---|
| Freie Gilde Tessera | cyan | Handelsstation, Fenster zum All, türkiser Nebel |
| Aschenorden | orange | Werft, Funkenflug, glühendes Metall |
| Helix-Kartell | magenta | Neonmarkt, Dunst, Schattenfiguren |
| Zenit-Konsortium | kühles Weiss-Blau | Konzernturm, Glas, sterile Lichtbänder |

Der verwendete Prompt für Vesper Nakai:

```
Character portrait for a premium sci-fi collectible trading card, bust shot from the chest up,
subject placed slightly right of centre, dark empty space in the top-left corner. A confident
woman in her fifties, master trader of a free spacefaring merchant guild, sharp calculating
eyes, faint knowing smile, silver-streaked black hair pinned up, high-collared dark navy
captain's coat with subtle cyan piping and a small abstract guild insignia, a thin holographic
data monocle glowing cyan over one eye. Background: deep space seen through a station window,
faint teal nebula, soft out-of-focus station lights. Strong cyan rim light from the left, warm
amber key light from the right, cinematic, painterly digital illustration, highly detailed
face, moody, dark overall palette. No text, no letters, no numbers, no frame, no border, no
watermark.
```

## Prompts für die übrigen Legenden und Singularitäten

Jeweils den festen Anfang und das feste Ende aus der Vorlage verwenden und nur den Mittelteil ersetzen. Datei danach unter der angegebenen ID ablegen.

| ID | Karte | Mittelteil (Figur, Hintergrund, Lichtfarbe) |
|---|---|---|
| `c22` | Kazimir Voss, Der letzte Admiral (Kanonier, Aschenorden) | A scarred, broad-shouldered man in his sixties, former fleet admiral turned gunner, short grey beard, one cybernetic eye glowing orange, heavy charcoal armoured coat with worn brass rank bars. Background: a shipyard foundry with sparks and glowing molten metal. Strong orange rim light from the left |
| `c25` | Ilse Marrow, Hüterin der Tiefe (Technik, Aschenorden) | A lean woman in her forties, master reactor engineer, soot on her cheek, welding goggles pushed up into short copper hair, heat-scarred leather apron over a pressure suit, calm focused gaze. Background: the glowing core of a reactor chamber, drifting embers. Strong orange rim light from the left |
| `c23` | Oriel Santhe, Geist von Helix (Schmuggel, Helix-Kartell) | An androgynous figure in their thirties, legendary smuggler, half the face hidden by a sleek matte mask, pale eyes, hooded iridescent black cloak with thin magenta light seams, a faint smirk. Background: a neon night market in haze with shadowy silhouettes. Strong magenta rim light from the left |
| `c28` | Okon Rhee, Kometenreiter (Pilot, Helix-Kartell) | A wiry man in his thirties, daredevil pilot, grinning, shaved sides with a short dreadlock crest, flight suit covered in mismatched patches, cracked helmet under his arm reflecting magenta light. Background: a cockpit canopy with a comet tail streaking past. Strong magenta rim light from the left |
| `c26` | Dax Verhoeven, Der Makler (Händler, Zenit-Konsortium) | An immaculate man in his fifties, corporate broker, slicked silver hair, thin rimless glasses with scrolling data reflections, tailored white high-collar suit with a single platinum pin, cold polite smile. Background: a glass corporate tower at night with sterile light bands. Strong cool white-blue rim light from the left |
| `c27` | Sera Quill, Nullsignatur (Schmuggel, Zenit-Konsortium) | A poised woman in her thirties, corporate defector and ghost courier, sharp bob haircut, a faint shimmering stealth field distorting one shoulder, slim grey bodysuit with a stolen executive badge, watchful eyes. Background: an empty white corridor with glass walls and security light strips. Strong cool white-blue rim light from the left |
| `c29` | Marisol Kade, Zunftmeisterin (Technik, Freie Gilde Tessera) | A sturdy woman in her sixties, guild master engineer, warm lined face, braided grey hair with small brass tools woven in, oil-stained teal work jacket with guild sash, a small repair drone hovering at her shoulder. Background: a busy trade station workshop with a window to space, teal nebula. Strong cyan rim light from the left |
| `c24` | ECHO-9, Erwachter Schiffsgeist (Singularität, Zenit-Konsortium) | Not a human: an awakened ship intelligence shown as a translucent humanoid bust made of white-blue light filaments and floating glass shards, a single bright ring where the face would be, serene and unsettling. Background: the dark bridge of an empty starship, consoles lighting up on their own. Strong cool white-blue rim light, prismatic highlights |
| `c30` | MUTTER, Die Stimme hinter Helix (Singularität, Helix-Kartell) | Not a human: a vast artificial mind shown as a veiled feminine silhouette formed from thousands of tiny magenta data threads, no visible face, only a soft glow behind the veil, regal and menacing. Background: a cathedral-like server vault disappearing into darkness. Strong magenta rim light, prismatic highlights |

**Drei Wege, die Bilder zu erzeugen:**

| Weg | Aufwand | Kosten |
|---|---|---|
| Von Hand in Gemini oder ChatGPT: Prompt einfügen, Bild herunterladen, hier hochladen oder ins Repo legen | Etwa 2 Minuten pro Karte | Im Rahmen deines Abos |
| Über Figma: läuft vollautomatisch aus dieser Sitzung | Keiner für dich | KI-Guthaben deines Figma-Plans |
| Über einen API-Schlüssel (Google AI Studio oder OpenAI): läuft automatisch, sobald der Schlüssel sicher hinterlegt ist | Einmalig Schlüssel anlegen | API-Abrechnung getrennt vom App-Abo |

Zuschneiden auf 640 x 800, Umwandeln in WebP und Einbauen übernehme ich in allen drei Fällen.

## Was zu klären ist, bevor alle 130 Karten so entstehen

| Punkt | Einschätzung |
|---|---|
| **Kosten** | Das Bild entstand über das Figma-Bildwerkzeug und hat KI-Guthaben deines Figma-Plans verbraucht. Für 130 Karten vorher die Kosten pro Bild prüfen, oder ein anderes Werkzeug nehmen |
| **Einheitlicher Stil** | Ein einzelnes Bild beweist die Qualität, nicht die Konsistenz. Erst 8 bis 10 Karten quer durch alle Fraktionen zeigen, ob der Stil hält |
| **Nutzungsrechte** | Lizenzbedingungen des Werkzeugs für kommerzielle Nutzung prüfen. Der Urheberschutz für rein KI-erzeugte Bilder ist in vielen Ländern unsicher: Andere dürften die Bilder womöglich kopieren |
| **Offenlegung** | Manche Plattformen verlangen einen Hinweis auf KI-erzeugte Inhalte (Steam tut es). Für Apple und Google vor Release prüfen |
| **Download-Grösse** | 130 Karten zu je 50 kB sind rund 6.5 MB. Im Browser werden sie einzeln nachgeladen, das ist unkritisch |
| **Reihenfolge** | Zuerst die 10 Legenden und Singularitäten, dann die 20 Elite-Karten. Standard-Karten können den prozeduralen Avatar behalten: Das verstärkt den Abstand zwischen den Seltenheiten |
