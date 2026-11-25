# Space Trader — Game Design Document

Faithful web port of **Space Trader 1.2.2** by Pieter Spronck (Palm OS, 2002).

## Core Loop

1. **Start** at a random system with a Gnat ship, some credits, and basic equipment
2. **Trade** goods between solar systems — buy low, sell high
3. **Travel** (warp) between systems, consuming fuel
4. **Encounters** during travel — police, pirates, traders, special events
5. **Upgrade** ship, equipment, and crew at shipyards
6. **Manage** finances via the bank (loans, insurance)
7. **Win** by buying a moon, retiring wealthy, or getting killed

## Galaxy

- **120 solar systems** scattered on a 150×110 grid
- Each system has: tech level (0–7), government type (17 types), size, special resources, status
- **6 wormholes** connecting distant systems
- Systems regenerate trade goods over time

## Trading

10 trade items: Water, Furs, Food, Ore, Games, Firearms, Medicine, Machines, Narcotics, Robots

**Price formula:**
```
Price = PriceLowTech + (TechLevel × PriceInc)
± Variance (random)
+ modifiers for: system status, government, special resources
```

- Narcotics & Firearms are illegal in some governments
- Prices double during matching system events (e.g., War → Ore prices spike)

## Ships (10 buyable + 5 special)

| Ship | Cargo | Weapons | Shields | Gadgets | Crew | Fuel | Price |
|------|-------|---------|---------|---------|------|------|-------|
| Flea | 10 | 0 | 0 | 0 | 1 | 20 | 2,000 |
| Gnat | 15 | 1 | 0 | 1 | 1 | 14 | 10,000 |
| Firefly | 20 | 1 | 1 | 1 | 1 | 17 | 25,000 |
| Mosquito | 15 | 2 | 1 | 1 | 1 | 13 | 30,000 |
| Bumblebee | 25 | 1 | 2 | 2 | 2 | 15 | 60,000 |
| Beetle | 50 | 0 | 1 | 1 | 3 | 14 | 80,000 |
| Hornet | 20 | 3 | 2 | 1 | 2 | 16 | 100,000 |
| Grasshopper | 30 | 2 | 2 | 3 | 3 | 15 | 150,000 |
| Termite | 60 | 1 | 3 | 2 | 3 | 13 | 225,000 |
| Wasp | 35 | 3 | 2 | 2 | 3 | 14 | 300,000 |

## Combat

- Turn-based encounters during warp travel
- Actions: Attack, Flee, Surrender, Bribe (police), Yield (inspection)
- Damage = weapon power × random factor, reduced by shields
- Skills affect outcomes (Pilot → dodge, Fighter → damage, Engineer → repair)

## Skills (4 types, max 10 each)

- **Pilot**: dodge ability, navigation
- **Fighter**: weapon damage, combat success
- **Trader**: buy/sell price bonuses
- **Engineer**: repair, shield efficiency, cloaking

Crew members contribute their skills to the ship's totals.

## Police Record & Reputation

- **Police Record**: -70 (Psychopath) to 75+ (Hero)
- Killing police/traders decreases, killing pirates increases
- Affects police encounter behavior and pricing

- **Reputation**: based on total kills
- 0 (Harmless) to 1500+ (Elite)

## Special Quests (37 events)

Major quest chains: Dragonfly, Space Monster, Scarab, Ambassador Jarek, Jonathan Wild, Morgan's Reactor, Alien Invasion, Dangerous Experiment, Japori Disease, etc.

## Bank

- Loans available (max based on worth)
- Interest accrues daily
- Insurance available (protects against ship loss)
- No-claim bonus reduces insurance cost

## Difficulty Levels

Beginner, Easy, Normal, Hard, Impossible — affects encounter frequency, police aggression, pricing, and more.

## Screens / UI Flow

1. **New Game** — name, skill allocation, difficulty
2. **Commander Status** — stats, skills, record
3. **Galactic Chart** — full galaxy map with system names
4. **Short Range Chart** — nearby systems within fuel range
5. **System Info** — details about selected system
6. **Buy/Sell Cargo** — trade goods
7. **Shipyard** — buy ships, fuel, repairs
8. **Buy/Sell Equipment** — weapons, shields, gadgets
9. **Personnel** — hire/fire crew
10. **Bank** — loans, insurance
11. **Warp** — travel to selected system
12. **Encounter** — combat/interaction screen
13. **Newspaper** — local news about system events
