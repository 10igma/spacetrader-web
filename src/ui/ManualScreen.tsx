import { memo, useState } from 'react';

const sections = [
  'overview',
  'getting-started',
  'navigation',
  'trading',
  'ship-equipment',
  'encounters',
  'combat',
  'special-events',
  'winning',
] as const;

type Section = typeof sections[number];

const sectionLabels: Record<Section, string> = {
  'overview': '🌌 Game Overview',
  'getting-started': '🚀 Getting Started',
  'navigation': '🗺️ Navigation',
  'trading': '💰 Trading',
  'ship-equipment': '🛸 Ships & Equipment',
  'encounters': '⚔️ Encounters',
  'combat': '💥 Combat',
  'special-events': '✨ Special Events',
  'winning': '🏆 Winning the Game',
};

function SectionHeader({ children }: { children: string }) {
  return <h2 className="text-xl font-bold text-cyan-400 mt-6 mb-3 border-b border-gray-700 pb-1">{children}</h2>;
}

function SubHeader({ children }: { children: string }) {
  return <h3 className="text-sm font-bold text-amber-400 mt-4 mb-1.5">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-300 text-sm leading-relaxed mb-2">{children}</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left text-cyan-400 px-2 py-1 border-b border-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/50' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-gray-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewSection() {
  return (
    <>
      <SectionHeader>🌌 Game Overview</SectionHeader>
      <P>
        Space Trader is a classic space trading and exploration game set in a galaxy of 120 star systems.
        You play as a space captain starting with a small ship, 1,000 credits, and a dream of fortune.
      </P>
      <P>
        Your goal is to amass wealth through trading commodities between star systems, completing quests,
        and surviving encounters with pirates, police, and other travelers. The ultimate achievement is
        buying a moon in the Utopia system for 500,000 credits and retiring there — but you can also
        retire at any time for a lower score, or meet an untimely end in combat.
      </P>
      <SubHeader>Key Mechanics</SubHeader>
      <P>
        • <span className="text-cyan-300">Trading</span> — Buy low, sell high across systems with different tech levels and economies<br />
        • <span className="text-cyan-300">Travel</span> — Navigate between systems using fuel, encountering ships along the way<br />
        • <span className="text-cyan-300">Upgrades</span> — Buy better ships, weapons, shields, and gadgets<br />
        • <span className="text-cyan-300">Quests</span> — Special events and multi-system quest chains for big rewards<br />
        • <span className="text-cyan-300">Reputation</span> — Your police record and combat reputation affect encounters
      </P>
      <SubHeader>Difficulty Levels</SubHeader>
      <P>
        The game offers 5 difficulty levels: <span className="text-green-400">Beginner</span>,{' '}
        <span className="text-green-400">Easy</span>, <span className="text-amber-400">Normal</span>,{' '}
        <span className="text-red-400">Hard</span>, and <span className="text-red-400">Impossible</span>.
        Higher difficulty means tougher opponents, less forgiving flee mechanics, and a higher score multiplier.
        On Beginner, you always escape unharmed when fleeing.
      </P>
    </>
  );
}

function GettingStartedSection() {
  return (
    <>
      <SectionHeader>🚀 Getting Started</SectionHeader>
      <P>
        When creating a new game, you name your commander and allocate <span className="text-amber-300">skill points</span> across
        four skills. You start with a <span className="text-cyan-300">Gnat</span> ship (15 cargo bays, 1 weapon slot, 1 gadget slot)
        equipped with a Pulse Laser, 1,000 credits, and no debt.
      </P>
      <SubHeader>Skills (Max 10 each)</SubHeader>
      <P>
        You distribute points among four skills. Each skill is capped at 10. Crew members can supplement your skills — the game
        uses the best skill value among your crew for each category.
      </P>
      <P>
        • <span className="text-cyan-300">Pilot</span> — Affects your ability to dodge attacks and flee from encounters. Boosted by the Navigating System (+3) and Cloaking Device (+2).<br />
        • <span className="text-cyan-300">Fighter</span> — Determines your combat effectiveness (hit chance and damage). Boosted by the Targeting System (+3).<br />
        • <span className="text-cyan-300">Trader</span> — Lowers buy prices and improves trade deals. Ambassador Jarek gives +1 when aboard.<br />
        • <span className="text-cyan-300">Engineer</span> — Reduces damage taken, aids in repairs, and helps with cloaking. Boosted by Auto-Repair System (+3).
      </P>
      <P>
        On Beginner and Easy difficulty, all skills get a hidden +1 bonus. On Impossible, they get -1.
      </P>
      <SubHeader>Starting Position</SubHeader>
      <P>
        You begin at a randomly selected system with a moderate tech level (1–5) and at least 3 reachable neighbors
        within your fuel range.
      </P>
    </>
  );
}

