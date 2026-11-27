export type ItemCategory =
  | 'DANCE_TILE'
  | 'BAR_UNIT'
  | 'SEATING'
  | 'DJ_BOOTH'
  | 'LIGHTING'
  | 'OUTSIDE';

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  tier: 1 | 2 | 3;
  costCash: number;
  costGems: number;
  unlockLevel: number;
  width: number; // Grid X footprint
  depth: number; // Grid Y footprint
  walkable: boolean;
  hypeBonus: number;
  vibeBonus: number;
  tipMultiplier: number;
  capacityBonus: number;
  prepSpeedBonus: number;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export type FloorLevel = 1 | 2 | 3;

export interface PlacedItem {
  uid: string;
  catalogId: string;
  floor: FloorLevel;
  gridX: number;
  gridY: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface DrinkMix {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  requiredBarTier: 1 | 2 | 3;
  unlockLevel: number;
  prepCost: number;
  sellPrice: number;
  hypeBoost: number;
  prepTimeSec: number;
  color: string;
  glassType: 'MUG' | 'COCKTAIL' | 'NEON_FLUTE' | 'VIP_BOTTLE';
  description: string;
}

export type GuestState =
  | 'ARRIVING_FROM_CAR'
  | 'QUEUEING'
  | 'WALKING_TO_BAR'
  | 'ORDERING_DRINK'
  | 'WALKING_TO_DANCE'
  | 'DANCING'
  | 'DANCER_MOVES'
  | 'WALKING_TO_SEAT'
  | 'RESTING_AT_SEAT'
  | 'CLIMBING_STAIRS'
  | 'DESCENDING_STAIRS'
  | 'LEAVING'
  | 'WALKING_TO_CAR';

export type DancerMoveVariant =
  | 'SHUFFLE_STEP'
  | 'FIST_PUMP'
  | 'SPIN_TWIRL'
  | 'BREAKDANCE_WAVE'
  | 'CYBER_JUMP';

export type BubbleType =
  | 'BEER'
  | 'COCKTAIL'
  | 'MUSIC'
  | 'SPARKLE'
  | 'CHAT'
  | 'CASH'
  | 'EXCLAMATION'
  | 'BOTTLE_SERVICE'
  | 'ANGRY_LIGHT'
  | 'ANGRY_QUEUE'
  | 'ANGRY_SEAT'
  | 'VIP_CROWN';

export type GuestSeatPosture =
  | 'SITTING_CHAIR'
  | 'SITTING_STOOL'
  | 'SITTING_SOFA'
  | 'STANDING_TABLE'
  | 'STANDING_BAR';

export interface GuestAgent {
  id: string;
  name: string;
  isCelebrity: boolean;
  floor: FloorLevel;
  targetFloor: FloorLevel;
  gridX: number; // float for smooth interpolation
  gridY: number;
  path: Array<{ x: number; y: number }>;
  state: GuestState;
  stateTimer: number;
  patience: number; // 0..100
  hype: number; // 0..100
  bubble: BubbleType | null;
  bubbleTimer: number;
  shirtColor: string;
  hairColor: string;
  pantsColor: string;
  cashSpent: number;
  isWhale?: boolean;
  danceMove?: DancerMoveVariant;
  danceMoveTimer?: number;
  dancePhaseOffset?: number;
  groupDanceId?: string;
  groupDanceTimer?: number;
  groupDanceCenter?: { x: number; y: number };
  groupDanceSlotIndex?: number;
  groupDanceSize?: number;
  groupDancePattern?: 'CIRCLE_GROOVE' | 'LINE_SHUFFLE' | 'BOUNCE_WAVE';
  seatPosture?: GuestSeatPosture;
  facingDir?: 'NE' | 'NW' | 'SE' | 'SW';
  assignedSlotId?: string;
  chatText?: string;
  chatTimer?: number;
  bottleServiceTrayId?: string;
  carId?: string;
  targetCarCoord?: { x: number; y: number };
  queueSlotCoord?: { x: number; y: number };
}

export interface VipBottleServiceTray {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  price: number;
  hypeBoost: number;
  vibeBoost: number;
  durationSec: number;
  spendingMultiplier: number;
  trayColor: string;
  sparklerColor: string;
  badgeEmoji: string;
  description: string;
}

export interface ActiveBoothBottleService {
  boothUid: string;
  floor: FloorLevel;
  trayId: string;
  trayName: string;
  trayColor: string;
  sparklerColor: string;
  price: number;
  hypeBoost: number;
  vibeBoost: number;
  spendingMultiplier: number;
  status: 'ORDERED_WAITING' | 'ACTIVE_SPARKLERS';
  timer: number;
  maxTimer: number;
  orderedByGuestName: string;
}

export interface FloatingText {
  id: string;
  text: string;
  floor: FloorLevel;
  gridX: number;
  gridY: number;
  color: string;
  age: number; // 0..1
}

export interface LiveAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  actionTab?: 'BUILD' | 'DRINKS' | 'PARKING' | 'DJ';
}

export type QuestTrackType =
  | 'BOTTLE_SERVICE'
  | 'MOOD_BOOST'
  | 'DJ_HYPE_DROP'
  | 'MIXOLOGY_CRAFT'
  | 'DANCE_FLOOR'
  | 'STAFF_TEAM'
  | 'PARTY_FEVER'
  | 'CLUB_REVENUE'
  | 'WHALE_HUNT'
  | 'CELEB_PAPARAZZI'
  | 'GOSSIP_VIRAL'
  | 'LASER_OVERDRIVE';

export type QuestCategoryTag = 'VIP RUSH' | 'CROWD HYPE' | 'DJ STUDIO' | 'TYCOON EMPIRE';

export interface QuestTask {
  id: string;
  track: QuestTrackType;
  tier: number;
  badgeEmoji: string;
  categoryTag: QuestCategoryTag;
  actionLabel: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  rewardCash: number;
  rewardGems: number;
  rewardXp: number;
  claimed: boolean;
}

export interface ParkingUpgradeState {
  lotTier: 1 | 2 | 3; // 1: 2-Car Gravel Patch, 2: Neon Street Lot, 3: VIP Valet Plaza
  bouncerCount: number; // 1..4
  ropeTier: 1 | 2 | 3; // 1: Worn Rope, 2: Velvet stanchions, 3: Gold Laser Gate
}

