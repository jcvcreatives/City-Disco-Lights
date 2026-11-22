import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  Crown,
  Info,
  Lock,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  X,
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
  GuestAgent,
  INITIAL_PLACED_ITEMS,
  INITIAL_QUESTS,
  INITIAL_STAFF_MEMBERS,
  ItemCategory,
  LiveAlert,
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

type GameScreenState = 'TITLE' | 'PLAYING';
type BottomDrawerTab = 'BUILD' | 'DRINKS' | 'PARKING' | 'FRIENDS' | 'WORLD_MAP' | null;
type LeftModalTab = 'QUESTS' | 'DJ_BOOTH' | 'PLAYLISTS' | 'CELEBS' | null;

const STAFF_FIRST_NAMES: Record<StaffCatalogItem['role'], string[]> = {
  BARTENDER: ['Roxy', 'Jett', 'Vesper', 'Kobe', 'Nyx', 'Zane'],
  BOUNCER: ['Marcus', 'Titan', 'Knox', 'jaxon', 'Rex', 'Vance'],
  WAITER: ['Skye', 'pixel', 'Nova', 'Cleo', 'Lyra', 'Tori'],
};

const CELEBRITY_NAMES = [
  'DJ Daft Nova',
  'Kyra Vance (Pop Icon)',
  'Jax Sterling (Synth King)',
  'Luna Eclipse (Supermodel)',
];

const INITIAL_GUESTS: GuestAgent[] = [
  // 5 Dancers on the 6x6 pastel disco floor with Beer Mug & Sparkle bubbles (matching IMG_1503.jpeg)
  {
    id: 'g_dance_1',
    name: 'Leo',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 3.35,
    gridY: 4.35,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 8,
    patience: 90,
    hype: 80,
    bubble: 'BEER',
    bubbleTimer: 7,
    shirtColor: '#dc2626',
    hairColor: '#451a03',
    pantsColor: '#1e3a8a',
    cashSpent: 45,
    danceMove: 'SHUFFLE_STEP',
    danceMoveTimer: 2.2,
    dancePhaseOffset: 0.4,
  },
  {
    id: 'g_dance_2',
    name: 'Maya',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.35,
    gridY: 4.85,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 9,
    patience: 95,
    hype: 85,
    bubble: 'BEER',
    bubbleTimer: 8,
    shirtColor: '#6366f1',
    hairColor: '#7c2d12',
    pantsColor: '#1e293b',
    cashSpent: 45,
    danceMove: 'FIST_PUMP',
    danceMoveTimer: 2.5,
    dancePhaseOffset: 1.7,
  },
  {
    id: 'g_dance_3',
    name: 'Zoe',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.25,
    gridY: 3.7,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 7.5,
    patience: 88,
    hype: 90,
    bubble: 'SPARKLE',
    bubbleTimer: 7,
    shirtColor: '#475569',
    hairColor: '#1e1b4b',
    pantsColor: '#0f172a',
    cashSpent: 90,
    danceMove: 'SPIN_TWIRL',
    danceMoveTimer: 2.0,
    dancePhaseOffset: 2.9,
  },
  {
    id: 'g_dance_4',
    name: 'Kai',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 4.85,
    gridY: 3.35,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 10,
    patience: 92,
    hype: 88,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#e11d48',
    hairColor: '#1e1b4b',
    pantsColor: '#1e3a8a',
    cashSpent: 45,
    danceMove: 'BREAKDANCE_WAVE',
    danceMoveTimer: 2.8,
    dancePhaseOffset: 4.1,
  },
  {
    id: 'g_dance_5',
    name: 'Aria',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 5.35,
    gridY: 3.9,
    path: [],
    state: 'DANCER_MOVES',
    stateTimer: 8.5,
    patience: 90,
    hype: 92,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#9333ea',
    hairColor: '#451a03',
    pantsColor: '#1e1b4b',
    cashSpent: 45,
    danceMove: 'CYBER_JUMP',
    danceMoveTimer: 2.4,
    dancePhaseOffset: 5.2,
  },
  // Seated Lounge Patrons on bottom-right tables & purple booth
  {
    id: 'g_seat_1',
    name: 'Milo',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 6.8,
    gridY: 6.4,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 9,
    patience: 85,
    hype: 75,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#0284c7',
    hairColor: '#1e1b4b',
    pantsColor: '#334155',
    cashSpent: 90,
  },
  {
    id: 'g_seat_2',
    name: 'Ezra',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: 6.4,
    gridY: 8.3,
    path: [],
    state: 'RESTING_AT_SEAT',
    stateTimer: 11,
    patience: 90,
    hype: 80,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#38bdf8',
    hairColor: '#78350f',
    pantsColor: '#1e293b',
    cashSpent: 90,
  },
  // Guests queuing outside in front of the screen along the front sidewalk (gy = 10.4..10.6, gx = 1.65..-0.1)
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
    hype: 70,
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
    hype: 65,
    bubble: 'MUSIC',
    bubbleTimer: 7,
    shirtColor: '#6366f1',
    hairColor: '#451a03',
    pantsColor: '#1e293b',
    cashSpent: 0,
  },
  {
    id: 'g_queue_3',
    name: 'Sienna',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: -0.11,
    gridY: 10.42,
    path: [],
    state: 'QUEUEING',
    stateTimer: 5.5,
    patience: 85,
    hype: 65,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#ec4899',
    hairColor: '#1e1b4b',
    pantsColor: '#0f172a',
    cashSpent: 0,
  },
];