function NavigationSection() {
  return (
    <>
      <SectionHeader>🗺️ Navigation</SectionHeader>
      <P>
        The galaxy contains 120 star systems spread across a 150×110 parsec map. Each system has a tech level,
        government type, size, and special resources that determine what goods are available and at what price.
      </P>
      <SubHeader>Galactic Chart</SubHeader>
      <P>
        The full galaxy map shows all 120 systems. Click a system to select it as your warp destination.
        Your fuel range is shown as a circle — you can only warp to systems within range.
      </P>
      <SubHeader>Short Range Chart</SubHeader>
      <P>
        A zoomed-in view showing nearby systems within approximately 20 parsecs. Systems you've visited are
        highlighted differently from unvisited ones. This is your primary navigation tool.
      </P>
      <SubHeader>Fuel & Travel</SubHeader>
      <P>
        Travel consumes fuel equal to the distance in parsecs to the destination. The Gnat has 14 parsec fuel tanks;
        the largest tanks hold 20 parsecs (Flea). You can buy fuel at any system — cost varies by ship type
        (1–20 credits per parsec depending on your ship).
      </P>
      <SubHeader>Wormholes</SubHeader>
      <P>
        The galaxy contains 6 wormholes that connect pairs of distant systems. Wormhole travel is free — no fuel
        cost! Wormholes are shown on the galaxy map. They form a ring: each wormhole connects to the next in
        sequence, with the last connecting back to the first.
      </P>
      <SubHeader>Warp</SubHeader>
      <P>
        When you select a destination and initiate warp, you travel to the new system. During warp,
        you may encounter other ships (pirates, police, traders, or special encounters). Each warp
        advances the game by one day.
      </P>
    </>
  );
}

function TradingSection() {
  return (
    <>
      <SectionHeader>💰 Trading</SectionHeader>
      <P>
        Trading is the primary way to earn money. The galaxy trades 10 commodities, each with different
        price characteristics based on tech level, government type, system status, and special resources.
      </P>
      <SubHeader>Commodities</SubHeader>
      <Table
        headers={['Item', 'Base Price', 'Tech Needed', 'Best Tech', 'Price Driver']}
        rows={[
          ['Water', '30 cr', 'Pre-ag', 'Medieval', 'Drought ×2'],
          ['Furs', '250 cr', 'Pre-ag', 'Pre-ag', 'Cold ×2'],
          ['Food', '100 cr', 'Agricultural', 'Agricultural', 'Crop Failure ×2'],
          ['Ore', '350 cr', 'Medieval', 'Renaissance', 'War ×2'],
          ['Games', '250 cr', 'Renaissance', 'Post-industrial', 'Boredom ×2'],
          ['Firearms', '1,250 cr', 'Renaissance', 'Industrial', 'War ×2'],
          ['Medicine', '650 cr', 'Early Industrial', 'Post-industrial', 'Plague ×2'],
          ['Machines', '900 cr', 'Early Industrial', 'Industrial', 'Lack of Workers ×2'],
          ['Narcotics', '3,500 cr', 'Industrial', 'Industrial', 'Boredom ×2'],
          ['Robots', '5,000 cr', 'Post-industrial', 'Hi-tech', 'Lack of Workers ×2'],
        ]}
      />
      <SubHeader>Price Factors</SubHeader>
      <P>
        • <span className="text-cyan-300">Tech level</span> — Each commodity has a base price that changes with tech level. Goods like Water get cheaper at higher tech, while Robots only appear at high tech.<br />
        • <span className="text-cyan-300">System status</span> — War, Plague, Drought, etc. can double the price of related goods. A system in Drought pays much more for Water.<br />
        • <span className="text-cyan-300">Special resources</span> — Systems with Lots of Water sell Water cheaply; Desert systems sell it expensively.<br />
        • <span className="text-cyan-300">Government</span> — Some governments ban Narcotics or Firearms. Anarchies have cheap goods but lots of pirates.<br />
        • <span className="text-cyan-300">System size</span> — Larger systems have slightly lower prices due to higher production.<br />
        • <span className="text-cyan-300">Trader skill</span> — Higher Trader skill reduces the markup between buy and sell prices (up to ~12% savings).
      </P>
      <SubHeader>Trading Tips</SubHeader>
      <P>
        • Buy goods at low-tech systems and sell at high-tech systems (Water, Furs, Food)<br />
        • Buy high-tech goods (Robots, Machines) at hi-tech systems and sell at low-tech systems that can use them<br />
        • Watch for system status events — selling Medicine to a Plague-struck system is very profitable<br />
        • Narcotics and Firearms are high-profit but illegal in some systems — police may confiscate them<br />
        • Criminals (low police record) pay a 10% penalty on sell prices due to intermediary costs
      </P>
      <SubHeader>Cargo Operations</SubHeader>
      <P>
        • <span className="text-cyan-300">Buy</span> — Purchase goods from a system's marketplace<br />
        • <span className="text-cyan-300">Sell</span> — Sell goods at the current system's prices<br />
        • <span className="text-cyan-300">Dump</span> — Pay to legally dispose of cargo (costs 5× difficulty per unit)<br />
        • <span className="text-cyan-300">Jettison</span> — Throw cargo into space (free, but may get you fined for littering)
      </P>
    </>
  );
}

