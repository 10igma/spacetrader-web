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

## Was zu klären ist, bevor alle 130 Karten so entstehen

| Punkt | Einschätzung |
|---|---|
| **Kosten** | Das Bild entstand über das Figma-Bildwerkzeug und hat KI-Guthaben deines Figma-Plans verbraucht. Für 130 Karten vorher die Kosten pro Bild prüfen, oder ein anderes Werkzeug nehmen |
| **Einheitlicher Stil** | Ein einzelnes Bild beweist die Qualität, nicht die Konsistenz. Erst 8 bis 10 Karten quer durch alle Fraktionen zeigen, ob der Stil hält |
| **Nutzungsrechte** | Lizenzbedingungen des Werkzeugs für kommerzielle Nutzung prüfen. Der Urheberschutz für rein KI-erzeugte Bilder ist in vielen Ländern unsicher: Andere dürften die Bilder womöglich kopieren |
| **Offenlegung** | Manche Plattformen verlangen einen Hinweis auf KI-erzeugte Inhalte (Steam tut es). Für Apple und Google vor Release prüfen |
| **Download-Grösse** | 130 Karten zu je 50 kB sind rund 6.5 MB. Im Browser werden sie einzeln nachgeladen, das ist unkritisch |
| **Reihenfolge** | Zuerst die 10 Legenden und Singularitäten, dann die 20 Elite-Karten. Standard-Karten können den prozeduralen Avatar behalten: Das verstärkt den Abstand zwischen den Seltenheiten |
