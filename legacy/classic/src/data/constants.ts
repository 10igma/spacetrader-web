/**
 * Space Trader 1.2.0 — Game constants
 * Ported from spacetrader.h
 */

// ── Extras (hidden items) ────────────────────────────────────────────────────
export const EXTRAWEAPONS = 1;
export const EXTRAGADGETS = 1;
export const EXTRASHIELDS = 1;
export const EXTRASHIPS = 5;

// ── Trade items ──────────────────────────────────────────────────────────────
export const MAXTRADEITEM = 10;
export const MAXDIGITS = 8;
export const MAXPRICEDIGITS = 5;
export const MAXQTYDIGITS = 3;

// ── Activity levels ──────────────────────────────────────────────────────────
export const MAXACTIVITY = 8;
export const MAXSTATUS = 8;

// ── System status ────────────────────────────────────────────────────────────
export const UNEVENTFUL = 0;
export const WAR = 1;
export const PLAGUE = 2;
export const DROUGHT = 3;
export const BOREDOM = 4;
export const COLD = 5;
export const CROPFAILURE = 6;
export const LACKOFWORKERS = 7;

// ── Difficulty ───────────────────────────────────────────────────────────────
export const MAXDIFFICULTY = 5;
export const BEGINNER = 0;
export const EASY = 1;
export const NORMAL = 2;
export const HARD = 3;
export const IMPOSSIBLE = 4;

// ── Crew ─────────────────────────────────────────────────────────────────────
export const MAXCREWMEMBER = 31;
export const MAXSKILL = 10;
export const NAMELEN = 20;

// ── Skills ───────────────────────────────────────────────────────────────────
export const PILOTSKILL = 1;
export const FIGHTERSKILL = 2;
export const TRADERSKILL = 3;
export const ENGINEERSKILL = 4;

// ── Trade item indices ───────────────────────────────────────────────────────
export const WATER = 0;
export const FURS = 1;
export const FOOD = 2;
export const ORE = 3;
export const GAMES = 4;
export const FIREARMS = 5;
export const MEDICINE = 6;
export const MACHINERY = 7;
export const NARCOTICS = 8;
export const ROBOTS = 9;

// ── Ship types ───────────────────────────────────────────────────────────────
export const MAXSHIPTYPE = 10;
export const MAXRANGE = 20;
export const MANTISTYPE = MAXSHIPTYPE + 2;
export const SCARABTYPE = MAXSHIPTYPE + 3;
export const BOTTLETYPE = MAXSHIPTYPE + 4;

// ── Weapons ──────────────────────────────────────────────────────────────────
export const MAXWEAPONTYPE = 3;
export const PULSELASERWEAPON = 0;
export const PULSELASERPOWER = 15;
export const BEAMLASERWEAPON = 1;
export const BEAMLASERPOWER = 25;
export const MILITARYLASERWEAPON = 2;
export const MILITARYLASERPOWER = 35;
export const MORGANLASERWEAPON = 3;
export const MORGANLASERPOWER = 85;

// ── Shields ──────────────────────────────────────────────────────────────────
export const MAXSHIELDTYPE = 2;
export const ENERGYSHIELD = 0;
export const ESHIELDPOWER = 100;
export const REFLECTIVESHIELD = 1;
export const RSHIELDPOWER = 200;
export const LIGHTNINGSHIELD = 2;
export const LSHIELDPOWER = 350;

// ── Hull upgrade ─────────────────────────────────────────────────────────────
export const UPGRADEDHULL = 50;

// ── Gadgets ──────────────────────────────────────────────────────────────────
export const MAXGADGETTYPE = 5;
export const EXTRABAYS = 0;
export const AUTOREPAIRSYSTEM = 1;
export const NAVIGATINGSYSTEM = 2;
export const TARGETINGSYSTEM = 3;
export const CLOAKINGDEVICE = 4;
export const FUELCOMPACTOR = 5;

// ── Skill bonuses ────────────────────────────────────────────────────────────
export const MAXSKILLTYPE = 4;
export const SKILLBONUS = 3;
export const CLOAKBONUS = 2;

// ── Commander ship limits ────────────────────────────────────────────────────
export const MAXWEAPON = 3;
export const MAXSHIELD = 3;
export const MAXGADGET = 3;
export const MAXCREW = 3;
export const MAXTRIBBLES = 100000;

// ── Encounter types ──────────────────────────────────────────────────────────
export const POLICE = 0;
export const POLICEINSPECTION = 0;
export const POLICEIGNORE = 1;
export const POLICEATTACK = 2;
export const POLICEFLEE = 3;
export const MAXPOLICE = 9;

export const PIRATE = 10;
export const PIRATEATTACK = 10;
export const PIRATEFLEE = 11;
export const PIRATEIGNORE = 12;
export const PIRATESURRENDER = 13;
export const MAXPIRATE = 19;