export const CATALOG_ITEMS: CatalogItem[] = [
  // DANCE TILES
  {
    id: 'dance_basic',
    name: 'Retro LED Dance Tile',
    category: 'DANCE_TILE',
    tier: 1,
    costCash: 100,
    costGems: 0,
    unlockLevel: 1,
    width: 1,
    depth: 1,
    walkable: true,
    hypeBonus: 4,
    vibeBonus: 2,
    tipMultiplier: 0.02,
    capacityBonus: 2,
    prepSpeedBonus: 0,
    description: 'Pastel cycling acrylic floor tile. Essential for expanding your starter disco floor.',
    primaryColor: '#38bdf8',
    accentColor: '#f472b6',
  },
  {
    id: 'dance_gold_disco',
    name: '70s Gold Fever Disco Tile',
    category: 'DANCE_TILE',
    tier: 1,
    costCash: 180,
    costGems: 0,
    unlockLevel: 2,
    width: 1,
    depth: 1,
    walkable: true,
    hypeBonus: 8,
    vibeBonus: 5,
    tipMultiplier: 0.04,
    capacityBonus: 2,
    prepSpeedBonus: 0,
    description: 'Warm amber & magenta Saturday-night glass tile that boosts dancer groove tips.',
    primaryColor: '#f59e0b',
    accentColor: '#ec4899',
  },
  {
    id: 'dance_cyber',
    name: 'Cyber Pulse Matrix Tile',
    category: 'DANCE_TILE',
    tier: 2,
    costCash: 280,
    costGems: 0,
    unlockLevel: 3,
    width: 1,
    depth: 1,
    walkable: true,
    hypeBonus: 11,
    vibeBonus: 6,
    tipMultiplier: 0.05,
    capacityBonus: 3,
    prepSpeedBonus: 0,
    description: 'Pressure-sensitive magenta/cyan grid tile that strobes to the DJ tempo.',
    primaryColor: '#e879f9',
    accentColor: '#22d3ee',
  },
  {
    id: 'dance_supernova',
    name: 'VIP Supernova Stage Grid',
    category: 'DANCE_TILE',
    tier: 3,
    costCash: 750,
    costGems: 0,
    unlockLevel: 6,
    width: 2,
    depth: 2,
    walkable: true,
    hypeBonus: 48,
    vibeBonus: 28,
    tipMultiplier: 0.18,
    capacityBonus: 10,
    prepSpeedBonus: 0,
    description: '2x2 synchronized holographic infinity floor that triggers massive Hype Drops.',
    primaryColor: '#fbbf24',
    accentColor: '#ec4899',
  },

  // BAR UNITS
  {
    id: 'bar_dive',
    name: 'Gritty Dive Wood Counter',
    category: 'BAR_UNIT',
    tier: 1,
    costCash: 350,
    costGems: 0,
    unlockLevel: 1,
    width: 3,
    depth: 1,
    walkable: false,
    hypeBonus: 8,
    vibeBonus: 5,
    tipMultiplier: 0.05,
    capacityBonus: 4,
    prepSpeedBonus: 1,
    description: 'Scuffed oak counter with basic beer taps and a single bartender station.',
    primaryColor: '#78350f',
    accentColor: '#d97706',
  },
  {
    id: 'bar_neon',
    name: 'Neon Quartz Mixology Bar',
    category: 'BAR_UNIT',
    tier: 2,
    costCash: 1100,
    costGems: 0,
    unlockLevel: 4,
    width: 3,
    depth: 1,
    walkable: false,
    hypeBonus: 24,
    vibeBonus: 20,
    tipMultiplier: 0.15,
    capacityBonus: 8,
    prepSpeedBonus: 1.6,
    description: 'Under-lit cyan acrylic counter with dual high-speed cocktail shakers.',
    primaryColor: '#0e7490',
    accentColor: '#22d3ee',
  },
  {
    id: 'bar_wraparound',
    name: 'VIP Gold Wraparound Island Bar',
    category: 'BAR_UNIT',
    tier: 3,
    costCash: 2800,
    costGems: 5,
    unlockLevel: 7,
    width: 3,
    depth: 2,
    walkable: false,
    hypeBonus: 65,
    vibeBonus: 55,
    tipMultiplier: 0.35,
    capacityBonus: 16,
    prepSpeedBonus: 2.5,
    description: 'Massive 3x2 illuminated spirits tower supporting top-shelf Neon Cosmos & flair bartenders.',
    primaryColor: '#831843',
    accentColor: '#fbbf24',
  },

  // SEATING & COMFORT
  {
    id: 'seat_worn_couch',
    name: 'Patched Backroom Couch',
    category: 'SEATING',
    tier: 1,
    costCash: 160,
    costGems: 0,
    unlockLevel: 1,
    width: 2,
    depth: 1,
    walkable: false,
    hypeBonus: 3,
    vibeBonus: 6,
    tipMultiplier: 0.04,
    capacityBonus: 3,
    prepSpeedBonus: 0,
    description: 'Torn leather sofa with duct-tape patches. Better than standing all night.',
    primaryColor: '#57534e',
    accentColor: '#a8a29e',
  },
  {
    id: 'seat_bistro',
    name: 'Round Wood Table & Stools',
    category: 'SEATING',
    tier: 1,
    costCash: 220,
    costGems: 0,
    unlockLevel: 1,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 4,
    vibeBonus: 8,
    tipMultiplier: 0.05,
    capacityBonus: 2,
    prepSpeedBonus: 0,
    description: 'Compact wooden pub table where guests rest their drinks and tip.',
    primaryColor: '#92400e',
    accentColor: '#fbbf24',
  },
  {
    id: 'seat_neon_diner',
    name: 'Retro Vinyl Disco Booth',
    category: 'SEATING',
    tier: 1,
    costCash: 340,
    costGems: 0,
    unlockLevel: 2,
    width: 2,
    depth: 1,
    walkable: false,
    hypeBonus: 10,
    vibeBonus: 16,
    tipMultiplier: 0.09,
    capacityBonus: 4,
    prepSpeedBonus: 0,
    description: 'Classic turquoise & neon-pink vinyl booth where dancers chill and order bottle trays.',
    primaryColor: '#0d9488',
    accentColor: '#f472b6',
  },
  {
    id: 'seat_velvet_booth',
    name: 'Magenta Velvet Lounge Booth',
    category: 'SEATING',
    tier: 2,
    costCash: 680,
    costGems: 0,
    unlockLevel: 3,
    width: 2,
    depth: 2,
    walkable: false,
    hypeBonus: 18,
    vibeBonus: 28,
    tipMultiplier: 0.16,
    capacityBonus: 6,
    prepSpeedBonus: 0,
    description: 'Plush tufted L-shaped booth with glass table that significantly boosts guest patience.',
    primaryColor: '#701a75',
    accentColor: '#f472b6',
  },
  {
    id: 'seat_vip_pod',
    name: 'Starlight Bottle-Service Sanctuary',
    category: 'SEATING',
    tier: 3,
    costCash: 1850,
    costGems: 4,
    unlockLevel: 6,
    width: 2,
    depth: 2,
    walkable: false,
    hypeBonus: 45,
    vibeBonus: 60,
    tipMultiplier: 0.4,
    capacityBonus: 8,
    prepSpeedBonus: 0,
    description: 'LED infinity table with gold velvet seating. Attracts high-tipping celebrities.',
    primaryColor: '#311042',
    accentColor: '#facc15',
  },

  // DJ & STAGE EQUIPMENT
  {
    id: 'dj_turntable',
    name: 'Basement Dual Turntable Rig',
    category: 'DJ_BOOTH',
    tier: 1,
    costCash: 450,
    costGems: 0,
    unlockLevel: 1,
    width: 2,
    depth: 1,
    walkable: false,
    hypeBonus: 15,
    vibeBonus: 12,
    tipMultiplier: 0.06,
    capacityBonus: 4,
    prepSpeedBonus: 0,
    description: 'Classic direct-drive vinyl decks on a purple neon crate riser.',
    primaryColor: '#4c1d95',
    accentColor: '#c084fc',
  },
  {
    id: 'dj_speaker_stack',
    name: 'Subwoofer Bass Tower',
    category: 'DJ_BOOTH',
    tier: 2,
    costCash: 520,
    costGems: 0,
    unlockLevel: 2,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 22,
    vibeBonus: 16,
    tipMultiplier: 0.08,
    capacityBonus: 3,
    prepSpeedBonus: 0,
    description: 'Chest-thumping 18-inch acoustic cabinet that keeps dancers hyped longer.',
    primaryColor: '#1e1b4b',
    accentColor: '#38bdf8',
  },
  {
    id: 'dj_holo_stage',
    name: 'Cyberpunk Hologram DJ Console',
    category: 'DJ_BOOTH',
    tier: 3,
    costCash: 2400,
    costGems: 5,
    unlockLevel: 6,
    width: 2,
    depth: 1,
    walkable: false,
    hypeBonus: 75,
    vibeBonus: 60,
    tipMultiplier: 0.3,
    capacityBonus: 12,
    prepSpeedBonus: 0,
    description: 'Laser-projected equalizer stage with twin CO2 cryo-jets and celebrity guest DJs.',
    primaryColor: '#1e1b4b',
    accentColor: '#f43f5e',
  },

  // LIGHTING & FX
  {
    id: 'light_string',
    name: 'Warm Edison String Pillar',
    category: 'LIGHTING',
    tier: 1,
    costCash: 140,
    costGems: 0,
    unlockLevel: 1,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 5,
    vibeBonus: 12,
    tipMultiplier: 0.03,
    capacityBonus: 1,
    prepSpeedBonus: 0,
    description: 'Cozy vintage bulb column that fixes dark corner complaints.',
    primaryColor: '#78350f',
    accentColor: '#fde047',
  },
  {
    id: 'light_neon_palm',
    name: 'Neon Miami Palm Pillar',
    category: 'LIGHTING',
    tier: 1,
    costCash: 240,
    costGems: 0,
    unlockLevel: 1,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 10,
    vibeBonus: 18,
    tipMultiplier: 0.06,
    capacityBonus: 2,
    prepSpeedBonus: 0,
    description: 'Glowing pink & cyan neon palm column that transforms a starter room into a real disco.',
    primaryColor: '#701a75',
    accentColor: '#22d3ee',
  },
  {
    id: 'light_laser_rig',
    name: 'Prism Sweeping Laser Truss',
    category: 'LIGHTING',
    tier: 2,
    costCash: 620,
    costGems: 0,
    unlockLevel: 2,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 20,
    vibeBonus: 35,
    tipMultiplier: 0.12,
    capacityBonus: 3,
    prepSpeedBonus: 0,
    description: 'Motorized cyan/magenta beam projector that sweeps live light cones across the floor.',
    primaryColor: '#0f172a',
    accentColor: '#06b6d4',
  },
  {
    id: 'light_disco_orb',
    name: 'Supernova Mirror Disco Rig',
    category: 'LIGHTING',
    tier: 3,
    costCash: 1550,
    costGems: 3,
    unlockLevel: 5,
    width: 1,
    depth: 1,
    walkable: false,
    hypeBonus: 48,
    vibeBonus: 70,
    tipMultiplier: 0.25,
    capacityBonus: 6,
    prepSpeedBonus: 0,
    description: 'Suspended crystalline prism rig with volumetric fog bursts and gold reflections.',
    primaryColor: '#3b0764',
    accentColor: '#facc15',
  },
];