function ShipEquipmentSection() {
  return (
    <>
      <SectionHeader>🛸 Ships & Equipment</SectionHeader>
      <SubHeader>Buyable Ships</SubHeader>
      <Table
        headers={['Ship', 'Cargo', 'Wpn', 'Shd', 'Gdg', 'Crew', 'Fuel', 'Hull', 'Price']}
        rows={[
          ['Flea', 10, 0, 0, 0, 1, 20, 25, '2,000'],
          ['Gnat', 15, 1, 0, 1, 1, 14, 100, '10,000'],
          ['Firefly', 20, 1, 1, 1, 1, 17, 100, '25,000'],
          ['Mosquito', 15, 2, 1, 1, 1, 13, 100, '30,000'],
          ['Bumblebee', 25, 1, 2, 2, 2, 15, 100, '60,000'],
          ['Beetle', 50, 0, 1, 1, 3, 14, 50, '80,000'],
          ['Hornet', 20, 3, 2, 1, 2, 16, 150, '100,000'],
          ['Grasshopper', 30, 2, 2, 3, 3, 15, 150, '150,000'],
          ['Termite', 60, 1, 3, 2, 3, 13, 200, '225,000'],
          ['Wasp', 35, 3, 2, 2, 3, 14, 200, '300,000'],
        ]}
      />
      <P>
        The <span className="text-cyan-300">Flea</span> is the cheapest escape ship with maximum fuel range but no weapons.
        The <span className="text-cyan-300">Beetle</span> is a pure cargo hauler (50 bays, no weapons).
        The <span className="text-cyan-300">Wasp</span> is the most powerful combat vessel.
        Ships are available at shipyards in systems with sufficient tech level.
      </P>
      <P>
        When buying a new ship, your old ship's trade-in value (75% of base + equipment) is deducted from the price.
        Ships with Tribbles are worth only 25% trade-in!
      </P>

      <SubHeader>Weapons</SubHeader>
      <Table
        headers={['Weapon', 'Power', 'Price', 'Min Tech']}
        rows={[
          ['Pulse Laser', 15, '2,000 cr', 'Industrial'],
          ['Beam Laser', 25, '12,500 cr', 'Post-industrial'],
          ['Military Laser', 35, '35,000 cr', 'Hi-tech'],
          ["Morgan's Laser", 85, 'Quest only', '—'],
        ]}
      />

      <SubHeader>Shields</SubHeader>
      <Table
        headers={['Shield', 'Strength', 'Price', 'Min Tech']}
        rows={[
          ['Energy Shield', 100, '5,000 cr', 'Industrial'],
          ['Reflective Shield', 200, '20,000 cr', 'Post-industrial'],
          ['Lightning Shield', 350, 'Quest only', '—'],
        ]}
      />

      <SubHeader>Gadgets</SubHeader>
      <Table
        headers={['Gadget', 'Effect', 'Price', 'Min Tech']}
        rows={[
          ['5 Extra Cargo Bays', '+5 cargo capacity', '2,500 cr', 'Early Industrial'],
          ['Auto-Repair System', 'Engineer +3', '7,500 cr', 'Industrial'],
          ['Navigating System', 'Pilot +3', '15,000 cr', 'Post-industrial'],
          ['Targeting System', 'Fighter +3', '25,000 cr', 'Post-industrial'],
          ['Cloaking Device', 'Avoid encounters if Engineer > opponent', '100,000 cr', 'Hi-tech'],
          ['Fuel Compactor', 'Sets fuel tanks to 18 (quest only)', 'Quest only', '—'],
        ]}
      />

      <SubHeader>Fuel & Repairs</SubHeader>
      <P>
        Fuel cost varies by ship (1–20 cr per parsec). You can buy fuel at any system.
        Hull repairs cost varies by ship type (1–5 cr per hull point). Keep your ship repaired — if hull reaches 0,
        your ship is destroyed!
      </P>
      <SubHeader>Escape Pod</SubHeader>
      <P>
        You can buy an escape pod for emergency survival. If your ship is destroyed while you have one,
        you survive and arrive at a nearby system in a Flea ship — but lose all cargo, equipment, and crew.
      </P>
      <SubHeader>Insurance</SubHeader>
      <P>
        Ship insurance pays out when your ship is destroyed (if you have an escape pod). The payout is based
        on your ship's current value. No-claim bonuses reduce your premium over time.
      </P>
    </>
  );
}

