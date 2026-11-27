import React, { useEffect, useRef } from 'react';
import {
  ActiveBoothBottleService,
  BubbleType,
  CatalogItem,
  DancerMoveVariant,
  DrinkMix,
  FloatingText,
  FloorLevel,
  GuestAgent,
  GuestSeatPosture,
  GuestState,
  isVipBoothCatalogId,
  ParkingUpgradeState,
  PlacedItem,
  StaffCatalogItem,
  StaffMemberAgent,
} from '../types/game';
import {
  buildStaffStationPath,
  canPlaceItem,
  DOOR_COORD,
  findGridPath,
  getCatalogItem,
  getRotatedFootprint,
  GRID_SIZE,
  STAIRS_COORD,
} from '../utils/pathfinding';
import { assetManager } from '../utils/assetManager';
import { soundEngine } from '../audio/soundEngine';

export interface ClubSimulationMetrics {
  totalHype: number;
  totalVibe: number;
  tipBonus: number;
  maxBarTier: 1 | 2 | 3;
  lightingCount: number;
  danceTileCount: number;
  seatCount: number;
  hypeSegments: number;
  vibeSegments: number;
  maxGuests: number;
}

export interface DayNightCycleReport {
  hour: number;
  formattedTime: string;
  phaseLabel: 'GOLDEN SUNSET' | 'TWILIGHT DUSK' | 'MIDNIGHT NEON PEAK' | 'AFTERHOURS GLOW' | 'ELECTRIC DAWN';
  nightIntensity: number; // 0..1
  emissiveMultiplier: number; // 1.0..2.25
}

export interface ClubMoodLightingProfile {
  genreKey: string;
  moodName: string;
  moodIcon: string;
  primaryHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  filterOverlayRgba: string;
  filterBorderHex: string;
  tilePalette: [string, string, string, string, string, string];
}

export const CLUB_MOOD_PROFILES: Record<string, ClubMoodLightingProfile> = {
  Pop: {
    genreKey: 'Pop',
    moodName: 'NEON MAGENTA BLISS',
    moodIcon: '💖',
    primaryHex: '#ff4fa0',
    secondaryHex: '#c084fc',
    tertiaryHex: '#38bdf8',
    filterOverlayRgba: 'rgba(255, 79, 160, 0.24)',
    filterBorderHex: '#ff4fa0',
    tilePalette: ['#ff4fa0', '#f472b6', '#c084fc', '#38bdf8', '#facc15', '#fb7185'],
  },
  Dance: {
    genreKey: 'Dance',
    moodName: 'CYBER AQUA RAVE',
    moodIcon: '🪩',
    primaryHex: '#22d3ee',
    secondaryHex: '#3b82f6',
    tertiaryHex: '#a855f7',
    filterOverlayRgba: 'rgba(34, 211, 238, 0.24)',
    filterBorderHex: '#22d3ee',
    tilePalette: ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#2dd4bf', '#e879f9'],
  },
  'Hip Hop': {
    genreKey: 'Hip Hop',
    moodName: '24K GOLD VIP LOUNGE',
    moodIcon: '👑',
    primaryHex: '#facc15',
    secondaryHex: '#f59e0b',
    tertiaryHex: '#a855f7',
    filterOverlayRgba: 'rgba(250, 204, 21, 0.24)',
    filterBorderHex: '#facc15',
    tilePalette: ['#facc15', '#fbbf24', '#f59e0b', '#a855f7', '#fde047', '#fb923c'],
  },
  Latin: {
    genreKey: 'Latin',
    moodName: 'TROPICAL SUNSET FIESTA',
    moodIcon: '🔥',
    primaryHex: '#fb923c',
    secondaryHex: '#f43f5e',
    tertiaryHex: '#fde047',
    filterOverlayRgba: 'rgba(251, 146, 60, 0.25)',
    filterBorderHex: '#fb923c',
    tilePalette: ['#fb923c', '#f97316', '#f43f5e', '#fde047', '#fb7185', '#facc15'],
  },
  Electro: {
    genreKey: 'Electro',
    moodName: 'EMERALD LASER OVERDRIVE',
    moodIcon: '⚡',
    primaryHex: '#4ade80',
    secondaryHex: '#22d3ee',
    tertiaryHex: '#a3e635',
    filterOverlayRgba: 'rgba(74, 222, 128, 0.24)',
    filterBorderHex: '#4ade80',
    tilePalette: ['#4ade80', '#22c55e', '#a3e635', '#22d3ee', '#10b981', '#fde047'],
  },
  Rock: {
    genreKey: 'Rock',
    moodName: 'CRIMSON VOLTAGE STAGE',
    moodIcon: '🎸',
    primaryHex: '#ef4444',
    secondaryHex: '#f97316',
    tertiaryHex: '#facc15',
    filterOverlayRgba: 'rgba(239, 68, 68, 0.25)',
    filterBorderHex: '#ef4444',
    tilePalette: ['#ef4444', '#f43f5e', '#f97316', '#facc15', '#fb7185', '#dc2626'],
  },
  Custom: {
    genreKey: 'Custom',
    moodName: 'PRISM HYPER-SYNC',
    moodIcon: '🎛️',
    primaryHex: '#22d3ee',
    secondaryHex: '#e879f9',
    tertiaryHex: '#4ade80',
    filterOverlayRgba: 'rgba(168, 85, 247, 0.22)',
    filterBorderHex: '#e879f9',
    tilePalette: ['#22d3ee', '#38bdf8', '#e879f9', '#4ade80', '#fde047', '#fb923c'],
  },
};

export function getClubMoodLightingProfile(genre?: string): ClubMoodLightingProfile {
  if (!genre) return CLUB_MOOD_PROFILES.Pop;
  const g = genre.toLowerCase();
  if (g.includes('dance') || g.includes('house') || g.includes('techno')) {
    return CLUB_MOOD_PROFILES.Dance;
  }
  if (g.includes('hip') || g.includes('funk') || g.includes('r&b') || g.includes('rap')) {
    return CLUB_MOOD_PROFILES['Hip Hop'];
  }
  if (g.includes('latin') || g.includes('salsa') || g.includes('reggaeton')) {
    return CLUB_MOOD_PROFILES.Latin;
  }
  if (g.includes('electro') || g.includes('future') || g.includes('synth') || g.includes('cyber')) {
    return CLUB_MOOD_PROFILES.Electro;
  }
  if (g.includes('rock') || g.includes('punk') || g.includes('metal')) {
    return CLUB_MOOD_PROFILES.Rock;
  }
  if (g.includes('custom') || g.includes('beat')) {
    return CLUB_MOOD_PROFILES.Custom;
  }
  return CLUB_MOOD_PROFILES.Pop;
}

export interface SpriteMoodInfo {
  id: string;
  name: string;
  role:
    | 'VIP_GUEST'
    | 'GUEST'
    | 'PEDESTRIAN'
    | 'BARTENDER'
    | 'DJ'
    | 'SECURITY'
    | 'WAITER';
  moodLabel:
    | 'ECSTATIC'
    | 'HYPED'
    | 'VIBING'
    | 'CHILLING'
    | 'THIRSTY'
    | 'WAITING IN LINE'
    | 'STROLLING';
  moodEmoji: string;
  moodColor: string;
  moodScore: number; // 0..100
  activity: string;
  thought: string;
  favoriteGenre: string;
  shirtColor: string;
  boothUid?: string;
}

interface ParkingLotStall {
  idx: number;
  label: string;
  gx: number;
  gy: number;
  isTaxiDrop: boolean;
}

const PARKING_LOT_STALLS: ParkingLotStall[] = [
  { idx: 0, label: 'P1', gx: -0.65, gy: 12.12, isTaxiDrop: false },
  { idx: 1, label: 'TAXI', gx: 1.55, gy: 12.12, isTaxiDrop: true },
  { idx: 2, label: 'P2', gx: 3.75, gy: 12.12, isTaxiDrop: false },
  { idx: 3, label: 'P3', gx: 5.95, gy: 12.12, isTaxiDrop: false },
  { idx: 4, label: 'P4', gx: 8.15, gy: 12.12, isTaxiDrop: false },
];

function isExteriorGuestState(state: GuestState): boolean {
  return state === 'QUEUEING' || state === 'ARRIVING_FROM_CAR' || state === 'WALKING_TO_CAR';
}

interface TrafficCarAgent {
  id: string;
  lane: 'FRONT_EAST' | 'FRONT_WEST' | 'LEFT_SOUTH';
  gridX: number;
  gridY: number;
  speed: number;
  currentSpeed?: number;
  bodyColor: string;
  shadeColor: string;
  isTaxi: boolean;
  stopCooldown: number;
  carState?: 'CRUISING' | 'PARKING_IN' | 'PARKED' | 'WAITING_PICKUP' | 'PULLING_OUT';
  stallIndex?: number;
  parkTimer?: number;
  headlightFlashTimer?: number;
}

interface PedestrianAgent {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  waypoints: Array<{ x: number; y: number }>;
  wpIndex: number;
  speed: number;
  shirtColor: string;
  hairColor: string;
  pantsColor: string;
  facingDir: 'NE' | 'NW' | 'SE' | 'SW';
  bubble: BubbleType | null;
  bubbleTimer: number;
  favoriteGenre: string;
  hype: number;
}

export interface BassDropRippleWave {
  id: string;
  floor: FloorLevel;
  originGx: number;
  originGy: number;
  age: number;
  maxAge: number;
  radius: number;
  maxRadius: number;
  primaryColor: string;
  secondaryColor: string;
  reactedGuestIds: Set<string>;
}

function computeBassDropRippleExcitation(
  gx: number,
  gy: number,
  ripples: BassDropRippleWave[] | undefined,
  floor: FloorLevel
): {
  intensity: number;
  crestSign: number;
  primaryColor: string;
  secondaryColor: string;
} {
  if (!ripples || ripples.length === 0) {
    return {
      intensity: 0,
      crestSign: 0,
      primaryColor: '#22d3ee',
      secondaryColor: '#e879f9',
    };
  }

  let totalIntensity = 0;
  let totalCrest = 0;
  let activePrimary = '#22d3ee';
  let activeSecondary = '#e879f9';
  let strongestHit = 0;

  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    if (r.floor !== floor) continue;
    const dist = Math.hypot(gx - r.originGx, gy - r.originGy);
    const lifeRatio = r.age / r.maxAge;
    const envelopeFade =
      Math.min(1, r.age / 0.08) * Math.max(0, 1 - Math.pow(lifeRatio, 1.75));
    if (envelopeFade <= 0.01) continue;

    // Leading primary shockwave crest + trailing harmonic echo ring
    const d1 = dist - r.radius;
    const primaryRing = Math.exp(-(d1 * d1) / 0.44);

    const d2 = dist - (r.radius - 1.55);
    const echoRing = r.radius > 1.3 ? 0.65 * Math.exp(-(d2 * d2) / 0.52) : 0;

    const d3 = dist - (r.radius - 3.0);
    const tailRing = r.radius > 2.8 ? 0.35 * Math.exp(-(d3 * d3) / 0.58) : 0;

    const hit = (primaryRing + echoRing + tailRing) * envelopeFade;
    if (hit > strongestHit) {
      strongestHit = hit;
      activePrimary = r.primaryColor;
      activeSecondary = r.secondaryColor;
    }

    totalIntensity += hit;
    totalCrest += (primaryRing - echoRing * 0.45) * envelopeFade;
  }

  return {
    intensity: Math.min(1, totalIntensity),
    crestSign: Math.max(-1, Math.min(1, totalCrest)),
    primaryColor: activePrimary,
    secondaryColor: activeSecondary,
  };
}

interface IsometricClubCanvasProps {
  isPlaying: boolean;
  activeFloor: FloorLevel;
  unlockedFloors: FloorLevel;
  playerLevel: number;
  placedItems: PlacedItem[];
  staffMembers: StaffMemberAgent[];
  guestsRef: React.MutableRefObject<GuestAgent[]>;
  floatingTextsRef: React.MutableRefObject<FloatingText[]>;
  buildModeItem: CatalogItem | null;
  buildRotation: 0 | 90 | 180 | 270;
  placementModeStaff: StaffCatalogItem | null;
  relocatingStaffUid: string | null;
  activeDrink: DrinkMix;
  parkingState: ParkingUpgradeState;
  clubMetrics: ClubSimulationMetrics;
  clubBpm?: number;
  activeGenre?: string;
  isRemoveMode: boolean;
  isEditDecorMode?: boolean;
  editingPlacedItemUid?: string | null;
  newlyPlacedItemHighlight?: { uid: string; placedAtMs: number } | null;
  onLongPressPlacedItem?: (itemUid: string) => void;
  selectedSpriteId?: string | null;
  onSelectSprite?: (info: SpriteMoodInfo) => void;
  onSpriteMoodListReport?: (list: SpriteMoodInfo[]) => void;
  activeBottleServices?: Record<string, ActiveBoothBottleService>;
  onBottleServiceEvent?: (
    boothUid: string,
    eventType: 'GUEST_ORDERED' | 'WAITER_DELIVERED' | 'TAPPED_BOOTH',
    guestName?: string
  ) => void;
  cameraZoom: number;
  cameraResetTick: number;
  onZoomChange?: (nextZoom: number) => void;
  isEcoMode?: boolean;
  dayNightOverrideHour?: number | null;
  onCycleTimeReport?: (report: DayNightCycleReport) => void;
  onEarnRevenue: (cashDelta: number, xpDelta: number) => void;
  onStaffTaskComplete?: (staffUid: string, taskKind: 'SERVED_DRINK' | 'CHECKED_IN_GUEST') => void;
  onQueueCountChange: (queueLen: number) => void;
  onClickGrid: (coord: { x: number; y: number }) => void;
  onClickBuyFloor2: () => void;
}

const BASE_TILE_W = 56;
const BASE_TILE_H = 28;
const INK = '#0D0D14';

const GUEST_NAMES = [
  'Mia J.',
  'Ivy W.',
  'Kira R.',
  'Mia H.',
  'Leo',
  'Zoe',
  'Kai',
  'Aria',
  'Jaxon',
  'Nova',
  'Milo',
  'Chloe',
  'Ezra',
  'Sienna',
  'Dante',
  'Noel',
  'Tori',
];

const CELEBRITY_NAMES = [
  'DJ Daft Nova',
  'Kyra Vance (Pop Icon)',
  'Jax Sterling (Synth King)',
  'Luna Eclipse (Supermodel)',
];

const SHIRT_COLORS = [
  '#22d3ee',
  '#ec4899',
  '#a855f7',
  '#10b981',
  '#f43f5e',
  '#3b82f6',
  '#eab308',
  '#f97316',
];
const HAIR_COLORS = [
  '#111116',
  '#ec4899',
  '#22d3ee',
  '#facc15',
  '#7c2d12',
  '#a855f7',
  '#f97316',
  '#e2e8f0',
];
const PANTS_COLORS = ['#1e293b', '#1e3a8a', '#312e81', '#111827', '#3b0764'];
const SKIN_TONES = ['#f5cba7', '#e0ac69', '#8d5524', '#c68642', '#ffdbac', '#5c3818'];
const MAX_HYPE_PARTICLE_COLORS = [
  '#22d3ee',
  '#f43f5e',
  '#facc15',
  '#a855f7',
  '#4ade80',
  '#ec4899',
  '#38bdf8',
];

const ALL_DANCER_MOVES: DancerMoveVariant[] = [
  'SHUFFLE_STEP',
  'FIST_PUMP',
  'SPIN_TWIRL',
  'BREAKDANCE_WAVE',
  'CYBER_JUMP',
];

/**
 * Selects a randomized dance move weighted by the club's current music BPM:
 * - Lower BPM (<= 118): favors groove-heavy SHUFFLE_STEP & BREAKDANCE_WAVE
 * - Mid BPM (119 - 129): favors FIST_PUMP, SPIN_TWIRL & SHUFFLE_STEP
 * - High BPM (>= 130): favors high-energy CYBER_JUMP, SPIN_TWIRL & FIST_PUMP
 */
function pickRandomDancerMoveForBpm(
  bpm: number,
  currentMove?: DancerMoveVariant
): DancerMoveVariant {
  const pool: DancerMoveVariant[] =
    bpm >= 130
      ? [
          'CYBER_JUMP',
          'CYBER_JUMP',
          'SPIN_TWIRL',
          'SPIN_TWIRL',
          'FIST_PUMP',
          'FIST_PUMP',
          'BREAKDANCE_WAVE',
          'SHUFFLE_STEP',
        ]
      : bpm >= 120
      ? [
          'FIST_PUMP',
          'FIST_PUMP',
          'SPIN_TWIRL',
          'SHUFFLE_STEP',
          'SHUFFLE_STEP',
          'BREAKDANCE_WAVE',
          'CYBER_JUMP',
        ]
      : [
          'SHUFFLE_STEP',
          'SHUFFLE_STEP',
          'BREAKDANCE_WAVE',
          'BREAKDANCE_WAVE',
          'FIST_PUMP',
          'SPIN_TWIRL',
        ];
  const filtered = currentMove ? pool.filter((m) => m !== currentMove) : pool;
  const candidates = filtered.length > 0 ? filtered : ALL_DANCER_MOVES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

interface DancerHypeParticle {
  floor: FloorLevel;
  gridX: number;
  gridY: number;
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  kind: 'CONFETTI' | 'BUBBLE';
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  age: number;
  maxAge: number;
}

/**
 * Cross-browser rounded rectangle helper (works on all older Safari/iOS/Android WebView versions).
 */
function fillStrokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth: number = 1.5
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export const IsometricClubCanvas: React.FC<IsometricClubCanvasProps> = ({
  isPlaying,
  activeFloor,
  unlockedFloors,
  playerLevel,
  placedItems,
  staffMembers,
  guestsRef,
  floatingTextsRef,
  buildModeItem,
  buildRotation,
  placementModeStaff,
  relocatingStaffUid,
  activeDrink,
  parkingState,
  clubMetrics,
  clubBpm = 124,
  activeGenre = 'Pop',
  isRemoveMode,
  isEditDecorMode = false,
  editingPlacedItemUid = null,
  newlyPlacedItemHighlight = null,
  onLongPressPlacedItem,
  selectedSpriteId = null,
  onSelectSprite,
  onSpriteMoodListReport,
  activeBottleServices,
  onBottleServiceEvent,
  cameraZoom,
  cameraResetTick,
  onZoomChange,
  isEcoMode = false,
  dayNightOverrideHour = null,
  onCycleTimeReport,
  onEarnRevenue,
  onStaffTaskComplete,
  onQueueCountChange,
  onClickGrid,
  onClickBuyFloor2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredGridRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const gameHourRef = useRef<number>(18.25); // Starts at 6:15 PM Golden Sunset -> progresses into Deep Midnight Neon Peak
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    isPinching: boolean;
    initialDist: number;
    initialZoom: number;
    initialMidX: number;
    initialMidY: number;
    initialPanX: number;
    initialPanY: number;
  }>({
    isPinching: false,
    initialDist: 0,
    initialZoom: 1,
    initialMidX: 0,
    initialMidY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });
  const dragStateRef = useRef<{
    isDown: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    hasDragged: boolean;
  }>({
    isDown: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
    hasDragged: false,
  });

  const stairsHitboxRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  const longPressStateRef = useRef<{
    timerId: number | null;
    targetItemUid: string | null;
    startTimeMs: number;
    durationMs: number;
    triggered: boolean;
  }>({
    timerId: null,
    targetItemUid: null,
    startTimeMs: 0,
    durationMs: 420,
    triggered: false,
  });

  const clearLongPressTimer = () => {
    if (longPressStateRef.current.timerId !== null) {
      window.clearTimeout(longPressStateRef.current.timerId);
      longPressStateRef.current.timerId = null;
    }
    longPressStateRef.current.targetItemUid = null;
  };

  const dancerParticlesRef = useRef<DancerHypeParticle[]>([]);
  const bassDropRipplesRef = useRef<BassDropRippleWave[]>([]);
  const prevHypeSegmentsRef = useRef<number>(clubMetrics.hypeSegments);

  // Moving & Park-and-Go Road Traffic Vehicles (Eastbound front avenue, Westbound front avenue, and Real-World Parking Bays P1-P4 + Taxi Drop)
  const trafficCarsRef = useRef<TrafficCarAgent[]>([
    {
      id: 'car_parked_p1',
      lane: 'FRONT_EAST',
      gridX: -0.65,
      gridY: 12.12,
      speed: 2.35,
      currentSpeed: 0,
      bodyColor: '#2dd4bf',
      shadeColor: '#0f766e',
      isTaxi: false,
      stopCooldown: 0,
      carState: 'PARKED',
      stallIndex: 0,
      parkTimer: 16,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_parked_p2',
      lane: 'FRONT_EAST',
      gridX: 3.75,
      gridY: 12.12,
      speed: 2.4,
      currentSpeed: 0,
      bodyColor: '#f43f5e',
      shadeColor: '#9f1239',
      isTaxi: false,
      stopCooldown: 0,
      carState: 'PARKED',
      stallIndex: 2,
      parkTimer: 22,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_parked_p3',
      lane: 'FRONT_EAST',
      gridX: 5.95,
      gridY: 12.12,
      speed: 2.45,
      currentSpeed: 0,
      bodyColor: '#38bdf8',
      shadeColor: '#1e3a8a',
      isTaxi: false,
      stopCooldown: 0,
      carState: 'PARKED',
      stallIndex: 3,
      parkTimer: 28,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_taxi_east_1',
      lane: 'FRONT_EAST',
      gridX: -6.2,
      gridY: 13.55,
      speed: 2.35,
      currentSpeed: 2.35,
      bodyColor: '#facc15',
      shadeColor: '#ca8a04',
      isTaxi: true,
      stopCooldown: 0,
      carState: 'CRUISING',
      parkTimer: 0,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_sedan_east_2',
      lane: 'FRONT_EAST',
      gridX: 0.2,
      gridY: 13.55,
      speed: 2.4,
      currentSpeed: 2.4,
      bodyColor: '#a855f7',
      shadeColor: '#6b21a8',
      isTaxi: false,
      stopCooldown: 1.5,
      carState: 'CRUISING',
      parkTimer: 0,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_cyber_east_3',
      lane: 'FRONT_EAST',
      gridX: 7.4,
      gridY: 13.55,
      speed: 2.5,
      currentSpeed: 2.5,
      bodyColor: '#38bdf8',
      shadeColor: '#0284c7',
      isTaxi: false,
      stopCooldown: 2.5,
      carState: 'CRUISING',
      parkTimer: 0,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_coupe_west_1',
      lane: 'FRONT_WEST',
      gridX: 13.8,
      gridY: 14.72,
      speed: 2.55,
      currentSpeed: 2.55,
      bodyColor: '#fb7185',
      shadeColor: '#be123c',
      isTaxi: false,
      stopCooldown: 0,
      carState: 'CRUISING',
      parkTimer: 0,
      headlightFlashTimer: 0,
    },
    {
      id: 'car_taxi_west_2',
      lane: 'FRONT_WEST',
      gridX: 3.4,
      gridY: 14.72,
      speed: 2.45,
      currentSpeed: 2.45,
      bodyColor: '#facc15',
      shadeColor: '#ca8a04',
      isTaxi: true,
      stopCooldown: 0,
      carState: 'CRUISING',
      parkTimer: 0,
      headlightFlashTimer: 0,
    },
  ]);

  // Sidewalk Pedestrians Strolling Strictly Along the Front-Left & Front-Right Exterior Sidewalks (NEVER behind upper club walls)
  const pedestriansRef = useRef<PedestrianAgent[]>([
    {
      id: 'ped_perimeter_1',
      name: 'Sora',
      gridX: 0.4,
      gridY: 11.12,
      waypoints: [
        { x: -0.95, y: 11.12 },
        { x: 10.75, y: 11.12 },
        { x: 10.75, y: 1.35 },
        { x: 10.75, y: 11.12 },
      ],
      wpIndex: 1,
      speed: 0.92,
      shirtColor: '#38bdf8',
      hairColor: '#1e1b4b',
      pantsColor: '#0f172a',
      facingDir: 'SE',
      bubble: 'MUSIC',
      bubbleTimer: 4,
      favoriteGenre: 'Dance',
      hype: 84,
    },
    {
      id: 'ped_perimeter_2',
      name: 'Elena',
      gridX: 6.4,
      gridY: 11.12,
      waypoints: [
        { x: 10.75, y: 11.12 },
        { x: 10.75, y: 1.65 },
        { x: 10.75, y: 11.12 },
        { x: -0.85, y: 11.12 },
      ],
      wpIndex: 0,
      speed: 0.86,
      shirtColor: '#f472b6',
      hairColor: '#facc15',
      pantsColor: '#1e293b',
      facingDir: 'SE',
      bubble: 'SPARKLE',
      bubbleTimer: 5,
      favoriteGenre: 'Pop',
      hype: 89,
    },
    {
      id: 'ped_perimeter_3',
      name: 'Marcus V.',
      gridX: 10.75,
      gridY: 6.5,
      waypoints: [
        { x: 10.75, y: 1.45 },
        { x: 10.75, y: 11.12 },
        { x: 0.2, y: 11.12 },
        { x: 10.75, y: 11.12 },
      ],
      wpIndex: 0,
      speed: 0.96,
      shirtColor: '#4ade80',
      hairColor: '#451a03',
      pantsColor: '#1e3a8a',
      facingDir: 'NE',
      bubble: 'CHAT',
      bubbleTimer: 3.5,
      favoriteGenre: 'Electro',
      hype: 82,
    },
    {
      id: 'ped_perimeter_4',
      name: 'Nadia',
      gridX: 10.78,
      gridY: 3.4,
      waypoints: [
        { x: 10.78, y: 11.15 },
        { x: -0.75, y: 11.15 },
        { x: 10.78, y: 11.15 },
        { x: 10.78, y: 1.85 },
      ],
      wpIndex: 0,
      speed: 0.88,
      shirtColor: '#facc15',
      hairColor: '#7c2d12',
      pantsColor: '#0f172a',
      facingDir: 'SW',
      bubble: 'MUSIC',
      bubbleTimer: 4.5,
      favoriteGenre: 'Hip Hop',
      hype: 87,
    },
    {
      id: 'ped_perimeter_5',
      name: 'Devon',
      gridX: 8.8,
      gridY: 11.18,
      waypoints: [
        { x: -0.85, y: 11.18 },
        { x: 10.78, y: 11.18 },
        { x: 10.78, y: 2.2 },
        { x: 10.78, y: 11.18 },
      ],
      wpIndex: 0,
      speed: 0.91,
      shirtColor: '#a855f7',
      hairColor: '#0f172a',
      pantsColor: '#1e293b',
      facingDir: 'NW',
      bubble: null,
      bubbleTimer: 0,
      favoriteGenre: 'Latin',
      hype: 85,
    },
    {
      id: 'ped_perimeter_6',
      name: 'Tessa',
      gridX: 3.8,
      gridY: 11.16,
      waypoints: [
        { x: 10.75, y: 11.16 },
        { x: 10.75, y: 1.5 },
        { x: 10.75, y: 11.16 },
        { x: -0.65, y: 11.16 },
      ],
      wpIndex: 0,
      speed: 0.84,
      shirtColor: '#fb923c',
      hairColor: '#111116',
      pantsColor: '#1e1b4b',
      facingDir: 'SE',
      bubble: 'COCKTAIL',
      bubbleTimer: 4,
      favoriteGenre: 'Rock',
      hype: 86,
    },
  ]);

  useEffect(() => {
    panOffsetRef.current = { x: 0, y: 0 };
  }, [cameraResetTick]);

  useEffect(() => {
    if (typeof dayNightOverrideHour === 'number') {
      gameHourRef.current = dayNightOverrideHour;
    }
  }, [dayNightOverrideHour]);

  // Subscribe to soundEngine bass drops so every Bass Drop spawns a dynamic traveling ripple wave across the dance floor!
  useEffect(() => {
    return soundEngine.subscribeBassDrop(() => {
      const props = latestPropsRef.current;
      const floor = props.activeFloor;
      const floorItems = props.placedItems.filter((p) => p.floor === floor);
      const mood = getClubMoodLightingProfile(props.activeGenre);

      // Compute dance floor centroid and DJ booth front-stage origin on the active floor
      const danceTiles = floorItems.filter(
        (p) => getCatalogItem(p.catalogId)?.category === 'DANCE_TILE'
      );
      const djBooths = floorItems.filter(
        (p) => getCatalogItem(p.catalogId)?.category === 'DJ_BOOTH'
      );

      let dfCx = 4.2;
      let dfCy = 4.2;
      if (danceTiles.length > 0) {
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < danceTiles.length; i++) {
          const dt = danceTiles[i];
          const cat = getCatalogItem(dt.catalogId);
          const fp = cat ? getRotatedFootprint(cat, dt.rotation) : { width: 1, depth: 1 };
          sumX += dt.gridX + fp.width * 0.5;
          sumY += dt.gridY + fp.depth * 0.5;
        }
        dfCx = sumX / danceTiles.length;
        dfCy = sumY / danceTiles.length;
      }

      let originGx = dfCx;
      let originGy = dfCy;
      if (djBooths.length > 0) {
        const dj = djBooths[0];
        const cat = getCatalogItem(dj.catalogId);
        const fp = cat ? getRotatedFootprint(cat, dj.rotation) : { width: 2, depth: 1 };
        const djCx = dj.gridX + fp.width * 0.5;
        const djCy = dj.gridY + fp.depth * 0.85;
        // Start ripple right where the DJ console subwoofers meet the dance floor so it sweeps outward across all tiles
        originGx = djCx * 0.58 + dfCx * 0.42;
        originGy = djCy * 0.58 + dfCy * 0.42;
      }

      const ripples = bassDropRipplesRef.current;
      if (ripples.length >= 4) {
        ripples.shift();
      }
      ripples.push({
        id: `bass_ripple_${performance.now()}_${Math.random()}`,
        floor,
        originGx,
        originGy,
        age: 0,
        maxAge: 2.15,
        radius: 0.18,
        maxRadius: 11.6,
        primaryColor: mood.primaryHex || '#22d3ee',
        secondaryColor: mood.secondaryHex || '#e879f9',
        reactedGuestIds: new Set<string>(),
      });
    });
  }, []);

  // Keep latest props in a mutable ref so the 60fps requestAnimationFrame loop NEVER restarts on React renders
  const latestPropsRef = useRef({
    isPlaying,
    activeFloor,
    unlockedFloors,
    playerLevel,
    placedItems,
    staffMembers,
    buildModeItem,
    buildRotation,
    placementModeStaff,
    relocatingStaffUid,
    activeDrink,
    parkingState,
    clubMetrics,
    clubBpm,
    activeGenre,
    isRemoveMode,
    isEditDecorMode,
    editingPlacedItemUid,
    newlyPlacedItemHighlight,
    onLongPressPlacedItem,
    selectedSpriteId,
    onSelectSprite,
    onSpriteMoodListReport,
    activeBottleServices,
    onBottleServiceEvent,
    cameraZoom,
    onZoomChange,
    isEcoMode,
    dayNightOverrideHour,
    onCycleTimeReport,
    onEarnRevenue,
    onStaffTaskComplete,
    onQueueCountChange,
    onClickGrid,
    onClickBuyFloor2,
  });

  latestPropsRef.current = {
    isPlaying,
    activeFloor,
    unlockedFloors,
    playerLevel,
    placedItems,
    staffMembers,
    buildModeItem,
    buildRotation,
    placementModeStaff,
    relocatingStaffUid,
    activeDrink,
    parkingState,
    clubMetrics,
    clubBpm,
    activeGenre,
    isRemoveMode,
    isEditDecorMode,
    editingPlacedItemUid,
    newlyPlacedItemHighlight,
    onLongPressPlacedItem,
    selectedSpriteId,
    onSelectSprite,
    onSpriteMoodListReport,
    activeBottleServices,
    onBottleServiceEvent,
    cameraZoom,
    onZoomChange,
    isEcoMode,
    dayNightOverrideHour,
    onCycleTimeReport,
    onEarnRevenue,
    onStaffTaskComplete,
    onQueueCountChange,
    onClickGrid,
    onClickBuyFloor2,
  };

  const getViewportTransform = (width: number, height: number, userZoom: number) => {
    const isPortraitOrPhone = width < 768;
    const isTablet = width >= 768 && width <= 1180;
    const autoScale = isPortraitOrPhone
      ? Math.min(0.95, Math.max(0.46, Math.min(width / 690, height / 620)))
      : isTablet
      ? Math.min(1.08, Math.max(0.55, Math.min(width / 760, height / 660)))
      : Math.min(1.18, Math.max(0.54, Math.min(width / 780, height / 670)));
    const scale = autoScale * userZoom;
    const tileW = BASE_TILE_W * scale;
    const tileH = BASE_TILE_H * scale;
    const floorLift = latestPropsRef.current.activeFloor >= 2 ? -36 * scale : 0;
    const originX = width * (width < 640 ? 0.52 : 0.505) + panOffsetRef.current.x;
    const originY = height * (width < 640 ? 0.25 : isTablet ? 0.24 : 0.235) + panOffsetRef.current.y + floorLift;
    return { scale, tileW, tileH, originX, originY };
  };

  const screenToIso = (
    sx: number,
    sy: number,
    originX: number,
    originY: number,
    tileW: number,
    tileH: number
  ) => {
    const dx = sx - originX;
    const dy = sy - originY;
    const gx = Math.floor((dx / (tileW / 2) + dy / (tileH / 2)) / 2);
    const gy = Math.floor((dy / (tileH / 2) - dx / (tileW / 2)) / 2);
    return { x: gx, y: gy };
  };

  // Dedicated Game Loop with Adaptive Thermal Pacing for iPad & Phone Browsers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let lastTimeMs = performance.now();
    let lastPaintTimeMs = 0;
    let spawnAccumulator = 0;
    let particleEmitAccumulator = 0;
    let moodReportAccumulator = 0;
    let revenueReportAccumulator = 0;
    let pendingCashDelta = 0;
    let pendingXpDelta = 0;
    let lastReportedQueueCount = -1;

    let viewportWidth = canvas.clientWidth || window.innerWidth;
    let viewportHeight = canvas.clientHeight || window.innerHeight;
    let activeDpr = 1.25;

    const isCoarsePointerDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        /iPad|iPhone|iPod|Android/i.test(navigator.userAgent));

    const computeOptimalDpr = () => {
      const rawDpr = window.devicePixelRatio || 1;
      if (latestPropsRef.current.isEcoMode) {
        return Math.min(rawDpr, 1.15);
      }
      // On iPad & mobile browsers, cap retina backing store at 1.35x to prevent GPU thermal throttling/heating
      if (isCoarsePointerDevice || (window.innerWidth <= 1180 && rawDpr > 1.35)) {
        return Math.min(rawDpr, 1.35);
      }
      return Math.min(rawDpr, 1.65);
    };

    const updateCanvasSize = () => {
      activeDpr = computeOptimalDpr();
      viewportWidth = canvas.clientWidth || window.innerWidth;
      viewportHeight = canvas.clientHeight || window.innerHeight;
      const targetW = Math.floor(viewportWidth * activeDpr);
      const targetH = Math.floor(viewportHeight * activeDpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);

    const spawnParticlesAboveDancer = (dancer: GuestAgent, count: number) => {
      const particles = dancerParticlesRef.current;
      const maxParticles =
        latestPropsRef.current.isEcoMode || isCoarsePointerDevice ? 48 : 85;
      for (let k = 0; k < count; k++) {
        if (particles.length >= maxParticles) {
          particles.shift();
        }
        const isBubble = Math.random() < 0.46;
        const color =
          MAX_HYPE_PARTICLE_COLORS[
            Math.floor(Math.random() * MAX_HYPE_PARTICLE_COLORS.length)
          ];
        particles.push({
          floor: dancer.floor,
          gridX: dancer.gridX + (Math.random() - 0.5) * 0.28,
          gridY: dancer.gridY + (Math.random() - 0.5) * 0.28,
          offsetX: (Math.random() - 0.5) * 16,
          offsetY: -44 - Math.random() * 12,
          vx: (Math.random() - 0.5) * (isBubble ? 10 : 22),
          vy: isBubble ? -18 - Math.random() * 14 : -26 - Math.random() * 18,
          kind: isBubble ? 'BUBBLE' : 'CONFETTI',
          color,
          size: isBubble ? 2.8 + Math.random() * 2.4 : 3.2 + Math.random() * 2.6,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 11,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 4 + Math.random() * 4,
          age: 0,
          maxAge: isBubble ? 1.15 + Math.random() * 0.55 : 0.95 + Math.random() * 0.5,
        });
      }
    };

    const stepSimulation60fps = (dt: number) => {
      const props = latestPropsRef.current;
      if (!props.isPlaying) return;

      const items = props.placedItems;
      const drink = props.activeDrink;
      const metrics = props.clubMetrics;
      const maxFloors = props.unlockedFloors;
      const bouncers = props.parkingState.bouncerCount;

      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) {
        fts[i].age += dt * 0.72;
        if (fts[i].age >= 1) {
          fts.splice(i, 1);
        }
      }

      // 0A. Update Exterior Road Traffic Cars with Strict Non-Overlapping Headway, Real-World Parking Lot Pull-In/Pull-Out, and Customer Car Exit!
      const trafficCars = trafficCarsRef.current;
      const guests = guestsRef.current;
      const MIN_SAFE_CAR_GAP = 3.45; // Strict minimum grid distance between car centers so vehicles NEVER overlap
      const SLOW_APPROACH_GAP = 5.1;

      const spawnCustomerFromParkedCar = (car: TrafficCarAgent, stall: ParkingLotStall) => {
        const currentExteriorQueue = guests.filter(
          (g) => g.state === 'QUEUEING' || g.state === 'ARRIVING_FROM_CAR'
        ).length;
        if (currentExteriorQueue >= 8) return;

        const insideCountNow = guests.filter((g) => !isExteriorGuestState(g.state)).length;
        if (insideCountNow >= metrics.maxGuests && currentExteriorQueue >= 6) return;

        const isCeleb = metrics.totalHype >= 130 && Math.random() < 0.24;
        const namePool = isCeleb ? CELEBRITY_NAMES : GUEST_NAMES;
        const bouncerStaffCount = props.staffMembers.filter((s) => s.role === 'BOUNCER').length;
        const queueWait = Math.max(0.7, 3.3 - (bouncers + bouncerStaffCount) * 0.62);
        const bubbles: BubbleType[] = ['MUSIC', 'CHAT', 'SPARKLE'];

        // Customer steps right out of the parked car door onto the parking apron and walks across the crosswalk to the Red Carpet queue!
        guests.push({
          id: `guest_car_${performance.now()}_${Math.random()}`,
          name: namePool[Math.floor(Math.random() * namePool.length)],
          isCelebrity: isCeleb,
          floor: 1,
          targetFloor: 1,
          gridX: stall.gx + 0.32,
          gridY: stall.gy - 0.35,
          path: [],
          state: 'QUEUEING',
          stateTimer: queueWait,
          patience: 100,
          hype: isCeleb ? 97 : 80 + Math.floor(Math.random() * 18),
          bubble: isCeleb ? 'VIP_CROWN' : bubbles[Math.floor(Math.random() * bubbles.length)],
          bubbleTimer: 5.5,
          shirtColor: isCeleb
            ? '#facc15'
            : SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
          hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
          pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
          cashSpent: 0,
          facingDir: 'NW',
          carId: car.id,
          chatText: car.isTaxi
            ? 'Just hopped out of the taxi! Time to hit the neon floor! 🚕✨'
            : `Parked in Bay ${stall.label}! Let’s get inside! 🚗🔥`,
          chatTimer: 4.5,
        });
      };

      for (let cIdx = 0; cIdx < trafficCars.length; cIdx++) {
        const car = trafficCars[cIdx];
        if (!car.carState) car.carState = 'CRUISING';
        if (car.stopCooldown > 0) car.stopCooldown -= dt;
        if ((car.headlightFlashTimer ?? 0) > 0) {
          car.headlightFlashTimer = Math.max(0, (car.headlightFlashTimer ?? 0) - dt);
        }

        // 1. STATE: PARKING_IN (Smoothly pulling from FRONT_EAST avenue gy=13.55 into assigned parking stall gy=12.12)
        if (car.carState === 'PARKING_IN' && car.stallIndex !== undefined) {
          const stall = PARKING_LOT_STALLS[car.stallIndex];
          const dx = stall.gx - car.gridX;
          const dy = stall.gy - car.gridY;
          const dist = Math.hypot(dx, dy);
          const pullSpeed = 1.85 * dt;
          if (dist <= pullSpeed + 0.04) {
            car.gridX = stall.gx;
            car.gridY = stall.gy;
            car.carState = 'PARKED';
            car.currentSpeed = 0;
            car.headlightFlashTimer = 0.85;
            car.parkTimer = car.isTaxi ? 4.5 : 15 + Math.random() * 12;
            // Customer exits the car door and walks to the Red Carpet entrance!
            spawnCustomerFromParkedCar(car, stall);
          } else {
            car.gridX += (dx / dist) * pullSpeed;
            car.gridY += (dy / dist) * pullSpeed;
            car.currentSpeed = 1.6;
          }
          continue;
        }

        // 2. STATE: PARKED or WAITING_PICKUP (Resting in the marked parking bay until parkTimer expires or a leaving guest walks back to the car)
        if (car.carState === 'PARKED' || car.carState === 'WAITING_PICKUP') {
          car.currentSpeed = 0;
          car.parkTimer = (car.parkTimer ?? 12) - dt;
          const hasWalkingGuest = guests.some(
            (g) => g.state === 'WALKING_TO_CAR' && g.carId === car.id
          );
          if (hasWalkingGuest) {
            car.carState = 'WAITING_PICKUP';
            car.parkTimer = Math.max(car.parkTimer ?? 2, 1.5);
            continue;
          } else if (car.carState === 'WAITING_PICKUP') {
            car.carState = 'PARKED';
          }

          if ((car.parkTimer ?? 0) <= 0) {
            // Check if the Eastbound road lane (gy=13.55) is clear before pulling out of the parking space!
            const mergeTargetX = car.gridX + 0.65;
            const isLaneBlocked = trafficCars.some(
              (other) =>
                other.id !== car.id &&
                other.lane === 'FRONT_EAST' &&
                (other.carState === 'CRUISING' ||
                  other.carState === 'PULLING_OUT' ||
                  other.carState === 'PARKING_IN') &&
                other.gridX > mergeTargetX - 3.9 &&
                other.gridX < mergeTargetX + 3.1
            );
            if (!isLaneBlocked) {
              car.carState = 'PULLING_OUT';
              car.headlightFlashTimer = 0.7;
            } else {
              // Wait patiently in the stall until passing traffic clears
              car.parkTimer = 0.65;
            }
          }
          continue;
        }

        // 3. STATE: PULLING_OUT (Backing/pulling out of the parking stall into FRONT_EAST road lane gy=13.55 without colliding)
        if (car.carState === 'PULLING_OUT') {
          const targetGy = 13.55;
          const targetGx =
            car.stallIndex !== undefined
              ? PARKING_LOT_STALLS[car.stallIndex].gx + 0.85
              : car.gridX + 0.5;
          // Hold yield if an Eastbound car suddenly approached while pulling out
          const closeTraffic = trafficCars.some(
            (other) =>
              other.id !== car.id &&
              other.lane === 'FRONT_EAST' &&
              other.carState === 'CRUISING' &&
              other.gridX > car.gridX - 3.3 &&
              other.gridX < car.gridX + 2.4
          );
          if (closeTraffic && car.gridY < 12.7) {
            car.currentSpeed = 0;
            continue;
          }

          const dx = targetGx - car.gridX;
          const dy = targetGy - car.gridY;
          const dist = Math.hypot(dx, dy);
          const mergeStep = 1.75 * dt;
          if (dist <= mergeStep + 0.05) {
            car.gridY = 13.55;
            car.carState = 'CRUISING';
            car.stallIndex = undefined;
            car.stopCooldown = 7.5;
            car.currentSpeed = car.speed * 0.75;
          } else {
            car.gridX += (dx / dist) * mergeStep;
            car.gridY += (dy / dist) * mergeStep;
            car.currentSpeed = 1.5;
          }
          continue;
        }

        // 4. STATE: CRUISING along the avenue with intelligent car-following distance & automatic parking lot entry
        if (car.lane === 'FRONT_EAST') {
          car.gridY = 13.55;

          // Check if this cruising Eastbound car should pull into an open parking stall to park & let a customer out!
          if (car.stopCooldown <= 0) {
            const occupiedStalls = new Set<number>();
            for (let k = 0; k < trafficCars.length; k++) {
              const stIdx = trafficCars[k].stallIndex;
              if (stIdx !== undefined && trafficCars[k].carState !== 'CRUISING') {
                occupiedStalls.add(stIdx);
              }
            }

            for (let s = 0; s < PARKING_LOT_STALLS.length; s++) {
              const stall = PARKING_LOT_STALLS[s];
              if (occupiedStalls.has(stall.idx)) continue;
              // Taxis love the TAXI drop bay (idx 1) or any open bay; regular cars take P1..P4
              if (stall.isTaxiDrop && !car.isTaxi && occupiedStalls.size < 3) continue;
              const approachDx = stall.gx - car.gridX;
              if (approachDx >= 0.45 && approachDx <= 1.25) {
                car.carState = 'PARKING_IN';
                car.stallIndex = stall.idx;
                car.headlightFlashTimer = 0.6;
                break;
              }
            }
            if (car.carState === 'PARKING_IN') continue;
          }

          // Strict Non-Overlapping Car-Following Check for Eastbound Lane (+X direction)
          let minAheadGap = Infinity;
          let leadCarSpeed = car.speed;
          for (let j = 0; j < trafficCars.length; j++) {
            if (j === cIdx) continue;
            const other = trafficCars[j];
            const inEastCorridor =
              other.lane === 'FRONT_EAST' &&
              (other.carState === 'CRUISING' ||
                other.carState === 'PULLING_OUT' ||
                (other.carState === 'PARKING_IN' && other.gridY > 12.65));
            if (!inEastCorridor) continue;
            const gap = other.gridX - car.gridX;
            if (gap > 0 && gap < minAheadGap) {
              minAheadGap = gap;
              leadCarSpeed = other.currentSpeed ?? other.speed;
            }
          }

          let desiredSpeed = car.speed;
          if (minAheadGap < MIN_SAFE_CAR_GAP) {
            desiredSpeed = 0;
            // Hard safety clamp so two cars in the same lane never overlap even by a pixel
            if (minAheadGap < MIN_SAFE_CAR_GAP - 0.15) {
              car.gridX -= (MIN_SAFE_CAR_GAP - minAheadGap) * 0.35;
            }
          } else if (minAheadGap < SLOW_APPROACH_GAP) {
            const blend =
              (minAheadGap - MIN_SAFE_CAR_GAP) / (SLOW_APPROACH_GAP - MIN_SAFE_CAR_GAP);
            desiredSpeed = Math.min(
              car.speed,
              leadCarSpeed * 0.85 + (car.speed - leadCarSpeed * 0.85) * blend
            );
          }

          const prevSpeed = car.currentSpeed ?? car.speed;
          car.currentSpeed = prevSpeed + (desiredSpeed - prevSpeed) * Math.min(1, dt * 7.5);
          car.gridX += car.currentSpeed * dt;

          // Wrap around at far right of street, ensuring spawn position is at least MIN_SAFE_CAR_GAP behind the rear-most Eastbound car
          if (car.gridX > 16.8) {
            let minEastX = -7.5;
            for (let j = 0; j < trafficCars.length; j++) {
              if (j !== cIdx && trafficCars[j].lane === 'FRONT_EAST') {
                minEastX = Math.min(minEastX, trafficCars[j].gridX - MIN_SAFE_CAR_GAP - 0.8);
              }
            }
            car.gridX = Math.min(-7.5 - Math.random() * 1.6, minEastX);
          }
        } else if (car.lane === 'FRONT_WEST') {
          car.gridY = 14.72;

          // Strict Non-Overlapping Car-Following Check for Westbound Lane (-X direction)
          let minAheadGap = Infinity;
          let leadCarSpeed = car.speed;
          for (let j = 0; j < trafficCars.length; j++) {
            if (j === cIdx) continue;
            const other = trafficCars[j];
            if (other.lane !== 'FRONT_WEST') continue;
            const gap = car.gridX - other.gridX;
            if (gap > 0 && gap < minAheadGap) {
              minAheadGap = gap;
              leadCarSpeed = other.currentSpeed ?? other.speed;
            }
          }

          let desiredSpeed = car.speed;
          if (minAheadGap < MIN_SAFE_CAR_GAP) {
            desiredSpeed = 0;
            if (minAheadGap < MIN_SAFE_CAR_GAP - 0.15) {
              car.gridX += (MIN_SAFE_CAR_GAP - minAheadGap) * 0.35;
            }
          } else if (minAheadGap < SLOW_APPROACH_GAP) {
            const blend =
              (minAheadGap - MIN_SAFE_CAR_GAP) / (SLOW_APPROACH_GAP - MIN_SAFE_CAR_GAP);
            desiredSpeed = Math.min(
              car.speed,
              leadCarSpeed * 0.85 + (car.speed - leadCarSpeed * 0.85) * blend
            );
          }

          const prevSpeed = car.currentSpeed ?? car.speed;
          car.currentSpeed = prevSpeed + (desiredSpeed - prevSpeed) * Math.min(1, dt * 7.5);
          car.gridX -= car.currentSpeed * dt;

          if (car.gridX < -7.8) {
            let maxWestX = 16.5;
            for (let j = 0; j < trafficCars.length; j++) {
              if (j !== cIdx && trafficCars[j].lane === 'FRONT_WEST') {
                maxWestX = Math.max(maxWestX, trafficCars[j].gridX + MIN_SAFE_CAR_GAP + 0.8);
              }
            }
            car.gridX = Math.max(16.5 + Math.random() * 1.6, maxWestX);
          }
        }
      }

      // 0B. Update Exterior Sidewalk Pedestrians Strolling Around the Building
      const peds = pedestriansRef.current;
      for (let pIdx = 0; pIdx < peds.length; pIdx++) {
        const ped = peds[pIdx];
        if (ped.bubbleTimer > 0) {
          ped.bubbleTimer -= dt;
          if (ped.bubbleTimer <= 0) {
            ped.bubble = null;
          }
        } else if (Math.random() < dt * 0.18) {
          const pedBubbles: BubbleType[] = ['MUSIC', 'CHAT', 'SPARKLE', 'COCKTAIL'];
          ped.bubble = pedBubbles[Math.floor(Math.random() * pedBubbles.length)];
          ped.bubbleTimer = 3.5 + Math.random() * 2.5;
        }

        const targetWp = ped.waypoints[ped.wpIndex % ped.waypoints.length];
        const dx = targetWp.x - ped.gridX;
        const dy = targetWp.y - ped.gridY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            ped.facingDir = dx >= 0 ? 'SE' : 'NW';
          } else {
            ped.facingDir = dy >= 0 ? 'SW' : 'NE';
          }
        }
        const step = ped.speed * dt;
        if (dist <= step) {
          ped.gridX = targetWp.x;
          ped.gridY = targetWp.y;
          ped.wpIndex = (ped.wpIndex + 1) % ped.waypoints.length;
        } else {
          ped.gridX += (dx / dist) * step;
          ped.gridY += (dy / dist) * step;
        }
      }

      // Update Max-Hype (3/3 segments) Dancer Confetti & Bubbles Particle System at 60fps
      const activeParticles = dancerParticlesRef.current;
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.age += dt;
        if (p.age >= p.maxAge) {
          activeParticles.splice(i, 1);
          continue;
        }
        p.swayPhase += p.swaySpeed * dt;
        p.rotation += p.rotationSpeed * dt;
        const swayVelX = Math.sin(p.swayPhase) * (p.kind === 'BUBBLE' ? 11 : 18);
        p.offsetX += (p.vx + swayVelX) * dt;
        p.offsetY += p.vy * dt;
        if (p.kind === 'CONFETTI') {
          p.vy += 36 * dt;
        } else {
          p.vy -= 4 * dt;
        }
      }

      // Update Dynamic Bass Drop Dance Floor Ripple Waves & Trigger Wave-Synced Crowd Reactions as the Wavefront Reaches Each Guest!
      const activeRipples = bassDropRipplesRef.current;
      for (let rIdx = activeRipples.length - 1; rIdx >= 0; rIdx--) {
        const ripple = activeRipples[rIdx];
        ripple.age += dt;
        if (ripple.age >= ripple.maxAge) {
          activeRipples.splice(rIdx, 1);
          continue;
        }
        // Wavefront expands smoothly across the dance floor at ~5.35 grid tiles per second
        ripple.radius = 0.18 + ripple.age * 5.35;

        // Check every interior guest on this floor: when the expanding ripple wavefront passes under their feet, trigger a live responsive reaction!
        let waveChatAssignedThisFrame = false;
        for (let gIdx = 0; gIdx < guests.length; gIdx++) {
          const g = guests[gIdx];
          if (
            g.floor !== ripple.floor ||
            isExteriorGuestState(g.state) ||
            ripple.reactedGuestIds.has(g.id)
          ) {
            continue;
          }
          const distToOrigin = Math.hypot(
            g.gridX - ripple.originGx,
            g.gridY - ripple.originGy
          );
          if (Math.abs(distToOrigin - ripple.radius) <= 0.76) {
            ripple.reactedGuestIds.add(g.id);
            g.hype = Math.min(100, g.hype + 14);
            const dropBubbles: BubbleType[] = ['SPARKLE', 'MUSIC', 'VIP_CROWN', 'CHAT'];
            g.bubble = g.isCelebrity
              ? 'VIP_CROWN'
              : dropBubbles[Math.floor(Math.random() * dropBubbles.length)];
            g.bubbleTimer = Math.max(g.bubbleTimer, 4.2);

            if (g.state === 'DANCING' || g.state === 'DANCER_MOVES') {
              const highEnergyMoves: DancerMoveVariant[] = [
                'CYBER_JUMP',
                'FIST_PUMP',
                'SPIN_TWIRL',
                'BREAKDANCE_WAVE',
              ];
              g.state = 'DANCER_MOVES';
              g.danceMove =
                highEnergyMoves[Math.floor(Math.random() * highEnergyMoves.length)];
              g.stateTimer = Math.max(g.stateTimer, 7.2);
              spawnParticlesAboveDancer(g, 5);

              if (!waveChatAssignedThisFrame && ripple.reactedGuestIds.size <= 3) {
                waveChatAssignedThisFrame = true;
                const dropChats = [
                  'THAT BASS DROP RIPPLE!! HANDS UP!! 🙌🔊🔥',
                  'FEEL THE FLOOR SHOCKWAVE!! 🪩⚡',
                  'BASS CANNON HIT THE DANCE FLOOR!! 💥🎶',
                ];
                g.chatText = dropChats[Math.floor(Math.random() * dropChats.length)];
                g.chatTimer = 5.5;
              }
            } else {
              spawnParticlesAboveDancer(g, 3);
            }
          }
        }
      }

      const currentBpm = Math.max(90, Math.min(180, props.clubBpm || 124));
      const beatDurationSec = 60 / currentBpm;

      if (metrics.hypeSegments >= 3) {
        const activeDancers = guests.filter(
          (g) => g.state === 'DANCING' || g.state === 'DANCER_MOVES'
        );
        if (prevHypeSegmentsRef.current < 3 && activeDancers.length > 0) {
          for (const d of activeDancers) {
            spawnParticlesAboveDancer(d, 7);
          }
        }
        particleEmitAccumulator += dt;
        if (particleEmitAccumulator >= 0.085 && activeDancers.length > 0) {
          particleEmitAccumulator = 0;
          for (const d of activeDancers) {
            if (Math.random() < 0.78) {
              spawnParticlesAboveDancer(d, 2);
            }
          }
        }
      }
      prevHypeSegmentsRef.current = metrics.hypeSegments;
      let earnedCashThisFrame = 0;
      let earnedXpThisFrame = 0;

      // Ensure all currently seated/ordering guests occupy distinct, valid furniture slots (no clustering on a single seat)
      reconcileOccupiedFurnitureSlots(items, guests);

      // Separate interior club guests from customers outside (queueing or walking between parked cars and the club door)
      let insideGuestsCount = guests.filter((g) => !isExteriorGuestState(g.state)).length;
      const queuedList = guests.filter((g) => g.state === 'QUEUEING');

      // Smoothly advance queued customers (including customers who just stepped out of their parked car!) into single-file line slots leading to the Red Carpet Door (x=2.22, y=10.42)
      for (let qIdx = 0; qIdx < queuedList.length; qIdx++) {
        const qg = queuedList[qIdx];
        const slotX = 2.22 - qIdx * 0.72;
        const slotY = 10.42 + (qIdx % 2) * 0.08;
        qg.queueSlotCoord = { x: slotX, y: slotY };
        const qdx = slotX - qg.gridX;
        const qdy = slotY - qg.gridY;
        const qDist = Math.hypot(qdx, qdy);
        if (qDist > 0.03) {
          const walkStep = Math.min(qDist, 1.42 * dt);
          qg.gridX += (qdx / qDist) * walkStep;
          qg.gridY += (qdy / qDist) * walkStep;
          if (Math.abs(qdx) >= Math.abs(qdy)) {
            qg.facingDir = qdx >= 0 ? 'SE' : 'NW';
          } else {
            qg.facingDir = qdy >= 0 ? 'SW' : 'NE';
          }
        } else {
          qg.gridX = slotX;
          qg.gridY = slotY;
          qg.facingDir = 'NE';
        }
      }

      for (let i = guests.length - 1; i >= 0; i--) {
        const guest = guests[i];

        // If the guest is QUEUEING on the Red Carpet:
        if (guest.state === 'QUEUEING') {
          if (guest.bubbleTimer > 0) {
            guest.bubbleTimer -= dt;
            if (guest.bubbleTimer <= 0) guest.bubble = null;
          }
          const qIdx = queuedList.indexOf(guest);
          const isAtRedCarpetDoor =
            qIdx === 0 && Math.hypot(guest.gridX - 2.22, guest.gridY - 10.42) < 0.25;
          const isClubFull = insideGuestsCount >= metrics.maxGuests;

          if (isClubFull) {
            // Club is at max capacity: customers fall in line along the red carpet and wait for an interior guest to leave
            guest.stateTimer = Math.max(0.45, guest.stateTimer);
            if (!guest.bubble && Math.random() < dt * 0.35) {
              guest.bubble = qIdx === 0 ? 'EXCLAMATION' : 'MUSIC';
              guest.bubbleTimer = 3.2;
            }
            continue;
          }

          // Only the customer at the front of the red carpet line steps through the Red Carpet Door
          if (!isAtRedCarpetDoor) {
            continue;
          }
          guest.stateTimer -= dt;
        } else {
          guest.stateTimer -= dt;
        }

        if (guest.bubbleTimer > 0 && guest.state !== 'QUEUEING') {
          guest.bubbleTimer -= dt;
          if (guest.bubbleTimer <= 0) {
            guest.bubble = null;
          }
        }

        // BPM-driven DANCER_MOVES & Dynamic 10-15s Synchronized Group Dancing AI
        if (guest.state === 'DANCER_MOVES' || guest.state === 'DANCING') {
          if (!guest.danceMove) {
            guest.danceMove = pickRandomDancerMoveForBpm(currentBpm);
            guest.dancePhaseOffset = Math.random() * Math.PI * 2;
          }

          // Active Synchronized Group Dance Session (10-15 seconds)
          if (guest.groupDanceId && (guest.groupDanceTimer ?? 0) > 0) {
            guest.groupDanceTimer = (guest.groupDanceTimer ?? 0) - dt;
            guest.state = 'DANCER_MOVES';
            // Keep stateTimer alive while group dance is active so members finish the routine together
            guest.stateTimer = Math.max(guest.stateTimer, guest.groupDanceTimer + 1.0);

            if (guest.groupDanceTimer <= 0) {
              guest.groupDanceId = undefined;
              guest.groupDanceTimer = undefined;
              guest.groupDanceCenter = undefined;
              guest.groupDanceSlotIndex = undefined;
              guest.groupDanceSize = undefined;
              guest.groupDancePattern = undefined;
              guest.dancePhaseOffset = Math.random() * Math.PI * 2;
            }
          } else {
            // Check for nearby dancing guests within 2.5 tiles on the same floor to initiate a 10-15s Synchronized Group Dance!
            if (guest.path.length === 0 && Math.random() < dt * 0.42) {
              const nearbyDancers = guests.filter(
                (other) =>
                  other.floor === guest.floor &&
                  other.path.length === 0 &&
                  (other.state === 'DANCING' || other.state === 'DANCER_MOVES') &&
                  !other.groupDanceId &&
                  Math.hypot(other.gridX - guest.gridX, other.gridY - guest.gridY) <= 2.65
              );

              if (nearbyDancers.length >= 2) {
                const crew = nearbyDancers.slice(0, 5);
                const groupId = `grp_${Date.now()}_${Math.floor(Math.random() * 999)}`;
                const syncDuration = 10.0 + Math.random() * 5.0; // 10-15 seconds
                const sharedMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
                const patterns: Array<'CIRCLE_GROOVE' | 'LINE_SHUFFLE' | 'BOUNCE_WAVE'> = [
                  'CIRCLE_GROOVE',
                  'LINE_SHUFFLE',
                  'BOUNCE_WAVE',
                ];
                const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

                let sumX = 0;
                let sumY = 0;
                for (const m of crew) {
                  sumX += m.gridX;
                  sumY += m.gridY;
                }
                const centerX = sumX / crew.length;
                const centerY = sumY / crew.length;

                crew.forEach((member, slotIdx) => {
                  member.state = 'DANCER_MOVES';
                  member.groupDanceId = groupId;
                  member.groupDanceTimer = syncDuration;
                  member.groupDanceCenter = { x: centerX, y: centerY };
                  member.groupDanceSlotIndex = slotIdx;
                  member.groupDanceSize = crew.length;
                  member.groupDancePattern = chosenPattern;
                  member.danceMove = sharedMove;
                  member.danceMoveTimer = syncDuration;
                  // Locked phase (or tight wave ripple for BOUNCE_WAVE) so animations synchronize
                  member.dancePhaseOffset =
                    chosenPattern === 'BOUNCE_WAVE' ? slotIdx * 0.28 : 0;
                  member.stateTimer = Math.max(member.stateTimer, syncDuration + 1.5);
                  member.hype = Math.min(100, member.hype + 12);
                  member.bubble = slotIdx % 2 === 0 ? 'MUSIC' : 'SPARKLE';
                  member.bubbleTimer = 5.5;
                  member.chatText = `Synced ${chosenPattern.replace('_', ' ')} crew dance! 🕺💃🔥`;
                  member.chatTimer = 6.0;
                });
              }
            }

            if (guest.state === 'DANCING' && guest.stateTimer < 6.5) {
              guest.state = 'DANCER_MOVES';
              guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
              guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 4));
            }
            if (guest.state === 'DANCER_MOVES' && !guest.groupDanceId) {
              guest.danceMoveTimer = (guest.danceMoveTimer ?? beatDurationSec * 8) - dt;
              if (guest.danceMoveTimer <= 0) {
                guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
                guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
              }
            }
          }
        }

        if (guest.path.length > 0) {
          if (
            guest.path.length === 1 &&
            (guest.state === 'WALKING_TO_BAR' || guest.state === 'WALKING_TO_SEAT')
          ) {
            const isBarWalk = guest.state === 'WALKING_TO_BAR';
            const slotPool = isBarWalk
              ? buildBarSlotCandidates(items, guest.floor)
              : buildSeatOrTableSlotCandidates(items, guest.floor);
            const targetSlot = slotPool.find((c) => c.slotId === guest.assignedSlotId);
            if (!targetSlot || !isFurnitureSlotAvailable(targetSlot, guests, guest.floor, guest.id)) {
              const nearestOpen = findNearestVerifiedAvailableSlot(
                slotPool,
                guests,
                guest.floor,
                guest.id,
                guest.gridX,
                guest.gridY
              );
              if (nearestOpen) {
                guest.assignedSlotId = nearestOpen.slotId;
                guest.seatPosture = nearestOpen.posture;
                guest.facingDir = nearestOpen.facingDir;
                guest.path[0] = { x: nearestOpen.x, y: nearestOpen.y };
              }
            }
          }

          const nextWp = guest.path[0];
          const dx = nextWp.x - guest.gridX;
          const dy = nextWp.y - guest.gridY;
          const dist = Math.hypot(dx, dy);

          if (dist > 0.01) {
            if (Math.abs(dx) >= Math.abs(dy)) {
              guest.facingDir = dx >= 0 ? 'SE' : 'NW';
            } else {
              guest.facingDir = dy >= 0 ? 'SW' : 'NE';
            }
          }

          const isFinalStep = guest.path.length === 1;
          const arrivalEase = isFinalStep && dist < 0.45 ? Math.max(0.55, dist / 0.45) : 1.0;
          const speed = 1.06 * arrivalEase * dt;
          if (dist <= speed) {
            guest.gridX = nextWp.x;
            guest.gridY = nextWp.y;
            guest.path.shift();
          } else {
            guest.gridX += (dx / dist) * speed;
            guest.gridY += (dy / dist) * speed;
          }
          continue;
        }

        if (guest.stateTimer <= 0) {
          if (guest.state === 'QUEUEING') {
            if (insideGuestsCount >= metrics.maxGuests) {
              guest.stateTimer = 0.5;
              continue;
            }
            // Customer enters through the Red Carpet Door at DOOR_COORD (x=2, y=9) and pays Cover Charge scaled by club build quality!
            insideGuestsCount += 1;
            guest.gridX = DOOR_COORD.x + 0.35;
            guest.gridY = DOOR_COORD.y + 0.55;
            guest.floor = 1;
            const coverFee = Math.round(
              (18 +
                metrics.danceTileCount * 1.8 +
                (props.parkingState.ropeTier - 1) * 10) *
                (guest.isCelebrity ? 2.5 : 1)
            );
            earnedCashThisFrame += coverFee;
            earnedXpThisFrame += 8;
            guest.cashSpent += coverFee;
            if (fts.length < 18) {
              fts.push({
                id: `ft_cover_${performance.now()}_${Math.random()}`,
                text: `+$${coverFee} COVER`,
                floor: 1,
                gridX: guest.gridX,
                gridY: guest.gridY,
                color: '#38bdf8',
                age: 0,
              });
            }
            const wantsUpperFloor = maxFloors >= 2 && Math.random() < 0.36;
            if (wantsUpperFloor) {
              guest.targetFloor = (maxFloors === 3 && Math.random() < 0.45 ? 3 : 2) as FloorLevel;
              guest.state = 'CLIMBING_STAIRS';
              guest.seatPosture = undefined;
              guest.assignedSlotId = undefined;
              guest.path = findGridPath(
                items,
                1,
                DOOR_COORD.x,
                DOOR_COORD.y,
                STAIRS_COORD.x,
                STAIRS_COORD.y + 1
              );
              guest.stateTimer = 0.8;
            } else {
              const availBarSlot = findAvailableBarSlot(items, guests, guest.floor, guest.id);
              const availSeatSlot = !availBarSlot
                ? findAvailableSeatOrTableSlot(items, guests, guest.floor, guest.id)
                : null;

              if (availBarSlot) {
                assignGuestToFurnitureSlot(guest, availBarSlot, items, 'WALKING_TO_BAR');
                guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
                guest.bubbleTimer = 4;
                guest.stateTimer = 0.9;
              } else if (availSeatSlot) {
                assignGuestToFurnitureSlot(guest, availSeatSlot, items, 'WALKING_TO_SEAT');
                guest.bubble = 'CHAT';
                guest.bubbleTimer = 4;
                guest.stateTimer = 0.9;
              } else {
                const danceSlot = pickSeparatedDanceSlot(items, guests, guest.floor, guest.id);
                guest.state = 'WALKING_TO_DANCE';
                guest.seatPosture = undefined;
                guest.assignedSlotId = undefined;
                const path = findGridPath(
                  items,
                  guest.floor,
                  DOOR_COORD.x,
                  DOOR_COORD.y,
                  Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(danceSlot.x))),
                  Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(danceSlot.y)))
                );
                if (path.length > 0) {
                  path[path.length - 1] = { x: danceSlot.x, y: danceSlot.y };
                } else {
                  path.push({ x: danceSlot.x, y: danceSlot.y });
                }
                guest.path = path;
                guest.bubble = 'MUSIC';
                guest.bubbleTimer = 4;
                guest.stateTimer = 0.8;
              }
            }
          } else if (guest.state === 'CLIMBING_STAIRS') {
            const destFloor: FloorLevel = guest.targetFloor >= 2 ? guest.targetFloor : 2;
            guest.floor = destFloor;
            guest.gridX = STAIRS_COORD.x;
            guest.gridY = STAIRS_COORD.y + 1;
            const availBarSlot2 = findAvailableBarSlot(items, guests, destFloor, guest.id);
            const availSeatSlot2 = !availBarSlot2
              ? findAvailableSeatOrTableSlot(items, guests, destFloor, guest.id)
              : null;

            if (availBarSlot2) {
              assignGuestToFurnitureSlot(guest, availBarSlot2, items, 'WALKING_TO_BAR');
            } else if (availSeatSlot2) {
              assignGuestToFurnitureSlot(guest, availSeatSlot2, items, 'WALKING_TO_SEAT');
            } else {
              const barFallback = pickSeparatedBarSlot(items, guests, destFloor, guest.id);
              assignGuestToFurnitureSlot(guest, barFallback, items, 'WALKING_TO_BAR');
            }
            guest.bubble = 'VIP_CROWN';
            guest.bubbleTimer = 4;
            guest.stateTimer = 0.9;
          } else if (guest.state === 'WALKING_TO_BAR') {
            const arrivalStatus = verifyOrReassignGuestSlotOnArrival(guest, items, guests, 'BAR');
            if (arrivalStatus === 'ARRIVED') {
              guest.state = 'ORDERING_DRINK';
              guest.stateTimer = 8.5 + Math.random() * 5.0;
              guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
              guest.bubbleTimer = 4.5;
            } else if (arrivalStatus === 'NO_SEAT_AVAILABLE') {
              const fallbackSeat = findAvailableSeatOrTableSlot(
                items,
                guests,
                guest.floor,
                guest.id
              );
              if (fallbackSeat) {
                assignGuestToFurnitureSlot(guest, fallbackSeat, items, 'WALKING_TO_SEAT');
                guest.stateTimer = 0.8;
              } else {
                const danceSlot = pickSeparatedDanceSlot(items, guests, guest.floor, guest.id);
                guest.state = 'WALKING_TO_DANCE';
                guest.seatPosture = undefined;
                guest.assignedSlotId = undefined;
                guest.path = [{ x: danceSlot.x, y: danceSlot.y }];
                guest.stateTimer = 0.8;
              }
            }
          } else if (guest.state === 'ORDERING_DRINK') {
            const drinkRevenue = Math.round(
              drink.sellPrice * (1 + metrics.tipBonus * 0.5) * (guest.isCelebrity ? 2.5 : 1)
            );
            earnedCashThisFrame += drinkRevenue;
            earnedXpThisFrame += 12;
            guest.cashSpent += drinkRevenue;
            guest.hype = Math.min(100, guest.hype + 6);

            if (fts.length < 18) {
              fts.push({
                id: `ft_${performance.now()}_${Math.random()}`,
                text: `+$${drinkRevenue}`,
                floor: guest.floor,
                gridX: guest.gridX,
                gridY: guest.gridY,
                color: '#4ade80',
                age: 0,
              });
            }

            const availSeatSlot = findAvailableSeatOrTableSlot(
              items,
              guests,
              guest.floor,
              guest.id
            );
            if (availSeatSlot && Math.random() < 0.58) {
              assignGuestToFurnitureSlot(guest, availSeatSlot, items, 'WALKING_TO_SEAT');
              guest.stateTimer = 0.8;
            } else {
              const danceSlot = pickSeparatedDanceSlot(items, guests, guest.floor, guest.id);
              guest.state = 'WALKING_TO_DANCE';
              guest.seatPosture = undefined;
              guest.assignedSlotId = undefined;
              const path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(danceSlot.x))),
                Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(danceSlot.y)))
              );
              if (path.length > 0) {
                path[path.length - 1] = { x: danceSlot.x, y: danceSlot.y };
              } else {
                path.push({ x: danceSlot.x, y: danceSlot.y });
              }
              guest.path = path;
              guest.stateTimer = 0.8;
            }
          } else if (guest.state === 'WALKING_TO_DANCE') {
            guest.state = 'DANCER_MOVES';
            guest.seatPosture = undefined;
            guest.assignedSlotId = undefined;
            guest.danceMove = pickRandomDancerMoveForBpm(currentBpm);
            guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
            guest.dancePhaseOffset = Math.random() * Math.PI * 2;
            guest.stateTimer = 8.0 + Math.random() * 4.5;
            guest.bubble =
              metrics.lightingCount < 2 && Math.random() < 0.25
                ? 'SPARKLE'
                : Math.random() < 0.5
                ? 'MUSIC'
                : 'SPARKLE';
            guest.bubbleTimer = 5.5;
          } else if (guest.state === 'DANCING' || guest.state === 'DANCER_MOVES') {
            const danceTiles = items.filter(
              (it) =>
                it.floor === guest.floor &&
                getCatalogItem(it.catalogId)?.category === 'DANCE_TILE'
            );
            // Dancers drop a Groove Tip scaled by how many dance floor tiles, lights, and speakers the player has built!
            const danceTip = Math.round(
              (22 + metrics.danceTileCount * 2.5 + metrics.lightingCount * 4) *
                (1 + metrics.tipBonus * 0.5) *
                (guest.isCelebrity ? 2.2 : 1)
            );
            earnedCashThisFrame += danceTip;
            earnedXpThisFrame += 10;
            guest.cashSpent += danceTip;
            if (fts.length < 18) {
              fts.push({
                id: `ft_dance_${performance.now()}_${Math.random()}`,
                text: `+$${danceTip} 🪩`,
                floor: guest.floor,
                gridX: guest.gridX,
                gridY: guest.gridY,
                color: '#e879f9',
                age: 0,
              });
            }
            if (guest.state === 'DANCING' || (danceTiles.length > 0 && Math.random() < 0.25)) {
              guest.state = 'DANCER_MOVES';
              guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
              guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
              guest.stateTimer = 6.5 + Math.random() * 4.0;
              guest.bubble = Math.random() < 0.5 ? 'MUSIC' : 'SPARKLE';
              guest.bubbleTimer = 4.0;
            } else {
              const availBarSlot = findAvailableBarSlot(items, guests, guest.floor, guest.id);
              const availSeatSlot = findAvailableSeatOrTableSlot(
                items,
                guests,
                guest.floor,
                guest.id
              );

              if (availBarSlot && (!availSeatSlot || Math.random() < 0.46)) {
                assignGuestToFurnitureSlot(guest, availBarSlot, items, 'WALKING_TO_BAR');
                guest.stateTimer = 0.8;
              } else if (availSeatSlot) {
                assignGuestToFurnitureSlot(guest, availSeatSlot, items, 'WALKING_TO_SEAT');
                guest.stateTimer = 0.8;
              } else {
                guest.state = 'LEAVING';
                guest.seatPosture = undefined;
                guest.assignedSlotId = undefined;
                guest.path = findGridPath(
                  items,
                  guest.floor,
                  guest.gridX,
                  guest.gridY,
                  DOOR_COORD.x,
                  DOOR_COORD.y
                );
                guest.stateTimer = 1.2;
              }
            }
          } else if (guest.state === 'WALKING_TO_SEAT') {
            const arrivalStatus = verifyOrReassignGuestSlotOnArrival(guest, items, guests, 'SEAT');
            if (arrivalStatus === 'ARRIVED') {
              guest.state = 'RESTING_AT_SEAT';
              guest.stateTimer = 11.5 + Math.random() * 6.0;

              // Check if guest arrived at a VIP Booth item (seat_velvet_booth, seat_vip_pod, seat_worn_couch)
              const parentBooth = findGuestSeatedVipBooth(guest, items);
              const existingService = parentBooth
                ? props.activeBottleServices?.[parentBooth.uid]
                : undefined;

              if (
                parentBooth &&
                !existingService &&
                (guest.isCelebrity || guest.hype >= 75 || Math.random() < 0.72)
              ) {
                // VIP guest or hyped booth patron places a Bottle Service order for a premium drink tray!
                props.onBottleServiceEvent?.(parentBooth.uid, 'GUEST_ORDERED', guest.name);
                guest.bubble = 'BOTTLE_SERVICE';
                guest.bubbleTimer = 6.5;
                guest.chatText = 'Ordering a VIP Bottle Service sparkler tray for our booth! 🍾';
              } else if (existingService?.status === 'ACTIVE_SPARKLERS') {
                guest.bubble = 'BOTTLE_SERVICE';
                guest.bubbleTimer = 6.0;
                guest.hype = 100;
                guest.chatText = `Popping ${existingService.trayName} in the VIP booth! 🍾✨`;
              } else {
                guest.bubble = guest.isCelebrity
                  ? 'VIP_CROWN'
                  : Math.random() < 0.5
                  ? 'COCKTAIL'
                  : 'CHAT';
                guest.bubbleTimer = 4.5;
              }
            } else if (arrivalStatus === 'NO_SEAT_AVAILABLE') {
              const fallbackBar = findAvailableBarSlot(items, guests, guest.floor, guest.id);
              if (fallbackBar) {
                assignGuestToFurnitureSlot(guest, fallbackBar, items, 'WALKING_TO_BAR');
                guest.stateTimer = 0.8;
              } else {
                const danceSlot = pickSeparatedDanceSlot(items, guests, guest.floor, guest.id);
                guest.state = 'WALKING_TO_DANCE';
                guest.seatPosture = undefined;
                guest.assignedSlotId = undefined;
                guest.path = [{ x: danceSlot.x, y: danceSlot.y }];
                guest.stateTimer = 0.8;
              }
            }
          } else if (guest.state === 'RESTING_AT_SEAT') {
            const parentBooth = findGuestSeatedVipBooth(guest, items);
            const boothService = parentBooth
              ? props.activeBottleServices?.[parentBooth.uid]
              : undefined;
            const bottleMultiplier =
              boothService?.status === 'ACTIVE_SPARKLERS'
                ? boothService.spendingMultiplier
                : 1.0;

            const seatTip = Math.round(
              35 *
                (1 + metrics.tipBonus) *
                (guest.isCelebrity ? 3 : 1) *
                bottleMultiplier
            );
            earnedCashThisFrame += seatTip;
            earnedXpThisFrame += boothService?.status === 'ACTIVE_SPARKLERS' ? 35 : 15;
            guest.cashSpent += seatTip;

            if (boothService?.status === 'ACTIVE_SPARKLERS') {
              guest.hype = 100;
              guest.bubble = 'BOTTLE_SERVICE';
              guest.bubbleTimer = 4.5;
              spawnParticlesAboveDancer(guest, 4);
            }

            if (fts.length < 18) {
              fts.push({
                id: `ft_tip_${performance.now()}_${Math.random()}`,
                text:
                  boothService?.status === 'ACTIVE_SPARKLERS'
                    ? `+$${seatTip} VIP BOTTLE TRAY! 🍾`
                    : `+$${seatTip} TIP`,
                floor: guest.floor,
                gridX: guest.gridX,
                gridY: guest.gridY,
                color:
                  boothService?.status === 'ACTIVE_SPARKLERS'
                    ? boothService.trayColor
                    : '#facc15',
                age: 0,
              });
            }

            const availBarSlot =
              Math.random() < 0.48
                ? findAvailableBarSlot(items, guests, guest.floor, guest.id)
                : null;
            if (availBarSlot) {
              assignGuestToFurnitureSlot(guest, availBarSlot, items, 'WALKING_TO_BAR');
              guest.stateTimer = 0.8;
            } else if (guest.floor >= 2) {
              guest.state = 'DESCENDING_STAIRS';
              guest.seatPosture = undefined;
              guest.assignedSlotId = undefined;
              guest.path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                STAIRS_COORD.x,
                STAIRS_COORD.y + 1
              );
              guest.stateTimer = 0.8;
            } else {
              guest.state = 'LEAVING';
              guest.seatPosture = undefined;
              guest.assignedSlotId = undefined;
              guest.path = findGridPath(
                items,
                1,
                guest.gridX,
                guest.gridY,
                DOOR_COORD.x,
                DOOR_COORD.y
              );
              guest.bubble = 'CASH';
              guest.bubbleTimer = 2.5;
              guest.stateTimer = 1.2;
            }
          } else if (guest.state === 'DESCENDING_STAIRS') {
            guest.floor = 1;
            guest.gridX = STAIRS_COORD.x;
            guest.gridY = STAIRS_COORD.y + 1;
            guest.state = 'LEAVING';
            guest.seatPosture = undefined;
            guest.assignedSlotId = undefined;
            guest.path = findGridPath(
              items,
              1,
              guest.gridX,
              guest.gridY,
              DOOR_COORD.x,
              DOOR_COORD.y
            );
            guest.stateTimer = 1.2;
          } else if (guest.state === 'LEAVING') {
            // Instead of disappearing at the club door, the customer walks outside across the sidewalk back to a parked car in the parking lot!
            const parkedCars = trafficCarsRef.current.filter(
              (c) => c.carState === 'PARKED' && c.stallIndex !== undefined
            );
            const targetCar =
              parkedCars.find((c) => c.id === guest.carId) ||
              parkedCars[Math.floor(Math.random() * parkedCars.length)];

            const fallbackStall = PARKING_LOT_STALLS[1]; // Taxi pickup bay
            const targetStall =
              targetCar && targetCar.stallIndex !== undefined
                ? PARKING_LOT_STALLS[targetCar.stallIndex]
                : fallbackStall;

            if (targetCar) {
              targetCar.carState = 'WAITING_PICKUP';
              targetCar.parkTimer = 6.0;
              guest.carId = targetCar.id;
            }

            const carDoorX = targetStall.gx + 0.28;
            const carDoorY = targetStall.gy - 0.35;
            guest.state = 'WALKING_TO_CAR';
            guest.floor = 1;
            guest.gridX = 2.15;
            guest.gridY = 10.25;
            guest.targetCarCoord = { x: carDoorX, y: carDoorY };
            guest.path = [
              { x: 2.05, y: 11.2 },
              { x: carDoorX, y: carDoorY },
            ];
            guest.bubble = 'SPARKLE';
            guest.bubbleTimer = 4.0;
            guest.chatText = `What an epic night! Walking back to my car in Bay ${targetStall.label}! 🚗✨`;
            guest.chatTimer = 4.0;
            guest.stateTimer = 0.25;
          } else if (guest.state === 'WALKING_TO_CAR') {
            // Customer reached their parked car door — they hop inside and the car pulls out of the parking bay and merges into traffic!
            if (guest.carId) {
              const boardingCar = trafficCarsRef.current.find((c) => c.id === guest.carId);
              if (
                boardingCar &&
                (boardingCar.carState === 'PARKED' || boardingCar.carState === 'WAITING_PICKUP')
              ) {
                boardingCar.headlightFlashTimer = 0.95;
                boardingCar.carState = 'PARKED';
                boardingCar.parkTimer = 0; // Triggers pull-out check immediately on next traffic tick
              }
            }
            guests.splice(i, 1);
          }
        }
      }

      // 2A-Bis. Continuous Personal-Space Separation Pass for free-roaming/dancing patrons
      applyGuestPersonalSpaceSeparation(guests, dt);

      // 2B. Update all hired Staff Members (Bartenders, Bouncers, Waiters) at 60fps
      const staffList = props.staffMembers;
      for (let sIdx = 0; sIdx < staffList.length; sIdx++) {
        const staff = staffList[sIdx];
        if (staff.floor !== props.activeFloor && maxFloors === 1) continue;

        staff.taskTimer -= dt;
        if (staff.bubbleTimer > 0) {
          staff.bubbleTimer -= dt;
          if (staff.bubbleTimer <= 0) staff.actionBubble = null;
        }

        if (staff.path.length > 0) {
          const nextWp = staff.path[0];
          const dx = nextWp.x - staff.gridX;
          const dy = nextWp.y - staff.gridY;
          const dist = Math.hypot(dx, dy);
          const speed = 1.18 * dt;
          staff.walkCycle = (staff.walkCycle ?? 0) + dt * 6.5;
          if (dist > 0.001) {
            staff.facingX = dx / dist;
            staff.facingY = dy / dist;
          }
          if (dist <= speed) {
            staff.gridX = nextWp.x;
            staff.gridY = nextWp.y;
            staff.path.shift();
          } else {
            staff.gridX += (dx / dist) * speed;
            staff.gridY += (dy / dist) * speed;
          }
          continue;
        }

        if (
          staff.role === 'BOUNCER' &&
          Math.hypot(staff.postGridX - staff.gridX, staff.postGridY - staff.gridY) > 0.12 &&
          staff.taskTimer <= 0.35
        ) {
          staff.path = buildStaffStationPath(
            items,
            staff.floor,
            staff.gridX,
            staff.gridY,
            staff.postGridX,
            staff.postGridY
          );
          if (staff.path.length > 0) continue;
        }

        if (staff.taskTimer <= 0) {
          if (staff.role === 'BARTENDER') {
            const orderingGuests = guests.filter(
              (g) => g.floor === staff.floor && g.state === 'ORDERING_DRINK'
            );
            for (const og of orderingGuests) {
              og.stateTimer = Math.max(1.8, og.stateTimer - 0.65);
            }

            const flairTip = Math.round(18 + drink.sellPrice * 0.28);
            earnedCashThisFrame += flairTip;
            earnedXpThisFrame += 6;
            staff.drinksServed += 1;
            staff.actionBubble = '🍸';
            staff.bubbleTimer = 2.4;
            staff.taskState = 'MIXING_DRINK';
            staff.taskTimer = 3.0 + Math.random() * 1.4;
            props.onStaffTaskComplete?.(staff.uid, 'SERVED_DRINK');

            const floorBars = items.filter(
              (it) =>
                it.floor === staff.floor &&
                getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
            );
            if (floorBars.length > 0) {
              let homeBar = floorBars[0];
              let bestBarDist = Infinity;
              for (const b of floorBars) {
                const d = Math.hypot(b.gridX - staff.postGridX, b.gridY - staff.postGridY);
                if (d < bestBarDist) {
                  bestBarDist = d;
                  homeBar = b;
                }
              }
              const bCat = getCatalogItem(homeBar.catalogId);
              const bFp = bCat
                ? getRotatedFootprint(bCat, homeBar.rotation)
                : { width: 1, depth: 2 };
              const bAlongY = bFp.depth > bFp.width;
              const stationOffset = 0.25 + ((staff.drinksServed % 2) * 0.5);
              staff.gridX = bAlongY
                ? homeBar.gridX + 0.28
                : homeBar.gridX + stationOffset * bFp.width;
              staff.gridY = bAlongY
                ? homeBar.gridY + stationOffset * bFp.depth
                : homeBar.gridY + 0.28;
              staff.path = [];
            }

            if (fts.length < 18) {
              fts.push({
                id: `ft_bar_auto_${performance.now()}_${Math.random()}`,
                text: `+$${flairTip} MIX`,
                floor: staff.floor,
                gridX: staff.gridX,
                gridY: staff.gridY,
                color: '#38bdf8',
                age: 0,
              });
            }
          } else if (staff.role === 'BOUNCER') {
            const queuedGuest = guests.find((g) => g.state === 'QUEUEING');
            if (queuedGuest && queuedGuest.stateTimer > 0.35) {
              queuedGuest.stateTimer = Math.max(0.2, queuedGuest.stateTimer - 1.4);
            }

            const coverBonus = 24 + props.parkingState.ropeTier * 10;
            earnedCashThisFrame += coverBonus;
            earnedXpThisFrame += 7;
            staff.guestsCheckedIn += 1;
            staff.actionBubble = '🛡️';
            staff.bubbleTimer = 2.4;
            staff.taskState = 'CHECKING_ID';
            staff.taskTimer = 3.6 + Math.random() * 1.4;
            props.onStaffTaskComplete?.(staff.uid, 'CHECKED_IN_GUEST');

            const atPost =
              Math.hypot(staff.postGridX - staff.gridX, staff.postGridY - staff.gridY) < 0.25;
            const patrolTarget = atPost
              ? {
                  x: Math.max(0, Math.min(GRID_SIZE - 1, DOOR_COORD.x + (staff.guestsCheckedIn % 2 === 0 ? 1 : 0))),
                  y: Math.max(0, Math.min(GRID_SIZE - 1, DOOR_COORD.y - (staff.guestsCheckedIn % 2 === 0 ? 0 : 1))),
                }
              : { x: staff.postGridX, y: staff.postGridY };
            if (Math.hypot(patrolTarget.x - staff.gridX, patrolTarget.y - staff.gridY) > 0.35) {
              staff.path = buildStaffStationPath(
                items,
                staff.floor,
                staff.gridX,
                staff.gridY,
                patrolTarget.x,
                patrolTarget.y
              );
            }

            if (fts.length < 18) {
              fts.push({
                id: `ft_bouncer_${performance.now()}_${Math.random()}`,
                text: `+$${coverBonus} VIP ID`,
                floor: staff.floor,
                gridX: staff.gridX,
                gridY: staff.gridY,
                color: '#a855f7',
                age: 0,
              });
            }
          } else if (staff.role === 'WAITER') {
            const floorBars = items.filter(
              (it) =>
                it.floor === staff.floor &&
                getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
            );
            const floorSeats = items.filter(
              (it) =>
                it.floor === staff.floor &&
                getCatalogItem(it.catalogId)?.category === 'SEATING'
            );

            if (
              staff.taskState === 'IDLE_STATION' ||
              staff.taskState === 'RETURNING_TO_BAR'
            ) {
              // Prioritize any VIP booth on this floor that has a pending Bottle Service order!
              const waitingVipBooth = floorSeats.find(
                (it) =>
                  isVipBoothCatalogId(it.catalogId) &&
                  props.activeBottleServices?.[it.uid]?.status === 'ORDERED_WAITING'
              );
              const targetSeat =
                waitingVipBooth ||
                (floorSeats.length > 0
                  ? floorSeats[Math.floor(Math.random() * floorSeats.length)]
                  : { gridX: staff.postGridX, gridY: staff.postGridY, uid: '' });

              const pendingOrder =
                'uid' in targetSeat && targetSeat.uid
                  ? props.activeBottleServices?.[targetSeat.uid]
                  : undefined;

              staff.carryingDrinkColor = pendingOrder ? pendingOrder.trayColor : drink.color;
              staff.actionBubble = pendingOrder ? '🍾' : '🍸';
              staff.bubbleTimer = 2.5;
              staff.taskState = 'WALKING_TO_TABLE';
              staff.path = buildStaffStationPath(
                items,
                staff.floor,
                staff.gridX,
                staff.gridY,
                targetSeat.gridX,
                targetSeat.gridY
              );
              staff.taskTimer = 1.0;
            } else if (staff.taskState === 'WALKING_TO_TABLE') {
              staff.taskState = 'SERVING_TABLE';
              staff.actionBubble = '🍾';
              staff.bubbleTimer = 2.2;
              staff.taskTimer = 1.4;
            } else {
              // Check if waiter is next to a VIP booth with a pending Bottle Service order
              const nearbyWaitingBooth = floorSeats.find(
                (it) =>
                  isVipBoothCatalogId(it.catalogId) &&
                  props.activeBottleServices?.[it.uid]?.status === 'ORDERED_WAITING' &&
                  Math.hypot(it.gridX - staff.gridX, it.gridY - staff.gridY) <= 3.2
              );
              if (nearbyWaitingBooth) {
                props.onBottleServiceEvent?.(
                  nearbyWaitingBooth.uid,
                  'WAITER_DELIVERED',
                  staff.name
                );
              }
              const traySale = Math.round(
                drink.sellPrice * (nearbyWaitingBooth ? 2.4 : 1.15 + metrics.tipBonus * 0.4)
              );
              earnedCashThisFrame += traySale;
              earnedXpThisFrame += nearbyWaitingBooth ? 25 : 10;
              staff.drinksServed += 1;
              staff.carryingDrinkColor = null;
              staff.actionBubble = nearbyWaitingBooth ? '🍾✨' : '$$';
              staff.bubbleTimer = 2.2;
              props.onStaffTaskComplete?.(staff.uid, 'SERVED_DRINK');

              if (fts.length < 18) {
                fts.push({
                  id: `ft_waiter_${performance.now()}_${Math.random()}`,
                  text: nearbyWaitingBooth
                    ? `+$${traySale} VIP TRAY SERVED!`
                    : `+$${traySale} TABLE`,
                  floor: staff.floor,
                  gridX: staff.gridX,
                  gridY: staff.gridY,
                  color: nearbyWaitingBooth ? '#facc15' : '#f472b6',
                  age: 0,
                });
              }

              const targetBar =
                floorBars.length > 0
                  ? floorBars[0]
                  : { gridX: 2, gridY: 1 };
              staff.taskState = 'RETURNING_TO_BAR';
              staff.path = buildStaffStationPath(
                items,
                staff.floor,
                staff.gridX,
                staff.gridY,
                targetBar.gridX + 1,
                targetBar.gridY + 1
              );
              staff.taskTimer = 1.1;
            }
          }
        }
      }

      // Batch revenue updates every 0.6s so React doesn't re-render on every frame (prevents iPad/phone heating & click drops)
      pendingCashDelta += earnedCashThisFrame;
      pendingXpDelta += earnedXpThisFrame;
      revenueReportAccumulator += dt;
      if (revenueReportAccumulator >= 0.6 && (pendingCashDelta > 0 || pendingXpDelta > 0)) {
        const cashToSend = pendingCashDelta;
        const xpToSend = pendingXpDelta;
        pendingCashDelta = 0;
        pendingXpDelta = 0;
        revenueReportAccumulator = 0;
        props.onEarnRevenue(cashToSend, xpToSend);
      }

      // 2C. Spawn Arriving Customers from Parked Cars or the Taxi Drop-Off Bay onto the Red Carpet Queue
      spawnAccumulator += dt;
      if (spawnAccumulator >= 0.85) {
        spawnAccumulator = 0;
        const currentQueueLen = guests.filter((g) => g.state === 'QUEUEING').length;
        const maxQueueLine = 7;
        const shouldSpawnCustomer =
          currentQueueLen < maxQueueLine &&
          (insideGuestsCount < metrics.maxGuests ? Math.random() < 0.68 : Math.random() < 0.48);

        if (shouldSpawnCustomer) {
          // Pick an actively parked car (or the Taxi Drop-Off stall) so the customer visibly steps out of a car in the parking lot!
          const parkedCarsNow = trafficCarsRef.current.filter(
            (c) => c.carState === 'PARKED' && c.stallIndex !== undefined
          );
          const chosenCar =
            parkedCarsNow.length > 0
              ? parkedCarsNow[Math.floor(Math.random() * parkedCarsNow.length)]
              : null;
          const chosenStall =
            chosenCar && chosenCar.stallIndex !== undefined
              ? PARKING_LOT_STALLS[chosenCar.stallIndex]
              : PARKING_LOT_STALLS[1];

          if (chosenCar) {
            chosenCar.headlightFlashTimer = 0.75;
          }

          const isCeleb = metrics.totalHype >= 130 && Math.random() < 0.22;
          const namePool = isCeleb ? CELEBRITY_NAMES : GUEST_NAMES;
          const bouncerStaffCount = staffList.filter((s) => s.role === 'BOUNCER').length;
          const queueWait = Math.max(
            0.7,
            3.4 - (bouncers + bouncerStaffCount) * 0.65
          );
          const bubbles: BubbleType[] = ['MUSIC', 'CHAT', 'SPARKLE'];
          guests.push({
            id: `guest_${performance.now()}_${Math.random()}`,
            name: namePool[Math.floor(Math.random() * namePool.length)],
            isCelebrity: isCeleb,
            floor: 1,
            targetFloor: 1,
            // Spawn right by the car door in the parking bay so they walk from the parked car to the Red Carpet line!
            gridX: chosenStall.gx + 0.3,
            gridY: chosenStall.gy - 0.38,
            path: [],
            state: 'QUEUEING',
            stateTimer: queueWait,
            patience: 100,
            hype: isCeleb ? 96 : 78 + Math.floor(Math.random() * 18),
            bubble: isCeleb
              ? 'VIP_CROWN'
              : bubbles[Math.floor(Math.random() * bubbles.length)],
            bubbleTimer: 5,
            shirtColor: isCeleb
              ? '#facc15'
              : SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
            hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
            pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
            cashSpent: 0,
            facingDir: 'NW',
            carId: chosenCar?.id,
          });
        }

        const qLen = guests.filter((g) => g.state === 'QUEUEING').length;
        if (qLen !== lastReportedQueueCount) {
          lastReportedQueueCount = qLen;
          props.onQueueCountChange(qLen);
        }
      }

      // 2C-Whale. Automatically keep guest.isWhale assigned when cumulative cashSpent exceeds current club average
      const avgClubSpend = computeAverageClubGuestSpend(guests);
      for (let i = 0; i < guests.length; i++) {
        const g = guests[i];
        g.isWhale = !isExteriorGuestState(g.state) && g.cashSpent > avgClubSpend && g.cashSpent > 0;
      }

      // 2D. Periodically report all Sprite Moods (throttled to 1.6s so touch clicks inside the Mood Panel never get interrupted by DOM rebuilds)
      moodReportAccumulator += dt;
      if (moodReportAccumulator >= 1.6 && props.onSpriteMoodListReport) {
        moodReportAccumulator = 0;
        const moodList = buildAllSpritesMoodSnapshot(
          guests,
          pedestriansRef.current,
          props.staffMembers,
          props.placedItems,
          props.activeBottleServices,
          props.activeFloor,
          props.activeGenre || 'Pop',
          metrics.maxGuests
        );
        props.onSpriteMoodListReport(moodList);
      }
    };

    let cycleReportTimer = 0;

    const renderFrame = (timeMs: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        lastTimeMs = timeMs;
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const props = latestPropsRef.current;
      // Adaptive Thermal Frame Pacing: ~42fps in Eco Mode, ~48fps on iPad/phone touch browser, 60fps on desktop
      const minFrameIntervalMs = props.isEcoMode
        ? 23.5
        : isCoarsePointerDevice
        ? 19.5
        : 0;
      if (minFrameIntervalMs > 0 && timeMs - lastPaintTimeMs < minFrameIntervalMs) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }
      lastPaintTimeMs = timeMs;

      const rawDt = (timeMs - lastTimeMs) * 0.001;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.055);
      lastTimeMs = timeMs;

      stepSimulation60fps(dt);

      if (props.isPlaying && typeof props.dayNightOverrideHour !== 'number') {
        gameHourRef.current = (gameHourRef.current + dt * 0.32) % 24;
      }

      const cycle = computeDayNightCycleState(gameHourRef.current);
      const moodProfile = getClubMoodLightingProfile(props.activeGenre);

      cycleReportTimer += dt;
      if (cycleReportTimer >= 1.8 && props.onCycleTimeReport) {
        cycleReportTimer = 0;
        props.onCycleTimeReport({
          hour: cycle.hour,
          formattedTime: cycle.formattedTime,
          phaseLabel: cycle.phaseLabel,
          nightIntensity: cycle.nightIntensity,
          emissiveMultiplier: cycle.emissiveMultiplier,
        });
      }

      const targetDpr = computeOptimalDpr();
      if (Math.abs(targetDpr - activeDpr) > 0.05) {
        updateCanvasSize();
      }
      const dpr = activeDpr;
      const width = viewportWidth;
      const height = viewportHeight;
      const { scale, tileW, tileH, originX, originY } = getViewportTransform(
        width,
        height,
        props.cameraZoom
      );
      const t = timeMs * 0.001;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. DYNAMIC DAY/NIGHT SKY GRADIENT & ILLUSTRATED NEON SKYLINE
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, cycle.skyTop);
      skyGrad.addColorStop(0.36, cycle.skyUpperMid);
      skyGrad.addColorStop(0.72, cycle.skyLowerMid);
      skyGrad.addColorStop(1, cycle.skyHorizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      drawIllustratedCitySkyline(ctx, originX, originY, scale, t);

      const streetZOffset = props.activeFloor >= 2 ? -(props.activeFloor - 1) * 92 * scale : 0;
      const parkedCarsZIndex = props.activeFloor >= 2 ? -(props.activeFloor - 1) * 100 : 100;
      const floorDropH = -streetZOffset;
      const streetOriginY = originY - streetZOffset;

      // 2. GROUND-LEVEL ENTRANCE PLAZA, SIDEWALK, CROSSWALK & PARKING LOT
      drawIllustratedParkingAndStreet(
        ctx,
        originX,
        streetOriginY,
        tileW,
        tileH,
        scale,
        t,
        props.parkingState,
        guestsRef.current
      );

      // 2A. CONDITIONAL NEGATIVE Z-INDEX PARKED CARS & TRAFFIC PASS (When activeFloor >= 2)
      if (parkedCarsZIndex < 0) {
        drawForegroundQueueCarsAndLamps(
          ctx,
          originX,
          originY,
          tileW,
          tileH,
          scale,
          props.parkingState,
          streetZOffset,
          parkedCarsZIndex,
          props.activeFloor,
          trafficCarsRef.current
        );
      }

      // 2B. LOWER BUILDING 1ST-FLOOR EXTERIOR FACADE UNDERSTRUCTURE (When on Floor 2+)
      if (props.activeFloor >= 2) {
        drawLowerBuildingUnderstructure(
          ctx,
          originX,
          originY,
          tileW,
          tileH,
          scale,
          floorDropH,
          t,
          props.activeFloor
        );
      }

      const activeBpm = props.clubBpm || 124;
      const vibeThermometerRatio = Math.min(
        1,
        Math.max(
          0.24,
          ((props.clubMetrics?.totalHype || 120) + (props.clubMetrics?.totalVibe || 80)) / 360
        )
      );
      const sequencer = computeRhythmicLightingSequencer(
        t,
        activeBpm,
        vibeThermometerRatio,
        soundEngine.getCurrentStep()
      );

      // 3. CLUB CUTAWAY WALLS, NEON STRIPS, SIGNS, TRUSSES & DISCO BALL (Shifted by Genre Mood Lighting Profile!)
      drawIllustratedClubShell(
        ctx,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        t,
        props.activeFloor,
        props.unlockedFloors,
        props.playerLevel,
        stairsHitboxRef,
        sequencer,
        moodProfile
      );

      // 4. SUNKEN BEVELED DANCE FLOOR GRID + AUTOMATIC GENRE MOOD COLOR FILTER OVERLAY + BASS DROP RIPPLE WAVE
      const floorItems = props.placedItems.filter((p) => p.floor === props.activeFloor);
      const activeFloorRipples = bassDropRipplesRef.current;
      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category !== 'DANCE_TILE') continue;
        drawIllustratedDanceTile(
          ctx,
          item,
          cat,
          originX,
          originY,
          tileW,
          tileH,
          scale,
          t,
          sequencer,
          moodProfile,
          activeFloorRipples
        );
        drawDanceFloorMoodFilterOverlay(
          ctx,
          item,
          cat,
          originX,
          originY,
          tileW,
          tileH,
          scale,
          t,
          sequencer,
          moodProfile
        );
      }

      // 4A. EXPANDING ISOMETRIC BASS DROP RIPPLE SHOCKWAVE RINGS ACROSS THE DANCE FLOOR
      if (activeFloorRipples.length > 0) {
        drawBassDropDanceFloorRipples(
          ctx,
          activeFloorRipples,
          props.activeFloor,
          originX,
          originY,
          tileW,
          tileH,
          scale
        );
      }

      // 4B. HIGHLIGHT CURRENTLY SELECTED PLACED DECORATION IN EDIT POSITION MODE (OR ALL MOVABLE ITEMS WHEN EDIT MODE IS ACTIVE)
      if (props.isEditDecorMode || props.editingPlacedItemUid) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 7.5);
        for (const pItem of floorItems) {
          const itemCat = getCatalogItem(pItem.catalogId);
          if (!itemCat) continue;
          const itemFp = getRotatedFootprint(itemCat, pItem.rotation);
          const isTarget = props.editingPlacedItemUid === pItem.uid;
          for (let dx = 0; dx < itemFp.width; dx++) {
            for (let dy = 0; dy < itemFp.depth; dy++) {
              drawIsoTilePolygon(
                ctx,
                pItem.gridX + dx,
                pItem.gridY + dy,
                (isTarget ? 2.4 : 1.0) * scale,
                originX,
                originY,
                tileW,
                tileH,
                isTarget
                  ? `rgba(34, 211, 238, ${(0.28 + pulse * 0.22).toFixed(2)})`
                  : 'rgba(250, 204, 21, 0.14)',
                isTarget ? '#22d3ee' : 'rgba(250, 204, 21, 0.65)',
                (isTarget ? 2.8 : 1.4) * scale
              );
            }
          }
        }
      }

      // 4C. NEWLY BOUGHT DECORATION FLOOR BEACON PAD
      if (props.newlyPlacedItemHighlight) {
        const elapsedSec = (performance.now() - props.newlyPlacedItemHighlight.placedAtMs) / 1000;
        if (elapsedSec >= 0 && elapsedSec <= 9.0) {
          const newItem = floorItems.find((p) => p.uid === props.newlyPlacedItemHighlight?.uid);
          if (newItem) {
            const newCat = getCatalogItem(newItem.catalogId);
            if (newCat) {
              const newFp = getRotatedFootprint(newCat, newItem.rotation);
              const fade = elapsedSec > 7.0 ? Math.max(0, 1 - (elapsedSec - 7.0) / 2.0) : 1;
              const pulse = 0.5 + 0.5 * Math.sin(t * 9);
              for (let dx = 0; dx < newFp.width; dx++) {
                for (let dy = 0; dy < newFp.depth; dy++) {
                  drawIsoTilePolygon(
                    ctx,
                    newItem.gridX + dx,
                    newItem.gridY + dy,
                    2.0 * scale,
                    originX,
                    originY,
                    tileW,
                    tileH,
                    `rgba(74, 222, 128, ${((0.28 + pulse * 0.25) * fade).toFixed(2)})`,
                    '#4ade80',
                    2.6 * scale
                  );
                }
              }
            }
          }
        }
      }

      // 5. GHOSTED PLACEMENT PREVIEW OVERLAY (Furniture, Edit Position Move, OR Staff Stationing)
      const hoveredGrid = hoveredGridRef.current;
      if ((props.placementModeStaff || props.relocatingStaffUid) && hoveredGrid) {
        drawIsoTilePolygon(
          ctx,
          hoveredGrid.x,
          hoveredGrid.y,
          0,
          originX,
          originY,
          tileW,
          tileH,
          'rgba(56, 189, 248, 0.5)',
          '#22d3ee',
          2.5
        );
      } else if (props.editingPlacedItemUid && hoveredGrid) {
        const editingItem = props.placedItems.find((p) => p.uid === props.editingPlacedItemUid);
        const editCat = editingItem ? getCatalogItem(editingItem.catalogId) : null;
        if (editingItem && editCat) {
          const valid = canPlaceItem(
            props.placedItems,
            editCat,
            props.activeFloor,
            hoveredGrid.x,
            hoveredGrid.y,
            props.buildRotation,
            editingItem.uid
          );
          const fp = getRotatedFootprint(editCat, props.buildRotation);
          for (let dx = 0; dx < fp.width; dx++) {
            for (let dy = 0; dy < fp.depth; dy++) {
              drawIsoTilePolygon(
                ctx,
                hoveredGrid.x + dx,
                hoveredGrid.y + dy,
                0,
                originX,
                originY,
                tileW,
                tileH,
                valid ? 'rgba(56, 189, 248, 0.48)' : 'rgba(248, 113, 113, 0.5)',
                valid ? '#22d3ee' : '#f87171',
                2.2
              );
            }
          }
        }
      } else if (props.isEditDecorMode && hoveredGrid) {
        drawIsoTilePolygon(
          ctx,
          hoveredGrid.x,
          hoveredGrid.y,
          0,
          originX,
          originY,
          tileW,
          tileH,
          'rgba(250, 204, 21, 0.36)',
          '#facc15',
          2.2
        );
      } else if (props.buildModeItem && hoveredGrid) {
        const valid = canPlaceItem(
          props.placedItems,
          props.buildModeItem,
          props.activeFloor,
          hoveredGrid.x,
          hoveredGrid.y,
          props.buildRotation
        );
        const fp = getRotatedFootprint(props.buildModeItem, props.buildRotation);
        for (let dx = 0; dx < fp.width; dx++) {
          for (let dy = 0; dy < fp.depth; dy++) {
            const gx = hoveredGrid.x + dx;
            const gy = hoveredGrid.y + dy;
            drawIsoTilePolygon(
              ctx,
              gx,
              gy,
              0,
              originX,
              originY,
              tileW,
              tileH,
              valid ? 'rgba(74, 222, 128, 0.48)' : 'rgba(248, 113, 113, 0.5)',
              valid ? '#4ade80' : '#f87171',
              2
            );
          }
        }
      } else if (props.isRemoveMode && hoveredGrid) {
        drawIsoTilePolygon(
          ctx,
          hoveredGrid.x,
          hoveredGrid.y,
          0,
          originX,
          originY,
          tileW,
          tileH,
          'rgba(244, 63, 94, 0.4)',
          '#fb7185',
          2
        );
      }

      // 6. PAINTER'S ALGORITHM DEPTH & Z-INDEX SORT FOR 3D FURNITURE, HIRED STAFF, GUESTS, PEDESTRIANS & RED CARPET QUEUE
      const drawables: Array<{ zIndex: number; depth: number; draw: () => void }> = [];

      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category === 'DANCE_TILE') continue;
        const fp = getRotatedFootprint(cat, item.rotation);

        if (cat.category === 'BAR_UNIT') {
          const barDepth = item.gridX + item.gridY + (fp.width + fp.depth) * 0.35;
          drawables.push({
            zIndex: 0,
            depth: barDepth,
            draw: () =>
              drawBar(
                ctx,
                item,
                cat,
                fp,
                originX,
                originY,
                tileW,
                tileH,
                scale,
                t,
                props.activeDrink
              ),
          });
          if (!assetManager.hasSprite('bar_counter')) {
            const stools = getBarStoolCoords(item, fp);
            for (const st of stools) {
              drawables.push({
                zIndex: 0,
                depth: st.gx + st.gy + 0.3,
                draw: () =>
                  drawBarStool(ctx, st.gx, st.gy, originX, originY, tileW, tileH, scale),
              });
            }
          }
        } else if (cat.category === 'SEATING') {
          if (cat.id === 'seat_bistro') {
            const chairBackGx = item.gridX + 0.14;
            const chairBackGy = item.gridY + 0.52;
            const chairFrontGx = item.gridX + 0.86;
            const chairFrontGy = item.gridY + 0.48;

            if (!assetManager.hasSprite('cocktail_table')) {
              drawables.push({
                zIndex: 0,
                depth: chairBackGx + chairBackGy + 0.3,
                draw: () =>
                  drawCushionedClubChairAtGrid(
                    ctx,
                    chairBackGx,
                    chairBackGy,
                    originX,
                    originY,
                    tileW,
                    tileH,
                    scale,
                    '#7e22ce',
                    'SE'
                  ),
              });
            }

            drawables.push({
              zIndex: 0,
              depth: item.gridX + item.gridY + 1.38,
              draw: () =>
                drawTable(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t),
            });

            if (!assetManager.hasSprite('cocktail_table')) {
              drawables.push({
                zIndex: 0,
                depth: chairFrontGx + chairFrontGy + 0.3,
                draw: () =>
                  drawCushionedClubChairAtGrid(
                    ctx,
                    chairFrontGx,
                    chairFrontGy,
                    originX,
                    originY,
                    tileW,
                    tileH,
                    scale,
                    '#9333ea',
                    'NW'
                  ),
              });
            }
          } else {
            drawables.push({
              zIndex: 0,
              depth: item.gridX + item.gridY + 0.35,
              draw: () =>
                drawTable(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t),
            });
            if (!assetManager.hasSprite('vip_couch')) {
              const boothService = props.activeBottleServices?.[item.uid];
              drawables.push({
                zIndex: 0,
                depth: item.gridX + item.gridY + Math.max(fp.width, fp.depth) + 0.65,
                draw: () =>
                  drawVipBoothForegroundTable(
                    ctx,
                    item,
                    fp,
                    originX,
                    originY,
                    tileW,
                    tileH,
                    scale,
                    t,
                    boothService
                  ),
              });
            }
          }
        } else {
          const depth = item.gridX + item.gridY + (fp.width + fp.depth) * 0.5;
          drawables.push({
            zIndex: 0,
            depth,
            draw: () =>
              drawIllustratedFurniture(
                ctx,
                item,
                cat,
                fp,
                originX,
                originY,
                tileW,
                tileH,
                scale,
                t,
                props.activeDrink,
                moodProfile
              ),
          });
        }
      }

      const hasBarOnFloor = floorItems.some(
        (it) => getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
      );
      const floorStaff = props.staffMembers.filter((s) => s.floor === props.activeFloor);
      for (let i = 0; i < floorStaff.length; i++) {
        const sm = floorStaff[i];
        if (
          sm.role === 'BARTENDER' &&
          hasBarOnFloor &&
          sm.path.length === 0 &&
          props.relocatingStaffUid !== sm.uid
        ) {
          continue;
        }
        const depth = sm.gridX + sm.gridY + 0.58;
        drawables.push({
          zIndex: 0,
          depth,
          draw: () => {
            drawHiredStaffAgent(
              ctx,
              sm,
              originX,
              originY,
              tileW,
              tileH,
              scale,
              t,
              props.relocatingStaffUid === sm.uid
            );
            if (props.selectedSpriteId === sm.uid) {
              const mappedRole =
                sm.role === 'BOUNCER'
                  ? 'SECURITY'
                  : sm.role === 'WAITER'
                  ? 'WAITER'
                  : 'BARTENDER';
              const info = computeStaffMoodInfo(
                sm.uid,
                mappedRole,
                props.activeGenre || 'Pop',
                sm.name
              );
              drawSelectedSpriteMoodOverlay(
                ctx,
                sm.gridX,
                sm.gridY,
                originX,
                originY,
                tileW,
                tileH,
                scale,
                t,
                info
              );
            }
          },
        });
      }

      // Active Floor Interior Guests (Compute live average spend to identify High-Hype VIP Whales)
      const allGuests = guestsRef.current;
      const insideGuestsNow = allGuests.filter((g) => !isExteriorGuestState(g.state));
      const insideCountNow = insideGuestsNow.length;
      const isClubFullNow = insideCountNow >= props.clubMetrics.maxGuests;
      const avgClubGuestSpend = computeAverageClubGuestSpend(allGuests);

      for (let i = 0; i < allGuests.length; i++) {
        const guest = allGuests[i];
        if (guest.floor !== props.activeFloor || isExteriorGuestState(guest.state)) continue;
        const depth = guest.gridX + guest.gridY + 0.6;
        const isWhale = isGuestVipWhale(guest, avgClubGuestSpend);
        drawables.push({
          zIndex: 0,
          depth,
          draw: () => {
            drawIllustratedCharacter(
              ctx,
              guest,
              guest.gridX,
              guest.gridY,
              originX,
              originY,
              tileW,
              tileH,
              scale,
              t,
              activeBpm,
              isWhale,
              bassDropRipplesRef.current
            );
            if (props.selectedSpriteId === guest.id) {
              const info = computeGuestMoodInfo(
                guest,
                props.activeGenre || 'Pop',
                isClubFullNow,
                0,
                props.placedItems,
                props.activeBottleServices,
                isWhale
              );
              drawSelectedSpriteMoodOverlay(
                ctx,
                guest.gridX,
                guest.gridY,
                originX,
                originY,
                tileW,
                tileH,
                scale,
                t,
                info
              );
            }
          },
        });
      }

      // Foreground Red Carpet Entrance Archway Door & Neon Entry Sign (Floor 1)
      if (props.activeFloor === 1) {
        drawables.push({
          zIndex: 0,
          depth: DOOR_COORD.x + DOOR_COORD.y + 1.15,
          draw: () =>
            drawEntranceArchwayCutaway(
              ctx,
              originX,
              streetOriginY,
              tileW,
              tileH,
              scale,
              isClubFullNow,
              moodProfile
            ),
        });
      }

      // Front Red Carpet Queueing Customers + Customers Walking From/Back To Their Parked Cars in the Parking Lot!
      const queueGuests = allGuests.filter((g) => isExteriorGuestState(g.state));
      queueGuests.forEach((qg) => {
        const qx = qg.gridX;
        const qy = qg.gridY;
        drawables.push({
          zIndex: parkedCarsZIndex < 0 ? parkedCarsZIndex + 10 : 0,
          depth: qx + qy + 2.5,
          draw: () => {
            drawIllustratedCharacter(
              ctx,
              qg,
              qx,
              qy,
              originX,
              streetOriginY,
              tileW,
              tileH,
              scale,
              t,
              activeBpm
            );
            if (props.selectedSpriteId === qg.id) {
              const info = computeGuestMoodInfo(
                qg,
                props.activeGenre || 'Pop',
                isClubFullNow
              );
              drawSelectedSpriteMoodOverlay(
                ctx,
                qx,
                qy,
                originX,
                streetOriginY,
                tileW,
                tileH,
                scale,
                t,
                info
              );
            }
          },
        });
      });

      // Sidewalk Pedestrians walking around the building exterior
      const pedestrians = pedestriansRef.current;
      pedestrians.forEach((ped) => {
        const pedAsGuest: GuestAgent = {
          id: ped.id,
          name: ped.name,
          isCelebrity: false,
          floor: 1,
          targetFloor: 1,
          gridX: ped.gridX,
          gridY: ped.gridY,
          path: [{ x: ped.gridX + 0.1, y: ped.gridY + 0.1 }],
          state: 'WALKING_TO_DANCE',
          stateTimer: 5,
          patience: 95,
          hype: ped.hype,
          bubble: ped.bubble,
          bubbleTimer: ped.bubbleTimer,
          shirtColor: ped.shirtColor,
          hairColor: ped.hairColor,
          pantsColor: ped.pantsColor,
          cashSpent: 0,
          facingDir: ped.facingDir,
        };
        drawables.push({
          zIndex: parkedCarsZIndex < 0 ? parkedCarsZIndex + 8 : 0,
          depth: ped.gridX + ped.gridY + 2.2,
          draw: () => {
            drawIllustratedCharacter(
              ctx,
              pedAsGuest,
              ped.gridX,
              ped.gridY,
              originX,
              streetOriginY,
              tileW,
              tileH,
              scale,
              t,
              activeBpm
            );
            if (props.selectedSpriteId === ped.id) {
              const info = computePedestrianMoodInfo(ped, props.activeGenre || 'Pop');
              drawSelectedSpriteMoodOverlay(
                ctx,
                ped.gridX,
                ped.gridY,
                originX,
                streetOriginY,
                tileW,
                tileH,
                scale,
                t,
                info
              );
            }
          },
        });
      });

      drawables.sort((a, b) => (a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.depth - b.depth));
      for (let i = 0; i < drawables.length; i++) {
        drawables[i].draw();
      }

      // 6B. FOREGROUND PARKED CARS & MOVING TRAFFIC CARS PASS (When parkedCarsZIndex >= 0 on Floor 1)
      if (parkedCarsZIndex >= 0) {
        drawForegroundQueueCarsAndLamps(
          ctx,
          originX,
          originY,
          tileW,
          tileH,
          scale,
          props.parkingState,
          streetZOffset,
          parkedCarsZIndex,
          props.activeFloor,
          trafficCarsRef.current
        );
      }

      // 7. GLOBAL DAY/NIGHT CYCLE SCENE DARKENING OVERLAY
      drawGlobalDayNightOverlay(
        ctx,
        width,
        height,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        cycle
      );

      // 8. RHYTHMIC LIGHTING SEQUENCER NEON EMISSIVE GLOW PASS FOR ALL PLACED ITEMS & DANCE FLOOR
      drawPlacedItemsNeonEmissivePass(
        ctx,
        floorItems,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        t,
        cycle,
        props.activeDrink,
        sequencer
      );

      // 8B. MAX-HYPE (3/3 SEGMENTS) DANCER CONFETTI & BUBBLES PARTICLE SYSTEM (Clean lineless particles & bubbles)
      const dancerParticles = dancerParticlesRef.current;
      if (dancerParticles.length > 0) {
        ctx.save();
        for (let i = 0; i < dancerParticles.length; i++) {
          const p = dancerParticles[i];
          if (p.floor !== props.activeFloor) continue;
          const lifeRatio = p.age / p.maxAge;
          const alpha =
            lifeRatio < 0.15
              ? lifeRatio / 0.15
              : lifeRatio > 0.78
              ? Math.max(0, (1 - lifeRatio) / 0.22)
              : 1;
          const basePx = originX + (p.gridX - p.gridY) * (tileW / 2);
          const basePy = originY + (p.gridX + p.gridY) * (tileH / 2);
          const sx = basePx + p.offsetX * scale;
          const sy = basePy + p.offsetY * scale;

          ctx.save();
          ctx.globalAlpha = alpha;

          if (p.kind === 'BUBBLE') {
            const r = p.size * (1 + lifeRatio * 0.28) * scale;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.48;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(
              sx - r * 0.34,
              sy - r * 0.34,
              Math.max(0.7, r * 0.26),
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else {
            const w = p.size * 1.55 * scale;
            const h = p.size * 0.85 * Math.max(0.28, Math.abs(Math.cos(p.rotation * 1.6))) * scale;
            ctx.translate(sx, sy);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.rect(-w / 2, -h / 2, w, h);
            ctx.fill();
          }

          ctx.restore();
        }
        ctx.restore();
      }

      // 9. FLOATING CASH & HYPE TEXTS
      const fts = floatingTextsRef.current;
      for (let i = 0; i < fts.length; i++) {
        const ft = fts[i];
        if (ft.floor !== props.activeFloor) continue;
        const z = (44 + ft.age * 32) * scale;
        const sx = originX + (ft.gridX - ft.gridY) * (tileW / 2);
        const sy = originY + (ft.gridX + ft.gridY) * (tileH / 2) - z;
        ctx.save();
        ctx.font = `800 ${Math.max(11, Math.round(14 * scale))}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.age);
        ctx.fillStyle = '#090518';
        ctx.fillText(ft.text, sx + 1.5, sy + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, sx, sy);
        ctx.restore();
      }

      // 10. FOREGROUND EDIT-MODE GIZMO, LONG-PRESS RADIAL PROGRESS RING & NEWLY BOUGHT DECORATION SPOTLIGHT BEACON
      drawDecorationEditAndNewBeaconOverlays(
        ctx,
        floorItems,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        t,
        props.isEditDecorMode,
        props.editingPlacedItemUid,
        props.newlyPlacedItemHighlight,
        longPressStateRef.current
      );

      ctx.restore();
      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, [guestsRef, floatingTextsRef]);

  // Unified Cross-Browser, iPad & Mobile Touch Pointer Handlers (with 2-Finger Pinch-to-Zoom & Wheel Zoom!)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    activePointersRef.current.set(e.pointerId, { x: sx, y: sy });

    if (activePointersRef.current.size === 2) {
      clearLongPressTimer();
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStateRef.current = {
        isPinching: true,
        initialDist: Math.max(20, dist),
        initialZoom: latestPropsRef.current.cameraZoom,
        initialMidX: (pts[0].x + pts[1].x) * 0.5,
        initialMidY: (pts[0].y + pts[1].y) * 0.5,
        initialPanX: panOffsetRef.current.x,
        initialPanY: panOffsetRef.current.y,
      };
      dragStateRef.current.hasDragged = true;
      return;
    }

    dragStateRef.current = {
      isDown: true,
      pointerId: e.pointerId,
      startX: sx,
      startY: sy,
      initialPanX: panOffsetRef.current.x,
      initialPanY: panOffsetRef.current.y,
      hasDragged: false,
    };

    const props = latestPropsRef.current;
    const { scale, tileW, tileH, originX, originY } = getViewportTransform(
      rect.width,
      rect.height,
      props.cameraZoom
    );
    const iso = screenToIso(sx, sy, originX, originY, tileW, tileH);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      hoveredGridRef.current = iso;
    }

    // Long-press detection (~420ms hold) on any placed decoration on the active floor to enter Edit Mode to move it!
    clearLongPressTimer();
    longPressStateRef.current.triggered = false;
    if (
      activePointersRef.current.size === 1 &&
      !props.placementModeStaff &&
      !props.relocatingStaffUid &&
      !props.isRemoveMode
    ) {
      const hitItem = findPlacedDecorationAtScreenPoint(
        sx,
        sy,
        iso,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        props.placedItems,
        props.activeFloor
      );
      if (hitItem) {
        longPressStateRef.current.targetItemUid = hitItem.uid;
        longPressStateRef.current.startTimeMs = performance.now();
        longPressStateRef.current.durationMs = 420;
        longPressStateRef.current.timerId = window.setTimeout(() => {
          if (
            dragStateRef.current.isDown &&
            !dragStateRef.current.hasDragged &&
            !pinchStateRef.current.isPinching
          ) {
            longPressStateRef.current.triggered = true;
            longPressStateRef.current.timerId = null;
            latestPropsRef.current.onLongPressPlacedItem?.(hitItem.uid);
          }
        }, 420);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const props = latestPropsRef.current;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: sx, y: sy });
    }

    // Two-finger Pinch-to-Zoom + Two-finger Pan for iPad & Phone browsers
    if (pinchStateRef.current.isPinching && activePointersRef.current.size >= 2) {
      clearLongPressTimer();
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / Math.max(20, pinchStateRef.current.initialDist);
      const nextZoom = Math.max(
        0.45,
        Math.min(2.25, +(pinchStateRef.current.initialZoom * ratio).toFixed(2))
      );
      if (props.onZoomChange && Math.abs(nextZoom - props.cameraZoom) >= 0.01) {
        props.onZoomChange(nextZoom);
      }
      const midX = (pts[0].x + pts[1].x) * 0.5;
      const midY = (pts[0].y + pts[1].y) * 0.5;
      panOffsetRef.current = {
        x: Math.max(-460, Math.min(460, pinchStateRef.current.initialPanX + (midX - pinchStateRef.current.initialMidX))),
        y: Math.max(-340, Math.min(340, pinchStateRef.current.initialPanY + (midY - pinchStateRef.current.initialMidY))),
      };
      return;
    }

    if (dragStateRef.current.isDown && dragStateRef.current.pointerId === e.pointerId) {
      const dx = sx - dragStateRef.current.startX;
      const dy = sy - dragStateRef.current.startY;
      if (Math.hypot(dx, dy) > 9) {
        dragStateRef.current.hasDragged = true;
        clearLongPressTimer();
      }
      if (dragStateRef.current.hasDragged) {
        panOffsetRef.current = {
          x: Math.max(-460, Math.min(460, dragStateRef.current.initialPanX + dx)),
          y: Math.max(-340, Math.min(340, dragStateRef.current.initialPanY + dy)),
        };
      }
    }

    const { tileW, tileH, originX, originY } = getViewportTransform(
      rect.width,
      rect.height,
      props.cameraZoom
    );
    const iso = screenToIso(sx, sy, originX, originY, tileW, tileH);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      hoveredGridRef.current = iso;
    } else {
      hoveredGridRef.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    const wasLongPressTriggered = longPressStateRef.current.triggered;
    clearLongPressTimer();
    longPressStateRef.current.triggered = false;

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2 && pinchStateRef.current.isPinching) {
      pinchStateRef.current.isPinching = false;
      dragStateRef.current.isDown = false;
      dragStateRef.current.pointerId = null;
      return;
    }

    const wasDragged = dragStateRef.current.hasDragged;
    dragStateRef.current.isDown = false;
    dragStateRef.current.pointerId = null;

    if (wasDragged || wasLongPressTriggered) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const props = latestPropsRef.current;

    const hb = stairsHitboxRef.current;
    if (sx >= hb.x && sx <= hb.x + hb.w && sy >= hb.y && sy <= hb.y + hb.h) {
      props.onClickBuyFloor2();
      return;
    }

    const { scale, tileW, tileH, originX, originY } = getViewportTransform(
      rect.width,
      rect.height,
      props.cameraZoom
    );

    const isEditingGridMode =
      Boolean(props.buildModeItem) ||
      props.isRemoveMode ||
      Boolean(props.isEditDecorMode) ||
      Boolean(props.editingPlacedItemUid) ||
      Boolean(props.placementModeStaff) ||
      Boolean(props.relocatingStaffUid);

    if (!isEditingGridMode) {
      const tappedBoothBadge = findTappedVipBoothBottleBadgeAtScreenPoint(
        sx,
        sy,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        props.placedItems,
        props.activeFloor,
        props.activeBottleServices
      );
      if (tappedBoothBadge && props.onBottleServiceEvent) {
        props.onBottleServiceEvent(tappedBoothBadge.uid, 'TAPPED_BOOTH');
        return;
      }

      if (props.onSelectSprite) {
        const streetZOffset = props.activeFloor >= 2 ? -(props.activeFloor - 1) * 92 * scale : 0;
        const streetOriginY = originY - streetZOffset;

        const tappedMood = findTappedSpriteMoodAtScreenPoint(
          sx,
          sy,
          originX,
          originY,
          streetOriginY,
          tileW,
          tileH,
          scale,
          guestsRef.current,
          pedestriansRef.current,
          props.placedItems,
          props.staffMembers,
          props.activeBottleServices,
          props.activeFloor,
          props.activeGenre || 'Pop',
          props.clubMetrics.maxGuests
        );

        if (tappedMood) {
          const matchedGuest = guestsRef.current.find((g) => g.id === tappedMood.id);
          if (matchedGuest) {
            matchedGuest.bubble = matchedGuest.isCelebrity ? 'VIP_CROWN' : 'SPARKLE';
            matchedGuest.bubbleTimer = 4.0;
          }
          const matchedPed = pedestriansRef.current.find((p) => p.id === tappedMood.id);
          if (matchedPed) {
            matchedPed.bubble = 'MUSIC';
            matchedPed.bubbleTimer = 4.0;
          }
          props.onSelectSprite(tappedMood);
          return;
        }
      }
    }

    const iso = screenToIso(sx, sy, originX, originY, tileW, tileH);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      hoveredGridRef.current = iso;
      props.onClickGrid(iso);
    }
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const props = latestPropsRef.current;
    if (!props.onZoomChange) return;
    const zoomStep = e.ctrlKey ? -e.deltaY * 0.01 : e.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.max(0.45, Math.min(2.25, +(props.cameraZoom + zoomStep).toFixed(2)));
    if (nextZoom !== props.cameraZoom) {
      props.onZoomChange(nextZoom);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheelZoom}
      onPointerCancel={(e) => {
        clearLongPressTimer();
        longPressStateRef.current.triggered = false;
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
          pinchStateRef.current.isPinching = false;
        }
        dragStateRef.current.isDown = false;
        dragStateRef.current.pointerId = null;
      }}
      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
    />
  );
};

// ============================================================================
// HAND-ILLUSTRATED ISOMETRIC GRAPHICS ENGINE (MATCHED TO IMG_1503.jpeg)
// ============================================================================

function drawIsoTilePolygon(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  z: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  fill: string,
  stroke?: string,
  lineWidth: number = 1
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const p0x = originX + (gx - gy) * halfW;
  const p0y = originY + (gx + gy) * halfH - z;
  const p1x = originX + (gx + 1 - gy) * halfW;
  const p1y = originY + (gx + 1 + gy) * halfH - z;
  const p2x = originX + (gx - gy) * halfW;
  const p2y = originY + (gx + 1 + (gy + 1)) * halfH - z;
  const p3x = originX + (gx - (gy + 1)) * halfW;
  const p3y = originY + (gx + (gy + 1)) * halfH - z;

  ctx.beginPath();
  ctx.moveTo(p0x, p0y);
  ctx.lineTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(p3x, p3y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawIsoPrism(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  w: number,
  d: number,
  zBase: number,
  h: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor: string = INK,
  lineWidth: number = 1.4
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const topZ = zBase + h;

  const topNx = originX + (gx - gy) * halfW;
  const topNy = originY + (gx + gy) * halfH - topZ;
  const topEx = originX + (gx + w - gy) * halfW;
  const topEy = originY + (gx + w + gy) * halfH - topZ;
  const topSx = originX + (gx + w - (gy + d)) * halfW;
  const topSy = originY + (gx + w + (gy + d)) * halfH - topZ;
  const topWx = originX + (gx - (gy + d)) * halfW;
  const topWy = originY + (gx + (gy + d)) * halfH - topZ;

  // Left visible face (W -> S)
  ctx.beginPath();
  ctx.moveTo(topWx, topWy);
  ctx.lineTo(topSx, topSy);
  ctx.lineTo(topSx, topSy + h);
  ctx.lineTo(topWx, topWy + h);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Right visible face (S -> E)
  ctx.beginPath();
  ctx.moveTo(topSx, topSy);
  ctx.lineTo(topEx, topEy);
  ctx.lineTo(topEx, topEy + h);
  ctx.lineTo(topSx, topSy + h);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(topNx, topNy);
  ctx.lineTo(topEx, topEy);
  ctx.lineTo(topSx, topSy);
  ctx.lineTo(topWx, topWy);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.stroke();
}

/**
 * Draws realistic 3D metropolitan downtown architecture surrounding the nightclub:
 * - Distant atmospheric skyscraper layer with FAA red aviation warning beacons
 * - Midground 3D perspective buildings with distinct front/left facades, shaded right side walls,
 *   3D rooftop slabs, parapet walls, HVAC cooling units, wooden water towers, exterior iron fire escapes,
 *   reflective glass curtain-wall mullions, brick/stone cornice ledges, and realistic warm/cool interior window lighting.
 */
function drawIllustratedCitySkyline(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  scale: number,
  t: number
) {
  ctx.save();

  // 1. DISTANT BACKGROUND SKYLINE SILHOUETTES (10 atmospheric high-rise towers with FAA red aviation beacons)
  const distantTowers = [
    { dx: -585, dy: -275, w: 62, h: 310, sideW: 16, color: '#0c0f1f', sideColor: '#060812' },
    { dx: -505, dy: -305, w: 68, h: 335, sideW: 18, color: '#0d1021', sideColor: '#070914' },
    { dx: -405, dy: -325, w: 74, h: 355, sideW: 20, color: '#0f1326', sideColor: '#080a17' },
    { dx: -290, dy: -290, w: 64, h: 315, sideW: 16, color: '#0d1123', sideColor: '#070914' },
    { dx: -185, dy: -315, w: 72, h: 340, sideW: 18, color: '#0e1225', sideColor: '#070914' },
    { dx: -75, dy: -332, w: 78, h: 365, sideW: 20, color: '#10152a', sideColor: '#080b18' },
    { dx: 35, dy: -310, w: 70, h: 335, sideW: 18, color: '#0e1224', sideColor: '#070914' },
    { dx: 145, dy: -305, w: 72, h: 325, sideW: 18, color: '#0e1225', sideColor: '#070914' },
    { dx: 255, dy: -325, w: 84, h: 355, sideW: 22, color: '#10152a', sideColor: '#080b18' },
    { dx: 385, dy: -295, w: 74, h: 330, sideW: 18, color: '#0d1122', sideColor: '#070914' },
    { dx: 495, dy: -275, w: 68, h: 310, sideW: 18, color: '#0c1020', sideColor: '#060812' },
  ];

  for (let i = 0; i < distantTowers.length; i++) {
    const dt = distantTowers[i];
    const x = originX + dt.dx * scale;
    const y = originY + dt.dy * scale;
    const w = dt.w * scale;
    const h = dt.h * scale;
    const sw = dt.sideW * scale;
    const syOff = -7 * scale;

    // Front face
    ctx.fillStyle = dt.color;
    ctx.fillRect(x, y, w, h);

    // 3D right side wall
    ctx.fillStyle = dt.sideColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + sw, y + syOff);
    ctx.lineTo(x + w + sw, y + h + syOff);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Subtle distant office window bands
    ctx.fillStyle = 'rgba(148, 163, 184, 0.13)';
    for (let wy = y + 16 * scale; wy < y + h - 40 * scale; wy += 14 * scale) {
      ctx.fillRect(x + 6 * scale, wy, w - 12 * scale, 3.5 * scale);
    }

    // Rooftop antenna spire & blinking red FAA aviation beacon
    const spireX = x + w * 0.5;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(spireX, y);
    ctx.lineTo(spireX, y - 24 * scale);
    ctx.stroke();

    const beaconAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + i * 1.3));
    ctx.fillStyle = `rgba(239, 68, 68, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(spireX, y - 24 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helper to draw a realistic 3D architectural building block with front face, perspective side wall,
  // recessed roof deck, concrete parapet coping, and stone cornice moldings
  const drawRealistic3DBuildingBlock = (opts: {
    dx: number;
    dy: number;
    w: number;
    h: number;
    depthX: number;
    depthY: number;
    frontTopColor: string;
    frontBottomColor: string;
    sideColor: string;
    roofColor: string;
    parapetColor: string;
    corniceIntervals?: number[];
  }) => {
    const bx = originX + opts.dx * scale;
    const by = originY + opts.dy * scale;
    const bw = opts.w * scale;
    const bh = opts.h * scale;
    const dx = opts.depthX * scale;
    const dy = opts.depthY * scale;

    // 1. 3D Rooftop Deck Slab (Perspective parallelogram)
    ctx.fillStyle = opts.roofColor;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + dx, by + dy);
    ctx.lineTo(bx + bw + dx, by + dy);
    ctx.lineTo(bx + bw, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // 2. Main Front Facade with vertical architectural lighting gradient
    const frontGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    frontGrad.addColorStop(0, opts.frontTopColor);
    frontGrad.addColorStop(1, opts.frontBottomColor);
    ctx.fillStyle = frontGrad;
    ctx.fillRect(bx, by, bw, bh);

    // 3. Shaded 3D Right Side Wall
    ctx.fillStyle = opts.sideColor;
    ctx.beginPath();
    ctx.moveTo(bx + bw, by);
    ctx.lineTo(bx + bw + dx, by + dy);
    ctx.lineTo(bx + bw + dx, by + bh + dy);
    ctx.lineTo(bx + bw, by + bh);
    ctx.closePath();
    ctx.fill();

    // Crisp structural outlines
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.8 * scale;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.beginPath();
    ctx.moveTo(bx + bw, by);
    ctx.lineTo(bx + bw + dx, by + dy);
    ctx.lineTo(bx + bw + dx, by + bh + dy);
    ctx.lineTo(bx + bw, by + bh);
    ctx.stroke();

    // 4. Rooftop Parapet Ledge & Stone Coping
    ctx.fillStyle = opts.parapetColor;
    ctx.fillRect(bx - 1.5 * scale, by - 4 * scale, bw + 3 * scale, 5 * scale);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.2 * scale;
    ctx.strokeRect(bx - 1.5 * scale, by - 4 * scale, bw + 3 * scale, 5 * scale);

    // Horizontal stone cornice ledges if specified
    if (opts.corniceIntervals) {
      for (const cyRatio of opts.corniceIntervals) {
        const cy = by + bh * cyRatio;
        ctx.fillStyle = opts.parapetColor;
        ctx.fillRect(bx - 1 * scale, cy, bw + 2 * scale, 3.5 * scale);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(bx, cy + 3.5 * scale, bw, 2.5 * scale);
      }
    }

    return { bx, by, bw, bh, dx, dy };
  };

  // ===========================================================================
  // BUILDING 0 (OUTER FAR-LEFT): PRE-WAR STEPPED LIMESTONE FINANCIAL TOWER
  // ===========================================================================
  {
    const b0 = drawRealistic3DBuildingBlock({
      dx: -548,
      dy: -206,
      w: 78,
      h: 305,
      depthX: 18,
      depthY: -9,
      frontTopColor: '#44403c',
      frontBottomColor: '#292524',
      sideColor: '#1c1917',
      roofColor: '#292524',
      parapetColor: '#a8a29e',
      corniceIntervals: [0.24, 0.68],
    });

    // Stepped Art-Deco Limestone Crown Tier
    ctx.fillStyle = '#57534e';
    ctx.fillRect(b0.bx + 12 * scale, b0.by - 22 * scale, b0.bw - 24 * scale, 18 * scale);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.3 * scale;
    ctx.strokeRect(b0.bx + 12 * scale, b0.by - 22 * scale, b0.bw - 24 * scale, 18 * scale);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = b0.bx + (9 + c * 22) * scale;
        const wy = b0.by + (16 + r * 29) * scale;
        const ww = 15 * scale;
        const wh = 19 * scale;
        const lit = (r * 5 + c * 3) % 4 !== 0;
        ctx.fillStyle = lit ? 'rgba(254, 240, 138, 0.64)' : 'rgba(28, 25, 23, 0.85)';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 1.1 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
      }
    }
  }

  // ===========================================================================
  // BUILDING 1 (FAR-LEFT): GLASS CURTAIN-WALL CORPORATE SKYSCRAPER
  // ===========================================================================
  {
    const b1 = drawRealistic3DBuildingBlock({
      dx: -456,
      dy: -228,
      w: 84,
      h: 328,
      depthX: 22,
      depthY: -11,
      frontTopColor: '#1e293b',
      frontBottomColor: '#0f172a',
      sideColor: '#090f1d',
      roofColor: '#1e293b',
      parapetColor: '#475569',
    });

    // Rooftop Mechanical Penthouse Box & Twin HVAC Fans
    ctx.fillStyle = '#334155';
    ctx.fillRect(b1.bx + 18 * scale, b1.by - 18 * scale, 44 * scale, 14 * scale);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4 * scale;
    ctx.strokeRect(b1.bx + 18 * scale, b1.by - 18 * scale, 44 * scale, 14 * scale);
    ctx.fillStyle = '#0f172a';
    for (let lv = 0; lv < 3; lv++) {
      ctx.fillRect(
        b1.bx + (23 + lv * 12) * scale,
        b1.by - 14 * scale,
        8 * scale,
        6 * scale
      );
    }

    // Realistic Reflective Glass Curtain-Wall Grid with Interior Lit Offices
    const cols = 5;
    const rows = 15;
    const padX = 7 * scale;
    const padY = 14 * scale;
    const cellW = (b1.bw - padX * 2) / cols;
    const cellH = (b1.bh - 50 * scale) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = b1.bx + padX + c * cellW + 1.2 * scale;
        const wy = b1.by + padY + r * cellH + 1.2 * scale;
        const ww = cellW - 2.4 * scale;
        const wh = cellH - 2.8 * scale;

        const hash = (r * 13 + c * 7) % 11;
        if (hash === 0 || hash === 3 || hash === 8) {
          ctx.fillStyle = 'rgba(253, 230, 138, 0.72)';
        } else if (hash === 1 || hash === 5 || hash === 9) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.58)';
        } else {
          ctx.fillStyle = 'rgba(30, 58, 138, 0.38)';
        }
        ctx.fillRect(wx, wy, ww, wh);

        if (hash === 0 || hash === 3 || hash === 1) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
          ctx.fillRect(wx, wy + wh * 0.62, ww, wh * 0.38);
        }
      }
    }

    // Vertical Brushed-Steel Curtain Wall Mullions
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2 * scale;
    for (let c = 0; c <= cols; c++) {
      const mx = b1.bx + padX + c * cellW;
      ctx.beginPath();
      ctx.moveTo(mx, b1.by + padY);
      ctx.lineTo(mx, b1.by + padY + rows * cellH);
      ctx.stroke();
    }
  }

  // ===========================================================================
  // BUILDING 2 (MID-LEFT): HISTORIC RED-BRICK WAREHOUSE LOFT WITH FIRE ESCAPE & WATER TOWER
  // ===========================================================================
  {
    const b2 = drawRealistic3DBuildingBlock({
      dx: -356,
      dy: -194,
      w: 86,
      h: 292,
      depthX: 20,
      depthY: -10,
      frontTopColor: '#5c2d24',
      frontBottomColor: '#381914',
      sideColor: '#240f0c',
      roofColor: '#27272a',
      parapetColor: '#a8a29e',
      corniceIntervals: [0.22, 0.78],
    });

    // Rooftop Wooden Water Tower on Steel Trestle Legs
    const wtX = b2.bx + 50 * scale;
    const wtY = b2.by - 32 * scale;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(wtX + 3 * scale, wtY + 18 * scale);
    ctx.lineTo(wtX, b2.by - 2 * scale);
    ctx.moveTo(wtX + 19 * scale, wtY + 18 * scale);
    ctx.lineTo(wtX + 22 * scale, b2.by - 2 * scale);
    ctx.moveTo(wtX + 2 * scale, wtY + 24 * scale);
    ctx.lineTo(wtX + 20 * scale, b2.by - 4 * scale);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(wtX + 2 * scale, wtY + 6 * scale, 18 * scale, 14 * scale);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.2 * scale;
    ctx.strokeRect(wtX + 2 * scale, wtY + 6 * scale, 18 * scale, 14 * scale);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(wtX, wtY + 6 * scale);
    ctx.lineTo(wtX + 11 * scale, wtY - 2 * scale);
    ctx.lineTo(wtX + 22 * scale, wtY + 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Recessed Arch-Topped Industrial Loft Windows with Limestone Sills
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = b2.bx + (11 + col * 24) * scale;
        const wy = b2.by + (16 + row * 34) * scale;
        const ww = 16 * scale;
        const wh = 22 * scale;

        ctx.fillStyle = '#1c0a07';
        ctx.fillRect(wx - 1.5 * scale, wy - 1.5 * scale, ww + 3 * scale, wh + 3 * scale);

        const isWarmLit = (row + col) % 2 === 0 || row === 2;
        ctx.fillStyle = isWarmLit ? 'rgba(254, 215, 170, 0.82)' : 'rgba(51, 65, 85, 0.55)';
        ctx.fillRect(wx, wy, ww, wh);

        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1.2 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh * 0.48);
        ctx.lineTo(wx + ww, wy + wh * 0.48);
        ctx.stroke();

        ctx.fillStyle = '#d6d3d1';
        ctx.fillRect(wx - 2 * scale, wy + wh, ww + 4 * scale, 2.5 * scale);
      }
    }

    // Realistic Black Wrought-Iron Exterior Fire Escape Balconies & Diagonal Ladders
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5 * scale;
    for (let f = 1; f <= 5; f++) {
      const fy = b2.by + (f * 34 + 34) * scale;
      const fx = b2.bx + 32 * scale;
      const fw = 44 * scale;
      ctx.strokeRect(fx, fy - 7 * scale, fw, 7 * scale);
      ctx.beginPath();
      for (let rail = 4; rail < 44; rail += 6) {
        ctx.moveTo(fx + rail * scale, fy - 7 * scale);
        ctx.lineTo(fx + rail * scale, fy);
      }
      if (f < 5) {
        ctx.moveTo(fx + 6 * scale, fy);
        ctx.lineTo(fx + 34 * scale, fy + 27 * scale);
      }
      ctx.stroke();
    }
  }

  // ===========================================================================
  // BUILDING 3 (INNER-LEFT): MID-CENTURY LIMESTONE & CONCRETE BOUTIQUE HOTEL
  // ===========================================================================
  {
    const b3 = drawRealistic3DBuildingBlock({
      dx: -254,
      dy: -216,
      w: 88,
      h: 274,
      depthX: 18,
      depthY: -9,
      frontTopColor: '#3f3f46',
      frontBottomColor: '#27272a',
      sideColor: '#18181b',
      roofColor: '#27272a',
      parapetColor: '#a1a1aa',
      corniceIntervals: [0.16, 0.84],
    });

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 3; c++) {
        const bx0 = b3.bx + (10 + c * 25) * scale;
        const by0 = b3.by + (24 + r * 34) * scale;
        const bw0 = 19 * scale;
        const bh0 = 21 * scale;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(bx0, by0, bw0, bh0);

        const suiteLit = (r * 3 + c) % 4 !== 0;
        ctx.fillStyle = suiteLit ? 'rgba(253, 224, 71, 0.65)' : 'rgba(39, 39, 42, 0.7)';
        ctx.fillRect(bx0 + 2 * scale, by0 + 2 * scale, bw0 - 4 * scale, bh0 - 4 * scale);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
        ctx.fillRect(bx0 - 1 * scale, by0 + bh0 - 7 * scale, bw0 + 2 * scale, 7 * scale);
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(bx0 - 1 * scale, by0 + bh0 - 7 * scale, bw0 + 2 * scale, 7 * scale);
      }
    }
  }

  // ===========================================================================
  // BUILDING 4 (CENTER-LEFT): NEO-CLASSICAL STONE & CAST-IRON BANK BUILDING
  // ===========================================================================
  {
    const b4c = drawRealistic3DBuildingBlock({
      dx: -152,
      dy: -238,
      w: 84,
      h: 268,
      depthX: 18,
      depthY: -9,
      frontTopColor: '#334155',
      frontBottomColor: '#1e293b',
      sideColor: '#0f172a',
      roofColor: '#1e293b',
      parapetColor: '#94a3b8',
      corniceIntervals: [0.18, 0.75],
    });

    // Fluted Vertical Stone Columns & Recessed Windows
    ctx.fillStyle = '#475569';
    for (let col = 0; col < 4; col++) {
      ctx.fillRect(
        b4c.bx + (7 + col * 22) * scale,
        b4c.by + 6 * scale,
        4.5 * scale,
        b4c.bh - 12 * scale
      );
    }
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = b4c.bx + (13 + c * 22) * scale;
        const wy = b4c.by + (16 + r * 31) * scale;
        const ww = 14 * scale;
        const wh = 20 * scale;
        const lit = (r + c * 2) % 3 === 0;
        ctx.fillStyle = lit ? 'rgba(254, 243, 199, 0.62)' : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
      }
    }
  }

  // ===========================================================================
  // BUILDING 5 (CENTER-BACK): TALL MODERNIST STEEL-FRAME HIGH-RISE TOWER
  // ===========================================================================
  {
    const b5c = drawRealistic3DBuildingBlock({
      dx: -54,
      dy: -272,
      w: 96,
      h: 295,
      depthX: 22,
      depthY: -11,
      frontTopColor: '#1e293b',
      frontBottomColor: '#0f172a',
      sideColor: '#090d16',
      roofColor: '#334155',
      parapetColor: '#64748b',
      corniceIntervals: [0.32],
    });

    // Twin Rooftop Cooling Towers
    ctx.fillStyle = '#475569';
    ctx.fillRect(b5c.bx + 16 * scale, b5c.by - 16 * scale, 26 * scale, 12 * scale);
    ctx.fillRect(b5c.bx + 52 * scale, b5c.by - 16 * scale, 26 * scale, 12 * scale);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.2 * scale;
    ctx.strokeRect(b5c.bx + 16 * scale, b5c.by - 16 * scale, 26 * scale, 12 * scale);
    ctx.strokeRect(b5c.bx + 52 * scale, b5c.by - 16 * scale, 26 * scale, 12 * scale);

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 4; c++) {
        const wx = b5c.bx + (9 + c * 21) * scale;
        const wy = b5c.by + (14 + r * 26) * scale;
        const ww = 16 * scale;
        const wh = 18 * scale;
        const hash = (r * 7 + c * 5) % 9;
        ctx.fillStyle =
          hash === 0 || hash === 4
            ? 'rgba(253, 230, 138, 0.65)'
            : hash === 2 || hash === 6
            ? 'rgba(186, 230, 253, 0.5)'
            : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
      }
    }
  }

  // ===========================================================================
  // BUILDING 6 (CENTER-RIGHT): CONTEMPORARY TERRACOTTA & GLASS RESIDENTIAL TOWER
  // ===========================================================================
  {
    const b6c = drawRealistic3DBuildingBlock({
      dx: 58,
      dy: -246,
      w: 94,
      h: 280,
      depthX: 20,
      depthY: -10,
      frontTopColor: '#431407',
      frontBottomColor: '#270e07',
      sideColor: '#180804',
      roofColor: '#292524',
      parapetColor: '#a8a29e',
      corniceIntervals: [0.28, 0.64],
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = b6c.bx + (10 + c * 27) * scale;
        const wy = b6c.by + (16 + r * 31) * scale;
        const ww = 21 * scale;
        const wh = 20 * scale;
        const isLit = (r * 3 + c) % 3 !== 1;
        ctx.fillStyle = isLit ? 'rgba(254, 215, 170, 0.72)' : 'rgba(28, 25, 23, 0.86)';
        ctx.fillRect(wx, wy, ww, wh);
        // Balcony slab & glass guard
        ctx.fillStyle = '#78716c';
        ctx.fillRect(wx - 1.5 * scale, wy + wh, ww + 3 * scale, 2.8 * scale);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1.1 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
      }
    }
  }

  // ===========================================================================
  // BUILDING 7 (INNER-RIGHT): MODERN ARCHITECTURAL HIGH-RISE CONDOMINIUMS
  // ===========================================================================
  {
    const b4 = drawRealistic3DBuildingBlock({
      dx: 168,
      dy: -232,
      w: 92,
      h: 292,
      depthX: 22,
      depthY: -11,
      frontTopColor: '#1e293b',
      frontBottomColor: '#0f172a',
      sideColor: '#090d16',
      roofColor: '#334155',
      parapetColor: '#64748b',
    });

    ctx.fillStyle = '#475569';
    ctx.fillRect(b4.bx + 22 * scale, b4.by - 15 * scale, 42 * scale, 12 * scale);
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.3 * scale;
    ctx.strokeRect(b4.bx + 22 * scale, b4.by - 15 * scale, 42 * scale, 12 * scale);

    for (let r = 0; r < 10; r++) {
      const wy = b4.by + (16 + r * 25) * scale;
      const wh = 18 * scale;

      for (let c = 0; c < 2; c++) {
        const wx = b4.bx + (10 + c * 39) * scale;
        const ww = 33 * scale;

        const isLit = (r + c * 2) % 3 !== 1;
        ctx.fillStyle = isLit
          ? r % 2 === 0
            ? 'rgba(254, 240, 138, 0.62)'
            : 'rgba(186, 230, 253, 0.52)'
          : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(wx, wy, ww, wh);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx + ww / 3, wy);
        ctx.lineTo(wx + ww / 3, wy + wh);
        ctx.moveTo(wx + (ww * 2) / 3, wy);
        ctx.lineTo(wx + (ww * 2) / 3, wy + wh);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.fillRect(b4.bx + 4 * scale, wy + wh, b4.bw - 8 * scale, 3 * scale);
      }
    }

    ctx.fillStyle = 'rgba(253, 224, 71, 0.32)';
    for (let r = 0; r < 10; r++) {
      const sy = b4.by + (14 + r * 25) * scale;
      ctx.fillRect(b4.bx + b4.bw + 7 * scale, sy, 6 * scale, 14 * scale);
    }
  }

  // ===========================================================================
  // BUILDING 8 (MID-RIGHT): REALISTIC GRANITE & LIMESTONE EXECUTIVE OFFICE TOWER
  // (No Metropolitan Plaza billboard or moving bars — pure realistic architecture!)
  // ===========================================================================
  {
    const b5 = drawRealistic3DBuildingBlock({
      dx: 278,
      dy: -204,
      w: 128,
      h: 316,
      depthX: 24,
      depthY: -12,
      frontTopColor: '#27272a',
      frontBottomColor: '#18181b',
      sideColor: '#09090b',
      roofColor: '#27272a',
      parapetColor: '#a1a1aa',
      corniceIntervals: [0.22, 0.55, 0.82],
    });

    // Rooftop Architectural Mechanical Penthouse & Exhaust Louvers
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(b5.bx + 24 * scale, b5.by - 20 * scale, 76 * scale, 16 * scale);
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.4 * scale;
    ctx.strokeRect(b5.bx + 24 * scale, b5.by - 20 * scale, 76 * scale, 16 * scale);
    ctx.fillStyle = '#18181b';
    for (let lv = 0; lv < 4; lv++) {
      ctx.fillRect(
        b5.bx + (30 + lv * 17) * scale,
        b5.by - 15 * scale,
        11 * scale,
        7 * scale
      );
    }

    // Structural Vertical Granite Pilasters across the Facade
    ctx.fillStyle = '#3f3f46';
    for (let p = 0; p < 5; p++) {
      const px = b5.bx + (6 + p * 28.5) * scale;
      ctx.fillRect(px, b5.by + 4 * scale, 5.5 * scale, b5.bh - 8 * scale);
    }

    // Realistic Recessed Double-Hung Architectural Office Windows with Stone Lintels & Interior Venetian Blinds
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 4; c++) {
        const wx = b5.bx + (13.5 + c * 28.5) * scale;
        const wy = b5.by + (16 + r * 31) * scale;
        const ww = 19.5 * scale;
        const wh = 20 * scale;

        // Deep stone window reveal
        ctx.fillStyle = '#09090b';
        ctx.fillRect(wx - 1.2 * scale, wy - 1.2 * scale, ww + 2.4 * scale, wh + 2.4 * scale);

        const litHash = (r * 5 + c * 3) % 7;
        const isWarmLit = litHash === 0 || litHash === 2 || litHash === 5;
        const isCoolLit = litHash === 1 || litHash === 4;
        ctx.fillStyle = isWarmLit
          ? 'rgba(253, 230, 138, 0.68)'
          : isCoolLit
          ? 'rgba(226, 232, 240, 0.48)'
          : 'rgba(24, 24, 27, 0.9)';
        ctx.fillRect(wx, wy, ww, wh);

        // Realistic interior office desk silhouette & upper venetian blind slats in lit rooms
        if (isWarmLit || isCoolLit) {
          ctx.fillStyle = 'rgba(24, 24, 27, 0.35)';
          ctx.fillRect(wx, wy, ww, wh * 0.28);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
          ctx.fillRect(wx + 2 * scale, wy + wh * 0.68, ww - 4 * scale, wh * 0.32);
        }

        // Double-pane window mullions & limestone sill
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 1.1 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh * 0.5);
        ctx.lineTo(wx + ww, wy + wh * 0.5);
        ctx.stroke();

        ctx.fillStyle = '#a1a1aa';
        ctx.fillRect(wx - 1.5 * scale, wy + wh, ww + 3 * scale, 2.2 * scale);
      }
    }

    // 3D Side-Wall Recessed Office Windows
    ctx.fillStyle = 'rgba(253, 230, 138, 0.28)';
    for (let r = 0; r < 9; r++) {
      const sy = b5.by + (14 + r * 31) * scale;
      ctx.fillRect(b5.bx + b5.bw + 8 * scale, sy, 7 * scale, 16 * scale);
    }
  }

  // ===========================================================================
  // BUILDING 9 (FAR-RIGHT): HISTORIC BROWNSTONE & COPPER-CORNICE LOFT TOWER
  // ===========================================================================
  {
    const b9 = drawRealistic3DBuildingBlock({
      dx: 424,
      dy: -188,
      w: 92,
      h: 298,
      depthX: 20,
      depthY: -10,
      frontTopColor: '#451a03',
      frontBottomColor: '#290f02',
      sideColor: '#1c0a01',
      roofColor: '#1f2937',
      parapetColor: '#6ee7b7', // Aged patina copper cornice
      corniceIntervals: [0.25, 0.72],
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = b9.bx + (11 + c * 26) * scale;
        const wy = b9.by + (18 + r * 32) * scale;
        const ww = 18 * scale;
        const wh = 21 * scale;
        const lit = (r * 2 + c) % 3 !== 0;
        ctx.fillStyle = lit ? 'rgba(254, 215, 170, 0.75)' : 'rgba(31, 41, 55, 0.75)';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2 * scale;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.fillStyle = '#d6d3d1';
        ctx.fillRect(wx - 1.5 * scale, wy + wh, ww + 3 * scale, 2.2 * scale);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws the Nightclub City: Neon open-air city street corner surrounding the club platform:
 * - Dark asphalt roads on all four sides with speckled night grit
 * - White crosswalk stripes at top-left, top-right, and front street intersections
 * - Concrete sidewalk curbs bordering the open-air isometric club slab
 * - Draped warm-white string lights on poles running along the upper-left and upper-right sidewalks
 * - Orange traffic cones, purple/dark manhole covers, stray cardboard boxes, green street dumpster, fire hydrant, and rounded street trees
 * - Red carpet entrance runner with gold stanchions leading to the glowing purple/cyan doorway on the back-left wall
 */
function drawIllustratedParkingAndStreet(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  _parkingState: ParkingUpgradeState,
  _guests: GuestAgent[]
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  // 1. Dark Asphalt City Street Corner surrounding the entire isometric club slab
  const streetPoly = [
    { gx: -5.5, gy: -5.5 },
    { gx: 15.5, gy: -5.5 },
    { gx: 15.5, gy: 16.0 },
    { gx: -5.5, gy: 16.0 },
  ];
  ctx.beginPath();
  streetPoly.forEach((pt, idx) => {
    const sx = originX + (pt.gx - pt.gy) * halfW;
    const sy = originY + (pt.gx + pt.gy) * halfH;
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fillStyle = '#15151e';
  ctx.fill();

  // Subtle asphalt grain pebbles matching reference image street texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  const pebbles = [
    { gx: 11.2, gy: 7.4 },
    { gx: 12.6, gy: 9.1 },
    { gx: 8.8, gy: 11.8 },
    { gx: 5.5, gy: 13.4 },
    { gx: 2.1, gy: 13.9 },
    { gx: -2.4, gy: 8.5 },
    { gx: -3.2, gy: 4.1 },
    { gx: 11.8, gy: 2.6 },
    { gx: 7.2, gy: 12.9 },
  ];
  for (const pb of pebbles) {
    const px = originX + (pb.gx - pb.gy) * halfW;
    const py = originY + (pb.gx + pb.gy) * halfH;
    ctx.beginPath();
    ctx.arc(px, py, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Concrete Sidewalk Apron framing the Front-Left & Front-Right 10x10 Club Platform (no sidewalk sticking out behind upper walls)
  const sidewalkOuter = [
    { gx: 0.0, gy: 0.0 },
    { gx: 11.35, gy: 0.0 },
    { gx: 11.35, gy: 11.35 },
    { gx: -1.15, gy: 11.35 },
    { gx: -1.15, gy: 9.85 },
    { gx: 0.0, gy: 9.85 },
  ];
  ctx.beginPath();
  sidewalkOuter.forEach((pt, idx) => {
    const sx = originX + (pt.gx - pt.gy) * halfW;
    const sy = originY + (pt.gx + pt.gy) * halfH;
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fillStyle = '#242331';
  ctx.fill();
  ctx.strokeStyle = '#38364a';
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 3. White Crosswalk Stripes at Front-Right and Front Entrance Intersections
  const drawCrosswalk = (
    baseGx: number,
    baseGy: number,
    stepGx: number,
    stepGy: number,
    stripeW: number,
    stripeD: number,
    count: number
  ) => {
    for (let i = 0; i < count; i++) {
      const gx0 = baseGx + i * stepGx;
      const gy0 = baseGy + i * stepGy;
      const pts = [
        { gx: gx0, gy: gy0 },
        { gx: gx0 + stripeW, gy: gy0 },
        { gx: gx0 + stripeW, gy: gy0 + stripeD },
        { gx: gx0, gy: gy0 + stripeD },
      ];
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const sx = originX + (p.gx - p.gy) * halfW;
        const sy = originY + (p.gx + p.gy) * halfH;
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    }
  };

  // Front entrance pedestrian crosswalk & front-right corner crosswalk
  drawCrosswalk(1.9, 11.55, 0, 0.38, 1.15, 0.2, 5);
  drawCrosswalk(11.55, 8.8, 0.38, 0, 0.2, 1.15, 5);

  // 4. Real-World Marked Parking Lot & Valet Bay Plaza (gy = 11.4..12.88, gx = -1.75..9.35)
  const lotPadPts = [
    { gx: -1.75, gy: 11.38 },
    { gx: 9.35, gy: 11.38 },
    { gx: 9.35, gy: 12.88 },
    { gx: -1.75, gy: 12.88 },
  ];
  ctx.beginPath();
  lotPadPts.forEach((pt, idx) => {
    const sx = originX + (pt.gx - pt.gy) * halfW;
    const sy = originY + (pt.gx + pt.gy) * halfH;
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fillStyle = '#1b1c27';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  // Individual Marked Parking Bays (P1, TAXI DROP, P2, P3, P4) with Double White Lines, Concrete Wheel Stops & Stenciled Bay Numbers
  for (let sIdx = 0; sIdx < PARKING_LOT_STALLS.length; sIdx++) {
    const stall = PARKING_LOT_STALLS[sIdx];
    const leftGx = stall.gx - 0.98;
    const rightGx = stall.gx + 0.98;
    const topGy = 11.42;
    const botGy = 12.85;

    // Stall divider line (left boundary)
    const l1x = originX + (leftGx - topGy) * halfW;
    const l1y = originY + (leftGx + topGy) * halfH;
    const l2x = originX + (leftGx - botGy) * halfW;
    const l2y = originY + (leftGx + botGy) * halfH;
    ctx.strokeStyle = stall.isTaxiDrop
      ? 'rgba(250, 204, 21, 0.72)'
      : 'rgba(226, 232, 240, 0.58)';
    ctx.lineWidth = 2.0 * scale;
    ctx.beginPath();
    ctx.moveTo(l1x, l1y);
    ctx.lineTo(l2x, l2y);
    ctx.stroke();

    // Rightmost closing stall line
    if (sIdx === PARKING_LOT_STALLS.length - 1) {
      const r1x = originX + (rightGx - topGy) * halfW;
      const r1y = originY + (rightGx + topGy) * halfH;
      const r2x = originX + (rightGx - botGy) * halfW;
      const r2y = originY + (rightGx + botGy) * halfH;
      ctx.beginPath();
      ctx.moveTo(r1x, r1y);
      ctx.lineTo(r2x, r2y);
      ctx.stroke();
    }

    // Yellow Concrete Wheel-Stop Curb Bumper at top of each parking stall (gy = 11.58)
    const wbLeftX = originX + (stall.gx - 0.55 - 11.58) * halfW;
    const wbLeftY = originY + (stall.gx - 0.55 + 11.58) * halfH;
    const wbRightX = originX + (stall.gx + 0.55 - 11.58) * halfW;
    const wbRightY = originY + (stall.gx + 0.55 + 11.58) * halfH;
    ctx.strokeStyle = '#111116';
    ctx.lineWidth = 4.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wbLeftX, wbLeftY);
    ctx.lineTo(wbRightX, wbRightY);
    ctx.stroke();
    ctx.strokeStyle = stall.isTaxiDrop ? '#facc15' : '#cbd5e1';
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(wbLeftX, wbLeftY);
    ctx.lineTo(wbRightX, wbRightY);
    ctx.stroke();

    // Stenciled Bay Label on the Asphalt (P1, TAXI, P2, P3, P4)
    const labelX = originX + (stall.gx - 12.62) * halfW;
    const labelY = originY + (stall.gx + 12.62) * halfH;
    ctx.fillStyle = stall.isTaxiDrop
      ? 'rgba(250, 204, 21, 0.65)'
      : 'rgba(226, 232, 240, 0.45)';
    ctx.font = `800 ${Math.max(7, Math.round(7.5 * scale))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(stall.label, labelX, labelY);
  }

  // Glowing Blue/Gold "P VALET" Parking Lot Entrance Bollard Sign at (gx = -1.65, gy = 11.35)
  const pSignX = originX + (-1.65 - 11.35) * halfW;
  const pSignY = originY + (-1.65 + 11.35) * halfH;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(pSignX, pSignY);
  ctx.lineTo(pSignX, pSignY - 24 * scale);
  ctx.stroke();
  fillStrokeRoundedRect(
    ctx,
    pSignX - 9 * scale,
    pSignY - 36 * scale,
    18 * scale,
    13 * scale,
    3 * scale,
    '#0284c7',
    '#38bdf8',
    1.5 * scale
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(7, Math.round(7.5 * scale))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('P', pSignX, pSignY - 27 * scale);

  // 5. Red Carpet Runner leading to the Front VIP Entry
  const drawRedCarpet = (gx0: number, gy0: number, gx1: number, gy1: number) => {
    const carpetPts = [
      { gx: gx0, gy: gy0 },
      { gx: gx1, gy: gy0 },
      { gx: gx1, gy: gy1 },
      { gx: gx0, gy: gy1 },
    ];
    ctx.beginPath();
    carpetPts.forEach((pt, idx) => {
      const sx = originX + (pt.gx - pt.gy) * halfW;
      const sy = originY + (pt.gx + pt.gy) * halfH;
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = '#be123c';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8 * scale;
    ctx.stroke();
  };

  drawRedCarpet(-1.85, 10.0, 3.15, 11.25);

  // 5B. Dashed Yellow/White Road Lane Divider Lines for Front Moving Traffic Lanes (gy = 14.1)
  ctx.save();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.52)';
  ctx.lineWidth = 2.0 * scale;
  for (let gx = -4.5; gx <= 13.5; gx += 1.4) {
    const p1x = originX + (gx - 14.1) * halfW;
    const p1y = originY + (gx + 14.1) * halfH;
    const p2x = originX + (gx + 0.75 - 14.1) * halfW;
    const p2y = originY + (gx + 0.75 + 14.1) * halfH;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Exterior Street Props (Matching IMG_1506_5bdf15ca.jpeg):
  // 6A. Purple/Magenta Circular Manhole Cover on Bottom-Right Asphalt (gx=11.7, gy=7.8)
  const mhX = originX + (11.7 - 7.8) * halfW;
  const mhY = originY + (11.7 + 7.8) * halfH;
  ctx.fillStyle = '#581c87';
  ctx.beginPath();
  ctx.ellipse(mhX, mhY, 13 * scale, 6.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  ctx.ellipse(mhX, mhY, 9.5 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 6B. Orange Traffic Cones on Front-Right Street Corners
  const cones = [
    { gx: -1.35, gy: 10.75 },
    { gx: 10.9, gy: 10.7 },
    { gx: 11.35, gy: 2.8 },
  ];
  for (const c of cones) {
    const cx = originX + (c.gx - c.gy) * halfW;
    const cy = originY + (c.gx + c.gy) * halfH;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 3.8 * scale, cy);
    ctx.lineTo(cx, cy - 11.5 * scale);
    ctx.lineTo(cx + 3.8 * scale, cy);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2 * scale, cy - 6.5 * scale, 4 * scale, 2.2 * scale);
  }

  // 6E. Red Fire Hydrant & Street Tree on Front-Right Sidewalk
  const hydX = originX + (11.15 - 8.1) * halfW;
  const hydY = originY + (11.15 + 8.1) * halfH;
  fillStrokeRoundedRect(
    ctx,
    hydX - 3 * scale,
    hydY - 10 * scale,
    6 * scale,
    10 * scale,
    2.5 * scale,
    '#ef4444',
    INK,
    1.5 * scale
  );

  // 7. Draped Warm-White String Lights on Poles along the Front-Right Sidewalk
  const drawPoleStringLights = (poles: Array<{ gx: number; gy: number }>) => {
    const poleTops: Array<{ x: number; y: number }> = [];
    for (const p of poles) {
      const px = originX + (p.gx - p.gy) * halfW;
      const py = originY + (p.gx + p.gy) * halfH;
      const topY = py - 46 * scale;
      poleTops.push({ x: px, y: topY });

      const pool = ctx.createRadialGradient(px, py, 2 * scale, px, py, 24 * scale);
      pool.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
      pool.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(px, py, 24 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2.6 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, topY);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(px, topY, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < poleTops.length - 1; i++) {
      drawWallStringLights(
        ctx,
        poleTops[i].x,
        poleTops[i].y,
        poleTops[i + 1].x,
        poleTops[i + 1].y,
        scale,
        t
      );
    }
  };

  drawPoleStringLights([
    { gx: 11.15, gy: 1.8 },
    { gx: 11.15, gy: 5.8 },
    { gx: 11.15, gy: 9.8 },
  ]);
}

/**
 * Draws the foreground velvet rope queue barriers, front parked cars (including the Boxy Yellow Taxi Cab),
 * and realistic moving road traffic vehicles passing along the surrounding streets.
 */
function drawForegroundQueueCarsAndLamps(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  parkingState: ParkingUpgradeState,
  zOffset: number = 0,
  zIndex: number = 100,
  activeFloor: number = 1,
  trafficCars: TrafficCarAgent[] = []
) {
  const effectiveOriginY = originY - zOffset;
  const isUnderBuilding = zIndex < 0 || activeFloor >= 2;
  const ropeColor =
    parkingState.ropeTier === 3
      ? '#facc15'
      : parkingState.ropeTier === 2
      ? '#e11d48'
      : '#dc2626';

  // 1. Gold Stanchions & Red Velvet Ropes at Back-Left Doorway & Front Queue Line
  const backLeftDoorStanchions = [
    { gx: -1.25, gy: 6.15 },
    { gx: -0.65, gy: 6.15 },
    { gx: -0.08, gy: 6.15 },
  ];
  const leftQueueStanchions = [
    { gx: -1.55, gy: 10.82 },
    { gx: -0.4, gy: 10.82 },
    { gx: 0.75, gy: 10.82 },
    { gx: 1.85, gy: 10.82 },
  ];
  const rightVipStanchions = [
    { gx: 3.15, gy: 10.82 },
    { gx: 4.45, gy: 10.82 },
    { gx: 5.75, gy: 10.82 },
  ];

  const drawStanchionChain = (chain: { gx: number; gy: number }[]) => {
    for (let i = 0; i < chain.length; i++) {
      const st = chain[i];
      const px = originX + (st.gx - st.gy) * (tileW / 2);
      const py = effectiveOriginY + (st.gx + st.gy) * (tileH / 2);

      const usedCustomStanchion = assetManager.drawBottomCenterAnchoredSprite(
        ctx,
        'stanchion',
        px,
        py + 3 * scale,
        18 * scale,
        24 * scale
      );

      if (!usedCustomStanchion) {
        // Gold Circular Stanchion Base
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(px, py, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8 * scale;
        ctx.stroke();

        // Gold Vertical Pole
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.6 * scale;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - 19 * scale);
        ctx.stroke();

        // Gold Top Finial Ball
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(px, py - 20 * scale, 2.6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }

      if (i < chain.length - 1) {
        const next = chain[i + 1];
        const nx = originX + (next.gx - next.gy) * (tileW / 2);
        const ny = effectiveOriginY + (next.gx + next.gy) * (tileH / 2);
        // Dark rope outline
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(px, py - 14.5 * scale);
        ctx.quadraticCurveTo((px + nx) / 2, (py + ny) / 2 - 4.5 * scale, nx, ny - 14.5 * scale);
        ctx.stroke();
        // Velvet rope inner fill
        ctx.strokeStyle = ropeColor;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(px, py - 14.5 * scale);
        ctx.quadraticCurveTo((px + nx) / 2, (py + ny) / 2 - 4.5 * scale, nx, ny - 14.5 * scale);
        ctx.stroke();
      }
    }
  };

  drawStanchionChain(backLeftDoorStanchions);
  drawStanchionChain(leftQueueStanchions);
  drawStanchionChain(rightVipStanchions);

  // 2. Dynamic Park-and-Go Vehicles (Parked in Stalls P1-P4/Taxi, Pulling In/Out, and Non-Overlapping Avenue Traffic)
  const underBuildingGyShift = isUnderBuilding ? -0.95 : 0;
  const sortedTraffic = [...trafficCars].sort((a, b) => a.gridX + a.gridY - (b.gridX + b.gridY));
  for (const tc of sortedTraffic) {
    drawMovingTrafficCar(
      ctx,
      tc.gridX,
      tc.gridY + underBuildingGyShift,
      originX,
      originY,
      tileW,
      tileH,
      scale,
      tc,
      zOffset,
      zIndex
    );
  }
}

function drawMovingTrafficCar(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  car: TrafficCarAgent,
  zOffset: number,
  zIndex: number
) {
  const cx = originX + (gx - gy) * (tileW / 2);
  const cy = originY + (gx + gy) * (tileH / 2) - zOffset;
  const isParked = car.carState === 'PARKED' || car.carState === 'WAITING_PICKUP';
  const carScale = (zIndex < 0 ? scale * 0.92 : scale) * (isParked ? 0.98 : 0.96);
  const isFacingWest = car.lane === 'FRONT_WEST';
  const beamDir = isFacingWest ? -1 : 1;

  // Draw headlight beam cones on the asphalt road when the car is moving or flashing its lock/unlock lights
  if (!isParked || (car.headlightFlashTimer ?? 0) > 0) {
    ctx.save();
    const headX = cx + beamDir * 28 * carScale;
    const headY = cy - 3 * carScale;
    const flashBoost = (car.headlightFlashTimer ?? 0) > 0 ? 0.65 : 0.42;
    const beamGrad = ctx.createRadialGradient(
      headX,
      headY,
      2 * carScale,
      headX + beamDir * 24 * carScale,
      headY + 8 * carScale,
      36 * carScale
    );
    beamGrad.addColorStop(0, `rgba(254, 240, 138, ${flashBoost})`);
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.ellipse(
      headX + beamDir * 16 * carScale,
      headY + 6 * carScale,
      28 * carScale,
      12 * carScale,
      !isFacingWest ? 0.25 : -0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Red taillight glow (brighter when braking/stopped in traffic or backing out)
    const isBraking =
      (car.currentSpeed !== undefined && car.currentSpeed < 0.8) ||
      car.carState === 'PULLING_OUT' ||
      car.carState === 'PARKING_IN';
    const tailX = cx - beamDir * 28 * carScale;
    const tailY = cy - 3 * carScale;
    ctx.fillStyle = isBraking ? 'rgba(244, 63, 94, 0.62)' : 'rgba(244, 63, 94, 0.35)';
    ctx.beginPath();
    ctx.ellipse(
      tailX - beamDir * 7 * carScale,
      tailY + 2 * carScale,
      11 * carScale,
      4.5 * carScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  drawCar(
    ctx,
    gx,
    gy,
    originX,
    originY,
    tileW,
    tileH,
    scale * (isParked ? 0.98 : 0.96),
    car.bodyColor,
    car.shadeColor,
    car.isTaxi,
    zOffset,
    zIndex,
    isFacingWest
  );
}

/**
 * Draws a tropical palm tree or lush club plant in a crisp white cylindrical pot with thick #111116 outlines
 * (matching the potted palm trees at the corners of Nightclub City: Neon in IMG_1506_5bdf15ca.jpeg).
 */
function drawIsometricPottedPlant(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  isPalmTree: boolean = false
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(px, py + 1 * scale, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp White Cylindrical Planter Pot with cel-shaded grey side and #111116 outline
  fillStrokeRoundedRect(
    ctx,
    px - 7.5 * scale,
    py - 14 * scale,
    15 * scale,
    14 * scale,
    3.5 * scale,
    '#f1f5f9',
    INK,
    2 * scale
  );
  // Dark soil rim at top of white pot
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(px, py - 13.5 * scale, 7 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  if (isPalmTree) {
    // Tall slender segmented palm trunk curving upward
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py - 14 * scale);
    ctx.quadraticCurveTo(px - 3 * scale, py - 38 * scale, px + 1 * scale, py - 60 * scale);
    ctx.stroke();

    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3.6 * scale;
    ctx.beginPath();
    ctx.moveTo(px, py - 14 * scale);
    ctx.quadraticCurveTo(px - 3 * scale, py - 38 * scale, px + 1 * scale, py - 60 * scale);
    ctx.stroke();

    // Spreading Tropical Palm Fronds at top (crown)
    const crownX = px + 1 * scale;
    const crownY = py - 60 * scale;
    const fronds = [
      { dx: -22, dy: -6, cx: -12, cy: -14, c: '#22c55e' },
      { dx: -18, dy: 8, cx: -10, cy: -2, c: '#16a34a' },
      { dx: 22, dy: -6, cx: 12, cy: -14, c: '#4ade80' },
      { dx: 19, dy: 8, cx: 11, cy: -2, c: '#16a34a' },
      { dx: 0, dy: -16, cx: -3, cy: -10, c: '#4ade80' },
    ];
    for (const fr of fronds) {
      ctx.beginPath();
      ctx.moveTo(crownX, crownY);
      ctx.quadraticCurveTo(
        crownX + fr.cx * scale,
        crownY + fr.cy * scale,
        crownX + fr.dx * scale,
        crownY + fr.dy * scale
      );
      ctx.quadraticCurveTo(
        crownX + fr.cx * 0.7 * scale,
        crownY + (fr.cy + 5) * scale,
        crownX,
        crownY
      );
      ctx.closePath();
      ctx.fillStyle = fr.c;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();
    }
  } else {
    // Lush Multi-Stalk Tropical Club Shrub in White Pot (matching right corner plant in IMG_1506_5bdf15ca.jpeg)
    const stalks = [
      { dx: -6, dy: -22, r: 6.2, c: '#16a34a' },
      { dx: 6, dy: -22, r: 6.2, c: '#15803d' },
      { dx: -9, dy: -28, r: 5.5, c: '#22c55e' },
      { dx: 9, dy: -28, r: 5.5, c: '#22c55e' },
      { dx: 0, dy: -31, r: 7.2, c: '#4ade80' },
    ];
    for (const lf of stalks) {
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py - 14 * scale);
      ctx.lineTo(px + lf.dx * scale, py + lf.dy * scale);
      ctx.stroke();

      ctx.fillStyle = lf.c;
      ctx.beginPath();
      ctx.arc(px + lf.dx * scale, py + lf.dy * scale, lf.r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.7 * scale;
      ctx.stroke();
    }
  }
}

/**
 * Draws a boxy retro-cartoon vector sedan or yellow taxi cab with thick #111116 dark outlines,
 * cel-shaded glass highlights, alloy rims, and glowing headlights.
 */
function drawCar(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  bodyColor: string,
  shadeColor: string,
  isTaxi: boolean = false,
  zOffset: number = 0,
  zIndex: number = 100,
  facingWest: boolean = false
) {
  const cx = originX + (gx - gy) * (tileW / 2);
  const cy = originY + (gx + gy) * (tileH / 2) - zOffset;
  const isUnderBuilding = zIndex < 0;
  const carScale = isUnderBuilding ? scale * 0.92 : scale;

  // Check AssetManager for custom uploaded car_taxi or car_sedan PNG sprite
  if (
    assetManager.drawBottomCenterAnchoredSprite(
      ctx,
      isTaxi ? 'car_taxi' : 'car_sedan',
      cx,
      cy + 10 * carScale,
      62 * carScale,
      42 * carScale
    )
  ) {
    return;
  }

  ctx.save();
  // Ground shadow (expanded when underneath the building overhang)
  ctx.fillStyle = isUnderBuilding ? 'rgba(6, 3, 18, 0.62)' : 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3 * carScale, 33 * carScale, 15.5 * carScale, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Lower Car Body (Boxy retro-cartoon chassis with thick #111116 border)
  fillStrokeRoundedRect(
    ctx,
    cx - 28 * carScale,
    cy - 14 * carScale,
    56 * carScale,
    22 * carScale,
    6 * carScale,
    bodyColor,
    INK,
    2.5 * carScale
  );

  // Specular top fender highlight strip
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2 * carScale;
  ctx.beginPath();
  ctx.moveTo(cx - 23 * carScale, cy - 11.5 * carScale);
  ctx.lineTo(cx + 22 * carScale, cy - 11.5 * carScale);
  ctx.stroke();

  // Taxi Checkered Side Stripe
  if (isTaxi) {
    for (let sq = 0; sq < 7; sq++) {
      ctx.fillStyle = sq % 2 === 0 ? INK : '#ffffff';
      ctx.fillRect(
        cx - 21 * carScale + sq * 6 * carScale,
        cy - 4 * carScale,
        6 * carScale,
        3.8 * carScale
      );
    }
  }

  // Upper Boxy Cabin / Windows
  fillStrokeRoundedRect(
    ctx,
    cx - 18 * carScale,
    cy - 26 * carScale,
    36 * carScale,
    14 * carScale,
    4.5 * carScale,
    shadeColor,
    INK,
    2.3 * carScale
  );

  // Cel-shaded Windshield & Side Glass with hard white specular highlight
  fillStrokeRoundedRect(
    ctx,
    cx - 14 * carScale,
    cy - 23.5 * carScale,
    13 * carScale,
    10 * carScale,
    2.5 * carScale,
    '#38bdf8',
    INK,
    1.6 * carScale
  );
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.7 * carScale;
  ctx.beginPath();
  ctx.moveTo(cx - 11 * carScale, cy - 21.5 * carScale);
  ctx.lineTo(cx - 6 * carScale, cy - 16 * carScale);
  ctx.stroke();

  fillStrokeRoundedRect(
    ctx,
    cx + 2 * carScale,
    cy - 23.5 * carScale,
    12 * carScale,
    10 * carScale,
    2.5 * carScale,
    '#0284c7',
    INK,
    1.6 * carScale
  );

  // Glowing Roof "TAXI" Sign on Boxy Yellow Taxi Cab
  if (isTaxi) {
    fillStrokeRoundedRect(
      ctx,
      cx - 8 * carScale,
      cy - 32 * carScale,
      16 * carScale,
      6.5 * carScale,
      2 * carScale,
      '#fef08a',
      INK,
      1.6 * carScale
    );
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.max(6, Math.round(6 * carScale))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', cx, cy - 27 * carScale);
  }

  // Wheels with thick dark outlines
  const wheels = [
    { wx: cx - 15 * carScale, wy: cy + 7 * carScale },
    { wx: cx + 14 * carScale, wy: cy + 5 * carScale },
  ];
  for (const w of wheels) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(w.wx, w.wy, 6.8 * carScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * carScale;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(w.wx, w.wy, 3 * carScale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing Yellow Headlights & Red Taillights oriented to vehicle travel direction
  const headlightX = facingWest ? cx - 25 * carScale : cx + 25 * carScale;
  const taillightX = facingWest ? cx + 25 * carScale : cx - 25 * carScale;
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(headlightX, cy - 3 * carScale, 3 * carScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(taillightX, cy - 4 * carScale, 2.5 * carScale, 0, Math.PI * 2);
  ctx.fill();

  if (isUnderBuilding) {
    fillStrokeRoundedRect(
      ctx,
      cx - 28 * carScale,
      cy - 26 * carScale,
      56 * carScale,
      34 * carScale,
      6 * carScale,
      'rgba(9, 5, 24, 0.24)',
      'rgba(0, 0, 0, 0)',
      0
    );
  }

  ctx.restore();
}

const drawIllustratedSedan = drawCar;

/**
 * Draws the 3D lower-story exterior building understructure when viewing Floor 2+,
 * so the Floor 2 slab sits visually on top of the 1st-floor nightclub building
 * while the parking lot, street, queue, and parked cars sit down at ground level below the building.
 */
function drawLowerBuildingUnderstructure(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  floorDropH: number,
  t: number,
  activeFloor: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  const sw = {
    x: originX - GRID_SIZE * halfW,
    y: originY + GRID_SIZE * halfH,
  };
  const s = {
    x: originX,
    y: originY + GRID_SIZE * tileH,
  };
  const se = {
    x: originX + GRID_SIZE * halfW,
    y: originY + GRID_SIZE * halfH,
  };

  ctx.save();

  // 0. Ground-Level Building Overhang Drop Shadow cast onto the street & parked cars below (zIndex < 0 layer)
  const shadowReach = 34 * scale;
  const shadowGrad = ctx.createLinearGradient(
    s.x,
    s.y + floorDropH - 6 * scale,
    s.x,
    s.y + floorDropH + shadowReach
  );
  shadowGrad.addColorStop(0, 'rgba(7, 3, 19, 0.72)');
  shadowGrad.addColorStop(1, 'rgba(7, 3, 19, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.moveTo(sw.x - 18 * scale, sw.y + floorDropH);
  ctx.lineTo(s.x, s.y + floorDropH);
  ctx.lineTo(se.x + 12 * scale, se.y + floorDropH);
  ctx.lineTo(se.x + 12 * scale, se.y + floorDropH + shadowReach);
  ctx.lineTo(s.x, s.y + floorDropH + shadowReach * 1.15);
  ctx.lineTo(sw.x - 18 * scale, sw.y + floorDropH + shadowReach);
  ctx.closePath();
  ctx.fill();

  // 1. LEFT FRONT EXTERIOR BUILDING FACADE
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y);
  ctx.lineTo(s.x, s.y);
  ctx.lineTo(s.x, s.y + floorDropH);
  ctx.lineTo(sw.x, sw.y + floorDropH);
  ctx.closePath();
  ctx.fillStyle = '#251942';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 2. RIGHT FRONT EXTERIOR BUILDING FACADE
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y + floorDropH);
  ctx.lineTo(s.x, s.y + floorDropH);
  ctx.closePath();
  ctx.fillStyle = '#1b1133';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 3. Structural Vertical Pilasters
  for (let i = 1; i <= 4; i++) {
    const frac = i / 5;
    const lx = sw.x + (s.x - sw.x) * frac;
    const ly = sw.y + (s.y - sw.y) * frac;
    ctx.strokeStyle = '#332457';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 4 * scale);
    ctx.lineTo(lx, ly + floorDropH - 2 * scale);
    ctx.stroke();

    const rx = s.x + (se.x - s.x) * frac;
    const ry = s.y + (se.y - s.y) * frac;
    ctx.strokeStyle = '#281b47';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 4 * scale);
    ctx.lineTo(rx, ry + floorDropH - 2 * scale);
    ctx.stroke();
  }

  // 4. Glowing 1st-Floor Frosted Club Windows on the Lower Building Facades
  const windowColors = ['#22d3ee', '#f43f5e', '#a855f7', '#38bdf8'];
  for (let w = 0; w < 3; w++) {
    const fracL = 0.46 + w * 0.19;
    const wxL = sw.x + (s.x - sw.x) * fracL;
    const wyL = sw.y + (s.y - sw.y) * fracL + floorDropH * 0.32;
    const winW = 20 * scale;
    const winH = 26 * scale;
    const glowColor = windowColors[(w + Math.floor(t * 2)) % windowColors.length];

    ctx.beginPath();
    ctx.moveTo(wxL - winW * 0.5, wyL - winW * 0.25);
    ctx.lineTo(wxL + winW * 0.5, wyL + winW * 0.25);
    ctx.lineTo(wxL + winW * 0.5, wyL + winW * 0.25 + winH);
    ctx.lineTo(wxL - winW * 0.5, wyL - winW * 0.25 + winH);
    ctx.closePath();
    ctx.fillStyle = '#0f0722';
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.8 * scale;
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.28 + 0.15 * Math.sin(t * 4 + w);
    ctx.fill();
    ctx.globalAlpha = 1;

    const fracR = 0.2 + w * 0.26;
    const wxR = s.x + (se.x - s.x) * fracR;
    const wyR = s.y + (se.y - s.y) * fracR + floorDropH * 0.32;
    const glowR = windowColors[(w + 1 + Math.floor(t * 2)) % windowColors.length];

    ctx.beginPath();
    ctx.moveTo(wxR - winW * 0.5, wyR + winW * 0.25);
    ctx.lineTo(wxR + winW * 0.5, wyR - winW * 0.25);
    ctx.lineTo(wxR + winW * 0.5, wyR - winW * 0.25 + winH);
    ctx.lineTo(wxR - winW * 0.5, wyR + winW * 0.25 + winH);
    ctx.closePath();
    ctx.fillStyle = '#0f0722';
    ctx.fill();
    ctx.strokeStyle = glowR;
    ctx.lineWidth = 1.8 * scale;
    ctx.stroke();

    ctx.fillStyle = glowR;
    ctx.globalAlpha = 0.26 + 0.14 * Math.cos(t * 4 + w);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 5. Structural Floor-2 Concrete Cantilever Ledge & Glowing Cyan/Magenta Floor Divider Cornice
  const ledgeH = 9 * scale;
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y);
  ctx.lineTo(s.x, s.y);
  ctx.lineTo(s.x, s.y + ledgeH);
  ctx.lineTo(sw.x, sw.y + ledgeH);
  ctx.closePath();
  ctx.fillStyle = '#4c3b78';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y + ledgeH);
  ctx.lineTo(s.x, s.y + ledgeH);
  ctx.closePath();
  ctx.fillStyle = '#3b2c63';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.6 * scale;
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y + ledgeH + 1.5 * scale);
  ctx.lineTo(s.x, s.y + ledgeH + 1.5 * scale);
  ctx.lineTo(se.x, se.y + ledgeH + 1.5 * scale);
  ctx.stroke();

  fillStrokeRoundedRect(
    ctx,
    s.x - 54 * scale,
    s.y + 14 * scale,
    108 * scale,
    17 * scale,
    5 * scale,
    '#0f0724',
    '#f43f5e',
    1.8 * scale
  );
  ctx.fillStyle = '#67e8f9';
  ctx.font = `900 ${Math.max(8, Math.round(8.5 * scale))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`▲ FLOOR ${activeFloor} · STREET BELOW ▼`, s.x, s.y + 25.5 * scale);

  ctx.restore();
}

/**
 * Draws the Open-Air Nightclub City: Neon platform & low neon-trimmed walls (Matching IMG_1506_5bdf15ca.jpeg):
 * - Open-air dark marble/slate tile floor slab sitting directly on the dark city street corner
 * - Glowing magenta/pink neon tube border framing the entire isometric diamond platform
 * - Low-to-medium back-left and back-right purple walls (64px) with vertical glowing cyan/magenta neon light strips
 * - Glowingpurple/cyan Entrance Doorway on the back-left wall
 * - Neon wall signs ("GOOD TIMES", "CLUB NEON" on back-left wall; "LOVE THE BASS", "COCKTAILS" on back-right wall)
 * - Pink/magenta metal lighting truss towers with cyan spotlight cones, tropical potted palm trees, and gold dance cages
 */
function drawIllustratedClubShell(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  activeFloor: FloorLevel,
  unlockedFloors: FloorLevel,
  _playerLevel: number,
  stairsHitboxRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }>,
  sequencer: RhythmicLightingSequencerState,
  moodProfile?: ClubMoodLightingProfile
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const moodPrimary = moodProfile?.primaryHex || '#f472b6';
  const moodSecondary = moodProfile?.secondaryHex || '#22d3ee';
  const moodTertiary = moodProfile?.tertiaryHex || '#fde047';
  // Full-height two-tier nightclub walls (114px tall with lower + upper architectural wall sections & roof parapet cap)
  const lowerWallH = 64 * scale;
  const wallH = 114 * scale;
  const parapetCapH = 6 * scale;
  const slabThickness = 7 * scale;

  const nw = { x: originX, y: originY };
  const sw = {
    x: originX - GRID_SIZE * halfW,
    y: originY + GRID_SIZE * halfH,
  };
  const s = {
    x: originX,
    y: originY + GRID_SIZE * tileH,
  };
  const se = {
    x: originX + GRID_SIZE * halfW,
    y: originY + GRID_SIZE * halfH,
  };

  // 1. Open-Air Isometric Concrete/Marble Floor Slab sitting on the street corner
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y);
  ctx.lineTo(s.x, s.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y + slabThickness);
  ctx.lineTo(s.x, s.y + slabThickness);
  ctx.lineTo(sw.x, sw.y + slabThickness);
  ctx.closePath();
  ctx.fillStyle = '#18112b';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Interior 10x10 Dark Polished Marble Club Floor Tiles with Subtle White/Lavender Stone Veining
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const isAlt = (gx + gy) % 2 === 0;
      const fill =
        activeFloor === 2
          ? isAlt
            ? '#1d1636'
            : '#17112b'
          : isAlt
          ? '#1c182b'
          : '#161324';
      drawIsoTilePolygon(
        ctx,
        gx,
        gy,
        0,
        originX,
        originY,
        tileW,
        tileH,
        fill,
        'rgba(17, 17, 22, 0.55)',
        1
      );

      if ((gx * 3 + gy * 5) % 4 === 0) {
        const cx = originX + (gx + 0.5 - (gy + 0.5)) * halfW;
        const cy = originY + (gx + 0.5 + (gy + 0.5)) * halfH;
        ctx.strokeStyle = 'rgba(216, 180, 254, 0.14)';
        ctx.lineWidth = 1.1 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 10 * scale, cy - 2 * scale);
        ctx.lineTo(cx - 2 * scale, cy + 1.5 * scale);
        ctx.lineTo(cx + 9 * scale, cy - 3 * scale);
        ctx.stroke();
      }
    }
  }

  // Glowing Genre-Mood Neon Perimeter Border Tube around the open-air slab front edges (BPM-pulsed)
  ctx.save();
  ctx.strokeStyle = moodPrimary;
  ctx.lineWidth = (2.6 + sequencer.kickEnvelope * 1.25) * scale;
  ctx.globalAlpha = Math.min(1, 0.72 + sequencer.kickEnvelope * 0.28);
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y);
  ctx.lineTo(s.x, s.y);
  ctx.lineTo(se.x, se.y);
  ctx.stroke();
  ctx.restore();

  // 2. FULL-HEIGHT BACK-LEFT WALL (gy = 0..10 along gx = 0, Lower + Upper Wall Tiers up to wallH = 114 * scale)
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.lineTo(sw.x, sw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  const leftWallGrad = ctx.createLinearGradient(nw.x, nw.y - wallH, sw.x, sw.y);
  leftWallGrad.addColorStop(0, '#321a5c');
  leftWallGrad.addColorStop(0.45, '#261447');
  leftWallGrad.addColorStop(1, '#150c2b');
  ctx.fillStyle = leftWallGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 3. FULL-HEIGHT BACK-RIGHT WALL (gx = 0..10 along gy = 0, Lower + Upper Wall Tiers up to wallH = 114 * scale)
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  const rightWallGrad = ctx.createLinearGradient(nw.x, nw.y - wallH, se.x, se.y);
  rightWallGrad.addColorStop(0, '#2a164f');
  rightWallGrad.addColorStop(0.45, '#1f103d');
  rightWallGrad.addColorStop(1, '#120924');
  ctx.fillStyle = rightWallGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 3B. 3D ARCHITECTURAL UPPER ROOF PARAPET CAP & UPPER ACOUSTIC MEZZANINE BAYS (Restoring the upper left & right walls!)
  // Left wall upper parapet coping ledge
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH - parapetCapH);
  ctx.lineTo(sw.x, sw.y - wallH - parapetCapH);
  ctx.closePath();
  ctx.fillStyle = '#3b216b';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Right wall upper parapet coping ledge
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y - wallH);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.lineTo(se.x, se.y - wallH - parapetCapH);
  ctx.lineTo(nw.x, nw.y - wallH - parapetCapH);
  ctx.closePath();
  ctx.fillStyle = '#311a5c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Recessed Upper-Wall Acoustic Velvet Bays & BPM-Synced Equalizer Panels (between lowerWallH and wallH)
  const bayRanges = [
    [0.06, 0.26],
    [0.30, 0.50],
    [0.54, 0.74],
    [0.78, 0.94],
  ];
  for (let bIdx = 0; bIdx < bayRanges.length; bIdx++) {
    const [u0, u1] = bayRanges[bIdx];
    // Upper-Left Wall Recessed Bay
    const lx0 = nw.x + (sw.x - nw.x) * u0;
    const ly0 = nw.y + (sw.y - nw.y) * u0;
    const lx1 = nw.x + (sw.x - nw.x) * u1;
    const ly1 = nw.y + (sw.y - nw.y) * u1;
    const bayBreathL = 0.72 + 0.28 * Math.sin(t * 2.1 + bIdx * 1.4);
    ctx.beginPath();
    ctx.moveTo(lx0, ly0 - lowerWallH - 6 * scale);
    ctx.lineTo(lx1, ly1 - lowerWallH - 6 * scale);
    ctx.lineTo(lx1, ly1 - wallH + 7 * scale);
    ctx.lineTo(lx0, ly0 - wallH + 7 * scale);
    ctx.closePath();
    ctx.fillStyle = '#180c34';
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = moodSecondary;
    ctx.globalAlpha = bayBreathL;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();
    ctx.restore();

    // Upper-Right Wall Recessed Bay
    const bayBreathR = 0.72 + 0.28 * Math.cos(t * 2.1 + bIdx * 1.4);
    const rx0 = nw.x + (se.x - nw.x) * u0;
    const ry0 = nw.y + (se.y - nw.y) * u0;
    const rx1 = nw.x + (se.x - nw.x) * u1;
    const ry1 = nw.y + (se.y - nw.y) * u1;
    ctx.beginPath();
    ctx.moveTo(rx0, ry0 - lowerWallH - 6 * scale);
    ctx.lineTo(rx1, ry1 - lowerWallH - 6 * scale);
    ctx.lineTo(rx1, ry1 - wallH + 7 * scale);
    ctx.lineTo(rx0, ry0 - wallH + 7 * scale);
    ctx.closePath();
    ctx.fillStyle = '#150a2e';
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = moodPrimary;
    ctx.globalAlpha = bayBreathR;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();
    ctx.restore();
  }

  // Bright, Luminous Architectural LED Trim & Vertical Light Cove Strips along both Full-Height Back Walls
  ctx.save();
  const trimBreath = Math.min(1, 0.9 + 0.1 * Math.sin(t * 2.4) + sequencer.kickEnvelope * 0.12);

  // Vivid multi-layer outer bloom + bright color tube + hot white core helper for lit LED strips
  const drawNaturalLedPath = (
    drawPath: () => void,
    colorHex: string,
    coreWidth: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Wide outer ambient bloom
    ctx.strokeStyle = colorHex;
    ctx.globalAlpha = Math.min(1, alpha * 0.45);
    ctx.lineWidth = coreWidth * 3.8;
    drawPath();
    ctx.stroke();
    // Vivid saturated LED tube body
    ctx.globalAlpha = Math.min(1, alpha * 0.96);
    ctx.lineWidth = coreWidth * 1.75;
    drawPath();
    ctx.stroke();
    // Bright hot white inner filament core
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, alpha * 0.88);
    ctx.lineWidth = coreWidth * 0.72;
    drawPath();
    ctx.stroke();
    ctx.restore();
  };

  // Top Roofline LED Cove
  drawNaturalLedPath(
    () => {
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y - wallH);
      ctx.lineTo(nw.x, nw.y - wallH);
      ctx.lineTo(se.x, se.y - wallH);
    },
    moodPrimary,
    2.5 * scale,
    trimBreath
  );

  // Mid-Wall Mezzanine LED Cove at 64 * scale
  drawNaturalLedPath(
    () => {
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y - lowerWallH);
      ctx.lineTo(nw.x, nw.y - lowerWallH);
      ctx.lineTo(se.x, se.y - lowerWallH);
    },
    moodSecondary,
    2.1 * scale,
    trimBreath
  );

  // Base Floor Plinth LED Strip
  drawNaturalLedPath(
    () => {
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y - 1.5 * scale);
      ctx.lineTo(nw.x, nw.y - 1.5 * scale);
      ctx.lineTo(se.x, se.y - 1.5 * scale);
    },
    moodSecondary,
    1.9 * scale,
    0.92
  );

  // Full-Height Vertical Architectural LED Light Pillars along both Back Walls (Bright organic wave)
  const leftStrips = [0.18, 0.34, 0.56, 0.84];
  for (let i = 0; i < leftStrips.length; i++) {
    const u = leftStrips[i];
    const sx = nw.x + (sw.x - nw.x) * u;
    const sy = nw.y + (sw.y - nw.y) * u;
    const pillarAlpha = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.9));
    const pillarColor = i % 2 === 0 ? moodSecondary : moodPrimary;
    drawNaturalLedPath(
      () => {
        ctx.beginPath();
        ctx.moveTo(sx, sy - 6 * scale);
        ctx.lineTo(sx, sy - wallH + 6 * scale);
      },
      pillarColor,
      2.2 * scale,
      pillarAlpha
    );
  }

  const rightStrips = [0.16, 0.36, 0.62, 0.84];
  for (let i = 0; i < rightStrips.length; i++) {
    const u = rightStrips[i];
    const sx = nw.x + (se.x - nw.x) * u;
    const sy = nw.y + (se.y - nw.y) * u;
    const pillarAlpha = 0.76 + 0.24 * (0.5 + 0.5 * Math.cos(t * 2.2 - i * 0.9));
    const pillarColor = i % 2 === 0 ? moodPrimary : moodSecondary;
    drawNaturalLedPath(
      () => {
        ctx.beginPath();
        ctx.moveTo(sx, sy - 6 * scale);
        ctx.lineTo(sx, sy - wallH + 6 * scale);
      },
      pillarColor,
      2.2 * scale,
      pillarAlpha
    );
  }
  ctx.restore();

  // 4. GLOWING PURPLE/CYAN VIP ALCOVE DOORWAY ON THE BACK-LEFT WALL (gy = 6.2..7.3 along gx = 0)
  const doorTopA = {
    x: originX + (0 - 6.15) * halfW,
    y: originY + (0 + 6.15) * halfH,
  };
  const doorTopB = {
    x: originX + (0 - 7.35) * halfW,
    y: originY + (0 + 7.35) * halfH,
  };
  const doorH = 44 * scale;
  ctx.beginPath();
  ctx.moveTo(doorTopA.x, doorTopA.y);
  ctx.lineTo(doorTopB.x, doorTopB.y);
  ctx.lineTo(doorTopB.x, doorTopB.y - doorH);
  ctx.lineTo(doorTopA.x, doorTopA.y - doorH);
  ctx.closePath();
  const doorGrad = ctx.createLinearGradient(doorTopA.x, doorTopA.y - doorH, doorTopB.x, doorTopB.y);
  doorGrad.addColorStop(0, moodSecondary);
  doorGrad.addColorStop(0.5, moodPrimary);
  doorGrad.addColorStop(1, '#090514');
  ctx.fillStyle = doorGrad;
  ctx.fill();
  ctx.strokeStyle = moodSecondary;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 5. GLOWING ISOMETRIC WALL NEON SIGNS (Lower & Upper Wall Tiers on Back-Left & Back-Right Walls)
  const drawIsoWallSign = (
    wx: number,
    wy: number,
    angleRad: number,
    text: string,
    glowColor: string,
    textColor: string,
    fontSize: number,
    channel: number
  ) => {
    const signSeq = sequencer.getDecorEmissiveState(channel, channel, channel);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(angleRad);
    ctx.font = `900 ${Math.max(8, Math.round(fontSize * scale))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = (signSeq.toggledOn ? 4.2 : 2.2) * scale;
    ctx.globalAlpha = signSeq.toggledOn ? Math.min(1, 0.55 + sequencer.kickEnvelope * 0.45) : 0.25;
    ctx.strokeText(text, 0, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 * scale;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = signSeq.toggledOn ? textColor : glowColor;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const isoAngleLeft = -Math.atan2(halfH, halfW);
  const isoAngleRight = Math.atan2(halfH, halfW);

  // Back-left wall lower & upper neon signs
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.25,
    nw.y + (sw.y - nw.y) * 0.25 - 40 * scale,
    isoAngleLeft,
    'CLUB NEON',
    moodSecondary,
    '#e0f2fe',
    12.5,
    1
  );
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.56,
    nw.y + (sw.y - nw.y) * 0.56 - 42 * scale,
    isoAngleLeft,
    'GOOD TIMES',
    moodPrimary,
    '#f3e8ff',
    9.5,
    2
  );
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.42,
    nw.y + (sw.y - nw.y) * 0.42 - 88 * scale,
    isoAngleLeft,
    '★ VIP LOUNGE ★',
    moodTertiary,
    '#fef9c3',
    10.5,
    5
  );

  // Back-right wall lower & upper neon signs (Fixed se.y - nw.y alignment!)
  drawIsoWallSign(
    nw.x + (se.x - nw.x) * 0.44,
    nw.y + (se.y - nw.y) * 0.44 - 42 * scale,
    isoAngleRight,
    'LOVE THE BASS',
    moodSecondary,
    '#67e8f9',
    11.0,
    3
  );
  drawIsoWallSign(
    nw.x + (se.x - nw.x) * 0.83,
    nw.y + (se.y - nw.y) * 0.83 - 38 * scale,
    isoAngleRight,
    'COCKTAILS',
    moodPrimary,
    '#fbcfe8',
    10.5,
    4
  );
  drawIsoWallSign(
    nw.x + (se.x - nw.x) * 0.52,
    nw.y + (se.y - nw.y) * 0.52 - 88 * scale,
    isoAngleRight,
    'NEON NIGHTS',
    moodPrimary,
    '#fdf4ff',
    11.0,
    6
  );

  // 6. VERTICAL PINK/MAGENTA LIGHTING TRUSS TOWERS WITH CYAN SPOTLIGHT CONES (Matching IMG_1506_5bdf15ca.jpeg)
  const drawTrussTower = (gx: number, gy: number) => {
    const tx = originX + (gx - gy) * halfW;
    const ty = originY + (gx + gy) * halfH;
    const th = 72 * scale;
    const tw = 9 * scale;

    // Truss frame rails
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2 * scale;
    ctx.strokeRect(tx - tw / 2, ty - th, tw, th);

    ctx.strokeStyle = moodPrimary;
    ctx.lineWidth = 1.8 * scale;
    ctx.strokeRect(tx - tw / 2, ty - th, tw, th);

    // Cross-bracing zig-zag bars
    ctx.beginPath();
    for (let z = 0; z < 6; z++) {
      const y0 = ty - z * (th / 6);
      const y1 = ty - (z + 1) * (th / 6);
      ctx.moveTo(tx - tw / 2, y0);
      ctx.lineTo(tx + tw / 2, y1);
      ctx.moveTo(tx + tw / 2, y0);
      ctx.lineTo(tx - tw / 2, y1);
    }
    ctx.stroke();

    // Mounted Genre-Mood Spotlight Cans with bright radial light halos & hot white core
    for (let sp = 0; sp < 3; sp++) {
      const lx = tx + 5 * scale;
      const ly = ty - th + (10 + sp * 16) * scale;
      const spotColor = sp % 2 === 0 ? moodSecondary : moodTertiary;
      // Dark spotlight housing can
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(lx - 1.2 * scale, ly, 3.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      // Bright radial LED lens halo
      const haloR = (10.5 + Math.sin(t * 2.5 + sp) * 1.5) * scale;
      const lensGrad = ctx.createRadialGradient(lx, ly, 0.6 * scale, lx, ly, haloR);
      lensGrad.addColorStop(0, '#ffffff');
      lensGrad.addColorStop(0.28, '#ffffff');
      lensGrad.addColorStop(0.55, spotColor);
      lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, haloR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  drawTrussTower(1.5, 0.2);
  drawTrussTower(7.2, 0.2);

  // 6B. "NO SLEEP" NEON SIGN, RETRO ARCADE CABINETS, GREEN POOL TABLE & CHAMPAGNE PYRAMID TABLE (Matching IMG_1510_4d373b62.png)
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.81,
    nw.y + (sw.y - nw.y) * 0.81 - 41 * scale,
    isoAngleLeft,
    'NO SLEEP',
    '#4ade80',
    '#dcfce7',
    9.2,
    0
  );

  // Retro Arcade Cabinets lined up under "NO SLEEP" along the lower-left wall (gx = 0.25, gy = 7.45..8.85)
  const arcadeConfigs = [
    { gx: 0.22, gy: 7.55, body: '#6b21a8', screen: '#facc15', trim: '#e879f9' },
    { gx: 0.22, gy: 8.2, body: '#581c87', screen: '#38bdf8', trim: '#f472b6' },
    { gx: 0.22, gy: 8.85, body: '#1e293b', screen: '#4ade80', trim: '#22d3ee' },
  ];
  for (const arc of arcadeConfigs) {
    drawIsoPrism(
      ctx,
      arc.gx,
      arc.gy,
      0.55,
      0.52,
      0,
      26 * scale,
      originX,
      originY,
      tileW,
      tileH,
      arc.trim,
      arc.body,
      '#1e1b4b',
      INK,
      1.8 * scale
    );
    const acx = originX + (arc.gx + 0.35 - (arc.gy + 0.25)) * halfW;
    const acy = originY + (arc.gx + 0.35 + (arc.gy + 0.25)) * halfH - 17 * scale;
    fillStrokeRoundedRect(
      ctx,
      acx - 4.2 * scale,
      acy - 4.2 * scale,
      8.4 * scale,
      6.2 * scale,
      1.5 * scale,
      arc.screen,
      INK,
      1.4 * scale
    );
  }

  // Crisp Green-Felt Pool Table in the lower-left corner ("KIRA R. — Corner pocket. Watch this." in IMG_1510_4d373b62.png)
  drawIsoPrism(
    ctx,
    0.15,
    9.15,
    0.85,
    0.72,
    0,
    13 * scale,
    originX,
    originY,
    tileW,
    tileH,
    '#15803d',
    '#451a03',
    '#271001',
    INK,
    1.9 * scale
  );
  const poolCx = originX + (0.55 - 9.5) * halfW;
  const poolCy = originY + (0.55 + 9.5) * halfH - 13.5 * scale;
  for (const ball of [
    { dx: -3.5, dy: -1, c: '#ffffff' },
    { dx: 1.5, dy: 0.5, c: '#facc15' },
    { dx: 4.2, dy: -1.2, c: '#ef4444' },
  ]) {
    ctx.fillStyle = ball.c;
    ctx.beginPath();
    ctx.arc(poolCx + ball.dx * scale, poolCy + ball.dy * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // White-Draped Round Champagne Glass Pyramid Table near the top corner (Matching IMG_1510_4d373b62.png)
  const champX = originX + (1.42 - 1.12) * halfW;
  const champY = originY + (1.42 + 1.12) * halfH;
  fillStrokeRoundedRect(
    ctx,
    champX - 9.5 * scale,
    champY - 16 * scale,
    19 * scale,
    16 * scale,
    4 * scale,
    '#f8fafc',
    INK,
    2 * scale
  );
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.ellipse(champX, champY - 16 * scale, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Golden Champagne Glass Pyramid Tower on top of the white-draped table
  for (let row = 0; row < 3; row++) {
    const count = 3 - row;
    for (let g = 0; g < count; g++) {
      const gxPos = champX + (g - (count - 1) * 0.5) * 4.2 * scale;
      const gyPos = champY - (18 + row * 4.5) * scale;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(gxPos, gyPos, 2.1 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1 * scale;
      ctx.stroke();
    }
  }

  // 7. TROPICAL POTTED PALM TREES & CORNER MONSTERA PLANTS (Matching IMG_1510_4d373b62.png)
  drawIsometricPottedPlant(ctx, 0.45, 0.45, originX, originY, tileW, tileH, scale, true);
  drawIsometricPottedPlant(ctx, 0.55, 9.25, originX, originY, tileW, tileH, scale, true);
  drawIsometricPottedPlant(ctx, 9.25, 0.65, originX, originY, tileW, tileH, scale, false);

  // 8. GOLDEN CYLINDRICAL DANCE CAGES (Matching left and lower-center cages in IMG_1506_5bdf15ca.jpeg)
  const drawGoldenDanceCage = (gx: number, gy: number) => {
    const cx = originX + (gx - gy) * halfW;
    const cy = originY + (gx + gy) * halfH;
    const rx = 14 * scale;
    const ry = 7 * scale;
    const cageH = 38 * scale;

    // Gold circular podium base
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8 * scale;
    ctx.stroke();

    // Vertical golden cage bars
    for (let b = -2; b <= 2; b++) {
      const bx = cx + b * 5.2 * scale;
      const byOffset = Math.sqrt(Math.max(0, 1 - (b / 2.4) * (b / 2.4))) * ry;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(bx, cy + byOffset);
      ctx.lineTo(bx, cy - cageH + byOffset);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(bx, cy + byOffset);
      ctx.lineTo(bx, cy - cageH + byOffset);
      ctx.stroke();
    }

    // Mid and top gold rings
    for (const hFrac of [0.5, 1.0]) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2 * scale;
      ctx.beginPath();
      ctx.ellipse(cx, cy - cageH * hFrac, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.ellipse(cx, cy - cageH * hFrac, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  drawGoldenDanceCage(0.85, 7.85);
  drawGoldenDanceCage(5.2, 6.2);

  // 9. OVERHEAD SILVER MIRROR DISCO BALL & GENRE-TINTED LASER PYRAMID RAYS (Centerpiece of IMG_1506_5bdf15ca.jpeg)
  const discoX = originX + (3.2 - 3.6) * halfW;
  const discoY = originY + (3.2 + 3.6) * halfH - 86 * scale;

  // Vivid, natural volumetric light beams radiating from the mirror disco ball down to the dance floor
  ctx.save();
  const rayTargets = [
    { dx: -75, dy: 92, c: moodSecondary },
    { dx: -42, dy: 112, c: moodTertiary },
    { dx: -12, dy: 120, c: moodPrimary },
    { dx: 22, dy: 115, c: moodSecondary },
    { dx: 58, dy: 98, c: moodPrimary },
    { dx: 122, dy: 74, c: moodTertiary },
  ];
  for (let r = 0; r < rayTargets.length; r++) {
    const rt = rayTargets[r];
    const wobble = Math.sin(t * 1.35 + r * 1.1) * 7.5 * scale;
    const endX = discoX + rt.dx * scale + wobble;
    const endY = discoY + rt.dy * scale;
    const coneSpread = (13.5 + (r % 2) * 3.5) * scale;
    const beamAlpha = 0.38 + 0.1 * Math.sin(t * 1.9 + r) + sequencer.kickEnvelope * 0.12;

    const beamGrad = ctx.createLinearGradient(discoX, discoY, endX, endY);
    beamGrad.addColorStop(0, '#ffffff');
    beamGrad.addColorStop(0.22, rt.c);
    beamGrad.addColorStop(0.75, rt.c);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = beamGrad;
    ctx.globalAlpha = beamAlpha;
    ctx.beginPath();
    ctx.moveTo(discoX - 2.0 * scale, discoY);
    ctx.lineTo(discoX + 2.0 * scale, discoY);
    ctx.lineTo(endX + coneSpread, endY);
    ctx.lineTo(endX - coneSpread, endY);
    ctx.closePath();
    ctx.fill();

    // Luminous inner core ray inside each volumetric cone
    ctx.strokeStyle = rt.c;
    ctx.globalAlpha = Math.min(1, beamAlpha * 1.25);
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(discoX, discoY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Bright reflected disco light pool on the floor
    const poolGrad = ctx.createRadialGradient(
      endX,
      endY,
      0.8 * scale,
      endX,
      endY,
      coneSpread * 1.35
    );
    poolGrad.addColorStop(0, '#ffffff');
    poolGrad.addColorStop(0.32, rt.c);
    poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = poolGrad;
    ctx.globalAlpha = Math.min(1, beamAlpha * 1.1);
    ctx.beginPath();
    ctx.ellipse(endX, endY, coneSpread * 1.35, coneSpread * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Faceted Silver Mirror Disco Ball with #111116 outline & grid facets
  const ballR = 11.5 * scale;
  const ballGrad = ctx.createRadialGradient(
    discoX - 3 * scale,
    discoY - 3 * scale,
    2 * scale,
    discoX,
    discoY,
    ballR
  );
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(0.55, '#cbd5e1');
  ballGrad.addColorStop(1, '#475569');
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(discoX, discoY, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Mirror tile grid lines on disco ball
  ctx.strokeStyle = 'rgba(17, 17, 22, 0.45)';
  ctx.lineWidth = 1 * scale;
  for (const lat of [-4.5, 0, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(discoX - ballR * 0.85, discoY + lat * scale);
    ctx.lineTo(discoX + ballR * 0.85, discoY + lat * scale);
    ctx.stroke();
  }
  for (const lon of [-4.5, 0, 4.5]) {
    ctx.beginPath();
    ctx.moveTo(discoX + lon * scale, discoY - ballR * 0.85);
    ctx.lineTo(discoX + lon * scale, discoY + ballR * 0.85);
    ctx.stroke();
  }

  // 10. Compact Interactive Multi-Floor Expansion Sign Hitbox on Back Corner (Floors 1, 2 & 3)
  const signBox = {
    x: nw.x + 14 * scale,
    y: nw.y - wallH - 22 * scale,
    w: 102 * scale,
    h: 20 * scale,
  };
  stairsHitboxRef.current = signBox;
  fillStrokeRoundedRect(
    ctx,
    signBox.x,
    signBox.y,
    signBox.w,
    signBox.h,
    5 * scale,
    'rgba(13, 13, 20, 0.92)',
    unlockedFloors >= 3 ? '#4ade80' : moodSecondary,
    1.8 * scale
  );
  ctx.fillStyle = '#67e8f9';
  ctx.font = `800 ${Math.max(7, Math.round(8.5 * scale))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    unlockedFloors < 3
      ? `▲ UNLOCK FLOOR ${unlockedFloors + 1}`
      : `FLOOR ${activeFloor} / 3 ▲▼`,
    signBox.x + signBox.w / 2,
    signBox.y + 13 * scale
  );
}

/**
 * Draws the illuminated back-bar liquor shelving unit packed with dozens of tiny, brightly colored
 * liquor bottles, cocktail shakers, and glowing neon sign accents.
 */
function drawBackbarBottleShelves(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  lengthTiles: number,
  alongY: boolean,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const endGx = alongY ? gx : gx + lengthTiles;
  const endGy = alongY ? gy + lengthTiles : gy;

  const pStart = {
    x: originX + (gx - gy) * halfW,
    y: originY + (gx + gy) * halfH,
  };
  const pEnd = {
    x: originX + (endGx - endGy) * halfW,
    y: originY + (endGx + endGy) * halfH,
  };

  // Illuminated dark purple/slate back-bar cabinet frame with #111116 outline
  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y - 12 * scale);
  ctx.lineTo(pEnd.x, pEnd.y - 12 * scale);
  ctx.lineTo(pEnd.x, pEnd.y - 44 * scale);
  ctx.lineTo(pStart.x, pStart.y - 44 * scale);
  ctx.closePath();
  ctx.fillStyle = '#1e1638';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Under-lit cyan/magenta LED back-panel glow
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y - 43 * scale);
  ctx.lineTo(pEnd.x, pEnd.y - 43 * scale);
  ctx.stroke();

  const bottleColors = [
    '#22d3ee',
    '#f43f5e',
    '#4ade80',
    '#facc15',
    '#c084fc',
    '#fb923c',
    '#38bdf8',
    '#ec4899',
  ];

  // 2 Packed Tiers of Tiny Brightly Colored Liquor Bottles & Silver Cocktail Shakers
  for (let tier = 0; tier < 2; tier++) {
    const zOffset = (16 + tier * 13) * scale;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y - zOffset);
    ctx.lineTo(pEnd.x, pEnd.y - zOffset);
    ctx.stroke();

    const numBottles = Math.max(8, Math.round(lengthTiles * 4.5));
    for (let b = 1; b < numBottles; b++) {
      const u = b / numBottles;
      const bx = pStart.x + (pEnd.x - pStart.x) * u;
      const by = pStart.y + (pEnd.y - pStart.y) * u - zOffset;
      const bColor = bottleColors[(b + tier * 3) % bottleColors.length];

      fillStrokeRoundedRect(
        ctx,
        bx - 1.9 * scale,
        by - 8.5 * scale,
        3.8 * scale,
        7.8 * scale,
        1.2 * scale,
        bColor,
        INK,
        1 * scale
      );
      // Tiny bottle neck & cap
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 0.8 * scale, by - 10.8 * scale, 1.6 * scale, 2.3 * scale);
    }
  }
}

/**
 * Draws the glowing Red Carpet Entrance Archway Door at the front entrance (gx = 1.65..3.15, gy = 10)
 * where customers enter from the red carpet into the club (or queue in line when full).
 */
function drawEntranceArchwayCutaway(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  isClubFull: boolean = false,
  moodProfile?: ClubMoodLightingProfile
) {
  const gy = 10;
  const doorLeft = {
    x: originX + (1.65 - gy) * (tileW / 2),
    y: originY + (1.65 + gy) * (tileH / 2),
  };
  const doorRight = {
    x: originX + (3.15 - gy) * (tileW / 2),
    y: originY + (3.15 + gy) * (tileH / 2),
  };
  const pillarH = 38 * scale;
  const accentColor = isClubFull
    ? '#f43f5e'
    : moodProfile?.secondaryHex || '#22d3ee';
  const secondaryColor = moodProfile?.primaryHex || '#e879f9';

  ctx.save();

  // 1. Glowing Red Carpet Threshold Strip on the ground between the pillars
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.moveTo(doorLeft.x, doorLeft.y);
  ctx.lineTo(doorRight.x, doorRight.y);
  ctx.stroke();

  // 2. Left & Right Illuminated Entrance Door Pillars
  for (const pt of [doorLeft, doorRight]) {
    fillStrokeRoundedRect(
      ctx,
      pt.x - 3.5 * scale,
      pt.y - pillarH,
      7 * scale,
      pillarH,
      2.5 * scale,
      '#1e1338',
      INK,
      1.8 * scale
    );
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y - 3 * scale);
    ctx.lineTo(pt.x, pt.y - pillarH + 3 * scale);
    ctx.stroke();
  }

  // 3. Red Velvet Canopy Header Arch linking the two pillars above the Red Carpet Door
  ctx.beginPath();
  ctx.moveTo(doorLeft.x - 3 * scale, doorLeft.y - pillarH);
  ctx.lineTo(doorRight.x + 3 * scale, doorRight.y - pillarH);
  ctx.lineTo(doorRight.x + 3 * scale, doorRight.y - pillarH + 9 * scale);
  ctx.lineTo(doorLeft.x - 3 * scale, doorLeft.y - pillarH + 9 * scale);
  ctx.closePath();
  ctx.fillStyle = '#9f1239';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // 4. Floating Neon Marquee Badge on the Red Carpet Entrance Arch ("RED CARPET ENTRY" or "CLUB FULL · LINE UP")
  const midX = (doorLeft.x + doorRight.x) * 0.5;
  const midY = (doorLeft.y + doorRight.y) * 0.5 - pillarH - 6 * scale;
  const badgeW = 94 * scale;
  const badgeH = 14 * scale;
  fillStrokeRoundedRect(
    ctx,
    midX - badgeW * 0.5,
    midY - badgeH * 0.5,
    badgeW,
    badgeH,
    4 * scale,
    'rgba(12, 8, 26, 0.92)',
    isClubFull ? '#f43f5e' : secondaryColor,
    1.6 * scale
  );
  ctx.fillStyle = isClubFull ? '#fda4af' : '#f8fafc';
  ctx.font = `900 ${Math.max(6, Math.round(7.2 * scale))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isClubFull ? 'CLUB FULL · LINE UP' : 'RED CARPET ENTRY · OPEN',
    midX,
    midY
  );

  ctx.restore();
}

function drawWallStringLights(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number,
  t: number
) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 16 * scale, x2, y2);
  ctx.stroke();

  const bulbs = 8;
  for (let i = 1; i < bulbs; i++) {
    const u = i / bulbs;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * ((x1 + x2) / 2) + u * u * x2;
    const by =
      (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * ((y1 + y2) / 2 + 16 * scale) + u * u * y2;
    const twinkle = 0.78 + 0.22 * Math.sin(t * 3.5 + i * 1.3);

    ctx.fillStyle = `rgba(253, 224, 71, ${twinkle * 0.35})`;
    ctx.beginPath();
    ctx.arc(bx, by, 5.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(254, 249, 195, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(bx, by, 2.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws the sunken-look grid of glowing acrylic-glass dance floor tiles with natural radial LED diffusion,
 * smooth organic wave transitions, and subtle glass reflections instead of harsh binary strobing.
 */
function drawTile(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  sequencer?: RhythmicLightingSequencerState,
  moodProfile?: ClubMoodLightingProfile,
  bassRipples?: BassDropRippleWave[]
) {
  const fp = getRotatedFootprint(cat, item.rotation);
  const palette = moodProfile?.tilePalette || [
    '#22d3ee', // glowing cyan
    '#38bdf8', // electric aqua
    '#e879f9', // vibrant magenta
    '#4ade80', // lime green
    '#fde047', // sunny yellow
    '#fb923c', // neon orange
  ];

  // Subdivide each 1x1 grid cell into 2x2 sunken frosted-glass LED sub-squares
  const subDiv = 2;
  const subStep = 1 / subDiv;
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  const centerGx = item.gridX + fp.width * 0.5;
  const centerGy = item.gridY + fp.depth * 0.5;
  const kickEnv = sequencer ? sequencer.kickEnvelope : 0.25;
  const vibeRatio = sequencer ? sequencer.vibeRatio : 0.5;
  const bpmRate = sequencer ? Math.max(1.4, (sequencer.bpm / 60) * 0.85) : 1.75;

  for (let dx = 0; dx < fp.width; dx += subStep) {
    for (let dy = 0; dy < fp.depth; dy += subStep) {
      const gx = item.gridX + dx;
      const gy = item.gridY + dy;

      const ix = Math.round(gx * 2);
      const iy = Math.round(gy * 2);

      // Compute dynamic Bass Drop Ripple Wave excitation & 3D vertical lift at this sub-tile
      const subCenterGx = gx + subStep * 0.5;
      const subCenterGy = gy + subStep * 0.5;
      const rippleHit = computeBassDropRippleExcitation(
        subCenterGx,
        subCenterGy,
        bassRipples,
        item.floor
      );
      const rippleIntensity = rippleHit.intensity;
      const rippleLiftY = -rippleIntensity * 5.8 * scale;

      // Sunken recess offset (+1.0 * scale below floor level, dynamically lifted by passing bass drop ripple wave!)
      const baseP0y = originY + (gx + gy) * halfH + 1.0 * scale;
      const baseP1y = originY + (gx + subStep + gy) * halfH + 1.0 * scale;
      const baseP2y = originY + (gx + subStep + (gy + subStep)) * halfH + 1.0 * scale;
      const baseP3y = originY + (gx + (gy + subStep)) * halfH + 1.0 * scale;

      const p0x = originX + (gx - gy) * halfW;
      const p0y = baseP0y + rippleLiftY;
      const p1x = originX + (gx + subStep - gy) * halfW;
      const p1y = baseP1y + rippleLiftY;
      const p2x = originX + (gx - gy) * halfW;
      const p2y = baseP2y + rippleLiftY;
      const p3x = originX + (gx - (gy + subStep)) * halfW;
      const p3y = baseP3y + rippleLiftY;

      // Check AssetManager for custom uploaded floor_tile PNG sprite anchored at bottom-center
      if (
        assetManager.drawBottomCenterAnchoredSprite(
          ctx,
          'floor_tile',
          p2x,
          p2y,
          tileW * subStep,
          tileH * subStep
        )
      ) {
        continue;
      }

      // Smooth radial + diagonal wave traveling organically across the dance floor
      const distFromCenter = Math.hypot(subCenterGx - centerGx, subCenterGy - centerGy);
      const radialWave = Math.sin(t * bpmRate * 1.45 - distFromCenter * 1.35);
      const diagonalWave = Math.cos(t * bpmRate * 1.1 - (gx + gy) * 0.95);
      const smoothWave = Math.min(
        1,
        0.5 + 0.5 * (radialWave * 0.6 + diagonalWave * 0.4) + rippleIntensity * 0.48
      );

      // Gentle color progression across the palette, shifting dynamically when the bass ripple crest passes
      const colorFloat =
        (ix * 0.65 + iy * 0.85 + t * bpmRate * 0.28 + rippleIntensity * 2.2) %
        palette.length;
      const colorIdx = Math.floor(Math.abs(colorFloat)) % palette.length;
      const nextColorIdx = (colorIdx + 1) % palette.length;
      const baseColor =
        rippleIntensity > 0.38 ? rippleHit.primaryColor : palette[colorIdx];
      const secondaryColor =
        rippleIntensity > 0.25 ? rippleHit.secondaryColor : palette[nextColorIdx];

      // Vivid, brightly lit luminous intensity: smoothly waving between 0.80 and 1.0
      const glowIntensity = Math.min(
        1.0,
        0.80 +
          smoothWave * (0.16 + vibeRatio * 0.06) +
          kickEnv * 0.08 +
          rippleIntensity * 0.22
      );

      const cx = p0x;
      const cy = (p0y + p2y) / 2;
      const subRadius = tileW * (0.34 + rippleIntensity * 0.08);

      ctx.save();

      // If this sub-tile is lifted by the passing bass drop ripple wave, render its glowing 3D acrylic side skirt
      if (rippleIntensity > 0.05) {
        ctx.fillStyle = rippleHit.primaryColor;
        ctx.globalAlpha = Math.min(0.88, rippleIntensity * 0.92);
        ctx.beginPath();
        ctx.moveTo(p3x, p3y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p1x, baseP1y);
        ctx.lineTo(p2x, baseP2y);
        ctx.lineTo(p3x, baseP3y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();

      // 1. Vibrant illuminated base fill so every tile is richly lit even at the corners
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = glowIntensity * 0.85;
      ctx.fill();

      // 2. Bright radial LED diffuser light underneath the glass panel with a hot white center core
      const tileGrad = ctx.createRadialGradient(
        cx,
        cy,
        (0.8 + rippleIntensity * 2.2) * scale,
        cx,
        cy,
        subRadius
      );
      tileGrad.addColorStop(0, '#ffffff');
      tileGrad.addColorStop(
        Math.min(0.55, 0.32 + rippleIntensity * 0.2),
        rippleIntensity > 0.45 ? '#ffffff' : baseColor
      );
      tileGrad.addColorStop(0.82, secondaryColor);
      tileGrad.addColorStop(1, baseColor);

      ctx.fillStyle = tileGrad;
      ctx.globalAlpha = glowIntensity;
      ctx.fill();

      // 3. Luminous center LED hot-spot diamond that surges outward when the bass drop ripple crest hits
      const coreScale =
        0.09 + smoothWave * 0.06 + kickEnv * 0.03 + rippleIntensity * 0.14;
      ctx.fillStyle =
        rippleIntensity > 0.2 ? '#ffffff' : 'rgba(255, 255, 255, 0.68)';
      ctx.globalAlpha = Math.min(1, 0.65 + smoothWave * 0.35 + rippleIntensity * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx, cy - tileH * coreScale);
      ctx.lineTo(cx + tileW * coreScale, cy);
      ctx.lineTo(cx, cy + tileH * coreScale);
      ctx.lineTo(cx - tileW * coreScale, cy);
      ctx.closePath();
      ctx.fill();

      // 4. Glossy acrylic glass surface reflection along the upper-left facet
      const sheenGrad = ctx.createLinearGradient(p0x, p0y, p2x, p2y);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.06)');
      sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.fillStyle = sheenGrad;
      ctx.globalAlpha = 1;
      ctx.fill();

      // 5. Sleek dark glass bezel seam between tiles (flashes neon cyan/white along the ripple wavefront!)
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();
      ctx.strokeStyle =
        rippleIntensity > 0.22 ? '#ffffff' : 'rgba(15, 11, 29, 0.78)';
      ctx.lineWidth = (1.2 + rippleIntensity * 1.4) * scale;
      ctx.stroke();

      // 6. Bright inner diffused rim highlight
      ctx.strokeStyle =
        rippleIntensity > 0.18
          ? rippleHit.primaryColor
          : 'rgba(255, 255, 255, 0.72)';
      ctx.globalAlpha = Math.min(1, 0.45 + smoothWave * 0.4 + rippleIntensity * 0.5);
      ctx.lineWidth = (0.95 + rippleIntensity * 1.1) * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy - tileH * 0.18);
      ctx.lineTo(cx + tileW * 0.18, cy);
      ctx.lineTo(cx, cy + tileH * 0.18);
      ctx.lineTo(cx - tileW * 0.18, cy);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  }
}

const drawIllustratedDanceTile = drawTile;

/**
 * Renders concentric isometric shockwave rings traveling across the dance floor plane
 * whenever a Bass Drop is triggered.
 */
function drawBassDropDanceFloorRipples(
  ctx: CanvasRenderingContext2D,
  ripples: BassDropRippleWave[],
  activeFloor: FloorLevel,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  ctx.save();
  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    if (r.floor !== activeFloor) continue;

    const lifeRatio = r.age / r.maxAge;
    const fade =
      Math.min(1, r.age / 0.08) * Math.max(0, 1 - Math.pow(lifeRatio, 1.55));
    if (fade <= 0.01) continue;

    const cx = originX + (r.originGx - r.originGy) * halfW;
    const cy = originY + (r.originGx + r.originGy) * halfH;

    // Draw 3 concentric harmonic wave rings in isometric floor projection (2:1 aspect ellipse)
    const ringOffsets = [
      { dr: 0, widthMul: 3.2, alphaMul: 0.85, color: '#ffffff', glow: r.primaryColor },
      { dr: -1.45, widthMul: 2.4, alphaMul: 0.65, color: r.primaryColor, glow: r.secondaryColor },
      { dr: -2.85, widthMul: 1.7, alphaMul: 0.42, color: r.secondaryColor, glow: r.primaryColor },
    ];

    for (let k = 0; k < ringOffsets.length; k++) {
      const ring = ringOffsets[k];
      const radGrid = r.radius + ring.dr;
      if (radGrid <= 0.25) continue;

      const rx = radGrid * tileW * 0.72;
      const ry = radGrid * tileH * 0.72;

      // Soft outer neon shockwave halo
      ctx.strokeStyle = ring.glow;
      ctx.lineWidth = (ring.widthMul * 2.4) * scale;
      ctx.globalAlpha = fade * ring.alphaMul * 0.38;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp inner wavefront crest
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.widthMul * scale;
      ctx.globalAlpha = fade * ring.alphaMul;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Applies a bright, natural radial ambient light bloom across each placed dance floor footprint
 * so the dance floor visibly illuminates the surrounding club space.
 */
function drawDanceFloorMoodFilterOverlay(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  sequencer: RhythmicLightingSequencerState,
  moodProfile: ClubMoodLightingProfile
) {
  const fp = getRotatedFootprint(cat, item.rotation);
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  const gx0 = item.gridX;
  const gy0 = item.gridY;
  const gx1 = item.gridX + fp.width;
  const gy1 = item.gridY + fp.depth;

  const pTop = {
    x: originX + (gx0 - gy0) * halfW,
    y: originY + (gx0 + gy0) * halfH,
  };
  const pRight = {
    x: originX + (gx1 - gy0) * halfW,
    y: originY + (gx1 + gy0) * halfH,
  };
  const pBottom = {
    x: originX + (gx1 - gy1) * halfW,
    y: originY + (gx1 + gy1) * halfH,
  };
  const pLeft = {
    x: originX + (gx0 - gy1) * halfW,
    y: originY + (gx0 + gy1) * halfH,
  };

  const centerX = (pTop.x + pBottom.x) * 0.5;
  const centerY = (pTop.y + pBottom.y) * 0.5;
  const radius = Math.max(
    16,
    Math.hypot(pRight.x - pLeft.x, pBottom.y - pTop.y) * 0.62
  );

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.lineTo(pLeft.x, pLeft.y);
  ctx.closePath();

  // Luminous radial ambient bloom across the dance floor
  const ambientGrad = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.05,
    centerX,
    centerY,
    radius
  );
  ambientGrad.addColorStop(0, '#ffffff');
  ambientGrad.addColorStop(0.28, moodProfile.primaryHex);
  ambientGrad.addColorStop(0.7, moodProfile.secondaryHex);
  ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = ambientGrad;
  ctx.globalAlpha = 0.28 + sequencer.kickEnvelope * 0.12 + Math.sin(t * 2.1) * 0.05;
  ctx.fill();

  // Subtle glowing LED edge strip around the dance floor perimeter
  ctx.strokeStyle = moodProfile.filterBorderHex || moodProfile.primaryHex;
  ctx.lineWidth = (1.5 + sequencer.kickEnvelope * 0.6) * scale;
  ctx.globalAlpha = 0.52 + sequencer.kickEnvelope * 0.2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Dispatches furniture rendering to the detailed multi-layered vector art renderers:
 * - drawBar: Padded neon-trimmed bar counter, glossy white top, round cushioned bar stools, and tall liquor bottle shelving
 * - drawDJBooth: Black-and-neon console table, two circular vinyl turntables, central mixer with glowing faders, angled laptop, stacked black studio monitor speakers with gold/silver cones, gold record plaques & golden crown trophy
 * - drawTable: Round high-top cocktail tables with metallic pedestals & circular bases, cushioned club chairs, and tufted purple VIP lounge booth sofas
 */
function drawIllustratedFurniture(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  activeDrink: DrinkMix,
  moodProfile?: ClubMoodLightingProfile
) {
  if (cat.category === 'BAR_UNIT') {
    drawBar(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t, activeDrink);
  } else if (cat.category === 'DJ_BOOTH') {
    drawDJBooth(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t);
  } else if (cat.category === 'SEATING') {
    drawTable(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t);
  } else if (cat.category === 'LIGHTING') {
    drawLightingFixture(ctx, item, cat, originX, originY, tileW, tileH, scale, t, moodProfile);
  }
}

/**
 * Draws the detailed Bar Counter & Liquor Shelves (Matching IMG_1506_5bdf15ca.jpeg):
 * - Sleek bar counter with padded purple/magenta neon-trimmed beveled panels and thick #111116 outlines
 * - Glossy white marble/acrylic countertop with specular reflection streaks
 * - Tall back-bar shelving unit packed with dozens of tiny, brightly colored liquor bottles & cocktail shakers
 * - Round cushioned bar stools with metallic pedestals & circular bases
 */
function drawBar(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  _t: number,
  activeDrink: DrinkMix
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const h = (cat.tier === 3 ? 25 : 22) * scale;
  const alongY = fp.depth > fp.width;
  const lengthTiles = Math.max(fp.width, fp.depth);

  // Check AssetManager for custom uploaded bar_counter PNG sprite anchored at bottom-center
  const barFootX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + fp.depth * 0.5)) * halfW;
  const barFootY =
    originY + (item.gridX + fp.width + (item.gridY + fp.depth)) * halfH;
  if (
    assetManager.drawBottomCenterAnchoredSprite(
      ctx,
      'bar_counter',
      barFootX,
      barFootY,
      Math.max(fp.width, fp.depth) * tileW,
      (h + 46 * scale)
    )
  ) {
    return;
  }

  // 1. Tall Illuminated Back-Bar Shelving Unit packed with dozens of colorful liquor bottles
  drawBackbarBottleShelves(
    ctx,
    item.gridX,
    item.gridY,
    lengthTiles,
    alongY,
    originX,
    originY,
    tileW,
    tileH,
    scale
  );

  // 1.5. Stationed Bartender Staff Member(s) working right behind the Bar Counter (between the bottle shelves and the front glossy counter!)
  drawBartenderBehindCounter(
    ctx,
    item,
    fp,
    alongY,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    _t,
    activeDrink
  );

  // 2. Main Bar Counter Chassis with Padded Purple/Magenta Panels & Glossy White Countertop
  // Offset slightly forward along the counter depth so the Bartender stands cleanly in the service lane behind the counter!
  const counterGx = alongY ? item.gridX + 0.34 : item.gridX;
  const counterGy = alongY ? item.gridY : item.gridY + 0.34;
  const counterW = alongY ? Math.max(0.62, fp.width - 0.34) : fp.width;
  const counterD = alongY ? fp.depth : Math.max(0.62, fp.depth - 0.34);

  drawIsoPrism(
    ctx,
    counterGx,
    counterGy,
    counterW,
    counterD,
    0,
    h,
    originX,
    originY,
    tileW,
    tileH,
    '#f8fafc', // glossy white marble/acrylic bar top
    '#581c87', // padded deep purple front-left panel
    '#3b0764', // shaded dark violet side panel
    INK,
    2.2 * scale
  );

  // 3. Glowing Neon Magenta/Cyan Beveled Trim Inset on the Front Face of the Bar Counter
  const panelStartGx = counterGx + 0.12;
  const panelStartGy = counterGy + counterD;
  const panelEndGx = counterGx + counterW - 0.12;
  const panelEndGy = counterGy + counterD;

  const p1x = originX + (panelStartGx - panelStartGy) * halfW;
  const p1y = originY + (panelStartGx + panelStartGy) * halfH;
  const p2x = originX + (panelEndGx - panelEndGy) * halfW;
  const p2y = originY + (panelEndGx + panelEndGy) * halfH;

  ctx.save();
  ctx.strokeStyle = cat.tier >= 2 ? '#22d3ee' : '#e879f9';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(p1x, p1y - h + 4 * scale);
  ctx.lineTo(p2x, p2y - h + 4 * scale);
  ctx.lineTo(p2x, p2y - 4 * scale);
  ctx.lineTo(p1x, p1y - 4 * scale);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 4. Cocktail Shakers, Glowing Martini Glasses & Ice Bucket on the Glossy White Bar Top
  const numStations = Math.max(2, lengthTiles);
  for (let s = 0; s < numStations; s++) {
    const u = (s + 0.5) / numStations;
    const gx = counterGx + (alongY ? counterW * 0.5 : u * counterW);
    const gy = counterGy + (alongY ? u * counterD : counterD * 0.5);
    const cx = originX + (gx - gy) * halfW;
    const cy = originY + (gx + gy) * halfH - h;

    // Silver Cocktail Shaker with #0D0D14 outline
    fillStrokeRoundedRect(
      ctx,
      cx - 5 * scale,
      cy - 8 * scale,
      4.2 * scale,
      7.5 * scale,
      1.8 * scale,
      '#e2e8f0',
      INK,
      1.3 * scale
    );

    // Glowing Neon Cocktail Glass
    ctx.fillStyle = s % 2 === 0 ? activeDrink.color : '#ec4899';
    ctx.beginPath();
    ctx.moveTo(cx + 2 * scale, cy - 7.5 * scale);
    ctx.lineTo(cx + 8.5 * scale, cy - 7.5 * scale);
    ctx.lineTo(cx + 5.25 * scale, cy - 3.5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 5.25 * scale, cy - 3.5 * scale);
    ctx.lineTo(cx + 5.25 * scale, cy - 0.5 * scale);
    ctx.stroke();
  }
}

function getBarStoolCoords(
  item: PlacedItem,
  fp: { width: number; depth: number }
): Array<{ slotId: string; gx: number; gy: number; facingDir: 'NE' | 'NW' | 'SE' | 'SW' }> {
  const alongY = fp.depth > fp.width;
  const lengthTiles = Math.max(fp.width, fp.depth);
  const numStools = Math.max(2, lengthTiles);
  const stools: Array<{
    slotId: string;
    gx: number;
    gy: number;
    facingDir: 'NE' | 'NW' | 'SE' | 'SW';
  }> = [];

  for (let s = 0; s < numStools; s++) {
    if (alongY) {
      const onFrontRight = item.gridX + fp.width + 0.36 <= 9.25;
      const gx = onFrontRight ? item.gridX + fp.width + 0.36 : item.gridX - 0.36;
      const gy = item.gridY + s + 0.5;
      stools.push({
        slotId: `${item.uid}_stool_${s}`,
        gx,
        gy,
        facingDir: onFrontRight ? 'NW' : 'SE',
      });
    } else {
      const onFrontLeft = item.gridY + fp.depth + 0.36 <= 9.25;
      const gx = item.gridX + s + 0.5;
      const gy = onFrontLeft ? item.gridY + fp.depth + 0.36 : item.gridY - 0.36;
      stools.push({
        slotId: `${item.uid}_stool_${s}`,
        gx,
        gy,
        facingDir: onFrontLeft ? 'NE' : 'SW',
      });
    }
  }
  return stools;
}

/**
 * Draws the DJ Booth & Stage along the back-right neon-striped wall (Matching IMG_1510_4d373b62.png)
 */
function drawDJBooth(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  // If this item is a dedicated Subwoofer Bass Tower ('dj_speaker_stack'), render the tall studio speaker stack directly
  if (cat.id === 'dj_speaker_stack') {
    drawStudioMonitorSpeakerStack(
      ctx,
      item.gridX + 0.5,
      item.gridY + 0.5,
      0,
      originX,
      originY,
      tileW,
      tileH,
      scale,
      t
    );
    return;
  }

  // Check AssetManager for custom uploaded dj_booth PNG sprite anchored at bottom-center
  const djFootX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + fp.depth * 0.5)) * halfW;
  const djFootY = originY + (item.gridX + fp.width + (item.gridY + fp.depth)) * halfH;
  if (
    assetManager.drawBottomCenterAnchoredSprite(
      ctx,
      'dj_booth',
      djFootX,
      djFootY,
      (fp.width + 1.2) * tileW,
      78 * scale
    )
  ) {
    return;
  }

  // 1. Sleek Dark Slate DJ Stage Platform Riser with Neon Cyan Trim Border
  const riserH = 9 * scale;
  drawIsoPrism(
    ctx,
    item.gridX - 0.35,
    item.gridY - 0.05,
    fp.width + 0.7,
    fp.depth + 0.35,
    0,
    riserH,
    originX,
    originY,
    tileW,
    tileH,
    '#27243d',
    '#1b182c',
    '#131120',
    INK,
    2.0 * scale
  );

  // 2. Left Flanking Stacked Black Studio Monitor Speaker Tower (Behind/Left of DJ Console)
  drawStudioMonitorSpeakerStack(
    ctx,
    item.gridX - 0.35,
    item.gridY + 0.45,
    riserH,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    t
  );

  const consoleH = 18 * scale;
  const deckCenterX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + 0.45)) * halfW;
  const deckCenterY =
    originY + (item.gridX + fp.width * 0.5 + (item.gridY + 0.45)) * halfH - (riserH + consoleH);

  // 2.5. Resident DJ Character standing ON the DJ Stage Platform Riser directly behind the Dual Vinyl Turntables!
  // Rendered before the DJ Console Table so the DJ's lower waist sits behind the console while the DJ's upper torso,
  // head, spiky magenta hair, oversized headphones, and arms reach right onto the spinning turntables & mixer!
  drawResidentDjAtTurntable(ctx, deckCenterX, deckCenterY, scale, t, 'BODY');

  // 3. Detailed Black-and-Neon DJ Console Table
  drawIsoPrism(
    ctx,
    item.gridX + 0.08,
    item.gridY + 0.12,
    fp.width * 0.84,
    fp.depth * 0.76,
    riserH,
    consoleH,
    originX,
    originY,
    tileW,
    tileH,
    '#1e293b',
    '#0f172a',
    '#090d16',
    INK,
    2.2 * scale
  );

  // Glowing Cyan/Magenta Equalizer Emblem on Front Face of DJ Console
  const frontX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + 0.88)) * halfW;
  const frontY =
    originY + (item.gridX + fp.width * 0.5 + (item.gridY + 0.88)) * halfH - (riserH + 9 * scale);
  fillStrokeRoundedRect(
    ctx,
    frontX - 16 * scale,
    frontY - 6 * scale,
    32 * scale,
    11 * scale,
    3 * scale,
    '#090514',
    '#22d3ee',
    1.6 * scale
  );
  // Animated LED equalizer bars on front of console
  const ledColors = ['#22d3ee', '#f43f5e', '#facc15', '#4ade80', '#a855f7'];
  for (let b = 0; b < 5; b++) {
    const bh = (3 + Math.abs(Math.sin(t * 5 + b * 1.2)) * 6) * scale;
    ctx.fillStyle = ledColors[b];
    ctx.fillRect(frontX + (-11 + b * 5) * scale, frontY + 3.5 * scale - bh, 3.2 * scale, bh);
  }

  // 4. Two Circular Spinning Vinyl Turntables + Central Mixer with Glowing Faders + Angled Laptop on Console Top
  for (const side of [-1, 1]) {
    const tx = deckCenterX + side * 12 * scale;
    const ty = deckCenterY + side * 4.5 * scale;

    // Turntable platter base
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(tx, ty, 7.8 * scale, 4.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();

    // Black vinyl record disc
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(tx, ty, 6.2 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spinning vinyl record light groove highlight
    const spinAngle = t * (side < 0 ? 4.5 : -4.5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0 * scale;
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(spinAngle) * 2.0 * scale, ty + Math.sin(spinAngle) * 1.1 * scale);
    ctx.lineTo(tx + Math.cos(spinAngle) * 5.2 * scale, ty + Math.sin(spinAngle) * 2.9 * scale);
    ctx.stroke();

    // Glowing cyan/magenta center record label
    ctx.fillStyle = side < 0 ? '#22d3ee' : '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(tx, ty, 2.2 * scale, 1.3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Silver tonearm
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(tx + 5.5 * scale, ty - 2 * scale);
    ctx.lineTo(tx + 2 * scale, ty + 1 * scale);
    ctx.stroke();
  }

  // Central 4-Channel DJ Mixer with Glowing Faders (drawn BEFORE DJ arms & hands so the DJ's hand sits ON TOP of the mixer!)
  fillStrokeRoundedRect(
    ctx,
    deckCenterX - 5.5 * scale,
    deckCenterY - 4 * scale,
    11 * scale,
    8 * scale,
    2 * scale,
    '#0f172a',
    INK,
    1.5 * scale
  );
  for (const fx of [-3, 0, 3]) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(deckCenterX + fx * scale, deckCenterY - 2.2 * scale);
    ctx.lineTo(deckCenterX + fx * scale, deckCenterY + 2.2 * scale);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(
      deckCenterX + (fx - 1) * scale,
      deckCenterY + Math.sin(t * 3 + fx) * 1.5 * scale,
      2 * scale,
      1.6 * scale
    );
  }

  // Angled Glowing Laptop on Stand at Corner of DJ Console
  const lapX = deckCenterX - 18 * scale;
  const lapY = deckCenterY - 12 * scale;
  fillStrokeRoundedRect(
    ctx,
    lapX - 6 * scale,
    lapY - 8 * scale,
    12 * scale,
    8.5 * scale,
    2 * scale,
    '#38bdf8',
    INK,
    1.7 * scale
  );
  // Laptop screen waveform highlight
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(lapX - 4 * scale, lapY - 5.5 * scale, 8 * scale, 2 * scale);

  // 4.5. Draw the DJ's Arms, Forearms & Hands ON TOP OF the Console Table, Vinyl Turntables & Central Mixer!
  drawResidentDjAtTurntable(ctx, deckCenterX, deckCenterY, scale, t, 'HANDS_AND_BADGE');

  // Right Flanking Stacked Studio Monitor Speaker Tower
  drawStudioMonitorSpeakerStack(
    ctx,
    item.gridX + fp.width + 0.25,
    item.gridY + 0.45,
    riserH,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    t
  );

  // 5. Mounted Gold Record Plaques on Wall + Golden Crown Trophy Pedestal beside DJ Booth
  const plaqueX = deckCenterX - 36 * scale;
  const plaqueY = deckCenterY - 22 * scale;
  for (let p = 0; p < 2; p++) {
    const px = plaqueX + p * 14 * scale;
    const py = plaqueY + p * 6 * scale;
    fillStrokeRoundedRect(
      ctx,
      px - 5.5 * scale,
      py - 7 * scale,
      11 * scale,
      13 * scale,
      2 * scale,
      '#1e1b4b',
      '#facc15',
      1.5 * scale
    );
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(px, py - 0.5 * scale, 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  }

  // Golden Crown Trophy on Pedestal beside DJ Booth (Matching gold trophy in IMG_1506_5bdf15ca.jpeg)
  const trophyX = deckCenterX - 34 * scale;
  const trophyY = deckCenterY + 2 * scale;
  fillStrokeRoundedRect(
    ctx,
    trophyX - 6 * scale,
    trophyY - 12 * scale,
    12 * scale,
    12 * scale,
    2.5 * scale,
    '#f8fafc',
    INK,
    1.8 * scale
  );
  // Golden Crown Trophy atop pedestal
  ctx.beginPath();
  ctx.moveTo(trophyX - 6 * scale, trophyY - 12 * scale);
  ctx.lineTo(trophyX - 7 * scale, trophyY - 22 * scale);
  ctx.lineTo(trophyX - 2.5 * scale, trophyY - 17 * scale);
  ctx.lineTo(trophyX, trophyY - 24 * scale);
  ctx.lineTo(trophyX + 2.5 * scale, trophyY - 17 * scale);
  ctx.lineTo(trophyX + 7 * scale, trophyY - 22 * scale);
  ctx.lineTo(trophyX + 6 * scale, trophyY - 12 * scale);
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();
}

/**
 * Draws a tall stacked black studio monitor speaker tower with multiple yellow/gold & silver speaker cones
 * and thick #111116 dark outlines (matching the tall speaker stacks flanking the DJ booth in IMG_1506_5bdf15ca.jpeg).
 */
function drawStudioMonitorSpeakerStack(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  zBase: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const towerH = 44 * scale;

  const spkFootX = originX + (gx - gy) * halfW;
  const spkFootY = originY + (gx + gy) * halfH - zBase + 6 * scale;
  if (
    assetManager.drawBottomCenterAnchoredSprite(
      ctx,
      'speaker_stack',
      spkFootX,
      spkFootY,
      tileW * 0.9,
      towerH + 14 * scale
    )
  ) {
    return;
  }

  drawIsoPrism(
    ctx,
    gx - 0.36,
    gy - 0.36,
    0.72,
    0.72,
    zBase,
    towerH,
    originX,
    originY,
    tileW,
    tileH,
    '#27272a',
    '#18181b',
    '#09090b',
    INK,
    2.2 * scale
  );

  // Speaker cone stack on the front-left cabinet face (3 circular woofers + top horn tweeter)
  const faceX = originX + (gx - 0.1 - (gy + 0.25)) * halfW;
  const faceBaseY = originY + (gx - 0.1 + (gy + 0.25)) * halfH - zBase;
  const conePulse = 1 + Math.sin(t * 7) * 0.05;

  const cones = [
    { dy: -10, r: 5.2, rim: '#facc15', core: '#ca8a04' }, // bottom gold sub woofer
    { dy: -22, r: 4.6, rim: '#e2e8f0', core: '#facc15' }, // mid gold/silver cone
    { dy: -33, r: 3.8, rim: '#facc15', core: '#eab308' }, // upper midrange cone
  ];
  for (const c of cones) {
    const cy = faceBaseY + c.dy * scale;
    // Outer metallic/gold cone ring
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(faceX, cy, c.r * scale * conePulse, c.r * 1.15 * scale * conePulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();

    // Inner yellow/gold dust cap
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.arc(faceX, cy, c.r * 0.42 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  }
}

/**
 * Draws Detailed Tables & Seating (Matching IMG_1510_4d373b62.png — NO plain brown rectangles!)
 */
function drawTable(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  _t: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  if (cat.id === 'seat_bistro') {
    const tx = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * halfW;
    const ty = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * halfH;

    if (
      assetManager.drawBottomCenterAnchoredSprite(
        ctx,
        'cocktail_table',
        tx,
        ty + 6 * scale,
        tileW * 0.95,
        36 * scale
      )
    ) {
      return;
    }

    // Circular Chrome Base Plate with #111116 outline
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(tx, ty, 7.2 * scale, 3.6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8 * scale;
    ctx.stroke();

    // Thin Metallic Pedestal Stem
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6 * scale;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty - 16 * scale);
    ctx.stroke();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty - 16 * scale);
    ctx.stroke();

    // Round High-Top Purple/Neon Acrylic Tabletop with Beveled Rim
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.ellipse(tx, ty - 15.5 * scale, 12.2 * scale, 6.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.ellipse(tx, ty - 17 * scale, 11.6 * scale, 6.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Glowing cocktail glasses on high-top table
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(tx - 2.5 * scale, ty - 19.2 * scale, 2.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(tx + 3.2 * scale, ty - 18.6 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();
  } else {
    const vipFootX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + fp.depth * 0.5)) * halfW;
    const vipFootY = originY + (item.gridX + fp.width + (item.gridY + fp.depth)) * halfH;
    if (
      assetManager.drawBottomCenterAnchoredSprite(
        ctx,
        'vip_couch',
        vipFootX,
        vipFootY,
        Math.max(fp.width, fp.depth) * tileW,
        52 * scale
      )
    ) {
      return;
    }

    // Tufted Purple/Magenta VIP Lounge Sofa (Rendered BEFORE patrons seated on the sofa cushions!)
    const seatH = 11.5 * scale;
    const backH = 13.5 * scale;
    const topPurple = cat.tier >= 3 ? '#9333ea' : '#7e22ce';
    const frontPurple = cat.tier >= 3 ? '#6b21a8' : '#581c87';
    const sidePurple = '#3b0764';
    const sofaW = fp.width >= fp.depth ? fp.width : 0.56;
    const sofaD = fp.depth > fp.width ? fp.depth : 0.56;

    // 1. Plush Cushioned Sofa Base (strictly on the sofa side so it doesn't overlap the black VIP table!)
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      sofaW,
      sofaD,
      0,
      seatH,
      originX,
      originY,
      tileW,
      tileH,
      topPurple,
      frontPurple,
      sidePurple,
      INK,
      2.0 * scale
    );

    // 2. Tufted High Backrest with Button Tufting Dots & Neon Trim
    const backW = fp.width >= fp.depth ? fp.width : 0.24;
    const backD = fp.depth > fp.width ? fp.depth : 0.24;
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      backW,
      backD,
      seatH,
      backH,
      originX,
      originY,
      tileW,
      tileH,
      '#a855f7',
      '#7e22ce',
      '#4c1d95',
      INK,
      2.0 * scale
    );

    // Diamond Tufting Seam Dots across the VIP Sofa Backrest
    const numTufts = 4;
    for (let k = 1; k <= numTufts; k++) {
      const u = k / (numTufts + 1);
      const tGx = item.gridX + (fp.width >= fp.depth ? u * fp.width : 0.20);
      const tGy = item.gridY + (fp.depth > fp.width ? u * fp.depth : 0.20);
      const tx = originX + (tGx - tGy) * halfW;
      const ty = originY + (tGx + tGy) * halfH - (seatH + backH * 0.55);
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(tx, ty, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9 * scale;
      ctx.stroke();
    }
  }
}

/**
 * Draws the Sleek Black VIP Lounge Table in front of the Tufted Purple VIP Sofa.
 * Rendered as a separate foreground drawable so patrons sitting on the purple VIP sofa
 * have their lower legs naturally behind the black VIP table and NEVER sit on top of the table!
 */
function drawVipBoothForegroundTable(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number = 0,
  bottleService?: ActiveBoothBottleService
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const tableGx = item.gridX + (fp.width >= fp.depth ? 0.20 : 0.66);
  const tableGy = item.gridY + (fp.depth > fp.width ? 0.20 : 0.66);
  const tableW = fp.width >= fp.depth ? Math.max(0.6, fp.width - 0.40) : 0.42;
  const tableD = fp.depth > fp.width ? Math.max(0.6, fp.depth - 0.40) : 0.42;

  const isSparklerActive = bottleService?.status === 'ACTIVE_SPARKLERS';
  const isWaitingOrder = bottleService?.status === 'ORDERED_WAITING';
  const tableRimColor = isSparklerActive
    ? bottleService.trayColor
    : isWaitingOrder
    ? '#facc15'
    : INK;

  drawIsoPrism(
    ctx,
    tableGx,
    tableGy,
    tableW,
    tableD,
    0,
    13.0 * scale,
    originX,
    originY,
    tileW,
    tileH,
    isSparklerActive ? '#311042' : '#1e293b',
    '#0f172a',
    '#090d16',
    tableRimColor,
    (isSparklerActive ? 2.2 : 1.8) * scale
  );

  const bx = originX + (tableGx + tableW * 0.5 - (tableGy + tableD * 0.5)) * halfW;
  const by = originY + (tableGx + tableW * 0.5 + (tableGy + tableD * 0.5)) * halfH - 14.0 * scale;

  if (isSparklerActive && bottleService) {
    ctx.save();
    // 1. Illuminated Gold/Neon VIP Drink Tray Platter on the Table
    ctx.fillStyle = bottleService.trayColor;
    ctx.globalAlpha = 0.28 + Math.sin(t * 7) * 0.1;
    ctx.beginPath();
    ctx.ellipse(bx, by - 1 * scale, 13.5 * scale, 7.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(bx, by - 1.2 * scale, 10.5 * scale, 5.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = bottleService.trayColor;
    ctx.lineWidth = 1.6 * scale;
    ctx.stroke();

    // 2. Chilled Silver Champagne Ice Bucket in Center of Tray
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(bx - 3.6 * scale, by - 2.2 * scale);
    ctx.lineTo(bx - 4.4 * scale, by - 8.2 * scale);
    ctx.lineTo(bx + 4.4 * scale, by - 8.2 * scale);
    ctx.lineTo(bx + 3.6 * scale, by - 2.2 * scale);
    ctx.closePath();
    ctx.fill();

    // 3. Glowing Crystal Magnum Bottle Rising from Ice Bucket
    ctx.fillStyle = bottleService.trayColor;
    ctx.beginPath();
    ctx.roundRect(bx - 1.9 * scale, by - 14.5 * scale, 3.8 * scale, 8.2 * scale, 1.4 * scale);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx - 1.1 * scale, by - 17.5 * scale, 2.2 * scale, 3.5 * scale);

    // 4. Four Neon Champagne Flutes Around the Tray
    const fluteOffsets = [
      { dx: -7.2, dy: -2.0, col: '#22d3ee' },
      { dx: -4.8, dy: 1.2, col: '#f43f5e' },
      { dx: 4.8, dy: 1.2, col: '#facc15' },
      { dx: 7.2, dy: -2.0, col: '#e879f9' },
    ];
    for (const fl of fluteOffsets) {
      ctx.fillStyle = fl.col;
      ctx.beginPath();
      ctx.arc(bx + fl.dx * scale, by + fl.dy * scale, 1.9 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Twin Animated Sparkler Fountains Shooting Flickering Sparks!
    const sparklerBases = [
      { sx: bx - 5.2 * scale, sy: by - 11.5 * scale },
      { sx: bx + 5.2 * scale, sy: by - 11.5 * scale },
    ];
    for (let sIdx = 0; sIdx < sparklerBases.length; sIdx++) {
      const sb = sparklerBases[sIdx];
      // Sparkler wand stem
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.1 * scale;
      ctx.beginPath();
      ctx.moveTo(bx + (sIdx === 0 ? -2.8 : 2.8) * scale, by - 7.5 * scale);
      ctx.lineTo(sb.sx, sb.sy);
      ctx.stroke();

      // Core spark flash
      const coreR = (2.6 + Math.sin(t * 22 + sIdx * 2) * 0.9) * scale;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sb.sx, sb.sy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Radiating spark rays
      for (let ray = 0; ray < 6; ray++) {
        const angle = (ray / 6) * Math.PI * 2 + t * 9 + sIdx;
        const rayLen = (4.2 + Math.sin(t * 19 + ray * 1.7) * 2.2) * scale;
        const rx = sb.sx + Math.cos(angle) * rayLen;
        const ry = sb.sy + Math.sin(angle) * rayLen * 0.85;
        ctx.strokeStyle = ray % 2 === 0 ? '#fde047' : bottleService.sparklerColor;
        ctx.lineWidth = 1.3 * scale;
        ctx.beginPath();
        ctx.moveTo(sb.sx, sb.sy);
        ctx.lineTo(rx, ry);
        ctx.stroke();
      }
    }

    // 6. Compact Floating Bottle Service Multiplier Badge
    const pillY = by - 24 * scale - Math.abs(Math.sin(t * 3.5)) * 1.5 * scale;
    const pillText = `🍾 ${bottleService.spendingMultiplier}x VIP`;
    ctx.font = `800 ${Math.max(7, Math.round(6.8 * scale))}px "Outfit", sans-serif`;
    const tw = ctx.measureText(pillText).width;
    const pw = tw + 8 * scale;
    const ph = 11.5 * scale;
    fillStrokeRoundedRect(
      ctx,
      bx - pw * 0.5,
      pillY - ph * 0.5,
      pw,
      ph,
      4 * scale,
      'rgba(15, 9, 32, 0.88)'
    );
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, bx, pillY);
    ctx.restore();
    return;
  }

  // Standard Cocktail Glasses on VIP Table
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(bx - 3.2 * scale, by - 1.8 * scale, 2.3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.0 * scale;
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(bx + 3.2 * scale, by - 2.2 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.0 * scale;
  ctx.stroke();

  // If a VIP guest at this booth has placed a Bottle Service order waiting to be served, render an interactive "🍾 TAP TO SERVE" floating pill
  if (isWaitingOrder && bottleService) {
    ctx.save();
    const bounce = Math.abs(Math.sin(t * 5.2)) * 3.5 * scale;
    const badgeY = by - 25 * scale - bounce;
    const label = `🍾 VIP BOTTLE ORDER! TAP TO SERVE (+$${bottleService.price})`;
    ctx.font = `900 ${Math.max(8, Math.round(7.8 * scale))}px "Outfit", sans-serif`;
    const tw = ctx.measureText(label).width;
    const pw = tw + 14 * scale;
    const ph = 15.5 * scale;

    fillStrokeRoundedRect(
      ctx,
      bx - pw * 0.5,
      badgeY - ph * 0.5,
      pw,
      ph,
      6 * scale,
      'rgba(250, 204, 21, 0.96)'
    );
    ctx.fillStyle = '#090514';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, badgeY);
    ctx.restore();
  }
}

function drawBarStool(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
) {
  const sx = originX + (gx - gy) * (tileW / 2);
  const sy = originY + (gx + gy) * (tileH / 2);

  // Circular Metallic Base Plate with #111116 outline
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 5.8 * scale, 3.0 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Chrome Pedestal Stem
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.2 * scale;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 11.5 * scale);
  ctx.stroke();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.1 * scale;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 11.5 * scale);
  ctx.stroke();

  // Chrome Footrest Ring around stem
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.3 * scale;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 5.2 * scale, 4.4 * scale, 2.1 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Round Padded Neon-Purple Cushion Top with Specular Highlight
  ctx.fillStyle = '#7e22ce';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 12 * scale, 6.6 * scale, 3.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.ellipse(sx - 1 * scale, sy - 12.8 * scale, 3.6 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCushionedClubChairAtGrid(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  cushionColor: string,
  facingDir: 'SE' | 'NW'
) {
  const x = originX + (gx - gy) * (tileW / 2);
  const y = originY + (gx + gy) * (tileH / 2);

  // Metallic pedestal base
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(x, y, 5.6 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.0 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 9.5 * scale);
  ctx.stroke();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.0 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 9.5 * scale);
  ctx.stroke();

  // When chair faces SE (Back-Left Chair), draw backrest behind the cushion first
  if (facingDir === 'SE') {
    fillStrokeRoundedRect(
      ctx,
      x - 6.8 * scale,
      y - 19.2 * scale,
      9.6 * scale,
      8.0 * scale,
      3.5 * scale,
      '#a855f7',
      INK,
      1.7 * scale
    );
  }

  // Round cushioned seat
  ctx.fillStyle = cushionColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * scale, 7.0 * scale, 4.1 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Specular cushion highlight
  ctx.fillStyle = '#d8b4fe';
  ctx.beginPath();
  ctx.ellipse(x - 1.2 * scale, y - 10.7 * scale, 3.6 * scale, 1.7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // When chair faces NW (Front-Right Chair), draw low curved backrest on the outer-right edge
  if (facingDir === 'NW') {
    fillStrokeRoundedRect(
      ctx,
      x - 1.5 * scale,
      y - 17.8 * scale,
      8.8 * scale,
      7.2 * scale,
      3.5 * scale,
      '#a855f7',
      INK,
      1.7 * scale
    );
  }
}

function drawLightingFixture(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  moodProfile?: ClubMoodLightingProfile
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const tx = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * halfW;
  const ty = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * halfH;
  const th = 48 * scale;
  const fixtureAccent = moodProfile?.primaryHex || cat.accentColor;

  // Truss column with thick dark outline
  fillStrokeRoundedRect(
    ctx,
    tx - 4 * scale,
    ty - th,
    8 * scale,
    th,
    2 * scale,
    '#1e1b4b',
    INK,
    1.8 * scale
  );
  ctx.strokeStyle = fixtureAccent;
  ctx.lineWidth = 1.4 * scale;
  ctx.strokeRect(tx - 3 * scale, ty - th + 2 * scale, 6 * scale, th - 4 * scale);

  // Glowing top spotlight head with bright radial light halo
  const orbY = ty - th - 4 * scale;
  const orbColor = moodProfile?.secondaryHex || cat.accentColor || '#22d3ee';
  const haloRadius = (16.5 + Math.sin(t * 3.2) * 2.0) * scale;

  ctx.save();
  const haloGrad = ctx.createRadialGradient(tx, orbY, 1.0 * scale, tx, orbY, haloRadius);
  haloGrad.addColorStop(0, '#ffffff');
  haloGrad.addColorStop(0.28, '#ffffff');
  haloGrad.addColorStop(0.55, orbColor);
  haloGrad.addColorStop(0.82, fixtureAccent);
  haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(tx, orbY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  // Bright hot white emitter core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tx, orbY, 3.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLightingBeams(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number
) {
  // Bright volumetric spotlight cone & luminous elliptical floor light pool
  const srcX = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (tileW / 2);
  const srcY =
    originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (tileH / 2) - 52 * scale;
  const sweepX =
    srcX + Math.sin(t * 0.95 + item.gridX * 1.3) * 58 * scale;
  const sweepY =
    srcY + (78 + Math.cos(t * 0.75 + item.gridY * 1.1) * 18) * scale;
  const beamColor = cat.accentColor || '#22d3ee';
  const coneRadius = 21 * scale;

  ctx.save();
  // 1. Bright tapered volumetric light cone fading naturally to transparent
  const coneGrad = ctx.createLinearGradient(srcX, srcY, sweepX, sweepY);
  coneGrad.addColorStop(0, '#ffffff');
  coneGrad.addColorStop(0.2, beamColor);
  coneGrad.addColorStop(0.75, beamColor);
  coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = coneGrad;
  ctx.globalAlpha = 0.42 + 0.1 * Math.sin(t * 2.2 + item.gridX);
  ctx.beginPath();
  ctx.moveTo(srcX - 2.2 * scale, srcY);
  ctx.lineTo(srcX + 2.2 * scale, srcY);
  ctx.lineTo(sweepX + coneRadius, sweepY);
  ctx.lineTo(sweepX - coneRadius, sweepY);
  ctx.closePath();
  ctx.fill();

  // Inner concentrated light beam core
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(srcX, srcY);
  ctx.lineTo(sweepX, sweepY);
  ctx.stroke();

  // 2. Vivid diffused elliptical light pool where the spotlight illuminates the club floor
  const poolGrad = ctx.createRadialGradient(
    sweepX,
    sweepY,
    1.2 * scale,
    sweepX,
    sweepY,
    coneRadius * 1.35
  );
  poolGrad.addColorStop(0, '#ffffff');
  poolGrad.addColorStop(0.38, beamColor);
  poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = poolGrad;
  ctx.globalAlpha = 0.48;
  ctx.beginPath();
  ctx.ellipse(sweepX, sweepY, coneRadius * 1.3, coneRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the Resident DJ positioned directly at the Dual Vinyl Turntables on the DJ Stage Riser:
 * - Pass 'BODY': Drawn BEFORE the DJ Console Table so the DJ's lower torso sits naturally behind the console
 *   while the DJ's upper torso, neon cyan hoodie, arms reaching to the turntables, oversized chibi head,
 *   spiky magenta hair, and glowing purple/cyan DJ headphones stand right behind the decks.
 * - Pass 'HANDS_AND_BADGE': Drawn AFTER the spinning vinyl turntables & mixer so the DJ's left hand actively
 *   scratches the left vinyl turntable disc and the right hand works the central mixer fader / pumps to the beat!
 */
/**
 * Draws the Resident DJ positioned directly at the Dual Vinyl Turntables on the DJ Stage Riser (clean lineless sprite & bubble):
 */
function drawResidentDjAtTurntable(
  ctx: CanvasRenderingContext2D,
  deckCenterX: number,
  deckCenterY: number,
  scale: number,
  t: number,
  pass: 'BODY' | 'HANDS_AND_BADGE'
) {
  const grooveSwayX = Math.sin(t * 2.4) * 1.8 * scale;
  const beatBobY = Math.abs(Math.sin(t * 5.2)) * 2.2 * scale;
  const px = deckCenterX + 3.5 * scale + grooveSwayX;
  const torsoBaseY = deckCenterY + 3.5 * scale;
  const torsoTopY = torsoBaseY - 21 * scale + beatBobY * 0.6;

  // Exact screen coordinates of the left (-1) and right (+1) vinyl turntables & central mixer on the tabletop
  const leftDeckX = deckCenterX - 12 * scale;
  const leftDeckY = deckCenterY - 4.5 * scale;
  const rightDeckX = deckCenterX + 12 * scale;
  const rightDeckY = deckCenterY + 4.5 * scale;
  const mixerX = deckCenterX;
  const mixerY = deckCenterY;

  if (pass === 'BODY') {
    ctx.save();

    // 1. DJ Streetwear Hoodie Torso (Clean lineless fill)
    fillStrokeRoundedRect(
      ctx,
      px - 8.5 * scale,
      torsoTopY,
      17 * scale,
      19 * scale,
      5 * scale,
      '#22d3ee'
    );

    // Neon Magenta Front Hoodie Graphic / Equalizer Stripe
    fillStrokeRoundedRect(
      ctx,
      px - 3.2 * scale,
      torsoTopY + 3 * scale,
      6.4 * scale,
      11 * scale,
      2 * scale,
      '#ec4899'
    );

    // 2. Oversized Chibi DJ Head (1:1 head-to-body ratio) nodding to the beat
    const headY = torsoTopY - 8.5 * scale + beatBobY * 0.4;
    const headR = 9.2 * scale;

    // Back headphone band
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.arc(px, headY, 10.2 * scale, Math.PI * 1.05, -0.05);
    ctx.stroke();

    // Head circle (clean lineless fill)
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(px, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Spiky Magenta Punk DJ Hair (clean lineless fill, no forehead line!)
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(px - 8.8 * scale, headY - 2.2 * scale);
    ctx.lineTo(px - 10.5 * scale, headY - 10.5 * scale);
    ctx.lineTo(px - 4.2 * scale, headY - 7.8 * scale);
    ctx.lineTo(px - 0.5 * scale, headY - 14.5 * scale);
    ctx.lineTo(px + 3.8 * scale, headY - 8.0 * scale);
    ctx.lineTo(px + 10.2 * scale, headY - 11.0 * scale);
    ctx.lineTo(px + 8.8 * scale, headY - 2.2 * scale);
    ctx.closePath();
    ctx.fill();

    // 4. Cool Neon Cyan DJ Shades / Visor
    fillStrokeRoundedRect(
      ctx,
      px - 6.8 * scale,
      headY - 1.5 * scale,
      13.6 * scale,
      4.2 * scale,
      1.8 * scale,
      '#0284c7'
    );
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(px - 5.8 * scale, headY - 1.0 * scale, 11.6 * scale, 3.0 * scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 4.5 * scale, headY - 0.8 * scale, 3.2 * scale, 1.3 * scale);

    // 5. Oversized Glowing Purple & Cyan DJ Headphones Ear Cups (clean lineless fill)
    for (const side of [-1, 1]) {
      const earX = px + side * 9.4 * scale;
      const earY = headY + 0.6 * scale;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(earX, earY, 3.6 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(earX, earY, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else {
    // PASS 2: DRAWN ON TOP OF THE DJ CONSOLE TABLE, TURNTABLES, AND CENTRAL MIXER!
    // Renders both DJ arms/sleeves reaching over the top surface of the console and both hands resting on top of the vinyl platter & mixer
    ctx.save();

    const leftShoulderX = px - 7.2 * scale;
    const leftShoulderY = torsoTopY + 4.8 * scale;
    const rightShoulderX = px + 7.2 * scale;
    const rightShoulderY = torsoTopY + 4.8 * scale;

    const scratchOffset = Math.sin(t * 9.5) * 2.2 * scale;
    const leftHandX = leftDeckX + 1.2 * scale + scratchOffset;
    const leftHandY = leftDeckY - 1.2 * scale;
    const leftElbowX = (leftShoulderX + leftHandX) * 0.5 - 2.5 * scale;
    const leftElbowY = Math.min(leftShoulderY, leftHandY) - 2.8 * scale;

    const hypeRaise = Math.sin(t * 2.6) > 0.55;
    const useRightTurntable = !hypeRaise && Math.sin(t * 1.4) > 0.15;
    const rightHandX = hypeRaise
      ? rightShoulderX + 7.5 * scale
      : useRightTurntable
      ? rightDeckX - 1.2 * scale + Math.cos(t * 8.5) * 2.0 * scale
      : mixerX + 1.2 * scale + Math.cos(t * 5.5) * 1.6 * scale;
    const rightHandY = hypeRaise
      ? torsoTopY - 12 * scale - beatBobY
      : useRightTurntable
      ? rightDeckY - 1.2 * scale
      : mixerY - 1.5 * scale;
    const rightElbowX = (rightShoulderX + rightHandX) * 0.5 + 2.5 * scale;
    const rightElbowY = hypeRaise
      ? (rightShoulderY + rightHandY) * 0.5
      : Math.min(rightShoulderY, rightHandY) - 2.8 * scale;

    // Draw DJ Hoodie Sleeves (arched OVER the top of the table so arms never clip underneath the console!)
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = 4.2 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(leftShoulderX, leftShoulderY);
    ctx.quadraticCurveTo(leftElbowX, leftElbowY, leftHandX, leftHandY);
    ctx.moveTo(rightShoulderX, rightShoulderY);
    ctx.quadraticCurveTo(rightElbowX, rightElbowY, rightHandX, rightHandY);
    ctx.stroke();

    // Inner bright cyan sleeve highlight
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(leftShoulderX, leftShoulderY);
    ctx.quadraticCurveTo(leftElbowX, leftElbowY, leftHandX, leftHandY);
    ctx.moveTo(rightShoulderX, rightShoulderY);
    ctx.quadraticCurveTo(rightElbowX, rightElbowY, rightHandX, rightHandY);
    ctx.stroke();

    // Draw Left & Right Hands clearly ON TOP of the vinyl turntable record and mixer faders
    for (const hand of [
      { x: leftHandX, y: leftHandY },
      { x: rightHandX, y: rightHandY },
    ]) {
      ctx.fillStyle = '#090514';
      ctx.beginPath();
      ctx.arc(hand.x, hand.y + 0.8 * scale, 3.3 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f5cba7';
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, 3.0 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating DJ Name Tag without border lines
    const tagY = torsoBaseY - 46 * scale + beatBobY * 0.3;
    fillStrokeRoundedRect(
      ctx,
      px - 17 * scale,
      tagY - 7 * scale,
      34 * scale,
      12 * scale,
      6 * scale,
      'rgba(19, 13, 36, 0.92)'
    );
    ctx.fillStyle = '#22d3ee';
    ctx.font = `900 ${Math.round(7.5 * scale)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎧 DJ NOVA', px, tagY - 1 * scale);

    ctx.restore();
  }
}

/**
 * Draws the stationed Bartender Staff Member(s) directly inside the Bar Counter service lane (clean lineless sprite & bubble):
 */
function drawBartenderBehindCounter(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  fp: { width: number; depth: number },
  alongY: boolean,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  activeDrink: DrinkMix
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const lengthTiles = Math.max(fp.width, fp.depth);
  const bartenderCount = lengthTiles >= 3 ? 2 : 1;

  const BARTENDER_LOOKS = [
    { name: 'ROXY', hair: '#4ade80', vest: '#3b82f6', shirt: '#f8fafc' },
    { name: 'JETT', hair: '#38bdf8', vest: '#8b5cf6', shirt: '#f8fafc' },
    { name: 'VESPER', hair: '#f43f5e', vest: '#ec4899', shirt: '#f8fafc' },
  ];

  for (let bIdx = 0; bIdx < bartenderCount; bIdx++) {
    const seed = Math.abs(item.gridX * 7 + item.gridY * 13 + bIdx * 5);
    const look = BARTENDER_LOOKS[seed % BARTENDER_LOOKS.length];

    const baseU = bartenderCount === 1 ? 0.5 : 0.28 + bIdx * 0.44;
    const patrolSlide = Math.sin(t * 1.35 + seed) * (bartenderCount === 1 ? 0.18 : 0.09);
    const u = Math.max(0.18, Math.min(0.82, baseU + patrolSlide));

    const gx = item.gridX + (alongY ? 0.24 : u * fp.width);
    const gy = item.gridY + (alongY ? u * fp.depth : 0.24);

    const px = originX + (gx - gy) * halfW;
    const py = originY + (gx + gy) * halfH;
    const mixBounce = Math.abs(Math.sin(t * 4.8 + seed)) * 1.8 * scale;

    ctx.save();

    // 1. Bartender Vest & Crisp White Mixologist Shirt Torso (Clean lineless fill)
    const torsoTopY = py - 27.5 * scale - mixBounce * 0.5;
    fillStrokeRoundedRect(
      ctx,
      px - 7.5 * scale,
      torsoTopY,
      15 * scale,
      16 * scale,
      4.5 * scale,
      look.vest
    );

    // White dress shirt V-collar
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.moveTo(px - 3.2 * scale, torsoTopY + 1 * scale);
    ctx.lineTo(px + 3.2 * scale, torsoTopY + 1 * scale);
    ctx.lineTo(px, torsoTopY + 7.5 * scale);
    ctx.closePath();
    ctx.fill();

    // 2. Animated Mixologist Arms Shaking a Silver Cocktail Shaker above the Countertop (Clean lineless fill)
    const shakePhase = Math.sin(t * 10 + seed);
    const shakerX = px + (alongY ? 7.5 : -6.5) * scale;
    const shakerY = torsoTopY + (3.5 + shakePhase * 2.4) * scale;

    ctx.strokeStyle = look.vest;
    ctx.lineWidth = 3.4 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px + (alongY ? 5.5 : -5.5) * scale, torsoTopY + 4.5 * scale);
    ctx.lineTo(shakerX, shakerY);
    ctx.stroke();

    // Silver Cocktail Shaker in Bartender's Hand
    fillStrokeRoundedRect(
      ctx,
      shakerX - 2.6 * scale,
      shakerY - 5.5 * scale,
      5.2 * scale,
      8.2 * scale,
      2.0 * scale,
      '#e2e8f0'
    );

    // 3. Oversized Chibi Bartender Head (Clean lineless fill)
    const headY = torsoTopY - 8.2 * scale - mixBounce * 0.3;
    const headR = 8.4 * scale;
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.arc(px, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Stylish Spiky / Swept Mixologist Hair (Clean lineless fill, no forehead line!)
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(px, headY - 1.5 * scale, headR + 0.6 * scale, Math.PI * 1.05, -0.05);
    ctx.lineTo(px + 9.2 * scale, headY - 4.5 * scale);
    ctx.lineTo(px + 4.5 * scale, headY - 11.5 * scale);
    ctx.lineTo(px - 0.5 * scale, headY - 9.2 * scale);
    ctx.lineTo(px - 5.2 * scale, headY - 11.8 * scale);
    ctx.lineTo(px - 9.2 * scale, headY - 4.5 * scale);
    ctx.closePath();
    ctx.fill();

    // Crisp Dot Eyes facing the bar patrons
    const eyeOffsetX = alongY ? 1.8 * scale : -1.2 * scale;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px - 2.6 * scale + eyeOffsetX, headY + 0.8 * scale, 1.4 * scale, 0, Math.PI * 2);
    ctx.arc(px + 2.6 * scale + eyeOffsetX, headY + 0.8 * scale, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 5. Floating Purple Cocktail Mix Bubble above Bartender (Clean lineless circle & icon)
    const badgeY = headY - 16.5 * scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(px, badgeY + 1.2 * scale, 6.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.arc(px, badgeY, 6.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Cocktail glass silhouette inside purple bubble (filled shapes, no stroke lines)
    ctx.fillStyle = activeDrink.color || '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(px - 3.2 * scale, badgeY - 2.6 * scale);
    ctx.lineTo(px + 3.2 * scale, badgeY - 2.6 * scale);
    ctx.lineTo(px, badgeY + 0.8 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 0.55 * scale, badgeY + 0.6 * scale, 1.1 * scale, 3.0 * scale);
    ctx.fillRect(px - 2.0 * scale, badgeY + 3.1 * scale, 4.0 * scale, 1.0 * scale);

    ctx.restore();
  }
}

/**
 * Draws an interactive hired Staff Member (Bartender, Bouncer, or Waiter) on the isometric grid (clean lineless sprite & bubble):
 */
function drawHiredStaffAgent(
  ctx: CanvasRenderingContext2D,
  staff: StaffMemberAgent,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  _isRelocating: boolean
) {
  const px = originX + (staff.gridX - staff.gridY) * (tileW / 2);
  const py = originY + (staff.gridX + staff.gridY) * (tileH / 2);
  const isWalking = staff.path.length > 0;
  const walkPhase = staff.walkCycle ?? t * 6.5 + (staff.gridX + staff.gridY) * 2.5;

  const strideSin = isWalking ? Math.sin(walkPhase) : 0;
  const strideCos = isWalking ? Math.cos(walkPhase) : 0;
  const bounce =
    (isWalking
      ? Math.abs(strideSin) * 2.4
      : Math.sin(t * 2.6 + staff.gridX) * 1.0) * scale;

  const fx = staff.facingX ?? 0;
  const fy = staff.facingY ?? 1;
  const isoDirX = fx - fy;
  const leanX = isWalking ? Math.max(-1.8, Math.min(1.8, isoDirX * 1.2)) * scale : 0;

  ctx.save();

  // 1. Soft Ground Shadow under Staff Member (no stroke ring lines)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(px, py, 9.5 * scale, 4.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Animated Multi-Limb Walking Stride (Clean lineless legs & sneakers)
  const leftStrideX = strideSin * 3.2 * scale;
  const rightStrideX = -strideSin * 3.2 * scale;
  const leftFootLift = isWalking ? Math.max(0, strideCos) * 2.2 * scale : 0;
  const rightFootLift = isWalking ? Math.max(0, -strideCos) * 2.2 * scale : 0;

  const hipY = py - 12.5 * scale - bounce;
  const leftFootX = px - 3.2 * scale + leftStrideX;
  const leftFootY = py - 1.2 * scale - leftFootLift;
  const rightFootX = px + 3.2 * scale + rightStrideX;
  const rightFootY = py - 1.2 * scale - rightFootLift;

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.6 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px - 3.0 * scale + leanX * 0.4, hipY);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.moveTo(px + 3.0 * scale + leanX * 0.4, hipY);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  for (const foot of [
    { x: leftFootX, y: leftFootY },
    { x: rightFootX, y: rightFootY },
  ]) {
    fillStrokeRoundedRect(
      ctx,
      foot.x - 2.6 * scale,
      foot.y - 1.8 * scale,
      5.2 * scale,
      3.2 * scale,
      1.3 * scale,
      '#f8fafc'
    );
  }

  // 3. Role-Specific Chibi Torso / Uniform (Clean lineless fill)
  const torsoW = (staff.role === 'BOUNCER' ? 16.5 : 14.5) * scale;
  const torsoX = px - torsoW / 2 + leanX;
  const torsoY = py - 26.5 * scale - bounce;
  fillStrokeRoundedRect(
    ctx,
    torsoX,
    torsoY,
    torsoW,
    15 * scale,
    4.5 * scale,
    staff.uniformColor
  );

  const armSwing = isWalking ? -strideSin * 2.8 * scale : 0;

  if (staff.role === 'BARTENDER') {
    fillStrokeRoundedRect(
      ctx,
      px - 4.5 * scale + leanX,
      py - 20 * scale - bounce,
      9 * scale,
      7.5 * scale,
      1.5 * scale,
      '#1e293b'
    );
    const leftHandX = px - 9 * scale + leanX + armSwing;
    const leftHandY = py - 17 * scale - bounce;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.moveTo(px - 6.5 * scale + leanX, py - 23 * scale - bounce);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.stroke();
    fillStrokeRoundedRect(
      ctx,
      leftHandX - 2 * scale,
      leftHandY - 2 * scale,
      4 * scale,
      4 * scale,
      1.2 * scale,
      '#f5cba7'
    );

    const shakeOffset = (isWalking ? strideCos * 1.4 : Math.sin(t * 5.5) * 1.8) * scale;
    fillStrokeRoundedRect(
      ctx,
      px + 7.5 * scale + leanX - armSwing * 0.4,
      py - 25.5 * scale - bounce + shakeOffset,
      4.5 * scale,
      8.5 * scale,
      2 * scale,
      '#e2e8f0'
    );
  } else if (staff.role === 'BOUNCER') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(px + 3.8 * scale + leanX, py - 22.5 * scale - bounce, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    for (const side of [-1, 1]) {
      const handX = px + side * 8.8 * scale + leanX + (isWalking ? side * armSwing : 0);
      const handY = py - 16.5 * scale - bounce - (isWalking ? side * armSwing * 0.25 : 0);
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 3.6 * scale;
      ctx.beginPath();
      ctx.moveTo(px + side * 7.2 * scale + leanX, py - 23 * scale - bounce);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      fillStrokeRoundedRect(
        ctx,
        handX - 2.0 * scale,
        handY - 2.0 * scale,
        4.0 * scale,
        4.0 * scale,
        1.3 * scale,
        '#f5cba7'
      );
    }
  } else if (staff.role === 'WAITER') {
    fillStrokeRoundedRect(
      ctx,
      px - 4.5 * scale + leanX,
      py - 19 * scale - bounce,
      9 * scale,
      6.8 * scale,
      1.5 * scale,
      '#f8fafc'
    );

    const leftHandX = px - 8.5 * scale + leanX + armSwing;
    const leftHandY = py - 17 * scale - bounce;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 3.0 * scale;
    ctx.beginPath();
    ctx.moveTo(px - 6 * scale + leanX, py - 22.5 * scale - bounce);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.stroke();
    fillStrokeRoundedRect(
      ctx,
      leftHandX - 1.9 * scale,
      leftHandY - 1.9 * scale,
      3.8 * scale,
      3.8 * scale,
      1.2 * scale,
      '#f5cba7'
    );

    const trayX = px + 11.5 * scale + leanX - armSwing * 0.25;
    const trayY = py - 25 * scale - bounce * 0.75;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 3.0 * scale;
    ctx.beginPath();
    ctx.moveTo(px + 6 * scale + leanX, py - 21.5 * scale - bounce);
    ctx.lineTo(trayX, trayY + 2 * scale);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(trayX, trayY, 6.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    fillStrokeRoundedRect(
      ctx,
      trayX - 2.2 * scale,
      trayY - 6.5 * scale,
      4.4 * scale,
      6 * scale,
      1.2 * scale,
      staff.carryingDrinkColor || '#22d3ee'
    );
  }

  // 4. Oversized Chibi Head & Expressive Face (Clean lineless fill)
  const headX = px + leanX * 1.1;
  const headY = py - 35 * scale - bounce;
  const headR = 8.8 * scale;

  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  const gazeShift = Math.max(-1.4, Math.min(1.4, isoDirX * 0.9)) * scale;
  if (staff.role === 'BOUNCER') {
    fillStrokeRoundedRect(
      ctx,
      headX - 6.2 * scale + gazeShift * 0.5,
      headY - 2 * scale,
      12.4 * scale,
      4.2 * scale,
      1.2 * scale,
      '#090518'
    );
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(headX - 2.8 * scale + gazeShift, headY - 0.2 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.arc(headX + 2.8 * scale + gazeShift, headY - 0.2 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylish Hair (Clean lineless fill — no stroke line across forehead)
  ctx.fillStyle = staff.hairColor;
  ctx.beginPath();
  ctx.arc(headX, headY - 2 * scale, headR + 0.5 * scale, Math.PI * 0.94, Math.PI * 0.06);
  ctx.fill();

  // Circular Cocktail / Status Bubble above Staff Member (Clean lineless circle)
  const bubbleY = headY - 17 * scale;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(headX, bubbleY + 1.2 * scale, 6.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = staff.role === 'BOUNCER' ? '#facc15' : '#9333ea';
  ctx.beginPath();
  ctx.arc(headX, bubbleY, 6.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = staff.role === 'BOUNCER' ? '#090518' : '#ffffff';
  ctx.font = `900 ${Math.max(7, Math.round(7.5 * scale))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(staff.role === 'BOUNCER' ? '★' : '🍸', headX, bubbleY);

  ctx.restore();
}

/**
 * Draws the 2.5D Chibi Characters (Guests, Dancers, VIPs) matching Nightclub City: Neon (IMG_1506_5bdf15ca.jpeg):
 * - Large rounded heads (1:1 head-to-body ratio), thick #111116 black outlines, dot eyes, varied skin tones
 * - Distinct stylish hairstyles: voluminous Afros, space buns, spiky neon hair, baseball caps, knit beanies, ponytails
 * - Trendy streetwear: hoodies, patterned vests, club dresses, sneakers, and futuristic neon visor glasses
 * - Natural, unhurried walking stride & smooth beat-bobbing dance groove (no frantic shaking!)
 * - Crisp circular white/gold/purple overhead bubbles with black outlines (music notes, drink glasses, $, crowns)
 *   plus the signature dark floating quote tooltip ("MIA H. — I think I'm in love.")
 */
/**
 * Computes the average cash spent by all guests currently inside the club.
 */
function computeAverageClubGuestSpend(guests: GuestAgent[]): number {
  const inside = guests.filter((g) => g.state !== 'QUEUEING');
  if (inside.length === 0) return 75;
  let totalSpent = 0;
  for (let i = 0; i < inside.length; i++) {
    totalSpent += inside[i].cashSpent;
  }
  return Math.max(35, totalSpent / inside.length);
}

/**
 * Identifies 'Whale' guests whose cumulative cashSpent exceeds the current average spend
 * of all guests in the club (automatically synced via guest.isWhale).
 */
function isGuestVipWhale(guest: GuestAgent, avgGuestSpend: number): boolean {
  if (guest.state === 'QUEUEING') return false;
  return Boolean(guest.isWhale || (guest.cashSpent > avgGuestSpend && guest.cashSpent > 0));
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  guest: GuestAgent,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  clubBpm: number = 124,
  isVipWhale: boolean = false,
  bassRipples?: BassDropRippleWave[]
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2);

  // Check AssetManager for custom uploaded chibi_guest PNG sprite anchored at bottom-center
  if (
    assetManager.drawBottomCenterAnchoredSprite(
      ctx,
      'chibi_guest',
      px,
      py + 2 * scale,
      26 * scale,
      46 * scale
    )
  ) {
    return;
  }

  const isWalkingInQueue =
    guest.state === 'QUEUEING' &&
    guest.queueSlotCoord !== undefined &&
    Math.hypot(guest.queueSlotCoord.x - gx, guest.queueSlotCoord.y - gy) > 0.08;
  const isWalking =
    guest.path.length > 0 ||
    guest.state === 'WALKING_TO_CAR' ||
    guest.state === 'ARRIVING_FROM_CAR' ||
    isWalkingInQueue;
  const isDancing =
    !isWalking && (guest.state === 'DANCING' || guest.state === 'DANCER_MOVES');
  const isFreestyleMove = guest.state === 'DANCER_MOVES';
  const activeMove: DancerMoveVariant = guest.danceMove || 'SHUFFLE_STEP';

  // Deterministic character appearance seed from guest ID & name
  const seed =
    guest.name.charCodeAt(0) * 13 +
    (guest.name.charCodeAt(1) || 7) * 7 +
    (guest.id.charCodeAt(guest.id.length - 1) || 3);
  const skinTone = SKIN_TONES[seed % SKIN_TONES.length];
  const hairVariant = seed % 6; // 0: Cap, 1: Voluminous Afro, 2: Spiky Neon, 3: Knit Beanie, 4: Double Buns, 5: Sleek Bob
  const hasNeonVisor = seed % 7 === 0;
  const isDressOutfit = seed % 4 === 2;

  // Determine exact seated vs standing posture from guest.seatPosture (with coordinate fallback)
  const isAtChairOrSofaZone =
    gx < 0.75 || // Left-wall tufted purple VIP lounge sofa cushions
    (gx > 7.45 && gy > 6.35) || // Corner VIP velvet booth
    // Seated club chair slots beside high-top bistro cocktail tables
    (Math.abs(gx - 1.14) < 0.25 && Math.abs(gy - 7.52) < 0.25) ||
    (Math.abs(gx - 1.86) < 0.25 && Math.abs(gy - 7.48) < 0.25) ||
    (Math.abs(gx - 4.14) < 0.25 && Math.abs(gy - 7.52) < 0.25) ||
    (Math.abs(gx - 4.86) < 0.25 && Math.abs(gy - 7.48) < 0.25);

  const isSittingOnBarStool =
    !isWalking &&
    (guest.seatPosture === 'SITTING_STOOL' ||
      (!guest.seatPosture && guest.state === 'ORDERING_DRINK' && gx > 6.8));

  const isSittingInChair =
    !isWalking &&
    !isSittingOnBarStool &&
    (guest.seatPosture === 'SITTING_CHAIR' ||
      guest.seatPosture === 'SITTING_SOFA' ||
      (!guest.seatPosture &&
        guest.state === 'RESTING_AT_SEAT' &&
        (isAtChairOrSofaZone || guest.id.includes('chair') || guest.id.includes('seat'))));

  const isSittingAny = isSittingInChair || isSittingOnBarStool;

  const isStandingAtTable =
    !isWalking &&
    !isSittingAny &&
    (guest.seatPosture === 'STANDING_TABLE' ||
      guest.seatPosture === 'STANDING_BAR' ||
      guest.state === 'ORDERING_DRINK' ||
      guest.state === 'RESTING_AT_SEAT');

  // Smooth, relaxed half-tempo musical groove angular frequency (~2.6 rad/sec at 124 BPM -> ~0.83 gentle bobs/sec)
  const grooveOmega = (Math.max(90, Math.min(160, clubBpm)) / 60) * Math.PI * 0.82;
  const phase = t * grooveOmega + (guest.dancePhaseOffset ?? (gx * 2.1 + gy * 1.7));
  const beatSin = Math.sin(phase);
  const beatCos = Math.cos(phase);
  const halfBeatSin = Math.sin(phase * 0.5);

  // Walking kinematics (calm, natural stride when moving along path)
  const walkPhase = t * 5.6 + seed;
  const walkSin = isWalking ? Math.sin(walkPhase) : 0;
  const walkCos = isWalking ? Math.cos(walkPhase) : 0;

  // Vertical hip/torso offset:
  // - Bar stool cushion is high (-12 * scale), so seatDrop = -1.6 * scale places hips right on the high bar stool cushion!
  // - Club chair / VIP sofa cushion is lower (-10 * scale), so seatDrop = -5.4 * scale places hips right on the chair/sofa cushion!
  const seatDrop = isSittingOnBarStool
    ? -1.6 * scale
    : isSittingInChair
    ? -5.4 * scale
    : 0;

  let bounce =
    (isWalking
      ? Math.abs(walkSin) * 1.65
      : isSittingAny
      ? Math.sin(t * 1.8 + seed) * 0.42
      : Math.sin(t * 2.1 + gx) * 0.72) *
      scale +
    seatDrop;
  let swayX = isStandingAtTable
    ? Math.sin(t * 1.45 + seed) * 0.85 * scale
    : isSittingAny
    ? Math.sin(t * 1.2 + seed) * 0.35 * scale
    : 0;
  let bodyScaleX = 1;
  let leftLegDx = isWalking ? walkSin * 2.5 * scale : 0;
  let rightLegDx = isWalking ? -walkSin * 2.5 * scale : 0;
  let leftLegLift = isWalking ? Math.max(0, walkCos) * 1.7 * scale : 0;
  let rightLegLift = isWalking ? Math.max(0, -walkCos) * 1.7 * scale : 0;
  let leftHandOffsetX = (-9.5 + (isWalking ? -walkSin * 2.1 : 0)) * scale;
  let leftHandOffsetY = -16.5 * scale;
  let rightHandOffsetX = (6.5 + (isWalking ? walkSin * 2.1 : 0)) * scale;
  let rightHandOffsetY = -16.5 * scale;
  let headTiltX =
    isSittingAny || isStandingAtTable
      ? Math.sin(t * 1.55 + seed) * 0.85 * scale
      : isWalking
      ? (guest.facingDir === 'NW' || guest.facingDir === 'SW' ? -0.9 : 0.9) * scale
      : 0;
  let moveRingColor = isSittingAny
    ? '#c084fc'
    : isStandingAtTable
    ? '#38bdf8'
    : 'rgba(255, 255, 255, 0.35)';

  // Facing direction sign: -1 faces left/up-left (NW/SW toward bar or table), +1 faces right/down-right (SE/NE)
  const seatDir =
    guest.facingDir === 'NW' || guest.facingDir === 'SW'
      ? -1
      : guest.facingDir === 'SE' || guest.facingDir === 'NE'
      ? 1
      : gx < 4.5
      ? 1
      : -1;

  if (isSittingOnBarStool) {
    // Seated on a high cushioned bar stool facing the bar counter: one hand resting on counter/lap, other sipping cocktail
    const sipWave = Math.max(0, Math.sin(t * 1.65 + seed)) * 2.4;
    leftHandOffsetX = (-7.5 + seatDir * 1.5) * scale;
    leftHandOffsetY = (-17.2 - sipWave * 0.6) * scale;
    rightHandOffsetX = (6.8 + seatDir * 1.2) * scale;
    rightHandOffsetY = (-18.0 - sipWave) * scale;
  } else if (isSittingInChair) {
    // Relaxed seated arm posture on chair or VIP sofa: left hand resting on cushion/lap, right hand holding drink or gesturing in chat
    const chatWave = Math.sin(t * 1.9 + seed) * 1.1;
    leftHandOffsetX = -7.6 * scale;
    leftHandOffsetY = -14.4 * scale;
    rightHandOffsetX = (7.2 + seatDir * 0.8) * scale;
    rightHandOffsetY = (-16.8 + chatWave) * scale;
  } else if (isStandingAtTable) {
    // Natural bar / high-top table standing posture: subtle weight shift, holding cocktail glass at table height & chatting
    const gestureWave = Math.sin(t * 2.1 + seed) * 1.15;
    leftHandOffsetX = -8.6 * scale;
    leftHandOffsetY = (-15.8 + Math.cos(t * 1.7 + seed) * 0.6) * scale;
    rightHandOffsetX = 8.4 * scale;
    rightHandOffsetY = (-18.6 + gestureWave) * scale;
  } else if (isDancing) {
    if (!isFreestyleMove || activeMove === 'SHUFFLE_STEP') {
      // Smooth side-to-side club shuffle & gentle head bob
      bounce = Math.abs(beatSin) * 2.4 * scale;
      swayX = halfBeatSin * 2.2 * scale;
      leftLegDx = beatSin * 1.8 * scale;
      rightLegDx = -beatSin * 1.8 * scale;
      leftLegLift = Math.max(0, beatSin) * 1.8 * scale;
      rightLegLift = Math.max(0, -beatSin) * 1.8 * scale;
      leftHandOffsetX = (-10.2 + beatCos * 1.4) * scale;
      leftHandOffsetY = (-17.5 - beatSin * 2.2) * scale;
      rightHandOffsetX = (7.0 - beatCos * 1.4) * scale;
      rightHandOffsetY = (-17.5 + beatSin * 2.2) * scale;
      headTiltX = beatSin * 1.1 * scale;
      moveRingColor = '#22d3ee';
    } else if (activeMove === 'FIST_PUMP') {
      // Relaxed rhythmic bass fist pump
      bounce = Math.abs(beatSin) * 2.8 * scale;
      swayX = beatCos * 1.2 * scale;
      const pumpUp = Math.max(0, beatSin) * 6.5 * scale;
      const altPumpUp = Math.max(0, -beatSin) * 4.5 * scale;
      leftHandOffsetX = -10.0 * scale;
      leftHandOffsetY = -18.5 * scale - altPumpUp;
      rightHandOffsetX = 7.6 * scale;
      rightHandOffsetY = -20.5 * scale - pumpUp;
      headTiltX = beatCos * 1.2 * scale;
      moveRingColor = '#f43f5e';
    } else if (activeMove === 'SPIN_TWIRL') {
      // Smooth groove turn & arm sway
      bounce = (1.2 + Math.abs(beatSin) * 2.4) * scale;
      bodyScaleX = 0.76 + 0.24 * Math.abs(beatCos);
      swayX = beatSin * 2.0 * scale;
      const armSpan = beatCos * 4.5 * scale;
      leftHandOffsetX = -6.5 * scale - armSpan;
      leftHandOffsetY = (-19.5 + beatSin * 1.8) * scale;
      rightHandOffsetX = 3.5 * scale + armSpan;
      rightHandOffsetY = (-19.5 - beatSin * 1.8) * scale;
      headTiltX = beatSin * 1.4 * scale;
      moveRingColor = '#e879f9';
    } else if (activeMove === 'BREAKDANCE_WAVE') {
      // Smooth electro arm wave
      bounce = Math.abs(beatCos) * 2.2 * scale;
      swayX = beatSin * 2.6 * scale;
      leftHandOffsetX = (-11.0 + beatCos * 1.4) * scale;
      leftHandOffsetY = (-19.5 + Math.sin(phase - 0.8) * 3.8) * scale;
      rightHandOffsetX = (8.0 + beatCos * 1.4) * scale;
      rightHandOffsetY = (-19.5 + Math.sin(phase + 0.8) * 3.8) * scale;
      headTiltX = Math.sin(phase + 0.5) * 1.5 * scale;
      moveRingColor = '#a855f7';
    } else if (activeMove === 'CYBER_JUMP') {
      // Upbeat two-hand groove bounce
      const jumpPeak = Math.max(0, beatSin);
      bounce = (jumpPeak * 3.6 + Math.abs(beatCos) * 1.0) * scale;
      leftLegLift = jumpPeak * 2.0 * scale;
      rightLegLift = jumpPeak * 2.0 * scale;
      leftHandOffsetX = (-10.8 - jumpPeak * 1.2) * scale;
      leftHandOffsetY = (-22.0 - jumpPeak * 3.8) * scale;
      rightHandOffsetX = (7.8 + jumpPeak * 1.2) * scale;
      rightHandOffsetY = (-22.0 - jumpPeak * 3.8) * scale;
      moveRingColor = '#4ade80';
    }

    // Dynamic 10-15s Synchronized Group Dancing movement patterns & cohesive crew formation offset
    if (guest.groupDanceId && (guest.groupDanceTimer ?? 0) > 0) {
      const pattern = guest.groupDancePattern || 'CIRCLE_GROOVE';
      if (pattern === 'CIRCLE_GROOVE') {
        swayX += Math.cos(phase * 0.5) * 4.4 * scale;
        bounce += Math.sin(phase * 0.5) * 1.6 * scale;
      } else if (pattern === 'LINE_SHUFFLE') {
        swayX += Math.sin(phase * 0.5) * 5.2 * scale;
        bodyScaleX = Math.cos(phase * 0.5) >= 0 ? Math.abs(bodyScaleX) : -Math.abs(bodyScaleX);
      } else if (pattern === 'BOUNCE_WAVE') {
        swayX += Math.sin(phase) * 3.4 * scale;
        bounce += Math.max(0, Math.sin(phase)) * 2.2 * scale;
      }
    }
  }

  // Dynamic Bass Drop Ripple Wave Crowd Excitation: guests jump & throw both hands up in the air as the shockwave passes beneath them!
  const charRipple = !isExteriorGuestState(guest.state)
    ? computeBassDropRippleExcitation(gx, gy, bassRipples, guest.floor)
    : { intensity: 0, crestSign: 0, primaryColor: '#22d3ee', secondaryColor: '#e879f9' };
  if (charRipple.intensity > 0.03) {
    const waveJump =
      (isSittingAny ? 2.4 : isDancing ? 8.8 : 5.8) * charRipple.intensity * scale;
    bounce += waveJump;
    const handsRaise = (isSittingAny ? 5.6 : 10.8) * charRipple.intensity * scale;
    leftHandOffsetY -= handsRaise;
    rightHandOffsetY -= handsRaise;
    leftHandOffsetX -= 2.4 * charRipple.intensity * scale;
    rightHandOffsetX += 2.4 * charRipple.intensity * scale;
    if (!isSittingAny) {
      leftLegLift += 2.8 * charRipple.intensity * scale;
      rightLegLift += 2.8 * charRipple.intensity * scale;
    }
    moveRingColor = charRipple.primaryColor;
  }

  // 0. Soft Contact Shadow (plus soft lineless neon glow for synchronized Group Dancers & passing Bass Drop Ripple Halo)
  const shadowY = isSittingOnBarStool
    ? py - 12.2 * scale
    : isSittingInChair
    ? py - 9.8 * scale
    : py;

  if (charRipple.intensity > 0.04) {
    ctx.save();
    const haloRx = (12.5 + charRipple.intensity * 8.5) * scale;
    const haloRy = (6.2 + charRipple.intensity * 4.2) * scale;
    const haloGrad = ctx.createRadialGradient(
      px + swayX * 0.5,
      shadowY,
      1.2 * scale,
      px + swayX * 0.5,
      shadowY,
      haloRx
    );
    haloGrad.addColorStop(0, '#ffffff');
    haloGrad.addColorStop(0.42, charRipple.primaryColor);
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.globalAlpha = Math.min(0.88, charRipple.intensity * 0.92);
    ctx.beginPath();
    ctx.ellipse(px + swayX * 0.5, shadowY, haloRx, haloRy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (1.4 + charRipple.intensity * 1.4) * scale;
    ctx.globalAlpha = Math.min(0.95, charRipple.intensity);
    ctx.beginPath();
    ctx.ellipse(
      px + swayX * 0.5,
      shadowY,
      haloRx * 0.78,
      haloRy * 0.78,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  if (isDancing && guest.groupDanceId && (guest.groupDanceTimer ?? 0) > 0) {
    ctx.save();
    ctx.fillStyle = moveRingColor;
    ctx.globalAlpha = 0.22 + 0.12 * Math.max(0, beatSin);
    ctx.beginPath();
    ctx.ellipse(
      px + swayX * 0.5,
      shadowY,
      12.5 * scale,
      6.2 * scale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // Persistent Golden VIP Whale Glowing Aura for guests whose cumulative cashSpent exceeds the club average
  if (isVipWhale || guest.isWhale) {
    const whalePulse = 0.92 + 0.12 * Math.sin(t * 3.6 + seed);
    const auraCenterX = px + swayX;
    const auraCenterY = py - 19 * scale - bounce;
    const auraRadius = 18.5 * scale * whalePulse;

    ctx.save();
    // 1. Smooth radial golden aura halo behind the guest sprite body
    const auraGrad = ctx.createRadialGradient(
      auraCenterX,
      auraCenterY,
      2.5 * scale,
      auraCenterX,
      auraCenterY,
      auraRadius
    );
    auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
    auraGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.18)');
    auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(auraCenterX, auraCenterY, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Soft diffused golden floor glow ring under the whale's feet
    const floorGlowGrad = ctx.createRadialGradient(
      px + swayX * 0.5,
      shadowY,
      1 * scale,
      px + swayX * 0.5,
      shadowY,
      12.5 * scale * whalePulse
    );
    floorGlowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
    floorGlowGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.22)');
    floorGlowGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = floorGlowGrad;
    ctx.beginPath();
    ctx.ellipse(
      px + swayX * 0.5,
      shadowY,
      12.5 * scale * whalePulse,
      6.4 * scale * whalePulse,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.lineWidth = Math.max(1, 1.15 * scale);
    ctx.beginPath();
    ctx.ellipse(
      px + swayX * 0.5,
      shadowY,
      9.4 * scale * whalePulse,
      4.7 * scale * whalePulse,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(
    px + swayX * 0.5,
    shadowY,
    (isSittingAny ? 6.4 : 8.6) * scale,
    (isSittingAny ? 3.2 : 4.3) * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const torsoW = 14.0 * scale * bodyScaleX;
  const cx = px + swayX;

  // 1. Legs & Trendy Streetwear Sneakers (Clean lineless fill — no internal seam lines at knees or ankles)
  const legW = 4.1 * scale * Math.max(0.75, bodyScaleX);

  if (isSittingOnBarStool) {
    const thighY = py - 13.2 * scale;
    const leftKneeX = cx - 3.0 * scale + seatDir * 3.8 * scale;
    const rightKneeX = cx + 1.2 * scale + seatDir * 3.8 * scale;

    // Horizontal thighs on the bar stool cushion
    fillStrokeRoundedRect(
      ctx,
      Math.min(cx - 3.8 * scale, leftKneeX),
      thighY,
      6.0 * scale,
      3.6 * scale,
      1.5 * scale,
      guest.pantsColor
    );
    fillStrokeRoundedRect(
      ctx,
      Math.min(cx + 0.4 * scale, rightKneeX),
      thighY + 0.5 * scale,
      6.0 * scale,
      3.6 * scale,
      1.5 * scale,
      guest.pantsColor
    );

    // Lower legs angled down to the bar stool footrest ring
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 1.7 * scale,
      thighY + 1.8 * scale,
      3.6 * scale,
      5.6 * scale,
      1.4 * scale,
      guest.pantsColor
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 1.7 * scale,
      thighY + 2.3 * scale,
      3.6 * scale,
      5.6 * scale,
      1.4 * scale,
      guest.pantsColor
    );

    // Sneakers resting on the bar stool's chrome footrest ring
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 2.0 * scale,
      thighY + 6.4 * scale,
      4.6 * scale,
      2.6 * scale,
      1.1 * scale,
      '#f8fafc'
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 2.0 * scale,
      thighY + 6.9 * scale,
      4.6 * scale,
      2.6 * scale,
      1.1 * scale,
      '#f8fafc'
    );
  } else if (isSittingInChair) {
    const thighY = py - 9.8 * scale;
    const leftKneeX = cx - 3.2 * scale + seatDir * 4.2 * scale;
    const rightKneeX = cx + 1.4 * scale + seatDir * 4.2 * scale;

    // Horizontal thighs on the seat cushion
    fillStrokeRoundedRect(
      ctx,
      Math.min(cx - 4.2 * scale, leftKneeX),
      thighY,
      6.4 * scale,
      3.8 * scale,
      1.6 * scale,
      guest.pantsColor
    );
    fillStrokeRoundedRect(
      ctx,
      Math.min(cx + 0.4 * scale, rightKneeX),
      thighY + 0.6 * scale,
      6.4 * scale,
      3.8 * scale,
      1.6 * scale,
      guest.pantsColor
    );

    // Bent lower calves hanging down from the cushion front edge
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 1.8 * scale,
      thighY + 2.0 * scale,
      3.8 * scale,
      5.8 * scale,
      1.5 * scale,
      guest.pantsColor
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 1.8 * scale,
      thighY + 2.6 * scale,
      3.8 * scale,
      5.8 * scale,
      1.5 * scale,
      guest.pantsColor
    );

    // Seated sneakers resting near the base of the chair/sofa
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 2.1 * scale,
      thighY + 6.6 * scale,
      4.8 * scale,
      2.7 * scale,
      1.1 * scale,
      '#f8fafc'
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 2.1 * scale,
      thighY + 7.2 * scale,
      4.8 * scale,
      2.7 * scale,
      1.1 * scale,
      '#f8fafc'
    );
  } else {
    // Standing / Walking / Dancing Upright Legs
    const leftLegX = cx - 4.8 * scale * bodyScaleX + leftLegDx;
    const leftLegY = py - 11.2 * scale - bounce * 0.4 - leftLegLift;
    const rightLegX = cx + 0.8 * scale * bodyScaleX + rightLegDx;
    const rightLegY = py - 11.2 * scale - bounce * 0.4 - rightLegLift;

    fillStrokeRoundedRect(
      ctx,
      leftLegX,
      leftLegY,
      legW,
      9.5 * scale,
      1.8 * scale,
      guest.pantsColor
    );
    fillStrokeRoundedRect(
      ctx,
      rightLegX,
      rightLegY,
      legW,
      9.5 * scale,
      1.8 * scale,
      guest.pantsColor
    );

    // White/Neon Streetwear Sneakers
    fillStrokeRoundedRect(
      ctx,
      leftLegX - 0.5 * scale,
      leftLegY + 7.5 * scale,
      legW + 1.2 * scale,
      3.0 * scale,
      1.2 * scale,
      '#f8fafc'
    );
    fillStrokeRoundedRect(
      ctx,
      rightLegX - 0.5 * scale,
      rightLegY + 7.5 * scale,
      legW + 1.2 * scale,
      3.0 * scale,
      1.2 * scale,
      '#f8fafc'
    );
  }

  // 2. Arms & Stylized Chibi Hands (Clean lineless fill)
  const leftHandX = cx + leftHandOffsetX;
  const leftHandY = py + leftHandOffsetY - bounce;
  const rightHandX = cx + rightHandOffsetX;
  const rightHandY = py + rightHandOffsetY - bounce;

  ctx.strokeStyle = guest.shirtColor;
  ctx.lineWidth = 3.8 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5.8 * scale * bodyScaleX, py - 21 * scale - bounce);
  ctx.lineTo(leftHandX + 1.6 * scale, leftHandY + 1.6 * scale);
  ctx.moveTo(cx + 5.8 * scale * bodyScaleX, py - 21 * scale - bounce);
  ctx.lineTo(rightHandX + 1.6 * scale, rightHandY + 1.6 * scale);
  ctx.stroke();

  fillStrokeRoundedRect(
    ctx,
    leftHandX,
    leftHandY,
    3.6 * scale,
    3.6 * scale,
    1.2 * scale,
    skinTone
  );
  fillStrokeRoundedRect(
    ctx,
    rightHandX,
    rightHandY,
    3.6 * scale,
    3.6 * scale,
    1.2 * scale,
    skinTone
  );

  // When Seated on a Bar Stool, Standing at a High-Top Table / Bar Counter, or Seated with a Drink, draw a glowing cocktail glass in hand
  if (isSittingOnBarStool || isStandingAtTable || (isSittingInChair && seed % 2 === 0)) {
    const drinkColor = seed % 3 === 0 ? '#22d3ee' : seed % 3 === 1 ? '#f43f5e' : '#facc15';
    const gxGlass = rightHandX + 2.4 * scale;
    const gyGlass = rightHandY - 2.2 * scale;
    fillStrokeRoundedRect(
      ctx,
      gxGlass - 2.2 * scale,
      gyGlass - 3.6 * scale,
      4.4 * scale,
      5.2 * scale,
      1.2 * scale,
      drinkColor
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gxGlass - 1.2 * scale, gyGlass - 3.0 * scale, 2.4 * scale, 1.1 * scale);
  }

  // 3. Chibi Streetwear Torso (Clean lineless fill)
  fillStrokeRoundedRect(
    ctx,
    cx - torsoW * 0.5,
    py - 24.5 * scale - bounce,
    torsoW,
    (isDressOutfit && !isSittingAny ? 16.0 : 14.0) * scale,
    4.5 * scale,
    guest.shirtColor
  );

  // Streetwear Vest / Graphic Hoodie Accents
  if (seed % 3 === 1) {
    fillStrokeRoundedRect(
      ctx,
      cx - 2.4 * scale * bodyScaleX,
      py - 24.0 * scale - bounce,
      4.8 * scale * bodyScaleX,
      13.0 * scale,
      1.4 * scale,
      '#f8fafc'
    );
  } else if (seed % 3 === 2) {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(
      cx - 4.5 * scale * bodyScaleX,
      py - 19.5 * scale - bounce,
      9 * scale * bodyScaleX,
      2.2 * scale
    );
  }

  // 4. Oversized Rounded Chibi Head (Clean lineless fill)
  const headX = cx + headTiltX;
  const headY = py - 34.2 * scale - bounce;
  const headR = 9.0 * scale;

  // If Voluminous Afro (hairVariant === 1), draw the back Afro puff Halo behind the head first
  if (hairVariant === 1) {
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 2.2 * scale, headR + 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rounded Chibi Face
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 5. Distinct Stylish Hairstyles & Headgear (Clean lineless fill — no stroke lines across forehead!)
  if (hairVariant === 0) {
    // Trendy Streetwear Baseball Cap with Visor
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(headX, headY - 2 * scale, headR + 0.4 * scale, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    fillStrokeRoundedRect(
      ctx,
      headX + 0.5 * scale,
      headY - 4.0 * scale,
      9.8 * scale,
      3.2 * scale,
      1.5 * scale,
      '#0284c7'
    );
  } else if (hairVariant === 1) {
    // Voluminous Afro Front Hairline Bangs
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 3.2 * scale, headR - 0.5 * scale, Math.PI * 1.05, -Math.PI * 0.05);
    ctx.fill();
  } else if (hairVariant === 2) {
    // Spiky Neon Anime/Club Hair
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.moveTo(headX - 8.5 * scale, headY - 2 * scale);
    ctx.lineTo(headX - 10.5 * scale, headY - 9.5 * scale);
    ctx.lineTo(headX - 4 * scale, headY - 7.5 * scale);
    ctx.lineTo(headX - 1 * scale, headY - 13.5 * scale);
    ctx.lineTo(headX + 3.5 * scale, headY - 8 * scale);
    ctx.lineTo(headX + 9.5 * scale, headY - 10.5 * scale);
    ctx.lineTo(headX + 8.5 * scale, headY - 2 * scale);
    ctx.closePath();
    ctx.fill();
  } else if (hairVariant === 3) {
    // Ribbed Knit Street Beanie
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(headX, headY - 2.5 * scale, headR + 0.5 * scale, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    fillStrokeRoundedRect(
      ctx,
      headX - 9.2 * scale,
      headY - 5.5 * scale,
      18.4 * scale,
      4.0 * scale,
      2 * scale,
      '#f472b6'
    );
  } else if (hairVariant === 4) {
    // Stylish Double Space Buns + Bangs
    ctx.fillStyle = guest.hairColor;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(headX + side * 7.2 * scale, headY - 7.8 * scale, 3.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(headX, headY - 2.2 * scale, headR + 0.3 * scale, Math.PI * 0.95, Math.PI * 0.05);
    ctx.fill();
  } else {
    // Sleek Side-Swept Club Hair
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 2.0 * scale, headR + 0.5 * scale, Math.PI * 0.92, Math.PI * 0.08);
    ctx.fill();
  }

  // 6. Crisp Dot Eyes or Glowing Cyber Visor Sunglasses
  const eyeShift = headTiltX * 0.35;
  if (hasNeonVisor || guest.isCelebrity) {
    fillStrokeRoundedRect(
      ctx,
      headX - 6.2 * scale + eyeShift,
      headY - 1.5 * scale,
      12.4 * scale,
      3.8 * scale,
      1.5 * scale,
      guest.isCelebrity ? '#facc15' : '#22d3ee'
    );
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(headX - 3.0 * scale + eyeShift, headY + 0.6 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.arc(headX + 3.0 * scale + eyeShift, headY + 0.6 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX - 3.4 * scale + eyeShift, headY + 0.1 * scale, 0.55 * scale, 0, Math.PI * 2);
    ctx.arc(headX + 2.6 * scale + eyeShift, headY + 0.1 * scale, 0.55 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Small, Persistent '★ VIP' Badge for Above-Average Spending Whales
  const hasActiveBubble = Boolean(guest.bubble && (guest.bubbleTimer ?? 0) > 0);
  const showWhaleVisuals = Boolean(isVipWhale || guest.isWhale);
  if (showWhaleVisuals) {
    const badgeW = 23.5 * scale;
    const badgeH = 9.2 * scale;
    const badgeX = headX - badgeW * 0.5;
    // Place neatly above the head; if a temporary event bubble is active, position the bubble slightly higher so both are crystal clear
    const badgeY = headY - headR - 11.2 * scale;

    ctx.save();
    fillStrokeRoundedRect(
      ctx,
      badgeX,
      badgeY,
      badgeW,
      badgeH,
      4.5 * scale,
      'rgba(19, 13, 36, 0.94)',
      '#facc15',
      Math.max(1, 1.2 * scale)
    );
    ctx.fillStyle = '#fde047';
    ctx.font = `900 ${Math.max(6, Math.round(6.2 * scale))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ VIP', headX, badgeY + badgeH * 0.52);
    ctx.restore();
  }

  // 8. Clean Event-Driven Speech / Thought Bubbles (Only shown when guest has an active event bubble)
  if (hasActiveBubble && guest.bubble) {
    const bubbleOffsetY = showWhaleVisuals ? headY - 27 * scale : headY - 19 * scale;
    drawIllustratedSpeechBubble(ctx, headX, bubbleOffsetY, scale * 0.88, guest.bubble);
  }
}

const drawIllustratedCharacter = drawCharacter;

/**
 * Draws the dark translucent rounded patron quote card ("MIA H. / I think I'm in love.")
 * without border or outline lines.
 */
function drawPatronQuoteTooltip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  name: string,
  quote: string,
  showHearts: boolean = false
) {
  ctx.save();
  const s = Math.max(0.85, scale);
  const boxW = Math.max(92, Math.min(138, quote.length * 4.2)) * s;
  const boxH = 26 * s;

  fillStrokeRoundedRect(
    ctx,
    x - boxW / 2,
    y - boxH / 2,
    boxW,
    boxH,
    6 * s,
    'rgba(13, 13, 20, 0.92)'
  );

  ctx.fillStyle = '#38bdf8';
  ctx.font = `900 ${Math.max(7, Math.round(7.5 * s))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y - 3 * s);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 ${Math.max(7, Math.round(7.2 * s))}px "Outfit", sans-serif`;
  ctx.fillText(quote, x, y + 7.5 * s);

  if (showHearts) {
    const hearts = [
      { dx: -6, dy: 18, r: 3.2 },
      { dx: 0, dy: 15, r: 3.8 },
      { dx: 6, dy: 18, r: 3.2 },
    ];
    for (const h of hearts) {
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(x + h.dx * s, y + h.dy * s, h.r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws the circular white/gold/purple speech & thought bubbles WITHOUT any outline/stroke lines or internal tail seam lines.
 */
function drawIllustratedSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  bubble: BubbleType
) {
  ctx.save();
  const s = Math.max(0.82, scale);

  const isCashCoin = bubble === 'CASH';
  const isPurpleStar = bubble === 'SPARKLE';
  const r = (isCashCoin || isPurpleStar ? 8.5 : 11.5) * s;

  // Soft drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.beginPath();
  ctx.arc(x, y + 1.5 * s, r, 0, Math.PI * 2);
  ctx.fill();

  // Main Circular Bubble (clean lineless fill — no stroke lines!)
  ctx.fillStyle = isCashCoin ? '#eab308' : isPurpleStar ? '#581c87' : '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Seamless bottom pointer tail for large white thought/speech bubbles (filled only, no internal or border stroke lines!)
  if (!isCashCoin && !isPurpleStar) {
    ctx.beginPath();
    ctx.moveTo(x - 3.4 * s, y + r - 1.5 * s);
    ctx.lineTo(x, y + r + 4.2 * s);
    ctx.lineTo(x + 3.4 * s, y + r - 1.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  if (bubble === 'MUSIC') {
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(13.5 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', x, y + 0.5 * s);
  } else if (bubble === 'VIP_CROWN') {
    // Golden Crown inside White Circle (clean lineless fill)
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y + 3.5 * s);
    ctx.lineTo(x - 6.5 * s, y - 3.5 * s);
    ctx.lineTo(x - 2.5 * s, y - 0.5 * s);
    ctx.lineTo(x, y - 5 * s);
    ctx.lineTo(x + 2.5 * s, y - 0.5 * s);
    ctx.lineTo(x + 6.5 * s, y - 3.5 * s);
    ctx.lineTo(x + 5.5 * s, y + 3.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  } else if (bubble === 'CASH') {
    ctx.fillStyle = '#fef08a';
    ctx.font = `900 ${Math.round(11 * s)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 0.5 * s);
  } else if (bubble === 'SPARKLE') {
    ctx.fillStyle = '#facc15';
    ctx.font = `900 ${Math.round(10.5 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x, y + 0.5 * s);
  } else if (bubble === 'BOTTLE_SERVICE') {
    // Golden Champagne Magnum + Sparkler Star inside bubble (clean lineless fill)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(x - 2.2 * s, y - 2.2 * s, 4.4 * s, 7.0 * s, 1.2 * s);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 1.1 * s, y - 5.4 * s, 2.2 * s, 3.4 * s);
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(x + 4.0 * s, y - 3.8 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (bubble === 'EXCLAMATION') {
    ctx.fillStyle = '#ec4899';
    ctx.font = `900 ${Math.round(13 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 0.5 * s);
  } else if (bubble === 'COCKTAIL' || bubble === 'BEER') {
    // Neon Cocktail Martini Glass (clean filled silhouette without stroke lines)
    const glassCol = bubble === 'COCKTAIL' ? '#ec4899' : '#0284c7';
    ctx.fillStyle = glassCol;
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y - 4.5 * s);
    ctx.lineTo(x + 5.5 * s, y - 4.5 * s);
    ctx.lineTo(x, y + 1 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(x - 0.7 * s, y + 0.6 * s, 1.4 * s, 4.8 * s);
    ctx.fillRect(x - 3.5 * s, y + 4.8 * s, 7.0 * s, 1.3 * s);
  } else {
    ctx.fillStyle = '#ef4444';
    ctx.font = `900 ${Math.round(14 * s)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 0.5 * s);
  }

  ctx.restore();
}

// ============================================================================
// GLOBAL DAY/NIGHT CYCLE & PLACED ITEM NEON EMISSIVE GLOW ENGINE (60FPS)
// ============================================================================

interface InternalDayNightState extends DayNightCycleReport {
  skyTop: string;
  skyUpperMid: string;
  skyLowerMid: string;
  skyHorizon: string;
  ambientOverlayColor: string;
}

function lerpChannel(a: number, b: number, u: number): number {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, u)));
}

function lerpRgbHex(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  u: number
): string {
  return `rgb(${lerpChannel(r1, r2, u)}, ${lerpChannel(g1, g2, u)}, ${lerpChannel(b1, b2, u)})`;
}

function computeDayNightCycleState(rawHour: number): InternalDayNightState {
  const hour = ((rawHour % 24) + 24) % 24;

  // Format 12-hour clock string (e.g. "11:45 PM")
  const wholeHour = Math.floor(hour);
  const mins = Math.floor((hour - wholeHour) * 60);
  const ampm = wholeHour >= 12 ? 'PM' : 'AM';
  const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12;
  const formattedTime = `${displayHour}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;

  // Compute smooth nightIntensity (0.0 at Golden Sunset 16:00, rising to 1.0 at Midnight 00:00..02:30)
  // Using a shifted cosine curve peaking at 01:00 AM and lowest at 13:00 PM
  const rad = ((hour - 1.0) / 24) * Math.PI * 2;
  const rawCos = (Math.cos(rad) + 1) * 0.5; // 1.0 at 1:00 AM, 0.0 at 1:00 PM
  const nightIntensity = Math.max(0.08, Math.min(1.0, Math.pow(rawCos, 0.85)));
  const emissiveMultiplier = +(1.0 + nightIntensity * 1.25).toFixed(2);

  let phaseLabel: DayNightCycleReport['phaseLabel'] = 'TWILIGHT DUSK';
  if (hour >= 22.5 || hour < 2.2) {
    phaseLabel = 'MIDNIGHT NEON PEAK';
  } else if (hour >= 2.2 && hour < 5.5) {
    phaseLabel = 'AFTERHOURS GLOW';
  } else if (hour >= 5.5 && hour < 11.5) {
    phaseLabel = 'ELECTRIC DAWN';
  } else if (hour >= 11.5 && hour < 19.2) {
    phaseLabel = 'GOLDEN SUNSET';
  } else {
    phaseLabel = 'TWILIGHT DUSK';
  }

  // Smoothly interpolate sky colors between Sunset/Twilight and Deep Midnight
  const skyTop = lerpRgbHex(38, 18, 74, 8, 4, 22, nightIntensity);
  const skyUpperMid = lerpRgbHex(98, 38, 114, 25, 13, 56, nightIntensity);
  const skyLowerMid = lerpRgbHex(168, 64, 105, 18, 11, 38, nightIntensity);
  const skyHorizon = lerpRgbHex(120, 52, 88, 12, 9, 26, nightIntensity);

  // Subtle warm dusk tint vs deep indigo-black midnight tint
  const isSunsetWindow = hour >= 14 && hour <= 20.5;
  const ambientOverlayColor = isSunsetWindow
    ? `rgba(28, 10, 48, ${(0.12 + nightIntensity * 0.36).toFixed(3)})`
    : `rgba(5, 2, 18, ${(0.16 + nightIntensity * 0.44).toFixed(3)})`;

  return {
    hour,
    formattedTime,
    phaseLabel,
    nightIntensity,
    emissiveMultiplier,
    skyTop,
    skyUpperMid,
    skyLowerMid,
    skyHorizon,
    ambientOverlayColor,
  };
}

/**
 * Global Day/Night Cycle darkening overlay across the isometric canvas.
 * Darkens the exterior street and club walls as night deepens while preserving soft volumetric light
 * pools over the active dance floor and bar counter.
 */
function drawGlobalDayNightOverlay(
  _ctx: CanvasRenderingContext2D,
  _width: number,
  _height: number,
  _originX: number,
  _originY: number,
  _tileW: number,
  _tileH: number,
  _scale: number,
  _cycle: InternalDayNightState
) {
  // Intentionally no radial haze or vignette over the club floor so the 2D Flash/vector art
  // remains 100% sharp, crisp, high-contrast, and clearly visible.
}

/**
 * Natural ambient floor light reflection pass for placed lighting, bar units, and DJ booths.
 */
function drawPlacedItemsNeonEmissivePass(
  ctx: CanvasRenderingContext2D,
  floorItems: PlacedItem[],
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  _cycle: InternalDayNightState,
  _activeDrink: DrinkMix,
  sequencer: RhythmicLightingSequencerState
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  ctx.save();
  for (let i = 0; i < floorItems.length; i++) {
    const item = floorItems[i];
    const cat = getCatalogItem(item.catalogId);
    if (!cat) continue;
    if (
      cat.category !== 'LIGHTING' &&
      cat.category !== 'DJ_BOOTH' &&
      cat.category !== 'BAR_UNIT'
    ) {
      continue;
    }
    const fp = getRotatedFootprint(cat, item.rotation);
    const gx = item.gridX + fp.width * 0.5;
    const gy = item.gridY + fp.depth * 0.5;
    const px = originX + (gx - gy) * halfW;
    const py = originY + (gx + gy) * halfH;
    const radius = Math.max(fp.width, fp.depth) * tileW * 0.68;
    const glowColor = cat.accentColor || '#22d3ee';

    const poolGrad = ctx.createRadialGradient(px, py, 1.5 * scale, px, py, radius);
    poolGrad.addColorStop(0, '#ffffff');
    poolGrad.addColorStop(0.28, glowColor);
    poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = poolGrad;
    ctx.globalAlpha =
      0.26 + 0.08 * Math.sin(t * 2.1 + i) + sequencer.kickEnvelope * 0.08;
    ctx.beginPath();
    ctx.ellipse(px, py, radius, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * BPM-Synced Rhythmic Lighting Sequencer State & Computation
 * Drives the emissive intensity toggles of neon decor items, wall tubes, neon signs,
 * and sunken dance floor tiles in sync with the club's current BPM.
 */
interface RhythmicLightingSequencerState {
  bpm: number;
  beatPhase: number; // 0..1 within current quarter-note beat
  step16: number; // 0..15 sixteenth-note sequencer step
  barStep4: number; // 0..3 quarter-note beat within bar
  kickEnvelope: number; // Sharp exponential decay envelope on each beat hit (0..1)
  danceFloorPulse: number; // Smooth pulsing light wave on the dance floor (0..1)
  vibeRatio: number; // 0.24..1.0 Vibe thermometer normalized level
  vibePulseFreqMultiplier: number; // 1x..4x pulse frequency scaling with Vibe thermometer
  liveAudioStep16: number; // Live 0..15 beat-step from soundEngine
  alternatingStep: number; // Alternating A/B step counter synchronized to BPM, beat-step, and Vibe frequency
  vibeBeatEnvelope: number; // High-frequency beat envelope accelerated by Vibe thermometer (0..1)
  channels: [number, number, number, number]; // 4 rhythmic sequencer channel intensities
  getDecorEmissiveState: (
    gridX: number,
    gridY: number,
    itemIndex?: number
  ) => {
    toggledOn: boolean;
    isToggledOn: boolean;
    emissiveIntensity: number;
    channelIndex: number;
  };
}

function computeRhythmicLightingSequencer(
  t: number,
  clubBpm: number,
  vibeRatio: number = 0.65,
  liveStepFromEngine?: number
): RhythmicLightingSequencerState {
  const safeBpm = Math.max(85, Math.min(180, clubBpm || 124));
  const clampedVibe = Math.max(0.24, Math.min(1, vibeRatio));

  // As the Vibe thermometer rises, increase the alternating pulse frequency multiplier (1x -> 2x -> 3x -> 4x)
  const vibePulseFreqMultiplier =
    clampedVibe >= 0.86 ? 4 : clampedVibe >= 0.68 ? 3 : clampedVibe >= 0.46 ? 2 : 1;

  const beatsPerSec = safeBpm / 60;
  const totalBeats = t * beatsPerSec;
  const beatPhase = totalBeats - Math.floor(totalBeats);
  const barStep4 = Math.floor(totalBeats) % 4;
  const timeStep16 = Math.floor(totalBeats * 4) % 16;
  const step16 =
    typeof liveStepFromEngine === 'number' ? liveStepFromEngine % 16 : timeStep16;

  // Vibe-accelerated beat phase & alternating step counter synchronized to BPM + live beat-step
  const vibeScaledBeats = totalBeats * vibePulseFreqMultiplier;
  const vibeBeatPhase = vibeScaledBeats - Math.floor(vibeScaledBeats);
  const vibeBeatEnvelope = Math.pow(1 - vibeBeatPhase, 1.85);
  const stepSubdivision = Math.max(1, Math.floor(4 / vibePulseFreqMultiplier));
  const alternatingStep =
    Math.floor(step16 / stepSubdivision) + Math.floor(vibeScaledBeats);

  // Punchy exponential decay on each quarter-note beat for realistic club kick-drum light pulsing
  const kickEnvelope = Math.pow(1 - beatPhase, 2.15);
  const halfBeatEnv = Math.pow(1 - ((totalBeats * 2) % 1), 1.85);
  const danceFloorPulse = 0.35 + 0.65 * Math.max(kickEnvelope, vibeBeatEnvelope * 0.85);

  // 4-Channel 16-Step Neon Sequencer Patterns
  const patternCh0 = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0]; // Four-on-the-floor kick pulse
  const patternCh1 = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1]; // Syncopated off-beat synth stab
  const patternCh2 = [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1]; // Alternating checkerboard chase
  const patternCh3 = [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1]; // Bassline arpeggio toggle

  const ch0 = patternCh0[step16] ? 0.85 + 0.75 * kickEnvelope : 0.42 + 0.25 * kickEnvelope;
  const ch1 = patternCh1[step16] ? 0.82 + 0.72 * halfBeatEnv : 0.38 + 0.22 * kickEnvelope;
  const ch2 = patternCh2[step16] ? 0.88 + 0.68 * kickEnvelope : 0.36 + 0.24 * halfBeatEnv;
  const ch3 = patternCh3[step16] ? 0.84 + 0.74 * halfBeatEnv : 0.4 + 0.2 * kickEnvelope;

  const channels: [number, number, number, number] = [ch0, ch1, ch2, ch3];

  return {
    bpm: safeBpm,
    beatPhase,
    step16,
    barStep4,
    kickEnvelope,
    danceFloorPulse,
    vibeRatio: clampedVibe,
    vibePulseFreqMultiplier,
    liveAudioStep16: step16,
    alternatingStep,
    vibeBeatEnvelope,
    channels,
    getDecorEmissiveState(gridX: number, gridY: number, itemIndex: number = 0) {
      const hash = Math.abs(Math.round(gridX * 3 + gridY * 5 + itemIndex)) % 4;
      const activePattern =
        hash === 0
          ? patternCh0
          : hash === 1
          ? patternCh1
          : hash === 2
          ? patternCh2
          : patternCh3;
      const isToggledOn = activePattern[step16] === 1;
      const emissiveIntensity = channels[hash];
      return {
        toggledOn: isToggledOn,
        isToggledOn,
        emissiveIntensity,
        channelIndex: hash,
      };
    },
  };
}

/**
 * Slot-selection, Seat-Availability Verification & Personal-Space Separation Helpers
 * Ensures guests distribute naturally across ALL individual seats at multi-seat tables,
 * VIP booths, and multi-stool bar counters instead of clustering on a single seat.
 */
interface FurnitureSlotCandidate {
  slotId: string;
  parentItemId: string;
  seatIndex: number;
  totalSeatsOnItem: number;
  x: number;
  y: number;
  posture: GuestSeatPosture;
  facingDir: 'NE' | 'NW' | 'SE' | 'SW';
  priority: number; // 2 = seated stool/chair/sofa; 1 = standing companion slot at table/bar
}

const SEAT_CLAIM_STATES = new Set([
  'WALKING_TO_BAR',
  'ORDERING_DRINK',
  'WALKING_TO_SEAT',
  'RESTING_AT_SEAT',
]);

/**
 * Verifies whether a specific seat or bar stool slot is currently unoccupied and unreserved.
 * Checks both explicit `assignedSlotId` reservations (including guests currently walking to the seat)
 * and physical/target coordinate proximity (< 0.36 grid units) so two guests never share or cluster on a single seat.
 */
function isFurnitureSlotAvailable(
  slot: FurnitureSlotCandidate,
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string
): boolean {
  for (let i = 0; i < guests.length; i++) {
    const fg = guests[i];
    if (
      fg.floor !== floor ||
      fg.id === excludeGuestId ||
      fg.state === 'QUEUEING' ||
      fg.state === 'LEAVING'
    ) {
      continue;
    }

    // 1. Explicit slot reservation check
    if (fg.assignedSlotId === slot.slotId && SEAT_CLAIM_STATES.has(fg.state)) {
      return false;
    }

    // 2. Destination waypoint proximity check (guest walking toward this seat)
    const targetPt =
      fg.path.length > 0 ? fg.path[fg.path.length - 1] : { x: fg.gridX, y: fg.gridY };
    if (
      SEAT_CLAIM_STATES.has(fg.state) &&
      Math.hypot(slot.x - targetPt.x, slot.y - targetPt.y) < 0.36
    ) {
      return false;
    }

    // 3. Current physical occupancy check (guest already seated/standing at this slot)
    if (
      (fg.state === 'ORDERING_DRINK' || fg.state === 'RESTING_AT_SEAT') &&
      Math.hypot(slot.x - fg.gridX, slot.y - fg.gridY) < 0.36
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Counts how many seats on each furniture item (`parentItemId`) are currently claimed or occupied
 * so the AI spreads guests across all available seats and tables/bars naturally.
 */
function computeParentItemOccupancyMap(
  candidates: FurnitureSlotCandidate[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cand of candidates) {
    if (!counts.has(cand.parentItemId)) {
      counts.set(cand.parentItemId, 0);
    }
    if (!isFurnitureSlotAvailable(cand, guests, floor, excludeGuestId)) {
      counts.set(cand.parentItemId, (counts.get(cand.parentItemId) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Performs a proximity-based search from `(originX, originY)` across candidate furniture slots,
 * verifying each slot's availability via `isFurnitureSlotAvailable` before attempting to occupy it,
 * while load-balancing across furniture items so sprites distribute evenly across all stools and chairs.
 */
function findNearestVerifiedAvailableSlot(
  candidates: FurnitureSlotCandidate[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate | null {
  if (candidates.length === 0) return null;

  const requestingGuest = guests.find((g) => g.id === excludeGuestId);
  const refX = originX ?? requestingGuest?.gridX ?? DOOR_COORD.x;
  const refY = originY ?? requestingGuest?.gridY ?? DOOR_COORD.y;

  const floorGuests = guests.filter(
    (g) =>
      g.floor === floor &&
      g.id !== excludeGuestId &&
      g.state !== 'QUEUEING' &&
      g.state !== 'LEAVING'
  );

  const itemOccupancy = computeParentItemOccupancyMap(candidates, guests, floor, excludeGuestId);

  // Rank candidates by posture priority (stools/chairs/sofas first), proximity to (refX, refY),
  // even occupancy distribution across multi-seat items, and personal-space separation from other guests
  const rankedCandidates = candidates
    .map((cand) => {
      const distFromOrigin = Math.hypot(cand.x - refX, cand.y - refY);
      let minDistToOtherGuest = Infinity;
      for (const fg of floorGuests) {
        const targetPt =
          fg.path.length > 0 ? fg.path[fg.path.length - 1] : { x: fg.gridX, y: fg.gridY };
        const dCurrent = Math.hypot(cand.x - fg.gridX, cand.y - fg.gridY);
        const dTarget = Math.hypot(cand.x - targetPt.x, cand.y - targetPt.y);
        const d = Math.min(dCurrent, dTarget);
        if (d < minDistToOtherGuest) minDistToOtherGuest = d;
      }

      const occupiedOnItem = itemOccupancy.get(cand.parentItemId) ?? 0;
      const fillRatio =
        cand.totalSeatsOnItem > 0 ? occupiedOnItem / cand.totalSeatsOnItem : 0;
      const separationBonus = Math.min(minDistToOtherGuest, 2.2) * 0.9;

      // Lower searchCost = closer available seat on an evenly balanced stool/chair group
      const searchCost =
        distFromOrigin * 1.15 + fillRatio * 3.4 - separationBonus + Math.random() * 0.25;

      return {
        cand,
        searchCost,
      };
    })
    .sort((a, b) => {
      // 1. Always search seated slots (stools, chairs, VIP sofa cushions: priority 2) before standing overflow (priority 1)
      if (b.cand.priority !== a.cand.priority) {
        return b.cand.priority - a.cand.priority;
      }
      // 2. Proximity + even-distribution search order
      return a.searchCost - b.searchCost;
    });

  // Verify availability of each slot in proximity order before attempting to occupy it
  for (const entry of rankedCandidates) {
    if (isFurnitureSlotAvailable(entry.cand, guests, floor, excludeGuestId)) {
      return entry.cand;
    }
  }

  return null;
}

/**
 * Selects the best available seat or bar slot using proximity-based verification from the guest's position.
 * Falls back to the least-crowded slot only if 100% of slots on the floor are occupied.
 */
function pickBestFurnitureSlot(
  candidates: FurnitureSlotCandidate[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate {
  if (candidates.length === 0) {
    return {
      slotId: 'fallback_slot',
      parentItemId: 'fallback_item',
      seatIndex: 0,
      totalSeatsOnItem: 1,
      x: 4.0,
      y: 4.0,
      posture: 'STANDING_TABLE',
      facingDir: 'SE',
      priority: 0,
    };
  }

  const verifiedNearest = findNearestVerifiedAvailableSlot(
    candidates,
    guests,
    floor,
    excludeGuestId,
    originX,
    originY
  );
  if (verifiedNearest) {
    return verifiedNearest;
  }

  // Fallback when every slot on the floor is occupied: pick the most separated candidate
  const floorGuests = guests.filter(
    (g) =>
      g.floor === floor &&
      g.id !== excludeGuestId &&
      g.state !== 'QUEUEING' &&
      g.state !== 'LEAVING'
  );
  let bestCandidate = candidates[0];
  let bestDist = -Infinity;
  for (const cand of candidates) {
    let minDist = Infinity;
    for (const fg of floorGuests) {
      const d = Math.hypot(cand.x - fg.gridX, cand.y - fg.gridY);
      if (d < minDist) minDist = d;
    }
    if (minDist > bestDist) {
      bestDist = minDist;
      bestCandidate = cand;
    }
  }
  return bestCandidate;
}

/**
 * Enumerates all individual bar stool and standing counter slots across every BAR_UNIT on the floor.
 */
function buildBarSlotCandidates(
  items: PlacedItem[],
  floor: FloorLevel
): FurnitureSlotCandidate[] {
  const barItems = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
  );
  const candidates: FurnitureSlotCandidate[] = [];

  for (const bar of barItems) {
    const cat = getCatalogItem(bar.catalogId);
    if (!cat) continue;
    const fp = getRotatedFootprint(cat, bar.rotation);

    // 1. Add a high-priority SITTING_STOOL slot for EVERY single bar stool drawn by getBarStoolCoords
    const stools = getBarStoolCoords(bar, fp);
    const totalSeats = stools.length + 2;
    for (let idx = 0; idx < stools.length; idx++) {
      const st = stools[idx];
      candidates.push({
        slotId: st.slotId,
        parentItemId: bar.uid,
        seatIndex: idx,
        totalSeatsOnItem: totalSeats,
        x: st.gx,
        y: st.gy,
        posture: 'SITTING_STOOL',
        facingDir: st.facingDir,
        priority: 2,
      });
    }

    // 2. Add two well-separated STANDING_BAR slots at opposite ends of the bar counter when all stools are full
    const alongY = fp.depth > fp.width;
    if (alongY) {
      const standX =
        bar.gridX + fp.width + 0.52 <= 9.25 ? bar.gridX + fp.width + 0.52 : bar.gridX - 0.45;
      candidates.push(
        {
          slotId: `${bar.uid}_stand_end_0`,
          parentItemId: bar.uid,
          seatIndex: stools.length,
          totalSeatsOnItem: totalSeats,
          x: standX,
          y: Math.min(9.15, bar.gridY + fp.depth + 0.14),
          posture: 'STANDING_BAR',
          facingDir: 'NW',
          priority: 1,
        },
        {
          slotId: `${bar.uid}_stand_end_1`,
          parentItemId: bar.uid,
          seatIndex: stools.length + 1,
          totalSeatsOnItem: totalSeats,
          x: standX,
          y: Math.max(0.35, bar.gridY - 0.14),
          posture: 'STANDING_BAR',
          facingDir: 'NW',
          priority: 1,
        }
      );
    } else {
      const standY =
        bar.gridY + fp.depth + 0.52 <= 9.25 ? bar.gridY + fp.depth + 0.52 : bar.gridY - 0.45;
      candidates.push(
        {
          slotId: `${bar.uid}_stand_end_0`,
          parentItemId: bar.uid,
          seatIndex: stools.length,
          totalSeatsOnItem: totalSeats,
          x: Math.min(9.15, bar.gridX + fp.width + 0.14),
          y: standY,
          posture: 'STANDING_BAR',
          facingDir: 'NE',
          priority: 1,
        },
        {
          slotId: `${bar.uid}_stand_end_1`,
          parentItemId: bar.uid,
          seatIndex: stools.length + 1,
          totalSeatsOnItem: totalSeats,
          x: Math.max(0.35, bar.gridX - 0.14),
          y: standY,
          posture: 'STANDING_BAR',
          facingDir: 'NE',
          priority: 1,
        }
      );
    }
  }

  return candidates;
}

/**
 * Enumerates all individual chair, VIP sofa cushion, and cocktail table standing slots across every SEATING item on the floor.
 */
function buildSeatOrTableSlotCandidates(
  items: PlacedItem[],
  floor: FloorLevel
): FurnitureSlotCandidate[] {
  const seatItems = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'SEATING'
  );
  const candidates: FurnitureSlotCandidate[] = [];

  for (const seat of seatItems) {
    const cat = getCatalogItem(seat.catalogId);
    if (!cat) continue;
    const fp = getRotatedFootprint(cat, seat.rotation);

    if (cat.id === 'seat_bistro') {
      // High-top cocktail table at (seat.gridX + 0.50, seat.gridY + 0.50) with 2 cushioned club chairs + 2 standing positions:
      const totalTableSlots = 4;
      // 1) Back-Left Cushioned Club Chair at exact chair coordinate (seat.gridX + 0.14, seat.gridY + 0.52)
      candidates.push({
        slotId: `${seat.uid}_chair_back`,
        parentItemId: seat.uid,
        seatIndex: 0,
        totalSeatsOnItem: totalTableSlots,
        x: seat.gridX + 0.14,
        y: seat.gridY + 0.52,
        posture: 'SITTING_CHAIR',
        facingDir: 'SE',
        priority: 2,
      });
      // 2) Front-Right Cushioned Club Chair at exact chair coordinate (seat.gridX + 0.86, seat.gridY + 0.48)
      candidates.push({
        slotId: `${seat.uid}_chair_front`,
        parentItemId: seat.uid,
        seatIndex: 1,
        totalSeatsOnItem: totalTableSlots,
        x: seat.gridX + 0.86,
        y: seat.gridY + 0.48,
        posture: 'SITTING_CHAIR',
        facingDir: 'NW',
        priority: 2,
      });
      // 3) Standing Cocktail Table Companion Slot in front of the table (never on top of the table!)
      candidates.push({
        slotId: `${seat.uid}_stand_front`,
        parentItemId: seat.uid,
        seatIndex: 2,
        totalSeatsOnItem: totalTableSlots,
        x: seat.gridX + 0.54,
        y: Math.min(9.2, seat.gridY + 0.96),
        posture: 'STANDING_TABLE',
        facingDir: 'NW',
        priority: 1,
      });
      // 4) Standing Cocktail Table Companion Slot on the back-right side of the table
      candidates.push({
        slotId: `${seat.uid}_stand_back`,
        parentItemId: seat.uid,
        seatIndex: 3,
        totalSeatsOnItem: totalTableSlots,
        x: seat.gridX + 0.46,
        y: Math.max(0.35, seat.gridY + 0.06),
        posture: 'STANDING_TABLE',
        facingDir: 'SE',
        priority: 1,
      });
    } else {
      // Tufted Purple VIP Lounge Booth / Couch:
      // Match exact orientation used by drawTable (fp.depth > fp.width = vertical sofa; fp.width >= fp.depth = horizontal sofa)
      const alongY = fp.depth > fp.width;
      if (alongY) {
        // Vertical sofa along Y at X = seat.gridX + 0.28: generate 3 distinct cushion slots across a 2-tile sofa
        const numCushions = fp.depth >= 2 ? 3 : 2;
        const totalBoothSlots = numCushions + 1;
        for (let k = 0; k < numCushions; k++) {
          const offsetY =
            numCushions === 3
              ? 0.32 + k * 0.68 // 0.32, 1.00, 1.68 (0.68 grid units apart)
              : (k + 0.48) * (fp.depth / numCushions);
          candidates.push({
            slotId: `${seat.uid}_sofa_${k}`,
            parentItemId: seat.uid,
            seatIndex: k,
            totalSeatsOnItem: totalBoothSlots,
            x: seat.gridX + 0.28,
            y: Math.min(9.25, seat.gridY + offsetY),
            posture: 'SITTING_SOFA',
            facingDir: 'SE',
            priority: 2,
          });
        }
        // Companion standing cocktail slot at the end of the VIP table
        candidates.push({
          slotId: `${seat.uid}_stand_vip_0`,
          parentItemId: seat.uid,
          seatIndex: numCushions,
          totalSeatsOnItem: totalBoothSlots,
          x: Math.min(9.2, seat.gridX + 0.88),
          y: Math.min(9.2, seat.gridY + fp.depth * 0.5),
          posture: 'STANDING_TABLE',
          facingDir: 'NW',
          priority: 1,
        });
      } else {
        // Horizontal sofa along X at Y = seat.gridY + 0.28: generate 3 distinct cushion slots across a 2-tile sofa
        const numCushions = fp.width >= 2 ? 3 : 2;
        const extraFrontSlots = fp.depth >= 2 ? 2 : 1;
        const totalBoothSlots = numCushions + extraFrontSlots;
        for (let k = 0; k < numCushions; k++) {
          const offsetX =
            numCushions === 3
              ? 0.32 + k * 0.68 // 0.32, 1.00, 1.68 (0.68 grid units apart)
              : (k + 0.48) * (fp.width / numCushions);
          candidates.push({
            slotId: `${seat.uid}_sofa_${k}`,
            parentItemId: seat.uid,
            seatIndex: k,
            totalSeatsOnItem: totalBoothSlots,
            x: Math.min(9.25, seat.gridX + offsetX),
            y: seat.gridY + 0.28,
            posture: 'SITTING_SOFA',
            facingDir: 'SW',
            priority: 2,
          });
        }
        if (fp.depth >= 2) {
          // 2x2 VIP booth: 2 well-spaced table-side companion slots in front of the black VIP table
          candidates.push(
            {
              slotId: `${seat.uid}_stand_vip_0`,
              parentItemId: seat.uid,
              seatIndex: numCushions,
              totalSeatsOnItem: totalBoothSlots,
              x: Math.min(9.2, seat.gridX + 0.48),
              y: Math.min(9.2, seat.gridY + 1.34),
              posture: 'STANDING_TABLE',
              facingDir: 'NE',
              priority: 1,
            },
            {
              slotId: `${seat.uid}_stand_vip_1`,
              parentItemId: seat.uid,
              seatIndex: numCushions + 1,
              totalSeatsOnItem: totalBoothSlots,
              x: Math.min(9.2, seat.gridX + 1.48),
              y: Math.min(9.2, seat.gridY + 1.34),
              posture: 'STANDING_TABLE',
              facingDir: 'NE',
              priority: 1,
            }
          );
        } else {
          candidates.push({
            slotId: `${seat.uid}_stand_vip_0`,
            parentItemId: seat.uid,
            seatIndex: numCushions,
            totalSeatsOnItem: totalBoothSlots,
            x: Math.min(9.2, seat.gridX + fp.width * 0.5),
            y: Math.min(9.2, seat.gridY + 0.92),
            posture: 'STANDING_TABLE',
            facingDir: 'NE',
            priority: 1,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Proximity-based search that verifies and returns the nearest available bar stool/counter slot on `floor` (or null if full).
 */
function findAvailableBarSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate | null {
  const candidates = buildBarSlotCandidates(items, floor);
  return findNearestVerifiedAvailableSlot(
    candidates,
    guests,
    floor,
    excludeGuestId,
    originX,
    originY
  );
}

/**
 * Proximity-based search that verifies and returns the nearest available chair/VIP sofa/table slot on `floor` (or null if full).
 */
function findAvailableSeatOrTableSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate | null {
  const candidates = buildSeatOrTableSlotCandidates(items, floor);
  return findNearestVerifiedAvailableSlot(
    candidates,
    guests,
    floor,
    excludeGuestId,
    originX,
    originY
  );
}

function pickSeparatedBarSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate {
  const candidates = buildBarSlotCandidates(items, floor);
  if (candidates.length === 0) {
    const fallback: FurnitureSlotCandidate[] = [
      {
        slotId: 'def_stool_1',
        parentItemId: 'def_bar',
        seatIndex: 0,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 2.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
      {
        slotId: 'def_stool_2',
        parentItemId: 'def_bar',
        seatIndex: 1,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 3.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
      {
        slotId: 'def_stool_3',
        parentItemId: 'def_bar',
        seatIndex: 2,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 4.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
      {
        slotId: 'def_stool_4',
        parentItemId: 'def_bar',
        seatIndex: 3,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 5.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
      {
        slotId: 'def_stool_5',
        parentItemId: 'def_bar',
        seatIndex: 4,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 6.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
      {
        slotId: 'def_stool_6',
        parentItemId: 'def_bar',
        seatIndex: 5,
        totalSeatsOnItem: 6,
        x: 8.36,
        y: 7.5,
        posture: 'SITTING_STOOL',
        facingDir: 'NW',
        priority: 2,
      },
    ];
    return pickBestFurnitureSlot(fallback, guests, floor, excludeGuestId, originX, originY);
  }
  return pickBestFurnitureSlot(candidates, guests, floor, excludeGuestId, originX, originY);
}

function pickSeparatedSeatOrTableSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string,
  originX?: number,
  originY?: number
): FurnitureSlotCandidate {
  const candidates = buildSeatOrTableSlotCandidates(items, floor);
  if (candidates.length === 0) {
    const fallback: FurnitureSlotCandidate[] = [
      {
        slotId: 'def_sofa_1',
        parentItemId: 'def_sofa',
        seatIndex: 0,
        totalSeatsOnItem: 2,
        x: 0.28,
        y: 1.46,
        posture: 'SITTING_SOFA',
        facingDir: 'SE',
        priority: 2,
      },
      {
        slotId: 'def_chair_1',
        parentItemId: 'def_table',
        seatIndex: 1,
        totalSeatsOnItem: 2,
        x: 1.14,
        y: 7.52,
        posture: 'SITTING_CHAIR',
        facingDir: 'SE',
        priority: 2,
      },
    ];
    return pickBestFurnitureSlot(fallback, guests, floor, excludeGuestId, originX, originY);
  }
  return pickBestFurnitureSlot(candidates, guests, floor, excludeGuestId, originX, originY);
}

/**
 * Builds an A* approach path that always terminates cleanly at the exact sub-tile seat/stool coordinate `(slot.x, slot.y)`
 * so guests walk onto their individual chair/stool rather than stopping on a shared integer tile.
 */
function buildPathToFurnitureSlot(
  items: PlacedItem[],
  floor: FloorLevel,
  startX: number,
  startY: number,
  slot: FurnitureSlotCandidate
): Array<{ x: number; y: number }> {
  const goalTileX = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(slot.x)));
  const goalTileY = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(slot.y)));
  const rawPath = findGridPath(items, floor, startX, startY, goalTileX, goalTileY);

  if (rawPath.length === 0) {
    return [{ x: slot.x, y: slot.y }];
  }

  const lastWp = rawPath[rawPath.length - 1];
  if (Math.hypot(lastWp.x - slot.x, lastWp.y - slot.y) <= 0.45) {
    rawPath[rawPath.length - 1] = { x: slot.x, y: slot.y };
  } else {
    rawPath.push({ x: slot.x, y: slot.y });
  }
  return rawPath;
}

/**
 * Assigns a guest to a verified available furniture slot and sets up their walking path and posture metadata.
 */
function assignGuestToFurnitureSlot(
  guest: GuestAgent,
  slot: FurnitureSlotCandidate,
  items: PlacedItem[],
  targetWalkState: 'WALKING_TO_BAR' | 'WALKING_TO_SEAT'
) {
  guest.state = targetWalkState;
  guest.seatPosture = slot.posture;
  guest.facingDir = slot.facingDir;
  guest.assignedSlotId = slot.slotId;
  guest.path = buildPathToFurnitureSlot(items, guest.floor, guest.gridX, guest.gridY, slot);
}

/**
 * Re-verifies seat availability when a guest finishes walking to a bar stool or table chair.
 * Uses a proximity-based search centered at the guest's current arrival position `(guest.gridX, guest.gridY)`
 * to verify and occupy the nearest available sibling stool or chair if their original target was taken.
 */
function verifyOrReassignGuestSlotOnArrival(
  guest: GuestAgent,
  items: PlacedItem[],
  guests: GuestAgent[],
  kind: 'BAR' | 'SEAT'
): 'ARRIVED' | 'REROUTED' | 'NO_SEAT_AVAILABLE' {
  const candidates =
    kind === 'BAR'
      ? buildBarSlotCandidates(items, guest.floor)
      : buildSeatOrTableSlotCandidates(items, guest.floor);

  const assignedSlot = candidates.find((c) => c.slotId === guest.assignedSlotId);
  if (assignedSlot && isFurnitureSlotAvailable(assignedSlot, guests, guest.floor, guest.id)) {
    // Snap cleanly to the exact chair/stool/sofa coordinate so there is zero drift or overlap
    guest.gridX = assignedSlot.x;
    guest.gridY = assignedSlot.y;
    guest.seatPosture = assignedSlot.posture;
    guest.facingDir = assignedSlot.facingDir;
    guest.assignedSlotId = assignedSlot.slotId;
    return 'ARRIVED';
  }

  // Target seat was taken or invalidated — run proximity-based search from the guest's current position
  // to verify the nearest available sibling chair or bar stool before attempting to occupy it
  const searchOriginX = assignedSlot ? assignedSlot.x : guest.gridX;
  const searchOriginY = assignedSlot ? assignedSlot.y : guest.gridY;
  const nearestAvailable = findNearestVerifiedAvailableSlot(
    candidates,
    guests,
    guest.floor,
    guest.id,
    searchOriginX,
    searchOriginY
  );

  if (nearestAvailable) {
    assignGuestToFurnitureSlot(
      guest,
      nearestAvailable,
      items,
      kind === 'BAR' ? 'WALKING_TO_BAR' : 'WALKING_TO_SEAT'
    );
    guest.stateTimer = 0.55;
    return 'REROUTED';
  }

  return 'NO_SEAT_AVAILABLE';
}

/**
 * Reconciles any seated or bar-ordering guests whose `assignedSlotId` is missing, stale (e.g. after layout edits),
 * or duplicated with another guest on the same seat, ensuring every occupied seat has at most 1 patron.
 */
function reconcileOccupiedFurnitureSlots(items: PlacedItem[], guests: GuestAgent[]) {
  const claimedSlotIds = new Set<string>();
  const occupiedCoords: Array<{ floor: FloorLevel; x: number; y: number; guestId: string }> = [];

  for (let i = 0; i < guests.length; i++) {
    const g = guests[i];
    if (g.state !== 'ORDERING_DRINK' && g.state !== 'RESTING_AT_SEAT') continue;

    const isBar = g.state === 'ORDERING_DRINK';
    const candidates = isBar
      ? buildBarSlotCandidates(items, g.floor)
      : buildSeatOrTableSlotCandidates(items, g.floor);
    if (candidates.length === 0) continue;

    const matchedSlot = candidates.find((c) => c.slotId === g.assignedSlotId);
    const hasCoordCollision = occupiedCoords.some(
      (oc) => oc.floor === g.floor && Math.hypot(oc.x - g.gridX, oc.y - g.gridY) < 0.34
    );

    if (matchedSlot && !claimedSlotIds.has(matchedSlot.slotId) && !hasCoordCollision) {
      claimedSlotIds.add(matchedSlot.slotId);
      g.gridX = matchedSlot.x;
      g.gridY = matchedSlot.y;
      g.seatPosture = matchedSlot.posture;
      g.facingDir = matchedSlot.facingDir;
      occupiedCoords.push({ floor: g.floor, x: g.gridX, y: g.gridY, guestId: g.id });
    } else {
      // Find the nearest unoccupied slot on this floor and snap/assign the guest to it so they never cluster
      const available = candidates.filter(
        (c) =>
          !claimedSlotIds.has(c.slotId) &&
          !occupiedCoords.some(
            (oc) => oc.floor === g.floor && Math.hypot(oc.x - c.x, oc.y - c.y) < 0.34
          ) &&
          isFurnitureSlotAvailable(c, guests, g.floor, g.id)
      );
      if (available.length > 0) {
        available.sort(
          (a, b) =>
            b.priority - a.priority ||
            Math.hypot(a.x - g.gridX, a.y - g.gridY) - Math.hypot(b.x - g.gridX, b.y - g.gridY)
        );
        const chosen = available[0];
        claimedSlotIds.add(chosen.slotId);
        g.assignedSlotId = chosen.slotId;
        g.gridX = chosen.x;
        g.gridY = chosen.y;
        g.seatPosture = chosen.posture;
        g.facingDir = chosen.facingDir;
        occupiedCoords.push({ floor: g.floor, x: g.gridX, y: g.gridY, guestId: g.id });
      }
    }
  }
}

function pickMostSeparatedSlot(
  candidates: Array<{ x: number; y: number }>,
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string
): { x: number; y: number } {
  if (candidates.length === 0) return { x: 4.0, y: 4.0 };
  const floorGuests = guests.filter(
    (g) => g.floor === floor && g.id !== excludeGuestId && g.state !== 'QUEUEING'
  );
  if (floorGuests.length === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let bestSlot = candidates[0];
  let bestScore = -Infinity;

  for (const cand of candidates) {
    let minDist = Infinity;
    for (const fg of floorGuests) {
      const targetPt =
        fg.path.length > 0 ? fg.path[fg.path.length - 1] : { x: fg.gridX, y: fg.gridY };
      const dCurrent = Math.hypot(cand.x - fg.gridX, cand.y - fg.gridY);
      const dTarget = Math.hypot(cand.x - targetPt.x, cand.y - targetPt.y);
      const d = Math.min(dCurrent, dTarget);
      if (d < minDist) minDist = d;
    }
    const score = minDist + Math.random() * 0.18;
    if (score > bestScore) {
      bestScore = score;
      bestSlot = cand;
    }
  }

  return bestSlot;
}

function pickSeparatedDanceSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: FloorLevel,
  excludeGuestId: string
): { x: number; y: number } {
  const danceTiles = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'DANCE_TILE'
  );
  const candidates: Array<{ x: number; y: number }> = [];

  for (const dt of danceTiles) {
    candidates.push({
      x: dt.gridX + 0.22 + ((dt.gridY * 3) % 5) * 0.11,
      y: dt.gridY + 0.22 + ((dt.gridX * 3) % 5) * 0.11,
    });
  }

  if (candidates.length === 0) {
    candidates.push({ x: 3.5, y: 3.5 }, { x: 4.6, y: 4.6 });
  }

  return pickMostSeparatedSlot(candidates, guests, floor, excludeGuestId);
}

function applyGuestPersonalSpaceSeparation(guests: GuestAgent[], dt: number) {
  const minSpacing = 0.88; // Comfortable personal space on the dance floor
  const pushRate = Math.min(0.22, dt * 1.65);

  for (let i = 0; i < guests.length; i++) {
    const a = guests[i];
    if (a.state === 'QUEUEING' || a.path.length > 0) continue;
    // Patrons seated on a chair, bar stool, VIP sofa, or standing at an assigned table slot are locked in place
    // so personal-space separation NEVER pushes them off their chair onto a table!
    const aLocked = a.state === 'RESTING_AT_SEAT' || a.state === 'ORDERING_DRINK';

    for (let j = i + 1; j < guests.length; j++) {
      const b = guests[j];
      if (b.floor !== a.floor || b.state === 'QUEUEING' || b.path.length > 0) continue;
      const bLocked = b.state === 'RESTING_AT_SEAT' || b.state === 'ORDERING_DRINK';

      // If both patrons are locked into their respective chair/bar-stool slots, keep them on their exact seats
      if (aLocked && bLocked) continue;

      const dx = b.gridX - a.gridX;
      const dy = b.gridY - a.gridY;
      const dist = Math.hypot(dx, dy);

      if (dist < minSpacing) {
        const overlap = (minSpacing - dist) * pushRate;
        const angle = dist > 0.001 ? Math.atan2(dy, dx) : i * 1.7 + j * 2.3;
        const ux = Math.cos(angle) * overlap;
        const uy = Math.sin(angle) * overlap;

        if (!aLocked && !bLocked) {
          a.gridX = Math.max(0.28, Math.min(9.2, a.gridX - ux * 0.5));
          a.gridY = Math.max(0.28, Math.min(9.2, a.gridY - uy * 0.5));
          b.gridX = Math.max(0.28, Math.min(9.2, b.gridX + ux * 0.5));
          b.gridY = Math.max(0.28, Math.min(9.2, b.gridY + uy * 0.5));
        } else if (!aLocked) {
          a.gridX = Math.max(0.28, Math.min(9.2, a.gridX - ux));
          a.gridY = Math.max(0.28, Math.min(9.2, a.gridY - uy));
        } else if (!bLocked) {
          b.gridX = Math.max(0.28, Math.min(9.2, b.gridX + ux));
          b.gridY = Math.max(0.28, Math.min(9.2, b.gridY + uy));
        }
      }
    }
  }
}

const FAVORITE_GENRES = ['Pop', 'Dance', 'Hip Hop', 'Latin', 'Electro', 'Rock'];

function hashIdToIndex(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

/**
 * Finds the VIP Booth PlacedItem (`seat_velvet_booth`, `seat_vip_pod`, `seat_worn_couch`) that a guest is currently seated at.
 */
function findGuestSeatedVipBooth(
  guest: GuestAgent,
  items: PlacedItem[]
): PlacedItem | null {
  const vipBooths = items.filter(
    (it) => it.floor === guest.floor && isVipBoothCatalogId(it.catalogId)
  );
  if (vipBooths.length === 0) return null;

  if (guest.assignedSlotId) {
    const bySlot = vipBooths.find((b) => guest.assignedSlotId?.startsWith(b.uid));
    if (bySlot) return bySlot;
  }

  for (const b of vipBooths) {
    const cat = getCatalogItem(b.catalogId);
    const fp = cat ? getRotatedFootprint(cat, b.rotation) : { width: 2, depth: 2 };
    if (
      guest.gridX >= b.gridX - 0.5 &&
      guest.gridX <= b.gridX + fp.width + 0.5 &&
      guest.gridY >= b.gridY - 0.5 &&
      guest.gridY <= b.gridY + fp.depth + 0.5
    ) {
      return b;
    }
  }
  return null;
}

/**
 * Hit-tests the floating "🍾 VIP BOTTLE ORDER! TAP TO SERVE" badge or VIP booth foreground table on the active floor.
 */
function findTappedVipBoothBottleBadgeAtScreenPoint(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  items: PlacedItem[],
  activeFloor: FloorLevel,
  activeBottleServices?: Record<string, ActiveBoothBottleService>
): PlacedItem | null {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  for (const item of items) {
    if (item.floor !== activeFloor || !isVipBoothCatalogId(item.catalogId)) continue;
    const service = activeBottleServices?.[item.uid];
    if (!service || service.status !== 'ORDERED_WAITING') continue;

    const cat = getCatalogItem(item.catalogId);
    const fp = cat ? getRotatedFootprint(cat, item.rotation) : { width: 2, depth: 2 };
    const tableGx = item.gridX + (fp.width >= fp.depth ? 0.20 : 0.66);
    const tableGy = item.gridY + (fp.depth > fp.width ? 0.20 : 0.66);
    const tableW = fp.width >= fp.depth ? Math.max(0.6, fp.width - 0.40) : 0.42;
    const tableD = fp.depth > fp.width ? Math.max(0.6, fp.depth - 0.40) : 0.42;

    const bx = originX + (tableGx + tableW * 0.5 - (tableGy + tableD * 0.5)) * halfW;
    const by = originY + (tableGx + tableW * 0.5 + (tableGy + tableD * 0.5)) * halfH - 14.0 * scale;
    const badgeY = by - 25 * scale;

    if (
      Math.abs(screenX - bx) <= 95 * scale &&
      Math.abs(screenY - badgeY) <= 22 * scale
    ) {
      return item;
    }
  }
  return null;
}

function computeGuestMoodInfo(
  guest: GuestAgent,
  activeGenre: string | undefined,
  isClubFull: boolean,
  queueIndex: number = 0,
  items: PlacedItem[] = [],
  activeBottleServices?: Record<string, ActiveBoothBottleService>,
  isVipWhale: boolean = false
): SpriteMoodInfo {
  const nameIdx = hashIdToIndex(guest.id, GUEST_NAMES.length);
  const favIdx = hashIdToIndex(guest.id + '_genre', FAVORITE_GENRES.length);
  const favGenre = FAVORITE_GENRES[favIdx];
  const genreMatch =
    activeGenre && activeGenre.toLowerCase() === favGenre.toLowerCase();

  const seatedVipBooth =
    guest.state === 'RESTING_AT_SEAT' || guest.state === 'WALKING_TO_SEAT'
      ? findGuestSeatedVipBooth(guest, items)
      : null;
  const boothService = seatedVipBooth
    ? activeBottleServices?.[seatedVipBooth.uid]
    : undefined;

  let moodLabel: SpriteMoodInfo['moodLabel'] = 'VIBING';
  let moodEmoji = '🎶';
  let moodColor = '#22d3ee';
  let moodScore = 78;
  let activity = 'Grooving on the Dance Floor';
  let thought = guest.chatText || `Loving this ${activeGenre || 'club'} vibe!`;

  if (guest.state === 'WALKING_TO_CAR') {
    moodLabel = 'ECSTATIC';
    moodEmoji = '🚗';
    moodColor = '#4ade80';
    moodScore = 95;
    activity = 'Walking Back to Parked Car in Parking Lot';
    thought =
      guest.chatText || 'Unforgettable night! Heading back to my parked car and driving home happy!';
  } else if (guest.state === 'QUEUEING' || guest.state === 'ARRIVING_FROM_CAR') {
    const isSteppingFromCar =
      guest.queueSlotCoord !== undefined &&
      Math.hypot(guest.queueSlotCoord.x - guest.gridX, guest.queueSlotCoord.y - guest.gridY) > 0.35;
    moodLabel = 'WAITING IN LINE';
    moodEmoji = isSteppingFromCar ? '🚗' : isClubFull ? '⏳' : '🎟️';
    moodColor = isSteppingFromCar ? '#38bdf8' : isClubFull ? '#fb923c' : '#facc15';
    moodScore = isClubFull ? Math.max(48, 72 - queueIndex * 4) : 82;
    activity = isSteppingFromCar
      ? 'Just Parked! Walking from Car to Red Carpet Line'
      : isClubFull
      ? `Waiting in Red Carpet Line (#${queueIndex + 1} · Club Full)`
      : `Stepping to Red Carpet Entrance (#${queueIndex + 1})`;
    thought =
      guest.chatText ||
      (isSteppingFromCar
        ? 'Just parked in the lot and heading across the crosswalk to the red carpet!'
        : isClubFull
        ? 'Club is at max capacity! Falling in line on the red carpet...'
        : 'Almost at the red carpet door! Ready to party!');
  } else if (guest.state === 'WALKING_TO_BAR') {
    moodLabel = 'THIRSTY';
    moodEmoji = '🍹';
    moodColor = '#f472b6';
    moodScore = 74;
    activity = 'Heading to the Neon Bar';
    thought = 'Time to grab a glowing signature cocktail!';
  } else if (guest.state === 'ORDERING_DRINK') {
    moodLabel = 'CHILLING';
    moodEmoji = '🍸';
    moodColor = '#a855f7';
    moodScore = 88;
    activity = 'Sipping Cocktails at the Bar Stool';
    thought = guest.chatText || 'Bartender, another round of neon mix!';
  } else if (guest.state === 'RESTING_AT_SEAT' || guest.state === 'WALKING_TO_SEAT') {
    if (boothService?.status === 'ACTIVE_SPARKLERS') {
      moodLabel = 'ECSTATIC';
      moodEmoji = '🍾';
      moodColor = '#facc15';
      moodScore = 100;
      activity = `VIP Bottle Service (${boothService.trayName} · ${boothService.spendingMultiplier}x Spend)`;
      thought = `Popping ${boothService.trayName} with sparklers in our VIP booth! 🍾✨`;
    } else if (boothService?.status === 'ORDERED_WAITING') {
      moodLabel = 'HYPED';
      moodEmoji = '🍾';
      moodColor = '#fb923c';
      moodScore = 90;
      activity = `Ordered ${boothService.trayName} at VIP Booth`;
      thought = 'We ordered a premium Bottle Service tray for our VIP booth! Tap to serve us! 🍾';
    } else {
      moodLabel = genreMatch ? 'HYPED' : 'CHILLING';
      moodEmoji = genreMatch ? '⚡' : '🥂';
      moodColor = genreMatch ? '#38bdf8' : '#c084fc';
      moodScore = genreMatch ? 92 : 85;
      activity =
        guest.seatPosture === 'SITTING_SOFA'
          ? 'Relaxing in the VIP Lounge Booth'
          : 'Chilling at a High-Top Cocktail Table';
      thought =
        guest.chatText ||
        (genreMatch
          ? `They're playing ${favGenre}! Best VIP table in the city!`
          : 'Great view of the LED floor from this table.');
    }
  } else if (guest.state === 'DANCING' || guest.state === 'DANCER_MOVES') {
    if (guest.groupDanceId && (guest.groupDanceTimer ?? 0) > 0) {
      moodLabel = 'ECSTATIC';
      moodEmoji = '🕺';
      moodColor = '#4ade80';
      moodScore = 99;
      const crewCount = guest.groupDanceSize || 3;
      const patName = (guest.groupDancePattern || 'CIRCLE_GROOVE').replace('_', ' ');
      activity = `Synced Group Dance (${crewCount} Dancers · ${patName} · ${Math.ceil(
        guest.groupDanceTimer || 10
      )}s)`;
      thought =
        guest.chatText ||
        `Our whole crew is locked in on this ${activeGenre || 'Neon'} beat! 🔥🕺💃`;
    } else if (genreMatch || guest.isCelebrity) {
      moodLabel = 'ECSTATIC';
      moodEmoji = '🔥';
      moodColor = '#4ade80';
      moodScore = 98;
      activity = `Going Wild on the ${activeGenre || 'Neon'} Dance Floor`;
      thought =
        guest.chatText ||
        `THIS ${favGenre.toUpperCase()} BEAT IS UNREAL! Hands in the air!`;
    } else {
      moodLabel = 'HYPED';
      moodEmoji = '⚡';
      moodColor = '#22d3ee';
      moodScore = 90;
      activity = 'Dancing Under the Disco Lasers';
      thought = guest.chatText || 'The lighting mood on this dance floor is fire!';
    }
  } else {
    moodLabel = 'VIBING';
    moodEmoji = '✨';
    moodColor = '#38bdf8';
    moodScore = 82;
    activity = 'Exploring the Club Floor';
    thought = guest.chatText || 'Checking out the neon decorations!';
  }

  const isVipOrWhale = Boolean(guest.isCelebrity || isVipWhale);

  return {
    id: guest.id,
    name: `${guest.name || GUEST_NAMES[nameIdx]}${isVipOrWhale ? ' ★ VIP' : ''}`,
    role: isVipOrWhale ? 'VIP_GUEST' : 'GUEST',
    moodLabel,
    moodEmoji,
    moodColor,
    moodScore,
    activity: isVipWhale ? `${activity} · Whale ($${guest.cashSpent} Spent)` : activity,
    thought,
    favoriteGenre: favGenre,
    shirtColor: guest.shirtColor,
    boothUid: seatedVipBooth?.uid,
  };
}

function computePedestrianMoodInfo(
  ped: PedestrianAgent,
  activeGenre: string | undefined
): SpriteMoodInfo {
  const genreMatch =
    activeGenre && activeGenre.toLowerCase() === ped.favoriteGenre.toLowerCase();
  const moodLabel: SpriteMoodInfo['moodLabel'] = genreMatch
    ? 'HYPED'
    : ped.hype >= 85
    ? 'VIBING'
    : 'STROLLING';
  const moodEmoji = genreMatch ? '⚡' : ped.hype >= 85 ? '🎶' : '🚶';
  return {
    id: ped.id,
    name: ped.name,
    role: 'PEDESTRIAN',
    moodLabel,
    moodEmoji,
    moodColor: genreMatch ? '#38bdf8' : ped.hype >= 85 ? '#f472b6' : '#a855f7',
    moodScore: ped.hype,
    activity: 'Strolling the Neon Sidewalk Around the Club',
    thought: `Hearing that ${activeGenre || 'bass'} booming from the red carpet entrance!`,
    favoriteGenre: ped.favoriteGenre,
    shirtColor: ped.shirtColor,
  };
}

function computeStaffMoodInfo(
  id: string,
  role: 'BARTENDER' | 'DJ' | 'SECURITY' | 'WAITER',
  activeGenre: string | undefined,
  customName?: string
): SpriteMoodInfo {
  if (role === 'DJ') {
    return {
      id,
      name: customName || 'DJ NOVA-X',
      role: 'DJ',
      moodLabel: 'ECSTATIC',
      moodEmoji: '🎧',
      moodColor: '#22d3ee',
      moodScore: 99,
      activity: `Spinning ${activeGenre || 'Club'} Set at the Turntables`,
      thought: `Dropping the ${activeGenre || 'custom'} bassline & shifting the club mood lights!`,
      favoriteGenre: activeGenre || 'Electro',
      shirtColor: '#22d3ee',
    };
  }
  if (role === 'BARTENDER') {
    return {
      id,
      name: customName || 'Mixologist Kai',
      role: 'BARTENDER',
      moodLabel: 'HYPED',
      moodEmoji: '🍸',
      moodColor: '#e879f9',
      moodScore: 93,
      activity: 'Flair-Mixing Cocktails Behind the Neon Bar',
      thought: 'Shaking up glowing drinks on the beat!',
      favoriteGenre: 'Pop',
      shirtColor: '#e879f9',
    };
  }
  if (role === 'SECURITY') {
    return {
      id,
      name: customName || 'Bouncer Rex',
      role: 'SECURITY',
      moodLabel: 'VIBING',
      moodEmoji: '🕶️',
      moodColor: '#38bdf8',
      moodScore: 88,
      activity: 'Guarding the Red Carpet Door & VIP Line',
      thought: 'Keeping the red carpet line orderly and the VIP vibe smooth.',
      favoriteGenre: 'Hip Hop',
      shirtColor: '#1e293b',
    };
  }
  return {
    id,
    name: customName || 'Server Aria',
    role: 'WAITER',
    moodLabel: 'HYPED',
    moodEmoji: '🥂',
    moodColor: '#4ade80',
    moodScore: 90,
    activity: 'Delivering Bottle Service to VIP Tables',
    thought: 'Tips are flowing tonight with this crowd mood!',
    favoriteGenre: 'Dance',
    shirtColor: '#f43f5e',
  };
}

function buildAllSpritesMoodSnapshot(
  guests: GuestAgent[],
  pedestrians: PedestrianAgent[],
  staffMembers: StaffMemberAgent[],
  items: PlacedItem[],
  activeBottleServices: Record<string, ActiveBoothBottleService> | undefined,
  activeFloor: FloorLevel,
  activeGenre: string | undefined,
  maxGuests: number
): SpriteMoodInfo[] {
  const insideCount = guests.filter((g) => g.state !== 'QUEUEING').length;
  const isClubFull = insideCount >= maxGuests;

  const list: SpriteMoodInfo[] = [];

  // Resident DJ & active floor staff at top so staff moods are always accessible too
  list.push(computeStaffMoodInfo('staff_dj_resident', 'DJ', activeGenre));
  staffMembers
    .filter((s) => s.floor === activeFloor)
    .forEach((sm) => {
      const mappedRole =
        sm.role === 'BOUNCER'
          ? 'SECURITY'
          : sm.role === 'WAITER'
          ? 'WAITER'
          : 'BARTENDER';
      list.push(computeStaffMoodInfo(sm.uid, mappedRole, activeGenre, sm.name));
    });

  // Queued customers on the Red Carpet
  const queued = guests.filter((g) => g.state === 'QUEUEING');
  queued.forEach((g, idx) => {
    list.push(
      computeGuestMoodInfo(g, activeGenre, isClubFull, idx, items, activeBottleServices)
    );
  });

  // Inside club patrons on active floor
  const avgSpend = computeAverageClubGuestSpend(guests);
  const inside = guests.filter(
    (g) => g.state !== 'QUEUEING' && g.floor === activeFloor
  );
  inside.forEach((g) => {
    const isWhale = isGuestVipWhale(g, avgSpend);
    list.push(
      computeGuestMoodInfo(g, activeGenre, isClubFull, 0, items, activeBottleServices, isWhale)
    );
  });

  // Exterior pedestrians walking around the building
  pedestrians.forEach((p) => {
    list.push(computePedestrianMoodInfo(p, activeGenre));
  });

  return list;
}

/**
 * Draws a clean lineless glowing selection ring under the selected sprite and a floating live Mood pill above their head.
 */
function drawSelectedSpriteMoodOverlay(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  mood: SpriteMoodInfo
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2);
  const pulse = 1 + Math.sin(t * 6) * 0.08;

  ctx.save();
  // Glowing selection ring around feet
  ctx.strokeStyle = mood.moodColor;
  ctx.lineWidth = 2.4 * scale;
  ctx.beginPath();
  ctx.ellipse(px, py + 1 * scale, 13 * scale * pulse, 6.5 * scale * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = mood.moodColor;
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Floating lineless mood pill badge above head
  const badgeY = py - 52 * scale - Math.abs(Math.sin(t * 4)) * 2.5 * scale;
  const labelText = `${mood.moodEmoji} ${mood.name.toUpperCase()} · ${mood.moodLabel}`;
  ctx.font = `800 ${Math.max(8, Math.round(7.8 * scale))}px "Outfit", sans-serif`;
  const textW = ctx.measureText(labelText).width;
  const pillW = textW + 14 * scale;
  const pillH = 15 * scale;

  fillStrokeRoundedRect(
    ctx,
    px - pillW * 0.5,
    badgeY - pillH * 0.5,
    pillW,
    pillH,
    6 * scale,
    'rgba(12, 8, 28, 0.92)'
  );
  // Subtle colored bottom accent bar inside pill (lineless)
  fillStrokeRoundedRect(
    ctx,
    px - pillW * 0.5 + 4 * scale,
    badgeY + pillH * 0.5 - 2.4 * scale,
    pillW - 8 * scale,
    1.8 * scale,
    1 * scale,
    mood.moodColor
  );

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, px, badgeY - 0.5 * scale);
  ctx.restore();
}

/**
 * Hit-tests all active sprites (interior patrons, red carpet queue customers, sidewalk pedestrians, DJ, and Bartenders)
 * at a given canvas screen coordinate `(screenX, screenY)` so tapping any sprite opens their live Mood inspection card.
 */
function findTappedSpriteMoodAtScreenPoint(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
  streetOriginY: number,
  tileW: number,
  tileH: number,
  scale: number,
  guests: GuestAgent[],
  pedestrians: PedestrianAgent[],
  items: PlacedItem[],
  staffMembers: StaffMemberAgent[],
  activeBottleServices: Record<string, ActiveBoothBottleService> | undefined,
  activeFloor: FloorLevel,
  activeGenre: string | undefined,
  maxGuests: number
): SpriteMoodInfo | null {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const hitRadius = 24 * scale;
  const insideCount = guests.filter((g) => g.state !== 'QUEUEING').length;
  const isClubFull = insideCount >= maxGuests;

  let bestMatch: { dist: number; info: SpriteMoodInfo } | null = null;

  const checkCandidate = (
    gx: number,
    gy: number,
    refOriginY: number,
    yCenterOffset: number,
    info: SpriteMoodInfo
  ) => {
    const sx = originX + (gx - gy) * halfW;
    const sy = refOriginY + (gx + gy) * halfH - yCenterOffset;
    const dist = Math.hypot(screenX - sx, screenY - sy);
    if (dist <= hitRadius && (!bestMatch || dist < bestMatch.dist)) {
      bestMatch = { dist, info };
    }
  };

  // 1. Check interior guests on active floor + red carpet queued & car-walking guests
  const avgSpend = computeAverageClubGuestSpend(guests);
  const queuedList = guests.filter((g) => isExteriorGuestState(g.state));
  for (const g of guests) {
    const isExt = isExteriorGuestState(g.state);
    if (!isExt && g.floor !== activeFloor) continue;
    const refOriginY = isExt ? streetOriginY : originY;
    const qIdx = isExt ? Math.max(0, queuedList.indexOf(g)) : 0;
    const isWhale = isGuestVipWhale(g, avgSpend);
    const info = computeGuestMoodInfo(
      g,
      activeGenre,
      isClubFull,
      qIdx,
      items,
      activeBottleServices,
      isWhale
    );
    checkCandidate(g.gridX, g.gridY, refOriginY, 18 * scale, info);
  }

  // 2. Check exterior sidewalk pedestrians
  for (const ped of pedestrians) {
    const info = computePedestrianMoodInfo(ped, activeGenre);
    checkCandidate(ped.gridX, ped.gridY, streetOriginY, 18 * scale, info);
  }

  // 3. Check hired staff members on active floor
  for (const sm of staffMembers) {
    if (sm.floor !== activeFloor) continue;
    const mappedRole =
      sm.role === 'BOUNCER'
        ? 'SECURITY'
        : sm.role === 'WAITER'
        ? 'WAITER'
        : 'BARTENDER';
    const info = computeStaffMoodInfo(sm.uid, mappedRole, activeGenre, sm.name);
    checkCandidate(sm.gridX, sm.gridY, originY, 20 * scale, info);
  }

  // 4. Check Resident DJ at DJ Booth & Bartenders behind Bar Units on active floor
  for (const item of items) {
    if (item.floor !== activeFloor) continue;
    const cat = getCatalogItem(item.catalogId);
    if (!cat) continue;
    const fp = getRotatedFootprint(cat, item.rotation);
    if (cat.category === 'DJ_BOOTH' && cat.id !== 'dj_speaker_stack') {
      const info = computeStaffMoodInfo('staff_dj_resident', 'DJ', activeGenre);
      checkCandidate(
        item.gridX + fp.width * 0.5,
        item.gridY + 0.45,
        originY,
        32 * scale,
        info
      );
    } else if (cat.category === 'BAR_UNIT') {
      const info = computeStaffMoodInfo('staff_bartender_main', 'BARTENDER', activeGenre);
      checkCandidate(
        item.gridX + fp.width * 0.5,
        item.gridY + fp.depth * 0.5,
        originY,
        24 * scale,
        info
      );
    }
  }

  return bestMatch ? (bestMatch as { dist: number; info: SpriteMoodInfo }).info : null;
}

/**
 * Hit-tests placed decorations on the active floor at either the isometric grid coordinate `iso`
 * or the 3D screen-space bounding volume of tall furniture/lights so long-pressing a decoration
 * reliably picks it up for Edit Mode. Prioritizes 3D furniture/equipment over underlying dance tiles.
 */
function findPlacedDecorationAtScreenPoint(
  screenX: number,
  screenY: number,
  iso: { x: number; y: number },
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  items: PlacedItem[],
  activeFloor: FloorLevel
): PlacedItem | null {
  const floorItems = items.filter((p) => p.floor === activeFloor);
  if (floorItems.length === 0) return null;

  const halfW = tileW / 2;
  const halfH = tileH / 2;

  // 1. First pass: check non-DANCE_TILE 3D furniture by grid footprint OR 3D visual sprite body
  for (let i = floorItems.length - 1; i >= 0; i--) {
    const p = floorItems[i];
    const cat = getCatalogItem(p.catalogId);
    if (!cat || cat.category === 'DANCE_TILE') continue;
    const fp = getRotatedFootprint(cat, p.rotation);
    if (
      iso.x >= p.gridX &&
      iso.x < p.gridX + fp.width &&
      iso.y >= p.gridY &&
      iso.y < p.gridY + fp.depth
    ) {
      return p;
    }

    // Screen-space 3D body hit test (for tall lighting trusses, speakers, bars, DJ booth, tables)
    const cx = p.gridX + fp.width * 0.5;
    const cy = p.gridY + fp.depth * 0.5;
    const sx = originX + (cx - cy) * halfW;
    const sy = originY + (cx + cy) * halfH;
    const hitW = Math.max(24, (fp.width + fp.depth) * 16) * scale;
    const hitH = (cat.category === 'LIGHTING' ? 54 : 42) * scale;
    if (
      Math.abs(screenX - sx) <= hitW &&
      screenY >= sy - hitH &&
      screenY <= sy + 14 * scale
    ) {
      return p;
    }
  }

  // 2. Second pass: check DANCE_TILE items by grid footprint
  for (let i = floorItems.length - 1; i >= 0; i--) {
    const p = floorItems[i];
    const cat = getCatalogItem(p.catalogId);
    if (!cat || cat.category !== 'DANCE_TILE') continue;
    const fp = getRotatedFootprint(cat, p.rotation);
    if (
      iso.x >= p.gridX &&
      iso.x < p.gridX + fp.width &&
      iso.y >= p.gridY &&
      iso.y < p.gridY + fp.depth
    ) {
      return p;
    }
  }

  return null;
}

/**
 * Draws unmistakable foreground visual overlays for:
 * 1) Long-press hold progress ring ("HOLD TO EDIT...") while pressing down on any decoration
 * 2) Active Edit Mode gizmo (4-way isometric movement arrows, pulsing corner brackets, and "✥ EDIT MODE · TAP TILE TO MOVE" overhead banner)
 * 3) Newly Purchased Decoration Spotlight Beacon ("✨ NEW! [NAME] HERE" with bouncing arrow & glowing ring) so the player immediately sees where a newly bought decoration was placed
 */
function drawDecorationEditAndNewBeaconOverlays(
  ctx: CanvasRenderingContext2D,
  floorItems: PlacedItem[],
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  isEditDecorMode: boolean | undefined,
  editingPlacedItemUid: string | null | undefined,
  newlyPlacedItemHighlight: { uid: string; placedAtMs: number } | null | undefined,
  longPressState: {
    timerId: number | null;
    targetItemUid: string | null;
    startTimeMs: number;
    durationMs: number;
    triggered: boolean;
  }
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  // A. When Edit Mode is active across the floor, draw subtle glowing corner ticks on all movable decorations
  if (isEditDecorMode) {
    ctx.save();
    for (const item of floorItems) {
      if (item.uid === editingPlacedItemUid) continue;
      const cat = getCatalogItem(item.catalogId);
      if (!cat) continue;
      const fp = getRotatedFootprint(cat, item.rotation);
      const cx = item.gridX + fp.width * 0.5;
      const cy = item.gridY + fp.depth * 0.5;
      const sx = originX + (cx - cy) * halfW;
      const sy = originY + (cx + cy) * halfH - 16 * scale;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 8.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.max(8, Math.round(9 * scale))}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✥', sx, sy + 0.5 * scale);
    }
    ctx.restore();
  }

  // B. Unmistakable 4-Direction Move Gizmo & Floating Overhead Banner on the Selected Decoration in Edit Mode
  if (editingPlacedItemUid) {
    const editingItem = floorItems.find((p) => p.uid === editingPlacedItemUid);
    if (editingItem) {
      const cat = getCatalogItem(editingItem.catalogId);
      if (cat) {
        const fp = getRotatedFootprint(cat, editingItem.rotation);
        const cx = editingItem.gridX + fp.width * 0.5;
        const cy = editingItem.gridY + fp.depth * 0.5;
        const sx = originX + (cx - cy) * halfW;
        const sy = originY + (cx + cy) * halfH;
        const pulse = Math.sin(t * 7) * 4 * scale;
        const ringRx = Math.max(26, (fp.width + fp.depth) * 16) * scale + pulse * 0.5;
        const ringRy = ringRx * 0.5;

        ctx.save();

        // Outer pulsing dashed cyan/gold selection halo around the decoration
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.8 * scale;
        ctx.setLineDash([7 * scale, 4 * scale]);
        ctx.lineDashOffset = -t * 28 * scale;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2 * scale, ringRx, ringRy, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4 Isometric Directional Movement Arrows (NW, NE, SE, SW) radiating from the decoration
        const arrowDirs = [
          { dx: -1, dy: -0.5, label: '↖' },
          { dx: 1, dy: -0.5, label: '↗' },
          { dx: 1, dy: 0.5, label: '↘' },
          { dx: -1, dy: 0.5, label: '↙' },
        ];
        for (const dir of arrowDirs) {
          const dist = ringRx * 0.92 + Math.abs(pulse) * 0.7;
          const ax = sx + dir.dx * dist;
          const ay = sy - 2 * scale + dir.dy * dist;

          fillStrokeRoundedRect(
            ctx,
            ax - 9.5 * scale,
            ay - 9.5 * scale,
            19 * scale,
            19 * scale,
            6 * scale,
            '#0f172a',
            '#22d3ee',
            1.8 * scale
          );
          ctx.fillStyle = '#facc15';
          ctx.font = `900 ${Math.max(9, Math.round(10.5 * scale))}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dir.label, ax, ay + 0.5 * scale);
        }

        // High-visibility overhead Edit Mode Badge above the decoration
        const floatY = sy - 54 * scale - Math.abs(Math.sin(t * 5.5)) * 5 * scale;
        const titleText = `✥ EDIT MODE: ${cat.name.toUpperCase()}`;
        const subText = 'TAP ANY OPEN TILE TO MOVE · ROTATE OR NUDGE BELOW';

        ctx.font = `900 ${Math.max(9, Math.round(10.5 * scale))}px "Outfit", sans-serif`;
        const w1 = ctx.measureText(titleText).width;
        ctx.font = `800 ${Math.max(7, Math.round(7.8 * scale))}px "JetBrains Mono", monospace`;
        const w2 = ctx.measureText(subText).width;

        const boxW = Math.max(w1, w2) + 22 * scale;
        const boxH = 30 * scale;

        // Vertical connector beam from badge to item center
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.2 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, floatY + boxH * 0.5);
        ctx.lineTo(sx, sy - 10 * scale);
        ctx.stroke();

        fillStrokeRoundedRect(
          ctx,
          sx - boxW * 0.5,
          floatY - boxH * 0.5,
          boxW,
          boxH,
          9 * scale,
          'rgba(10, 14, 34, 0.96)',
          '#22d3ee',
          2.4 * scale
        );

        ctx.fillStyle = '#facc15';
        ctx.font = `900 ${Math.max(9, Math.round(10.5 * scale))}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(titleText, sx, floatY - 5 * scale);

        ctx.fillStyle = '#67e8f9';
        ctx.font = `800 ${Math.max(7, Math.round(7.8 * scale))}px "JetBrains Mono", monospace`;
        ctx.fillText(subText, sx, floatY + 7.5 * scale);

        ctx.restore();
      }
    }
  }

  // C. Long-Press Charging Radial Progress Ring ("HOLD TO EDIT...") while finger/mouse is held down
  if (longPressState.targetItemUid && !longPressState.triggered) {
    const heldItem = floorItems.find((p) => p.uid === longPressState.targetItemUid);
    if (heldItem) {
      const cat = getCatalogItem(heldItem.catalogId);
      if (cat) {
        const elapsed = performance.now() - longPressState.startTimeMs;
        const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, longPressState.durationMs)));
        if (progress > 0.08) {
          const fp = getRotatedFootprint(cat, heldItem.rotation);
          const cx = heldItem.gridX + fp.width * 0.5;
          const cy = heldItem.gridY + fp.depth * 0.5;
          const sx = originX + (cx - cy) * halfW;
          const sy = originY + (cx + cy) * halfH - 22 * scale;
          const radius = 20 * scale;

          ctx.save();
          // Dark circular backing
          ctx.fillStyle = 'rgba(10, 14, 34, 0.88)';
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 3 * scale, 0, Math.PI * 2);
          ctx.fill();

          // Progress arc
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 4 * scale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(
            sx,
            sy,
            radius,
            -Math.PI / 2,
            -Math.PI / 2 + progress * Math.PI * 2
          );
          ctx.stroke();

          ctx.fillStyle = '#facc15';
          ctx.font = `900 ${Math.max(8, Math.round(8.5 * scale))}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HOLD', sx, sy - 3 * scale);
          ctx.fillStyle = '#ffffff';
          ctx.font = `800 ${Math.max(7, Math.round(7.2 * scale))}px "JetBrains Mono", monospace`;
          ctx.fillText('EDIT', sx, sy + 6 * scale);
          ctx.restore();
        }
      }
    }
  }

  // D. Newly Purchased Decoration Spotlight Beacon ("✨ NEW! [ITEM NAME] HERE")
  if (newlyPlacedItemHighlight && newlyPlacedItemHighlight.uid !== editingPlacedItemUid) {
    const elapsedSec = (performance.now() - newlyPlacedItemHighlight.placedAtMs) / 1000;
    if (elapsedSec >= 0 && elapsedSec <= 9.0) {
      const newItem = floorItems.find((p) => p.uid === newlyPlacedItemHighlight.uid);
      if (newItem) {
        const cat = getCatalogItem(newItem.catalogId);
        if (cat) {
          const fp = getRotatedFootprint(cat, newItem.rotation);
          const cx = newItem.gridX + fp.width * 0.5;
          const cy = newItem.gridY + fp.depth * 0.5;
          const sx = originX + (cx - cy) * halfW;
          const sy = originY + (cx + cy) * halfH;
          const fade = elapsedSec > 7.0 ? Math.max(0, 1 - (elapsedSec - 7.0) / 2.0) : 1;
          const bounce = Math.abs(Math.sin(t * 7.5)) * 9 * scale;
          const ringPulse = 1 + 0.14 * Math.sin(t * 8);

          ctx.save();
          ctx.globalAlpha = fade;

          // Vertical spotlight beam column so you can spot the new decoration immediately anywhere on the floor
          const beamW = Math.max(26, (fp.width + fp.depth) * 15) * scale;
          const beamGrad = ctx.createLinearGradient(sx, sy - 95 * scale, sx, sy + 6 * scale);
          beamGrad.addColorStop(0, 'rgba(74, 222, 128, 0)');
          beamGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.20)');
          beamGrad.addColorStop(1, 'rgba(74, 222, 128, 0.42)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(sx - beamW * 0.45, sy - 95 * scale);
          ctx.lineTo(sx + beamW * 0.45, sy - 95 * scale);
          ctx.lineTo(sx + beamW * 0.7, sy + 4 * scale);
          ctx.lineTo(sx - beamW * 0.7, sy + 4 * scale);
          ctx.closePath();
          ctx.fill();

          // Expanding radar ring around the newly placed decoration's base
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2.6 * scale;
          ctx.beginPath();
          ctx.ellipse(
            sx,
            sy - 1 * scale,
            beamW * 0.75 * ringPulse,
            beamW * 0.38 * ringPulse,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          // Bouncing downward pointer arrow + floating "✨ NEW! [ITEM NAME] (X,Y)" badge
          const badgeY = sy - 64 * scale - bounce;
          const titleText = `✨ NEW: ${cat.name.toUpperCase()} (${newItem.gridX},${newItem.gridY})`;
          const subText = 'HOLD ITEM TO MOVE · TAP TO INTERACT';

          ctx.font = `900 ${Math.max(9, Math.round(10 * scale))}px "Outfit", sans-serif`;
          const tw1 = ctx.measureText(titleText).width;
          ctx.font = `800 ${Math.max(7, Math.round(7.5 * scale))}px "JetBrains Mono", monospace`;
          const tw2 = ctx.measureText(subText).width;
          const pillW = Math.max(tw1, tw2) + 20 * scale;
          const pillH = 28 * scale;

          // Downward triangle pointer under the badge
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.moveTo(sx - 7 * scale, badgeY + pillH * 0.5);
          ctx.lineTo(sx + 7 * scale, badgeY + pillH * 0.5);
          ctx.lineTo(sx, badgeY + pillH * 0.5 + 9 * scale);
          ctx.closePath();
          ctx.fill();

          fillStrokeRoundedRect(
            ctx,
            sx - pillW * 0.5,
            badgeY - pillH * 0.5,
            pillW,
            pillH,
            8 * scale,
            'rgba(6, 24, 18, 0.95)',
            '#4ade80',
            2.3 * scale
          );

          ctx.fillStyle = '#4ade80';
          ctx.font = `900 ${Math.max(9, Math.round(10 * scale))}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(titleText, sx, badgeY - 4.5 * scale);

          ctx.fillStyle = '#a7f3d0';
          ctx.font = `800 ${Math.max(7, Math.round(7.5 * scale))}px "JetBrains Mono", monospace`;
          ctx.fillText(subText, sx, badgeY + 7 * scale);

          ctx.restore();
        }
      }
    }
  }
}


