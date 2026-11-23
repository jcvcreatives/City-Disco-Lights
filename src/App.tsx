import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Crown,
  Heart,
  Pause,
  Play,
  Plus,
  RotateCw,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { HypeBlastEvent, HypeBlastOverlay } from './components/HypeBlastOverlay';
import {
  ClubSimulationMetrics,
  DayNightCycleReport,
  IsometricClubCanvas,
} from './components/IsometricClubCanvas';
import {
  CATALOG_ITEMS,
  CatalogItem,
  DRINK_MIXES,
  FloatingText,
  FloorLevel,
  GuestAgent,
  INITIAL_PLACED_ITEMS,
  INITIAL_QUESTS,
  INITIAL_STAFF_MEMBERS,
  ItemCategory,
  LEVEL_1_DIVE_BAR_ITEMS,
  ParkingUpgradeState,
  PlacedItem,
  QuestTask,
  STAFF_CATALOG,
  StaffCatalogItem,
  StaffMemberAgent,
  VIP_HOTSPOT_ITEMS,
} from './types/game';
import {
  buildStaffStationPath,
  canPlaceItem,
  DOOR_COORD,
  getCatalogItem,
  getRotatedFootprint,
  GRID_SIZE,
  STAIRS_COORD,
} from './utils/pathfinding';
import {
  assetManager,
  SPRITE_ASSET_DEFINITIONS,
  SpriteAssetKey,
} from './utils/assetManager';

type DockTabId =
  | 'TONIGHT'
  | 'DRESSING'
  | 'STAFF'
  | 'DECORATE'
  | 'CELEBS'
  | 'PARTIES'
  | 'TROPHIES'
  | 'SETTINGS'
  | null;

type TopLeftModalId = 'GENRE' | 'BASS' | 'DEDICATE' | null;

const STAFF_FIRST_NAMES: Record<StaffCatalogItem['role'], string[]> = {
  BARTENDER: ['Roxy', 'Jett', 'Vesper', 'Kobe', 'Nyx', 'Zane'],
  BOUNCER: ['Marcus', 'Titan', 'Knox', 'Jaxon', 'Rex', 'Vance'],
  WAITER: ['Skye', 'Pixel', 'Nova', 'Cleo', 'Lyra', 'Tori'],
};

const CELEBRITY_NAMES = [
  'DJ Daft Nova',
  'Kyra Vance (Pop Icon)',
  'Jax Sterling (Synth King)',
  'Luna Eclipse (Supermodel)',
];

const INITIAL_GUESTS: GuestAgent[] = [
  // Well-separated dancers across the 4x4 sunken neon dance floor (natural personal space between each dancer)
  {
    id: 'g_dance_1',
    name: 'Leo',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 2.35,
    gridY: 2.45,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 11,
    patience: 92,
    hype: 88,
    bubble: 'MUSIC',
    bubbleTimer: 9,
    shirtColor: '#22d3ee',
    hairColor: '#1e1b4b',
    pantsColor: '#1e3a8a',
    cashSpent: 45,
    danceMove: 'SHUFFLE_STEP',
    danceMoveTimer: 3.8,
    dancePhaseOffset: 0.4,
  },
  {
    id: 'g_dance_2',
    name: 'Mia J.',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.55,
    gridY: 4.85,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 14,
    patience: 96,
    hype: 94,
    bubble: 'COCKTAIL',
    bubbleTimer: 10,
    shirtColor: '#f43f5e',
    hairColor: '#0D0D14',
    pantsColor: '#1e293b',
    cashSpent: 90,
    danceMove: 'FIST_PUMP',
    danceMoveTimer: 4.2,
    dancePhaseOffset: 1.7,
  },
  {
    id: 'g_dance_3',
    name: 'Zoe',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 3.55,
    gridY: 3.55,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 12.5,
    patience: 90,
    hype: 92,
    bubble: 'VIP_CROWN',
    bubbleTimer: 8,
    shirtColor: '#a855f7',
    hairColor: '#facc15',
    pantsColor: '#0f172a',
    cashSpent: 120,
    danceMove: 'SPIN_TWIRL',
    danceMoveTimer: 3.6,
    dancePhaseOffset: 2.9,
  },
  {
    id: 'g_dance_4',
    name: 'Kai',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 5.35,
    gridY: 2.55,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 13,
    patience: 92,
    hype: 88,
    bubble: 'CASH',
    bubbleTimer: 7,
    shirtColor: '#84cc16',
    hairColor: '#7c2d12',
    pantsColor: '#1e3a8a',
    cashSpent: 65,
    danceMove: 'BREAKDANCE_WAVE',
    danceMoveTimer: 4.0,
    dancePhaseOffset: 4.1,
  },
  {
    id: 'g_dance_5',
    name: 'Aria',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 5.45,
    gridY: 4.15,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 11.5,
    patience: 90,
    hype: 92,
    bubble: 'SPARKLE',
    bubbleTimer: 8,
    shirtColor: '#ec4899',
    hairColor: '#451a03',
    pantsColor: '#1e1b4b',
    cashSpent: 80,
    danceMove: 'CYBER_JUMP',
    danceMoveTimer: 3.9,
    dancePhaseOffset: 5.2,
  },
  {
    id: 'g_dance_6',
    name: 'Noel',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 2.35,
    gridY: 4.15,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 10.5,
    patience: 94,
    hype: 89,
    bubble: 'VIP_CROWN',
    bubbleTimer: 9,
    shirtColor: '#38bdf8',
    hairColor: '#f8fafc',
    pantsColor: '#1e293b',
    cashSpent: 110,
    danceMove: 'SHUFFLE_STEP',
    danceMoveTimer: 4.1,
    dancePhaseOffset: 1.1,
  },
  {
    id: 'g_dance_7',
    name: 'Tori',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 3.15,
    gridY: 5.45,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 12,
    patience: 91,
    hype: 87,
    bubble: 'CASH',
    bubbleTimer: 6.5,
    shirtColor: '#f97316',
    hairColor: '#111116',
    pantsColor: '#0f172a',
    cashSpent: 75,
    danceMove: 'FIST_PUMP',
    danceMoveTimer: 3.7,
    dancePhaseOffset: 2.3,
  },
  {
    id: 'g_dance_8',
    name: 'Vance',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 3.85,
    gridY: 2.25,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 11,
    patience: 89,
    hype: 86,
    bubble: 'MUSIC',
    bubbleTimer: 7.5,
    shirtColor: '#eab308',
    hairColor: '#7c2d12',
    pantsColor: '#1e293b',
    cashSpent: 60,
    danceMove: 'SPIN_TWIRL',
    danceMoveTimer: 4.4,
    dancePhaseOffset: 3.5,
  },
  // Patrons Sitting on Tufted Purple VIP Booth Sofas along Back-Left Wall (occupying distinct sofa cushions)
  {
    id: 'g_vip_sofa_1',
    name: 'Milo',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.28,
    gridY: 1.32,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 16,
    patience: 92,
    hype: 84,
    bubble: 'CASH',
    bubbleTimer: 7,
    shirtColor: '#0284c7',
    hairColor: '#dc2626',
    pantsColor: '#334155',
    cashSpent: 90,
    seatPosture: 'SITTING_SOFA',
    facingDir: 'SE',
    assignedSlotId: 'init_couch_left1_sofa_0',
  },
  {
    id: 'g_vip_sofa_2',
    name: 'Sienna',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.28,
    gridY: 2.0,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 17,
    patience: 94,
    hype: 86,
    bubble: 'CHAT',
    bubbleTimer: 8,
    shirtColor: '#a855f7',
    hairColor: '#111116',
    pantsColor: '#1e293b',
    cashSpent: 110,
    seatPosture: 'SITTING_SOFA',
    facingDir: 'SE',
    assignedSlotId: 'init_couch_left1_sofa_1',
  },
  {
    id: 'g_vip_sofa_3',
    name: 'Jaxon',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.28,
    gridY: 2.68,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 15,
    patience: 93,
    hype: 87,
    bubble: 'VIP_CROWN',
    bubbleTimer: 8,
    shirtColor: '#f59e0b',
    hairColor: '#1e1b4b',
    pantsColor: '#0f172a',
    cashSpent: 135,
    seatPosture: 'SITTING_SOFA',
    facingDir: 'SE',
    assignedSlotId: 'init_couch_left1_sofa_2',
  },
  {
    id: 'g_vip_sofa_4',
    name: 'Nyx',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.28,
    gridY: 4.32,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 14.5,
    patience: 91,
    hype: 85,
    bubble: 'COCKTAIL',
    bubbleTimer: 7,
    shirtColor: '#ec4899',
    hairColor: '#f8fafc',
    pantsColor: '#1e293b',
    cashSpent: 105,
    seatPosture: 'SITTING_SOFA',
    facingDir: 'SE',
    assignedSlotId: 'init_couch_left2_sofa_0',
  },
  {
    id: 'g_vip_sofa_5',
    name: 'Kobe',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.28,
    gridY: 5.0,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 18,
    patience: 95,
    hype: 89,
    bubble: 'SPARKLE',
    bubbleTimer: 9,
    shirtColor: '#14b8a6',
    hairColor: '#451a03',
    pantsColor: '#1e1b4b',
    cashSpent: 120,
    seatPosture: 'SITTING_SOFA',
    facingDir: 'SE',
    assignedSlotId: 'init_couch_left2_sofa_1',
  },
  // Patrons Sitting in BOTH Cushioned Club Chairs & Standing Beside High-Top Cocktail Tables (never on top of the tables!)
  {
    id: 'g_seat_bistro_1',
    name: 'Kira R.',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 1.14,
    gridY: 7.52,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 15,
    patience: 91,
    hype: 85,
    bubble: 'COCKTAIL',
    bubbleTimer: 7.5,
    shirtColor: '#38bdf8',
    hairColor: '#facc15',
    pantsColor: '#0f172a',
    cashSpent: 95,
    seatPosture: 'SITTING_CHAIR',
    facingDir: 'SE',
    assignedSlotId: 'init_table_1_chair_back',
  },
  {
    id: 'g_seat_bistro_2',
    name: 'Liam',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 1.86,
    gridY: 7.48,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 14.5,
    patience: 90,
    hype: 84,
    bubble: 'CHAT',
    bubbleTimer: 6.5,
    shirtColor: '#22c55e',
    hairColor: '#451a03',
    pantsColor: '#1e293b',
    cashSpent: 85,
    seatPosture: 'SITTING_CHAIR',
    facingDir: 'NW',
    assignedSlotId: 'init_table_1_chair_front',
  },
  {
    id: 'g_seat_bistro_3',
    name: 'Maya',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.14,
    gridY: 7.52,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 16,
    patience: 93,
    hype: 87,
    bubble: 'COCKTAIL',
    bubbleTimer: 7.0,
    shirtColor: '#f43f5e',
    hairColor: '#1e1b4b',
    pantsColor: '#0f172a',
    cashSpent: 105,
    seatPosture: 'SITTING_CHAIR',
    facingDir: 'SE',
    assignedSlotId: 'init_table_2_chair_back',
  },
  {
    id: 'g_seat_bistro_4',
    name: 'Zane',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.86,
    gridY: 7.48,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 15.5,
    patience: 92,
    hype: 86,
    bubble: 'MUSIC',
    bubbleTimer: 7.0,
    shirtColor: '#38bdf8',
    hairColor: '#78350f',
    pantsColor: '#1e293b',
    cashSpent: 95,
    seatPosture: 'SITTING_CHAIR',
    facingDir: 'NW',
    assignedSlotId: 'init_table_2_chair_front',
  },
  {
    id: 'g_table_stand_1',
    name: 'Mia H.',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.54,
    gridY: 7.96,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 14.0,
    patience: 94,
    hype: 90,
    bubble: 'SPARKLE',
    bubbleTimer: 8.0,
    shirtColor: '#a855f7',
    hairColor: '#facc15',
    pantsColor: '#1e1b4b',
    cashSpent: 110,
    seatPosture: 'STANDING_TABLE',
    facingDir: 'NW',
    assignedSlotId: 'init_table_2_stand_front',
  },
  // Patrons Occupying ALL 6 Bar Stools Along the Right-Side Bar Counters (8.36, gy = 2.5, 3.5, 4.5, 5.5, 6.5, 7.5)
  {
    id: 'g_bar_1',
    name: 'Roxy',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 2.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 11.5,
    patience: 93,
    hype: 86,
    bubble: 'COCKTAIL',
    bubbleTimer: 7,
    shirtColor: '#38bdf8',
    hairColor: '#111116',
    pantsColor: '#1e293b',
    cashSpent: 85,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_1_stool_0',
  },
  {
    id: 'g_bar_2',
    name: 'Ivy W.',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 3.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 13.0,
    patience: 92,
    hype: 85,
    bubble: 'COCKTAIL',
    bubbleTimer: 6,
    shirtColor: '#10b981',
    hairColor: '#78350f',
    pantsColor: '#1e293b',
    cashSpent: 90,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_1_stool_1',
  },
  {
    id: 'g_bar_3',
    name: 'Jett',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 4.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 10.5,
    patience: 91,
    hype: 87,
    bubble: 'BEER',
    bubbleTimer: 6.5,
    shirtColor: '#f97316',
    hairColor: '#451a03',
    pantsColor: '#0f172a',
    cashSpent: 80,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_1_stool_2',
  },
  {
    id: 'g_bar_4',
    name: 'Lyra',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 5.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 12.0,
    patience: 95,
    hype: 89,
    bubble: 'CHAT',
    bubbleTimer: 7.5,
    shirtColor: '#a855f7',
    hairColor: '#facc15',
    pantsColor: '#1e1b4b',
    cashSpent: 100,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_2_stool_0',
  },
  {
    id: 'g_bar_stand_2',
    name: 'Cleo',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 6.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 11.0,
    patience: 94,
    hype: 88,
    bubble: 'SPARKLE',
    bubbleTimer: 7,
    shirtColor: '#ec4899',
    hairColor: '#facc15',
    pantsColor: '#111116',
    cashSpent: 115,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_2_stool_1',
  },
  {
    id: 'g_bar_6',
    name: 'Nova',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 8.36,
    gridY: 7.5,
    path: [],
    state: 'ORDERING_DRINK',
    stateTimer: 12.5,
    patience: 93,
    hype: 88,
    bubble: 'COCKTAIL',
    bubbleTimer: 8,
    shirtColor: '#22d3ee',
    hairColor: '#dc2626',
    pantsColor: '#1e293b',
    cashSpent: 95,
    seatPosture: 'SITTING_STOOL',
    facingDir: 'NW',
    assignedSlotId: 'init_bar_2_stool_2',
  },
  // Guests queuing outside
  {
    id: 'g_queue_1',
    name: 'Chloe',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 1.65,
    gridY: 10.42,
    path: [],
    state: 'QUEUEING',
    stateTimer: 2.5,
    patience: 90,
    hype: 75,
    bubble: 'CHAT',
    bubbleTimer: 6,
    shirtColor: '#a855f7',
    hairColor: '#b45309',
    pantsColor: '#1e1b4b',
    cashSpent: 0,
  },
  {
    id: 'g_queue_2',
    name: 'Dante',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 0.77,
    gridY: 10.56,
    path: [],
    state: 'QUEUEING',
    stateTimer: 4.0,
    patience: 88,
    hype: 72,
    bubble: 'MUSIC',
    bubbleTimer: 7,
    shirtColor: '#6366f1',
    hairColor: '#451a03',
    pantsColor: '#1e293b',
    cashSpent: 0,
  },
];