export const DRINK_MIXES: DrinkMix[] = [
  {
    id: 'drink_draft_beer',
    name: 'Basement Draft Pint',
    tier: 1,
    requiredBarTier: 1,
    unlockLevel: 1,
    prepCost: 15,
    sellPrice: 45,
    hypeBoost: 8,
    prepTimeSec: 2.0,
    color: '#fbbf24',
    glassType: 'MUG',
    description: 'Cold frothy lager served in heavy glass mugs. Fast to pour, reliable dive staple.',
  },
  {
    id: 'drink_electric_mule',
    name: 'Electric Blue Mule',
    tier: 2,
    requiredBarTier: 1,
    unlockLevel: 2,
    prepCost: 40,
    sellPrice: 115,
    hypeBoost: 18,
    prepTimeSec: 2.5,
    color: '#22d3ee',
    glassType: 'COCKTAIL',
    description: 'Spiced ginger beer infused with glowing blue curacao and lime.',
  },
  {
    id: 'drink_neon_cosmo',
    name: 'Neon Magenta Cosmo',
    tier: 3,
    requiredBarTier: 2,
    unlockLevel: 4,
    prepCost: 95,
    sellPrice: 280,
    hypeBoost: 36,
    prepTimeSec: 3.0,
    color: '#f43f5e',
    glassType: 'NEON_FLUTE',
    description: 'Signature ultraviolet cranberry martini garnished with dry-ice vapor.',
  },
  {
    id: 'drink_supernova_gold',
    name: '24K Supernova Bottle Service',
    tier: 4,
    requiredBarTier: 3,
    unlockLevel: 6,
    prepCost: 240,
    sellPrice: 720,
    hypeBoost: 75,
    prepTimeSec: 3.5,
    color: '#facc15',
    glassType: 'VIP_BOTTLE',
    description: 'Sparkler-lit crystal magnum delivered to VIP booths for massive celebrity tips.',
  },
];