function EncountersSection() {
  return (
    <>
      <SectionHeader>⚔️ Encounters</SectionHeader>
      <P>
        During warp travel, you may encounter other ships. The type and frequency of encounters depends on
        the destination system's government, your police record, your net worth, and difficulty level.
      </P>
      <SubHeader>Police</SubHeader>
      <P>
        Police encounters depend on the system's government (strong police in Fascist/Military states,
        none in Anarchy). Police may:
      </P>
      <P>
        • <span className="text-cyan-300">Inspect</span> — Check your cargo for illegal goods (Narcotics, Firearms in restricted systems)<br />
        • <span className="text-cyan-300">Attack</span> — If you have a very bad police record (Villain/Psychopath), or if you're transporting the criminal Jonathan Wild<br />
        • <span className="text-cyan-300">Ignore</span> — Let you pass peacefully
      </P>
      <P>
        Attacking or killing police severely damages your police record. Fleeing from an inspection also hurts your record.
        With a terrible police record (Psychopath), police send 3–5× stronger ships after you.
      </P>

      <SubHeader>Pirates</SubHeader>
      <P>
        Pirates are common in lawless systems (Anarchy, Feudal States). Their strength scales with your net
        worth — richer commanders face tougher pirates. Pirates will:
      </P>
      <P>
        • <span className="text-cyan-300">Attack</span> — Try to destroy you and take your cargo<br />
        • <span className="text-cyan-300">Flee</span> — If outmatched, they'll try to escape<br />
        • <span className="text-cyan-300">Surrender</span> — Offer their cargo to save themselves
      </P>
      <P>Killing pirates improves your reputation and police record slightly. Plundering their cargo hurts your police record.</P>

      <SubHeader>Traders</SubHeader>
      <P>
        Traders are found in systems with strong commerce (Capitalist, Corporate States). They usually ignore you
        but may offer to buy or sell goods in orbit at random prices. Some may flee if they feel threatened.
      </P>
      <P>
        Attacking traders is criminal and severely hurts your police record (-2 per attack, -4 per kill).
      </P>

      <SubHeader>Very Rare Encounters</SubHeader>
      <P>
        With a 5% chance, you may encounter unique events during travel:
      </P>
      <P>
        • <span className="text-cyan-300">Marie Celeste</span> — An abandoned ship with cargo you can take (but the cargo is Narcotics, and police may follow up)<br />
        • <span className="text-cyan-300">Captain Ahab/Conrad/Huie</span> — Famous captains in powerful Wasp ships<br />
        • <span className="text-cyan-300">Bottle (Old/Good)</span> — Messages in space bottles with skill boosts or just flavor text
      </P>
    </>
  );
}

