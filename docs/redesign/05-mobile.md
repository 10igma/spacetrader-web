# Projekt Nova: Mobile-Hülle (Phase 5)

Die App für Android und iOS ist dieselbe Web-App wie im Browser, verpackt mit Capacitor. Die nativen Projekte liegen im Repository unter `packages/client/android` und `packages/client/ios`.

## Stand

| Baustein | Stand | Geprüft durch |
|---|---|---|
| Android-Projekt, baut zu einer installierbaren Debug-App (rund 7 MB) | fertig | Hier gebaut, Inhalt der App geprüft (Paketname, Rechte, Icons, Web-Dateien). **Nicht auf einem Gerät gestartet** |
| iOS-Projekt | angelegt | **Nicht gebaut**: braucht einen Mac mit Xcode |
| Icon, Startbild, Benachrichtigungs-Icon | fertig | Aus einer Zeichnung erzeugt: `pnpm mobile:assets` |
| Hochformat fest, dunkle Statusleiste, Inhalt bis unter die Statusleiste, Safe Areas | fertig | Im Projekt gesetzt, auf dem Gerät zu prüfen |
| Haptik: Tippen, Geld, Warnung, Verlust, Sprung, Karten-Enthüllung nach Seltenheit | fertig | Nur im Code geprüft, das Gefühl braucht ein Gerät |
| Erinnerungen als lokale Benachrichtigungen, ohne Server | fertig | 4 Tests für die Planung, Anzeige braucht ein Gerät |
| Android-Zurück-Taste schliesst, was oben liegt, dann zur Station, dann App in den Hintergrund | fertig | Automatischer Durchlauf im Browser |
| Rückkehr in die App holt den aktuellen Stand (Timer, Tageswechsel) | fertig | Automatischer Durchlauf im Browser |
| Spielstand übersteht Updates der Regeln | fertig | 3 Tests und ein Durchlauf mit einem alten Spielstand |
| Installierbare Web-App (Manifest, Icons, Offline-Cache) | fertig | Manifest und Icons im Durchlauf geprüft, Installation braucht eine HTTPS-Adresse |
| Kippen der Karten über den Lagesensor | fertig | iOS fragt beim ersten Öffnen einer Karte um Erlaubnis |

## Android: App bauen und installieren

Voraussetzungen: Node 22, pnpm, JDK 21, Android SDK (Plattform 36, Build-Tools 36).

```bash
pnpm install
```

```bash
pnpm android:apk
```

Die App liegt danach unter `packages/client/android/app/build/outputs/apk/debug/app-debug.apk`. Auf das Handy kopieren und öffnen. Android fragt einmal, ob Apps aus dieser Quelle installiert werden dürfen.

Mit Android Studio geht es bequemer: `packages/client/android` öffnen, Gerät per USB anschliessen, Start drücken.

## iOS: App bauen

Voraussetzungen: Mac mit Xcode, Apple-Developer-Account für Tests auf einem Gerät.

```bash
pnpm install
```

```bash
pnpm mobile:sync
```

```bash
cd packages/client && npx cap open ios
```

In Xcode das Team für die Signatur wählen und auf einem Gerät starten.

## Nach jeder Änderung am Spiel

```bash
pnpm mobile:sync
```

Das baut die Web-App und kopiert sie in beide nativen Projekte.

## Erinnerungen

Die App plant Benachrichtigungen lokal auf dem Gerät, sobald sie in den Hintergrund geht. Es gibt keinen Push-Server.

- **Aus, bis der Spieler sie einschaltet.** Der Schalter liegt im Profil unter "Gerät". Erst dann fragt das System um Erlaubnis.
- **Nur was wirklich wartet:** Konvoi zurück, Container entsiegelt, Gratis-Lager voll, Tank voll, Handelsposten voll, Serie endet heute, Wochenend-Event beginnt, Saison endet morgen.
- **Höchstens sechs geplante Erinnerungen**, mindestens 45 Minuten Abstand, nie zwischen 22 und 8 Uhr Ortszeit. Was in die Nachtruhe fällt, kommt um 8 Uhr.
- **Ungenaue Alarme:** Android darf sie um einige Minuten verschieben. Dafür braucht die App keine Sonderrechte.

Die Regeln stehen in `packages/core/src/reminders.ts`, die Texte in `packages/client/src/native/reminders.ts`.

## Vor einem Store-Upload noch offen

1. **App-Kennung.** `app.projektnova.game` ist ein Platzhalter in `capacitor.config.ts`. Sie muss vor dem ersten Upload feststehen und lässt sich danach nicht mehr ändern.
2. **Signatur.** Für den Play Store ein Upload-Schlüssel und ein Release-Build (`bundleRelease`), für den App Store Zertifikat und Profil.
3. **Datenschutzerklärung.** Im Offline-Modus verlässt nichts das Gerät. Mit Server und Konten ändert sich das.
4. **Altersfreigabe.** Das Spiel enthält simuliertes Glücksspiel (Container, Glücksrad, Bergung) und das Thema Drogen- und Waffenschmuggel. Das führt in den Fragebögen beider Stores zu einer höheren Einstufung. Apple verlangt die Angabe der Quoten für Lootboxen, sie stehen im Hangar unter "Quoten".
5. **Echtgeld** gibt es nicht. Sobald es dazukommt, gelten die Regeln der Stores für Käufe und in einigen Ländern eigene Gesetze zu Lootboxen (siehe Dokument 02, Leitplanken).
6. **Test auf Geräten:** Bildrate, Wärme und Akku auf einem älteren Android-Gerät und einem iPhone, Klang über Lautsprecher und Kopfhörer, Haptik, Benachrichtigungen, Verhalten bei Anruf und App-Wechsel.