export const VIP_BOTTLE_SERVICE_TRAYS: VipBottleServiceTray[] = [
  {
    id: 'tray_crystal_rose',
    name: 'Crystal Rosé Sparkler Tray',
    tier: 1,
    price: 480,
    hypeBoost: 38,
    vibeBoost: 24,
    durationSec: 20,
    spendingMultiplier: 2.2,
    trayColor: '#f43f5e',
    sparklerColor: '#fb7185',
    badgeEmoji: '🍾',
    description: 'Chilled rosé champagne tray with twin LED sparklers & 4 neon flutes for VIP booths.',
  },
  {
    id: 'tray_neon_magnum',
    name: 'Neon Blue Magnum & Shots Tray',
    tier: 2,
    price: 850,
    hypeBoost: 68,
    vibeBoost: 45,
    durationSec: 24,
    spendingMultiplier: 2.8,
    trayColor: '#22d3ee',
    sparklerColor: '#38bdf8',
    badgeEmoji: '🥂',
    description: 'Illuminated crystal magnum in a silver ice bucket with glowing electric shot tray.',
  },
  {
    id: 'tray_24k_supernova',
    name: '24K Gold Supernova Parade Tray',
    tier: 3,
    price: 1480,
    hypeBoost: 120,
    vibeBoost: 80,
    durationSec: 30,
    spendingMultiplier: 3.6,
    trayColor: '#facc15',
    sparklerColor: '#fde047',
    badgeEmoji: '👑',
    description: 'Royal 24K gold double-magnum parade tray with fireworks sparklers & celebrity spending surge.',
  },
];

export function isVipBoothCatalogId(catalogId: string): boolean {
  return (
    catalogId === 'seat_velvet_booth' ||
    catalogId === 'seat_vip_pod' ||
    catalogId === 'seat_worn_couch' ||
    catalogId === 'seat_neon_diner'
  );
}

// Level 1 Starter Disco Layout (Humble starter room with a compact 2x2 dance floor, 1 basic dive bar, 1 turntable rig, 1 string light, and 1 wood table — ready to earn money and build up!)
export const LEVEL_1_DIVE_BAR_ITEMS: PlacedItem[] = [
  { uid: 'dive_bar_1', catalogId: 'bar_dive', floor: 1, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'dive_dj_1', catalogId: 'dj_turntable', floor: 1, gridX: 5, gridY: 0, rotation: 0 },
  { uid: 'dive_light_1', catalogId: 'light_string', floor: 1, gridX: 0, gridY: 1, rotation: 0 },
  { uid: 'dive_chair_1', catalogId: 'seat_bistro', floor: 1, gridX: 1, gridY: 6, rotation: 0 },
  // Compact 2x2 starter LED dance floor in the center (expandable to 3x3, 4x4, and beyond as you earn cash!)
  { uid: 'dive_df_1', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'dive_df_2', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 3, rotation: 0 },
  { uid: 'dive_df_3', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 4, rotation: 0 },
  { uid: 'dive_df_4', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 4, rotation: 0 },
];

// Initial Nightclub City: Neon Layout matching uploaded reference image (IMG_1510_4d373b62.png)
export const INITIAL_PLACED_ITEMS: PlacedItem[] = [
  // Back-left wall: Tufted purple VIP booths under "CLUB NEON" & "GOOD TIMES" neon signs
  { uid: 'init_couch_left1', catalogId: 'seat_worn_couch', floor: 1, gridX: 0, gridY: 1, rotation: 90 },
  { uid: 'init_couch_left2', catalogId: 'seat_worn_couch', floor: 1, gridX: 0, gridY: 4, rotation: 90 },
  // Back-right wall: DJ Booth Console flanked by two Stacked Studio Monitor Speaker Towers under "LOVE THE BASS"
  { uid: 'init_sub_left', catalogId: 'dj_speaker_stack', floor: 1, gridX: 3, gridY: 0, rotation: 0 },
  { uid: 'init_dj_1', catalogId: 'dj_turntable', floor: 1, gridX: 5, gridY: 0, rotation: 0 },
  { uid: 'init_sub_right', catalogId: 'dj_speaker_stack', floor: 1, gridX: 7, gridY: 0, rotation: 0 },
  // Long illuminated Bar Counters & Liquor Shelves packed with bottles & cocktail shakers
  { uid: 'init_bar_1', catalogId: 'bar_neon', floor: 1, gridX: 7, gridY: 2, rotation: 90 },
  { uid: 'init_bar_2', catalogId: 'bar_dive', floor: 1, gridX: 7, gridY: 5, rotation: 90 },
  { uid: 'init_bar_3', catalogId: 'bar_dive', floor: 1, gridX: 1, gridY: 0, rotation: 0 },
  // Large 4x4 sunken dance floor in center (each tile renders 2x2 glowing beveled squares = 64 tiles)
  { uid: 'init_df_1', catalogId: 'dance_basic', floor: 1, gridX: 2, gridY: 2, rotation: 0 },
  { uid: 'init_df_2', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 2, rotation: 0 },
  { uid: 'init_df_3', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 2, rotation: 0 },
  { uid: 'init_df_4', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 2, rotation: 0 },
  { uid: 'init_df_5', catalogId: 'dance_basic', floor: 1, gridX: 2, gridY: 3, rotation: 0 },
  { uid: 'init_df_6', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'init_df_7', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 3, rotation: 0 },
  { uid: 'init_df_8', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'init_df_9', catalogId: 'dance_basic', floor: 1, gridX: 2, gridY: 4, rotation: 0 },
  { uid: 'init_df_10', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 4, rotation: 0 },
  { uid: 'init_df_11', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 4, rotation: 0 },
  { uid: 'init_df_12', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 4, rotation: 0 },
  { uid: 'init_df_13', catalogId: 'dance_basic', floor: 1, gridX: 2, gridY: 5, rotation: 0 },
  { uid: 'init_df_14', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 5, rotation: 0 },
  { uid: 'init_df_15', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 5, rotation: 0 },
  { uid: 'init_df_16', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 5, rotation: 0 },
  // Round high-top cocktail tables with metallic pedestals & cushioned club chairs
  { uid: 'init_table_1', catalogId: 'seat_bistro', floor: 1, gridX: 1, gridY: 7, rotation: 0 },
  { uid: 'init_table_2', catalogId: 'seat_bistro', floor: 1, gridX: 4, gridY: 7, rotation: 0 },
  // Tufted VIP lounge booth in corner (clear of the bar stool aisle at x = 8.36)
  { uid: 'init_booth_bottom', catalogId: 'seat_velvet_booth', floor: 1, gridX: 6, gridY: 8, rotation: 0 },

  // Floor 2: VIP Mezannine Sky Lounge
  { uid: 'init_f2_bar', catalogId: 'bar_neon', floor: 2, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'init_f2_dj', catalogId: 'dj_holo_stage', floor: 2, gridX: 6, gridY: 0, rotation: 0 },
  { uid: 'init_f2_df1', catalogId: 'dance_cyber', floor: 2, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'init_f2_df2', catalogId: 'dance_cyber', floor: 2, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'init_f2_pod1', catalogId: 'seat_velvet_booth', floor: 2, gridX: 0, gridY: 4, rotation: 0 },
  { uid: 'init_f2_pod2', catalogId: 'seat_vip_pod', floor: 2, gridX: 8, gridY: 4, rotation: 0 },

  // Floor 3: Penthouse Starlight Rooftop
  { uid: 'init_f3_bar', catalogId: 'bar_wraparound', floor: 3, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'init_f3_dj', catalogId: 'dj_holo_stage', floor: 3, gridX: 6, gridY: 0, rotation: 0 },
  { uid: 'init_f3_df1', catalogId: 'dance_supernova', floor: 3, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'init_f3_df2', catalogId: 'dance_supernova', floor: 3, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'init_f3_pod1', catalogId: 'seat_vip_pod', floor: 3, gridX: 0, gridY: 4, rotation: 0 },
  { uid: 'init_f3_pod2', catalogId: 'seat_vip_pod', floor: 3, gridX: 8, gridY: 4, rotation: 0 },
];