const PLAYLIST_TRACKS = [
  { title: 'Neon Bass Odyssey', artist: 'DJ Daft Nova', genre: 'Electro House', bpm: 124, bonus: '+15% Drink Speed' },
  { title: 'Midnight Starlight', artist: 'Kyra Vance', genre: 'Synthwave Pop', bpm: 118, bonus: '+25% Dancer Hype' },
  { title: 'Velvet Rope Rush', artist: 'Jax Sterling', genre: 'Cyber Funk', bpm: 128, bonus: '+35% VIP Tips' },
  { title: 'Laser Prism Drop', artist: 'Luna Eclipse', genre: 'Future Bass', bpm: 132, bonus: '+40% Party Vibe' },
];

const AVATAR_STYLES = [
  { id: 'neon_hoodie', label: 'Cyan Neon Street Hoodie', hair: '#ec4899', top: '#22d3ee', cap: '#a855f7' },
  { id: 'gold_vip', label: '24K Gold VIP Tracksuit', hair: '#111116', top: '#facc15', cap: '#f43f5e' },
  { id: 'cyber_vest', label: 'Magenta Puffer & Beanie', hair: '#38bdf8', top: '#ec4899', cap: '#84cc16' },
  { id: 'emerald_dj', label: 'Lime Bass Bomber Jacket', hair: '#facc15', top: '#84cc16', cap: '#22d3ee' },
];