export const TRADER = 20;
export const TRADERIGNORE = 20;
export const TRADERFLEE = 21;
export const TRADERATTACK = 22;
export const TRADERSURRENDER = 23;
export const TRADERSELL = 24;
export const TRADERBUY = 25;
export const TRADERNOTRADE = 26;
export const MAXTRADER = 29;

export const SPACEMONSTERATTACK = 30;
export const SPACEMONSTERIGNORE = 31;
export const MAXSPACEMONSTER = 39;

export const DRAGONFLYATTACK = 40;
export const DRAGONFLYIGNORE = 41;
export const MAXDRAGONFLY = 49;

export const MANTIS = 50;

export const SCARABATTACK = 60;
export const SCARABIGNORE = 61;
export const MAXSCARAB = 69;

export const FAMOUSCAPTAIN = 70;
export const FAMOUSCAPATTACK = 71;
export const CAPTAINAHABENCOUNTER = 72;
export const CAPTAINCONRADENCOUNTER = 73;
export const CAPTAINHUIEENCOUNTER = 74;
export const MAXFAMOUSCAPTAIN = 79;

export const MARIECELESTEENCOUNTER = 80;
export const BOTTLEOLDENCOUNTER = 81;
export const BOTTLEGOODENCOUNTER = 82;
export const POSTMARIEPOLICEENCOUNTER = 83;

// ── Solar systems ────────────────────────────────────────────────────────────
export const MAXSOLARSYSTEM = 120;
export const ACAMARSYSTEM = 0;
export const BARATASSYSTEM = 6;
export const DALEDSYSTEM = 17;
export const DEVIDIASYSTEM = 22;
export const GEMULONSYSTEM = 32;
export const JAPORISYSTEM = 41;
export const KRAVATSYSTEM = 50;
export const MELINASYSTEM = 59;
export const NIXSYSTEM = 67;
export const OGSYSTEM = 70;
export const REGULASSYSTEM = 82;
export const SOLSYSTEM = 92;
export const UTOPIASYSTEM = 109;
export const ZALKONSYSTEM = 118;

// ── Special events ───────────────────────────────────────────────────────────
export const COSTMOON = 500000;
export const MAXSPECIALEVENT = 37;
export const ENDFIXED = 7;
export const MAXTEXT = 9;

export const DRAGONFLYDESTROYED = 0;
export const FLYBARATAS = 1;
export const FLYMELINA = 2;
export const FLYREGULAS = 3;
export const MONSTERKILLED = 4;
export const MEDICINEDELIVERY = 5;
export const MOONBOUGHT = 6;
export const MOONFORSALE = 7;
export const SKILLINCREASE = 8;
export const TRIBBLE = 9;
export const ERASERECORD = 10;
export const BUYTRIBBLE = 11;
export const SPACEMONSTER = 12;
export const DRAGONFLY = 13;
export const CARGOFORSALE = 14;
export const INSTALLLIGHTNINGSHIELD = 15;
export const JAPORIDISEASE = 16;
export const LOTTERYWINNER = 17;
export const ARTIFACTDELIVERY = 18;
export const ALIENARTIFACT = 19;
export const AMBASSADORJAREK = 20;
export const ALIENINVASION = 21;
export const GEMULONINVADED = 22;
export const GETFUELCOMPACTOR = 23;
export const EXPERIMENT = 24;
export const TRANSPORTWILD = 25;
export const GETREACTOR = 26;
export const GETSPECIALLASER = 27;
export const SCARAB = 28;
export const GETHULLUPGRADED = 29;
export const SCARABDESTROYED = 30;
export const REACTORDELIVERED = 31;
export const JAREKGETSOUT = 32;
export const GEMULONRESCUED = 33;
export const EXPERIMENTSTOPPED = 34;
export const EXPERIMENTNOTSTOPPED = 35;
export const WILDGETSOUT = 36;

// ── Tribbles ─────────────────────────────────────────────────────────────────
export const TRIBBLESONSCREEN = 31;

// ── Very rare encounters ─────────────────────────────────────────────────────
export const CHANCEOFVERYRAREENCOUNTER = 5;
export const MAXVERYRAREENCOUNTER = 6;
export const MARIECELESTE = 0;
export const CAPTAINAHAB = 1;
export const CAPTAINCONRAD = 2;
export const CAPTAINHUIE = 3;
export const BOTTLEOLD = 4;
export const BOTTLEGOOD = 5;
export const ALREADYMARIE = 1;
export const ALREADYAHAB = 2;
export const ALREADYCONRAD = 4;
export const ALREADYHUIE = 8;
export const ALREADYBOTTLEOLD = 16;
export const ALREADYBOTTLEGOOD = 32;

export const CHANCEOFTRADEINORBIT = 100;

// ── Politics ─────────────────────────────────────────────────────────────────
export const MAXPOLITICS = 17;
export const MAXSTRENGTH = 8;
export const ANARCHY = 0;