// Preset VIP Hotspot Showcase layout for Floor 1, Floor 2 & Floor 3
export const VIP_HOTSPOT_ITEMS: PlacedItem[] = [
  // Floor 1: MassiveWraparound Bar, Hologram DJ, 4x4 Cyber/Supernova Floor, Laser trusses, Velvet booths
  { uid: 'vip_bar_1', catalogId: 'bar_wraparound', floor: 1, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'vip_dj_1', catalogId: 'dj_holo_stage', floor: 1, gridX: 6, gridY: 0, rotation: 0 },
  { uid: 'vip_sub_1', catalogId: 'dj_speaker_stack', floor: 1, gridX: 5, gridY: 0, rotation: 0 },
  { uid: 'vip_sub_2', catalogId: 'dj_speaker_stack', floor: 1, gridX: 8, gridY: 0, rotation: 0 },
  { uid: 'vip_df_1', catalogId: 'dance_supernova', floor: 1, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'vip_df_2', catalogId: 'dance_supernova', floor: 1, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'vip_df_3', catalogId: 'dance_supernova', floor: 1, gridX: 3, gridY: 5, rotation: 0 },
  { uid: 'vip_df_4', catalogId: 'dance_supernova', floor: 1, gridX: 5, gridY: 5, rotation: 0 },
  { uid: 'vip_booth_1', catalogId: 'seat_vip_pod', floor: 1, gridX: 0, gridY: 3, rotation: 0 },
  { uid: 'vip_booth_2', catalogId: 'seat_velvet_booth', floor: 1, gridX: 8, gridY: 3, rotation: 0 },
  { uid: 'vip_booth_3', catalogId: 'seat_vip_pod', floor: 1, gridX: 8, gridY: 6, rotation: 0 },
  { uid: 'vip_laser_1', catalogId: 'light_laser_rig', floor: 1, gridX: 0, gridY: 1, rotation: 0 },
  { uid: 'vip_laser_2', catalogId: 'light_laser_rig', floor: 1, gridX: 9, gridY: 1, rotation: 0 },
  { uid: 'vip_orb_1', catalogId: 'light_disco_orb', floor: 1, gridX: 4, gridY: 1, rotation: 0 },

  // Floor 2: Rooftop Sky Lounge
  { uid: 'vip_f2_bar', catalogId: 'bar_neon', floor: 2, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'vip_f2_dj', catalogId: 'dj_holo_stage', floor: 2, gridX: 6, gridY: 0, rotation: 0 },
  { uid: 'vip_f2_df1', catalogId: 'dance_supernova', floor: 2, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'vip_f2_df2', catalogId: 'dance_supernova', floor: 2, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'vip_f2_pod1', catalogId: 'seat_vip_pod', floor: 2, gridX: 0, gridY: 4, rotation: 0 },
  { uid: 'vip_f2_pod2', catalogId: 'seat_vip_pod', floor: 2, gridX: 8, gridY: 4, rotation: 0 },
  { uid: 'vip_f2_orb', catalogId: 'light_disco_orb', floor: 2, gridX: 0, gridY: 1, rotation: 0 },
  { uid: 'vip_f2_laser', catalogId: 'light_laser_rig', floor: 2, gridX: 9, gridY: 1, rotation: 0 },

  // Floor 3: Penthouse Starlight Sanctuary
  { uid: 'vip_f3_bar', catalogId: 'bar_wraparound', floor: 3, gridX: 1, gridY: 0, rotation: 0 },
  { uid: 'vip_f3_dj', catalogId: 'dj_holo_stage', floor: 3, gridX: 6, gridY: 0, rotation: 0 },
  { uid: 'vip_f3_df1', catalogId: 'dance_supernova', floor: 3, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'vip_f3_df2', catalogId: 'dance_supernova', floor: 3, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'vip_f3_pod1', catalogId: 'seat_vip_pod', floor: 3, gridX: 0, gridY: 4, rotation: 0 },
  { uid: 'vip_f3_pod2', catalogId: 'seat_vip_pod', floor: 3, gridX: 8, gridY: 4, rotation: 0 },
];