export default function App() {
  // Core Economy & Progression
  const [clubName, setClubName] = useState<string>('CLUB NEON');
  const [level, setLevel] = useState<number>(12);
  const [xp, setXp] = useState<number>(1140);
  const [cash, setCash] = useState<number>(14850);
  const [gems, setGems] = useState<number>(24);
  const [energy, setEnergy] = useState<number>(7);
  const maxEnergy = 12;
  const cashRef = useRef<number>(cash);
  cashRef.current = cash;

  // Multi-Floor State (Supports Floor 1, Floor 2, and Floor 3 vertical expansion)
  const [activeFloor, setActiveFloor] = useState<FloorLevel>(1);
  const [unlockedFloors, setUnlockedFloors] = useState<FloorLevel>(1);

  // Placed Furniture & Drinks + Live Drink Mix Prep Timer & Servings Count
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(INITIAL_PLACED_ITEMS);
  const [activeDrinkId, setActiveDrinkId] = useState<string>('drink_electric_mule');
  const [drinkPrepRemainingSec, setDrinkPrepRemainingSec] = useState<number>(3);
  const [drinkServingsRemaining, setDrinkServingsRemaining] = useState<number>(48);
  const [spriteAssetVersion, setSpriteAssetVersion] = useState<number>(0);
  const [parkingState, setParkingState] = useState<ParkingUpgradeState>({
    lotTier: 2,
    bouncerCount: 2,
    ropeTier: 2,
  });

  // Navigation Dock & Top-Left Modals
  const [activeDockTab, setActiveDockTab] = useState<DockTabId>(null);
  const [activeTopLeftModal, setActiveTopLeftModal] = useState<TopLeftModalId>(null);
  const [buildCategory, setBuildCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(
    CATALOG_ITEMS.find((i) => i.id === 'seat_bistro') || null
  );
  const [buildRotation, setBuildRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isRemoveMode, setIsRemoveMode] = useState<boolean>(false);

  // Avatar & Music Player State
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number>(0);
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [isTrackLiked, setIsTrackLiked] = useState<boolean>(true);
  const [isMusicPaused, setIsMusicPaused] = useState<boolean>(false);
  const [selectedBpm, setSelectedBpm] = useState<number>(124);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Club Status, Party & Happy Hour Rush State
  const [isClubOpenStatus, setIsClubOpenStatus] = useState<boolean>(true);
  const [hypeSurgeBonus, setHypeSurgeBonus] = useState<number>(45);
  const [happyHourSeconds, setHappyHourSeconds] = useState<number>(165);
  const [partyCount, setPartyCount] = useState<number>(3);

  // Camera Zoom & Pan Reset
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [cameraResetTick, setCameraResetTick] = useState<number>(0);

  // Quests & Trophies
  const [quests, setQuests] = useState<QuestTask[]>(INITIAL_QUESTS);
  const [queueCount, setQueueCount] = useState<number>(2);
  const [hypeBlastEvent, setHypeBlastEvent] = useState<HypeBlastEvent | null>(null);

  // Staff Management System
  const [staffMembers, setStaffMembers] = useState<StaffMemberAgent[]>(
    INITIAL_STAFF_MEMBERS.map((s) => ({ ...s, path: [] }))
  );
  const [placementModeStaff, setPlacementModeStaff] = useState<StaffCatalogItem | null>(null);
  const [relocatingStaffUid, setRelocatingStaffUid] = useState<string | null>(null);

  // Global Day/Night Cycle & Neon Emissive Glow State
  const [dayNightOverrideHour, setDayNightOverrideHour] = useState<number | null>(0.75);
  const [dayNightReport, setDayNightReport] = useState<DayNightCycleReport>({
    hour: 0.75,
    formattedTime: '12:45 AM',
    phaseLabel: 'MIDNIGHT NEON PEAK',
    nightIntensity: 0.96,
    emissiveMultiplier: 1.85,
  });

  // 60fps Mutable Refs for Guests & Floating Cash Pops
  const guestsRef = useRef<GuestAgent[]>(INITIAL_GUESTS.map((g) => ({ ...g })));
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const xpToNextLevel = level * 150;
  const currentTrack = PLAYLIST_TRACKS[trackIndex % PLAYLIST_TRACKS.length];
  const currentAvatar = AVATAR_STYLES[selectedAvatarIdx % AVATAR_STYLES.length];

  const activeDrink = useMemo(
    () => DRINK_MIXES.find((d) => d.id === activeDrinkId) || DRINK_MIXES[0],
    [activeDrinkId]
  );

  // Subscribe to custom PNG Sprite AssetManager updates so UI badges refresh immediately on upload
  useEffect(() => {
    return assetManager.subscribe(() => {
      setSpriteAssetVersion((v) => v + 1);
    });
  }, []);

  // Happy Hour Rush countdown timer + Tiered Drink Mix Prep Timer & Serving Counter
  useEffect(() => {
    const timer = setInterval(() => {
      setHappyHourSeconds((prev) => (prev > 1 ? prev - 1 : 180));
      setDrinkPrepRemainingSec((prev) => {
        if (prev > 1) return prev - 1;
        setDrinkServingsRemaining((s) => (s > 1 ? s - 1 : 60));
        return Math.max(1, Math.round(activeDrink.prepTimeSec));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeDrink.prepTimeSec]);

  const formattedHappyHour = useMemo(() => {
    const mins = Math.floor(happyHourSeconds / 60);
    const secs = happyHourSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [happyHourSeconds]);

  // Compute Club Hype, Vibe, Star Rating, and Multipliers
  const clubMetrics = useMemo<ClubSimulationMetrics>(() => {
    let totalHype = 0;
    let totalVibe = 0;
    let tipBonus = 0;
    let maxBarTier: 1 | 2 | 3 = 1;
    let lightingCount = 0;
    let danceTileCount = 0;
    let seatCount = 0;

    for (const p of placedItems) {
      const cat = getCatalogItem(p.catalogId);
      if (!cat) continue;
      totalHype += cat.hypeBonus;
      totalVibe += cat.vibeBonus;
      tipBonus += cat.tipMultiplier;
      if (cat.category === 'BAR_UNIT' && cat.tier > maxBarTier) {
        maxBarTier = cat.tier;
      }
      if (cat.category === 'LIGHTING') lightingCount++;
      if (cat.category === 'DANCE_TILE') danceTileCount += cat.width * cat.depth;
      if (cat.category === 'SEATING') seatCount++;
    }

    for (const s of staffMembers) {
      const staffCat = STAFF_CATALOG.find((c) => c.id === s.catalogId);
      if (staffCat) {
        totalHype += staffCat.hypeBonus;
        totalVibe += staffCat.vibeBonus;
        tipBonus += 0.05;
      }
    }

    totalHype +=
      activeDrink.hypeBoost +
      (parkingState.lotTier - 1) * 25 +
      (parkingState.bouncerCount - 1) * 15 +
      hypeSurgeBonus;
    totalVibe += (parkingState.ropeTier - 1) * 20 + 35;
    tipBonus += (activeDrink.tier - 1) * 0.08 + (parkingState.ropeTier - 1) * 0.06;

    const hypeSegments = Math.min(3, Math.max(1, Math.floor(totalHype / 90) + 1));
    const vibeSegments = Math.min(3, Math.max(1, Math.floor(totalVibe / 85) + 1));
    const maxGuests = 12 + parkingState.lotTier * 3 + (unlockedFloors - 1) * 6;

    return {
      totalHype,
      totalVibe,
      tipBonus,
      maxBarTier,
      lightingCount,
      danceTileCount,
      seatCount,
      hypeSegments,
      vibeSegments,
      maxGuests,
    };
  }, [placedItems, staffMembers, parkingState, unlockedFloors, activeDrink, hypeSurgeBonus]);

  const starRating = useMemo(() => {
    const raw = 4.2 + Math.min(0.8, (clubMetrics.totalHype + clubMetrics.totalVibe) / 600);
    return raw.toFixed(1);
  }, [clubMetrics.totalHype, clubMetrics.totalVibe]);

  const vibeThermometerPercent = useMemo(() => {
    return Math.min(100, Math.max(24, Math.round(((clubMetrics.totalHype + clubMetrics.totalVibe) / 360) * 100)));
  }, [clubMetrics.totalHype, clubMetrics.totalVibe]);

  // Compute exact screen pixel position of the Dance Floor Center
  const triggerHypeBlast = useCallback(
    (hypeDelta: number, totalHypeVal: number, tipBonusVal: number) => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const h = typeof window !== 'undefined' ? window.innerHeight : 720;
      const autoScale = Math.min(1.22, Math.max(0.55, Math.min(w / 760, h / 640)));
      const scale = autoScale * cameraZoom;
      const tileH = 28 * scale;
      const originX = w * (w < 640 ? 0.53 : 0.505);
      const originY = h * (w < 640 ? 0.28 : 0.305);

      const danceCenterX = originX;
      const danceCenterY = originY + (4.5 + 4.5) * (tileH / 2) - 8 * scale;

      setHypeBlastEvent({
        id: Date.now() + Math.floor(Math.random() * 1000),
        screenX: danceCenterX,
        screenY: danceCenterY,
        hypeDelta: Math.max(5, hypeDelta),
        newTotalHype: totalHypeVal,
        multiplierText: `${(1 + tipBonusVal).toFixed(2)}x`,
      });
    },
    [cameraZoom]
  );

  // Sync Quests Progress
  useEffect(() => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === 'quest_lighting') {
          return { ...q, currentValue: Math.min(q.targetValue, clubMetrics.lightingCount + 1) };
        }
        if (q.id === 'quest_dancefloor') {
          return { ...q, currentValue: Math.min(q.targetValue, clubMetrics.danceTileCount) };
        }
        if (q.id === 'quest_drinks') {
          const upgraded = activeDrinkId !== 'drink_draft_beer' || clubMetrics.maxBarTier > 1 ? 1 : 0;
          return { ...q, currentValue: upgraded };
        }
        if (q.id === 'quest_floor2') {
          return { ...q, currentValue: unlockedFloors >= 2 ? 1 : 0 };
        }
        return q;
      })
    );
  }, [clubMetrics, activeDrinkId, unlockedFloors]);

  const addXp = useCallback(
    (amount: number) => {
      setXp((prevXp) => {
        const next = prevXp + amount;
        const threshold = level * 150;
        if (next >= threshold) {
          setLevel((l) => l + 1);
          setGems((g) => g + 2);
          setEnergy(maxEnergy);
          soundEngine.playUpgradeFanfare();
          return next - threshold;
        }
        return next;
      });
    },
    [level]
  );

  const handleEarnRevenue = useCallback(
    (cashDelta: number, xpDelta: number) => {
      if (cashDelta > 0) setCash((c) => c + cashDelta);
      if (xpDelta > 0) addXp(xpDelta);
    },
    [addXp]
  );

  // Subtle rhythmic club beat audio pulse when not muted and not paused
  useEffect(() => {
    if (isMuted || isMusicPaused) return;
    const msPerBeat = Math.round((60 / selectedBpm) * 1000 * 2);
    const id = setInterval(() => {
      soundEngine.playBeatPulse(clubMetrics.hypeSegments);
    }, msPerBeat);
    return () => clearInterval(id);
  }, [isMuted, isMusicPaused, selectedBpm, clubMetrics.hypeSegments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setBuildRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
        soundEngine.playClick();
      } else if (e.key === 'Escape') {
        setActiveDockTab(null);
        setActiveTopLeftModal(null);
        setIsRemoveMode(false);
        setPlacementModeStaff(null);
        setRelocatingStaffUid(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleThrowParty = () => {
    soundEngine.playUpgradeFanfare();
    setHypeSurgeBonus(140);
    setPartyCount((p) => p + 1);
    setCash((c) => c + 550);
    addXp(110);
    setEnergy((e) => (e > 1 ? e - 1 : maxEnergy));
    triggerHypeBlast(65, clubMetrics.totalHype + 65, clubMetrics.tipBonus + 0.25);
    floatingTextsRef.current.push({
      id: `party_${performance.now()}`,
      text: 'MEGA NEON PARTY! +$550 & MAX VIBE!',
      floor: activeFloor,
      gridX: 4,
      gridY: 4,
      color: '#f472b6',
      age: 0,
    });
  };

  const spawnStaffMemberAtGrid = (
    staffCat: StaffCatalogItem,
    floor: FloorLevel,
    gridX: number,
    gridY: number
  ) => {
    if (cashRef.current < staffCat.hireCostCash) {
      soundEngine.playError();
      floatingTextsRef.current.push({
        id: `staff_err_${performance.now()}`,
        text: `NEED $${staffCat.hireCostCash} TO HIRE!`,
        floor,
        gridX,
        gridY,
        color: '#f87171',
        age: 0,
      });
      return false;
    }

    const rolePool = STAFF_FIRST_NAMES[staffCat.role];
    const roleCount = staffMembers.filter((s) => s.role === staffCat.role).length;
    const firstName = rolePool[roleCount % rolePool.length];
    const roleLabel =
      staffCat.role === 'BARTENDER'
        ? 'Mixologist'
        : staffCat.role === 'BOUNCER'
        ? 'Security'
        : 'Server';

    const entryX = floor === 1 ? DOOR_COORD.x : STAIRS_COORD.x;
    const entryY = floor === 1 ? DOOR_COORD.y : STAIRS_COORD.y + 1;
    const entryPath = buildStaffStationPath(placedItems, floor, entryX, entryY, gridX, gridY);

    const newStaff: StaffMemberAgent = {
      uid: `staff_${staffCat.role.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      catalogId: staffCat.id,
      role: staffCat.role,
      name: `${firstName} (${roleLabel})`,
      floor,
      gridX: entryX,
      gridY: entryY,
      postGridX: gridX,
      postGridY: gridY,
      path: entryPath,
      taskState:
        staffCat.role === 'BARTENDER'
          ? 'MIXING_DRINK'
          : staffCat.role === 'BOUNCER'
          ? 'CHECKING_ID'
          : 'SERVING_TABLE',
      taskTimer: 1.5,
      carryingDrinkColor: staffCat.role === 'WAITER' ? '#22d3ee' : null,
      drinksServed: 0,
      guestsCheckedIn: 0,
      uniformColor: staffCat.uniformColor,
      hairColor: roleCount % 2 === 0 ? '#1e1b4b' : '#581c87',
      actionBubble: '🚶',
      bubbleTimer: 3.5,
    };

    cashRef.current -= staffCat.hireCostCash;
    setCash((c) => c - staffCat.hireCostCash);
    setStaffMembers((prev) => [...prev, newStaff]);
    if (staffCat.role === 'BOUNCER') {
      setParkingState((p) => ({ ...p, bouncerCount: Math.min(4, p.bouncerCount + 1) }));
    }
    addXp(55);
    soundEngine.playPlaceItem();
    floatingTextsRef.current.push({
      id: `hire_${performance.now()}`,
      text: `HIRED ${firstName.toUpperCase()}! WALKING TO POST +${staffCat.hypeBonus}⚡`,
      floor,
      gridX,
      gridY,
      color: '#38bdf8',
      age: 0,
    });
    return true;
  };

  const purchaseAndPlaceCatalogItem = (
    item: CatalogItem,
    targetCoord?: { x: number; y: number }
  ): boolean => {
    if (cashRef.current < item.costCash) {
      soundEngine.playError();
      floatingTextsRef.current.push({
        id: `err_${performance.now()}`,
        text: `NEED $${item.costCash} CASH!`,
        floor: activeFloor,
        gridX: targetCoord ? targetCoord.x : 4,
        gridY: targetCoord ? targetCoord.y : 4,
        color: '#f87171',
        age: 0,
      });
      return false;
    }

    const fp = getRotatedFootprint(item, buildRotation);
    const reqX = targetCoord
      ? Math.max(0, Math.min(GRID_SIZE - fp.width, targetCoord.x))
      : Math.floor((GRID_SIZE - fp.width) / 2);
    const reqY = targetCoord
      ? Math.max(0, Math.min(GRID_SIZE - fp.depth, targetCoord.y))
      : Math.floor((GRID_SIZE - fp.depth) / 2);

    const isStairsOrDoorBlocked = (gx: number, gy: number) => {
      for (let dx = 0; dx < fp.width; dx++) {
        for (let dy = 0; dy < fp.depth; dy++) {
          const tx = gx + dx;
          const ty = gy + dy;
          if (tx === STAIRS_COORD.x && ty === STAIRS_COORD.y) return true;
          if (activeFloor === 1 && tx === DOOR_COORD.x && ty === DOOR_COORD.y) return true;
        }
      }
      return false;
    };

    const getOverlappingFloorItems = (gx: number, gy: number) => {
      return placedItems.filter((p) => {
        if (p.floor !== activeFloor) return false;
        const exCat = getCatalogItem(p.catalogId);
        if (!exCat) return false;
        const exFp = getRotatedFootprint(exCat, p.rotation);
        const overlapX = gx < p.gridX + exFp.width && gx + fp.width > p.gridX;
        const overlapY = gy < p.gridY + exFp.depth && gy + fp.depth > p.gridY;
        return overlapX && overlapY;
      });
    };

    let chosenX = -1;
    let chosenY = -1;
    let replacedUids: string[] = [];

    if (canPlaceItem(placedItems, item, activeFloor, reqX, reqY, buildRotation)) {
      chosenX = reqX;
      chosenY = reqY;
    } else if (targetCoord && !isStairsOrDoorBlocked(reqX, reqY)) {
      const overlapping = getOverlappingFloorItems(reqX, reqY);
      const canUpgradeReplace =
        overlapping.length > 0 &&
        overlapping.every((ov) => {
          const ovCat = getCatalogItem(ov.catalogId);
          if (!ovCat) return false;
          return ovCat.category === item.category || ovCat.category === 'DANCE_TILE';
        });
      if (canUpgradeReplace) {
        chosenX = reqX;
        chosenY = reqY;
        replacedUids = overlapping.map((o) => o.uid);
      }
    }

    if (chosenX === -1) {
      let bestDist = Infinity;
      for (let gy = 0; gy <= GRID_SIZE - fp.depth; gy++) {
        for (let gx = 0; gx <= GRID_SIZE - fp.width; gx++) {
          if (canPlaceItem(placedItems, item, activeFloor, gx, gy, buildRotation)) {
            const dist = Math.hypot(gx - reqX, gy - reqY);
            if (dist < bestDist) {
              bestDist = dist;
              chosenX = gx;
              chosenY = gy;
            }
          }
        }
      }
    }

    if (chosenX === -1) {
      for (let gy = 0; gy <= GRID_SIZE - fp.depth; gy++) {
        for (let gx = 0; gx <= GRID_SIZE - fp.width; gx++) {
          if (isStairsOrDoorBlocked(gx, gy)) continue;
          const overlapping = getOverlappingFloorItems(gx, gy);
          if (
            overlapping.length > 0 &&
            overlapping.every((o) => {
              const c = getCatalogItem(o.catalogId);
              return c?.category === 'DANCE_TILE' || c?.category === item.category;
            })
          ) {
            chosenX = gx;
            chosenY = gy;
            replacedUids = overlapping.map((o) => o.uid);
            break;
          }
        }
        if (chosenX !== -1) break;
      }
    }

    if (chosenX === -1 || chosenY === -1) {
      soundEngine.playError();
      floatingTextsRef.current.push({
        id: `full_${performance.now()}`,
        text: 'NO OPEN TILE ON THIS FLOOR!',
        floor: activeFloor,
        gridX: reqX,
        gridY: reqY,
        color: '#fbbf24',
        age: 0,
      });
      return false;
    }

    cashRef.current -= item.costCash;
    setCash((c) => c - item.costCash);
    const newItem: PlacedItem = {
      uid: `placed_${Date.now()}_${Math.random()}`,
      catalogId: item.id,
      floor: activeFloor,
      gridX: chosenX,
      gridY: chosenY,
      rotation: buildRotation,
    };
    setPlacedItems((prev) => [
      ...prev.filter((p) => !replacedUids.includes(p.uid)),
      newItem,
    ]);
    addXp(35);
    soundEngine.playPlaceItem();
    floatingTextsRef.current.push({
      id: `place_${performance.now()}`,
      text: `+${item.hypeBonus} HYPE / +${item.vibeBonus} VIBE (-$${item.costCash})`,
      floor: activeFloor,
      gridX: chosenX,
      gridY: chosenY,
      color: '#4ade80',
      age: 0,
    });
    return true;
  };

  const handleGridClick = (coord: { x: number; y: number }) => {
    if (relocatingStaffUid) {
      setStaffMembers((prev) =>
        prev.map((s) => {
          if (s.uid !== relocatingStaffUid) return s;
          const startX = s.floor === activeFloor ? s.gridX : STAIRS_COORD.x;
          const startY = s.floor === activeFloor ? s.gridY : STAIRS_COORD.y + 1;
          const newPath = buildStaffStationPath(
            placedItems,
            activeFloor,
            startX,
            startY,
            coord.x,
            coord.y
          );
          return {
            ...s,
            floor: activeFloor,
            gridX: startX,
            gridY: startY,
            postGridX: coord.x,
            postGridY: coord.y,
            path: newPath,
            actionBubble: '🚶',
            bubbleTimer: 2.8,
          };
        })
      );
      soundEngine.playPlaceItem();
      floatingTextsRef.current.push({
        id: `reloc_${performance.now()}`,
        text: `WALKING TO POST (${coord.x}, ${coord.y})`,
        floor: activeFloor,
        gridX: coord.x,
        gridY: coord.y,
        color: '#38bdf8',
        age: 0,
      });
      setRelocatingStaffUid(null);
      return;
    }

    if (placementModeStaff) {
      const success = spawnStaffMemberAtGrid(placementModeStaff, activeFloor, coord.x, coord.y);
      if (success) {
        setPlacementModeStaff(null);
      }
      return;
    }

    if (isRemoveMode) {
      const target = placedItems.find((p) => {
        if (p.floor !== activeFloor) return false;
        const cat = getCatalogItem(p.catalogId);
        if (!cat) return false;
        const w = p.rotation === 90 || p.rotation === 270 ? cat.depth : cat.width;
        const d = p.rotation === 90 || p.rotation === 270 ? cat.width : cat.depth;
        return (
          coord.x >= p.gridX &&
          coord.x < p.gridX + w &&
          coord.y >= p.gridY &&
          coord.y < p.gridY + d
        );
      });
      if (target) {
        const cat = getCatalogItem(target.catalogId);
        const refund = cat ? Math.floor(cat.costCash * 0.5) : 50;
        setPlacedItems((prev) => prev.filter((i) => i.uid !== target.uid));
        cashRef.current += refund;
        setCash((c) => c + refund);
        soundEngine.playCashRegister();
        floatingTextsRef.current.push({
          id: `refund_${performance.now()}`,
          text: `+$${refund} REFUND`,
          floor: activeFloor,
          gridX: coord.x,
          gridY: coord.y,
          color: '#fbbf24',
          age: 0,
        });
      }
      return;
    }

    if (activeDockTab === 'DECORATE' && selectedCatalogItem) {
      purchaseAndPlaceCatalogItem(selectedCatalogItem, coord);
    }
  };

  const handleFloor2Action = () => {
    if (unlockedFloors === 1) {
      if (cash >= 2500) {
        setCash((c) => c - 2500);
        setUnlockedFloors(2);
        setActiveFloor(2);
        setPlacedItems((prev) => [
          ...prev,
          { uid: `f2_bar_${Date.now()}`, catalogId: 'bar_neon', floor: 2, gridX: 1, gridY: 0, rotation: 0 },
          { uid: `f2_dj_${Date.now()}`, catalogId: 'dj_turntable', floor: 2, gridX: 5, gridY: 0, rotation: 0 },
          { uid: `f2_df_${Date.now()}`, catalogId: 'dance_supernova', floor: 2, gridX: 4, gridY: 4, rotation: 0 },
          { uid: `f2_seat_${Date.now()}`, catalogId: 'seat_velvet_booth', floor: 2, gridX: 8, gridY: 3, rotation: 0 },
        ]);
        addXp(250);
        soundEngine.playUpgradeFanfare();
      } else {
        soundEngine.playError();
        floatingTextsRef.current.push({
          id: `f2_need_${performance.now()}`,
          text: 'FLOOR 2 COSTS $2,500!',
          floor: activeFloor,
          gridX: 4,
          gridY: 1,
          color: '#f43f5e',
          age: 0,
        });
      }
    } else if (unlockedFloors === 2 && activeFloor === 2 && cash >= 6000) {
      setCash((c) => c - 6000);
      setUnlockedFloors(3);
      setActiveFloor(3);
      setPlacedItems((prev) => [
        ...prev,
        { uid: `f3_bar_${Date.now()}`, catalogId: 'bar_cyber_island', floor: 3, gridX: 1, gridY: 0, rotation: 0 },
        { uid: `f3_dj_${Date.now()}`, catalogId: 'dj_laser_stage', floor: 3, gridX: 5, gridY: 0, rotation: 0 },
        { uid: `f3_df_${Date.now()}`, catalogId: 'dance_supernova', floor: 3, gridX: 3, gridY: 3, rotation: 0 },
        { uid: `f3_seat_${Date.now()}`, catalogId: 'seat_champagne_pod', floor: 3, gridX: 7, gridY: 6, rotation: 0 },
      ]);
      addXp(450);
      soundEngine.playUpgradeFanfare();
    } else {
      setActiveFloor((f) => ((f % unlockedFloors) + 1) as FloorLevel);
      soundEngine.playClick();
    }
  };

  const handleLoadPreset = (preset: 'DIVE_BAR_LVL1' | 'NEON_CORNER' | 'VIP_MEGA') => {
    setPlacementModeStaff(null);
    setRelocatingStaffUid(null);
    if (preset === 'DIVE_BAR_LVL1') {
      setClubName('LVL 1 DIVE BAR');
      setLevel(1);
      setXp(20);
      setCash(1250);
      setGems(10);
      setUnlockedFloors(1);
      setActiveFloor(1);
      setPlacedItems(LEVEL_1_DIVE_BAR_ITEMS);
      setStaffMembers([INITIAL_STAFF_MEMBERS[0]].map((s) => ({ ...s, path: [] })));
      setActiveDrinkId('drink_draft_beer');
      setDrinkPrepRemainingSec(2);
      setDrinkServingsRemaining(24);
      setParkingState({ lotTier: 1, bouncerCount: 1, ropeTier: 1 });
      guestsRef.current = INITIAL_GUESTS.slice(0, 6).map((g) => ({ ...g }));
      soundEngine.playClick();
    } else if (preset === 'NEON_CORNER') {
      setClubName('CLUB NEON');
      setLevel(12);
      setXp(1140);
      setCash(14850);
      setGems(24);
      setUnlockedFloors(1);
      setActiveFloor(1);
      setPlacedItems(INITIAL_PLACED_ITEMS);
      setStaffMembers(INITIAL_STAFF_MEMBERS.map((s) => ({ ...s, path: [] })));
      setActiveDrinkId('drink_electric_mule');
      setDrinkPrepRemainingSec(3);
      setDrinkServingsRemaining(48);
      setParkingState({ lotTier: 2, bouncerCount: 2, ropeTier: 2 });
      guestsRef.current = INITIAL_GUESTS.map((g) => ({ ...g }));
      soundEngine.playClick();
    } else {
      setClubName('NEON SKY VIP');
      setLevel(24);
      setXp(2150);
      setCash(28450);
      setGems(65);
      setUnlockedFloors(3);
      setActiveFloor(1);
      setPlacedItems(VIP_HOTSPOT_ITEMS);
      setActiveDrinkId('drink_supernova_gold');
      setDrinkPrepRemainingSec(5);
      setDrinkServingsRemaining(96);
      setParkingState({ lotTier: 3, bouncerCount: 4, ropeTier: 3 });
      soundEngine.playUpgradeFanfare();
    }
  };

  const filteredCatalog = useMemo(() => {
    if (buildCategory === 'ALL') return CATALOG_ITEMS;
    return CATALOG_ITEMS.filter((i) => i.category === buildCategory);
  }, [buildCategory]);

  const unclaimedQuestCount = quests.filter((q) => q.currentValue >= q.targetValue && !q.claimed).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0816] select-none font-sans">
      {/* 1. 60FPS HAND-ILLUSTRATED 2.5D ISOMETRIC NIGHTCLUB CITY: NEON CANVAS */}
      <IsometricClubCanvas
        isPlaying={true}
        activeFloor={activeFloor}
        unlockedFloors={unlockedFloors}
        playerLevel={level}
        placedItems={placedItems}
        staffMembers={staffMembers}
        guestsRef={guestsRef}
        floatingTextsRef={floatingTextsRef}
        buildModeItem={
          activeDockTab === 'DECORATE' && !isRemoveMode && !placementModeStaff && !relocatingStaffUid
            ? selectedCatalogItem
            : null
        }
        placementModeStaff={placementModeStaff}
        relocatingStaffUid={relocatingStaffUid}
        buildRotation={buildRotation}
        activeDrink={activeDrink}
        parkingState={parkingState}
        clubMetrics={clubMetrics}
        clubBpm={selectedBpm}
        isRemoveMode={isRemoveMode}
        cameraZoom={cameraZoom}
        cameraResetTick={cameraResetTick}
        dayNightOverrideHour={dayNightOverrideHour}
        onCycleTimeReport={setDayNightReport}
        onEarnRevenue={handleEarnRevenue}
        onQueueCountChange={setQueueCount}
        onClickGrid={handleGridClick}
        onClickBuyFloor2={handleFloor2Action}
      />

      {/* 1B. 60FPS SVG PARTICLE "HYPE BLAST" OVERLAY */}
      <HypeBlastOverlay blastEvent={hypeBlastEvent} />

      {/* =====================================================================
          NIGHTCLUB CITY: NEON HUD ARCHITECTURE (EXACT SECTION 4 SPEC)
         ===================================================================== */}
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
        {/* -------------------------------------------------------------------
            TOP ROW: TOP-LEFT (LEVEL + XP + AVATAR + GENRE/BASS/DEDICATE + ENERGY + NOW PLAYING)
                     TOP-CENTER (COMPACT DARK STATUS PILL: CLUB NAME, OPEN DOT, CASH, RATING)
                     TOP-RIGHT (CROWD/GEMS/STARS PILLS + THROW A PARTY + HAPPY HOUR RUSH)
           ------------------------------------------------------------------- */}
        <div className="flex items-start justify-between gap-2">
          {/* ==================== TOP-LEFT HUD CLUSTER ==================== */}
          <div className="flex flex-col gap-2 pointer-events-auto max-w-[270px] sm:max-w-[330px]">
            {/* Row 1: Purple Square Level Badge + Cyan XP Bar + Energy Lightning Bar (7/12) */}
            <div className="flex items-center gap-2">
              {/* Purple Square Level Badge */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-[#a855f7] via-[#7e22ce] to-[#4c1d95] border-[2.5px] border-[#111116] shadow-[0_3px_0_#111116,0_0_12px_rgba(168,85,247,0.45)] flex flex-col items-center justify-center shrink-0">
                <span className="text-[8px] font-black uppercase tracking-wider text-purple-200 leading-none">
                  LEVEL
                </span>
                <span className="text-lg sm:text-xl font-black text-white leading-none mt-0.5 drop-shadow-[0_1.5px_0_#111116]">
                  {level}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[165px]">
                {/* Cyan XP Bar */}
                <div className="relative h-5 bg-[#120d24]/95 border-2 border-[#111116] rounded-lg overflow-hidden shadow-[0_2px_0_#111116]">
                  <div
                    className="h-full bg-gradient-to-r from-[#06b6d4] via-[#22d3ee] to-[#67e8f9] transition-all duration-300"
                    style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-black text-white drop-shadow-[0_1px_1px_#111116]">
                    <span>XP</span>
                    <span className="font-mono">
                      {xp}/{xpToNextLevel}
                    </span>
                  </div>
                </div>

                {/* Energy Lightning Bar (7/12) */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setEnergy(maxEnergy);
                  }}
                  title="Tap to Refill DJ Energy (12/12)"
                  className="relative h-5 bg-[#120d24]/95 border-2 border-[#111116] rounded-lg overflow-hidden shadow-[0_2px_0_#111116] flex items-center cursor-pointer group"
                >
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-lime-300 transition-all duration-300"
                    style={{ width: `${(energy / maxEnergy) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-black text-white drop-shadow-[0_1px_1px_#111116]">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                      <span>ENERGY</span>
                    </span>
                    <span className="font-mono">
                      {energy}/{maxEnergy}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Row 2: Character Avatar + Circular Purple Buttons (GENRE, BASS, DEDICATE with yellow bolt badges) */}
            <div className="flex items-center gap-2">
              {/* Chibi Character Avatar Box */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveDockTab((t) => (t === 'DRESSING' ? null : 'DRESSING'));
                }}
                title="Customize DJ Avatar Streetwear"
                className="relative w-13 h-13 rounded-2xl bg-gradient-to-b from-[#2e1a5e] to-[#160c30] border-[2.5px] border-[#111116] shadow-[0_3px_0_#111116] flex items-center justify-center shrink-0 cursor-pointer hover:border-purple-400 transition-colors"
              >
                <svg viewBox="0 0 44 44" className="w-11 h-11">
                  {/* Hoodie Torso */}
                  <path
                    d="M11,40 C11,30 33,30 33,40 Z"
                    fill={currentAvatar.top}
                    stroke="#111116"
                    strokeWidth="2.5"
                  />
                  {/* Big Chibi Rounded Head */}
                  <circle
                    cx="22"
                    cy="21"
                    r="11"
                    fill="#f3c69f"
                    stroke="#111116"
                    strokeWidth="2.5"
                  />
                  {/* Stylish Hair / Cap */}
                  <path
                    d="M11,19 C11,8 33,8 33,19 Z"
                    fill={currentAvatar.hair}
                    stroke="#111116"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx="30"
                    cy="11"
                    r="3.5"
                    fill={currentAvatar.cap}
                    stroke="#111116"
                    strokeWidth="2"
                  />
                  {/* Crisp Dot Eyes */}
                  <circle cx="18" cy="22" r="1.9" fill="#111116" />
                  <circle cx="26" cy="22" r="1.9" fill="#111116" />
                </svg>
                <span className="absolute -bottom-1 -right-1 px-1 rounded bg-purple-600 border border-[#111116] text-[8px] font-black text-white">
                  DJ
                </span>
              </button>

              {/* 3 Circular Purple Buttons: GENRE, BASS, DEDICATE with yellow bolt badges */}
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'GENRE', label: 'GENRE', icon: '♫', cost: 1 },
                    { id: 'BASS', label: 'BASS', icon: '◎', cost: 2 },
                    { id: 'DEDICATE', label: 'DEDICATE', icon: '♥', cost: 2 },
                  ] as const
                ).map((btn) => {
                  const isActive = activeTopLeftModal === btn.id;
                  return (
                    <button
                      key={btn.id}
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTopLeftModal((m) => (m === btn.id ? null : btn.id));
                      }}
                      className={`relative flex flex-col items-center group cursor-pointer`}
                    >
                      {/* Yellow Lightning Bolt Badge */}
                      <span className="absolute -top-1 -right-1 z-10 px-1 py-0.2 rounded-full bg-[#facc15] border-[1.8px] border-[#111116] text-[#111116] text-[8px] font-black flex items-center gap-0.5 shadow">
                        <span>⚡</span>
                        <span>{btn.cost}</span>
                      </span>

                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#a855f7] via-[#7e22ce] to-[#4c1d95] border-[2.5px] ${
                          isActive ? 'border-cyan-300 ring-2 ring-cyan-400/50' : 'border-[#111116]'
                        } shadow-[0_3px_0_#111116] flex items-center justify-center text-white font-black text-sm group-hover:scale-105 active:translate-y-0.5 transition-all`}
                      >
                        {btn.icon}
                      </div>
                      <span className="text-[9px] font-black tracking-wider text-purple-100 mt-0.5 drop-shadow-[0_1.5px_0_#111116]">
                        {btn.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Dark Translucent "Now Playing" Music Card (CHANGE, LIKE, Pause Buttons) */}
            <div className="p-2.5 rounded-2xl bg-[#130d24]/90 backdrop-blur-md border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116] flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 border-2 border-[#111116] flex items-center justify-center shrink-0 text-xs font-black text-white ${
                      !isMusicPaused ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '6s' }}
                  >
                    ♫
                  </div>
                  <div className="truncate">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-300 leading-none">
                      NOW PLAYING · {selectedBpm} BPM
                    </div>
                    <div className="text-xs font-black text-white truncate mt-0.5">
                      {currentTrack.title}
                    </div>
                  </div>
                </div>

                {/* Pause / Play Button */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setIsMusicPaused((p) => !p);
                  }}
                  title={isMusicPaused ? 'Resume Track' : 'Pause Track'}
                  className="w-7 h-7 rounded-lg bg-[#251842] hover:bg-[#36225e] border-2 border-[#111116] text-cyan-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {isMusicPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-purple-500/20">
                <span className="text-[10px] font-mono text-purple-300 truncate">
                  {currentTrack.genre} ({currentTrack.bonus})
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      const nextIdx = (trackIndex + 1) % PLAYLIST_TRACKS.length;
                      setTrackIndex(nextIdx);
                      setSelectedBpm(PLAYLIST_TRACKS[nextIdx].bpm);
                    }}
                    className="px-2 py-0.5 rounded-md bg-purple-700 hover:bg-purple-600 border border-[#111116] text-[9px] font-black uppercase text-white cursor-pointer"
                  >
                    CHANGE
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsTrackLiked((l) => !l);
                      addXp(15);
                    }}
                    className={`px-2 py-0.5 rounded-md border border-[#111116] text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer ${
                      isTrackLiked
                        ? 'bg-pink-600 text-white'
                        : 'bg-[#23173d] text-purple-200 hover:bg-purple-800'
                    }`}
                  >
                    <Heart className={`w-2.5 h-2.5 ${isTrackLiked ? 'fill-white' : ''}`} />
                    <span>LIKE</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TOP-LEFT ACTION MODAL (GENRE / BASS / DEDICATE) */}
            {activeTopLeftModal && (
              <div className="p-3 rounded-2xl bg-[#160f2b]/96 border-[2.5px] border-purple-400 shadow-2xl text-white space-y-2">
                <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    {activeTopLeftModal === 'GENRE' && 'Switch Club Music Genre (⚡1)'}
                    {activeTopLeftModal === 'BASS' && 'Bass Cannon & Tempo Boost (⚡2)'}
                    {activeTopLeftModal === 'DEDICATE' && 'Dedicate Song to Crowd (⚡2)'}
                  </span>
                  <button
                    onClick={() => setActiveTopLeftModal(null)}
                    className="w-5 h-5 rounded bg-purple-900/80 flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activeTopLeftModal === 'GENRE' && (
                  <div className="space-y-1.5">
                    {PLAYLIST_TRACKS.map((tr, idx) => (
                      <button
                        key={tr.title}
                        onClick={() => {
                          setTrackIndex(idx);
                          setSelectedBpm(tr.bpm);
                          setEnergy((e) => Math.max(0, e - 1));
                          addXp(25);
                          soundEngine.playClick();
                        }}
                        className={`w-full p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                          trackIndex === idx
                            ? 'bg-purple-700/60 border-cyan-300 text-white'
                            : 'bg-purple-950/60 border-purple-700/40 text-purple-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black">{tr.genre} · {tr.title}</div>
                          <div className="text-[10px] text-cyan-300">{tr.bonus}</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold">{tr.bpm} BPM</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeTopLeftModal === 'BASS' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-200">Dance Groove Tempo:</span>
                      <div className="flex items-center gap-1">
                        {[110, 118, 124, 132].map((bpm) => (
                          <button
                            key={bpm}
                            onClick={() => {
                              setSelectedBpm(bpm);
                              soundEngine.setBpm(bpm);
                              soundEngine.playClick();
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-black cursor-pointer ${
                              selectedBpm === bpm
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-purple-900 text-purple-200'
                            }`}
                          >
                            {bpm}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEnergy((e) => (e >= 2 ? e - 2 : maxEnergy));
                        setCash((c) => c + 320);
                        addXp(55);
                        soundEngine.playUpgradeFanfare();
                        triggerHypeBlast(45, clubMetrics.totalHype + 45, clubMetrics.tipBonus);
                        setActiveTopLeftModal(null);
                      }}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Drop Sub-Bass Shockwave (+$320 Tips)
                    </button>
                  </div>
                )}

                {activeTopLeftModal === 'DEDICATE' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-purple-200">
                      Dedicate the next track to Mia H. &amp; VIP dancers on the floor for an instant crowd love surge!
                    </p>
                    <button
                      onClick={() => {
                        setEnergy((e) => (e >= 2 ? e - 2 : maxEnergy));
                        setCash((c) => c + 280);
                        addXp(65);
                        soundEngine.playUpgradeFanfare();
                        floatingTextsRef.current.push({
                          id: `ded_${performance.now()}`,
                          text: 'SONG DEDICATED TO MIA H.! +$280 ❤️',
                          floor: activeFloor,
                          gridX: 4.3,
                          gridY: 4.8,
                          color: '#f472b6',
                          age: 0,
                        });
                        setActiveTopLeftModal(null);
                      }}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Send Dedication Shoutout (+$280 &amp; +65 XP)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==================== TOP-CENTER HUD PILL ==================== */}
          {/* Compact dark status pill showing club name, green OPEN dot, cash, and rating counters */}
          <div className="pointer-events-auto hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-[#130d24]/92 backdrop-blur-md border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116,0_0_18px_rgba(168,85,247,0.3)]">
            {/* Club Name & Green OPEN Dot */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setIsClubOpenStatus((prev) => !prev);
              }}
              title="Click to toggle OPEN / VIP PRIVATE status"
              className="flex items-center gap-2 pr-3 border-r border-purple-500/30 cursor-pointer"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isClubOpenStatus
                    ? 'bg-emerald-400 shadow-[0_0_8px_#4ade80]'
                    : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                }`}
              />
              <span className="text-xs sm:text-sm font-black tracking-wider text-white">
                {clubName}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                  isClubOpenStatus
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                }`}
              >
                {isClubOpenStatus ? 'OPEN' : 'VIP'}
              </span>
            </button>

            {/* Cash Counter */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-purple-500/30">
              <div className="w-5 h-5 rounded-full bg-emerald-400 border border-[#111116] flex items-center justify-center text-[11px] font-black text-slate-950">
                $
              </div>
              <span className="text-sm font-black text-emerald-300 tabular-nums">
                ${cash.toLocaleString()}
              </span>
            </div>

            {/* Rating Counter */}
            <div className="flex items-center gap-1 pr-3 border-r border-purple-500/30">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-black text-yellow-300 tabular-nums">
                {starRating}
              </span>
            </div>

            {/* Active Drink Prep Timer & Servings Pill + Quick Starter Mode Switch */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveDockTab('TONIGHT');
              }}
              title="Active Drink Mix Prep Timer & Servings Remaining"
              className="flex items-center gap-1.5 pr-3 border-r border-purple-500/30 text-left cursor-pointer"
            >
              <span className="text-xs">🍸</span>
              <div className="leading-none">
                <div className="text-[9px] font-black text-cyan-300 uppercase">
                  {activeDrink.name}
                </div>
                <div className="text-[10px] font-mono text-purple-200 mt-0.5">
                  Prep {drinkPrepRemainingSec}s · {drinkServingsRemaining} srv
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                handleLoadPreset(level === 1 ? 'NEON_CORNER' : 'DIVE_BAR_LVL1')
              }
              title="Toggle between Level 1 Dive Bar Starter & Level 12 Club Neon Showcase"
              className="px-2.5 py-1 rounded-full bg-purple-700 hover:bg-purple-600 border border-[#0D0D14] text-[10px] font-black uppercase text-white cursor-pointer"
            >
              {level === 1 ? '★ Load Club Neon' : '↺ Start Lvl 1 Dive Bar'}
            </button>
          </div>

          {/* ==================== TOP-RIGHT HUD CLUSTER ==================== */}
          {/* Dark stat pills (Crowd, Gems, Stars), bright magenta THROW A PARTY button, Happy Hour Rush event tracker */}
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {/* Dark Stat Pills Row (Crowd, Cash on mobile, Gems, Stars) */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {/* Mobile Cash Pill */}
              <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#130d24]/92 border-2 border-[#111116] shadow-[0_3px_0_#111116]">
                <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  $
                </span>
                <span className="text-xs font-black text-emerald-300 tabular-nums">
                  ${cash.toLocaleString()}
                </span>
              </div>

              {/* Crowd Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#130d24]/92 border-2 border-[#111116] shadow-[0_3px_0_#111116]">
                <span className="text-[10px] font-black uppercase text-cyan-300">CROWD</span>
                <span className="text-xs sm:text-sm font-black text-white tabular-nums">
                  {guestsRef.current.length}/{clubMetrics.maxGuests}
                </span>
              </div>

              {/* Gems Pill */}
              <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#130d24]/92 border-2 border-[#111116] shadow-[0_3px_0_#111116]">
                <span className="text-xs">💎</span>
                <span className="text-xs sm:text-sm font-black text-fuchsia-300 tabular-nums">
                  {gems}
                </span>
                <button
                  onClick={() => {
                    setGems((g) => g + 5);
                    soundEngine.playCashRegister();
                  }}
                  title="Add +5 Gems"
                  className="w-5 h-5 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 border border-[#111116] text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>

              {/* Stars Pill */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#130d24]/92 border-2 border-[#111116] shadow-[0_3px_0_#111116]">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-black text-yellow-300 tabular-nums">
                  {starRating}
                </span>
              </div>
            </div>

            {/* Bright Magenta THROW A PARTY Button */}
            <button
              onClick={handleThrowParty}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#ec4899] via-[#d946ef] to-[#a855f7] hover:from-[#f472b6] hover:to-[#c084fc] border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116,0_0_20px_rgba(236,72,153,0.6)] text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 cursor-pointer active:translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span>THROW A PARTY</span>
            </button>

            {/* Happy Hour Rush Event Tracker */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveDockTab((t) => (t === 'PARTIES' ? null : 'PARTIES'));
              }}
              className="px-3 py-1.5 rounded-2xl bg-[#130d24]/92 border-2 border-[#111116] shadow-[0_3px_0_#111116] flex items-center gap-2.5 cursor-pointer hover:border-pink-400/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 border border-[#111116] flex items-center justify-center text-sm">
                🍹
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-pink-300 leading-none">
                  Happy Hour Rush
                </div>
                <div className="text-[11px] font-mono font-bold text-white mt-0.5">
                  2x Bar Tips · <span className="text-cyan-300">{formattedHappyHour}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            MIDDLE ZONE: ACTIVE DRAWER / MODAL + FAR-RIGHT VERTICAL VIBE THERMOMETER & ZOOM
           ------------------------------------------------------------------- */}
        <div className="flex-1 flex items-center justify-between relative my-1">
          {/* ACTIVE PLACEMENT / RELOCATION BANNER */}
          {(placementModeStaff || relocatingStaffUid) && (
            <div className="mx-auto mt-auto mb-3 pointer-events-auto w-[320px] sm:w-[460px] bg-[#160d2e]/95 border-2 border-cyan-300 rounded-2xl px-4 py-2.5 shadow-2xl text-white flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  {placementModeStaff
                    ? `Hiring ${placementModeStaff.name} ($${placementModeStaff.hireCostCash})`
                    : 'Relocating Staff Station'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  Tap any isometric tile on Floor {activeFloor} to station staff!
                </div>
              </div>
              <button
                onClick={() => {
                  setPlacementModeStaff(null);
                  setRelocatingStaffUid(null);
                  soundEngine.playClick();
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          {/* DOCK TAB POPUP DRAWER (TONIGHT / DRESSING / STAFF / DECORATE / CELEBS / PARTIES / TROPHIES / SETTINGS) */}
          {activeDockTab && (
            <div className="mx-auto mt-auto mb-2 pointer-events-auto w-[340px] sm:w-[600px] bg-[#140d26]/96 backdrop-blur-md border-[2.5px] border-[#111116] ring-2 ring-purple-500/50 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] text-white">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-500/30">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 border border-[#111116] text-[10px] font-black uppercase tracking-wider">
                    {activeDockTab}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {activeDockTab === 'DECORATE' && `Decorate & Build Catalog (Floor ${activeFloor})`}
                    {activeDockTab === 'STAFF' && `Club Staff & Security Roster (${staffMembers.length} Active)`}
                    {activeDockTab === 'TONIGHT' && `Tonight's Drink Mixes & Bar Menu`}
                    {activeDockTab === 'DRESSING' && `Chibi Streetwear & DJ Style`}
                    {activeDockTab === 'CELEBS' && `VIP Celebrities & Entourage`}
                    {activeDockTab === 'PARTIES' && `Throw a Party & Happy Hour Rush`}
                    {activeDockTab === 'TROPHIES' && `Club Trophies & Progression Quests`}
                    {activeDockTab === 'SETTINGS' && `Club Settings, Tempo & Floor Expansion`}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDockTab(null)}
                  className="w-7 h-7 rounded-lg bg-purple-900/80 border border-[#111116] flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. DECORATE TAB (Furniture & Equipment Placement) */}
              {activeDockTab === 'DECORATE' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {(
                        [
                          { id: 'ALL', label: 'All Gear' },
                          { id: 'DANCE_TILE', label: 'Dance Tiles' },
                          { id: 'DJ_BOOTH', label: 'DJ & Speakers' },
                          { id: 'BAR_UNIT', label: 'Bars & Shelves' },
                          { id: 'SEATING', label: 'VIP & Tables' },
                          { id: 'LIGHTING', label: 'Lasers & Orbs' },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setBuildCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer border border-[#111116] ${
                            buildCategory === cat.id
                              ? 'bg-cyan-400 text-slate-950'
                              : 'bg-purple-950/80 text-purple-200 hover:bg-purple-900'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setBuildRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
                          soundEngine.playClick();
                        }}
                        className="px-2 py-1 rounded-lg bg-purple-900 border border-[#111116] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>{buildRotation}°</span>
                      </button>
                      <button
                        onClick={() => setIsRemoveMode((p) => !p)}
                        className={`px-2 py-1 rounded-lg border border-[#111116] text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          isRemoveMode ? 'bg-rose-600 text-white' : 'bg-purple-900 text-rose-300'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isRemoveMode ? 'Selling' : 'Sell'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                    {filteredCatalog.map((item) => {
                      const isSelected = selectedCatalogItem?.id === item.id && !isRemoveMode;
                      const canAfford = cash >= item.costCash;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsRemoveMode(false);
                            setSelectedCatalogItem(item);
                            soundEngine.playClick();
                          }}
                          className={`w-38 shrink-0 p-2.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-900/90 border-cyan-300'
                              : 'bg-[#1d1436]/90 border-[#111116] hover:border-purple-500'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-cyan-300">
                              T{item.tier} · {item.width}x{item.depth}
                            </span>
                            <span className="text-amber-300">+{item.hypeBonus}⚡</span>
                          </div>
                          <div className="text-xs font-black truncate mt-0.5 text-white">
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-purple-500/30 text-xs font-mono font-bold">
                            <span className={canAfford ? 'text-emerald-300' : 'text-rose-400'}>
                              ${item.costCash}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRemoveMode(false);
                                setSelectedCatalogItem(item);
                                purchaseAndPlaceCatalogItem(item);
                              }}
                              className={`px-2 py-0.5 rounded border border-[#0D0D14] text-[10px] font-black cursor-pointer ${
                                canAfford
                                  ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              Buy+Place
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Multi-Floor Vertical Expansion & Exterior Parking / Velvet Rope Queue Upgrades */}
                  <div className="mt-2.5 pt-2 border-t border-purple-500/30 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={handleFloor2Action}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-cyan-400 text-left flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-cyan-300 uppercase font-bold">
                          Vertical Expansion ({unlockedFloors}/3 Floors)
                        </div>
                        <div className="text-xs font-black text-white">
                          {unlockedFloors === 1
                            ? 'Unlock Floor 2 ($2,500)'
                            : unlockedFloors === 2
                            ? 'Unlock Floor 3 ($6,000)'
                            : `Switch Floor (Now F${activeFloor})`}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px]">
                        F{activeFloor}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const cost = parkingState.lotTier * 650;
                        if (parkingState.lotTier >= 3 || cash < cost) {
                          soundEngine.playError();
                          return;
                        }
                        setCash((c) => c - cost);
                        setParkingState((p) => ({
                          ...p,
                          lotTier: Math.min(3, p.lotTier + 1) as 1 | 2 | 3,
                        }));
                        addXp(80);
                        soundEngine.playUpgradeFanfare();
                      }}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-amber-400 text-left flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                          Street Parking Lot (Tier {parkingState.lotTier}/3)
                        </div>
                        <div className="text-xs font-black text-white">
                          {parkingState.lotTier < 3
                            ? `Expand Taxi & Car Stalls ($${parkingState.lotTier * 650})`
                            : 'Max Street Capacity'}
                        </div>
                      </div>
                      <span className="text-sm">🚕</span>
                    </button>

                    <button
                      onClick={() => {
                        const cost = parkingState.ropeTier * 500;
                        if (parkingState.ropeTier >= 3 || cash < cost) {
                          soundEngine.playError();
                          return;
                        }
                        setCash((c) => c - cost);
                        setParkingState((p) => ({
                          ...p,
                          ropeTier: Math.min(3, p.ropeTier + 1) as 1 | 2 | 3,
                        }));
                        addXp(75);
                        soundEngine.playUpgradeFanfare();
                      }}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-pink-400 text-left flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-pink-300 uppercase font-bold">
                          Red Carpet & Stanchions (T{parkingState.ropeTier}/3)
                        </div>
                        <div className="text-xs font-black text-white">
                          {parkingState.ropeTier < 3
                            ? `Upgrade Gold Ropes ($${parkingState.ropeTier * 500})`
                            : 'VIP Velvet Queue Maxed'}
                        </div>
                      </div>
                      <span className="text-sm">🎟️</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. STAFF TAB (Bartenders, Bouncers, Waiters) */}
              {activeDockTab === 'STAFF' && (
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-2.5">
                    {STAFF_CATALOG.map((staffCat) => {
                      const canAfford = cash >= staffCat.hireCostCash;
                      const roleCount = staffMembers.filter((s) => s.role === staffCat.role).length;
                      return (
                        <div
                          key={staffCat.id}
                          className="p-2.5 rounded-xl bg-[#1d1436] border-2 border-[#111116] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span
                                className="px-1.5 py-0.2 rounded font-black text-slate-950"
                                style={{ backgroundColor: staffCat.accentColor }}
                              >
                                {staffCat.role}
                              </span>
                              <span className="text-amber-300">+{staffCat.hypeBonus}⚡</span>
                            </div>
                            <div className="text-xs font-black mt-1 text-white truncate">
                              {staffCat.name}
                            </div>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-purple-700/40 flex flex-col gap-1">
                            <button
                              onClick={() => {
                                if (!canAfford) {
                                  soundEngine.playError();
                                  return;
                                }
                                setPlacementModeStaff(staffCat);
                                setRelocatingStaffUid(null);
                                setActiveDockTab(null);
                                soundEngine.playClick();
                              }}
                              className={`w-full py-1 rounded-lg border border-[#111116] font-black text-[10px] cursor-pointer ${
                                canAfford
                                  ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                                  : 'bg-purple-900/60 text-rose-300'
                              }`}
                            >
                              Place on Grid (${staffCat.hireCostCash})
                            </button>
                            <button
                              onClick={() => {
                                const defaultCoord =
                                  staffCat.role === 'BARTENDER'
                                    ? { x: 6, y: Math.min(7, 2 + roleCount * 2) }
                                    : staffCat.role === 'BOUNCER'
                                    ? { x: Math.min(3, 1 + roleCount), y: 9 }
                                    : { x: 4, y: Math.min(8, 6 + roleCount) };
                                spawnStaffMemberAtGrid(
                                  staffCat,
                                  activeFloor,
                                  defaultCoord.x,
                                  defaultCoord.y
                                );
                              }}
                              className="w-full py-0.5 rounded bg-purple-900 hover:bg-purple-800 text-[10px] font-bold text-cyan-200 cursor-pointer"
                            >
                              Auto-Station
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {staffMembers.map((member) => (
                      <div
                        key={member.uid}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1d1436] border border-purple-500/35 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <div className="text-xs font-black text-white truncate">
                            {member.name}
                          </div>
                          <div className="text-[10px] font-mono text-cyan-300">
                            Floor {member.floor} · Tile ({member.postGridX},{member.postGridY})
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setActiveFloor(member.floor);
                              setRelocatingStaffUid(member.uid);
                              setPlacementModeStaff(null);
                              setActiveDockTab(null);
                              soundEngine.playClick();
                            }}
                            className="px-2 py-1 rounded-lg bg-cyan-500/25 border border-cyan-400/60 text-cyan-200 text-[10px] font-black cursor-pointer"
                          >
                            Move Post
                          </button>
                          <button
                            onClick={() => {
                              setStaffMembers((prev) => prev.filter((s) => s.uid !== member.uid));
                              soundEngine.playClick();
                            }}
                            className="p-1 rounded-lg bg-rose-950 text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. TONIGHT TAB (Drink Mixes with Live Prep Timers & Serving Counts) */}
              {activeDockTab === 'TONIGHT' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                        ACTIVE BAR MIXOLOGY BATCH · {activeDrink.name}
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        Prep Timer: <span className="text-amber-300">{drinkPrepRemainingSec}s</span> / {activeDrink.prepTimeSec}s · Servings Remaining:{' '}
                        <span className="text-emerald-300">{drinkServingsRemaining} Glasses</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDrinkServingsRemaining((s) => s + 30);
                        setCash((c) => c + activeDrink.sellPrice * 4);
                        addXp(35);
                        soundEngine.playCashRegister();
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 border border-[#0D0D14] text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Craft +30 Servings (+${activeDrink.sellPrice * 4})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DRINK_MIXES.map((drink) => {
                      const isCurrent = drink.id === activeDrinkId;
                      return (
                        <button
                          key={drink.id}
                          onClick={() => {
                            setActiveDrinkId(drink.id);
                            setDrinkPrepRemainingSec(Math.max(1, Math.round(drink.prepTimeSec)));
                            setDrinkServingsRemaining(36 + drink.tier * 16);
                            soundEngine.playCashRegister();
                          }}
                          className={`p-2.5 rounded-xl border-2 text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-fuchsia-600/35 border-cyan-300'
                              : 'bg-[#1d1436] border-[#0D0D14] hover:border-purple-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-black" style={{ color: drink.color }}>
                              {drink.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-300">
                              +${drink.sellPrice}/glass
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                            <span className="text-amber-300">
                              +{drink.hypeBoost} Hype · {drink.prepTimeSec}s Prep · {36 + drink.tier * 16} Srv
                            </span>
                            <span className="font-bold text-cyan-300">
                              {isCurrent ? '✓ SERVING' : 'Mix Batch'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. DRESSING TAB (Chibi Streetwear Style Customizer) */}
              {activeDockTab === 'DRESSING' && (
                <div className="grid grid-cols-2 gap-2">
                  {AVATAR_STYLES.map((st, idx) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setSelectedAvatarIdx(idx);
                        addXp(20);
                        soundEngine.playClick();
                      }}
                      className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 cursor-pointer ${
                        selectedAvatarIdx === idx
                          ? 'bg-purple-800/70 border-cyan-300'
                          : 'bg-[#1d1436] border-[#111116]'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-[#111116] shrink-0"
                        style={{ backgroundColor: st.top }}
                      />
                      <div>
                        <div className="text-xs font-black text-white">{st.label}</div>
                        <div className="text-[10px] text-cyan-300">
                          {selectedAvatarIdx === idx ? 'Equipped' : 'Equip Look'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 5. CELEBS TAB */}
              {activeDockTab === 'CELEBS' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CELEBRITY_NAMES.map((cName, idx) => (
                    <div
                      key={cName}
                      className="p-2.5 rounded-xl bg-[#1d1436] border-2 border-[#111116] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-black text-amber-300 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          <span>{cName}</span>
                        </div>
                        <div className="text-[10px] text-purple-200">3.0x VIP Drink Tips</div>
                      </div>
                      <button
                        onClick={() => {
                          if (gems < 2) {
                            soundEngine.playError();
                            return;
                          }
                          setGems((g) => g - 2);
                          setCash((c) => c + 650);
                          addXp(90);
                          soundEngine.playUpgradeFanfare();
                          guestsRef.current.push({
                            id: `celeb_${Date.now()}_${idx}`,
                            name: cName,
                            isCelebrity: true,
                            floor: activeFloor,
                            targetFloor: activeFloor,
                            gridX: 4,
                            gridY: 4,
                            path: [],
                            state: 'DANCER_MOVES',
                            stateTimer: 14,
                            patience: 100,
                            hype: 100,
                            bubble: 'VIP_CROWN',
                            bubbleTimer: 10,
                            shirtColor: '#facc15',
                            hairColor: '#111116',
                            pantsColor: '#311042',
                            cashSpent: 650,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 border border-[#111116] text-slate-950 font-black text-[11px] cursor-pointer"
                      >
                        Invite (2💎)
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. PARTIES TAB */}
              {activeDockTab === 'PARTIES' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-xl bg-[#1d1436] border-2 border-[#111116]">
                  <div>
                    <div className="text-xs font-black text-pink-300 uppercase">
                      Active Event: Happy Hour Rush ({partyCount} Parties Thrown)
                    </div>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Trigger an all-out Neon Laser Party to fill the Vibe Thermometer, shower dancers in confetti, and collect +$550 cover charge!
                    </p>
                  </div>
                  <button
                    onClick={handleThrowParty}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 border-2 border-[#111116] text-white font-black text-xs shrink-0 cursor-pointer"
                  >
                    LAUNCH PARTY (+$550)
                  </button>
                </div>
              )}

              {/* 7. TROPHIES TAB */}
              {activeDockTab === 'TROPHIES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {quests.map((q) => {
                    const isDone = q.currentValue >= q.targetValue;
                    return (
                      <div
                        key={q.id}
                        className="p-2.5 rounded-xl bg-[#1d1436] border-2 border-[#111116] flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-black text-amber-300">🏆 {q.title}</span>
                          <span className="text-[10px] font-mono font-bold text-cyan-300">
                            {q.currentValue}/{q.targetValue}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-mono text-emerald-300">
                            +${q.rewardCash} · +{q.rewardGems}💎
                          </span>
                          {q.claimed ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Claimed
                            </span>
                          ) : (
                            <button
                              disabled={!isDone}
                              onClick={() => {
                                setCash((c) => c + q.rewardCash);
                                setGems((g) => g + q.rewardGems);
                                addXp(q.rewardXp);
                                setQuests((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id ? { ...item, claimed: true } : item
                                  )
                                );
                                soundEngine.playUpgradeFanfare();
                              }}
                              className={`px-2 py-0.5 rounded border border-[#111116] text-[10px] font-black cursor-pointer ${
                                isDone
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-purple-950 text-purple-400 cursor-not-allowed'
                              }`}
                            >
                              {isDone ? 'Claim Trophy' : 'Locked'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 8. SETTINGS TAB (Progression Presets + Custom Transparent PNG Sprites / Assets Uploader) */}
              {activeDockTab === 'SETTINGS' && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleLoadPreset('DIVE_BAR_LVL1')}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-amber-400 text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-mono text-amber-300">STARTER MODE</div>
                      <div className="text-xs font-black text-white mt-0.5">Lvl 1 Dive Bar (3x3)</div>
                    </button>

                    <button
                      onClick={() => handleLoadPreset('NEON_CORNER')}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-cyan-400 text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-mono text-cyan-300">SHOWCASE MODE</div>
                      <div className="text-xs font-black text-white mt-0.5">Nightclub City: Neon</div>
                    </button>

                    <button
                      onClick={() => handleLoadPreset('VIP_MEGA')}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] hover:border-fuchsia-400 text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-mono text-fuchsia-300">3-FLOOR EXPANSION</div>
                      <div className="text-xs font-black text-white mt-0.5">3-Floor Mega Club</div>
                    </button>

                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setDayNightOverrideHour((prev) => (prev === 0.75 ? null : 0.75));
                      }}
                      className="p-2 rounded-xl bg-[#1d1436] border-2 border-[#0D0D14] text-left cursor-pointer"
                    >
                      <div className="text-[10px] font-mono text-pink-300">
                        {dayNightReport.formattedTime} · {queueCount} IN LINE
                      </div>
                      <div className="text-xs font-black text-white mt-0.5 truncate">
                        {dayNightReport.phaseLabel}
                      </div>
                    </button>
                  </div>

                  {/* Sprites / Assets Live Transparent PNG Uploader (AssetManager) */}
                  <div className="p-2.5 rounded-xl bg-[#191130] border-2 border-[#0D0D14]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Sprites / Assets — Live Transparent PNG Uploader</span>
                        </div>
                        <p className="text-[10px] text-purple-200">
                          Swap in custom transparent PNGs anchored at their isometric bottom-center footprint (v{spriteAssetVersion}).
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          assetManager.clearAllSprites();
                          soundEngine.playClick();
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-[#0D0D14] text-[10px] font-black text-rose-200 cursor-pointer"
                      >
                        Reset All to Vector Art
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {SPRITE_ASSET_DEFINITIONS.map((def) => {
                        const hasCustom = assetManager.hasSprite(def.key);
                        return (
                          <div
                            key={def.key}
                            className="px-2.5 py-1.5 rounded-lg bg-[#120b24] border border-purple-500/30 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-white truncate">
                                {def.label}{' '}
                                <span className="font-mono text-[9px] text-cyan-300">({def.key})</span>
                              </div>
                              <div className="text-[9px] text-purple-300 truncate">
                                {hasCustom ? '✓ Custom PNG Active' : def.recommendedSize}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <label className="px-2 py-1 rounded bg-cyan-400 hover:bg-cyan-300 border border-[#0D0D14] text-slate-950 font-black text-[10px] cursor-pointer">
                                Upload PNG
                                <input
                                  type="file"
                                  accept="image/png,image/webp,image/svg+xml"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      void assetManager.uploadFile(def.key as SpriteAssetKey, file);
                                      soundEngine.playPlaceItem();
                                    }
                                  }}
                                />
                              </label>
                              {hasCustom && (
                                <button
                                  onClick={() => {
                                    assetManager.clearSprite(def.key);
                                    soundEngine.playClick();
                                  }}
                                  className="px-1.5 py-1 rounded bg-rose-900 text-white text-[9px] font-bold cursor-pointer"
                                  title="Revert to Vector Fallback"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== FAR-RIGHT EDGE: TALL VERTICAL PURPLE VIBE/HYPE THERMOMETER METER + ZOOM/CAMERA CONTROLS ==================== */}
          <div className="ml-auto flex flex-col items-center gap-2 pointer-events-auto">
            {/* Tall Vertical Purple Vibe/Hype Thermometer with Cocktail Icon at Top */}
            <button
              onClick={() => {
                soundEngine.playUpgradeFanfare();
                setHypeSurgeBonus((prev) => (prev >= 120 ? 45 : 140));
                triggerHypeBlast(40, clubMetrics.totalHype + 40, clubMetrics.tipBonus);
              }}
              title="Vibe/Hype Thermometer (Tap to Surge Club Vibe!)"
              className="flex flex-col items-center p-1.5 rounded-full bg-[#130d24]/92 border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116,0_0_16px_rgba(168,85,247,0.45)] cursor-pointer group"
            >
              {/* Cocktail Icon Circle at Top */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-fuchsia-400 via-purple-600 to-indigo-900 border-2 border-[#111116] flex items-center justify-center shadow mb-1 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 28 28" className="w-5 h-5">
                  <polygon
                    points="6,7 22,7 14,16"
                    fill="#22d3ee"
                    stroke="#111116"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <line x1="14" y1="16" x2="14" y2="23" stroke="#f8fafc" strokeWidth="2.2" />
                  <line x1="9" y1="23" x2="19" y2="23" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="18" cy="6" r="2.2" fill="#f43f5e" />
                </svg>
              </div>

              {/* Vertical Purple Thermometer Tube */}
              <div className="relative w-4 h-32 sm:h-40 rounded-full bg-[#090514] border-2 border-[#111116] overflow-hidden flex flex-col justify-end p-0.5">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-[#7e22ce] via-[#d946ef] to-[#22d3ee] shadow-[0_0_10px_#e879f9] transition-all duration-500"
                  style={{ height: `${vibeThermometerPercent}%` }}
                />
                {/* Graduation tick marks */}
                <div className="absolute inset-x-0 top-1/4 border-t border-white/25" />
                <div className="absolute inset-x-0 top-2/4 border-t border-white/25" />
                <div className="absolute inset-x-0 top-3/4 border-t border-white/25" />
              </div>

              <span className="text-[9px] font-black uppercase tracking-wider text-fuchsia-300 mt-1 px-1">
                VIBE
              </span>
            </button>

            {/* Zoom & Camera Controls Below Thermometer */}
            <div className="flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-[#130d24]/92 border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116]">
              <button
                onClick={() => setCameraZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))}
                className="w-7 h-7 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-white flex items-center justify-center cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setCameraZoom(1.0);
                  setCameraResetTick((t) => t + 1);
                }}
                className="w-7 h-6 rounded bg-[#18102e] text-[9px] font-mono font-black text-cyan-300 cursor-pointer"
                title="Reset Camera Center"
              >
                {Math.round(cameraZoom * 100)}%
              </button>
              <button
                onClick={() => setCameraZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}
                className="w-7 h-7 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-white flex items-center justify-center cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFloor2Action}
                className="w-7 h-7 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/60 text-cyan-300 flex items-center justify-center text-[10px] font-black cursor-pointer"
                title={unlockedFloors === 1 ? 'Unlock Floor 2 ($2,500)' : `Switch Floor (Currently F${activeFloor})`}
              >
                F{activeFloor}
              </button>
              <button
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  soundEngine.isMuted = next;
                }}
                className="w-7 h-7 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-purple-200 flex items-center justify-center cursor-pointer"
                title="Toggle Club Audio"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            BOTTOM DOCK: SLEEK DARK TRANSLUCENT BAR
            - Friend Avatar Carousel (Noel, Zoe, Roxy)
            - Club Star Rating Card
            - 8 Square Icon Tabs (TONIGHT, DRESSING, STAFF, DECORATE, CELEBS, PARTIES, TROPHIES, SETTINGS)
           ------------------------------------------------------------------- */}
        <div className="pointer-events-auto flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl bg-[#110b20]/94 backdrop-blur-md border-[2.5px] border-[#111116] shadow-[0_6px_0_#111116,0_0_24px_rgba(0,0,0,0.8)]">
          {/* Left: Friend Avatar Carousel (Noel, Zoe, etc.) + Club Star Rating Card */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 pr-2 border-r border-purple-500/30">
            {/* Friend Avatar Carousel (Noel, Zoe, Jax) */}
            <div className="flex items-center gap-1.5">
              {[
                { name: 'Noel', lvl: 18, hair: '#f8fafc', top: '#38bdf8', bg: 'from-cyan-500 to-blue-900' },
                { name: 'Zoe', lvl: 22, hair: '#facc15', top: '#ec4899', bg: 'from-pink-500 to-purple-900' },
                { name: 'Roxy', lvl: 15, hair: '#22d3ee', top: '#a855f7', bg: 'from-purple-500 to-indigo-950' },
              ].map((fr) => (
                <button
                  key={fr.name}
                  onClick={() => {
                    soundEngine.playClick();
                    floatingTextsRef.current.push({
                      id: `visit_${performance.now()}`,
                      text: `${fr.name.toUpperCase()} SENT +$150 VIP GIFT!`,
                      floor: activeFloor,
                      gridX: 4,
                      gridY: 4,
                      color: '#38bdf8',
                      age: 0,
                    });
                    setCash((c) => c + 150);
                  }}
                  title={`Collect VIP Gift from ${fr.name} (Lvl ${fr.lvl})`}
                  className="group relative flex flex-col items-center w-12 p-1 rounded-xl bg-[#1c1333] hover:bg-[#2a1c4d] border-2 border-[#111116] cursor-pointer transition-transform active:scale-95"
                >
                  <span className="absolute -top-1.5 -left-1 px-1 rounded bg-amber-400 border border-[#111116] text-[8px] font-black text-slate-950">
                    {fr.lvl}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-b ${fr.bg} border-2 border-[#111116] flex items-center justify-center overflow-hidden`}
                  >
                    <svg viewBox="0 0 36 36" className="w-7 h-7">
                      <circle cx="18" cy="20" r="9.5" fill="#f3c69f" stroke="#111116" strokeWidth="2.2" />
                      <path d="M8,18 C8,8 28,8 28,18 Z" fill={fr.hair} stroke="#111116" strokeWidth="2" />
                      <circle cx="14.5" cy="20" r="1.8" fill="#111116" />
                      <circle cx="21.5" cy="20" r="1.8" fill="#111116" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black text-white truncate max-w-full mt-0.5">
                    {fr.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Club Star Rating Card */}
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#261945] to-[#170e2c] border-2 border-[#111116] flex flex-col items-center justify-center">
              <span className="text-[8px] font-mono uppercase tracking-wider text-purple-300">
                CLUB RATING
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-black text-yellow-300">{starRating}</span>
              </div>
              <span className="text-[8px] font-bold text-cyan-300">
                {(1 + clubMetrics.tipBonus).toFixed(2)}x Tips
              </span>
            </div>
          </div>

          {/* Right: 8 Square Icon Tabs (TONIGHT, DRESSING, STAFF, DECORATE, CELEBS, PARTIES, TROPHIES, SETTINGS) */}
          <div className="flex-1 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {(
              [
                {
                  id: 'TONIGHT',
                  label: 'TONIGHT',
                  icon: '🍸',
                  grad: 'from-cyan-500 to-blue-700',
                  upgradeTag: 'MIX',
                },
                { id: 'DRESSING', label: 'DRESSING', icon: '👕', grad: 'from-pink-500 to-rose-700' },
                {
                  id: 'STAFF',
                  label: 'STAFF',
                  icon: '🧑‍🍳',
                  grad: 'from-purple-500 to-indigo-800',
                  badge: staffMembers.length,
                  upgradeTag: 'UPGRADE',
                },
                {
                  id: 'DECORATE',
                  label: 'DECORATE',
                  icon: '🛋️',
                  grad: 'from-emerald-400 to-teal-700',
                  upgradeTag: 'UPGRADE',
                },
                { id: 'CELEBS', label: 'CELEBS', icon: '👑', grad: 'from-amber-400 to-orange-600' },
                { id: 'PARTIES', label: 'PARTIES', icon: '🎉', grad: 'from-fuchsia-500 to-purple-800' },
                {
                  id: 'TROPHIES',
                  label: 'TROPHIES',
                  icon: '🏆',
                  grad: 'from-yellow-400 to-amber-700',
                  badge: unclaimedQuestCount > 0 ? unclaimedQuestCount : undefined,
                },
                {
                  id: 'SETTINGS',
                  label: 'SETTINGS',
                  icon: '⚙️',
                  grad: 'from-slate-500 to-slate-800',
                  upgradeTag: 'PNG',
                },
              ] as const
            ).map((tab) => {
              const isSelected = activeDockTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveDockTab((curr) => (curr === tab.id ? null : tab.id));
                  }}
                  className={`relative py-1.5 px-1 rounded-xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-600 to-indigo-900 border-cyan-300 -translate-y-0.5 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'bg-[#1c1333] hover:bg-[#281b47] border-[#0D0D14] shadow-[0_3px_0_#0D0D14]'
                  }`}
                >
                  {'upgradeTag' in tab && tab.upgradeTag && (
                    <span className="absolute -top-1.5 -left-1 px-1 py-0.2 rounded bg-emerald-400 border border-[#0D0D14] text-[7px] font-black text-slate-950 uppercase tracking-tight">
                      {tab.upgradeTag}
                    </span>
                  )}
                  {'badge' in tab && tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 border border-[#0D0D14] text-[8px] font-black text-white">
                      {tab.badge}
                    </span>
                  )}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b ${tab.grad} border-[1.8px] border-[#0D0D14] flex items-center justify-center text-sm sm:text-base shadow-inner`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white mt-1 truncate max-w-full drop-shadow-[0_1px_0_#0D0D14]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