export default function App() {
  const [gameState, setGameState] = useState<GameScreenState>('TITLE');

  // Economy & Progression (Matched to IMG_1503.jpeg: Level 1, $1,250, 5 Diamonds)
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(48);
  const [cash, setCash] = useState<number>(1250);
  const [gems, setGems] = useState<number>(5);
  const cashRef = useRef<number>(cash);
  cashRef.current = cash;

  // Multi-Floor State
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);
  const [unlockedFloors, setUnlockedFloors] = useState<1 | 2>(1);

  // Placed Furniture
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(INITIAL_PLACED_ITEMS);
  const [activeDrinkId, setActiveDrinkId] = useState<string>('drink_draft_beer');
  const [parkingState, setParkingState] = useState<ParkingUpgradeState>({
    lotTier: 1,
    bouncerCount: 1,
    ropeTier: 1,
  });

  // Build Mode & UI State (Default null so front entrance, queue line & parked cars are 100% visible)
  const [activeBottomTab, setActiveBottomTab] = useState<BottomDrawerTab>(null);
  const [showFullCatalog, setShowFullCatalog] = useState<boolean>(false);
  const [buildCategory, setBuildCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(
    CATALOG_ITEMS.find((i) => i.id === 'seat_bistro') || null
  );
  const [buildRotation, setBuildRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isRemoveMode, setIsRemoveMode] = useState<boolean>(false);

  // Camera Zoom & Pan Reset for Phones & Browsers
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [cameraResetTick, setCameraResetTick] = useState<number>(0);

  // Left Sidebar Modal & Club Status
  const [activeLeftModal, setActiveLeftModal] = useState<LeftModalTab>(null);
  const [isClubOpenStatus, setIsClubOpenStatus] = useState<boolean>(true);
  const [hypeSurgeBonus, setHypeSurgeBonus] = useState<number>(0);

  // Quests, Live Alerts & Audio
  const [quests, setQuests] = useState<QuestTask[]>(INITIAL_QUESTS);
  const [showLiveEvents, setShowLiveEvents] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedBpm, setSelectedBpm] = useState<number>(124);
  const [activePlaylist, setActivePlaylist] = useState<string>('Synthwave Midnight');
  const [queueCount, setQueueCount] = useState<number>(3);
  const [hypeBlastEvent, setHypeBlastEvent] = useState<HypeBlastEvent | null>(null);

  // Staff Management System (Bartenders, Bouncers, Waiters placed on the Isometric Grid)
  const [staffMembers, setStaffMembers] = useState<StaffMemberAgent[]>(
    INITIAL_STAFF_MEMBERS.map((s) => ({ ...s, path: [] }))
  );
  const [placementModeStaff, setPlacementModeStaff] = useState<StaffCatalogItem | null>(null);
  const [relocatingStaffUid, setRelocatingStaffUid] = useState<string | null>(null);

  // Global Day/Night Cycle & Neon Emissive Glow State
  const [dayNightOverrideHour, setDayNightOverrideHour] = useState<number | null>(null);
  const [dayNightReport, setDayNightReport] = useState<DayNightCycleReport>({
    hour: 18.25,
    formattedTime: '6:15 PM',
    phaseLabel: 'GOLDEN SUNSET',
    nightIntensity: 0.42,
    emissiveMultiplier: 1.52,
  });

  // 60fps Mutable Refs for Guests & Floating Cash Pops (Zero React re-renders during animation)
  const guestsRef = useRef<GuestAgent[]>(INITIAL_GUESTS.map((g) => ({ ...g })));
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const xpToNextLevel = level * 150;

  const activeDrink = useMemo(
    () => DRINK_MIXES.find((d) => d.id === activeDrinkId) || DRINK_MIXES[0],
    [activeDrinkId]
  );

  // Compute Club Hype, Vibe, and Multipliers (including Hired Staff Bonuses)
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
    totalVibe += (parkingState.ropeTier - 1) * 20;
    tipBonus += (activeDrink.tier - 1) * 0.08 + (parkingState.ropeTier - 1) * 0.06;

    const hypeSegments = Math.min(3, Math.max(1, Math.floor(totalHype / 90) + 1));
    const vibeSegments = Math.min(3, Math.max(1, Math.floor(totalVibe / 85) + 1));
    const maxGuests = 8 + parkingState.lotTier * 3 + (unlockedFloors === 2 ? 6 : 0);

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

  // Compute exact screen pixel position of the Dance Floor Center (gridX = 4.5, gridY = 4.5)
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

  // Automatically trigger SVG Hype Blast on the dance floor whenever Hype or Vibe multiplier increases
  const prevHypeMetricsRef = useRef<{ hype: number; tipBonus: number }>({
    hype: clubMetrics.totalHype,
    tipBonus: clubMetrics.tipBonus,
  });

  useEffect(() => {
    const prev = prevHypeMetricsRef.current;
    const hypeDiff = clubMetrics.totalHype - prev.hype;
    const multDiff = clubMetrics.tipBonus - prev.tipBonus;

    if (gameState === 'PLAYING' && (hypeDiff > 0 || multDiff > 0.001)) {
      triggerHypeBlast(
        hypeDiff > 0 ? hypeDiff : Math.round(multDiff * 100),
        clubMetrics.totalHype,
        clubMetrics.tipBonus
      );
    }

    prevHypeMetricsRef.current = {
      hype: clubMetrics.totalHype,
      tipBonus: clubMetrics.tipBonus,
    };
  }, [clubMetrics.totalHype, clubMetrics.tipBonus, gameState, triggerHypeBlast]);

  // Live Event Alerts matching Bottom-Right reference box ("Guests want better lighting!")
  const liveAlerts = useMemo<LiveAlert[]>(() => {
    const alerts: LiveAlert[] = [];
    if (clubMetrics.lightingCount < 2) {
      alerts.push({
        id: 'alert_light_1',
        severity: 'CRITICAL',
        message: 'Guests want better lighting!',
        actionTab: 'BUILD',
      });
      alerts.push({
        id: 'alert_light_2',
        severity: 'WARNING',
        message: 'Guests want better lighting!',
        actionTab: 'BUILD',
      });
    } else if (queueCount >= 3 && parkingState.bouncerCount < 3) {
      alerts.push({
        id: 'alert_queue_1',
        severity: 'CRITICAL',
        message: 'Queue is getting long! Send more bouncers.',
        actionTab: 'PARKING',
      });
      alerts.push({
        id: 'alert_queue_2',
        severity: 'WARNING',
        message: 'Expand parking lot for VIP arrivals!',
        actionTab: 'PARKING',
      });
    } else {
      alerts.push({
        id: 'alert_hype',
        severity: 'INFO',
        message: 'Dance floor Hype is surging! Keep drinks flowing.',
        actionTab: 'DRINKS',
      });
      alerts.push({
        id: 'alert_floor2',
        severity: 'WARNING',
        message:
          unlockedFloors === 1
            ? 'Tap staircase to unlock Floor 2 VIP Lounge!'
            : 'VIP Celebrities loving Floor 2 Sky Lounge!',
        actionTab: 'BUILD',
      });
    }
    return alerts.slice(0, 2);
  }, [clubMetrics.lightingCount, queueCount, parkingState.bouncerCount, unlockedFloors]);

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
          return { ...q, currentValue: unlockedFloors === 2 ? 1 : 0 };
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

  // Subtle rhythmic club beat audio pulse when not muted
  useEffect(() => {
    if (gameState !== 'PLAYING' || isMuted) return;
    const msPerBeat = Math.round((60 / selectedBpm) * 1000 * 2);
    const id = setInterval(() => {
      soundEngine.playBeatPulse(clubMetrics.hypeSegments);
    }, msPerBeat);
    return () => clearInterval(id);
  }, [gameState, isMuted, selectedBpm, clubMetrics.hypeSegments]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        soundEngine.playUpgradeFanfare();
        setGameState('PLAYING');
        return;
      }
      if (gameState === 'PLAYING') {
        if (e.key === 'r' || e.key === 'R') {
          setBuildRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
          soundEngine.playClick();
        } else if (e.key === 'Escape') {
          setActiveBottomTab(null);
          setActiveLeftModal(null);
          setIsRemoveMode(false);
          setPlacementModeStaff(null);
          setRelocatingStaffUid(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const spawnStaffMemberAtGrid = (
    staffCat: StaffCatalogItem,
    floor: 1 | 2,
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

    // Spawn newly hired staff at the club front entrance (or Floor 2 staircase landing)
    // and smoothly walk them along A* waypoints to their assigned station (gridX, gridY)
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

  /**
   * Smart placement & spending resolver:
   * - Checks synchronous `cashRef.current` against `item.costCash` (no hidden Gem gates blocking cash purchases).
   * - Clamps multi-tile footprints inside the 10x10 floor boundary when clicking near walls.
   * - Allows upgrading/replacing overlapping items of the same category (or placing furniture over basic dance tiles).
   * - Automatically snaps to the nearest open tile on the active floor if the exact clicked tile is occupied.
   */
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

    // 1. Check exact clamped coordinate first (empty tile OR upgrade/replace same category or dance tile)
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
          // Allow replacing same category item or placing furniture over a dance tile
          return ovCat.category === item.category || ovCat.category === 'DANCE_TILE';
        });
      if (canUpgradeReplace) {
        chosenX = reqX;
        chosenY = reqY;
        replacedUids = overlapping.map((o) => o.uid);
      }
    }

    // 2. If exact coordinate is occupied by another category or doorway, find nearest open tile on the floor
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

    // 3. Final fallback: allow replacing dance tiles at the nearest valid spot if floor is completely full
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
    // 1. Relocating an existing Staff Member to a new Isometric Grid Tile with smooth walking transition
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

    // 2. Hiring & Placing a new Staff Member on the Isometric Grid
    if (placementModeStaff) {
      const success = spawnStaffMemberAtGrid(placementModeStaff, activeFloor, coord.x, coord.y);
      if (success) {
        setPlacementModeStaff(null);
      }
      return;
    }

    // 3. Selling / Removing Furniture Item
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

    // 4. Placing Furniture Item in Build Mode
    if (activeBottomTab === 'BUILD' && selectedCatalogItem) {
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
          { uid: `f2_dj_${Date.now()}`, catalogId: 'dj_turntable', floor: 2, gridX: 6, gridY: 0, rotation: 0 },
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
    } else {
      setActiveFloor((f) => (f === 1 ? 2 : 1));
      soundEngine.playClick();
    }
  };

  const handleLoadPreset = (preset: 'DIVE' | 'VIP_MEGA') => {
    setPlacementModeStaff(null);
    setRelocatingStaffUid(null);
    if (preset === 'DIVE') {
      setLevel(1);
      setXp(48);
      setCash(1250);
      setGems(5);
      setUnlockedFloors(1);
      setActiveFloor(1);
      setPlacedItems(INITIAL_PLACED_ITEMS);
      setStaffMembers(INITIAL_STAFF_MEMBERS.map((s) => ({ ...s, path: [] })));
      setActiveDrinkId('drink_draft_beer');
      setParkingState({ lotTier: 1, bouncerCount: 1, ropeTier: 1 });
      guestsRef.current = INITIAL_GUESTS.map((g) => ({ ...g }));
      soundEngine.playClick();
    } else {
      setLevel(20);
      setXp(1850);
      setCash(18450);
      setGems(45);
      setUnlockedFloors(2);
      setActiveFloor(1);
      setPlacedItems(VIP_HOTSPOT_ITEMS);
      setStaffMembers([
        ...INITIAL_STAFF_MEMBERS.map((s) => ({ ...s, path: [] })),
        {
          uid: 'staff_bartender_vip2',
          catalogId: 'staff_bartender',
          role: 'BARTENDER',
          name: 'Jett (Mixologist)',
          floor: 1,
          gridX: 2,
          gridY: 1,
          postGridX: 2,
          postGridY: 1,
          path: [],
          taskState: 'MIXING_DRINK',
          taskTimer: 1.8,
          carryingDrinkColor: '#fbbf24',
          drinksServed: 28,
          guestsCheckedIn: 0,
          uniformColor: '#3b82f6',
          hairColor: '#1e1b4b',
          actionBubble: '🍸',
          bubbleTimer: 3,
        },
        {
          uid: 'staff_waiter_vip2',
          catalogId: 'staff_waiter',
          role: 'WAITER',
          name: 'Nova (Server)',
          floor: 1,
          gridX: 7,
          gridY: 7,
          postGridX: 7,
          postGridY: 7,
          path: [],
          taskState: 'SERVING_TABLE',
          taskTimer: 2.1,
          carryingDrinkColor: '#22d3ee',
          drinksServed: 22,
          guestsCheckedIn: 0,
          uniformColor: '#db2777',
          hairColor: '#581c87',
          actionBubble: '🍾',
          bubbleTimer: 3.5,
        },
      ]);
      setActiveDrinkId('drink_supernova_gold');
      setParkingState({ lotTier: 3, bouncerCount: 4, ropeTier: 3 });
      soundEngine.playUpgradeFanfare();
    }
  };

  const filteredCatalog = useMemo(() => {
    if (buildCategory === 'ALL') return CATALOG_ITEMS;
    return CATALOG_ITEMS.filter((i) => i.category === buildCategory);
  }, [buildCategory]);

  const unclaimedQuestCount = quests.filter((q) => q.currentValue >= q.targetValue && !q.claimed).length;

  // Featured Build Mode Items matching the reference photo's green translucent box (Chair & Speaker)
  const chairItem = useMemo(
    () => CATALOG_ITEMS.find((i) => i.id === 'seat_bistro') || CATALOG_ITEMS[0],
    []
  );
  const speakerItem = useMemo(
    () => CATALOG_ITEMS.find((i) => i.id === 'dj_speaker_stack') || CATALOG_ITEMS[1],
    []
  );
  const lightItem = useMemo(
    () => CATALOG_ITEMS.find((i) => i.id === 'light_laser_rig') || CATALOG_ITEMS[2],
    []
  );
  const danceTileItem = useMemo(
    () => CATALOG_ITEMS.find((i) => i.id === 'dance_basic') || CATALOG_ITEMS[3],
    []
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#090518] select-none">
      {/* 1. 60FPS HAND-ILLUSTRATED 2.5D ISOMETRIC NIGHTCLUB CANVAS */}
      <IsometricClubCanvas
        isPlaying={gameState === 'PLAYING'}
        activeFloor={activeFloor}
        unlockedFloors={unlockedFloors}
        playerLevel={level}
        placedItems={placedItems}
        staffMembers={staffMembers}
        guestsRef={guestsRef}
        floatingTextsRef={floatingTextsRef}
        buildModeItem={
          activeBottomTab === 'BUILD' && !isRemoveMode && !placementModeStaff && !relocatingStaffUid
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

      {/* 1B. 60FPS SVG PARTICLE "HYPE BLAST" OVERLAY ON THE DANCE FLOOR */}
      <HypeBlastOverlay blastEvent={hypeBlastEvent} />

      {/* =====================================================================
          TITLE SCREEN OVERLAY (Game Shell Rule: Bespoke SVG Lockup + Start CTA)
         ===================================================================== */}
      {gameState === 'TITLE' && (
        <div className="fixed inset-0 z-40 flex items-center justify-between px-6 sm:px-12 lg:px-20 bg-gradient-to-r from-[#090518]/95 via-[#090518]/80 to-transparent overflow-y-auto">
          <div className="max-w-xl space-y-5 py-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400">
                <span>60FPS 2.5D Isometric Nightclub Sim</span>
                <span>·</span>
                <span>All Browsers &amp; Phones</span>
              </div>

              <svg
                viewBox="0 0 520 115"
                className="w-full max-w-md drop-shadow-[0_0_24px_rgba(236,72,153,0.55)]"
                aria-label="Neon Nights Title Logo"
              >
                <defs>
                  <linearGradient id="neonTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
                <text
                  x="4"
                  y="64"
                  fill="url(#neonTitleGrad)"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="800"
                  fontSize="64"
                  letterSpacing="2"
                >
                  NEON NIGHTS
                </text>
                <text
                  x="6"
                  y="100"
                  fill="#e2e8f0"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                  fontSize="20"
                  letterSpacing="6"
                >
                  NIGHTCLUB CITY TYCOON
                </text>
              </svg>
            </div>

            <p className="text-sm sm:text-base text-purple-100/90 leading-relaxed">
              Start with a gritty basement dive with exposed brick walls, warm Edison string lights, a 6x6 glowing pastel dance grid, and a wooden bar counter. Upgrade to a multi-story VIP nightclub with laser rigs, bottle service, and A* guest pathfinding.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  soundEngine.playUpgradeFanfare();
                  setGameState('PLAYING');
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-b from-lime-400 via-emerald-500 to-emerald-700 hover:from-lime-300 hover:to-emerald-600 text-white font-black text-base sm:text-lg border-2 border-lime-200 shadow-[0_5px_0_#064e3b] active:translate-y-0.5 transition-all cursor-pointer"
              >
                Play Neon Nights (Level 1 Dive)
              </button>
            </div>

            <div className="text-xs font-mono text-purple-300/75 pt-1">
              Tap or Click Tiles to Place Gear · Drag to Pan Camera · R Key Rotate · Esc Close Menus
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PLAYING HUD ARCHITECTURE (MATCHED TO REFERENCE PHOTO IMG_1503.jpeg)
         ===================================================================== */}
      {gameState === 'PLAYING' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
          {/* -----------------------------------------------------------------
              TOP BAR: TOP-LEFT 5-POINT STAR LEVEL BADGE & XP + TOP-RIGHT CURRENCIES & METERS
             ----------------------------------------------------------------- */}
          <div className="flex items-start justify-between gap-2">
            {/* TOP-LEFT: Custom 5-Point Golden Star Level Badge + Dark XP Bar */}
            <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
              <div className="relative flex items-center">
                {/* 5-Point Gold Star SVG with "Level 1" */}
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)]">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="55%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="50,4 64,32 95,36 72,58 78,90 50,75 22,90 28,58 5,36 36,32"
                      fill="url(#goldStarGrad)"
                      stroke="#1e1b4b"
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                    <span className="text-[9px] sm:text-[11px] font-black text-slate-950 leading-none">
                      Level
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] leading-none mt-0.5">
                      {level}
                    </span>
                  </div>
                </div>

                {/* Dark Rounded XP Bar with Neon Cyan Border & Electric Blue Fill + Status "OPEN" Badge (image_5.png spec) */}
                <div className="-ml-4 pl-6 pr-2.5 py-1.5 sm:py-2 bg-[#140e26]/95 border-2 border-cyan-400/80 rounded-2xl shadow-[0_4px_0_#150d2a,0_0_12px_rgba(34,211,238,0.25)] min-w-[175px] sm:min-w-[275px] flex items-center gap-2">
                  <div className="relative flex-1 h-5 sm:h-6 bg-[#0d091a] rounded-xl overflow-hidden border border-cyan-500/40 flex items-center">
                    <div
                      className="h-full bg-gradient-to-r from-sky-600 via-cyan-400 to-blue-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }}
                    />
                    <span className="absolute left-2.5 text-[11px] sm:text-xs font-black text-white tracking-wider drop-shadow-[0_1.5px_0_#150d2a]">
                      XP {xp}/{xpToNextLevel}
                    </span>
                  </div>

                  {/* Interactive Neon "OPEN" Status Badge (image_5.png Top HUD requirement) */}
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsClubOpenStatus((prev) => !prev);
                    }}
                    title="Toggle Club OPEN / VIP ONLY Status"
                    className={`px-2 py-0.5 sm:py-1 rounded-lg border-2 border-[#150d2a] font-black text-[10px] sm:text-xs tracking-wider uppercase cursor-pointer shadow-[0_2px_0_#150d2a] transition-all ${
                      isClubOpenStatus
                        ? 'bg-gradient-to-b from-lime-400 to-emerald-600 text-slate-950 shadow-[0_0_10px_rgba(132,204,22,0.5)]'
                        : 'bg-gradient-to-b from-pink-500 to-rose-700 text-white'
                    }`}
                  >
                    {isClubOpenStatus ? 'OPEN' : 'VIP'}
                  </button>
                </div>
              </div>
            </div>

            {/* TOP-RIGHT: Cash Pill ($1,250), Gem Pill (5 +), Hype Lightning & Vibe Flame 3-Box Meters */}
            <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2.5">
                {/* Soft Currency: Gold Coin ($) + $1,250 Pill */}
                <div className="flex items-center gap-2 sm:gap-3 bg-[#1b1630]/95 border-[2.5px] border-[#3d3363] rounded-full pl-1.5 pr-3.5 py-1 shadow-xl">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border-2 border-[#1e1b4b] flex items-center justify-center font-black text-amber-950 text-base sm:text-lg shadow-inner">
                    $
                  </div>
                  <span className="text-base sm:text-2xl font-black text-white tracking-tight tabular-nums drop-shadow">
                    ${cash.toLocaleString()}
                  </span>
                </div>

                {/* Hard Currency: Faceted Pink Diamond + Count + Teal '+' Button */}
                <div className="flex items-center gap-2 sm:gap-3 bg-[#1b1630]/95 border-[2.5px] border-[#3d3363] rounded-full pl-2 pr-1.5 py-1 shadow-xl">
                  {/* Faceted Pink Diamond SVG */}
                  <svg viewBox="0 0 36 32" className="w-6 h-6 sm:w-8 sm:h-7 shrink-0 drop-shadow">
                    <polygon
                      points="10,2 26,2 34,11 18,30 2,11"
                      fill="#e879f9"
                      stroke="#1e1b4b"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    <polygon points="10,2 26,2 22,11 14,11" fill="#f5d0fe" />
                    <polygon points="2,11 14,11 18,30" fill="#c026d3" />
                    <polygon points="22,11 34,11 18,30" fill="#a21caf" />
                  </svg>
                  <span className="text-base sm:text-2xl font-black text-white tabular-nums px-0.5 sm:px-1">
                    {gems}
                  </span>
                  <button
                    onClick={() => {
                      setGems((g) => g + 5);
                      soundEngine.playCashRegister();
                    }}
                    title="Add +5 Gems"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-teal-300 via-teal-400 to-emerald-600 border-2 border-[#1e1b4b] text-white flex items-center justify-center font-black shadow cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5]" />
                  </button>
                </div>

                {/* Hype Lightning & Vibe Flame 3-Box Star Meters Stack (Tap to surge Hype to 3/3 Max & trigger Dancer Confetti/Bubbles!) */}
                <button
                  onClick={() => {
                    soundEngine.playUpgradeFanfare();
                    setHypeSurgeBonus((prev) => (prev >= 110 ? 0 : 120));
                    triggerHypeBlast(35, clubMetrics.totalHype + 35, clubMetrics.tipBonus);
                  }}
                  title="Tap to surge Hype to 3/3 Max & trigger Dancer Confetti/Bubbles!"
                  className="hidden sm:flex flex-col gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                  {/* Top Row: Yellow Lightning Bolt + 3 Dark Recessed Boxes + Star */}
                  <div className="flex items-center gap-1.5 bg-[#1b1630]/95 border-[2.5px] border-[#3d3363] hover:border-amber-400 rounded-full pl-1.5 pr-2.5 py-1 shadow-xl">
                    <svg viewBox="0 0 28 32" className="w-6 h-6 -ml-1 shrink-0 drop-shadow">
                      <polygon
                        points="16,1 3,18 13,18 10,31 25,13 15,13"
                        fill="#facc15"
                        stroke="#1e1b4b"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`w-5 h-4 rounded-sm border border-[#0f0b1e] ${
                            clubMetrics.hypeSegments >= seg
                              ? 'bg-gradient-to-b from-amber-300 to-amber-500'
                              : 'bg-[#110e20]'
                          }`}
                        />
                      ))}
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4a4269] fill-current ml-0.5">
                      <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                    </svg>
                  </div>

                  {/* Bottom Row: Orange Flame Crown Icon + 3 Dark Recessed Boxes + Star */}
                  <div className="flex items-center gap-1.5 bg-[#1b1630]/95 border-[2.5px] border-[#3d3363] hover:border-orange-400 rounded-full pl-1.5 pr-2.5 py-1 shadow-xl">
                    <svg viewBox="0 0 28 28" className="w-6 h-6 -ml-1 shrink-0 drop-shadow">
                      <path
                        d="M14,2 C18,8 25,9 24,18 C23,24 18,26 14,26 C10,26 5,24 4,18 C3,9 10,8 14,2 Z"
                        fill="#f97316"
                        stroke="#1e1b4b"
                        strokeWidth="2.5"
                      />
                      <circle cx="10" cy="17" r="1.8" fill="#1e1b4b" />
                      <circle cx="18" cy="17" r="1.8" fill="#1e1b4b" />
                    </svg>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`w-5 h-4 rounded-sm border border-[#0f0b1e] ${
                            clubMetrics.vibeSegments >= seg
                              ? 'bg-gradient-to-b from-orange-400 to-rose-500'
                              : 'bg-[#110e20]'
                          }`}
                        />
                      ))}
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4a4269] fill-current ml-0.5">
                      <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Compact Utility Row: Day/Night Cycle Clock, Stage Switcher, Zoom, Floor 2 & Audio */}
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {/* Interactive Day/Night Cycle & Neon Emissive Intensity Pill */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setDayNightOverrideHour((prev) => {
                      if (prev === null) return 16.5; // Golden Sunset
                      if (prev === 16.5) return 20.5; // Twilight Dusk
                      if (prev === 20.5) return 0.75; // Midnight Neon Peak
                      if (prev === 0.75) return 3.5; // Afterhours Glow
                      return null; // Resume Auto Day/Night Cycle
                    });
                  }}
                  title="Tap to cycle Day/Night Phase (Auto -> Sunset -> Dusk -> Midnight Neon Peak -> Afterhours)"
                  className="px-2.5 py-1 rounded-xl bg-[#1b1630]/95 border border-amber-400/60 hover:border-cyan-300 text-amber-200 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <span className="font-mono text-cyan-300">{dayNightReport.formattedTime}</span>
                  <span className="hidden md:inline text-purple-200">·</span>
                  <span className="hidden md:inline text-[10px] tracking-wide text-pink-300">
                    {dayNightReport.phaseLabel}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono text-cyan-200">
                    {dayNightReport.emissiveMultiplier.toFixed(2)}x NEON
                    {dayNightOverrideHour !== null ? ' (LOCKED)' : ''}
                  </span>
                </button>

                <button
                  onClick={handleFloor2Action}
                  className="px-2.5 py-1 rounded-xl bg-[#1b1630]/95 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>
                    {unlockedFloors === 1
                      ? 'Unlock Floor 2 ($2,500)'
                      : `Floor ${activeFloor} (Switch)`}
                  </span>
                </button>

                <div className="flex items-center bg-[#1b1630]/95 border border-purple-400/40 rounded-xl overflow-hidden shadow">
                  <button
                    onClick={() => setCameraZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}
                    className="p-1.5 text-purple-200 hover:text-white cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCameraZoom(1.0);
                      setCameraResetTick((t) => t + 1);
                    }}
                    className="px-1.5 text-[10px] font-mono font-bold text-cyan-300 cursor-pointer"
                    title="Reset Camera View"
                  >
                    {Math.round(cameraZoom * 100)}%
                  </button>
                  <button
                    onClick={() => setCameraZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))}
                    className="p-1.5 text-purple-200 hover:text-white cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    const next = !isMuted;
                    setIsMuted(next);
                    soundEngine.isMuted = next;
                  }}
                  className="p-1.5 rounded-xl bg-[#1b1630]/95 border border-purple-400/40 text-purple-200 hover:text-white cursor-pointer shadow"
                  aria-label="Toggle Sound"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              MIDDLE ZONE: LEFT SIDEBAR SQUIRCLES + GREEN BUILD MODE BOX + LIVE EVENT BOX
             ----------------------------------------------------------------- */}
          <div className="flex-1 flex items-center justify-between relative my-1">
            {/* LEFT PANEL: Vertical array of action trackers (Genre, Bass, Dedicate + Quests) with colorful circular icons
                and dark glossy rounded Playlist panel (matching image_5.png & IMG_1503.jpeg) */}
            <div className="flex flex-col gap-2 pointer-events-auto">
              {/* Dark Glossy Heavily Rounded Active Playlist Capsule (image_5.png Left Panel guideline) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'PLAYLISTS' ? null : 'PLAYLISTS'));
                }}
                className="px-2.5 py-1.5 rounded-2xl bg-gradient-to-b from-[#241942]/95 to-[#120b24]/95 border-2 border-cyan-400/75 shadow-[0_4px_0_#150d2a,0_0_12px_rgba(34,211,238,0.25)] flex items-center gap-2 cursor-pointer text-left max-w-[155px] sm:max-w-[185px]"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 border-2 border-[#150d2a] flex items-center justify-center shrink-0 text-[11px] font-black text-white">
                  ♫
                </div>
                <div className="truncate">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-cyan-300 leading-none">
                    NOW PLAYING
                  </div>
                  <div className="text-[11px] font-black text-white truncate drop-shadow-[0_1.5px_0_#150d2a]">
                    {activePlaylist}
                  </div>
                </div>
              </button>

              {/* 1. GENRE (Colorful Circular Vinyl/Note Tracker) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'PLAYLISTS' ? null : 'PLAYLISTS'));
                }}
                className="group relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#140e26]/95 border-2 border-cyan-400/80 shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-[#150d2a] flex items-center justify-center shadow mb-0.5">
                  <svg viewBox="0 0 32 32" className="w-6 h-6">
                    <circle cx="16" cy="16" r="11" fill="#0f172a" stroke="#150d2a" strokeWidth="2" />
                    <circle cx="16" cy="16" r="4.5" fill="#f43f5e" />
                    <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_2px_0_#150d2a]">
                  Genre
                </span>
              </button>

              {/* 2. BASS (Colorful Circular Subwoofer Woofer Cone Tracker) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'DJ_BOOTH' ? null : 'DJ_BOOTH'));
                }}
                className="group relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#140e26]/95 border-2 border-pink-400/80 shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 border-2 border-[#150d2a] text-slate-950 text-[9px] font-black shadow">
                  {selectedBpm}
                </span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-fuchsia-400 to-purple-700 border-2 border-[#150d2a] flex items-center justify-center shadow mb-0.5">
                  <svg viewBox="0 0 32 32" className="w-6 h-6">
                    <circle cx="16" cy="16" r="10" fill="#1e1b4b" stroke="#150d2a" strokeWidth="2" />
                    <circle cx="16" cy="16" r="6" fill="#38bdf8" stroke="#150d2a" strokeWidth="1.5" />
                    <circle cx="16" cy="16" r="2.5" fill="#facc15" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_2px_0_#150d2a]">
                  Bass
                </span>
              </button>

              {/* 3. DEDICATE (Colorful Circular Neon Heart/Dedication Tracker) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'CELEBS' ? null : 'CELEBS'));
                }}
                className="group relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#140e26]/95 border-2 border-cyan-400/80 shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-white text-[10px] font-black flex items-center justify-center shadow">
                  ♥
                </span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-rose-400 to-pink-600 border-2 border-[#150d2a] flex items-center justify-center shadow mb-0.5">
                  <svg viewBox="0 0 32 32" className="w-5 h-5">
                    <path
                      d="M16 26 C16 26 5 18 5 11 C5 7 8.5 5 12 5 C14.2 5 16 6.8 16 6.8 C16 6.8 17.8 5 20 5 C23.5 5 27 7 27 11 C27 18 16 26 16 26 Z"
                      fill="#fef08a"
                      stroke="#150d2a"
                      strokeWidth="2.2"
                    />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_2px_0_#150d2a]">
                  Dedicate
                </span>
              </button>

              {/* 4. QUESTS (Clipboard + Reward Counter) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'QUESTS' ? null : 'QUESTS'));
                }}
                className="group relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#140e26]/95 border-2 border-pink-400/80 shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-white text-[10px] font-black flex items-center justify-center shadow">
                  {unclaimedQuestCount > 0 ? unclaimedQuestCount : '!'}
                </span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-[#150d2a] flex items-center justify-center shadow mb-0.5">
                  <svg viewBox="0 0 32 32" className="w-5 h-5">
                    <rect x="8" y="6" width="16" height="20" rx="2" fill="#fef3c7" stroke="#150d2a" strokeWidth="2" />
                    <path d="M11 14 L14 17 L20 11 M11 20 L14 23 L20 17" stroke="#16a34a" strokeWidth="2.2" fill="none" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_2px_0_#150d2a]">
                  Quests
                </span>
              </button>
            </div>

            {/* LEFT SIDEBAR POPUP DRAWER */}
            {activeLeftModal && (
              <div className="absolute left-20 sm:left-24 top-0 z-30 w-72 sm:w-96 bg-[#181030]/98 border-2 border-purple-400/60 rounded-2xl shadow-2xl p-4 pointer-events-auto text-white">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/30">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    {activeLeftModal === 'QUESTS' && 'Club Progression Quests'}
                    {activeLeftModal === 'DJ_BOOTH' && 'DJ Booth & Sound System'}
                    {activeLeftModal === 'PLAYLISTS' && 'Nightclub Playlists (Lvl 3+)'}
                    {activeLeftModal === 'CELEBS' && 'VIP Celebrity Roster (Lvl 5+)'}
                  </h3>
                  <button
                    onClick={() => setActiveLeftModal(null)}
                    className="w-7 h-7 rounded-lg bg-purple-900/70 flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {activeLeftModal === 'QUESTS' && (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {quests.map((q) => {
                      const isDone = q.currentValue >= q.targetValue;
                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl bg-purple-950/70 border border-purple-500/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-white">{q.title}</div>
                              <p className="text-xs text-purple-200/75 leading-snug">
                                {q.description}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300 shrink-0">
                              {q.currentValue}/{q.targetValue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-mono text-amber-300">
                              +${q.rewardCash} · +{q.rewardGems} Gems
                            </span>
                            {q.claimed ? (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Claimed
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
                                className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                    : 'bg-purple-900/50 text-purple-400 cursor-not-allowed'
                                }`}
                              >
                                {isDone ? 'Claim Reward' : 'In Progress'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeLeftModal === 'DJ_BOOTH' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/30">
                      <div className="text-xs text-purple-300 mb-1">Active Tempo &amp; Beat Drop</div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold font-mono text-cyan-300">
                          {selectedBpm} BPM
                        </span>
                        <div className="flex items-center gap-1">
                          {[118, 124, 132, 140].map((bpm) => (
                            <button
                              key={bpm}
                              onClick={() => {
                                setSelectedBpm(bpm);
                                soundEngine.setBpm(bpm);
                                soundEngine.playClick();
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                                selectedBpm === bpm
                                  ? 'bg-fuchsia-500 text-white'
                                  : 'bg-purple-900/60 text-purple-200'
                              }`}
                            >
                              {bpm}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (cash < 150) {
                          soundEngine.playError();
                          return;
                        }
                        setCash((c) => c + 170);
                        addXp(45);
                        soundEngine.playUpgradeFanfare();
                        floatingTextsRef.current.push({
                          id: `hype_drop_${performance.now()}`,
                          text: 'MEGA BASS DROP! +$320 TIPS',
                          floor: activeFloor,
                          gridX: 4,
                          gridY: 4,
                          color: '#f472b6',
                          age: 0,
                        });
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow cursor-pointer"
                    >
                      Trigger Laser Bass Drop ($150 → +$320 Tips)
                    </button>
                  </div>
                )}

                {activeLeftModal === 'PLAYLISTS' && (
                  <div className="space-y-2">
                    {[
                      { name: 'Synthwave Midnight', bonus: '+10% Drink Speed', minLvl: 1 },
                      { name: 'Cyberpunk Bassline', bonus: '+25% Dancer Hype Drop', minLvl: 3 },
                      { name: 'VIP Gold House Anthems', bonus: '+40% Celebrity Tip Rate', minLvl: 5 },
                    ].map((pl) => {
                      const locked = level < pl.minLvl;
                      return (
                        <button
                          key={pl.name}
                          disabled={locked}
                          onClick={() => {
                            setActivePlaylist(pl.name);
                            soundEngine.playClick();
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                            activePlaylist === pl.name
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : locked
                              ? 'bg-purple-950/40 border-purple-800/30 text-purple-400 cursor-not-allowed'
                              : 'bg-purple-950/70 border-purple-500/30 text-purple-100'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{pl.name}</div>
                            <div className="text-[11px] text-cyan-300">{pl.bonus}</div>
                          </div>
                          <span className="text-xs font-mono">
                            {locked ? `Lvl ${pl.minLvl}` : activePlaylist === pl.name ? 'ACTIVE' : 'Select'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeLeftModal === 'CELEBS' && (
                  <div className="space-y-2">
                    {CELEBRITY_NAMES.map((cName, idx) => (
                      <div
                        key={cName}
                        className="p-2.5 rounded-xl bg-purple-950/70 border border-amber-400/30 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            <span>{cName}</span>
                          </div>
                          <div className="text-[11px] text-purple-200/75">3.0x Drink &amp; Booth Tips</div>
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
                              state: 'DANCING',
                              stateTimer: 10,
                              patience: 100,
                              hype: 100,
                              bubble: 'VIP_CROWN',
                              bubbleTimer: 8,
                              shirtColor: '#facc15',
                              hairColor: '#1e1b4b',
                              pantsColor: '#311042',
                              cashSpent: 650,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          Invite (2 Gems)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------
                BOTTOM-CENTER TRANSLUCENT GREEN "Build Mode" OVERLAY BOX
                (Exact visual match to the green Build Mode box in IMG_1503.jpeg with Chair & Speaker icons)
               --------------------------------------------------------------- */}
            {activeBottomTab && (
              <div className="mx-auto mt-auto mb-1 pointer-events-auto">
                {activeBottomTab === 'BUILD' && !showFullCatalog && (
                  <div className="relative w-[290px] sm:w-[370px] bg-[#6ee777]/75 border-[2.5px] border-[#a7f3d0] rounded-2xl px-4 pt-2 pb-3 shadow-[0_10px_28px_rgba(34,197,94,0.45)]">
                    {/* Top-Center "Build Mode" Header with Bold Black Outline */}
                    <div className="text-center -mt-4 mb-1">
                      <span className="text-lg sm:text-xl font-black text-white tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                        Build Mode
                      </span>
                    </div>

                    {/* Top-Right Grey 'X' Close Button */}
                    <button
                      onClick={() => setActiveBottomTab(null)}
                      className="absolute top-2 right-2.5 w-6 h-6 rounded-md bg-slate-800/80 border border-slate-950 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer"
                      aria-label="Close Build Mode"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Center Illustrated Isometric Wooden Chair & Subwoofer Speaker Box */}
                    <div className="flex items-center justify-center gap-5 sm:gap-7 my-1">
                      {/* 1. Isometric Wooden Chair Button */}
                      <button
                        onClick={() => {
                          setIsRemoveMode(false);
                          setSelectedCatalogItem(chairItem);
                          purchaseAndPlaceCatalogItem(chairItem);
                        }}
                        className={`group flex flex-col items-center p-2 rounded-xl transition-transform cursor-pointer ${
                          selectedCatalogItem?.id === chairItem.id && !isRemoveMode
                            ? 'bg-emerald-950/35 ring-2 ring-white scale-105'
                            : 'hover:bg-emerald-950/20'
                        }`}
                        title={`Buy & Place ${chairItem.name} ($${chairItem.costCash})`}
                      >
                        <svg viewBox="0 0 64 72" className="w-14 h-16 sm:w-16 sm:h-18 drop-shadow">
                          {/* Chair Backrest */}
                          <polygon
                            points="18,10 38,4 38,34 18,40"
                            fill="#528265"
                            stroke="#1e293b"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                          {/* Chair Seat */}
                          <polygon
                            points="18,38 38,32 54,40 34,46"
                            fill="#659c7a"
                            stroke="#1e293b"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                          {/* Chair Legs */}
                          <path
                            d="M19,40 V60 M34,46 V66 M53,40 V60 M38,34 V52"
                            stroke="#2e4f3b"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-[11px] font-black text-slate-950 bg-white/80 px-2 py-0.5 rounded-full mt-0.5">
                          Chair (${chairItem.costCash})
                        </span>
                      </button>

                      {/* 2. Isometric Black Subwoofer Speaker Box Button */}
                      <button
                        onClick={() => {
                          setIsRemoveMode(false);
                          setSelectedCatalogItem(speakerItem);
                          purchaseAndPlaceCatalogItem(speakerItem);
                        }}
                        className={`group flex flex-col items-center p-2 rounded-xl transition-transform cursor-pointer ${
                          selectedCatalogItem?.id === speakerItem.id && !isRemoveMode
                            ? 'bg-emerald-950/35 ring-2 ring-white scale-105'
                            : 'hover:bg-emerald-950/20'
                        }`}
                        title={`Buy & Place ${speakerItem.name} ($${speakerItem.costCash})`}
                      >
                        <svg viewBox="0 0 64 72" className="w-14 h-16 sm:w-16 sm:h-18 drop-shadow">
                          {/* Top Face */}
                          <polygon
                            points="32,12 52,20 34,28 14,20"
                            fill="#475569"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                          {/* Left Front Speaker Face */}
                          <polygon
                            points="14,20 34,28 34,62 14,54"
                            fill="#334155"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                          {/* Right Side Face */}
                          <polygon
                            points="34,28 52,20 52,54 34,62"
                            fill="#1e293b"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                          {/* Top Tweeter Cone */}
                          <ellipse
                            cx="24"
                            cy="33"
                            rx="4.5"
                            ry="5.5"
                            fill="#0f172a"
                            stroke="#64748b"
                            strokeWidth="1.5"
                          />
                          {/* Bottom Woofer Cone */}
                          <ellipse
                            cx="24"
                            cy="48"
                            rx="6.5"
                            ry="7.5"
                            fill="#0f172a"
                            stroke="#64748b"
                            strokeWidth="1.8"
                          />
                          <circle cx="24" cy="48" r="2.5" fill="#475569" />
                        </svg>
                        <span className="text-[11px] font-black text-slate-950 bg-white/80 px-2 py-0.5 rounded-full mt-0.5">
                          Speaker (${speakerItem.costCash})
                        </span>
                      </button>
                    </div>

                    {/* Quick Action Bar at bottom of green Build Mode box */}
                    <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-emerald-900/25">
                      <button
                        onClick={() => {
                          setIsRemoveMode(false);
                          setSelectedCatalogItem(lightItem);
                          purchaseAndPlaceCatalogItem(lightItem);
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                          selectedCatalogItem?.id === lightItem.id
                            ? 'bg-slate-950 text-cyan-300'
                            : 'bg-emerald-950/70 text-white hover:bg-emerald-950'
                        }`}
                      >
                        +Laser (${lightItem.costCash})
                      </button>

                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          setActiveBottomTab('FRIENDS');
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-950/90 text-cyan-300 hover:bg-cyan-900 text-[11px] font-black cursor-pointer"
                        title="Hire & Place Bartenders, Bouncers, and Waiters on the Grid"
                      >
                        +Staff ({staffMembers.length})
                      </button>

                      <button
                        onClick={() => {
                          setBuildRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
                          soundEngine.playClick();
                        }}
                        className="p-1 rounded-lg bg-slate-900/80 text-white hover:bg-slate-950 cursor-pointer"
                        title="Rotate Item"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setShowFullCatalog(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-900 text-[11px] font-black cursor-pointer"
                      >
                        All 16 Items ▸
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTIVE STAFF GRID PLACEMENT / RELOCATION FLOATING BANNER */}
                {(placementModeStaff || relocatingStaffUid) && (
                  <div className="mb-2 w-[320px] sm:w-[480px] bg-cyan-950/95 border-2 border-cyan-300 rounded-2xl px-3.5 py-2.5 shadow-2xl text-white flex items-center justify-between gap-2">
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
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* EXPANDED FULL 16-ITEM BUILD CATALOG */}
                {activeBottomTab === 'BUILD' && showFullCatalog && (
                  <div className="w-[330px] sm:w-[560px] bg-[#34d399]/90 border-[2.5px] border-emerald-100 rounded-2xl p-3 shadow-2xl text-slate-950">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowFullCatalog(false)}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 text-emerald-300 text-xs font-bold cursor-pointer"
                        >
                          ◂ Compact View
                        </button>
                        <h3 className="text-sm sm:text-base font-black text-white drop-shadow">
                          Full Catalog (Floor {activeFloor})
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            setActiveBottomTab('FRIENDS');
                          }}
                          className="px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 text-xs font-bold cursor-pointer"
                        >
                          Hire Staff ({staffMembers.length})
                        </button>
                        <button
                          onClick={() => {
                            setBuildRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
                            soundEngine.playClick();
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{buildRotation}°</span>
                        </button>
                        <button
                          onClick={() => setIsRemoveMode((p) => !p)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            isRemoveMode ? 'bg-rose-600 text-white' : 'bg-slate-900 text-rose-300'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isRemoveMode ? 'Selling' : 'Sell'}</span>
                        </button>
                        <button
                          onClick={() => setActiveBottomTab(null)}
                          className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2">
                      {(
                        [
                          { id: 'ALL', label: 'All' },
                          { id: 'SEATING', label: 'Seating' },
                          { id: 'LIGHTING', label: 'Lights' },
                          { id: 'DANCE_TILE', label: 'Dance Grid' },
                          { id: 'BAR_UNIT', label: 'Bars' },
                          { id: 'DJ_BOOTH', label: 'DJ Gear' },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setBuildCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer ${
                            buildCategory === cat.id
                              ? 'bg-slate-950 text-emerald-300'
                              : 'bg-emerald-800/70 text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
                            className={`w-36 shrink-0 p-2 rounded-xl border-2 text-left cursor-pointer ${
                              isSelected
                                ? 'bg-slate-950 border-white text-white'
                                : 'bg-emerald-950/85 border-emerald-300/40 text-emerald-50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-emerald-300">
                                T{item.tier} · {item.width}x{item.depth}
                              </span>
                              <span className="text-amber-300">+{item.hypeBonus}⚡</span>
                            </div>
                            <div className="text-xs font-extrabold truncate mt-0.5">{item.name}</div>
                            <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-emerald-500/30 text-xs font-mono font-bold">
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
                                className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                                  canAfford
                                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                    : 'bg-rose-950/80 text-rose-300'
                                }`}
                              >
                                Buy+Place
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DRINK MIXES DRAWER */}
                {activeBottomTab === 'DRINKS' && (
                  <div className="w-[330px] sm:w-[540px] bg-[#2a1245]/95 border-2 border-fuchsia-400 rounded-2xl p-3.5 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-fuchsia-200">
                          Drink Crafting &amp; Mixology Menu (Bar Tier {clubMetrics.maxBarTier})
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-purple-900/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DRINK_MIXES.map((drink) => {
                        const isCurrent = drink.id === activeDrinkId;
                        const barUnlocked = clubMetrics.maxBarTier >= drink.requiredBarTier;
                        return (
                          <button
                            key={drink.id}
                            onClick={() => {
                              if (!barUnlocked) {
                                soundEngine.playError();
                                return;
                              }
                              setActiveDrinkId(drink.id);
                              soundEngine.playCashRegister();
                            }}
                            className={`p-2.5 rounded-xl border-2 text-left cursor-pointer ${
                              isCurrent
                                ? 'bg-fuchsia-600/35 border-cyan-300'
                                : barUnlocked
                                ? 'bg-purple-950/75 border-purple-500/40'
                                : 'bg-purple-950/40 border-purple-800/30 opacity-65'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-extrabold" style={{ color: drink.color }}>
                                {drink.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-300">
                                +${drink.sellPrice}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                              <span className="text-amber-300">+{drink.hypeBoost} Hype</span>
                              <span className="font-bold text-cyan-300">
                                {!barUnlocked
                                  ? `Need Tier ${drink.requiredBarTier} Bar`
                                  : isCurrent
                                  ? '✓ SERVING'
                                  : 'Serve'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PARKING / LINE DRAWER */}
                {activeBottomTab === 'PARKING' && (
                  <div className="w-[330px] sm:w-[540px] bg-[#22133d]/95 border-2 border-purple-400 rounded-2xl p-3.5 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-purple-200">
                        Parking Lot, Velvet Ropes &amp; Security Bouncers
                      </h3>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-purple-900/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-300">
                            Lot Tier {parkingState.lotTier}/3
                          </div>
                          <div className="text-xs font-extrabold mt-0.5">Parking Lot</div>
                        </div>
                        <button
                          disabled={parkingState.lotTier >= 3}
                          onClick={() => {
                            const cost = parkingState.lotTier * 600;
                            if (cash < cost) {
                              soundEngine.playError();
                              return;
                            }
                            setCash((c) => c - cost);
                            setParkingState((p) => ({
                              ...p,
                              lotTier: Math.min(3, p.lotTier + 1) as 1 | 2 | 3,
                            }));
                            addXp(70);
                            soundEngine.playUpgradeFanfare();
                          }}
                          className="mt-2 w-full py-1.5 rounded-lg bg-emerald-400 disabled:bg-purple-900 disabled:text-purple-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                        >
                          {parkingState.lotTier >= 3 ? 'MAX' : `$${parkingState.lotTier * 600}`}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-300">
                            {staffMembers.filter((s) => s.role === 'BOUNCER').length} On Grid
                          </div>
                          <div className="text-xs font-extrabold mt-0.5">Place Bouncer</div>
                        </div>
                        <button
                          onClick={() => {
                            const bouncerCat = STAFF_CATALOG.find((s) => s.role === 'BOUNCER')!;
                            setPlacementModeStaff(bouncerCat);
                            setActiveBottomTab(null);
                            soundEngine.playClick();
                          }}
                          className="mt-2 w-full py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                        >
                          Place ($350)
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-300">
                            Rope Tier {parkingState.ropeTier}/3
                          </div>
                          <div className="text-xs font-extrabold mt-0.5">Velvet Rope</div>
                        </div>
                        <button
                          disabled={parkingState.ropeTier >= 3}
                          onClick={() => {
                            const cost = parkingState.ropeTier * 450;
                            if (cash < cost) {
                              soundEngine.playError();
                              return;
                            }
                            setCash((c) => c - cost);
                            setParkingState((p) => ({
                              ...p,
                              ropeTier: Math.min(3, p.ropeTier + 1) as 1 | 2 | 3,
                            }));
                            addXp(55);
                            soundEngine.playUpgradeFanfare();
                          }}
                          className="mt-2 w-full py-1.5 rounded-lg bg-emerald-400 disabled:bg-purple-900 disabled:text-purple-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                        >
                          {parkingState.ropeTier >= 3 ? 'MAX' : `$${parkingState.ropeTier * 450}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAFF MANAGEMENT SYSTEM & INVITE FRIENDS DRAWER */}
                {activeBottomTab === 'FRIENDS' && (
                  <div className="w-[340px] sm:w-[580px] bg-[#241033]/96 border-2 border-pink-400 rounded-2xl p-3.5 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-pink-200">
                          Club Staff Management &amp; Grid Automation ({staffMembers.length} Active)
                        </h3>
                        <p className="text-[11px] text-purple-200/80">
                          Hire Bartenders, Bouncers &amp; Waiters and place them on any isometric tile
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-pink-950/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 1. HIRE & PLACE STAFF CATALOG (Bartender, Bouncer, Waiter) */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      {STAFF_CATALOG.map((staffCat) => {
                        const canAfford = cash >= staffCat.hireCostCash;
                        const roleCount = staffMembers.filter((s) => s.role === staffCat.role).length;
                        return (
                          <div
                            key={staffCat.id}
                            className="p-2 rounded-xl bg-purple-950/85 border border-pink-400/40 flex flex-col justify-between"
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
                              <div className="text-xs font-extrabold mt-1 text-white truncate">
                                {staffCat.name}
                              </div>
                              <div className="text-[10px] text-purple-200/80 leading-tight mt-0.5 line-clamp-2">
                                {staffCat.title}
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
                                  setActiveBottomTab(null);
                                  soundEngine.playClick();
                                }}
                                className={`w-full py-1 rounded-lg font-extrabold text-[11px] cursor-pointer ${
                                  canAfford
                                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 hover:from-cyan-300 hover:to-sky-300'
                                    : 'bg-purple-900/60 text-rose-300'
                                }`}
                              >
                                Place on Grid (${staffCat.hireCostCash})
                              </button>
                              <button
                                onClick={() => {
                                  const defaultCoord =
                                    staffCat.role === 'BARTENDER'
                                      ? { x: Math.min(7, 1 + roleCount), y: 1 }
                                      : staffCat.role === 'BOUNCER'
                                      ? { x: Math.min(3, 1 + roleCount), y: 9 }
                                      : { x: 6, y: Math.min(8, 5 + roleCount) };
                                  spawnStaffMemberAtGrid(
                                    staffCat,
                                    activeFloor,
                                    defaultCoord.x,
                                    defaultCoord.y
                                  );
                                }}
                                className="w-full py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-[10px] font-bold text-cyan-200 cursor-pointer"
                              >
                                Quick Auto-Station
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 2. ACTIVE STAFF ROSTER ON THE ISOMETRIC GRID */}
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 mb-2">
                      {staffMembers.map((member) => (
                        <div
                          key={member.uid}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-950/75 border border-purple-500/35 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: member.uniformColor }}
                            />
                            <div className="truncate">
                              <div className="text-xs font-extrabold text-white truncate">
                                {member.name}
                              </div>
                              <div className="text-[10px] font-mono text-cyan-300">
                                Floor {member.floor} · Tile ({member.postGridX},{member.postGridY}) ·{' '}
                                {member.role === 'BOUNCER'
                                  ? `${member.guestsCheckedIn} IDs Checked`
                                  : `${member.drinksServed} Drinks Automated`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                // Smoothly walk staff member to their next role station on the grid
                                const stationWaypoints =
                                  member.role === 'BARTENDER'
                                    ? [
                                        { x: 1, y: 1 },
                                        { x: 3, y: 1 },
                                        { x: 1, y: 3 },
                                      ]
                                    : member.role === 'BOUNCER'
                                    ? [
                                        { x: 1, y: 9 },
                                        { x: 3, y: 9 },
                                        { x: 2, y: 7 },
                                      ]
                                    : [
                                        { x: 6, y: 5 },
                                        { x: 7, y: 7 },
                                        { x: 2, y: 2 },
                                      ];
                                const nextTarget =
                                  stationWaypoints.find(
                                    (wp) =>
                                      Math.hypot(
                                        wp.x - member.postGridX,
                                        wp.y - member.postGridY
                                      ) > 0.8
                                  ) || stationWaypoints[0];
                                setStaffMembers((prev) =>
                                  prev.map((s) => {
                                    if (s.uid !== member.uid) return s;
                                    return {
                                      ...s,
                                      postGridX: nextTarget.x,
                                      postGridY: nextTarget.y,
                                      path: buildStaffStationPath(
                                        placedItems,
                                        s.floor,
                                        s.gridX,
                                        s.gridY,
                                        nextTarget.x,
                                        nextTarget.y
                                      ),
                                      actionBubble: '🚶',
                                      bubbleTimer: 2.8,
                                    };
                                  })
                                );
                                soundEngine.playPlaceItem();
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/60 hover:bg-emerald-500/40 text-emerald-200 text-[10px] font-extrabold cursor-pointer"
                              title="Walk smoothly to next station on grid"
                            >
                              Walk Post
                            </button>
                            <button
                              onClick={() => {
                                setActiveFloor(member.floor);
                                setRelocatingStaffUid(member.uid);
                                setPlacementModeStaff(null);
                                setActiveBottomTab(null);
                                soundEngine.playClick();
                              }}
                              className="px-2 py-1 rounded-lg bg-cyan-500/25 border border-cyan-400/60 hover:bg-cyan-500/40 text-cyan-200 text-[10px] font-extrabold cursor-pointer"
                            >
                              Move Post
                            </button>
                            <button
                              onClick={() => {
                                setStaffMembers((prev) => prev.filter((s) => s.uid !== member.uid));
                                soundEngine.playClick();
                              }}
                              className="p-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 cursor-pointer"
                              title="Dismiss Staff Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3. SOCIAL PARTY BUS BONUS */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-pink-950/60 border border-pink-500/30">
                      <div className="text-xs text-pink-100">
                        VIP Entourage Party Bus (+$400 Cover Bonus!)
                      </div>
                      <button
                        onClick={() => {
                          setCash((c) => c + 400);
                          addXp(60);
                          soundEngine.playUpgradeFanfare();
                        }}
                        className="px-3 py-1 rounded-xl bg-gradient-to-b from-pink-400 to-rose-600 text-white font-extrabold text-xs cursor-pointer shrink-0"
                      >
                        Invite Entourage (+$400)
                      </button>
                    </div>
                  </div>
                )}

                {/* WORLD MAP DRAWER */}
                {activeBottomTab === 'WORLD_MAP' && (
                  <div className="w-[330px] sm:w-[500px] bg-[#0e2238]/95 border-2 border-cyan-400 rounded-2xl p-3.5 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-cyan-200">
                        Neon City Nightlife Districts Map
                      </h3>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-cyan-950/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => {
                          handleLoadPreset('DIVE');
                          setActiveBottomTab(null);
                        }}
                        className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-left hover:bg-cyan-900/70 cursor-pointer"
                      >
                        <div className="text-[10px] font-mono text-amber-300">LEVEL 1 STAGE</div>
                        <div className="text-xs sm:text-sm font-extrabold">Brick Alley Dive Bar</div>
                      </button>
                      <button
                        onClick={() => {
                          handleLoadPreset('VIP_MEGA');
                          setActiveBottomTab(null);
                        }}
                        className="p-2.5 rounded-xl bg-purple-950/80 border border-fuchsia-400/60 text-left hover:bg-purple-900/70 cursor-pointer"
                      >
                        <div className="text-[10px] font-mono text-fuchsia-300">LEVEL 20 STAGE</div>
                        <div className="text-xs sm:text-sm font-extrabold">2-Floor VIP Mega-Club</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------
                BOTTOM-RIGHT: "Live event" BOX
                (Exact match to the blue-header white-body Live event box in IMG_1503.jpeg)
               --------------------------------------------------------------- */}
            {showLiveEvents && (
              <div className="hidden sm:block mt-auto ml-auto w-64 md:w-72 rounded-2xl overflow-hidden border-[2.5px] border-[#1e1b4b] shadow-2xl bg-[#f1f5f9] text-slate-900 pointer-events-auto">
                {/* Blue Header with 'i' icon & 'Live event' */}
                <div className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-3 py-1.5 flex items-center justify-between text-white border-b-2 border-[#1e1b4b]">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black tracking-tight">
                    <div className="w-4 h-4 rounded-full bg-sky-300 text-blue-950 flex items-center justify-center font-black text-[11px]">
                      i
                    </div>
                    <span className="drop-shadow">Live event</span>
                  </div>
                  <button
                    onClick={() => setShowLiveEvents(false)}
                    className="w-5 h-5 rounded bg-blue-900/60 text-blue-100 hover:text-white flex items-center justify-center cursor-pointer"
                    aria-label="Dismiss Live Events"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                {/* Two Alert Rows: Red Circle '!' and Yellow Triangle '!' */}
                <div className="divide-y divide-slate-300">
                  {liveAlerts.map((alert, idx) => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        if (alert.actionTab === 'BUILD') {
                          setActiveBottomTab('BUILD');
                          setSelectedCatalogItem(lightItem);
                        } else if (alert.actionTab === 'PARKING') {
                          setActiveBottomTab('PARKING');
                        } else if (alert.actionTab === 'DRINKS') {
                          setActiveBottomTab('DRINKS');
                        }
                        soundEngine.playClick();
                      }}
                      className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                        idx === 0 ? 'bg-white hover:bg-blue-50' : 'bg-sky-50/80 hover:bg-sky-100/80'
                      }`}
                    >
                      {idx === 0 ? (
                        <div className="w-7 h-7 rounded-full bg-[#ef4444] border-2 border-[#1e1b4b] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                          !
                        </div>
                      ) : (
                        <svg viewBox="0 0 28 26" className="w-7 h-7 shrink-0">
                          <polygon
                            points="14,2 26,24 2,24"
                            fill="#f59e0b"
                            stroke="#1e1b4b"
                            strokeWidth="2.2"
                            strokeLinejoin="round"
                          />
                          <text
                            x="14"
                            y="21"
                            textAnchor="middle"
                            fill="#1e1b4b"
                            fontWeight="900"
                            fontSize="14"
                          >
                            !
                          </text>
                        </svg>
                      )}
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {alert.message}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -----------------------------------------------------------------
              BOTTOM NAVIGATION STRIP (image_5.png & IMG_1503.jpeg Spec):
              - Left: Visiting Friends' Rounded Chibi Portrait Heads Dock
              - Right: Square-like Docked Action Buttons with Cartoonish Icons
                (Decorate [Couch/Tools], Staff [People], Mixology [Cocktail], Parking/Line [Taxi], Dressing/Style [Hanger])
             ----------------------------------------------------------------- */}
          <div className="flex items-end justify-between gap-2 pt-2 pointer-events-auto">
            {/* Visiting Friends' Rounded Chibi Portrait Heads Strip (image_5.png Bottom Navigation Strip requirement) */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#140e26]/95 border-2 border-cyan-400/80 shadow-[0_5px_0_#150d2a]">
              {[
                { name: 'Roxy', lvl: 14, hair: '#ec4899', cap: '#22d3ee', bg: 'from-fuchsia-600 to-purple-900' },
                { name: 'Jax', lvl: 19, hair: '#1e1b4b', cap: '#facc15', bg: 'from-cyan-500 to-blue-900' },
                { name: 'Luna', lvl: 24, hair: '#451a03', cap: '#f43f5e', bg: 'from-lime-500 to-emerald-900' },
              ].map((fr) => (
                <button
                  key={fr.name}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveBottomTab((t) => (t === 'FRIENDS' ? null : 'FRIENDS'));
                  }}
                  title={`Visit ${fr.name}'s Nightclub (Lvl ${fr.lvl})`}
                  className="group relative flex flex-col items-center w-13 p-1 rounded-xl bg-[#1f1638] hover:bg-[#2d2050] border-2 border-[#150d2a] cursor-pointer transition-transform active:scale-95"
                >
                  <span className="absolute -top-1.5 -left-1 px-1 rounded bg-amber-400 border border-[#150d2a] text-[8px] font-black text-slate-950">
                    {fr.lvl}
                  </span>
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-b ${fr.bg} border-2 border-[#150d2a] flex items-center justify-center overflow-hidden`}>
                    {/* Rounded Chibi Portrait Head SVG */}
                    <svg viewBox="0 0 36 36" className="w-8 h-8">
                      <circle cx="18" cy="20" r="10" fill="#f5cba7" stroke="#150d2a" strokeWidth="2.2" />
                      <path d="M8,18 C8,8 28,8 28,18 Z" fill={fr.hair} stroke="#150d2a" strokeWidth="2" />
                      <circle cx="14.5" cy="20" r="1.8" fill="#150d2a" />
                      <circle cx="21.5" cy="20" r="1.8" fill="#150d2a" />
                      <circle cx="25" cy="11" r="3" fill={fr.cap} stroke="#150d2a" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black text-white truncate max-w-full mt-0.5 drop-shadow-[0_1px_0_#150d2a]">
                    {fr.name}
                  </span>
                </button>
              ))}
            </div>

            {/* 4 Docked Square-Like Cartoon Command Buttons */}
            <div className="flex-1 grid grid-cols-4 gap-1.5 sm:gap-2.5">
              {/* 1. Decorate / Build (Couch & Hammer Icon + Green UPGRADE) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveBottomTab((t) => (t === 'BUILD' ? null : 'BUILD'));
                }}
                className={`relative pt-4 pb-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 border-cyan-300/90 bg-gradient-to-b from-[#a3e635] via-[#4ade80] to-[#15803d] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                  activeBottomTab === 'BUILD' ? 'ring-2 ring-white' : ''
                }`}
              >
                {/* Cartoon Couch + Wrench Icon (matching image_5.png "couch for Decorate") */}
                <svg
                  viewBox="0 0 56 48"
                  className="w-10 h-8 sm:w-12 sm:h-10 -mt-6 sm:-mt-7 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
                >
                  {/* Plush Neon Couch Backrest & Cushions */}
                  <rect x="10" y="14" width="36" height="16" rx="6" fill="#a855f7" stroke="#150d2a" strokeWidth="2.5" />
                  <rect x="6" y="22" width="8" height="14" rx="3" fill="#ec4899" stroke="#150d2a" strokeWidth="2.4" />
                  <rect x="42" y="22" width="8" height="14" rx="3" fill="#ec4899" stroke="#150d2a" strokeWidth="2.4" />
                  <rect x="12" y="25" width="32" height="11" rx="4" fill="#d946ef" stroke="#150d2a" strokeWidth="2.5" />
                </svg>

                <span className="absolute -top-2 right-1 sm:right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                  UPGRADE
                </span>

                <span className="text-[10px] sm:text-sm font-black tracking-tight text-white drop-shadow-[0_2px_0_#150d2a] truncate max-w-full">
                  Decorate
                </span>
              </button>

              {/* 2. Staff / Friends (People Icon for Staff Management & Friends) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveBottomTab((t) => (t === 'FRIENDS' ? null : 'FRIENDS'));
                }}
                className={`relative pt-4 pb-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 border-pink-300/90 bg-gradient-to-b from-[#f472b6] via-[#db2777] to-[#831843] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                  activeBottomTab === 'FRIENDS' ? 'ring-2 ring-white' : ''
                }`}
              >
                {/* Cartoon Chibi People Icon (matching image_5.png "people for Staff") */}
                <svg
                  viewBox="0 0 60 48"
                  className="w-10 h-8 sm:w-12 sm:h-10 -mt-6 sm:-mt-7 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
                >
                  <circle cx="17" cy="18" r="6.5" fill="#c084fc" stroke="#150d2a" strokeWidth="2.4" />
                  <path d="M8 35 C8 26 26 26 26 35 Z" fill="#a855f7" stroke="#150d2a" strokeWidth="2.4" />
                  <circle cx="43" cy="18" r="6.5" fill="#fb923c" stroke="#150d2a" strokeWidth="2.4" />
                  <path d="M34 35 C34 26 52 26 52 35 Z" fill="#f97316" stroke="#150d2a" strokeWidth="2.4" />
                  <circle cx="30" cy="15" r="7.5" fill="#38bdf8" stroke="#150d2a" strokeWidth="2.6" />
                  <path d="M18 37 C18 26 42 26 42 37 Z" fill="#06b6d4" stroke="#150d2a" strokeWidth="2.6" />
                </svg>

                <span className="absolute -top-2 right-1 sm:right-2 px-1.5 py-0.5 rounded-md bg-cyan-400 border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase text-slate-950 shadow">
                  {staffMembers.length} STAFF
                </span>

                <span className="text-[10px] sm:text-sm font-black tracking-tight text-white drop-shadow-[0_2px_0_#150d2a] truncate max-w-full">
                  Staff / Crew
                </span>
              </button>

              {/* 3. Drink Mixes (Magenta Cocktail Glass) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveBottomTab((t) => (t === 'DRINKS' ? null : 'DRINKS'));
                }}
                className={`relative pt-4 pb-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 border-pink-300/90 bg-gradient-to-b from-[#e879f9] via-[#c026d3] to-[#701a75] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                  activeBottomTab === 'DRINKS' ? 'ring-2 ring-white' : ''
                }`}
              >
                <svg
                  viewBox="0 0 56 52"
                  className="w-10 h-8 sm:w-12 sm:h-10 -mt-6 sm:-mt-7 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
                >
                  <circle cx="17" cy="14" r="7" fill="#facc15" stroke="#150d2a" strokeWidth="2.2" />
                  <path d="M28 18 L36 6 L42 6" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <polygon points="14,15 42,15 28,31" fill="#fb7185" stroke="#150d2a" strokeWidth="2.5" strokeLinejoin="round" />
                  <line x1="28" y1="31" x2="28" y2="43" stroke="#bae6fd" strokeWidth="3.5" />
                  <ellipse cx="28" cy="44" rx="9" ry="2.5" fill="#38bdf8" stroke="#150d2a" strokeWidth="2" />
                </svg>

                <span className="absolute -top-2 right-1 sm:right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                  UPGRADE
                </span>

                <span className="text-[10px] sm:text-sm font-black tracking-tight text-white drop-shadow-[0_2px_0_#150d2a] truncate max-w-full">
                  Drink Mixes
                </span>
              </button>

              {/* 4. Parking / Line (Boxy Yellow Taxi & Velvet Rope) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveBottomTab((t) => (t === 'PARKING' ? null : 'PARKING'));
                }}
                className={`relative pt-4 pb-2 sm:py-2.5 px-1 sm:px-2 rounded-2xl border-2 border-cyan-300/90 bg-gradient-to-b from-[#9333ea] via-[#6b21a8] to-[#3b0764] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                  activeBottomTab === 'PARKING' ? 'ring-2 ring-white' : ''
                }`}
              >
                <svg
                  viewBox="0 0 60 48"
                  className="w-10 h-8 sm:w-12 sm:h-10 -mt-6 sm:-mt-7 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
                >
                  <rect x="41" y="8" width="7" height="28" rx="2" fill="#facc15" stroke="#150d2a" strokeWidth="2" />
                  <line x1="41" y1="15" x2="48" y2="15" stroke="#150d2a" strokeWidth="3" />
                  <line x1="41" y1="23" x2="48" y2="23" stroke="#150d2a" strokeWidth="3" />
                  <path d="M14 24 L19 14 L37 14 L41 24 Z" fill="#eab308" stroke="#150d2a" strokeWidth="2.2" />
                  <rect x="9" y="23" width="38" height="13" rx="4" fill="#facc15" stroke="#150d2a" strokeWidth="2.5" />
                  <circle cx="15" cy="30" r="3" fill="#ffffff" />
                  <circle cx="41" cy="30" r="3" fill="#ffffff" />
                </svg>

                <span className="absolute -top-2 right-1 sm:right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                  UPGRADE
                </span>

                <span className="text-[10px] sm:text-sm font-black tracking-tight text-white drop-shadow-[0_2px_0_#150d2a] truncate max-w-full">
                  Parking/Line
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
