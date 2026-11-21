import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  Code2,
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
import { TechnicalBlueprintModal } from './components/TechnicalBlueprintModal';
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
import { canPlaceItem, findGridPath, getCatalogItem } from './utils/pathfinding';

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
    state: 'DANCING',
    stateTimer: 8,
    patience: 90,
    hype: 80,
    bubble: 'BEER',
    bubbleTimer: 7,
    shirtColor: '#dc2626',
    hairColor: '#451a03',
    pantsColor: '#1e3a8a',
    cashSpent: 45,
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
    state: 'DANCING',
    stateTimer: 9,
    patience: 95,
    hype: 85,
    bubble: 'BEER',
    bubbleTimer: 8,
    shirtColor: '#6366f1',
    hairColor: '#7c2d12',
    pantsColor: '#1e293b',
    cashSpent: 45,
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
    state: 'DANCING',
    stateTimer: 7.5,
    patience: 88,
    hype: 90,
    bubble: 'SPARKLE',
    bubbleTimer: 7,
    shirtColor: '#475569',
    hairColor: '#1e1b4b',
    pantsColor: '#0f172a',
    cashSpent: 90,
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
    state: 'DANCING',
    stateTimer: 10,
    patience: 92,
    hype: 88,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#e11d48',
    hairColor: '#1e1b4b',
    pantsColor: '#1e3a8a',
    cashSpent: 45,
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
    state: 'DANCING',
    stateTimer: 8.5,
    patience: 90,
    hype: 92,
    bubble: null,
    bubbleTimer: 0,
    shirtColor: '#9333ea',
    hairColor: '#451a03',
    pantsColor: '#1e1b4b',
    cashSpent: 45,
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
  // Guests queuing outside along left sidewalk with Music (♫) & Chat (•••) bubbles
  {
    id: 'g_queue_1',
    name: 'Chloe',
    isCelebrity: false,
    floor: 1,
    targetFloor: 1,
    gridX: -0.75,
    gridY: 8.9,
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
    gridX: -0.75,
    gridY: 7.9,
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
    gridX: -0.75,
    gridY: 6.9,
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

  // Build Mode & UI State (Default open in Build Mode showing Isometric Chair & Speaker like IMG_1503.jpeg)
  const [activeBottomTab, setActiveBottomTab] = useState<BottomDrawerTab>('BUILD');
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

  // Left Sidebar Modal & Technical Blueprint Modal
  const [activeLeftModal, setActiveLeftModal] = useState<LeftModalTab>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);

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
      (parkingState.bouncerCount - 1) * 15;
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
  }, [placedItems, staffMembers, parkingState, unlockedFloors, activeDrink]);

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
          setIsBlueprintOpen(false);
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
    if (cash < staffCat.hireCostCash) {
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

    const newStaff: StaffMemberAgent = {
      uid: `staff_${staffCat.role.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      catalogId: staffCat.id,
      role: staffCat.role,
      name: `${firstName} (${roleLabel})`,
      floor,
      gridX,
      gridY,
      postGridX: gridX,
      postGridY: gridY,
      path: [],
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
      actionBubble:
        staffCat.role === 'BARTENDER' ? '🍸' : staffCat.role === 'BOUNCER' ? '🛡️' : '🍾',
      bubbleTimer: 3.5,
    };

    setCash((c) => c - staffCat.hireCostCash);
    setStaffMembers((prev) => [...prev, newStaff]);
    if (staffCat.role === 'BOUNCER') {
      setParkingState((p) => ({ ...p, bouncerCount: Math.min(4, p.bouncerCount + 1) }));
    }
    addXp(55);
    soundEngine.playPlaceItem();
    floatingTextsRef.current.push({
      id: `hire_${performance.now()}`,
      text: `HIRED ${firstName.toUpperCase()}! +${staffCat.hypeBonus}⚡`,
      floor,
      gridX,
      gridY,
      color: '#38bdf8',
      age: 0,
    });
    return true;
  };

  const handleGridClick = (coord: { x: number; y: number }) => {
    // 1. Relocating an existing Staff Member to a new Isometric Grid Tile
    if (relocatingStaffUid) {
      setStaffMembers((prev) =>
        prev.map((s) => {
          if (s.uid !== relocatingStaffUid) return s;
          const newPath =
            s.floor === activeFloor
              ? findGridPath(
                  placedItems,
                  activeFloor,
                  Math.round(s.gridX),
                  Math.round(s.gridY),
                  coord.x,
                  coord.y
                )
              : [];
          return {
            ...s,
            floor: activeFloor,
            gridX: s.floor === activeFloor ? s.gridX : coord.x,
            gridY: s.floor === activeFloor ? s.gridY : coord.y,
            postGridX: coord.x,
            postGridY: coord.y,
            path: newPath,
          };
        })
      );
      soundEngine.playPlaceItem();
      floatingTextsRef.current.push({
        id: `reloc_${performance.now()}`,
        text: `STATIONED AT (${coord.x}, ${coord.y})`,
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
      const valid = canPlaceItem(
        placedItems,
        selectedCatalogItem,
        activeFloor,
        coord.x,
        coord.y,
        buildRotation
      );
      if (!valid) {
        soundEngine.playError();
        return;
      }
      if (cash < selectedCatalogItem.costCash || gems < selectedCatalogItem.costGems) {
        soundEngine.playError();
        floatingTextsRef.current.push({
          id: `err_${performance.now()}`,
          text: 'NEED MORE FUNDS!',
          floor: activeFloor,
          gridX: coord.x,
          gridY: coord.y,
          color: '#f87171',
          age: 0,
        });
        return;
      }

      setCash((c) => c - selectedCatalogItem.costCash);
      setGems((g) => g - selectedCatalogItem.costGems);
      const newItem: PlacedItem = {
        uid: `placed_${Date.now()}_${Math.random()}`,
        catalogId: selectedCatalogItem.id,
        floor: activeFloor,
        gridX: coord.x,
        gridY: coord.y,
        rotation: buildRotation,
      };
      setPlacedItems((prev) => [...prev, newItem]);
      addXp(35);
      soundEngine.playPlaceItem();
      floatingTextsRef.current.push({
        id: `place_${performance.now()}`,
        text: `+${selectedCatalogItem.hypeBonus} HYPE / +${selectedCatalogItem.vibeBonus} VIBE`,
        floor: activeFloor,
        gridX: coord.x,
        gridY: coord.y,
        color: '#4ade80',
        age: 0,
      });
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

              <button
                onClick={() => {
                  handleLoadPreset('VIP_MEGA');
                  setGameState('PLAYING');
                }}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-b from-fuchsia-500 to-purple-700 hover:from-fuchsia-400 hover:to-purple-600 text-white font-bold text-sm sm:text-base border-2 border-fuchsia-300/60 shadow-[0_5px_0_#4a044e] active:translate-y-0.5 transition-all cursor-pointer"
              >
                Preview Level 20 VIP Mega-Club
              </button>

              <button
                onClick={() => setIsBlueprintOpen(true)}
                className="px-4 py-3.5 rounded-2xl bg-purple-950/85 hover:bg-purple-900 border-2 border-cyan-400/50 text-cyan-300 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Code2 className="w-4 h-4" />
                <span>Kotlin / C# Code</span>
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

                {/* Dark Rounded XP Bar attached to Star */}
                <div className="-ml-4 pl-6 pr-3 py-1.5 sm:py-2 bg-[#1b1630]/95 border-[2.5px] border-[#4c3f78] rounded-2xl shadow-xl min-w-[135px] sm:min-w-[230px]">
                  <div className="relative w-full h-5 sm:h-6 bg-[#131024] rounded-xl overflow-hidden border border-[#2e264e] flex items-center">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }}
                    />
                    <span className="absolute left-3 text-xs sm:text-sm font-bold text-slate-300 tracking-wide drop-shadow">
                      XP
                    </span>
                  </div>
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

                {/* Hype Lightning & Vibe Flame 3-Box Star Meters Stack (Tap to trigger Hype Blast preview) */}
                <button
                  onClick={() => {
                    soundEngine.playUpgradeFanfare();
                    triggerHypeBlast(25, clubMetrics.totalHype, clubMetrics.tipBonus);
                  }}
                  title="Tap to trigger Dance Floor Hype Blast!"
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
                  onClick={() => handleLoadPreset(level < 10 ? 'VIP_MEGA' : 'DIVE')}
                  className="px-2.5 py-1 rounded-xl bg-[#1b1630]/95 border border-fuchsia-400/60 text-fuchsia-200 hover:bg-fuchsia-950 text-[11px] font-extrabold cursor-pointer shadow"
                >
                  {level < 10 ? 'Preview Lvl 20 VIP Club' : 'Reset to Lvl 1 Dive'}
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

                <button
                  onClick={() => setIsBlueprintOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 hover:bg-cyan-900 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kotlin/C#</span>
                </button>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              MIDDLE ZONE: LEFT SIDEBAR SQUIRCLES + GREEN BUILD MODE BOX + LIVE EVENT BOX
             ----------------------------------------------------------------- */}
          <div className="flex-1 flex items-center justify-between relative my-1">
            {/* LEFT SIDEBAR: 4 Illustrated Squircle Buttons matching IMG_1503.jpeg */}
            <div className="flex flex-col gap-2.5 sm:gap-3.5 pointer-events-auto">
              {/* 1. Quests (Clipboard with checkmarks + Red '!' badge) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'QUESTS' ? null : 'QUESTS'));
                }}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#493875] to-[#2b204a] border-[2.5px] border-[#150d2a] shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-white text-xs font-black flex items-center justify-center shadow">
                  {unclaimedQuestCount > 0 ? unclaimedQuestCount : '!'}
                </span>
                {/* Illustrated Clipboard SVG */}
                <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 -mb-1 drop-shadow">
                  <rect
                    x="10"
                    y="8"
                    width="28"
                    height="34"
                    rx="4"
                    fill="#d97706"
                    stroke="#150d2a"
                    strokeWidth="2.5"
                  />
                  <rect x="14" y="12" width="20" height="26" fill="#fef3c7" />
                  <rect
                    x="17"
                    y="5"
                    width="14"
                    height="6"
                    rx="2"
                    fill="#94a3b8"
                    stroke="#150d2a"
                    strokeWidth="2"
                  />
                  <path
                    d="M17 19 L20 22 L25 16 M17 27 L20 30 L25 24"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[11px] sm:text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                  Quests
                </span>
              </button>

              {/* 2. DJ Booth (Female DJ Avatar with Pink Headphones & Turntable) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'DJ_BOOTH' ? null : 'DJ_BOOTH'));
                }}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#493875] to-[#2b204a] border-[2.5px] border-[#150d2a] shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 -mb-1 drop-shadow">
                  {/* Headphones */}
                  <path
                    d="M13 22 A11 11 0 0 1 35 22"
                    stroke="#ec4899"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle cx="13" cy="22" r="4" fill="#ec4899" stroke="#150d2a" strokeWidth="1.8" />
                  <circle cx="35" cy="22" r="4" fill="#ec4899" stroke="#150d2a" strokeWidth="1.8" />
                  {/* Head & Hair */}
                  <circle cx="24" cy="21" r="8" fill="#fcd34d" stroke="#150d2a" strokeWidth="2.2" />
                  <path d="M16 19 A8 8 0 0 1 32 19 Z" fill="#a21caf" />
                  {/* Deck */}
                  <rect
                    x="10"
                    y="31"
                    width="28"
                    height="9"
                    rx="3"
                    fill="#38bdf8"
                    stroke="#150d2a"
                    strokeWidth="2.2"
                  />
                  <circle cx="18" cy="35.5" r="3" fill="#1e1b4b" />
                  <circle cx="30" cy="35.5" r="3" fill="#1e1b4b" />
                </svg>
                <span className="text-[11px] sm:text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] whitespace-nowrap">
                  DJ Booth
                </span>
              </button>

              {/* 3. Locked Vinyl Record (Playlists) with Padlock + Red Badge */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'PLAYLISTS' ? null : 'PLAYLISTS'));
                }}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#352a54] to-[#211936] border-[2.5px] border-[#150d2a] shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-white text-[10px] font-black flex items-center justify-center shadow">
                  <Lock className="w-3 h-3" />
                </span>
                <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 -mb-1 drop-shadow">
                  <circle cx="24" cy="23" r="14" fill="#1e293b" stroke="#150d2a" strokeWidth="2.5" />
                  <circle cx="24" cy="23" r="6" fill="#2dd4bf" />
                  {/* Grey Padlock overlay */}
                  <path
                    d="M19 21 V17 A5 5 0 0 1 29 17 V21"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                    fill="none"
                  />
                  <rect
                    x="16"
                    y="21"
                    width="16"
                    height="13"
                    rx="3"
                    fill="#94a3b8"
                    stroke="#150d2a"
                    strokeWidth="2.2"
                  />
                  <circle cx="24" cy="27" r="2" fill="#150d2a" />
                </svg>
                <span className="text-[11px] sm:text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                  {level < 3 ? 'Locked' : 'Playlists'}
                </span>
              </button>

              {/* 4. Locked VIP Silhouette (Celebs) with Padlock + Red '!' Badge */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'CELEBS' ? null : 'CELEBS'));
                }}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#352a54] to-[#211936] border-[2.5px] border-[#150d2a] shadow-[0_4px_0_#150d2a] flex flex-col items-center justify-end pb-1.5 cursor-pointer active:translate-y-0.5"
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-white text-xs font-black flex items-center justify-center shadow">
                  !
                </span>
                <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 -mb-1 drop-shadow">
                  <circle cx="24" cy="17" r="8" fill="#4c1d95" stroke="#150d2a" strokeWidth="2" />
                  <path
                    d="M12 36 C12 28 36 28 36 36 Z"
                    fill="#4c1d95"
                    stroke="#150d2a"
                    strokeWidth="2"
                  />
                  <path
                    d="M19 22 V18 A5 5 0 0 1 29 18 V22"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                    fill="none"
                  />
                  <rect
                    x="16"
                    y="22"
                    width="16"
                    height="13"
                    rx="3"
                    fill="#94a3b8"
                    stroke="#150d2a"
                    strokeWidth="2.2"
                  />
                  <circle cx="24" cy="28" r="2" fill="#150d2a" />
                </svg>
                <span className="text-[11px] sm:text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                  {level < 5 ? 'Locked' : 'Celebs'}
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
                          soundEngine.playClick();
                        }}
                        className={`group flex flex-col items-center p-2 rounded-xl transition-transform cursor-pointer ${
                          selectedCatalogItem?.id === chairItem.id && !isRemoveMode
                            ? 'bg-emerald-950/35 ring-2 ring-white scale-105'
                            : 'hover:bg-emerald-950/20'
                        }`}
                        title={`Place ${chairItem.name} ($${chairItem.costCash})`}
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
                          soundEngine.playClick();
                        }}
                        className={`group flex flex-col items-center p-2 rounded-xl transition-transform cursor-pointer ${
                          selectedCatalogItem?.id === speakerItem.id && !isRemoveMode
                            ? 'bg-emerald-950/35 ring-2 ring-white scale-105'
                            : 'hover:bg-emerald-950/20'
                        }`}
                        title={`Place ${speakerItem.name} ($${speakerItem.costCash})`}
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
                          soundEngine.playClick();
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
                        const canAfford = cash >= item.costCash && gems >= item.costGems;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setIsRemoveMode(false);
                              setSelectedCatalogItem(item);
                              soundEngine.playClick();
                            }}
                            className={`w-32 shrink-0 p-2 rounded-xl border-2 text-left cursor-pointer ${
                              isSelected
                                ? 'bg-slate-950 border-white text-white'
                                : 'bg-emerald-950/80 border-emerald-300/40 text-emerald-50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-emerald-300">
                                T{item.tier} · {item.width}x{item.depth}
                              </span>
                              <span className="text-amber-300">+{item.hypeBonus}⚡</span>
                            </div>
                            <div className="text-xs font-extrabold truncate mt-0.5">{item.name}</div>
                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-emerald-500/30 text-xs font-mono font-bold">
                              <span className={canAfford ? 'text-emerald-300' : 'text-rose-400'}>
                                ${item.costCash}
                              </span>
                              {item.costGems > 0 && (
                                <span className="text-fuchsia-300">{item.costGems}G</span>
                              )}
                            </div>
                          </button>
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
              BOTTOM NAVIGATION BAR: 5 GLOSSY COMMAND BUTTONS WITH BESPOKE ILLUSTRATED ICONS
              1. Build/Decorate (Green + Crossed Hammer/Wrench + UPGRADE)
              2. Drink Mixes (Magenta + Cocktail Glass with Straw & Lime + UPGRADE)
              3. Parking/Line (Purple + Purple Car & Cones + UPGRADE)
              4. Invite Friends (Pink + 3 Friends Silhouettes + !)
              5. World Map (Cyan + Folded Green/Blue Map)
             ----------------------------------------------------------------- */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-3 pt-2 pointer-events-auto">
            {/* 1. Build/Decorate (Green) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'BUILD' ? null : 'BUILD'));
              }}
              className={`relative pt-4 pb-2 sm:py-3 px-1 sm:px-2 rounded-2xl border-[2.5px] border-[#150d2a] bg-gradient-to-b from-[#a3e635] via-[#4ade80] to-[#15803d] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                activeBottomTab === 'BUILD' ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Overlapping Illustrated Crossed Wrench & Hammer Icon */}
              <svg
                viewBox="0 0 56 48"
                className="w-10 h-8 sm:w-13 sm:h-11 -mt-7 sm:-mt-8 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
              >
                {/* Hammer Handle & Head */}
                <line
                  x1="14"
                  y1="38"
                  x2="38"
                  y2="14"
                  stroke="#b45309"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M32 8 L45 21 L40 25 L28 13 Z"
                  fill="#94a3b8"
                  stroke="#150d2a"
                  strokeWidth="2.5"
                />
                {/* Wrench */}
                <line
                  x1="40"
                  y1="38"
                  x2="18"
                  y2="16"
                  stroke="#cbd5e1"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="15"
                  cy="13"
                  r="6"
                  fill="#94a3b8"
                  stroke="#150d2a"
                  strokeWidth="2.5"
                />
              </svg>

              {/* Green UPGRADE Badge */}
              <span className="absolute -top-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                UPGRADE
              </span>

              <span className="text-[10px] sm:text-base font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] truncate max-w-full">
                Build/Decorate
              </span>
            </button>

            {/* 2. Drink Mixes (Magenta) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'DRINKS' ? null : 'DRINKS'));
              }}
              className={`relative pt-4 pb-2 sm:py-3 px-1 sm:px-2 rounded-2xl border-[2.5px] border-[#150d2a] bg-gradient-to-b from-[#e879f9] via-[#c026d3] to-[#701a75] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                activeBottomTab === 'DRINKS' ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Overlapping Illustrated Martini Glass with Lime & Straw */}
              <svg
                viewBox="0 0 56 52"
                className="w-10 h-8 sm:w-13 sm:h-11 -mt-7 sm:-mt-8 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
              >
                {/* Lime Wheel */}
                <circle
                  cx="17"
                  cy="14"
                  r="7"
                  fill="#facc15"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                />
                {/* Straw */}
                <path
                  d="M28 18 L36 6 L42 6"
                  stroke="#ef4444"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Martini Bowl */}
                <polygon
                  points="14,15 42,15 28,31"
                  fill="#fb7185"
                  stroke="#150d2a"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <line x1="28" y1="31" x2="28" y2="43" stroke="#bae6fd" strokeWidth="3.5" />
                <ellipse
                  cx="28"
                  cy="44"
                  rx="9"
                  ry="2.5"
                  fill="#38bdf8"
                  stroke="#150d2a"
                  strokeWidth="2"
                />
              </svg>

              <span className="absolute -top-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                UPGRADE
              </span>

              <span className="text-[10px] sm:text-base font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] truncate max-w-full">
                Drink Mixes
              </span>
            </button>

            {/* 3. Parking/Line (Purple) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'PARKING' ? null : 'PARKING'));
              }}
              className={`relative pt-4 pb-2 sm:py-3 px-1 sm:px-2 rounded-2xl border-[2.5px] border-[#150d2a] bg-gradient-to-b from-[#9333ea] via-[#6b21a8] to-[#3b0764] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                activeBottomTab === 'PARKING' ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Overlapping Illustrated Purple Sports Car & Striped Barrier Post */}
              <svg
                viewBox="0 0 60 48"
                className="w-10 h-8 sm:w-13 sm:h-11 -mt-7 sm:-mt-8 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
              >
                {/* Yellow/Black Striped Parking Post */}
                <rect
                  x="41"
                  y="8"
                  width="7"
                  height="28"
                  rx="2"
                  fill="#facc15"
                  stroke="#150d2a"
                  strokeWidth="2"
                />
                <line x1="41" y1="15" x2="48" y2="15" stroke="#150d2a" strokeWidth="3" />
                <line x1="41" y1="23" x2="48" y2="23" stroke="#150d2a" strokeWidth="3" />
                {/* Car Cabin & Body */}
                <path
                  d="M14 24 L20 14 L36 14 L41 24 Z"
                  fill="#a855f7"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                />
                <rect
                  x="9"
                  y="23"
                  width="38"
                  height="13"
                  rx="5"
                  fill="#7e22ce"
                  stroke="#150d2a"
                  strokeWidth="2.5"
                />
                <circle cx="15" cy="30" r="3" fill="#fde047" />
                <circle cx="41" cy="30" r="3" fill="#fde047" />
              </svg>

              <span className="absolute -top-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-b from-[#84cc16] to-[#4d7c0f] border-2 border-[#150d2a] text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow">
                UPGRADE
              </span>

              <span className="text-[10px] sm:text-base font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] truncate max-w-full">
                Parking/Line
              </span>
            </button>

            {/* 4. Invite Friends (Pink/Rose) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'FRIENDS' ? null : 'FRIENDS'));
              }}
              className={`relative pt-4 pb-2 sm:py-3 px-1 sm:px-2 rounded-2xl border-[2.5px] border-[#150d2a] bg-gradient-to-b from-[#f472b6] via-[#db2777] to-[#831843] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                activeBottomTab === 'FRIENDS' ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Overlapping Illustrated 3-Avatar Group Icon */}
              <svg
                viewBox="0 0 60 48"
                className="w-10 h-8 sm:w-13 sm:h-11 -mt-7 sm:-mt-8 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
              >
                {/* Left & Right Avatars */}
                <circle cx="17" cy="18" r="6" fill="#c084fc" stroke="#150d2a" strokeWidth="2.2" />
                <path
                  d="M8 34 C8 26 26 26 26 34 Z"
                  fill="#a855f7"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                />
                <circle cx="43" cy="18" r="6" fill="#fb923c" stroke="#150d2a" strokeWidth="2.2" />
                <path
                  d="M34 34 C34 26 52 26 52 34 Z"
                  fill="#f97316"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                />
                {/* Center Cyan Avatar */}
                <circle cx="30" cy="16" r="7" fill="#38bdf8" stroke="#150d2a" strokeWidth="2.5" />
                <path
                  d="M18 36 C18 26 42 26 42 36 Z"
                  fill="#06b6d4"
                  stroke="#150d2a"
                  strokeWidth="2.5"
                />
              </svg>

              <span className="absolute -top-2.5 right-1.5 sm:right-2.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ef4444] border-2 border-[#150d2a] text-xs sm:text-sm font-black text-white flex items-center justify-center shadow">
                !
              </span>

              <span className="text-[10px] sm:text-base font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] truncate max-w-full">
                Invite Friends
              </span>
            </button>

            {/* 5. World Map (Cyan/Blue) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'WORLD_MAP' ? null : 'WORLD_MAP'));
              }}
              className={`relative pt-4 pb-2 sm:py-3 px-1 sm:px-2 rounded-2xl border-[2.5px] border-[#150d2a] bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1e3a8a] text-white shadow-[0_5px_0_#150d2a] active:translate-y-0.5 transition-all flex flex-col items-center justify-end cursor-pointer ${
                activeBottomTab === 'WORLD_MAP' ? 'ring-2 ring-white' : ''
              }`}
            >
              {/* Overlapping Illustrated Folded Green/Blue World Map */}
              <svg
                viewBox="0 0 56 48"
                className="w-10 h-8 sm:w-13 sm:h-11 -mt-7 sm:-mt-8 mb-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]"
              >
                <polygon
                  points="10,12 22,8 22,34 10,38"
                  fill="#22c55e"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <polygon
                  points="22,8 34,13 34,39 22,34"
                  fill="#38bdf8"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <polygon
                  points="34,13 46,9 46,35 34,39"
                  fill="#4ade80"
                  stroke="#150d2a"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>

              <span className="text-[10px] sm:text-base font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] truncate max-w-full">
                World Map
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ANDROID JETPACK COMPOSE & UNITY C# TECHNICAL BLUEPRINT MODAL */}
      <TechnicalBlueprintModal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
      />
    </div>
  );
}