function CombatSection() {
  return (
    <>
      <SectionHeader>💥 Combat</SectionHeader>
      <P>
        Combat is turn-based. Each round, you choose an action and your opponent responds.
      </P>
      <SubHeader>Actions</SubHeader>
      <P>
        • <span className="text-cyan-300">Attack</span> — Fire your weapons at the opponent<br />
        • <span className="text-cyan-300">Flee</span> — Attempt to escape (success based on Pilot skill vs opponent's Pilot skill)<br />
        • <span className="text-cyan-300">Surrender</span> — Give up (police may fine you; pirates take your cargo)
      </P>
      <SubHeader>How Damage Works</SubHeader>
      <P>
        1. The attacker's <span className="text-amber-300">Fighter skill</span> is checked against the defender's <span className="text-amber-300">Pilot skill</span> and ship size to determine if the shot hits.<br />
        2. Damage is calculated from total weapon power, modified by the attacker's <span className="text-amber-300">Engineer skill</span> (up to +200%).<br />
        3. Shields absorb damage first — each shield slot has its own strength that depletes independently.<br />
        4. Remaining damage hits the hull, reduced by the defender's <span className="text-amber-300">Engineer skill</span>.<br />
        5. Maximum damage per hit is capped based on the defender's hull strength and difficulty level.
      </P>
      <SubHeader>Fleeing</SubHeader>
      <P>
        Flee success depends on your Pilot skill vs the opponent's. On Beginner difficulty, fleeing always succeeds
        and you take no damage while escaping. On higher difficulties, the opponent may still hit you as you run,
        and escape is not guaranteed.
      </P>
      <SubHeader>Ship Destruction</SubHeader>
      <P>
        If your hull reaches 0, your ship is destroyed. With an escape pod, you survive in a Flea.
        Without one, it's game over. Destroying enemy ships earns bounty money (25–2,500 cr based on ship value).
      </P>
      <SubHeader>The Scarab Exception</SubHeader>
      <P>
        The Scarab is a special ship with extremely tough hull (400). Only Pulse Lasers and Morgan's Laser
        can damage it — Beam and Military Lasers are ineffective against its unique hull.
      </P>
    </>
  );
}

function SpecialEventsSection() {
  return (
    <>
      <SectionHeader>✨ Special Events</SectionHeader>
      <P>
        Special events appear at specific systems. Visit systems and look for event notifications.
        Some are simple bonuses; others begin multi-step quest chains with major rewards.
      </P>
      <SubHeader>Major Quest Chains</SubHeader>
      <P>
        • <span className="text-cyan-300">Dragonfly Hunt</span> — Track the Dragonfly ship across Baratas → Melina → Regulas, then destroy it at Zalkon. The Dragonfly has weak hull (10) but 3 shield slots.<br />
        • <span className="text-cyan-300">Space Monster</span> — A 500-hull beast terrorizing the Acamar system. Kill it for a 15,000 cr reward.<br />
        • <span className="text-cyan-300">Japori Disease</span> — Deliver 10 bays of medicine to Japori to cure a plague (takes cargo space).<br />
        • <span className="text-cyan-300">Alien Artifact</span> — Find and deliver an alien artifact to a hi-tech system for 20,000 cr.<br />
        • <span className="text-cyan-300">Ambassador Jarek</span> — Transport the ambassador to Devidia. He boosts your Trader skill by +1 while aboard.<br />
        • <span className="text-cyan-300">Jonathan Wild</span> — Transport a wanted criminal. Police will be extra aggressive, but rewards await at Kravat.<br />
        • <span className="text-cyan-300">Alien Invasion</span> — Race to warn Gemulon before it's invaded (countdown: 8 days). Fail and Gemulon falls to anarchy.<br />
        • <span className="text-cyan-300">Dangerous Experiment</span> — Stop an experiment at Daled before it tears a hole in spacetime (countdown: 12 days). If it fails, creates a fabric rip.<br />
        • <span className="text-cyan-300">Morgan's Reactor</span> — Transport an unstable reactor from Nix. It takes 5–15 cargo bays (shrinking over time) and increases combat damage taken. Delivers to a system ~70 parsecs away.<br />
        • <span className="text-cyan-300">Scarab Hunt</span> — Find and destroy the stolen Scarab ship. Only Pulse/Morgan's Lasers work against it. Reward: permanent +50 hull upgrade.
      </P>
      <SubHeader>One-Time Events</SubHeader>
      <P>
        • <span className="text-cyan-300">Moon For Sale</span> — Buy a moon at Utopia for 500,000 cr to win the game with the best ending<br />
        • <span className="text-cyan-300">Skill Increase</span> — Pay 3,000 cr to boost a random skill by 1<br />
        • <span className="text-cyan-300">Erase Record</span> — Pay 5,000 cr to clean your police record<br />
        • <span className="text-cyan-300">Cargo For Sale</span> — Buy special cargo lots at discount prices (1,000 cr)<br />
        • <span className="text-cyan-300">Lottery Winner</span> — Free 1,000 cr!<br />
        • <span className="text-cyan-300">Lightning Shield</span> — Receive a powerful 350-power shield (quest reward)<br />
        • <span className="text-cyan-300">Fuel Compactor</span> — Sets your fuel tanks to 18 parsecs (quest reward)<br />
        • <span className="text-cyan-300">Tribble</span> — A cute creature that... multiplies. Tribbles fill your cargo bays and reduce your ship's trade-in value. Sell them at a Tribble Buyer event.
      </P>
    </>
  );
}

function WinningSection() {
  return (
    <>
      <SectionHeader>🏆 Winning the Game</SectionHeader>
      <SubHeader>End Conditions</SubHeader>
      <P>
        • <span className="text-green-400">Moon Purchase</span> — Buy the moon at Utopia for 500,000 cr. This is the best ending with the highest score.<br />
        • <span className="text-amber-400">Retirement</span> — Retire at any time for a moderate score (95% multiplier on your worth).<br />
        • <span className="text-red-400">Death</span> — Ship destroyed without an escape pod. Lowest score (90% multiplier).
      </P>
      <SubHeader>Score Calculation</SubHeader>
      <P>
        Your score is based on your net worth, difficulty level, and how you ended the game:
      </P>
      <P>
        • Net worth above 1,000,000 cr has diminishing returns (every credit above 1M counts as 1/10)<br />
        • <span className="text-red-400">Killed:</span> (Difficulty + 1) × Worth × 90 / 50,000<br />
        • <span className="text-amber-400">Retired:</span> (Difficulty + 1) × Worth × 95 / 50,000<br />
        • <span className="text-green-400">Moon:</span> (Difficulty + 1) × (Worth + DaysBonus) / 500 — bonus for fewer days played (up to 100×Difficulty points for speed)
      </P>
      <SubHeader>Net Worth</SubHeader>
      <P>
        Your net worth includes: credits + ship value (with cargo and equipment) + moon value (if bought) − debt.
        Ship value accounts for hull condition, fuel level, all equipment, and cargo at purchase price.
      </P>
      <SubHeader>Police Record</SubHeader>
      <P>
        Your police record ranges from <span className="text-red-400">Psychopath</span> (below -70) through{' '}
        <span className="text-red-400">Villain</span>, <span className="text-red-400">Criminal</span>,{' '}
        <span className="text-amber-400">Dubious</span>, <span className="text-gray-300">Clean</span>,{' '}
        <span className="text-green-400">Lawful</span>, <span className="text-green-400">Trusted</span>,{' '}
        to <span className="text-green-400">Hero</span> (above 75).
        A criminal record means police attack on sight, sell prices drop 10%, and encounter difficulty increases.
      </P>
      <SubHeader>Reputation</SubHeader>
      <P>
        Your combat reputation goes from Harmless → Mostly Harmless → Poor → Average → Above Average →
        Competent → Dangerous → Deadly → Elite. Reputation is based on total kill value and affects
        what opponents think of you.
      </P>
      <SubHeader>Tips for High Scores</SubHeader>
      <P>
        • Play on higher difficulty for bigger score multipliers<br />
        • Buy the moon as quickly as possible — days matter for the Moon ending<br />
        • Trade Narcotics and Firearms for maximum profit (but watch your police record)<br />
        • Complete quests for unique equipment that money can't buy<br />
        • Invest in a good ship early — the Bumblebee is an excellent mid-game trader<br />
        • Use wormholes for free travel across the galaxy<br />
        • Keep debt low — interest adds up and reduces your net worth
      </P>
    </>
  );
}

const sectionComponents: Record<Section, () => React.ReactElement> = {
  'overview': OverviewSection,
  'getting-started': GettingStartedSection,
  'navigation': NavigationSection,
  'trading': TradingSection,
  'ship-equipment': ShipEquipmentSection,
  'encounters': EncountersSection,
  'combat': CombatSection,
  'special-events': SpecialEventsSection,
  'winning': WinningSection,
};

export default memo(function ManualScreen() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-cyan-400 font-mono tracking-wider">📖 HOW TO PLAY</h1>
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-900 rounded p-2">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeSection === s
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
        <ActiveComponent />
      </div>
    </div>
  );
});