export const INITIAL_QUESTS: QuestTask[] = [
  {
    id: 'quest_bottle_service_t1',
    track: 'BOTTLE_SERVICE',
    tier: 1,
    badgeEmoji: '🍾',
    categoryTag: 'VIP RUSH',
    actionLabel: '🍸 Play Mixology',
    title: 'Sparkler Bottle Service I',
    description: 'Pour the 3-layer VIP recipe & lock the Neon Shaker Sweet-Spot gauge, or serve a VIP booth on the floor.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 750,
    rewardGems: 3,
    rewardXp: 120,
    claimed: false,
  },
  {
    id: 'quest_dj_hype_t1',
    track: 'DJ_HYPE_DROP',
    tier: 1,
    badgeEmoji: '🔊',
    categoryTag: 'DJ STUDIO',
    actionLabel: '🎧 Beat-Match Drop',
    title: 'Turntable Beat-Match I',
    description: 'Sync Deck B’s tempo to the master BPM and land 3 on-beat Sub-Bass Drops on the golden downbeat pads.',
    targetValue: 2,
    currentValue: 1,
    rewardCash: 600,
    rewardGems: 2,
    rewardXp: 100,
    claimed: false,
  },
  {
    id: 'quest_mood_boost_t1',
    track: 'MOOD_BOOST',
    tier: 1,
    badgeEmoji: '🔥',
    categoryTag: 'CROWD HYPE',
    actionLabel: '🪩 Sync Dance Grid',
    title: 'Neon Groove Memory I',
    description: 'Memorize and repeat the flashing 3x3 neon dance tile sequence to trigger a synchronized group dance.',
    targetValue: 2,
    currentValue: 1,
    rewardCash: 550,
    rewardGems: 2,
    rewardXp: 95,
    claimed: false,
  },
  {
    id: 'quest_mixology_t1',
    track: 'MIXOLOGY_CRAFT',
    tier: 1,
    badgeEmoji: '🍸',
    categoryTag: 'VIP RUSH',
    actionLabel: '🍸 Shake Cocktails',
    title: 'Flair Shaker Challenge I',
    description: 'Match the 3 neon liquor bottles in order and release the pressure shaker inside the green sweet-spot zone.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 650,
    rewardGems: 2,
    rewardXp: 110,
    claimed: false,
  },
  {
    id: 'quest_dancefloor_t1',
    track: 'DANCE_FLOOR',
    tier: 1,
    badgeEmoji: '🪩',
    categoryTag: 'TYCOON EMPIRE',
    actionLabel: '🪩 Play Tile Sync',
    title: 'Neon Grid Synchronizer I',
    description: 'Complete the Neon Dance Grid pattern challenge or place new glowing dance floor tiles in your club.',
    targetValue: 2,
    currentValue: 1,
    rewardCash: 700,
    rewardGems: 3,
    rewardXp: 130,
    claimed: false,
  },
  {
    id: 'quest_party_fever_t1',
    track: 'PARTY_FEVER',
    tier: 1,
    badgeEmoji: '🎉',
    categoryTag: 'CROWD HYPE',
    actionLabel: '🎧 DJ Drop Challenge',
    title: 'Mega Laser Drop I',
    description: 'Master the live DJ BPM pitch-match & downbeat drop challenge to unleash a full-floor laser party.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 900,
    rewardGems: 3,
    rewardXp: 150,
    claimed: false,
  },
  {
    id: 'quest_staff_team_t1',
    track: 'STAFF_TEAM',
    tier: 1,
    badgeEmoji: '🛡️',
    categoryTag: 'TYCOON EMPIRE',
    actionLabel: '🛡️ Bouncer Scanner',
    title: 'Velvet Rope ID Scanner I',
    description: 'Inspect guest ID birth years, hologram VIP seals, and dress codes at the red carpet door.',
    targetValue: 4,
    currentValue: 2,
    rewardCash: 680,
    rewardGems: 2,
    rewardXp: 115,
    claimed: false,
  },
  {
    id: 'quest_club_revenue_t1',
    track: 'CLUB_REVENUE',
    tier: 1,
    badgeEmoji: '💸',
    categoryTag: 'TYCOON EMPIRE',
    actionLabel: '🛡️ VIP Door Shift',
    title: 'High-Roller Cashflow I',
    description: 'Run the Velvet Rope VIP Scanner to collect high-roller cover tips and earn $1,200 in club revenue.',
    targetValue: 1200,
    currentValue: 650,
    rewardCash: 1000,
    rewardGems: 4,
    rewardXp: 180,
    claimed: false,
  },
  {
    id: 'quest_whale_hunt_t1',
    track: 'WHALE_HUNT',
    tier: 1,
    badgeEmoji: '🐋',
    categoryTag: 'VIP RUSH',
    actionLabel: '🥂 Champagne Pyramid',
    title: 'Golden Whale Champagne Tower I',
    description: 'Pour the 4-tier Dom Pérignon Pyramid without overflowing or serve high-spending ★ VIP Whales on the floor.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 1150,
    rewardGems: 4,
    rewardXp: 175,
    claimed: false,
  },
  {
    id: 'quest_celeb_paparazzi_t1',
    track: 'CELEB_PAPARAZZI',
    tier: 1,
    badgeEmoji: '📸',
    categoryTag: 'CROWD HYPE',
    actionLabel: '📸 Paparazzi Shield',
    title: 'Paparazzi Blitz & VIP Shield I',
    description: 'Block sneaky paparazzi camera flashes while fulfilling live Celebrity & Whale requests to build a 4x combo.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 1100,
    rewardGems: 4,
    rewardXp: 165,
    claimed: false,
  },
  {
    id: 'quest_gossip_viral_t1',
    track: 'GOSSIP_VIRAL',
    tier: 1,
    badgeEmoji: '📱',
    categoryTag: 'CROWD HYPE',
    actionLabel: '📸 Viral VIP Blitz',
    title: 'Viral Nightlife Tea Feed I',
    description: 'React to or post sizzling Club Gossip stories on the Live Tea Feed, or win the Paparazzi Blitz challenge.',
    targetValue: 3,
    currentValue: 1,
    rewardCash: 820,
    rewardGems: 3,
    rewardXp: 135,
    claimed: false,
  },
  {
    id: 'quest_laser_overdrive_t1',
    track: 'LASER_OVERDRIVE',
    tier: 1,
    badgeEmoji: '⚡',
    categoryTag: 'DJ STUDIO',
    actionLabel: '🎧 Overdrive Drop',
    title: 'Synthwave Laser Overdrive I',
    description: 'Trigger DJ Hype Actions, switch custom beats, or nail a 3-drop combo on the Live Turntable Deck.',
    targetValue: 3,
    currentValue: 1,
    rewardCash: 880,
    rewardGems: 3,
    rewardXp: 145,
    claimed: false,
  },
  {
    id: 'quest_bottle_service_t2_special',
    track: 'WHALE_HUNT',
    tier: 2,
    badgeEmoji: '👑',
    categoryTag: 'VIP RUSH',
    actionLabel: '🥂 4x Pyramid Risk',
    title: 'Double-or-Nothing Magnum Pour',
    description: 'Reach Tier 3+ on the VIP Whale Champagne Pyramid challenge or host 2 ★ VIP Whales simultaneously.',
    targetValue: 2,
    currentValue: 0,
    rewardCash: 1650,
    rewardGems: 5,
    rewardXp: 240,
    claimed: false,
  },
  {
    id: 'quest_dj_hype_encore',
    track: 'LASER_OVERDRIVE',
    tier: 2,
    badgeEmoji: '🎛️',
    categoryTag: 'DJ STUDIO',
    actionLabel: '🎧 Bass Drop Encore',
    title: 'Midnight Bassline Frenzy',
    description: 'Lock Deck B within ±1 BPM of Master Tempo and trigger 4 consecutive Sub-Bass Drops without missing.',
    targetValue: 3,
    currentValue: 1,
    rewardCash: 1350,
    rewardGems: 4,
    rewardXp: 200,
    claimed: false,
  },
  {
    id: 'quest_parking_valet_tycoon',
    track: 'CLUB_REVENUE',
    tier: 2,
    badgeEmoji: '🏎️',
    categoryTag: 'TYCOON EMPIRE',
    actionLabel: '🛡️ Valet & VIP Door',
    title: 'Supercar Valet & Red Carpet Boom',
    description: 'Welcome arriving guests from the Neon Parking Plaza and generate $2,500 in high-roller club cashflow.',
    targetValue: 2500,
    currentValue: 950,
    rewardCash: 1800,
    rewardGems: 5,
    rewardXp: 260,
    claimed: false,
  },
  {
    id: 'quest_celeb_entourage_fever',
    track: 'CELEB_PAPARAZZI',
    tier: 2,
    badgeEmoji: '🌟',
    categoryTag: 'CROWD HYPE',
    actionLabel: '📸 Entourage Blitz',
    title: 'A-List Entourage Takeover',
    description: 'Invite a Celebrity Entourage or score 600+ pts in the Paparazzi Blitz & VIP Whisperer challenge.',
    targetValue: 2,
    currentValue: 0,
    rewardCash: 1550,
    rewardGems: 5,
    rewardXp: 225,
    claimed: false,
  },
];

