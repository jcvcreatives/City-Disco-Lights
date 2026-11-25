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
import {
  BeatPattern,
  ClubSongTrack,
  INITIAL_CLUB_SONGS,
  PRESET_BEAT_PATTERNS,
  soundEngine,
} from './audio/soundEngine';
import {
  streamingMusicManager,
  StreamingStateSnapshot,
} from './audio/streamingMusicManager';
import { BeatAndMusicStudioModal } from './components/BeatAndMusicStudioModal';
import { HypeBlastEvent, HypeBlastOverlay } from './components/HypeBlastOverlay';
import { InteractiveQuestChallengeModal } from './components/InteractiveQuestChallengeModal';
import {
  ClubSimulationMetrics,
  DayNightCycleReport,
  getClubMoodLightingProfile,
  IsometricClubCanvas,
  SpriteMoodInfo,
} from './components/IsometricClubCanvas';
import {
  ActiveBoothBottleService,
  CATALOG_ITEMS,
  CatalogItem,
  ClubGossipCategory,
  ClubGossipPost,
  createNextTierQuest,
  DRINK_MIXES,
  FloatingText,
  FloorLevel,
  GuestAgent,
  INITIAL_PLACED_ITEMS,
  INITIAL_QUESTS,
  INITIAL_STAFF_MEMBERS,
  isVipBoothCatalogId,
  ItemCategory,
  LEVEL_1_DIVE_BAR_ITEMS,
  ParkingUpgradeState,
  PlacedItem,
  QuestCategoryTag,
  QuestTask,
  QuestTrackType,
  STAFF_CATALOG,
  StaffCatalogItem,
  StaffMemberAgent,
  VIP_BOTTLE_SERVICE_TRAYS,
  VIP_HOTSPOT_ITEMS,
  VipBottleServiceTray,
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
  const [isEditDecorMode, setIsEditDecorMode] = useState<boolean>(false);
  const [editingPlacedItemUid, setEditingPlacedItemUid] = useState<string | null>(null);

  // Sprite & Crowd Mood Inspection State (Tap any sprite or open the side Mood Panel)
  const [selectedSpriteMood, setSelectedSpriteMood] = useState<SpriteMoodInfo | null>(null);
  const [spriteMoodList, setSpriteMoodList] = useState<SpriteMoodInfo[]>([]);
  const [isMoodPanelOpen, setIsMoodPanelOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  // Club Gossip Feed Overlay State (Derived from Guest Thoughts & Accelerates with High Crowd Hype)
  const [isGossipOverlayOpen, setIsGossipOverlayOpen] = useState<boolean>(false);
  const [gossipFilter, setGossipFilter] = useState<'ALL' | ClubGossipCategory>('ALL');
  const [unreadGossipCount, setUnreadGossipCount] = useState<number>(3);
  const [gossipFeed, setGossipFeed] = useState<ClubGossipPost[]>(() => [
    {
      id: 'gossip_init_1',
      authorName: 'Lady Supernova ★ VIP',
      authorHandle: '@LadySupernovaVIP',
      authorEmoji: '🍾',
      authorColor: '#facc15',
      category: 'VIP_TEA',
      categoryLabel: 'VIP TEA',
      message:
        'Ordered the 24K Gold Supernova Parade Tray and my sunglasses indoors are now 100% justified. Peasants are filming our sparklers! 🍾✨',
      sourceThought: 'Popping 24K Gold Supernova Parade Tray with sparklers in our VIP booth! 🍾✨',
      hypeLevelAtPost: 340,
      isViralHypePost: true,
      likes: 142,
      fireReactions: 89,
      timestampLabel: 'Just now',
      guestId: 'guest_init_3',
    },
    {
      id: 'gossip_init_2',
      authorName: 'Marco V.',
      authorHandle: '@MarcoOnTheGrid',
      authorEmoji: '🕺',
      authorColor: '#38bdf8',
      category: 'DANCE_FLOOR',
      categoryLabel: 'DANCE FLOOR',
      message:
        'Four of us accidentally locked into a synchronized CIRCLE_GROOVE for 14 seconds straight and honestly we might go on tour tomorrow 🔥💃',
      sourceThought: 'Synced Group Dance (4 Dancers · CIRCLE GROOVE)! The whole floor is locked in!',
      hypeLevelAtPost: 285,
      isViralHypePost: true,
      likes: 98,
      fireReactions: 64,
      timestampLabel: '18s ago',
      guestId: 'guest_init_1',
    },
    {
      id: 'gossip_init_3',
      authorName: 'Mia H.',
      authorHandle: '@MiaNeonNights',
      authorEmoji: '🎧',
      authorColor: '#f472b6',
      category: 'DJ_BOOTH',
      categoryLabel: 'DJ BOOTH',
      message:
        'DJ Nova dropped the sub-bass so hard my glowing ice cube vibrated out of my glass. 10/10 acoustics, my knees are sentient now.',
      sourceThought: 'This genre mood filter and bassline are pure electric euphoria! ⚡',
      hypeLevelAtPost: 260,
      isViralHypePost: false,
      likes: 76,
      fireReactions: 41,
      timestampLabel: '42s ago',
      guestId: 'guest_init_2',
    },
    {
      id: 'gossip_init_4',
      authorName: 'Devon K.',
      authorHandle: '@DevonInLine',
      authorEmoji: '🚧',
      authorColor: '#fb7185',
      category: 'RED_CARPET',
      categoryLabel: 'RED CARPET',
      message:
        'Tried telling Bouncer Marcus I am the DJ’s cousin. He didn’t even blink, just pointed at the velvet rope line. Send help (or VIP passes).',
      sourceThought: 'Waiting behind the red carpet rope... you can feel the bass from the sidewalk!',
      hypeLevelAtPost: 230,
      isViralHypePost: false,
      likes: 54,
      fireReactions: 29,
      timestampLabel: '1m ago',
    },
  ]);

  // VIP Booth Bottle Service State (Premium Drink Trays with Sparklers, Spending Multipliers & Hype Boost)
  const [selectedBottleTrayId, setSelectedBottleTrayId] = useState<string>('tray_neon_magnum');
  const [activeBottleServices, setActiveBottleServices] = useState<
    Record<string, ActiveBoothBottleService>
  >(() => ({
    init_booth_bottom: {
      boothUid: 'init_booth_bottom',
      floor: 1,
      trayId: 'tray_neon_magnum',
      trayName: 'Neon Blue Magnum & Shots Tray',
      trayColor: '#22d3ee',
      sparklerColor: '#38bdf8',
      price: 850,
      hypeBoost: 68,
      vibeBoost: 45,
      spendingMultiplier: 2.8,
      status: 'ORDERED_WAITING',
      timer: 24,
      maxTimer: 24,
      orderedByGuestName: 'Lady Supernova ★ VIP',
    },
    init_couch_left1: {
      boothUid: 'init_couch_left1',
      floor: 1,
      trayId: 'tray_24k_supernova',
      trayName: '24K Gold Supernova Parade Tray',
      trayColor: '#facc15',
      sparklerColor: '#fde047',
      price: 1480,
      hypeBoost: 120,
      vibeBoost: 80,
      spendingMultiplier: 3.6,
      status: 'ACTIVE_SPARKLERS',
      timer: 26,
      maxTimer: 30,
      orderedByGuestName: 'DJ Daft Nova ★ VIP',
    },
  }));

  // Avatar, Music Catalog & Custom 16-Step Beat Studio State
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number>(0);
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [clubSongs, setClubSongs] = useState<ClubSongTrack[]>(INITIAL_CLUB_SONGS);
  const [activeSongId, setActiveSongId] = useState<string>(INITIAL_CLUB_SONGS[0].id);
  const [customPatterns, setCustomPatterns] = useState<Record<string, BeatPattern>>(
    PRESET_BEAT_PATTERNS
  );
  const [activePattern, setActivePattern] = useState<BeatPattern>(PRESET_BEAT_PATTERNS.pat_pop_1);
  const [beatStudioModalTab, setBeatStudioModalTab] = useState<'MUSIC' | 'BEAT_MAKER' | null>(null);
  const [isTrackLiked, setIsTrackLiked] = useState<boolean>(true);
  const [isMusicPaused, setIsMusicPaused] = useState<boolean>(false);
  const [selectedBpm, setSelectedBpm] = useState<number>(INITIAL_CLUB_SONGS[0].bpm);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioReady, setIsAudioReady] = useState<boolean>(() => soundEngine.isAudioRunning());
  const [streamState, setStreamState] = useState<StreamingStateSnapshot>(() =>
    streamingMusicManager.getState()
  );
  const [isTurntableDockMinimized, setIsTurntableDockMinimized] = useState<boolean>(false);

  // Club Status, Party & Happy Hour Rush State
  const [isClubOpenStatus, setIsClubOpenStatus] = useState<boolean>(true);
  const [hypeSurgeBonus, setHypeSurgeBonus] = useState<number>(45);
  const [happyHourSeconds, setHappyHourSeconds] = useState<number>(165);
  const [partyCount, setPartyCount] = useState<number>(3);

  // Camera Zoom, Pan Reset & iPad/Phone Cool Eco Mode
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [cameraResetTick, setCameraResetTick] = useState<number>(0);
  const [isEcoThermalMode, setIsEcoThermalMode] = useState<boolean>(false);
  const [vipBottleToast, setVipBottleToast] = useState<string | null>(null);
  const vipBottleToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quests, Streak Multiplier, Interactive Skill Challenge & VIP Jackpot Chest
  const [quests, setQuests] = useState<QuestTask[]>(INITIAL_QUESTS);
  const [activeChallengeQuest, setActiveChallengeQuest] = useState<QuestTask | null>(null);
  const [questStreak, setQuestStreak] = useState<number>(2);
  const [jackpotProgress, setJackpotProgress] = useState<number>(2);
  const [questsCompletedTotal, setQuestsCompletedTotal] = useState<number>(2);
  const [questCategoryFilter, setQuestCategoryFilter] = useState<'ALL' | QuestCategoryTag>('ALL');
  const [isQuestTrackerMinimized, setIsQuestTrackerMinimized] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [queueCount, setQueueCount] = useState<number>(2);
  const [hypeBlastEvent, setHypeBlastEvent] = useState<HypeBlastEvent | null>(null);
  const staffRevenueTickRef = useRef<number>(0);

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
  const activeSong = useMemo(
    () =>
      clubSongs.find((s) => s.id === activeSongId) ||
      clubSongs[trackIndex % clubSongs.length] ||
      INITIAL_CLUB_SONGS[0],
    [clubSongs, activeSongId, trackIndex]
  );
  const currentTrack = activeSong;

  // Displayed track & smooth fade-out / fade-in state when the track changes + live BPM beat step
  const [displayedTrack, setDisplayedTrack] = useState<ClubSongTrack>(currentTrack);
  const [trackFadePhase, setTrackFadePhase] = useState<'IDLE' | 'FADING_OUT' | 'FADING_IN'>('IDLE');
  const [beatStep, setBeatStep] = useState<number>(0);

  useEffect(() => {
    return soundEngine.subscribeStep((step) => {
      // Throttle HUD React re-renders to half-beats (or downbeats in Eco Mode) so iPad/phone browsers stay cool and never drop button taps
      if (isEcoThermalMode) {
        if (step % 4 === 0) setBeatStep(step);
      } else if (step % 2 === 0) {
        setBeatStep(step);
      }
    });
  }, [isEcoThermalMode]);

  useEffect(() => {
    if (
      currentTrack.id === displayedTrack.id &&
      currentTrack.title === displayedTrack.title &&
      currentTrack.streamingSource === displayedTrack.streamingSource
    ) {
      return;
    }
    setTrackFadePhase('FADING_OUT');
    const fadeOutTimer = setTimeout(() => {
      setDisplayedTrack(currentTrack);
      setTrackFadePhase('FADING_IN');
    }, 210);
    const fadeInTimer = setTimeout(() => {
      setTrackFadePhase('IDLE');
    }, 480);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(fadeInTimer);
    };
  }, [currentTrack, displayedTrack.id, displayedTrack.title, displayedTrack.streamingSource]);

  const isPlayingMusicActive = !isMuted && !isMusicPaused;
  const isBpmDownbeat = isPlayingMusicActive && beatStep % 4 === 0;
  const isBpmHalfBeat = isPlayingMusicActive && beatStep % 2 === 0;

  const activeMoodProfile = useMemo(
    () => getClubMoodLightingProfile(currentTrack.genre),
    [currentTrack.genre]
  );
  const currentAvatar = AVATAR_STYLES[selectedAvatarIdx % AVATAR_STYLES.length];

  const activeDrink = useMemo(
    () => DRINK_MIXES.find((d) => d.id === activeDrinkId) || DRINK_MIXES[0],
    [activeDrinkId]
  );

  const selectedBottleTray = useMemo<VipBottleServiceTray>(
    () =>
      VIP_BOTTLE_SERVICE_TRAYS.find((t) => t.id === selectedBottleTrayId) ||
      VIP_BOTTLE_SERVICE_TRAYS[1],
    [selectedBottleTrayId]
  );

  // Subscribe to custom PNG Sprite AssetManager updates so UI badges refresh immediately on upload
  useEffect(() => {
    return assetManager.subscribe(() => {
      setSpriteAssetVersion((v) => v + 1);
    });
  }, []);

  // Happy Hour Rush countdown timer + Tiered Drink Mix Prep Timer + Active VIP Bottle Service Sparkler Timers
  useEffect(() => {
    const timer = setInterval(() => {
      setHappyHourSeconds((prev) => (prev > 1 ? prev - 1 : 180));
      setDrinkPrepRemainingSec((prev) => {
        if (prev > 1) return prev - 1;
        setDrinkServingsRemaining((s) => (s > 1 ? s - 1 : 60));
        return Math.max(1, Math.round(activeDrink.prepTimeSec));
      });

      setActiveBottleServices((prev) => {
        const entries = Object.values(prev) as ActiveBoothBottleService[];
        if (entries.length === 0) return prev;
        let changed = false;
        let bonusSpendCash = 0;
        const next: Record<string, ActiveBoothBottleService> = {};

        for (const svc of entries) {
          if (svc.status === 'ACTIVE_SPARKLERS') {
            changed = true;
            const nextTime = svc.timer - 1;
            if (nextTime > 0) {
              next[svc.boothUid] = { ...svc, timer: nextTime };
              // Every 4 seconds of active sparkler bottle service generates bonus VIP guest spending
              if (nextTime % 4 === 0) {
                bonusSpendCash += Math.round(65 * svc.spendingMultiplier);
              }
            }
          } else {
            next[svc.boothUid] = svc;
          }
        }

        if (bonusSpendCash > 0) {
          setCash((c) => c + bonusSpendCash);
        }
        return changed ? next : prev;
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

    // Add live Hype, Vibe, and Spending Multiplier bonuses from all active VIP Booth Bottle Service Trays
    for (const svc of Object.values(activeBottleServices) as ActiveBoothBottleService[]) {
      if (svc.status === 'ACTIVE_SPARKLERS') {
        totalHype += svc.hypeBoost;
        totalVibe += svc.vibeBoost;
        tipBonus += (svc.spendingMultiplier - 1) * 0.18;
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
  }, [
    placedItems,
    staffMembers,
    activeBottleServices,
    parkingState,
    unlockedFloors,
    activeDrink,
    hypeSurgeBonus,
  ]);

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

  // Dynamic Quest Progress Engine: every action advances the matching quest track in real time
  const advanceQuestProgress = useCallback((track: QuestTrackType, delta: number) => {
    if (delta <= 0) return;
    setQuests((prev) =>
      prev.map((q) => {
        if (q.track !== track || q.claimed) return q;
        const nextVal = Math.min(q.targetValue, q.currentValue + delta);
        if (nextVal === q.currentValue) return q;
        return { ...q, currentValue: nextVal };
      })
    );
  }, []);

  const questStreakMultiplier = useMemo(() => {
    const mults = [1.0, 1.25, 1.5, 2.0, 2.5];
    const idx = Math.max(0, Math.min(mults.length - 1, questStreak - 1));
    return mults[idx];
  }, [questStreak]);

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
      if (cashDelta > 0) {
        setCash((c) => c + cashDelta);
        advanceQuestProgress('CLUB_REVENUE', cashDelta);
        staffRevenueTickRef.current += 1;
        if (staffRevenueTickRef.current % 3 === 0) {
          advanceQuestProgress('STAFF_TEAM', 1);
        }
      }
      if (xpDelta > 0) addXp(xpDelta);
    },
    [addXp, advanceQuestProgress]
  );

  // Sync soundEngine pause/mute state & subscribe to AudioContext unlock status
  useEffect(() => {
    return soundEngine.subscribeAudioState((running) => {
      setIsAudioReady(running);
    });
  }, []);

  // Subscribe to External Streaming Hub (YouTube, Spotify, Apple Music) state & track selection
  useEffect(() => {
    const unsub = streamingMusicManager.subscribe((snap) => {
      setStreamState(snap);
    });
    return unsub;
  }, []);

  useEffect(() => {
    streamingMusicManager.setOnTrackSelectedCallback((extSong) => {
      setClubSongs((prev) => {
        const exists = prev.some((s) => s.id === extSong.id);
        return exists ? prev.map((s) => (s.id === extSong.id ? extSong : s)) : [extSong, ...prev];
      });
      setActiveSongId(extSong.id);
      setSelectedBpm(extSong.bpm);
      setIsMusicPaused(false);
      setIsMuted(false);
      soundEngine.setMuted(false);
      soundEngine.setPaused(false);
      soundEngine.setBpm(extSong.bpm);
      addXp(25);
      advanceQuestProgress('DJ_HYPE_DROP', 1);
      floatingTextsRef.current.push({
        id: `ext_song_${performance.now()}`,
        text: `🎧 [${extSong.streamingSource || 'STREAM'}] ${extSong.title.toUpperCase()} (${extSong.bpm} BPM)`,
        floor: activeFloor,
        gridX: 5,
        gridY: 0.8,
        color: extSong.accentColor || '#22d3ee',
        age: 0,
      });
    });
    return () => {
      // keep callback active across re-renders
    };
  }, [addXp, activeFloor, advanceQuestProgress]);

  useEffect(() => {
    soundEngine.setPaused(isMusicPaused);
  }, [isMusicPaused]);

  useEffect(() => {
    soundEngine.setMuted(isMuted);
  }, [isMuted]);

  // 16-Step Multi-Track Club Drum & Synth Sequencer when not muted and not paused
  useEffect(() => {
    if (isMuted || isMusicPaused) return;
    const msPerStep = Math.max(70, Math.round((60 / selectedBpm / 4) * 1000));
    const id = setInterval(() => {
      soundEngine.playBeatStep(clubMetrics.hypeSegments);
    }, msPerStep);
    return () => clearInterval(id);
  }, [isMuted, isMusicPaused, selectedBpm, clubMetrics.hypeSegments]);

  const handleSelectSong = useCallback(
    (song: ClubSongTrack) => {
      setActiveSongId(song.id);
      const idx = clubSongs.findIndex((s) => s.id === song.id);
      if (idx >= 0) setTrackIndex(idx);
      setSelectedBpm(song.bpm);
      soundEngine.setBpm(song.bpm);
      if (
        song.streamingSource === 'YOUTUBE' ||
        song.streamingSource === 'SPOTIFY' ||
        song.streamingSource === 'APPLE'
      ) {
        soundEngine.setExternalStreamActive(true);
      } else if (song.customAudioUrl) {
        streamingMusicManager.switchToBuiltInSynthOrUpload(true);
        soundEngine.setCustomAudioUrl(song.customAudioUrl);
      } else {
        streamingMusicManager.switchToBuiltInSynthOrUpload(false);
        soundEngine.setCustomAudioUrl(null);
        const pat =
          customPatterns[song.patternId] ||
          PRESET_BEAT_PATTERNS[song.patternId] ||
          activePattern;
        setActivePattern(pat);
        soundEngine.setActivePattern(pat);
      }
      addXp(20);
      advanceQuestProgress('DJ_HYPE_DROP', 1);
      floatingTextsRef.current.push({
        id: `song_${performance.now()}`,
        text: `♫ DJ SPINNING: ${song.title.toUpperCase()} (${song.bpm} BPM)`,
        floor: activeFloor,
        gridX: 5,
        gridY: 0.8,
        color: '#22d3ee',
        age: 0,
      });
    },
    [clubSongs, customPatterns, activePattern, addXp, activeFloor, advanceQuestProgress]
  );

  const handleTogglePauseMusic = useCallback(() => {
    soundEngine.unlockAudio();
    soundEngine.playClick();
    setIsMusicPaused((prevPaused) => {
      const nextPaused = !prevPaused;
      if (nextPaused) {
        streamingMusicManager.pause();
      } else {
        setIsMuted(false);
        soundEngine.setMuted(false);
        streamingMusicManager.play();
      }
      return nextPaused;
    });
  }, []);

  const handleToggleMuteMusic = useCallback(() => {
    setIsMuted((prevMuted) => {
      const nextMuted = !prevMuted;
      soundEngine.setMuted(nextMuted);
      streamingMusicManager.setVolume(nextMuted ? 0 : 0.85);
      if (!nextMuted) {
        setIsMusicPaused(false);
        soundEngine.setPaused(false);
        soundEngine.unlockAudio();
        streamingMusicManager.play();
        soundEngine.playBeatStep(clubMetrics.hypeSegments);
      }
      return nextMuted;
    });
  }, [clubMetrics.hypeSegments]);

  const handleNextClubTrack = useCallback(() => {
    soundEngine.unlockAudio();
    soundEngine.playClick();
    if (
      streamState.activeService === 'YOUTUBE' ||
      streamState.activeService === 'SPOTIFY' ||
      streamState.activeService === 'APPLE'
    ) {
      streamingMusicManager.next();
      return;
    }
    if (clubSongs.length === 0) return;
    const currentIdx = clubSongs.findIndex((s) => s.id === activeSongId);
    const nextSong = clubSongs[(currentIdx + 1) % clubSongs.length];
    if (nextSong) {
      handleSelectSong(nextSong);
    }
  }, [streamState.activeService, clubSongs, activeSongId, handleSelectSong]);

  // Crowd Hype -> Gossip Velocity Multiplier & Interval Calculation
  const gossipHypeMultiplier = useMemo(() => {
    // Scales from 1.0x at low hype up to 4.5x when crowd hype is booming
    const raw = 1 + Math.max(0, (clubMetrics.totalHype - 80) / 85);
    return Math.min(4.5, Math.max(1.0, +raw.toFixed(1)));
  }, [clubMetrics.totalHype]);

  const gossipIntervalMs = useMemo(() => {
    // At 1.0x hype: ~9500ms; at 2.5x hype: ~4200ms; at 4.5x viral hype: ~2400ms
    return Math.round(Math.max(2300, 9500 / gossipHypeMultiplier));
  }, [gossipHypeMultiplier]);

  const generateGossipPostFromSimulation = useCallback(
    (forcedReason?: 'BASS_DROP' | 'PARTY_SURGE' | 'BOTTLE_PARADE' | 'MANUAL_SPILL') => {
      const sprites = spriteMoodList;
      const liveGuests = guestsRef.current;
      const isHighHype =
        clubMetrics.totalHype >= 240 || vibeThermometerPercent >= 72 || Boolean(forcedReason);

      // Pick a real sprite or guest to derive thought-based gossip from
      const chosenSprite =
        sprites.length > 0
          ? sprites[Math.floor(Math.random() * sprites.length)]
          : null;
      const matchingGuest =
        (chosenSprite && liveGuests.find((g) => g.id === chosenSprite.id)) ||
        (liveGuests.length > 0
          ? liveGuests[Math.floor(Math.random() * liveGuests.length)]
          : null);

      const authorName =
        chosenSprite?.name ||
        matchingGuest?.name ||
        (queueCount > 0 ? 'Chloe R. (In Line)' : 'DJ Daft Nova ★ VIP');
      const cleanHandle =
        '@' +
        authorName
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 14) +
        (isHighHype ? 'VIP' : 'Nights');
      const authorColor =
        chosenSprite?.shirtColor || matchingGuest?.shirtColor || activeMoodProfile.primaryHex;
      const baseThought =
        chosenSprite?.thought ||
        matchingGuest?.chatText ||
        `Vibing to ${currentTrack.title} (${currentTrack.genre}) under ${activeMoodProfile.moodName} lights!`;

      let category: ClubGossipCategory = 'DANCE_FLOOR';
      let categoryLabel = 'DANCE FLOOR';
      let authorEmoji = chosenSprite?.moodEmoji || '🔥';
      let message = '';

      const activeSparklerTrays = (
        Object.values(activeBottleServices) as ActiveBoothBottleService[]
      ).filter((s) => s.status === 'ACTIVE_SPARKLERS');

      if (forcedReason === 'BASS_DROP') {
        category = 'DJ_BOOTH';
        categoryLabel = 'DJ BOOTH';
        authorEmoji = '🔊';
        message = `BREAKING: The sub-bass drop on "${currentTrack.title}" (${selectedBpm} BPM) just rearranged my DNA! Whole dance floor went feral!! 🔥🔊`;
      } else if (forcedReason === 'PARTY_SURGE') {
        category = 'DANCE_FLOOR';
        categoryLabel = 'DANCE FLOOR';
        authorEmoji = '🎉';
        message = `MEGA PARTY ALERT at ${clubName}!! Crowd hype hit ${clubMetrics.totalHype}⚡ and someone just tipped the bartender a rent check! 🍾💸`;
      } else if (
        forcedReason === 'BOTTLE_PARADE' ||
        (activeSparklerTrays.length > 0 && Math.random() < 0.32)
      ) {
        const tray = activeSparklerTrays[0];
        category = 'VIP_TEA';
        categoryLabel = 'VIP TEA';
        authorEmoji = '🍾';
        const trayTitle = tray?.trayName || selectedBottleTray.name;
        const vipOrderer = tray?.orderedByGuestName || authorName;
        const vipQuips = [
          `Spotted ${vipOrderer} ordering the ${trayTitle} with blinding sparklers. Waiter Skye walked past me smelling like 24K gold and financial freedom! 🍾✨`,
          `Overheard in the VIP booth: "${baseThought}" — meanwhile they're on their 3rd ${trayTitle} tonight! 👑`,
          `The sparklers on that ${trayTitle} are so bright I thought the sun came up on Floor ${activeFloor}. VIP section is flexing hard! 🥂`,
        ];
        message = vipQuips[Math.floor(Math.random() * vipQuips.length)];
      } else if (
        matchingGuest &&
        matchingGuest.groupDanceId &&
        (matchingGuest.groupDanceTimer ?? 0) > 0 &&
        Math.random() < 0.55
      ) {
        category = 'DANCE_FLOOR';
        categoryLabel = 'DANCE FLOOR';
        authorEmoji = '💃';
        const patName = (matchingGuest.groupDancePattern || 'CIRCLE_GROOVE').replace('_', ' ');
        const size = matchingGuest.groupDanceSize || 3;
        const groupQuips = [
          `We did NOT rehearse this!! ${size} of us just locked into a synchronized ${patName} to "${currentTrack.title}" and the crowd is losing it! 🕺⚡`,
          `My legs have been possessed by the ${selectedBpm} BPM beat! ${size}-person ${patName} squad on Floor ${matchingGuest.floor}—nobody break formation!! 🔥`,
          `Thought bubble was "${baseThought}" and 2 seconds later I'm leading a ${size}-dancer synchronized flash mob under ${activeMoodProfile.moodName} lights!`,
        ];
        message = groupQuips[Math.floor(Math.random() * groupQuips.length)];
      } else if (
        (chosenSprite?.role === 'PEDESTRIAN' ||
          matchingGuest?.state === 'QUEUEING' ||
          queueCount >= 3) &&
        Math.random() < 0.28
      ) {
        category = 'RED_CARPET';
        categoryLabel = 'RED CARPET';
        authorEmoji = '🚧';
        const lineQuips = [
          `There are ${Math.max(1, queueCount)} of us behind the red carpet rope trying to look famous so Bouncer Marcus lets us in faster. My heels are filing a complaint! 👠🚧`,
          `Cars keep cruising past the neon marquee while I'm out here practicing my VIP walk in line. Let me into ${clubName} already!!`,
          `Overheard at the velvet rope: "${baseThought}" — Bouncer Marcus just raised one eyebrow and checked another ID. 🛡️`,
        ];
        message = lineQuips[Math.floor(Math.random() * lineQuips.length)];
      } else if (
        chosenSprite?.role === 'BARTENDER' ||
        matchingGuest?.state === 'ORDERING_DRINK' ||
        Math.random() < 0.25
      ) {
        category = 'BAR_BUZZ';
        categoryLabel = 'BAR BUZZ';
        authorEmoji = '🍸';
        const barQuips = [
          `One sip of the "${activeDrink.name}" ($${activeDrink.sellPrice}) and I suddenly think I can breakdance. Bartenders are shaking drinks at supersonic speed! 🍸⚡`,
          `Confession at the Neon Bar: "${baseThought}" — whoever invented the ${activeDrink.name} deserves a Nobel Prize in Nightlife.`,
          `Only ${drinkServingsRemaining} servings of ${activeDrink.name} left at the bar and guests are tipping ${(1 + clubMetrics.tipBonus).toFixed(2)}x like tomorrow doesn't exist! 💸`,
        ];
        message = barQuips[Math.floor(Math.random() * barQuips.length)];
      } else {
        // Derive directly from guest's live thought + genre mood lighting + crowd hype
        const isFavGenre =
          chosenSprite?.favoriteGenre &&
          currentTrack.genre.toLowerCase().includes(chosenSprite.favoriteGenre.toLowerCase());
        category = isFavGenre ? 'DJ_BOOTH' : 'DANCE_FLOOR';
        categoryLabel = isFavGenre ? 'DJ BOOTH' : 'DANCE FLOOR';
        const thoughtQuips = [
          `Literally just thought "${baseThought}" and then the ${activeMoodProfile.moodName} lasers hit the dance floor at ${selectedBpm} BPM! Best night at ${clubName}! ✨`,
          `Crowd Hype is at ${clubMetrics.totalHype}⚡ (${vibeThermometerPercent}% Vibe)! "${baseThought}" — I am never going home! 🔥`,
          `When "${currentTrack.title}" comes on and your brain goes: "${baseThought}". Even the pedestrians outside are peeking through the door! 🎧`,
          `Mood status: ${chosenSprite?.moodLabel || 'ECSTATIC'} (${chosenSprite?.moodScore || 96}%). "${baseThought}" — ${currentTrack.genre} night is unmatched!`,
        ];
        message = thoughtQuips[Math.floor(Math.random() * thoughtQuips.length)];
      }

      const newPost: ClubGossipPost = {
        id: `gossip_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        authorName,
        authorHandle: cleanHandle,
        authorEmoji,
        authorColor,
        category,
        categoryLabel,
        message,
        sourceThought: baseThought,
        hypeLevelAtPost: clubMetrics.totalHype,
        isViralHypePost: isHighHype,
        likes: Math.floor(24 + clubMetrics.totalHype * 0.35 + Math.random() * 45),
        fireReactions: Math.floor(14 + clubMetrics.totalHype * 0.25 + Math.random() * 30),
        timestampLabel: isHighHype ? '🔥 LIVE NOW' : 'Just now',
        guestId: chosenSprite?.id || matchingGuest?.id,
      };

      setGossipFeed((prev) => [newPost, ...prev.slice(0, 23)]);
      if (!isGossipOverlayOpen) {
        setUnreadGossipCount((c) => Math.min(99, c + 1));
      }
    },
    [
      spriteMoodList,
      clubMetrics.totalHype,
      clubMetrics.tipBonus,
      vibeThermometerPercent,
      queueCount,
      activeMoodProfile.primaryHex,
      activeMoodProfile.moodName,
      currentTrack.title,
      currentTrack.genre,
      activeBottleServices,
      selectedBpm,
      clubName,
      selectedBottleTray.name,
      activeFloor,
      activeDrink.name,
      activeDrink.sellPrice,
      drinkServingsRemaining,
      isGossipOverlayOpen,
    ]
  );

  // Automatic Hype-Scaled Club Gossip Feed Timer (Spawns faster when Crowd Hype is high!)
  useEffect(() => {
    const timer = setInterval(() => {
      generateGossipPostFromSimulation();
    }, gossipIntervalMs);
    return () => clearInterval(timer);
  }, [generateGossipPostFromSimulation, gossipIntervalMs]);

  const handleTriggerBassDrop = useCallback(() => {
    soundEngine.triggerBassDrop();
    setEnergy((e) => (e >= 2 ? e - 2 : maxEnergy));
    setCash((c) => c + 320);
    addXp(55);
    advanceQuestProgress('DJ_HYPE_DROP', 1);
    advanceQuestProgress('CLUB_REVENUE', 320);
    triggerHypeBlast(48, clubMetrics.totalHype + 48, clubMetrics.tipBonus + 0.15);
    generateGossipPostFromSimulation('BASS_DROP');
    floatingTextsRef.current.push({
      id: `bass_${performance.now()}`,
      text: '🔊 BASS CANNON DROPPED! +$320 TIPS & CROWD SURGE!',
      floor: activeFloor,
      gridX: 4,
      gridY: 3.5,
      color: '#a855f7',
      age: 0,
    });
  }, [
    addXp,
    advanceQuestProgress,
    triggerHypeBlast,
    generateGossipPostFromSimulation,
    clubMetrics.totalHype,
    clubMetrics.tipBonus,
    activeFloor,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setBuildRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
        soundEngine.playClick();
      } else if (e.key === 'Escape') {
        setActiveDockTab(null);
        setActiveTopLeftModal(null);
        setBeatStudioModalTab(null);
        setIsGossipOverlayOpen(false);
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
    advanceQuestProgress('PARTY_FEVER', 1);
    advanceQuestProgress('CLUB_REVENUE', 550);
    setEnergy((e) => (e > 1 ? e - 1 : maxEnergy));
    triggerHypeBlast(65, clubMetrics.totalHype + 65, clubMetrics.tipBonus + 0.25);
    generateGossipPostFromSimulation('PARTY_SURGE');
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
    advanceQuestProgress('STAFF_TEAM', 1);
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
    advanceQuestProgress('DANCE_FLOOR', 1);
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
      advanceQuestProgress('STAFF_TEAM', 1);
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

    // EDIT DECORATION POSITION MODE: Click an existing decoration to pick it up, then click any tile to move it ($0 cost)
    if (isEditDecorMode || editingPlacedItemUid) {
      if (editingPlacedItemUid) {
        const movingItem = placedItems.find((p) => p.uid === editingPlacedItemUid);
        const cat = movingItem ? getCatalogItem(movingItem.catalogId) : null;
        if (movingItem && cat) {
          const fp = getRotatedFootprint(cat, buildRotation);
          const nextX = Math.max(0, Math.min(GRID_SIZE - fp.width, coord.x));
          const nextY = Math.max(0, Math.min(GRID_SIZE - fp.depth, coord.y));
          const others = placedItems.filter((p) => p.uid !== editingPlacedItemUid);

          if (canPlaceItem(others, cat, activeFloor, nextX, nextY, buildRotation)) {
            setPlacedItems((prev) =>
              prev.map((p) =>
                p.uid === editingPlacedItemUid
                  ? {
                      ...p,
                      floor: activeFloor,
                      gridX: nextX,
                      gridY: nextY,
                      rotation: buildRotation,
                    }
                  : p
              )
            );
            advanceQuestProgress('DANCE_FLOOR', 1);
            soundEngine.playPlaceItem();
            floatingTextsRef.current.push({
              id: `move_decor_${performance.now()}`,
              text: `MOVED ${cat.name.toUpperCase()} TO (${nextX}, ${nextY})`,
              floor: activeFloor,
              gridX: nextX,
              gridY: nextY,
              color: '#38bdf8',
              age: 0,
            });
            setEditingPlacedItemUid(null);
            return;
          } else {
            // Check if the user tapped a different decoration on this floor to switch selection
            const tappedOther = placedItems.find((p) => {
              if (p.floor !== activeFloor || p.uid === editingPlacedItemUid) return false;
              const c = getCatalogItem(p.catalogId);
              if (!c) return false;
              const f = getRotatedFootprint(c, p.rotation);
              return (
                coord.x >= p.gridX &&
                coord.x < p.gridX + f.width &&
                coord.y >= p.gridY &&
                coord.y < p.gridY + f.depth
              );
            });
            if (tappedOther) {
              setEditingPlacedItemUid(tappedOther.uid);
              setBuildRotation(tappedOther.rotation);
              soundEngine.playClick();
              return;
            }
            soundEngine.playError();
            floatingTextsRef.current.push({
              id: `move_blocked_${performance.now()}`,
              text: 'TILE BLOCKED — TAP AN OPEN TILE!',
              floor: activeFloor,
              gridX: nextX,
              gridY: nextY,
              color: '#f87171',
              age: 0,
            });
            return;
          }
        }
      }

      // No decoration currently picked up: pick up whichever placed item is at `coord`
      const clickedPlaced = [...placedItems]
        .reverse()
        .find((p) => {
          if (p.floor !== activeFloor) return false;
          const cat = getCatalogItem(p.catalogId);
          if (!cat) return false;
          const fp = getRotatedFootprint(cat, p.rotation);
          return (
            coord.x >= p.gridX &&
            coord.x < p.gridX + fp.width &&
            coord.y >= p.gridY &&
            coord.y < p.gridY + fp.depth
          );
        });
      if (clickedPlaced) {
        setEditingPlacedItemUid(clickedPlaced.uid);
        setBuildRotation(clickedPlaced.rotation);
        soundEngine.playClick();
        const cat = getCatalogItem(clickedPlaced.catalogId);
        floatingTextsRef.current.push({
          id: `pick_decor_${performance.now()}`,
          text: `EDITING ${cat?.name.toUpperCase() || 'ITEM'} — TAP NEW TILE!`,
          floor: activeFloor,
          gridX: clickedPlaced.gridX,
          gridY: clickedPlaced.gridY,
          color: '#38bdf8',
          age: 0,
        });
      }
      return;
    }

    if (activeDockTab === 'DECORATE' && selectedCatalogItem) {
      purchaseAndPlaceCatalogItem(selectedCatalogItem, coord);
      return;
    }

    // In normal play mode, tapping any placed VIP Booth item (seat_velvet_booth, seat_vip_pod, seat_worn_couch)
    // triggers the VIP Bottle Service interaction on that booth!
    const clickedVipBooth = [...placedItems]
      .reverse()
      .find((p) => {
        if (p.floor !== activeFloor || !isVipBoothCatalogId(p.catalogId)) return false;
        const cat = getCatalogItem(p.catalogId);
        if (!cat) return false;
        const fp = getRotatedFootprint(cat, p.rotation);
        return (
          coord.x >= p.gridX &&
          coord.x < p.gridX + fp.width &&
          coord.y >= p.gridY &&
          coord.y < p.gridY + fp.depth
        );
      });
    if (clickedVipBooth) {
      serveVipBoothBottleService(clickedVipBooth.uid);
    }
  };

  const showVipBottleConfirmationToast = (msg: string) => {
    setVipBottleToast(msg);
    if (vipBottleToastTimerRef.current) {
      clearTimeout(vipBottleToastTimerRef.current);
    }
    vipBottleToastTimerRef.current = setTimeout(() => {
      setVipBottleToast(null);
    }, 2800);
  };

  const serveVipBoothBottleService = (
    boothUid: string,
    customTray?: VipBottleServiceTray,
    actorName?: string
  ) => {
    const booth = placedItems.find((p) => p.uid === boothUid);
    if (!booth) return;
    const tray = customTray || selectedBottleTray;

    // Check if any VIP Celebrity is seated at or near this VIP booth for an extra celebrity spending bonus
    const boothGuests = guestsRef.current.filter(
      (g) =>
        g.floor === booth.floor &&
        (g.assignedSlotId?.startsWith(booth.uid) ||
          Math.hypot(g.gridX - (booth.gridX + 0.8), g.gridY - (booth.gridY + 0.8)) <= 2.4)
    );
    const hasCelebrityAtBooth = boothGuests.some((g) => g.isCelebrity);
    const totalPayout = Math.round(tray.price * (hasCelebrityAtBooth ? 1.35 : 1.0));

    setActiveBottleServices((prev) => ({
      ...prev,
      [boothUid]: {
        boothUid,
        floor: booth.floor,
        trayId: tray.id,
        trayName: tray.name,
        trayColor: tray.trayColor,
        sparklerColor: tray.sparklerColor,
        price: totalPayout,
        hypeBoost: tray.hypeBoost,
        vibeBoost: tray.vibeBoost,
        spendingMultiplier: tray.spendingMultiplier,
        status: 'ACTIVE_SPARKLERS',
        timer: tray.durationSec,
        maxTimer: tray.durationSec,
        orderedByGuestName:
          actorName || boothGuests[0]?.name || 'VIP Entourage',
      },
    }));

    setCash((c) => c + totalPayout);
    addXp(65);
    advanceQuestProgress('BOTTLE_SERVICE', 1);
    advanceQuestProgress('CLUB_REVENUE', totalPayout);
    setHypeSurgeBonus((h) => Math.min(240, h + Math.round(tray.hypeBoost * 0.45)));
    soundEngine.playCashRegister();
    soundEngine.playUpgradeFanfare();
    showVipBottleConfirmationToast(
      `🍾 Served ${tray.name}! +$${totalPayout.toLocaleString()} Cash & +${tray.hypeBoost}⚡ Hype!`
    );

    // Boost all guests at this VIP booth to ECSTATIC with BOTTLE_SERVICE bubbles
    for (const bg of boothGuests) {
      bg.hype = 100;
      bg.patience = 100;
      bg.cashSpent += Math.round(totalPayout / Math.max(1, boothGuests.length));
      bg.bubble = 'BOTTLE_SERVICE';
      bg.bubbleTimer = 8.0;
      bg.chatText = `Popping ${tray.name} with sparklers in VIP!! 🍾✨`;
      bg.chatTimer = 8.0;
    }

    floatingTextsRef.current.push({
      id: `bottle_srv_${performance.now()}_${Math.random()}`,
      text: `🍾 ${tray.name.toUpperCase()}! +$${totalPayout} · +${tray.hypeBoost}⚡ HYPE`,
      floor: booth.floor,
      gridX: booth.gridX + 0.8,
      gridY: booth.gridY + 0.8,
      color: tray.trayColor,
      age: 0,
    });
  };

  // Guaranteed VIP Bottle Service Helper (Works from Mood Panel, Tonight Tab, and Celebs Tab even if no VIP Booth is placed on the current floor)
  const triggerGuaranteedVipBottleService = (options?: {
    customTray?: VipBottleServiceTray;
    actorName?: string;
    preferredBoothUid?: string;
    targetGuestId?: string;
    serveAllOnFloor?: boolean;
  }) => {
    const tray = options?.customTray || selectedBottleTray;
    const actorName = options?.actorName || 'VIP Entourage';

    if (options?.serveAllOnFloor) {
      const floorVipBooths = placedItems.filter(
        (p) => p.floor === activeFloor && isVipBoothCatalogId(p.catalogId)
      );
      if (floorVipBooths.length > 0) {
        floorVipBooths.forEach((b) => serveVipBoothBottleService(b.uid, tray, actorName));
        triggerHypeBlast(tray.hypeBoost, clubMetrics.totalHype + tray.hypeBoost, clubMetrics.tipBonus + 0.25);
        return;
      }
    }

    const targetBooth =
      (options?.preferredBoothUid
        ? placedItems.find((p) => p.uid === options.preferredBoothUid && p.floor === activeFloor)
        : undefined) ||
      placedItems.find(
        (p) =>
          p.floor === activeFloor &&
          isVipBoothCatalogId(p.catalogId) &&
          activeBottleServices[p.uid]?.status === 'ORDERED_WAITING'
      ) ||
      placedItems.find(
        (p) =>
          p.floor === activeFloor &&
          isVipBoothCatalogId(p.catalogId) &&
          activeBottleServices[p.uid]?.status !== 'ACTIVE_SPARKLERS'
      ) ||
      placedItems.find((p) => p.floor === activeFloor && isVipBoothCatalogId(p.catalogId)) ||
      placedItems.find((p) => {
        if (p.floor !== activeFloor) return false;
        const cat = getCatalogItem(p.catalogId);
        return cat?.category === 'SEATING';
      }) ||
      placedItems.find((p) => isVipBoothCatalogId(p.catalogId));

    if (targetBooth) {
      if (options?.targetGuestId) {
        const g = guestsRef.current.find((x) => x.id === options.targetGuestId);
        if (g && g.state !== 'QUEUEING') {
          g.isCelebrity = true;
          g.floor = targetBooth.floor;
          g.targetFloor = targetBooth.floor;
          g.state = 'RESTING_AT_SEAT';
          g.stateTimer = 18;
          g.seatPosture = 'SITTING_SOFA';
          g.assignedSlotId = `${targetBooth.uid}_sofa_0`;
          g.gridX = targetBooth.gridX + 0.32;
          g.gridY = targetBooth.gridY + 0.28;
          g.path = [];
        }
      }
      serveVipBoothBottleService(targetBooth.uid, tray, actorName);
      triggerHypeBlast(tray.hypeBoost, clubMetrics.totalHype + tray.hypeBoost, clubMetrics.tipBonus + 0.2);
      return targetBooth.uid;
    }

    // Fallback if no booth or seating item exists anywhere: deliver a Dance Floor Sparkler Bottle Parade!
    const totalPayout = tray.price;
    setCash((c) => c + totalPayout);
    addXp(65);
    advanceQuestProgress('BOTTLE_SERVICE', 1);
    advanceQuestProgress('CLUB_REVENUE', totalPayout);
    setHypeSurgeBonus((h) => Math.min(240, h + Math.round(tray.hypeBoost * 0.5)));
    soundEngine.playCashRegister();
    soundEngine.playUpgradeFanfare();
    triggerHypeBlast(tray.hypeBoost, clubMetrics.totalHype + tray.hypeBoost, clubMetrics.tipBonus + 0.2);
    showVipBottleConfirmationToast(
      `🍾 Dance Floor Sparkler Parade (${tray.name})! +$${totalPayout.toLocaleString()} & +${tray.hypeBoost}⚡ Hype!`
    );

    const floorGuests = guestsRef.current.filter(
      (g) => g.floor === activeFloor && g.state !== 'QUEUEING'
    );
    for (const fg of floorGuests.slice(0, 6)) {
      fg.hype = 100;
      fg.patience = 100;
      fg.bubble = 'BOTTLE_SERVICE';
      fg.bubbleTimer = 8.0;
      fg.chatText = `Popping ${tray.name} with sparklers on the floor!! 🍾✨`;
      fg.chatTimer = 8.0;
    }

    floatingTextsRef.current.push({
      id: `bottle_floor_${performance.now()}`,
      text: `🍾 ${tray.name.toUpperCase()} SPARKLER PARADE! +$${totalPayout} · +${tray.hypeBoost}⚡`,
      floor: activeFloor,
      gridX: 4.5,
      gridY: 4.2,
      color: tray.trayColor,
      age: 0,
    });
    return undefined;
  };

  const handleBottleServiceEvent = (
    boothUid: string,
    eventType: 'GUEST_ORDERED' | 'WAITER_DELIVERED' | 'TAPPED_BOOTH',
    guestName?: string
  ) => {
    const booth = placedItems.find((p) => p.uid === boothUid);
    if (!booth) return;

    if (eventType === 'GUEST_ORDERED') {
      const tray = selectedBottleTray;
      setActiveBottleServices((prev) => {
        if (prev[boothUid]?.status === 'ACTIVE_SPARKLERS') return prev;
        return {
          ...prev,
          [boothUid]: {
            boothUid,
            floor: booth.floor,
            trayId: tray.id,
            trayName: tray.name,
            trayColor: tray.trayColor,
            sparklerColor: tray.sparklerColor,
            price: tray.price,
            hypeBoost: tray.hypeBoost,
            vibeBoost: tray.vibeBoost,
            spendingMultiplier: tray.spendingMultiplier,
            status: 'ORDERED_WAITING',
            timer: tray.durationSec,
            maxTimer: tray.durationSec,
            orderedByGuestName: guestName || 'VIP Guest',
          },
        };
      });
      floatingTextsRef.current.push({
        id: `bottle_ord_${performance.now()}_${Math.random()}`,
        text: `🍾 ${
          guestName ? guestName.toUpperCase() : 'VIP BOOTH'
        } ORDERED BOTTLE SERVICE! TAP BOOTH TO SERVE`,
        floor: booth.floor,
        gridX: booth.gridX + 0.8,
        gridY: booth.gridY + 0.8,
        color: '#facc15',
        age: 0,
      });
      return;
    }

    // WAITER_DELIVERED or TAPPED_BOOTH: ignite the sparkler tray and award cash + hype!
    serveVipBoothBottleService(boothUid, undefined, guestName);
  };

  const nudgeEditingDecoration = (dx: number, dy: number) => {
    if (!editingPlacedItemUid) return;
    const movingItem = placedItems.find((p) => p.uid === editingPlacedItemUid);
    if (!movingItem) return;
    const cat = getCatalogItem(movingItem.catalogId);
    if (!cat) return;
    const fp = getRotatedFootprint(cat, buildRotation);
    const nextX = Math.max(0, Math.min(GRID_SIZE - fp.width, movingItem.gridX + dx));
    const nextY = Math.max(0, Math.min(GRID_SIZE - fp.depth, movingItem.gridY + dy));
    const others = placedItems.filter((p) => p.uid !== editingPlacedItemUid);
    if (canPlaceItem(others, cat, movingItem.floor, nextX, nextY, buildRotation)) {
      setPlacedItems((prev) =>
        prev.map((p) =>
          p.uid === editingPlacedItemUid
            ? { ...p, gridX: nextX, gridY: nextY, rotation: buildRotation }
            : p
        )
      );
      advanceQuestProgress('DANCE_FLOOR', 1);
      soundEngine.playPlaceItem();
    } else {
      soundEngine.playError();
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
        advanceQuestProgress('DANCE_FLOOR', 1);
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
      advanceQuestProgress('DANCE_FLOOR', 1);
      soundEngine.playUpgradeFanfare();
    } else {
      setActiveFloor((f) => ((f % unlockedFloors) + 1) as FloorLevel);
      soundEngine.playClick();
    }
  };

  const handleLoadPreset = (preset: 'DIVE_BAR_LVL1' | 'NEON_CORNER' | 'VIP_MEGA') => {
    setPlacementModeStaff(null);
    setRelocatingStaffUid(null);
    setIsEditDecorMode(false);
    setEditingPlacedItemUid(null);
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

  const handleClaimQuest = (questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.currentValue < q.targetValue || q.claimed) return;

    const finalCash = Math.round(q.rewardCash * questStreakMultiplier);
    const finalGems = q.rewardGems + (questStreak >= 4 ? 1 : 0);
    const finalXp = Math.round(q.rewardXp * questStreakMultiplier);

    setCash((c) => c + finalCash);
    setGems((g) => g + finalGems);
    addXp(finalXp);
    setQuestStreak((s) => Math.min(5, s + 1));
    setQuestsCompletedTotal((t) => t + 1);
    setJackpotProgress((p) => Math.min(3, p + 1));
    setHypeSurgeBonus((h) => Math.min(250, h + 35));

    soundEngine.playCashRegister();
    soundEngine.playUpgradeFanfare();
    triggerHypeBlast(42, clubMetrics.totalHype + 42, clubMetrics.tipBonus + 0.18);

    // Replace claimed quest immediately with Tier + 1 so the player never runs out of goals
    const nextTierQuest = createNextTierQuest(q);
    setQuests((prev) => prev.map((item) => (item.id === questId ? nextTierQuest : item)));

    floatingTextsRef.current.push({
      id: `quest_claim_${performance.now()}_${Math.random()}`,
      text: `🏆 ${q.title.toUpperCase()} COMPLETE! +$${finalCash} · +${finalGems}💎 (${questStreakMultiplier}x STREAK 🔥)`,
      floor: activeFloor,
      gridX: 4.2,
      gridY: 4.0,
      color: '#facc15',
      age: 0,
    });
  };

  const handleClaimJackpotChest = () => {
    if (jackpotProgress < 3) {
      soundEngine.playError();
      return;
    }
    const jackpotCash = Math.round(2500 * questStreakMultiplier);
    const jackpotGems = 8;
    const jackpotXp = 350;

    setJackpotProgress(0);
    setCash((c) => c + jackpotCash);
    setGems((g) => g + jackpotGems);
    addXp(jackpotXp);
    setHypeSurgeBonus(220);
    soundEngine.playCashRegister();
    soundEngine.playUpgradeFanfare();
    triggerHypeBlast(110, clubMetrics.totalHype + 110, clubMetrics.tipBonus + 0.45);

    // Automatically launch a free 24K Gold Supernova Sparkler Parade across all VIP booths on the active floor!
    const goldTray = VIP_BOTTLE_SERVICE_TRAYS[2] || selectedBottleTray;
    const floorVipBooths = placedItems.filter(
      (p) => p.floor === activeFloor && isVipBoothCatalogId(p.catalogId)
    );
    floorVipBooths.forEach((b) =>
      serveVipBoothBottleService(b.uid, goldTray, 'VIP Jackpot Chest')
    );

    floatingTextsRef.current.push({
      id: `jackpot_${performance.now()}`,
      text: `🎁 VIP NEON JACKPOT CHEST! +$${jackpotCash.toLocaleString()} · +${jackpotGems}💎 & SPARKLER PARADE!`,
      floor: activeFloor,
      gridX: 4.5,
      gridY: 3.5,
      color: '#f472b6',
      age: 0,
    });
  };

  const handleQuestQuickAction = (q: QuestTask) => {
    soundEngine.unlockAudio();
    soundEngine.playClick();
    setActiveChallengeQuest(q);
  };

  const handleCompleteInteractiveQuestChallenge = (
    quest: QuestTask,
    bonusCash: number,
    accuracyLabel: string
  ) => {
    setActiveChallengeQuest(null);
    setCash((c) => c + bonusCash);
    addXp(65);
    setHypeSurgeBonus((h) => Math.min(250, h + 45));

    // Mark the quest ready to claim (or advance by full target so the player can claim the streak reward!)
    setQuests((prev) =>
      prev.map((item) =>
        item.id === quest.id ? { ...item, currentValue: item.targetValue } : item
      )
    );

    // Trigger real world simulation effects on the club floor based on the challenge track
    if (quest.track === 'BOTTLE_SERVICE' || quest.track === 'MIXOLOGY_CRAFT') {
      setDrinkServingsRemaining((s) => s + 36);
      const floorVipBooths = placedItems.filter(
        (p) => p.floor === activeFloor && isVipBoothCatalogId(p.catalogId)
      );
      if (floorVipBooths.length > 0) {
        serveVipBoothBottleService(floorVipBooths[0].uid, selectedBottleTray);
      }
    } else if (quest.track === 'DJ_HYPE_DROP' || quest.track === 'PARTY_FEVER') {
      soundEngine.triggerBassDrop();
      triggerHypeBlast(75, clubMetrics.totalHype + 75, clubMetrics.tipBonus + 0.25);
    } else {
      // Synchronize dancers on the active floor into an ecstatic Group Dance wave
      const floorDancers = guestsRef.current.filter(
        (g) => g.floor === activeFloor && g.state !== 'QUEUEING'
      );
      const syncGroupId = `quest_sync_${Date.now()}`;
      floorDancers.slice(0, 5).forEach((d) => {
        d.hype = 100;
        d.groupDanceId = syncGroupId;
        d.groupDanceTimer = 14;
        d.groupDancePattern = 'CIRCLE_GROOVE';
        d.groupDanceSize = Math.min(5, floorDancers.length);
        d.chatText = `${accuracyLabel}! Whole floor is locked in!! 🪩🔥`;
        d.chatTimer = 7.5;
      });
      triggerHypeBlast(60, clubMetrics.totalHype + 60, clubMetrics.tipBonus + 0.2);
    }

    floatingTextsRef.current.push({
      id: `challenge_win_${performance.now()}`,
      text: `⚡ ${accuracyLabel}! +$${bonusCash} SKILL BONUS · QUEST READY TO CLAIM!`,
      floor: activeFloor,
      gridX: 4.4,
      gridY: 3.8,
      color: '#4ade80',
      age: 0,
    });
  };

  const filteredCatalog = useMemo(() => {
    if (buildCategory === 'ALL') return CATALOG_ITEMS;
    return CATALOG_ITEMS.filter((i) => i.category === buildCategory);
  }, [buildCategory]);

  const unclaimedQuestCount = quests.filter((q) => q.currentValue >= q.targetValue && !q.claimed).length;

  const pinnedQuests = useMemo(() => {
    return [...quests]
      .sort((a, b) => {
        const aDone = a.currentValue >= a.targetValue ? 1 : 0;
        const bDone = b.currentValue >= b.targetValue ? 1 : 0;
        if (aDone !== bDone) return bDone - aDone;
        const aPct = a.currentValue / Math.max(1, a.targetValue);
        const bPct = b.currentValue / Math.max(1, b.targetValue);
        return bPct - aPct;
      })
      .slice(0, 3);
  }, [quests]);

  const filteredQuests = useMemo(() => {
    const list =
      questCategoryFilter === 'ALL'
        ? quests
        : quests.filter((q) => q.categoryTag === questCategoryFilter);
    return [...list].sort((a, b) => {
      const aDone = a.currentValue >= a.targetValue ? 1 : 0;
      const bDone = b.currentValue >= b.targetValue ? 1 : 0;
      if (aDone !== bDone) return bDone - aDone;
      return b.currentValue / Math.max(1, b.targetValue) - a.currentValue / Math.max(1, a.targetValue);
    });
  }, [quests, questCategoryFilter]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0b0816] select-none font-sans touch-manipulation">
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
          activeDockTab === 'DECORATE' &&
          !isRemoveMode &&
          !isEditDecorMode &&
          !editingPlacedItemUid &&
          !placementModeStaff &&
          !relocatingStaffUid
            ? selectedCatalogItem
            : null
        }
        placementModeStaff={placementModeStaff}
        relocatingStaffUid={relocatingStaffUid}
        editingPlacedItemUid={editingPlacedItemUid}
        isEditDecorMode={isEditDecorMode}
        buildRotation={buildRotation}
        activeDrink={activeDrink}
        activeGenre={currentTrack.genre}
        parkingState={parkingState}
        clubMetrics={clubMetrics}
        clubBpm={selectedBpm}
        isRemoveMode={isRemoveMode}
        cameraZoom={cameraZoom}
        onZoomChange={setCameraZoom}
        cameraResetTick={cameraResetTick}
        dayNightOverrideHour={dayNightOverrideHour}
        isEcoMode={isEcoThermalMode}
        selectedSpriteId={selectedSpriteMood?.id || null}
        onSelectSprite={(info) => {
          setSelectedSpriteMood(info);
          if (info) {
            setIsMoodPanelOpen(true);
            setIsGossipOverlayOpen(false);
            setActiveTopLeftModal(null);
            setIsQuestTrackerMinimized(true);
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setActiveDockTab(null);
            }
            soundEngine.playClick();
          }
        }}
        onSpriteMoodListReport={(list) => {
          setSpriteMoodList((prev) => {
            if (!isMoodPanelOpen && !isGossipOverlayOpen && prev.length > 0) {
              return prev;
            }
            return list;
          });
          setSelectedSpriteMood((prev) => {
            if (!prev) return list[2] || list[0] || null;
            if (!isMoodPanelOpen && !isGossipOverlayOpen) return prev;
            const updated = list.find((s) => s.id === prev.id);
            return updated || prev;
          });
        }}
        activeBottleServices={activeBottleServices}
        onBottleServiceEvent={handleBottleServiceEvent}
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
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3 overflow-hidden">
        {/* -------------------------------------------------------------------
            UNIFIED NON-OVERLAPPING TWO-TIER TOP HUD BAR
            - Tier 1: Single responsive top bar (Left: Level/XP/Energy + DJ Avatar + 4 DJ Actions;
                      Center: Now Playing Card with YouTube/Spotify/Apple Music badge & controls;
                      Right: Club Open/Cash/Crowd/Gems/Rating + Throw Party + Quests Toggle)
            - Tier 2: Single exclusive dropdown slot directly below Tier 1 (either DJ Action Modal OR Live Quests Card)
                      with pointer-events-none on the row so it NEVER blocks clicks on the Mood Panel or Canvas!
           ------------------------------------------------------------------- */}
        <div className="w-full flex flex-col gap-1.5 pointer-events-none z-30">
          {/* TIER 1: MAIN UNIFIED TOP BAR */}
          <div className="pointer-events-auto w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-[#110b20]/94 backdrop-blur-md border-2 sm:border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116,0_0_20px_rgba(0,0,0,0.65)]">
            {/* LEFT GROUP: Level Badge + Compact XP/Energy + DJ Avatar + 4 DJ Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {/* Purple Square Level Badge */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#a855f7] via-[#7e22ce] to-[#4c1d95] border-2 border-[#111116] shadow-[0_2px_0_#111116] flex flex-col items-center justify-center shrink-0">
                <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-wider text-purple-200 leading-none">
                  LVL
                </span>
                <span className="text-xs sm:text-base font-black text-white leading-none mt-0.5">
                  {level}
                </span>
              </div>

              {/* Compact Stacked XP & Energy Bars */}
              <div className="flex flex-col gap-1 w-[82px] sm:w-[116px] shrink-0">
                <div className="relative h-3.5 sm:h-4 bg-[#120d24] border border-[#111116] rounded-md overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#06b6d4] via-[#22d3ee] to-[#67e8f9] transition-all duration-300"
                    style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-1 text-[7px] sm:text-[8px] font-black text-white drop-shadow-[0_1px_1px_#111116]">
                    <span>XP</span>
                    <span className="font-mono">{xp}/{xpToNextLevel}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setEnergy(maxEnergy);
                  }}
                  title="Tap to Refill DJ Energy (12/12)"
                  className="relative h-3.5 sm:h-4 bg-[#120d24] border border-[#111116] rounded-md overflow-hidden flex items-center cursor-pointer"
                >
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-lime-300 transition-all duration-300"
                    style={{ width: `${(energy / maxEnergy) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-1 text-[7px] sm:text-[8px] font-black text-white drop-shadow-[0_1px_1px_#111116]">
                    <span className="flex items-center gap-0.5">
                      <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-yellow-300 fill-yellow-300" />
                      <span>EN</span>
                    </span>
                    <span className="font-mono">{energy}/{maxEnergy}</span>
                  </div>
                </button>
              </div>

              {/* Chibi DJ Avatar Button */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveDockTab((t) => {
                    const next = t === 'DRESSING' ? null : 'DRESSING';
                    if (next) {
                      setActiveTopLeftModal(null);
                      setIsQuestTrackerMinimized(true);
                    }
                    return next;
                  });
                }}
                title="Customize DJ Avatar Streetwear"
                className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#2e1a5e] to-[#160c30] border-2 border-[#111116] shadow-[0_2px_0_#111116] flex items-center justify-center shrink-0 cursor-pointer hover:border-purple-400"
              >
                <svg viewBox="0 0 44 44" className="w-6 h-6 sm:w-8 sm:h-8">
                  <path
                    d="M11,40 C11,30 33,30 33,40 Z"
                    fill={currentAvatar.top}
                    stroke="#111116"
                    strokeWidth="2.5"
                  />
                  <circle cx="22" cy="21" r="11" fill="#f3c69f" stroke="#111116" strokeWidth="2.5" />
                  <path
                    d="M11,19 C11,8 33,8 33,19 Z"
                    fill={currentAvatar.hair}
                    stroke="#111116"
                    strokeWidth="2.4"
                  />
                  <circle cx="30" cy="11" r="3.5" fill={currentAvatar.cap} stroke="#111116" strokeWidth="2" />
                  <circle cx="18" cy="22" r="1.9" fill="#111116" />
                  <circle cx="26" cy="22" r="1.9" fill="#111116" />
                </svg>
                <span className="absolute -bottom-1 -right-1 px-1 rounded bg-purple-600 border border-[#111116] text-[6px] sm:text-[7px] font-black text-white">
                  DJ
                </span>
              </button>

              {/* 4 Compact DJ Action Buttons: GENRE, BEAT, BASS, DEDICATE */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'GENRE', label: 'STREAM', icon: '♫', cost: 1 },
                    { id: 'BEAT', label: 'BEAT', icon: '🎛️', cost: 1 },
                    { id: 'BASS', label: 'BASS', icon: '◎', cost: 2 },
                    { id: 'DEDICATE', label: 'DEDICATE', icon: '♥', cost: 2 },
                  ] as const
                ).map((btn) => {
                  const isActive =
                    (btn.id === 'GENRE' && beatStudioModalTab === 'MUSIC') ||
                    (btn.id === 'BEAT' && beatStudioModalTab === 'BEAT_MAKER') ||
                    activeTopLeftModal === btn.id;
                  return (
                    <button
                      key={btn.id}
                      onClick={() => {
                        soundEngine.playClick();
                        if (btn.id === 'GENRE') {
                          setActiveTopLeftModal(null);
                          setBeatStudioModalTab((t) => (t === 'MUSIC' ? null : 'MUSIC'));
                        } else if (btn.id === 'BEAT') {
                          setActiveTopLeftModal(null);
                          setBeatStudioModalTab((t) => (t === 'BEAT_MAKER' ? null : 'BEAT_MAKER'));
                        } else {
                          setBeatStudioModalTab(null);
                          setIsQuestTrackerMinimized(true);
                          setActiveTopLeftModal((m) => (m === btn.id ? null : btn.id));
                        }
                      }}
                      title={`${btn.label} (⚡${btn.cost})`}
                      className={`relative px-1.5 py-1 sm:px-2 sm:py-1 rounded-xl border-2 flex items-center gap-1 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-purple-600 border-cyan-300 text-white shadow-[0_0_10px_rgba(34,211,238,0.45)]'
                          : 'bg-[#1c1236] hover:bg-[#28194d] border-[#111116] text-purple-100'
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs">{btn.icon}</span>
                      <span className="hidden xl:inline text-[9px] font-black tracking-wider">
                        {btn.label}
                      </span>
                      <span className="px-1 rounded-full bg-[#facc15] text-[#111116] text-[7px] font-black leading-tight">
                        ⚡{btn.cost}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CENTER GROUP: UNIFIED "NOW PLAYING" & STREAMING HUB CARD (BPM-SYNCED GLOW + SMOOTH TRACK FADE-OUT) */}
            <div
              className={`relative overflow-hidden flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl border-2 min-w-0 flex-1 max-w-full sm:max-w-[445px] transition-all duration-150 ${
                trackFadePhase === 'FADING_OUT'
                  ? 'bg-[#120b24]/95 border-fuchsia-400/80 shadow-[0_0_24px_rgba(232,121,249,0.55)] scale-[0.985]'
                  : trackFadePhase === 'FADING_IN'
                  ? 'bg-[#1d1238]/98 border-cyan-300 shadow-[0_0_26px_rgba(34,211,238,0.75)] scale-[1.01]'
                  : isBpmDownbeat
                  ? displayedTrack.streamingSource === 'YOUTUBE'
                    ? 'bg-[#21102e]/98 border-[#FF0000] shadow-[0_0_22px_rgba(255,0,0,0.68),inset_0_0_12px_rgba(255,0,0,0.22)]'
                    : displayedTrack.streamingSource === 'SPOTIFY'
                    ? 'bg-[#122628]/98 border-[#1DB954] shadow-[0_0_22px_rgba(29,185,84,0.68),inset_0_0_12px_rgba(29,185,84,0.22)]'
                    : displayedTrack.streamingSource === 'APPLE'
                    ? 'bg-[#261028]/98 border-[#FA243C] shadow-[0_0_22px_rgba(250,36,60,0.68),inset_0_0_12px_rgba(250,36,60,0.22)]'
                    : 'bg-[#1e133a]/98 border-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.68),inset_0_0_12px_rgba(168,85,247,0.28)]'
                  : isBpmHalfBeat
                  ? 'bg-[#1a1133]/96 border-purple-400/80 shadow-[0_0_14px_rgba(168,85,247,0.42)]'
                  : 'bg-[#18102e]/95 border-[#111116] shadow-inner'
              }`}
            >
              {/* Subtle BPM-Synced Ambient Backlight & Track-Change Crossfade Sweep */}
              <div
                className={`pointer-events-none absolute inset-0 transition-opacity duration-150 ${
                  trackFadePhase === 'FADING_OUT'
                    ? 'opacity-45 bg-gradient-to-r from-fuchsia-500/30 via-cyan-400/25 to-purple-600/30'
                    : isBpmDownbeat
                    ? 'opacity-30 bg-gradient-to-r from-cyan-400/25 via-fuchsia-500/20 to-transparent'
                    : isBpmHalfBeat
                    ? 'opacity-15 bg-gradient-to-r from-purple-500/15 via-cyan-400/10 to-transparent'
                    : 'opacity-0'
                }`}
              />

              {/* Bottom BPM Beat Pulse Line */}
              <div
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-100 ${
                  !isPlayingMusicActive
                    ? 'opacity-0'
                    : isBpmDownbeat
                    ? 'opacity-100 bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 scale-x-100'
                    : isBpmHalfBeat
                    ? 'opacity-70 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-500 scale-x-95'
                    : 'opacity-25 bg-purple-600/50 scale-x-90'
                }`}
              />

              {(!isAudioReady || isMuted || isMusicPaused) && (
                <button
                  onClick={() => {
                    setIsMuted(false);
                    setIsMusicPaused(false);
                    soundEngine.setMuted(false);
                    soundEngine.setPaused(false);
                    soundEngine.unlockAudio();
                    streamingMusicManager.play();
                    soundEngine.playBeatStep(clubMetrics.hypeSegments);
                  }}
                  className="relative z-10 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span>PLAY</span>
                </button>
              )}

              {/* Album Thumbnail or Spinning Turntable Disc + Track Metadata (Smoothly Fades Out & In on Track Change) */}
              <div
                onClick={() => {
                  soundEngine.unlockAudio();
                  soundEngine.playClick();
                  setBeatStudioModalTab('MUSIC');
                }}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 cursor-pointer group transition-all duration-200 ease-out ${
                  trackFadePhase === 'FADING_OUT'
                    ? 'opacity-0 -translate-y-1 scale-95 blur-[1px]'
                    : trackFadePhase === 'FADING_IN'
                    ? 'opacity-100 translate-y-0 scale-100 blur-0'
                    : 'opacity-100 translate-y-0 scale-100'
                }`}
                title="Click to open Beat Studio & Streaming Hub (YouTube, Spotify, Apple Music)"
              >
                {displayedTrack.thumbnailUrl ? (
                  <img
                    src={displayedTrack.thumbnailUrl}
                    alt={displayedTrack.title}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border-2 shrink-0 transition-transform duration-100 ${
                      isBpmDownbeat
                        ? 'scale-110 border-cyan-300 ring-2 ring-cyan-400/70'
                        : isPlayingMusicActive
                        ? 'scale-100 border-[#111116] ring-1 ring-cyan-400/40'
                        : 'border-[#111116]'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 border-2 flex items-center justify-center shrink-0 text-xs font-black text-white transition-transform duration-100 ${
                      isPlayingMusicActive ? 'animate-spin' : ''
                    } ${
                      isBpmDownbeat
                        ? 'scale-110 border-white shadow-[0_0_12px_rgba(34,211,238,0.9)]'
                        : 'border-[#111116]'
                    }`}
                  >
                    ♫
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {/* Streaming Service Badge */}
                    {displayedTrack.streamingSource === 'YOUTUBE' ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#FF0000] text-white text-[7px] sm:text-[8px] font-black uppercase shrink-0">
                        ▶ YT
                      </span>
                    ) : displayedTrack.streamingSource === 'SPOTIFY' ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#1DB954] text-slate-950 text-[7px] sm:text-[8px] font-black uppercase shrink-0">
                        ● SPOTIFY
                      </span>
                    ) : displayedTrack.streamingSource === 'APPLE' ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#FA243C] text-white text-[7px] sm:text-[8px] font-black uppercase shrink-0">
                         APPLE
                      </span>
                    ) : displayedTrack.customAudioUrl ? (
                      <span className="px-1.5 py-0.2 rounded bg-pink-500 text-white text-[7px] sm:text-[8px] font-black uppercase shrink-0">
                        MP3
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-purple-600 text-white text-[7px] sm:text-[8px] font-black uppercase shrink-0">
                        SYNTH
                      </span>
                    )}

                    <span
                      className={`text-[9px] sm:text-[11px] font-black truncate transition-colors duration-100 ${
                        isBpmDownbeat
                          ? 'text-cyan-200 drop-shadow-[0_0_6px_rgba(34,211,238,0.65)]'
                          : 'text-white group-hover:text-cyan-300'
                      }`}
                    >
                      {displayedTrack.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-mono text-purple-300 truncate">
                    <span className="truncate">{displayedTrack.artist}</span>
                    <span>·</span>
                    <span
                      className={`font-bold shrink-0 transition-colors duration-100 ${
                        isBpmDownbeat ? 'text-amber-300' : 'text-cyan-300'
                      }`}
                    >
                      {selectedBpm} BPM
                    </span>

                    {/* 4-Bar BPM-Synced Mini Equalizer */}
                    <span
                      className="hidden sm:inline-flex items-end gap-[1.5px] h-2.5 px-1 shrink-0"
                      title={`Pulsing at ${selectedBpm} BPM`}
                    >
                      <span
                        className={`w-[2px] rounded-full transition-all duration-75 ${
                          !isPlayingMusicActive
                            ? 'h-1 bg-purple-500/40'
                            : beatStep % 4 === 0
                            ? 'h-2.5 bg-cyan-300'
                            : beatStep % 4 === 2
                            ? 'h-2 bg-cyan-400'
                            : 'h-1 bg-purple-400'
                        }`}
                      />
                      <span
                        className={`w-[2px] rounded-full transition-all duration-75 ${
                          !isPlayingMusicActive
                            ? 'h-1 bg-purple-500/40'
                            : beatStep % 4 === 1
                            ? 'h-2.5 bg-fuchsia-400'
                            : beatStep % 4 === 0
                            ? 'h-2 bg-pink-400'
                            : 'h-1 bg-purple-400'
                        }`}
                      />
                      <span
                        className={`w-[2px] rounded-full transition-all duration-75 ${
                          !isPlayingMusicActive
                            ? 'h-1 bg-purple-500/40'
                            : beatStep % 4 === 2
                            ? 'h-2.5 bg-emerald-300'
                            : beatStep % 4 === 0
                            ? 'h-2 bg-cyan-300'
                            : 'h-1 bg-purple-400'
                        }`}
                      />
                      <span
                        className={`w-[2px] rounded-full transition-all duration-75 ${
                          !isPlayingMusicActive
                            ? 'h-1 bg-purple-500/40'
                            : beatStep % 4 === 3
                            ? 'h-2.5 bg-amber-300'
                            : beatStep % 4 === 1
                            ? 'h-2 bg-yellow-300'
                            : 'h-1 bg-purple-400'
                        }`}
                      />
                    </span>

                    <span className="hidden md:inline-flex items-center gap-1 font-black uppercase shrink-0 text-fuchsia-300">
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block transition-transform duration-100 ${
                          isBpmDownbeat
                            ? 'bg-cyan-300 scale-125 shadow-[0_0_6px_#22d3ee]'
                            : 'bg-fuchsia-400'
                        }`}
                      />
                      {displayedTrack.genre}
                    </span>
                  </div>
                </div>
              </div>

              {/* Unified Playback Controls: Pause/Play, Next/Change, Open Hub, Mute */}
              <div className="relative z-10 flex items-center gap-1 shrink-0">
                <button
                  onClick={handleTogglePauseMusic}
                  title={isMusicPaused ? 'Resume Playback' : 'Pause Playback'}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#251842] hover:bg-[#36225e] border border-[#111116] text-cyan-300 flex items-center justify-center cursor-pointer"
                >
                  {isMusicPaused ? (
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </button>
                <button
                  onClick={handleNextClubTrack}
                  title="Spin Next Track in Queue"
                  className="px-1.5 h-6 sm:h-7 rounded-lg bg-purple-700 hover:bg-purple-600 border border-[#111116] text-[8px] sm:text-[9px] font-black uppercase text-white flex items-center justify-center cursor-pointer"
                >
                  NEXT ⏭
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setBeatStudioModalTab('MUSIC');
                  }}
                  title="Open Streaming Hub (YouTube, Spotify, Apple Music)"
                  className="hidden sm:flex px-1.5 h-7 rounded-lg bg-cyan-400 hover:bg-cyan-300 border border-[#111116] text-[9px] font-black uppercase text-slate-950 items-center justify-center cursor-pointer"
                >
                  CHANGE
                </button>
                <button
                  onClick={handleToggleMuteMusic}
                  title={isMuted ? 'Unmute Club Audio' : 'Mute Club Audio'}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-[#111116] flex items-center justify-center cursor-pointer ${
                    isMuted
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#251842] hover:bg-[#36225e] text-emerald-300'
                  }`}
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT GROUP: Club Status, Cash, Crowd, Gems, Stars, Throw Party, Quests Toggle */}
            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
              {/* Club Name & OPEN Status Button (Desktop) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsClubOpenStatus((prev) => !prev);
                }}
                title="Click to toggle OPEN / VIP PRIVATE status"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18102e] border border-purple-500/40 cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isClubOpenStatus
                      ? 'bg-emerald-400 shadow-[0_0_6px_#4ade80]'
                      : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                />
                <span className="text-[11px] font-black tracking-wider text-white">
                  {clubName}
                </span>
              </button>

              {/* Cash Pill */}
              <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#18102e] border border-[#111116]">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center">
                  $
                </span>
                <span className="text-[10px] sm:text-xs font-black text-emerald-300 tabular-nums">
                  ${cash.toLocaleString()}
                </span>
              </div>

              {/* Crowd & Queue Pill */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsMoodPanelOpen((o) => {
                    const next = !o;
                    if (next) {
                      setIsGossipOverlayOpen(false);
                      setActiveTopLeftModal(null);
                      setIsQuestTrackerMinimized(true);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setActiveDockTab(null);
                      }
                    }
                    return next;
                  });
                }}
                title="Inside Crowd & Red Carpet Door Line (Click to toggle Sprite Moods)"
                className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border cursor-pointer transition-colors ${
                  isMoodPanelOpen
                    ? 'bg-cyan-400 text-slate-950 border-white font-black'
                    : 'bg-[#18102e] border-[#111116] hover:border-cyan-400 text-white'
                }`}
              >
                <span
                  className={`text-[8px] sm:text-[9px] font-black uppercase ${
                    isMoodPanelOpen ? 'text-slate-950' : 'text-cyan-300'
                  }`}
                >
                  CROWD
                </span>
                <span className="text-[10px] sm:text-xs font-black tabular-nums">
                  {guestsRef.current.filter((g) => g.state !== 'QUEUEING').length}/{clubMetrics.maxGuests}
                </span>
                {queueCount > 0 && (
                  <span className="hidden md:inline-block px-1 rounded-full bg-rose-500/30 text-[8px] font-black text-rose-200">
                    +{queueCount}
                  </span>
                )}
              </button>

              {/* Gems Pill */}
              <div className="flex items-center gap-1 pl-2 pr-1 py-0.5 sm:py-1 rounded-full bg-[#18102e] border border-[#111116]">
                <span className="text-[10px] sm:text-xs">💎</span>
                <span className="text-[10px] sm:text-xs font-black text-fuchsia-300 tabular-nums">
                  {gems}
                </span>
                <button
                  onClick={() => {
                    setGems((g) => g + 5);
                    soundEngine.playCashRegister();
                  }}
                  title="Add +5 Gems"
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5 stroke-[3]" />
                </button>
              </div>

              {/* Star Rating Pill */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-[#18102e] border border-[#111116]">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-black text-yellow-300 tabular-nums">{starRating}</span>
              </div>

              {/* THROW A PARTY Button */}
              <button
                onClick={handleThrowParty}
                className="px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-[#ec4899] via-[#d946ef] to-[#a855f7] hover:brightness-110 border-2 border-[#111116] shadow-[0_2px_0_#111116] text-white font-black text-[9px] sm:text-[11px] tracking-wider uppercase flex items-center gap-1 cursor-pointer active:translate-y-0.5"
              >
                <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300 shrink-0" />
                <span className="hidden sm:inline">THROW</span>
                <span>PARTY</span>
              </button>

              {/* Quests Dropdown Toggle Pill */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setIsQuestTrackerMinimized((min) => {
                    const nextMin = !min;
                    if (!nextMin) {
                      setActiveTopLeftModal(null);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsMoodPanelOpen(false);
                        setIsGossipOverlayOpen(false);
                        setActiveDockTab(null);
                      }
                    }
                    return nextMin;
                  });
                }}
                className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-full border-2 flex items-center gap-1 cursor-pointer transition-all ${
                  !isQuestTrackerMinimized
                    ? 'bg-amber-400 text-slate-950 border-white font-black'
                    : 'bg-[#18102e] text-amber-300 border-amber-400/80 hover:border-cyan-300 font-black'
                }`}
              >
                <span className="text-[10px] sm:text-xs">🏆</span>
                <span className="text-[9px] sm:text-[10px] uppercase">
                  {unclaimedQuestCount > 0 ? `${unclaimedQuestCount} READY!` : `Quests (${questStreakMultiplier}x)`}
                </span>
              </button>

              {/* Quick Edit Decor Toggle (Desktop) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  const next = !isEditDecorMode;
                  setIsEditDecorMode(next);
                  setIsRemoveMode(false);
                  if (!next) setEditingPlacedItemUid(null);
                }}
                title="Edit Position of Placed Decorations on the Floor"
                className={`hidden lg:flex px-2 py-1 rounded-full border-2 border-[#111116] items-center gap-1 text-[9px] font-black cursor-pointer ${
                  isEditDecorMode || editingPlacedItemUid
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-[#18102e] text-cyan-300 hover:border-cyan-400'
                }`}
              >
                <span>✥ {isEditDecorMode || editingPlacedItemUid ? 'EDITING' : 'DECOR'}</span>
              </button>
            </div>
          </div>

          {/* TIER 2: NON-OVERLAPPING SUB-BAR / DROPDOWN SLOT (Only ONE panel opens at a time below Tier 1) */}
          {(activeTopLeftModal || !isQuestTrackerMinimized) && (
            <div className="w-full flex items-start justify-between gap-2 pointer-events-none">
              {/* Left Dropdown Slot: DJ Action Panel (BASS / DEDICATE / GENRE) */}
              {activeTopLeftModal && (
                <div className="pointer-events-auto w-[290px] sm:w-[340px] p-3 rounded-2xl bg-[#160f2b]/98 border-[2.5px] border-purple-400 shadow-2xl text-white space-y-2">
                  <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      {activeTopLeftModal === 'GENRE' && 'Switch Music Genre & Mood (⚡1)'}
                      {activeTopLeftModal === 'BASS' && 'Bass Cannon & Tempo Boost (⚡2)'}
                      {activeTopLeftModal === 'DEDICATE' && 'Dedicate Song to Crowd (⚡2)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTopLeftModal(null);
                      }}
                      className="px-2 py-1 min-h-[28px] rounded-lg bg-rose-600/90 hover:bg-rose-500 flex items-center gap-1 text-white font-black text-[10px] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>CLOSE</span>
                    </button>
                  </div>

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
                          handleTriggerBassDrop();
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
                          advanceQuestProgress('DJ_HYPE_DROP', 1);
                          advanceQuestProgress('CLUB_REVENUE', 280);
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

              {/* Right Dropdown Slot: Expanded Live Quests & Jackpot Tracker (only when !isQuestTrackerMinimized and no left modal open) */}
              {!isQuestTrackerMinimized && !activeTopLeftModal && (
                <div className="pointer-events-auto ml-auto w-[270px] sm:w-[290px] rounded-2xl bg-[#130d24]/98 backdrop-blur-md border-[2.5px] border-[#111116] shadow-[0_5px_0_#111116,0_0_20px_rgba(250,204,21,0.22)] p-2 text-white space-y-1.5">
                  <div className="flex items-center justify-between gap-1 border-b border-purple-500/30 pb-1">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveDockTab((t) => (t === 'TROPHIES' ? null : 'TROPHIES'));
                      }}
                      className="flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <span className="text-xs">🏆</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                        LIVE QUESTS
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black text-[9px]">
                        🔥 {questStreakMultiplier}x
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {jackpotProgress >= 3 ? (
                        <button
                          onClick={handleClaimJackpotChest}
                          className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-300 via-yellow-400 to-pink-400 text-slate-950 font-black text-[9px] uppercase animate-pulse cursor-pointer border border-[#111116]"
                        >
                          🎁 OPEN JACKPOT!
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            setActiveDockTab('TROPHIES');
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-950 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-200 cursor-pointer"
                        >
                          🎁 {jackpotProgress}/3 Chest
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setIsQuestTrackerMinimized(true);
                        }}
                        title="Minimize Quest Tracker"
                        className="w-6 h-6 rounded-lg bg-rose-600/80 hover:bg-rose-500 flex items-center justify-center text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {pinnedQuests.slice(0, 2).map((q) => {
                      const isReady = q.currentValue >= q.targetValue;
                      const pct = Math.min(
                        100,
                        Math.round((q.currentValue / Math.max(1, q.targetValue)) * 100)
                      );
                      const boostedCash = Math.round(q.rewardCash * questStreakMultiplier);
                      return (
                        <div
                          key={q.id}
                          className={`p-1.5 rounded-xl border transition-all ${
                            isReady
                              ? 'bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-purple-900/50 border-amber-300'
                              : 'bg-[#1b1233]/90 border-purple-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs shrink-0">{q.badgeEmoji}</span>
                              <span className="text-[11px] font-black text-white truncate">
                                {q.title}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-cyan-300 shrink-0">
                              {q.track === 'CLUB_REVENUE'
                                ? `$${q.currentValue}/$${q.targetValue}`
                                : `${q.currentValue}/${q.targetValue}`}
                            </span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-[#090514] overflow-hidden my-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isReady
                                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400'
                                  : 'bg-gradient-to-r from-fuchsia-500 to-cyan-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-mono font-bold text-emerald-300">
                              +${boostedCash} · +{q.rewardGems}💎
                            </span>
                            {isReady ? (
                              <button
                                onClick={() => handleClaimQuest(q.id)}
                                className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black text-[9px] uppercase cursor-pointer border border-[#111116] shadow"
                              >
                                🎁 CLAIM ({questStreakMultiplier}x)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuestQuickAction(q)}
                                className="px-2 py-0.5 rounded-md bg-cyan-400/20 hover:bg-cyan-400/35 border border-cyan-400/60 text-cyan-200 font-black text-[9px] uppercase cursor-pointer"
                              >
                                ⚡ {q.actionLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STREAMING OR VIP BOTTLE TOAST NOTIFICATION BANNER */}
          {(streamState.toastMessage || vipBottleToast) && (
            <div className="pointer-events-auto mx-auto px-3.5 py-1.5 rounded-xl bg-[#18102e]/98 border-2 border-amber-300 shadow-lg text-xs font-black text-amber-200 flex items-center gap-2">
              <span>{vipBottleToast ? '🍾' : '🎧'}</span>
              <span>{vipBottleToast || streamState.toastMessage}</span>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------
            MIDDLE ZONE: SIDE SPRITE MOOD PANEL + CLUB GOSSIP OVERLAY + FAR-RIGHT VERTICAL VIBE THERMOMETER & ZOOM
           ------------------------------------------------------------------- */}
        <div className="flex-1 flex items-center justify-between relative my-1 min-h-0">
          {/* ==================== LEFT-SIDE SPRITE MOOD INSPECTOR & CLUB GOSSIP FEED OVERLAY ==================== */}
          <div
            className={`pointer-events-auto self-start mt-1 flex flex-col gap-1.5 z-40 ${
              activeDockTab || activeTopLeftModal ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {!isMoodPanelOpen ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsMoodPanelOpen(true);
                  setIsGossipOverlayOpen(false);
                  setActiveTopLeftModal(null);
                  setIsQuestTrackerMinimized(true);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setActiveDockTab(null);
                  }
                }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl bg-[#130d24]/94 border-2 sm:border-[2.5px] border-[#111116] shadow-[0_3px_0_#111116] sm:shadow-[0_4px_0_#111116] text-left flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:border-cyan-400 transition-all"
              >
                <span className="text-sm sm:text-base">{selectedSpriteMood?.moodEmoji || '🔥'}</span>
                <div>
                  <div className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                    MOODS ({spriteMoodList.length})
                  </div>
                  <div className="text-[10px] sm:text-xs font-black text-white max-w-[115px] sm:max-w-none truncate">
                    {selectedSpriteMood
                      ? `${selectedSpriteMood.name}: ${selectedSpriteMood.moodLabel}`
                      : 'Tap Sprite'}
                  </div>
                </div>
              </button>
            ) : (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="w-[255px] sm:w-[280px] max-h-[54vh] sm:max-h-[60vh] overflow-y-auto rounded-2xl bg-[#130d24]/98 backdrop-blur-md border-[2.5px] border-[#111116] ring-1 ring-cyan-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.85)] p-2.5 text-white flex flex-col gap-2"
              >
                {/* Sticky Mood Panel Header with Guaranteed-Clickable CLOSE Button */}
                <div className="sticky top-0 z-20 bg-[#130d24] flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs">💬</span>
                    <div className="min-w-0">
                      <div className="text-[8px] font-mono uppercase tracking-widest text-cyan-300 leading-none">
                        TAP ANY SPRITE ON FLOOR
                      </div>
                      <div className="text-xs font-black text-white leading-tight mt-0.5 truncate">
                        SPRITE &amp; CROWD MOODS
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playClick();
                      setIsMoodPanelOpen(false);
                    }}
                    title="Close Mood Panel"
                    className="px-2.5 py-1 min-h-[30px] rounded-lg bg-rose-600 hover:bg-rose-500 border border-[#111116] flex items-center justify-center gap-1 text-white font-black text-[10px] uppercase cursor-pointer shrink-0 shadow"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.8]" />
                    <span>CLOSE</span>
                  </button>
                </div>

                {/* Inline VIP Bottle Confirmation Badge inside Mood Panel */}
                {vipBottleToast && (
                  <div className="px-2 py-1 rounded-lg bg-amber-400/20 border border-amber-300 text-[10px] font-black text-amber-200 leading-snug">
                    {vipBottleToast}
                  </div>
                )}

                {/* Selected Sprite Live Mood Card */}
                {selectedSpriteMood ? (
                  <div className="p-2 rounded-xl bg-[#1b1233] border border-purple-500/30 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: selectedSpriteMood.shirtColor }}
                        >
                          {selectedSpriteMood.moodEmoji}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {selectedSpriteMood.name}
                          </div>
                          <div className="text-[9px] font-mono text-purple-300 uppercase">
                            {selectedSpriteMood.role.replace('_', ' ')} · Fav:{' '}
                            <span className="text-cyan-300">{selectedSpriteMood.favoriteGenre}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 text-slate-950"
                        style={{ backgroundColor: selectedSpriteMood.moodColor }}
                      >
                        {selectedSpriteMood.moodLabel}
                      </span>
                    </div>

                    {/* Mood Score Meter */}
                    <div className="w-full h-2 rounded-full bg-[#090514] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedSpriteMood.moodScore}%`,
                          backgroundColor: selectedSpriteMood.moodColor,
                        }}
                      />
                    </div>

                    <div className="text-[10px] font-bold text-cyan-200 leading-snug">
                      {selectedSpriteMood.activity}
                    </div>
                    <div className="text-[10px] italic text-purple-200 bg-[#120b24] px-2 py-1 rounded-lg">
                      &ldquo;{selectedSpriteMood.thought}&rdquo;
                    </div>

                    <div className="flex flex-col gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.playCashRegister();
                          setCash((c) => c + 120);
                          addXp(25);
                          advanceQuestProgress('MOOD_BOOST', 1);
                          advanceQuestProgress('CLUB_REVENUE', 120);
                          const g = guestsRef.current.find((x) => x.id === selectedSpriteMood.id);
                          if (g) {
                            g.hype = 100;
                            g.chatText = 'VIP Drink on the house?! Best club ever!! 🔥';
                            g.chatTimer = 6.5;
                          }
                          setSelectedSpriteMood((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  moodLabel: 'ECSTATIC',
                                  moodEmoji: '🔥',
                                  moodColor: '#4ade80',
                                  moodScore: 100,
                                  thought: 'VIP Drink on the house?! Best club ever!! 🔥',
                                }
                              : null
                          );
                          showVipBottleConfirmationToast(
                            `⚡ Boosted ${selectedSpriteMood.name} to ECSTATIC! +$120 VIP Tip!`
                          );
                          floatingTextsRef.current.push({
                            id: `mood_boost_${performance.now()}`,
                            text: `🔥 ${selectedSpriteMood.name.toUpperCase()} MOOD ECSTATIC! +$120 TIP`,
                            floor: activeFloor,
                            gridX: g ? g.gridX : 4,
                            gridY: g ? g.gridY : 4,
                            color: '#4ade80',
                            age: 0,
                          });
                        }}
                        className="w-full py-1.5 px-2 min-h-[32px] rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-[10px] uppercase tracking-wider cursor-pointer shadow active:scale-[0.99]"
                      >
                        ⚡ Boost Mood (+$120 VIP Tip)
                      </button>

                      {/* Guaranteed VIP Bottle Service Button in Mood Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const servedBoothUid = triggerGuaranteedVipBottleService({
                            customTray: selectedBottleTray,
                            actorName: selectedSpriteMood.name,
                            preferredBoothUid: selectedSpriteMood.boothUid,
                            targetGuestId: selectedSpriteMood.id,
                          });
                          setSelectedSpriteMood((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  role: 'VIP_GUEST',
                                  moodLabel: 'ECSTATIC',
                                  moodEmoji: '🍾',
                                  moodColor: '#facc15',
                                  moodScore: 100,
                                  activity: `VIP Bottle Service (${selectedBottleTray.name} · ${selectedBottleTray.spendingMultiplier}x Spend)`,
                                  thought: `Popping ${selectedBottleTray.name} with sparklers in VIP! 🍾✨`,
                                  boothUid: servedBoothUid || prev.boothUid,
                                }
                              : null
                          );
                        }}
                        className="w-full py-1.5 px-2 min-h-[32px] rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-400 hover:from-amber-300 hover:to-pink-300 text-slate-950 font-black text-[10px] uppercase tracking-wider cursor-pointer shadow active:scale-[0.99]"
                      >
                        🍾 Serve VIP Bottle Tray (+${selectedBottleTray.price} · +
                        {selectedBottleTray.hypeBoost}⚡)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-[#1b1233] text-[11px] text-purple-200">
                    Tap any dancer, VIP guest, queued customer, pedestrian, DJ, or bartender to inspect their mood!
                  </div>
                )}

                {/* Live Scrollable List of Sprites & Their Moods */}
                <div className="max-h-32 overflow-y-auto space-y-1 pr-0.5">
                  {spriteMoodList.slice(0, 14).map((sp) => {
                    const isSel = selectedSpriteMood?.id === sp.id;
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => {
                          setSelectedSpriteMood(sp);
                          soundEngine.playClick();
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                          isSel
                            ? 'bg-purple-700/70 border border-cyan-300'
                            : 'bg-[#18102c] hover:bg-[#231740]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs shrink-0">{sp.moodEmoji}</span>
                          <span className="text-[10px] font-black text-white truncate">
                            {sp.name}
                          </span>
                        </div>
                        <span
                          className="text-[9px] font-black uppercase shrink-0"
                          style={{ color: sp.moodColor }}
                        >
                          {sp.moodLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== CLUB GOSSIP FEED TICKER & OVERLAY ==================== */}
            {!isGossipOverlayOpen ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsGossipOverlayOpen(true);
                  setUnreadGossipCount(0);
                  setIsMoodPanelOpen(false);
                  setActiveTopLeftModal(null);
                  setIsQuestTrackerMinimized(true);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setActiveDockTab(null);
                  }
                }}
                className="relative px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#170e2e]/96 via-[#241346]/96 to-[#170e2e]/96 border-2 sm:border-[2.5px] border-[#111116] shadow-[0_3px_0_#111116,0_0_16px_rgba(236,72,153,0.3)] text-left flex items-center gap-2 cursor-pointer hover:border-pink-400 transition-all max-w-[195px] sm:max-w-[265px]"
              >
                {unreadGossipCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 border border-[#111116] text-[8px] font-black text-slate-950 shadow animate-bounce">
                    +{unreadGossipCount} TEA
                  </span>
                )}
                <span className="text-sm sm:text-base shrink-0">📱</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-pink-300 font-black">
                      CLUB GOSSIP
                    </span>
                    <span className="px-1 py-0.1 rounded bg-pink-500/25 border border-pink-400/40 text-[7px] sm:text-[8px] font-mono font-black text-amber-300">
                      🔥 {gossipHypeMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[11px] font-bold text-white truncate mt-0.5">
                    {gossipFeed[0]
                      ? `${gossipFeed[0].authorEmoji} ${gossipFeed[0].authorName}: "${gossipFeed[0].message}"`
                      : 'Tap to read overheard guest thoughts!'}
                  </div>
                </div>
              </button>
            ) : (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="w-[265px] sm:w-[325px] max-h-[54vh] sm:max-h-[60vh] rounded-2xl bg-[#130d24]/98 backdrop-blur-md border-[2.5px] border-[#111116] ring-2 ring-pink-500/45 shadow-[0_8px_24px_rgba(0,0,0,0.85)] p-2.5 text-white flex flex-col gap-2"
              >
                {/* Gossip Overlay Header */}
                <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">📱</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-pink-300 leading-none">
                          LIVE GUEST THOUGHT FEED
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase ${
                            gossipHypeMultiplier >= 2.8
                              ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 animate-pulse'
                              : 'bg-purple-900 text-cyan-300 border border-cyan-400/40'
                          }`}
                        >
                          {gossipHypeMultiplier >= 2.8
                            ? `🔥 VIRAL FRENZY ${gossipHypeMultiplier.toFixed(1)}x`
                            : gossipHypeMultiplier >= 1.8
                            ? `⚡ HOT TEA ${gossipHypeMultiplier.toFixed(1)}x`
                            : `💬 CHILL BUZZ ${gossipHypeMultiplier.toFixed(1)}x`}
                        </span>
                      </div>
                      <div className="text-xs font-black text-white leading-tight mt-0.5">
                        CLUB GOSSIP &amp; OVERHEARD TEA
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playClick();
                      setIsGossipOverlayOpen(false);
                    }}
                    title="Close Club Gossip Overlay"
                    className="px-2.5 py-1 min-h-[30px] rounded-lg bg-rose-600 hover:bg-rose-500 border border-[#111116] flex items-center justify-center gap-1 text-white font-black text-[10px] uppercase cursor-pointer shrink-0 shadow"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.8]" />
                    <span>CLOSE</span>
                  </button>
                </div>

                {/* Crowd Hype -> Gossip Velocity Meter */}
                <div className="p-2 rounded-xl bg-[#1b1233] border border-pink-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-purple-200 font-bold">
                      CROWD HYPE ({clubMetrics.totalHype}⚡ · {vibeThermometerPercent}% VIBE)
                    </span>
                    <span className="text-amber-300 font-black">
                      1 Post / {(gossipIntervalMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#090514] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((gossipHypeMultiplier / 4.5) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 pt-0.5">
                    <button
                      onClick={() => {
                        soundEngine.playCashRegister();
                        generateGossipPostFromSimulation('MANUAL_SPILL');
                        setCash((c) => c + 95);
                        addXp(25);
                        advanceQuestProgress('MOOD_BOOST', 1);
                        advanceQuestProgress('CLUB_REVENUE', 95);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 hover:from-pink-400 hover:to-cyan-300 text-slate-950 font-black text-[9px] uppercase tracking-wider cursor-pointer shadow"
                    >
                      ⚡ Overhear Thought (+$95)
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playUpgradeFanfare();
                        setHypeSurgeBonus((prev) => Math.min(220, prev + 55));
                        triggerHypeBlast(45, clubMetrics.totalHype + 45, clubMetrics.tipBonus);
                        generateGossipPostFromSimulation('PARTY_SURGE');
                      }}
                      title="Surge Crowd Hype to accelerate the Club Gossip feed!"
                      className="py-1 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[9px] uppercase cursor-pointer shadow shrink-0"
                    >
                      🔥 +55 Hype
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {(
                    [
                      { id: 'ALL', label: 'ALL' },
                      { id: 'DANCE_FLOOR', label: '💃 FLOOR' },
                      { id: 'VIP_TEA', label: '🍾 VIP' },
                      { id: 'BAR_BUZZ', label: '🍸 BAR' },
                      { id: 'RED_CARPET', label: '🚧 DOOR' },
                      { id: 'DJ_BOOTH', label: '🎧 DJ' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        soundEngine.playClick();
                        setGossipFilter(cat.id);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase shrink-0 cursor-pointer border ${
                        gossipFilter === cat.id
                          ? 'bg-pink-500 text-white border-cyan-300'
                          : 'bg-[#1b1233] text-purple-300 border-purple-500/30 hover:bg-purple-900/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Live Scrollable Gossip Posts Derived from Guest Thoughts */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 max-h-[30vh] sm:max-h-[36vh]">
                  {gossipFeed
                    .filter((post) => gossipFilter === 'ALL' || post.category === gossipFilter)
                    .map((post) => (
                      <div
                        key={post.id}
                        className={`p-2 rounded-xl border transition-all space-y-1 ${
                          post.isViralHypePost
                            ? 'bg-gradient-to-br from-[#261447] via-[#1c1036] to-[#2d123d] border-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                            : 'bg-[#19112e] border-purple-500/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 border border-[#111116]"
                              style={{ backgroundColor: post.authorColor }}
                            >
                              {post.authorEmoji}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-white truncate">
                                {post.authorName}
                              </div>
                              <div className="text-[8px] font-mono text-purple-300 truncate">
                                {post.authorHandle} · {post.timestampLabel}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {post.isViralHypePost && (
                              <span className="px-1 py-0.2 rounded bg-amber-400/20 border border-amber-300/60 text-[7px] font-black text-amber-300 uppercase">
                                🔥 HIGH HYPE
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/40 text-[7px] font-mono font-bold text-cyan-300 uppercase">
                              {post.categoryLabel}
                            </span>
                          </div>
                        </div>

                        {/* Funny / Simulation-Relevant Gossip Message */}
                        <p className="text-[10px] font-bold text-white leading-snug">
                          {post.message}
                        </p>

                        {/* Source Guest Thought Badge */}
                        <div className="px-1.5 py-1 rounded-lg bg-[#100a20] border border-purple-500/20 text-[9px] italic text-cyan-200/90 truncate">
                          💭 Thought: &ldquo;{post.sourceThought}&rdquo;
                        </div>

                        {/* Interactive Post Footer: Hype Reaction (+Tips) & Spot Guest on Floor */}
                        <div className="flex items-center justify-between pt-0.5">
                          <button
                            onClick={() => {
                              if (post.userReacted) return;
                              soundEngine.playCashRegister();
                              setCash((c) => c + 45);
                              addXp(12);
                              advanceQuestProgress('CLUB_REVENUE', 45);
                              setGossipFeed((prev) =>
                                prev.map((item) =>
                                  item.id === post.id
                                    ? {
                                        ...item,
                                        likes: item.likes + 1,
                                        fireReactions: item.fireReactions + 1,
                                        userReacted: true,
                                      }
                                    : item
                                )
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center gap-1 cursor-pointer border ${
                              post.userReacted
                                ? 'bg-pink-600/40 border-pink-400 text-pink-200'
                                : 'bg-[#251845] hover:bg-pink-600/30 border-purple-500/40 text-amber-300'
                            }`}
                          >
                            <span>🔥 {post.fireReactions}</span>
                            <span>·</span>
                            <span>❤️ {post.likes}</span>
                            {!post.userReacted && (
                              <span className="text-emerald-300 ml-0.5">(+$45 Tip)</span>
                            )}
                          </button>

                          {post.guestId && (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                const found = spriteMoodList.find((s) => s.id === post.guestId);
                                if (found) {
                                  setSelectedSpriteMood(found);
                                  setIsGossipOverlayOpen(false);
                                  setIsMoodPanelOpen(true);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-[8px] font-black text-cyan-200 uppercase cursor-pointer"
                            >
                              🎯 Spot Guest
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE PLACEMENT / RELOCATION / DECORATION EDIT BANNER */}
          {(placementModeStaff || relocatingStaffUid || isEditDecorMode || editingPlacedItemUid) && (
            <div className="fixed sm:static inset-x-2.5 bottom-[74px] z-30 mx-auto sm:mt-auto sm:mb-3 pointer-events-auto w-auto sm:w-[500px] bg-[#160d2e]/96 border-2 border-cyan-300 rounded-2xl px-3.5 py-2 shadow-2xl text-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  {placementModeStaff
                    ? `Hiring ${placementModeStaff.name} ($${placementModeStaff.hireCostCash})`
                    : relocatingStaffUid
                    ? 'Relocating Staff Station'
                    : editingPlacedItemUid
                    ? `Moving ${
                        getCatalogItem(
                          placedItems.find((p) => p.uid === editingPlacedItemUid)?.catalogId || ''
                        )?.name || 'Decoration'
                      } ($0 Free Move)`
                    : 'Edit Decoration Position Mode'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  {placementModeStaff || relocatingStaffUid
                    ? `Tap any isometric tile on Floor ${activeFloor} to station staff!`
                    : editingPlacedItemUid
                    ? 'Tap any green tile on the floor or use arrows to reposition!'
                    : 'Tap any placed decoration on the floor to move or rotate it!'}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editingPlacedItemUid && (
                  <>
                    <button
                      onClick={() => nudgeEditingDecoration(-1, 0)}
                      title="Nudge Back-Left (-X)"
                      className="px-2 py-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-xs font-black cursor-pointer"
                    >
                      ↖
                    </button>
                    <button
                      onClick={() => nudgeEditingDecoration(1, 0)}
                      title="Nudge Front-Right (+X)"
                      className="px-2 py-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-xs font-black cursor-pointer"
                    >
                      ↘
                    </button>
                    <button
                      onClick={() => nudgeEditingDecoration(0, -1)}
                      title="Nudge Back-Right (-Y)"
                      className="px-2 py-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-xs font-black cursor-pointer"
                    >
                      ↗
                    </button>
                    <button
                      onClick={() => nudgeEditingDecoration(0, 1)}
                      title="Nudge Front-Left (+Y)"
                      className="px-2 py-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-xs font-black cursor-pointer"
                    >
                      ↙
                    </button>
                    <button
                      onClick={() => {
                        const nextRot = ((buildRotation + 90) % 360) as 0 | 90 | 180 | 270;
                        setBuildRotation(nextRot);
                        setPlacedItems((prev) =>
                          prev.map((p) =>
                            p.uid === editingPlacedItemUid ? { ...p, rotation: nextRot } : p
                          )
                        );
                        soundEngine.playClick();
                      }}
                      title="Rotate 90°"
                      className="px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer"
                    >
                      ↻ {buildRotation}°
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setPlacementModeStaff(null);
                    setRelocatingStaffUid(null);
                    setEditingPlacedItemUid(null);
                    setIsEditDecorMode(false);
                    soundEngine.playClick();
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* DOCK TAB POPUP DRAWER (TONIGHT / DRESSING / STAFF / DECORATE / CELEBS / PARTIES / TROPHIES / SETTINGS) */}
          {activeDockTab && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="fixed sm:static inset-x-2 bottom-[70px] z-40 mx-auto sm:mt-auto sm:mb-2 pointer-events-auto w-auto sm:w-[600px] max-h-[54vh] sm:max-h-[62vh] overflow-y-auto bg-[#140d26]/98 backdrop-blur-md border-[2.5px] border-[#111116] ring-2 ring-purple-500/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] text-white"
            >
              {/* Sticky Drawer Header with Large Touch-Friendly CLOSE Button */}
              <div className="sticky top-0 z-20 bg-[#140d26] flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-500/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 border border-[#111116] text-[10px] font-black uppercase tracking-wider shrink-0">
                    {activeDockTab}
                  </span>
                  <h3 className="text-xs sm:text-base font-black text-white truncate">
                    {activeDockTab === 'DECORATE' && `Decorate & Edit Positions (Floor ${activeFloor})`}
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClick();
                    setActiveDockTab(null);
                  }}
                  className="px-2.5 py-1 min-h-[30px] rounded-lg bg-rose-600 hover:bg-rose-500 border border-[#111116] flex items-center justify-center gap-1 text-white font-black text-[10px] uppercase cursor-pointer shrink-0 shadow"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.8]" />
                  <span>CLOSE</span>
                </button>
              </div>

              {vipBottleToast && (
                <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300 text-xs font-black text-amber-200 flex items-center gap-2">
                  <span>🍾</span>
                  <span>{vipBottleToast}</span>
                </div>
              )}

              {/* 1. DECORATE TAB (Furniture & Equipment Placement + Edit Decoration Position Mode) */}
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
                          const next = !isEditDecorMode;
                          setIsEditDecorMode(next);
                          setIsRemoveMode(false);
                          if (!next) setEditingPlacedItemUid(null);
                          soundEngine.playClick();
                        }}
                        className={`px-2.5 py-1 rounded-lg border border-[#111116] text-xs font-black flex items-center gap-1 cursor-pointer ${
                          isEditDecorMode || editingPlacedItemUid
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-purple-900 text-cyan-200 hover:bg-purple-800'
                        }`}
                      >
                        <span>✥</span>
                        <span>{isEditDecorMode || editingPlacedItemUid ? 'Editing Pos' : 'Edit Position'}</span>
                      </button>
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
                        onClick={() => {
                          setIsRemoveMode((p) => !p);
                          setIsEditDecorMode(false);
                          setEditingPlacedItemUid(null);
                        }}
                        className={`px-2 py-1 rounded-lg border border-[#111116] text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          isRemoveMode ? 'bg-rose-600 text-white' : 'bg-purple-900 text-rose-300'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isRemoveMode ? 'Selling' : 'Sell'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Placed Decorations Quick-Reposition Bar when in Edit Position Mode */}
                  {(isEditDecorMode || editingPlacedItemUid) && (
                    <div className="mb-2.5 p-2 rounded-xl bg-[#1b1233] border border-cyan-400/50">
                      <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold mb-1.5">
                        Placed Decorations on Floor {activeFloor} — Tap any item below or on the floor to move it:
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {placedItems
                          .filter((p) => p.floor === activeFloor)
                          .map((p) => {
                            const cat = getCatalogItem(p.catalogId);
                            if (!cat) return null;
                            const isMoving = editingPlacedItemUid === p.uid;
                            return (
                              <button
                                key={p.uid}
                                onClick={() => {
                                  setEditingPlacedItemUid(p.uid);
                                  setBuildRotation(p.rotation);
                                  soundEngine.playClick();
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer border ${
                                  isMoving
                                    ? 'bg-cyan-400 text-slate-950 border-white'
                                    : 'bg-purple-950 text-purple-200 border-purple-600/40 hover:border-cyan-300'
                                }`}
                              >
                                {cat.name} ({p.gridX},{p.gridY})
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                    {filteredCatalog.map((item) => {
                      const isSelected =
                        selectedCatalogItem?.id === item.id &&
                        !isRemoveMode &&
                        !isEditDecorMode &&
                        !editingPlacedItemUid;
                      const canAfford = cash >= item.costCash;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsRemoveMode(false);
                            setIsEditDecorMode(false);
                            setEditingPlacedItemUid(null);
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
                                setIsEditDecorMode(false);
                                setEditingPlacedItemUid(null);
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
                        advanceQuestProgress('DANCE_FLOOR', 1);
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
                        advanceQuestProgress('DANCE_FLOOR', 1);
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
                        const craftCash = activeDrink.sellPrice * 4;
                        setCash((c) => c + craftCash);
                        addXp(35);
                        advanceQuestProgress('MIXOLOGY_CRAFT', 1);
                        advanceQuestProgress('CLUB_REVENUE', craftCash);
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
                            advanceQuestProgress('MIXOLOGY_CRAFT', 1);
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

                  {/* VIP Booth Bottle Service Trays Selector & Instant Booth Delivery */}
                  <div className="p-2.5 rounded-xl bg-[#18102e] border-2 border-amber-400/50 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                          🍾 VIP BOOTH BOTTLE SERVICE TRAYS · TAP ANY VIP BOOTH OR SERVE BELOW
                        </div>
                        <div className="text-xs font-black text-white">
                          Selected Tray: <span style={{ color: selectedBottleTray.trayColor }}>{selectedBottleTray.name}</span> ({selectedBottleTray.spendingMultiplier}x Guest Spend · +{selectedBottleTray.hypeBoost}⚡ Hype)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerGuaranteedVipBottleService({
                            customTray: selectedBottleTray,
                            actorName: 'VIP Bar Service',
                          });
                        }}
                        className="px-3 py-1.5 min-h-[34px] rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 border border-[#0D0D14] text-slate-950 font-black text-xs cursor-pointer shadow active:scale-[0.98]"
                      >
                        🍾 Serve VIP Booth (+${selectedBottleTray.price})
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {VIP_BOTTLE_SERVICE_TRAYS.map((tray) => {
                        const isSel = tray.id === selectedBottleTray.id;
                        return (
                          <button
                            type="button"
                            key={tray.id}
                            onClick={() => {
                              setSelectedBottleTrayId(tray.id);
                              soundEngine.playClick();
                            }}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                              isSel
                                ? 'bg-amber-500/25 border-amber-300 ring-1 ring-amber-300'
                                : 'bg-[#120b22] border-purple-700/40 hover:border-amber-400/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white">
                                {tray.badgeEmoji} {tray.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                              <span className="text-emerald-300 font-bold">+${tray.price}</span>
                              <span className="text-amber-300">
                                {tray.spendingMultiplier}x Spend · +{tray.hypeBoost}⚡
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DRESSING TAB (Chibi Streetwear Style Customizer) */}
              {activeDockTab === 'DRESSING' && (
                <div className="grid grid-cols-2 gap-2">
                  {AVATAR_STYLES.map((st, idx) => (
                    <button
                      type="button"
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
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-[#18102e] border-2 border-amber-400/50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                        🍾 VIP CELEBRITY BOTTLE SERVICE PARADE
                      </div>
                      <div className="text-xs text-purple-100">
                        Deliver <span className="font-black text-amber-300">{selectedBottleTray.name}</span> with sparklers to all VIP booths on Floor {activeFloor} for{' '}
                        <span className="font-black text-emerald-300">{selectedBottleTray.spendingMultiplier}x guest spending</span> &amp;{' '}
                        <span className="font-black text-cyan-300">+{selectedBottleTray.hypeBoost}⚡ Hype</span>!
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerGuaranteedVipBottleService({
                          customTray: selectedBottleTray,
                          actorName: 'VIP Celebrity Parade',
                          serveAllOnFloor: true,
                        });
                      }}
                      className="px-3 py-1.5 min-h-[34px] rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-400 text-slate-950 font-black text-xs cursor-pointer border border-[#111116] shadow active:scale-[0.98]"
                    >
                      🍾 Sparkler Parade All VIP Booths
                    </button>
                  </div>

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
                          <div className="text-[10px] text-purple-200">
                            3.0x VIP Drink Tips · Orders Bottle Service
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (gems < 2) {
                              soundEngine.playError();
                              return;
                            }
                            const targetBooth = placedItems.find(
                              (p) => p.floor === activeFloor && isVipBoothCatalogId(p.catalogId)
                            );
                            setGems((g) => g - 2);
                            setCash((c) => c + 650);
                            addXp(90);
                            advanceQuestProgress('PARTY_FEVER', 1);
                            advanceQuestProgress('CLUB_REVENUE', 650);
                            soundEngine.playUpgradeFanfare();
                            guestsRef.current.push({
                              id: `celeb_${Date.now()}_${idx}`,
                              name: cName,
                              isCelebrity: true,
                              floor: activeFloor,
                              targetFloor: activeFloor,
                              gridX: targetBooth ? targetBooth.gridX + 0.32 : 4,
                              gridY: targetBooth ? targetBooth.gridY + 0.28 : 4,
                              path: [],
                              state: targetBooth ? 'RESTING_AT_SEAT' : 'DANCER_MOVES',
                              stateTimer: 18,
                              patience: 100,
                              hype: 100,
                              bubble: 'BOTTLE_SERVICE',
                              bubbleTimer: 10,
                              shirtColor: '#facc15',
                              hairColor: '#111116',
                              pantsColor: '#311042',
                              cashSpent: 650,
                              seatPosture: targetBooth ? 'SITTING_SOFA' : undefined,
                              assignedSlotId: targetBooth ? `${targetBooth.uid}_sofa_0` : undefined,
                            });
                            if (targetBooth) {
                              serveVipBoothBottleService(targetBooth.uid, selectedBottleTray, cName);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 border border-[#111116] text-slate-950 font-black text-[11px] cursor-pointer"
                        >
                          Invite + Bottle (2💎)
                        </button>
                      </div>
                    ))}
                  </div>
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

              {/* 7. TROPHIES TAB (ESCALATING QUESTS, HOT-STREAK MULTIPLIER & VIP JACKPOT CHEST) */}
              {activeDockTab === 'TROPHIES' && (
                <div className="space-y-2.5">
                  {/* Top Banner: Hot-Streak Combo Multiplier & 3-Quest VIP Neon Jackpot Chest */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#1e1238] via-[#2a1548] to-[#1a1033] border-2 border-amber-400/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 border-2 border-[#111116] flex items-center justify-center text-lg shadow">
                        🎁
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-300 uppercase">
                            VIP Neon Jackpot Chest ({jackpotProgress}/3 Quests)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black text-[10px]">
                            🔥 {questStreakMultiplier}x STREAK BONUS
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-200 mt-0.5">
                          Complete 3 quests to unlock{' '}
                          <span className="font-bold text-emerald-300">
                            +${Math.round(2500 * questStreakMultiplier).toLocaleString()} Cash
                          </span>
                          , <span className="font-bold text-fuchsia-300">+8💎 Gems</span> &amp; a{' '}
                          <span className="font-bold text-amber-300">
                            Free 24K Gold Sparkler Parade
                          </span>
                          ! ({questsCompletedTotal} Quests Mastered)
                        </div>
                        {/* 3-Segment Jackpot Progress Bar */}
                        <div className="flex items-center gap-1.5 mt-1.5 max-w-xs">
                          {[1, 2, 3].map((step) => (
                            <div
                              key={step}
                              className={`h-2 flex-1 rounded-full border border-[#111116] transition-all ${
                                jackpotProgress >= step
                                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-400 shadow-[0_0_8px_#facc15]'
                                  : 'bg-[#0c0718]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={jackpotProgress < 3}
                      onClick={handleClaimJackpotChest}
                      className={`px-3.5 py-2 rounded-xl border-2 border-[#111116] font-black text-xs uppercase cursor-pointer transition-all ${
                        jackpotProgress >= 3
                          ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-pink-400 text-slate-950 shadow-[0_0_16px_rgba(250,204,21,0.75)] animate-pulse'
                          : 'bg-purple-950/70 text-purple-400 cursor-not-allowed'
                      }`}
                    >
                      {jackpotProgress >= 3
                        ? `🎁 OPEN JACKPOT (+$${Math.round(2500 * questStreakMultiplier).toLocaleString()})`
                        : `${3 - jackpotProgress} More Quest${3 - jackpotProgress === 1 ? '' : 's'} to Unlock`}
                    </button>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {(
                        [
                          { id: 'ALL', label: '★ All Tracks (8)' },
                          { id: 'VIP RUSH', label: '🍾 VIP Rush' },
                          { id: 'CROWD HYPE', label: '🔥 Crowd Hype' },
                          { id: 'DJ STUDIO', label: '🔊 DJ Studio' },
                          { id: 'TYCOON EMPIRE', label: '🪩 Tycoon Empire' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            soundEngine.playClick();
                            setQuestCategoryFilter(tab.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap cursor-pointer border ${
                            questCategoryFilter === tab.id
                              ? 'bg-amber-400 text-slate-950 border-[#111116]'
                              : 'bg-[#1b1233] text-purple-200 border-purple-700/40 hover:border-amber-400/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {unclaimedQuestCount > 0 && (
                      <span className="text-[10px] font-black text-emerald-300 uppercase">
                        ✨ {unclaimedQuestCount} Quest{unclaimedQuestCount > 1 ? 's' : ''} Ready to Claim!
                      </span>
                    )}
                  </div>

                  {/* Escalating Quest Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredQuests.map((q) => {
                      const isDone = q.currentValue >= q.targetValue;
                      const pct = Math.min(
                        100,
                        Math.round((q.currentValue / Math.max(1, q.targetValue)) * 100)
                      );
                      const boostedCash = Math.round(q.rewardCash * questStreakMultiplier);
                      const boostedXp = Math.round(q.rewardXp * questStreakMultiplier);
                      return (
                        <div
                          key={q.id}
                          className={`p-2.5 rounded-xl border-2 flex flex-col justify-between gap-1.5 transition-all ${
                            isDone
                              ? 'bg-gradient-to-br from-[#2b1d4a] via-[#1f2e3d] to-[#1d1436] border-amber-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]'
                              : 'bg-[#1d1436] border-[#111116] hover:border-purple-500/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base shrink-0">{q.badgeEmoji}</span>
                                <span className="text-xs font-black text-amber-300 truncate">
                                  {q.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/40 text-[9px] font-mono font-black text-fuchsia-300">
                                  TIER {q.tier} ★
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-300">
                                  {q.track === 'CLUB_REVENUE'
                                    ? `$${q.currentValue.toLocaleString()}/$${q.targetValue.toLocaleString()}`
                                    : `${q.currentValue}/${q.targetValue}`}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-purple-200 mt-1 leading-snug">
                              {q.description}
                            </p>

                            {/* Animated Neon Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-[#0a0614] border border-[#111116] overflow-hidden mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDone
                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400'
                                    : 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-500/25">
                            <div className="text-[10px] font-mono font-bold text-emerald-300">
                              +${boostedCash.toLocaleString()} · +{q.rewardGems}💎 · +{boostedXp} XP
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!isDone && (
                                <button
                                  onClick={() => handleQuestQuickAction(q)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-400/20 hover:bg-cyan-400/35 border border-cyan-400/60 text-cyan-200 text-[10px] font-black uppercase cursor-pointer"
                                >
                                  ⚡ {q.actionLabel}
                                </button>
                              )}
                              <button
                                disabled={!isDone}
                                onClick={() => handleClaimQuest(q.id)}
                                className={`px-2.5 py-1 rounded-lg border border-[#111116] text-[10px] font-black uppercase cursor-pointer ${
                                  isDone
                                    ? 'bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 shadow'
                                    : 'bg-purple-950/80 text-purple-400 cursor-not-allowed'
                                }`}
                              >
                                {isDone ? `🎁 Claim (${questStreakMultiplier}x)` : `${pct}%`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
          <div className="ml-auto flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto z-30">
            {/* Tall Vertical Purple Vibe/Hype Thermometer with Cocktail Icon at Top (Hidden on small phone screen only when a bottom drawer is open) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUpgradeFanfare();
                setHypeSurgeBonus((prev) => (prev >= 120 ? 45 : 140));
                triggerHypeBlast(40, clubMetrics.totalHype + 40, clubMetrics.tipBonus);
              }}
              title="Vibe/Hype Thermometer (Tap to Surge Club Vibe!)"
              className={`${
                activeDockTab ? 'hidden sm:flex' : 'flex'
              } flex-col items-center p-1 sm:p-1.5 rounded-full bg-[#130d24]/92 border-2 sm:border-[2.5px] border-[#111116] shadow-[0_3px_0_#111116,0_0_16px_rgba(168,85,247,0.45)] cursor-pointer group`}
            >
              {/* Cocktail Icon Circle at Top */}
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-fuchsia-400 via-purple-600 to-indigo-900 border-2 border-[#111116] flex items-center justify-center shadow mb-1 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 28 28" className="w-4 h-4 sm:w-5 sm:h-5">
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
              <div className="relative w-3.5 sm:w-4 h-20 sm:h-36 rounded-full bg-[#090514] border-2 border-[#111116] overflow-hidden flex flex-col justify-end p-0.5">
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

            {/* Quick Bar Supply Restock Pill */}
            <button
              type="button"
              onClick={() => {
                setDrinkServingsRemaining((s) => Math.min(120, s + 36));
                setCash((c) => c + activeDrink.sellPrice * 3);
                addXp(25);
                soundEngine.playCashRegister();
                floatingTextsRef.current.push({
                  id: `restock_${performance.now()}`,
                  text: `🍸 BAR RESTOCKED! +36 SERVINGS`,
                  floor: activeFloor,
                  gridX: 7,
                  gridY: 3.5,
                  color: '#4ade80',
                  age: 0,
                });
              }}
              title="Restock Bar Drink Servings (+36 Drinks)"
              className={`${
                activeDockTab ? 'hidden sm:inline-flex' : 'inline-flex'
              } px-2 py-1 rounded-xl bg-gradient-to-b from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 border-2 border-[#111116] shadow-[0_3px_0_#111116] text-slate-950 font-black text-[9px] uppercase tracking-wider cursor-pointer active:translate-y-0.5`}
            >
              RESTOCK ({drinkServingsRemaining})
            </button>

            {/* Always-Accessible Zoom In / Zoom Out (45% - 225%) & Cool Eco Mode Controls (Works with iPad/Phone Pinch & Mouse Wheel) */}
            <div className="flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-[#130d24]/95 border-[2.5px] border-[#111116] shadow-[0_4px_0_#111116]">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCameraZoom((z) => Math.min(2.25, +(z + 0.18).toFixed(2)));
                }}
                className="w-8 h-8 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-white flex items-center justify-center cursor-pointer active:scale-95"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCameraZoom(1.0);
                  setCameraResetTick((t) => t + 1);
                }}
                className="w-8 h-6 rounded bg-[#18102e] hover:bg-purple-900 text-[9px] font-mono font-black text-cyan-300 cursor-pointer"
                title="Reset Camera Zoom & Center (100%)"
              >
                {Math.round(cameraZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCameraZoom((z) => Math.max(0.45, +(z - 0.18).toFixed(2)));
                }}
                className="w-8 h-8 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-white flex items-center justify-center cursor-pointer active:scale-95"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFloor2Action}
                className="w-8 h-7 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/60 text-cyan-300 flex items-center justify-center text-[10px] font-black cursor-pointer"
                title={unlockedFloors === 1 ? 'Unlock Floor 2 ($2,500)' : `Switch Floor (Currently F${activeFloor})`}
              >
                F{activeFloor}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsEcoThermalMode((e) => !e);
                }}
                className={`w-8 h-7 rounded-lg border flex items-center justify-center text-[9px] font-black cursor-pointer ${
                  isEcoThermalMode
                    ? 'bg-emerald-400 text-slate-950 border-white'
                    : 'bg-[#241842] hover:bg-purple-700 border-[#111116] text-emerald-300'
                }`}
                title="Toggle Cool / Eco Mode (Prevents iPad & Phone Heating)"
              >
                ❄️
              </button>
              <button
                type="button"
                onClick={handleToggleMuteMusic}
                className="w-8 h-7 rounded-lg bg-[#241842] hover:bg-purple-700 border border-[#111116] text-purple-200 flex items-center justify-center cursor-pointer"
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
        <div className="pointer-events-auto flex items-center justify-between gap-1.5 sm:gap-2 px-1.5 py-1.5 sm:px-2.5 sm:py-2 rounded-2xl bg-[#110b20]/95 backdrop-blur-md border-2 sm:border-[2.5px] border-[#111116] shadow-[0_6px_0_#111116,0_0_24px_rgba(0,0,0,0.8)]">
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
          <div className="flex-1 grid grid-cols-8 gap-1 sm:gap-1.5">
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
                    setActiveDockTab((curr) => {
                      const next = curr === tab.id ? null : tab.id;
                      if (next) {
                        setActiveTopLeftModal(null);
                        if (typeof window !== 'undefined' && window.innerWidth < 768) {
                          setIsMoodPanelOpen(false);
                          setIsGossipOverlayOpen(false);
                          setIsQuestTrackerMinimized(true);
                        }
                      }
                      return next;
                    });
                  }}
                  className={`relative py-1 px-0.5 sm:py-1.5 sm:px-1 rounded-xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-purple-600 to-indigo-900 border-cyan-300 -translate-y-0.5 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'bg-[#1c1333] hover:bg-[#281b47] border-[#0D0D14] shadow-[0_2px_0_#0D0D14] sm:shadow-[0_3px_0_#0D0D14]'
                  }`}
                >
                  {'upgradeTag' in tab && tab.upgradeTag && (
                    <span className="hidden sm:inline-block absolute -top-1.5 -left-1 px-1 py-0.2 rounded bg-emerald-400 border border-[#0D0D14] text-[7px] font-black text-slate-950 uppercase tracking-tight">
                      {tab.upgradeTag}
                    </span>
                  )}
                  {'badge' in tab && tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-0.5 sm:-top-1.5 sm:-right-1 px-1 sm:px-1.5 py-0.2 rounded-full bg-rose-500 border border-[#0D0D14] text-[7px] sm:text-[8px] font-black text-white">
                      {tab.badge}
                    </span>
                  )}
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b ${tab.grad} border-[1.5px] sm:border-[1.8px] border-[#0D0D14] flex items-center justify-center text-xs sm:text-base shadow-inner`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-[6.5px] sm:text-[9px] font-black tracking-tight sm:tracking-wider text-white mt-0.5 sm:mt-1 truncate max-w-full drop-shadow-[0_1px_0_#0D0D14]">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          PERSISTENT EXTERNAL STREAMING MINI-TURNTABLE DOCK
          - Keeps <div id="neon-nights-yt-player" /> mounted at all times (required by YouTube IFrame Player API ToS)
          - Renders Official Spotify Embed / Apple Music Embed turntable preview when playing in Free/Embed mode
          - Toggleable between Expanded Mini-Turntable and Compact Corner Pill
         ===================================================================== */}
      <div
        className={`fixed bottom-[76px] right-2.5 z-[60] transition-all duration-200 ${
          streamState.activeService === 'YOUTUBE' ||
          streamState.activeService === 'SPOTIFY' ||
          streamState.activeService === 'APPLE'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none w-1 h-1 overflow-hidden'
        }`}
      >
        <div className="rounded-2xl bg-[#120b24]/98 border-2 border-cyan-400/80 shadow-[0_8px_24px_rgba(0,0,0,0.85)] overflow-hidden text-white">
          {/* Mini-Turntable Header */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#1b1136] border-b border-purple-500/30">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                  streamState.activeService === 'YOUTUBE'
                    ? 'bg-[#FF0000] text-white'
                    : streamState.activeService === 'SPOTIFY'
                    ? 'bg-[#1DB954] text-slate-950'
                    : 'bg-[#FA243C] text-white'
                }`}
              >
                {streamState.activeService} TURNTABLE
              </span>
              <span className="text-[10px] font-black text-white truncate max-w-[140px]">
                {streamState.activeExternalTrack?.title || currentTrack.title}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsTurntableDockMinimized((m) => !m)}
                className="px-1.5 py-0.5 rounded bg-purple-900 hover:bg-purple-800 text-[9px] font-black text-cyan-300 cursor-pointer"
                title={isTurntableDockMinimized ? 'Expand Mini-Turntable' : 'Minimize Mini-Turntable'}
              >
                {isTurntableDockMinimized ? 'EXPAND' : 'HIDE'}
              </button>
              <button
                onClick={() => {
                  streamingMusicManager.switchToBuiltInSynthOrUpload(false);
                  handleSelectSong(INITIAL_CLUB_SONGS[0]);
                }}
                className="w-5 h-5 rounded bg-rose-600/80 hover:bg-rose-500 flex items-center justify-center text-white cursor-pointer"
                title="Switch back to Built-in Club Synth"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* YouTube IFrame Player Container (Always mounted in DOM for YT.Player API) */}
          <div
            className={`${
              streamState.activeService === 'YOUTUBE' && !isTurntableDockMinimized
                ? 'w-[260px] h-[146px]'
                : 'w-[1px] h-[1px] opacity-0 overflow-hidden'
            } bg-black relative`}
          >
            <div id="neon-nights-yt-player" className="w-full h-full" />
          </div>

          {/* Spotify Official Embed IFrame Fallback (for Free Spotify Accounts or 1-Click Previews) */}
          {streamState.activeService === 'SPOTIFY' &&
            streamState.activeExternalTrack?.embedUrl &&
            !isTurntableDockMinimized && (
              <div className="w-[280px] h-[80px] bg-black">
                <iframe
                  src={streamState.activeExternalTrack.embedUrl}
                  width="100%"
                  height="80"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify Club Turntable"
                  className="border-0"
                />
              </div>
            )}

          {/* Apple Music Official Embed IFrame Fallback */}
          {streamState.activeService === 'APPLE' &&
            streamState.activeExternalTrack?.embedUrl &&
            !isTurntableDockMinimized && (
              <div className="w-[280px] h-[150px] bg-black">
                <iframe
                  src={streamState.activeExternalTrack.embedUrl}
                  width="100%"
                  height="150"
                  allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                  sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                  title="Apple Music Club Turntable"
                  className="border-0"
                />
              </div>
            )}
        </div>
      </div>

      {/* =====================================================================
          BEAT & MUSIC STUDIO MODAL (CHOOSE MUSIC + 16-STEP CUSTOM BEAT MAKER)
         ===================================================================== */}
      <BeatAndMusicStudioModal
        isOpen={beatStudioModalTab !== null}
        initialTab={beatStudioModalTab || 'MUSIC'}
        songs={clubSongs}
        activeSongId={activeSong.id}
        activePattern={activePattern}
        selectedBpm={selectedBpm}
        playerLevel={level}
        onClose={() => setBeatStudioModalTab(null)}
        onSelectSong={handleSelectSong}
        onUpdatePattern={(nextPattern) => {
          setActivePattern(nextPattern);
          setSelectedBpm(nextPattern.bpm);
          soundEngine.setBpm(nextPattern.bpm);
          setCustomPatterns((prev) => ({ ...prev, [nextPattern.id]: nextPattern }));
        }}
        onSaveCustomBeatSong={(newSong, newPattern) => {
          setCustomPatterns((prev) => ({ ...prev, [newPattern.id]: newPattern }));
          setActivePattern(newPattern);
          setClubSongs((prev) => [newSong, ...prev]);
          setActiveSongId(newSong.id);
          setSelectedBpm(newSong.bpm);
          soundEngine.setBpm(newSong.bpm);
          soundEngine.setCustomAudioUrl(null);
          soundEngine.setActivePattern(newPattern);
          addXp(45);
          advanceQuestProgress('DJ_HYPE_DROP', 1);
          floatingTextsRef.current.push({
            id: `custom_beat_${performance.now()}`,
            text: `🎛️ NEW CUSTOM BEAT LIVE: ${newSong.title.toUpperCase()} (${newSong.bpm} BPM)!`,
            floor: activeFloor,
            gridX: 5,
            gridY: 0.8,
            color: '#f472b6',
            age: 0,
          });
        }}
        onUploadCustomAudioSong={(uploadedSong) => {
          setClubSongs((prev) => [uploadedSong, ...prev]);
          handleSelectSong(uploadedSong);
        }}
        onTriggerBassDrop={handleTriggerBassDrop}
      />

      {/* =====================================================================
          INTERACTIVE SKILL-BASED QUEST CHALLENGE MODAL
          (DJ Beat-Match & Drop Timing, Flair Mixology Shaker, Velvet Rope Bouncer ID Scanner, Neon Dance Grid Memory)
         ===================================================================== */}
      <InteractiveQuestChallengeModal
        quest={activeChallengeQuest}
        clubBpm={selectedBpm}
        vibePercent={vibeThermometerPercent}
        streakMultiplier={questStreakMultiplier}
        onClose={() => setActiveChallengeQuest(null)}
        onCompleteChallenge={handleCompleteInteractiveQuestChallenge}
      />
    </div>
  );
}
