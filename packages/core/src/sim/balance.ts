// Balance report: pnpm --filter @nova/core balance [seeds] [days]
import { simulate, type DaySample, type Policy } from './bots.ts';

const seeds = Number(process.argv[2] ?? 200);
const days = Number(process.argv[3] ?? 14);
const q = (xs: number[], p: number): number => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]!;
const fmt = (n: number): string => Math.round(n).toLocaleString('de-CH').padStart(10);
const dayText = (d: number, horizon: number): string => (Number.isFinite(d) ? `Tag ${d}` : `nach Tag ${horizon}`);

for (const policy of ['legal', 'smuggler'] as Policy[]) {
  const runs: DaySample[][] = [];
  const log: Record<string, number> = {};
  for (let i = 0; i < seeds; i++) {
    const r = simulate(`bal-${i}`, policy, days);
    runs.push(r.samples);
    for (const [k, v] of Object.entries(r.log)) log[k] = (log[k] ?? 0) + v;
  }
  console.log(`\n=== ${policy} (${seeds} Spieler, ${days} Tage, 3 Sessions pro Tag) ===`);
  console.log('Tag   Vermögen p10     Median        p90  Gewinn/Sprung  Stufe  Karten  Legenden  Container  Quanten  Splitter  Serie  Sprünge  erwischt');
  for (const d of [1, 2, 3, 5, 7, 10, 14, 21, 30, 42, 60, 90].filter((x) => x <= days)) {
    const at = runs.map((r) => r[d - 1]!);
    console.log(
      `${String(d).padStart(3)} ${fmt(q(at.map((s) => s.worth), 0.1))} ${fmt(q(at.map((s) => s.worth), 0.5))} ${fmt(q(at.map((s) => s.worth), 0.9))}`
      + `  ${fmt(q(at.map((s) => s.profit / Math.max(1, s.jumps)), 0.5)).padStart(13)}`
      + `  ${String(q(at.map((s) => s.level), 0.5)).padStart(5)}  ${String(q(at.map((s) => s.cards), 0.5)).padStart(6)}  ${(at.reduce((a, s) => a + s.legends, 0) / at.length).toFixed(1).padStart(8)}  ${String(q(at.map((s) => s.crates), 0.5)).padStart(9)}  ${String(q(at.map((s) => s.quanta), 0.5)).padStart(7)}  ${String(q(at.map((s) => s.shards), 0.5)).padStart(8)}  ${String(q(at.map((s) => s.streak), 0.5)).padStart(5)}`
      + `  ${String(q(at.map((s) => s.jumps), 0.5)).padStart(7)}  ${(at.reduce((a, s) => a + s.caught, 0) / at.length).toFixed(1).padStart(8)}`,
    );
  }
  const jumps = log.JumpStarted ?? 1;
  const pick = (prefix: string): string => Object.entries(log).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => `${k.slice(prefix.length)} ${v}`).join(', ');
  console.log(`Begegnungen pro 100 Sprünge: Piraten ${(((log['EncounterStarted'] ?? 0) - Object.entries(log).filter(([k]) => k.startsWith('customs:')).reduce((a, [, v]) => a + v, 0)) / jumps * 100).toFixed(1)}, Zoll ${(Object.entries(log).filter(([k]) => k.startsWith('customs:')).reduce((a, [, v]) => a + v, 0) / jumps * 100).toFixed(1)}`);
  console.log(`Piraten: ${pick('pirates:')}`);
  console.log(`Zoll: ${pick('customs:')}`);
  console.log(`Abgelehnte Befehle: ${pick('rejected:') || 'keine'}`);
  const firstLegend = runs.map((r) => r.find((s) => s.legends > 0)?.day ?? Infinity);
  console.log(`Erste Legende: Median ${dayText(q(firstLegend, 0.5), days)}, frühestes Zehntel ${dayText(q(firstLegend, 0.1), days)}, spätestes Zehntel ${dayText(q(firstLegend, 0.9), days)}`);
  const album = runs.map((r) => r.find((s) => s.albums > 0)?.day ?? Infinity);
  console.log(`Erstes volles Album: Median ${dayText(q(album, 0.5), days)}, frühestes Zehntel ${dayText(q(album, 0.1), days)}`);
  const collected = log.PostsCollected ?? 0;
  console.log(`Handelsposten: Stufen gesamt Tag ${days}: Median ${q(runs.map((r) => r[days - 1]!.posts), 0.5)}, Abholungen ${collected}. Bergung: ${log.SalvageOpened ?? 0} gekauft. Manifeste: ${log.ManifestDone ?? 0}. Shop-Käufe: ${log.OfferBought ?? 0}`);
  const at = (d: number) => runs.map((r) => r[Math.min(days, d) - 1]!);
  console.log(`Liga-Stufe (0 Bronze bis 4 Diamant) Median: Tag 7: ${q(at(7).map((s) => s.league), 0.5)}, Tag 14: ${q(at(14).map((s) => s.league), 0.5)}, Tag 21: ${q(at(21).map((s) => s.league), 0.5)}, Tag 30: ${q(at(30).map((s) => s.league), 0.5)}`);
  const bought = runs.map((r) => r.find((s) => s.charterPremium)?.day ?? Infinity);
  console.log(`Charter-Stufe Median: Tag 7: ${q(at(7).map((s) => s.charter), 0.5)}, Tag 14: ${q(at(14).map((s) => s.charter), 0.5)}, Tag 30: ${q(at(30).map((s) => s.charter), 0.5)} von 40. Premium gekauft: Median ${dayText(q(bought, 0.5), days)}`);
  console.log(`Schiff (0 Sperling bis 5 Leviathan) Median: Tag 7: ${q(at(7).map((s) => s.ship), 0.5)}, Tag 14: ${q(at(14).map((s) => s.ship), 0.5)}, Tag 21: ${q(at(21).map((s) => s.ship), 0.5)}, Tag 30: ${q(at(30).map((s) => s.ship), 0.5)}, Tag ${days}: ${q(at(days).map((s) => s.ship), 0.5)}. Modul-Stufen von 18: Tag 7: ${q(at(7).map((s) => s.modules), 0.5)}, Tag 14: ${q(at(14).map((s) => s.modules), 0.5)}, Tag 30: ${q(at(30).map((s) => s.modules), 0.5)}, Tag ${days}: ${q(at(days).map((s) => s.modules), 0.5)}`);
  const done = runs.map((r) => r.find((s) => s.edition >= 12)?.day ?? Infinity);
  const first = runs.map((r) => r.find((s) => s.prestige >= 1)?.day ?? Infinity);
  console.log(`Saison-Edition (von 12) Median: Tag 7: ${q(at(7).map((s) => s.edition), 0.5)}, Tag 14: ${q(at(14).map((s) => s.edition), 0.5)}, Tag 21: ${q(at(21).map((s) => s.edition), 0.5)}, Tag 30: ${q(at(30).map((s) => s.edition), 0.5)}. Album komplett: ${runs.filter((r) => r.some((s) => s.edition >= 12)).length} von ${runs.length}, Median ${dayText(q(done, 0.5), days)}`);
  console.log(`Prestige: erstes im Median ${dayText(q(first, 0.5), days)}, Rang am Ende Median ${q(at(days).map((s) => s.prestige), 0.5)}`);
  const back = (log['convoy:ok'] ?? 0) + (log['convoy:fail'] ?? 0);
  console.log(`Konvois: ${back} zurück (${(back / runs.length / days).toFixed(1)} pro Spieler und Tag), davon ${back ? Math.round(((log['convoy:ok'] ?? 0) / back) * 100) : 0} % erfolgreich`);
  console.log(`Auktionen: ${log.BidPlaced ?? 0} Gebote, ${log.CardListed ?? 0} eigene Angebote`);
  console.log(`Verlorene Container (Hangar voll): ${log.CrateLost ?? 0} bei ${log.CrateEarned ?? 0} verdienten`);
  const broke = runs.filter((r) => r[days - 1]!.worth < 500).length;
  console.log(`Pleite am Ende (unter 500): ${broke} von ${seeds}`);
}