const ROMAN_TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function createNextTierQuest(completed: QuestTask): QuestTask {
  const nextTier = completed.tier + 1;
  const roman = ROMAN_TIERS[nextTier - 1] || `T${nextTier}`;
  const baseTitle = completed.title.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|T\d+)$/, '');

  let nextTarget = completed.targetValue;
  if (completed.track === 'CLUB_REVENUE') {
    nextTarget = Math.round((completed.targetValue * 1.65) / 100) * 100;
  } else if (completed.track === 'STAFF_TEAM' || completed.track === 'GOSSIP_VIRAL') {
    nextTarget = completed.targetValue + 3;
  } else if (
    completed.track === 'BOTTLE_SERVICE' ||
    completed.track === 'PARTY_FEVER' ||
    completed.track === 'WHALE_HUNT' ||
    completed.track === 'CELEB_PAPARAZZI'
  ) {
    nextTarget = completed.targetValue + 1;
  } else {
    nextTarget = completed.targetValue + 2;
  }

  const nextCash = Math.round((completed.rewardCash * 1.48) / 25) * 25;
  const nextGems = completed.rewardGems + (nextTier % 2 === 0 ? 2 : 1);
  const nextXp = Math.round(completed.rewardXp * 1.38);

  const trackDescriptions: Record<QuestTrackType, string> = {
    BOTTLE_SERVICE: `Master the Flair Mixology Shaker challenge or deliver ${nextTarget} sparkling VIP Bottle Service trays.`,
    DJ_HYPE_DROP: `Beat-match Deck B to the club BPM and land on-beat Sub-Bass Drops ${nextTarget} times.`,
    MOOD_BOOST: `Complete the 3x3 Neon Dance Grid memory sequence to synchronize ${nextTarget} ecstatic dance waves.`,
    MIXOLOGY_CRAFT: `Pour & shake ${nextTarget} multi-layer neon cocktail recipes inside the green Sweet Spot gauge.`,
    DANCE_FLOOR: `Complete the Neon Grid Synchronizer challenge or place/upgrade ${nextTarget} club decorations.`,
    PARTY_FEVER: `Win the Live DJ Beat-Match Drop challenge ${nextTarget} times to ignite Mega Laser Parties.`,
    STAFF_TEAM: `Inspect guest IDs & VIP hologram seals at the Velvet Rope Bouncer Scanner (${nextTarget} ops).`,
    CLUB_REVENUE: `Generate $${nextTarget.toLocaleString()} via VIP Bouncer cover tips, bottle trays, and bar sales.`,
    WHALE_HUNT: `Complete the 4-Tier VIP Whale Champagne Pyramid pour or serve ${nextTarget} high-roller ★ VIP Whales.`,
    CELEB_PAPARAZZI: `Score a winning streak in the Paparazzi Blitz & VIP Whisperer grid (${nextTarget} victories).`,
    GOSSIP_VIRAL: `Spark ${nextTarget} viral Club Gossip moments or complete Paparazzi Blitz runs for massive hype.`,
    LASER_OVERDRIVE: `Drop ${nextTarget} custom synthwave beats & DJ Overdrive combos to send the dancefloor into orbit.`,
  };

  return {
    ...completed,
    id: `quest_${completed.track.toLowerCase()}_t${nextTier}_${Date.now()}`,
    tier: nextTier,
    title: `${baseTitle} ${roman}`,
    description: trackDescriptions[completed.track],
    targetValue: nextTarget,
    currentValue: 0,
    rewardCash: nextCash,
    rewardGems: nextGems,
    rewardXp: nextXp,
    claimed: false,
  };
}

export type StaffRole = 'BARTENDER' | 'BOUNCER' | 'WAITER';

export type StaffTaskState =
  | 'IDLE_STATION'
  | 'MIXING_DRINK'
  | 'CHECKING_ID'
  | 'PICKING_UP_TRAY'
  | 'WALKING_TO_TABLE'
  | 'SERVING_TABLE'
  | 'RETURNING_TO_BAR';

export interface StaffCatalogItem {
  id: string;
  role: StaffRole;
  name: string;
  title: string;
  hireCostCash: number;
  hireCostGems: number;
  speedBonus: number;
  hypeBonus: number;
  vibeBonus: number;
  description: string;
  uniformColor: string;
  accentColor: string;
}

