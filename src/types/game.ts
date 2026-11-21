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

export interface PlacedItem {
  uid: string;
  catalogId: string;
  floor: 1 | 2;
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
  | 'QUEUEING'
  | 'WALKING_TO_BAR'
  | 'ORDERING_DRINK'
  | 'WALKING_TO_DANCE'
  | 'DANCING'
  | 'WALKING_TO_SEAT'
  | 'RESTING_AT_SEAT'
  | 'CLIMBING_STAIRS'
  | 'DESCENDING_STAIRS'
  | 'LEAVING';

export type BubbleType =
  | 'BEER'
  | 'COCKTAIL'
  | 'MUSIC'
  | 'SPARKLE'
  | 'CHAT'
  | 'CASH'
  | 'ANGRY_LIGHT'
  | 'ANGRY_QUEUE'
  | 'ANGRY_SEAT'
  | 'VIP_CROWN';

export interface GuestAgent {
  id: string;
  name: string;
  isCelebrity: boolean;
  floor: 1 | 2;
  targetFloor: 1 | 2;
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
}

export interface FloatingText {
  id: string;
  text: string;
  floor: 1 | 2;
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

export interface QuestTask {
  id: string;
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
    description: 'Pastel cycling acrylic floor tile. Essential for your initial 3x3 dive floor.',
    primaryColor: '#38bdf8',
    accentColor: '#f472b6',
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
    costGems: 2,
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

// Initial Dive Bar Layout matching uploaded reference image (IMG_1503_71984622.jpeg)
export const INITIAL_PLACED_ITEMS: PlacedItem[] = [
  // Top-left bar along back wall
  { uid: 'init_bar_1', catalogId: 'bar_dive', floor: 1, gridX: 1, gridY: 0, rotation: 0 },
  // Top-right DJ booth on riser
  { uid: 'init_dj_1', catalogId: 'dj_turntable', floor: 1, gridX: 6, gridY: 0, rotation: 0 },
  // 3x3 colorful dance floor in center (X: 3..5, Y: 3..5)
  { uid: 'init_df_1', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 3, rotation: 0 },
  { uid: 'init_df_2', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 3, rotation: 0 },
  { uid: 'init_df_3', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 3, rotation: 0 },
  { uid: 'init_df_4', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 4, rotation: 0 },
  { uid: 'init_df_5', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 4, rotation: 0 },
  { uid: 'init_df_6', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 4, rotation: 0 },
  { uid: 'init_df_7', catalogId: 'dance_basic', floor: 1, gridX: 3, gridY: 5, rotation: 0 },
  { uid: 'init_df_8', catalogId: 'dance_basic', floor: 1, gridX: 4, gridY: 5, rotation: 0 },
  { uid: 'init_df_9', catalogId: 'dance_basic', floor: 1, gridX: 5, gridY: 5, rotation: 0 },
  // Worn couches along left & right walls
  { uid: 'init_couch_left', catalogId: 'seat_worn_couch', floor: 1, gridX: 0, gridY: 3, rotation: 90 },
  { uid: 'init_couch_right1', catalogId: 'seat_worn_couch', floor: 1, gridX: 8, gridY: 2, rotation: 0 },
  { uid: 'init_couch_right2', catalogId: 'seat_worn_couch', floor: 1, gridX: 8, gridY: 4, rotation: 0 },
  // Round wood tables in bottom-right lounge
  { uid: 'init_table_1', catalogId: 'seat_bistro', floor: 1, gridX: 7, gridY: 6, rotation: 0 },
  { uid: 'init_table_2', catalogId: 'seat_bistro', floor: 1, gridX: 8, gridY: 7, rotation: 0 },
  // Basic string light pillar
  { uid: 'init_light_1', catalogId: 'light_string', floor: 1, gridX: 0, gridY: 1, rotation: 0 },
];

// Preset VIP Hotspot Showcase layout for Floor 1 & Floor 2
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
];

export const INITIAL_QUESTS: QuestTask[] = [
  {
    id: 'quest_lighting',
    title: 'Fix the Dive Lighting',
    description: 'Guests are complaining it is too dark! Place 1 Laser Truss or String Light in Build/Decorate.',
    targetValue: 2,
    currentValue: 1,
    rewardCash: 450,
    rewardGems: 2,
    rewardXp: 80,
    claimed: false,
  },
  {
    id: 'quest_dancefloor',
    title: 'Expand the Dance Floor',
    description: 'Grow your dance floor to at least 11 dance tiles so more clubbers can drop hype.',
    targetValue: 11,
    currentValue: 9,
    rewardCash: 600,
    rewardGems: 3,
    rewardXp: 120,
    claimed: false,
  },
  {
    id: 'quest_drinks',
    title: 'Upgrade Mixology Menu',
    description: 'Switch your active house drink or upgrade your bar counter to serve faster cocktails.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 500,
    rewardGems: 2,
    rewardXp: 100,
    claimed: false,
  },
  {
    id: 'quest_floor2',
    title: 'Vertical Expansion: Floor 2',
    description: 'Unlock the 2nd Floor VIP Sky Lounge via the staircase or Top-Right expansion control.',
    targetValue: 1,
    currentValue: 0,
    rewardCash: 1500,
    rewardGems: 8,
    rewardXp: 300,
    claimed: false,
  },
];