// ── Tech levels ──────────────────────────────────────────────────────────────
export const MAXTECHLEVEL = 8;

// ── Cargo operations ─────────────────────────────────────────────────────────
export const SELLCARGO = 1;
export const DUMPCARGO = 2;
export const JETTISONCARGO = 3;

// ── System sizes ─────────────────────────────────────────────────────────────
export const MAXSIZE = 5;

// ── Resources ────────────────────────────────────────────────────────────────
export const MAXRESOURCES = 13;
export const NOSPECIALRESOURCES = 0;
export const MINERALRICH = 1;
export const MINERALPOOR = 2;
export const DESERT = 3;
export const LOTSOFWATER = 4;
export const RICHSOIL = 5;
export const POORSOIL = 6;
export const RICHFAUNA = 7;
export const LIFELESS = 8;
export const WEIRDMUSHROOMS = 9;
export const LOTSOFHERBS = 10;
export const ARTISTIC = 11;
export const WARLIKE = 12;

// ── Wormholes ────────────────────────────────────────────────────────────────
export const MAXWORMHOLE = 6;

// ── Galaxy dimensions ────────────────────────────────────────────────────────
export const GALAXYWIDTH = 150;
export const GALAXYHEIGHT = 110;
export const SHORTRANGEWIDTH = 140;
export const SHORTRANGEHEIGHT = 140;
export const SHORTRANGEBOUNDSX = 10;
export const BOUNDSX = 5;
export const BOUNDSY = 20;
export const MINDISTANCE = 6;
export const CLOSEDISTANCE = 13;
export const WORMHOLEDISTANCE = 3;
export const EXTRAERASE = 3;

// ── Fabric rip ───────────────────────────────────────────────────────────────
export const FABRICRIPINITIALPROBABILITY = 25;

// ── High scores ──────────────────────────────────────────────────────────────
export const MAXHIGHSCORE = 3;
export const KILLED = 0;
export const RETIRED = 1;
export const MOON = 2;

// ── Police record scores ─────────────────────────────────────────────────────
export const MAXPOLICERECORD = 10;
export const ATTACKPOLICESCORE = -3;
export const KILLPOLICESCORE = -6;
export const CAUGHTWITHWILDSCORE = -4;
export const ATTACKTRADERSCORE = -2;
export const PLUNDERTRADERSCORE = -2;
export const KILLTRADERSCORE = -4;
export const ATTACKPIRATESCORE = 0;
export const KILLPIRATESCORE = 1;
export const PLUNDERPIRATESCORE = -1;
export const TRAFFICKING = -1;
export const FLEEFROMINSPECTION = -2;
export const TAKEMARIENARCOTICS = -4;

// ── Police record thresholds ─────────────────────────────────────────────────
export const PSYCHOPATHSCORE = -70;
export const VILLAINSCORE = -30;
export const CRIMINALSCORE = -10;
export const DUBIOUSSCORE = -5;
export const CLEANSCORE = 0;
export const LAWFULSCORE = 5;
export const TRUSTEDSCORE = 10;
export const HELPERSCORE = 25;
export const HEROSCORE = 75;

// ── Reputation thresholds ────────────────────────────────────────────────────
export const MAXREPUTATION = 9;
export const HARMLESSREP = 0;
export const MOSTLYHARMLESSREP = 10;
export const POORREP = 20;
export const AVERAGESCORE = 40;
export const ABOVEAVERAGESCORE = 80;
export const COMPETENTREP = 150;
export const DANGEROUSREP = 300;
export const DEADLYREP = 600;
export const ELITESCORE = 1500;

// ── Debt ─────────────────────────────────────────────────────────────────────
export const DEBTWARNING = 75000;
export const DEBTTOOLARGE = 100000;

// ── Newspaper ────────────────────────────────────────────────────────────────
export const MAXMASTHEADS = 3;
export const MAXSTORIES = 4;
export const STORYPROBABILITY = Math.floor(50 / MAXTECHLEVEL);
export const MAXSPECIALNEWSEVENTS = 5;

// ── Countdown ────────────────────────────────────────────────────────────────
// STARTCOUNTDOWN = 3 + Difficulty (calculated at runtime)

// ── Difficulty names ─────────────────────────────────────────────────────────
export const DifficultyNames = ['Beginner', 'Easy', 'Normal', 'Hard', 'Impossible'];

// ── System sizes ─────────────────────────────────────────────────────────────
export const SystemSizeNames = ['Tiny', 'Small', 'Medium', 'Large', 'Huge'];

// ── Tech level names ─────────────────────────────────────────────────────────
export const TechLevelNames = [
  'Pre-agricultural',
  'Agricultural',
  'Medieval',
  'Renaissance',
  'Early Industrial',
  'Industrial',
  'Post-industrial',
  'Hi-tech',
];