export interface StaffMemberAgent {
  uid: string;
  catalogId: string;
  role: StaffRole;
  name: string;
  floor: FloorLevel;
  postGridX: number; // Assigned isometric tile X
  postGridY: number; // Assigned isometric tile Y
  gridX: number; // Live interpolated X
  gridY: number; // Live interpolated Y
  path: Array<{ x: number; y: number }>;
  taskState: StaffTaskState;
  taskTimer: number;
  carryingDrinkColor: string | null;
  drinksServed: number;
  guestsCheckedIn: number;
  uniformColor: string;
  hairColor: string;
  actionBubble: string | null;
  bubbleTimer: number;
  walkCycle?: number;
  facingX?: number;
  facingY?: number;
}

export const STAFF_CATALOG: StaffCatalogItem[] = [
  {
    id: 'staff_bartender',
    role: 'BARTENDER',
    name: 'Flair Bartender',
    title: 'Automated Bar Mixologist',
    hireCostCash: 300,
    hireCostGems: 0,
    speedBonus: 0.45,
    hypeBonus: 14,
    vibeBonus: 10,
    description:
      'Station near any Bar Unit to automate drink pouring, cut guest bar wait time by 45%, and trigger flair tip bonuses.',
    uniformColor: '#3b82f6',
    accentColor: '#38bdf8',
  },
  {
    id: 'staff_bouncer',
    role: 'BOUNCER',
    name: 'VIP Security Bouncer',
    title: 'Automated Queue & Crowd Guard',
    hireCostCash: 350,
    hireCostGems: 0,
    speedBonus: 0.5,
    hypeBonus: 12,
    vibeBonus: 18,
    description:
      'Station at the Entrance Door or dance floor perimeter to automate VIP check-in, prevent queue impatience, and award security cover bonuses.',
    uniformColor: '#1e1b4b',
    accentColor: '#facc15',
  },
  {
    id: 'staff_waiter',
    role: 'WAITER',
    name: 'Neon Table Server',
    title: 'Automated Booth & Lounge Waiter',
    hireCostCash: 400,
    hireCostGems: 0,
    speedBonus: 0.55,
    hypeBonus: 18,
    vibeBonus: 16,
    description:
      'Patrols dynamically using A* between the Bar Counter and occupied Lounge Tables/VIP Booths to deliver tray drinks and collect automated table tips.',
    uniformColor: '#db2777',
    accentColor: '#f472b6',
  },
];

export const INITIAL_STAFF_MEMBERS: StaffMemberAgent[] = [
  // Starter Bartender #1 stationed behind the main right-side Neon Bar Counter (init_bar_1 at 7,2)
  {
    uid: 'staff_init_bartender_1',
    catalogId: 'staff_bartender',
    role: 'BARTENDER',
    name: 'Roxy (Mixologist)',
    floor: 1,
    postGridX: 7,
    postGridY: 3,
    gridX: 7.32,
    gridY: 3.1,
    path: [],
    taskState: 'MIXING_DRINK',
    taskTimer: 2.5,
    carryingDrinkColor: '#e879f9',
    drinksServed: 18,
    guestsCheckedIn: 0,
    uniformColor: '#3b82f6',
    hairColor: '#4ade80',
    actionBubble: '🍸',
    bubbleTimer: 3.5,
  },
  // Starter Bartender #2 stationed behind the lower right-side Bar Counter (init_bar_2 at 7,5)
  {
    uid: 'staff_init_bartender_2',
    catalogId: 'staff_bartender',
    role: 'BARTENDER',
    name: 'Jett (Mixologist)',
    floor: 1,
    postGridX: 7,
    postGridY: 6,
    gridX: 7.32,
    gridY: 6.1,
    path: [],
    taskState: 'MIXING_DRINK',
    taskTimer: 2.1,
    carryingDrinkColor: '#22d3ee',
    drinksServed: 15,
    guestsCheckedIn: 0,
    uniformColor: '#8b5cf6',
    hairColor: '#38bdf8',
    actionBubble: '🍸',
    bubbleTimer: 3.2,
  },
  // Starter Bartender #3 stationed behind the top-left Bar Counter (init_bar_3 at 1,0)
  {
    uid: 'staff_init_bartender_3',
    catalogId: 'staff_bartender',
    role: 'BARTENDER',
    name: 'Vesper (Mixologist)',
    floor: 1,
    postGridX: 2,
    postGridY: 0,
    gridX: 2.0,
    gridY: 0.34,
    path: [],
    taskState: 'MIXING_DRINK',
    taskTimer: 2.8,
    carryingDrinkColor: '#fbbf24',
    drinksServed: 12,
    guestsCheckedIn: 0,
    uniformColor: '#ec4899',
    hairColor: '#facc15',
    actionBubble: '🍸',
    bubbleTimer: 3.0,
  },
  // Starter Bouncer stationed near the front entrance door (2, 9)
  {
    uid: 'staff_init_bouncer_1',
    catalogId: 'staff_bouncer',
    role: 'BOUNCER',
    name: 'Marcus (Security)',
    floor: 1,
    postGridX: 1,
    postGridY: 9,
    gridX: 1.15,
    gridY: 9.05,
    path: [],
    taskState: 'CHECKING_ID',
    taskTimer: 3.0,
    carryingDrinkColor: null,
    drinksServed: 0,
    guestsCheckedIn: 19,
    uniformColor: '#1e1b4b',
    hairColor: '#451a03',
    actionBubble: '🛡️',
    bubbleTimer: 3.5,
  },
  // Starter Waiter patrolling between the bar and right-side lounge tables
  {
    uid: 'staff_init_waiter_1',
    catalogId: 'staff_waiter',
    role: 'WAITER',
    name: 'Skye (Table Server)',
    floor: 1,
    postGridX: 6,
    postGridY: 5,
    gridX: 5.8,
    gridY: 5.5,
    path: [],
    taskState: 'SERVING_TABLE',
    taskTimer: 2.2,
    carryingDrinkColor: '#22d3ee',
    drinksServed: 9,
    guestsCheckedIn: 0,
    uniformColor: '#db2777',
    hairColor: '#7c2d12',
    actionBubble: '🍾',
    bubbleTimer: 4,
  },
];

export type ClubGossipCategory =
  | 'DANCE_FLOOR'
  | 'VIP_TEA'
  | 'BAR_BUZZ'
  | 'RED_CARPET'
  | 'DJ_BOOTH';

export interface ClubGossipPost {
  id: string;
  authorName: string;
  authorHandle: string;
  authorEmoji: string;
  authorColor: string;
  category: ClubGossipCategory;
  categoryLabel: string;
  message: string;
  sourceThought: string;
  hypeLevelAtPost: number;
  isViralHypePost: boolean;
  likes: number;
  fireReactions: number;
  userReacted?: boolean;
  timestampLabel: string;
  guestId?: string;
}
