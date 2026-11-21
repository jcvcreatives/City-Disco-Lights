import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Car,
  Check,
  ClipboardList,
  Code2,
  Compass,
  Crown,
  Disc3,
  GlassWater,
  Hammer,
  Info,
  Lock,
  Music,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  Flame,
  ArrowUpCircle,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { IsometricClubCanvas } from './components/IsometricClubCanvas';
import { TechnicalBlueprintModal } from './components/TechnicalBlueprintModal';
import {
  BubbleType,
  CATALOG_ITEMS,
  CatalogItem,
  DRINK_MIXES,
  DrinkMix,
  FloatingText,
  GuestAgent,
  INITIAL_PLACED_ITEMS,
  INITIAL_QUESTS,
  ItemCategory,
  LiveAlert,
  ParkingUpgradeState,
  PlacedItem,
  QuestTask,
  VIP_HOTSPOT_ITEMS,
} from './types/game';
import {
  canPlaceItem,
  DOOR_COORD,
  findGridPath,
  getCatalogItem,
  STAIRS_COORD,
} from './utils/pathfinding';

type GameScreenState = 'TITLE' | 'PLAYING';
type BottomDrawerTab = 'BUILD' | 'DRINKS' | 'PARKING' | 'FRIENDS' | 'WORLD_MAP' | null;
type LeftModalTab = 'QUESTS' | 'DJ_BOOTH' | 'PLAYLISTS' | 'CELEBS' | null;

const GUEST_NAMES = [
  'Maya',
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
];

const CELEBRITY_NAMES = [
  'DJ Daft Nova',
  'Kyra Vance (Pop Icon)',
  'Jax Sterling (Synth King)',
  'Luna Eclipse (Supermodel)',
];

const SHIRT_COLORS = ['#f43f5e', '#38bdf8', '#a855f7', '#4ade80', '#fb923c', '#ec4899', '#eab308'];
const HAIR_COLORS = ['#1e1b4b', '#78350f', '#facc15', '#be123c', '#4c1d95'];
const PANTS_COLORS = ['#1e293b', '#312e81', '#334155', '#3b0764'];

export default function App() {
  // Game Screen State ('TITLE' -> 'PLAYING')
  const [gameState, setGameState] = useState<GameScreenState>('TITLE');

  // Core Economy & Progression State (Matches reference image start: Level 1, $1,250, 5 Gems)
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(65);
  const [cash, setCash] = useState<number>(1250);
  const [gems, setGems] = useState<number>(5);

  // Multi-Floor State
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);
  const [unlockedFloors, setUnlockedFloors] = useState<1 | 2>(1);

  // Placed Items on Floor 1 & Floor 2
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(INITIAL_PLACED_ITEMS);

  // Active House Drink Mix
  const [activeDrinkId, setActiveDrinkId] = useState<string>('drink_draft_beer');

  // Outside Parking & Bouncer Queue State
  const [parkingState, setParkingState] = useState<ParkingUpgradeState>({
    lotTier: 1,
    bouncerCount: 1,
    ropeTier: 1,
  });

  // Build / Placement Mode State
  const [activeBottomTab, setActiveBottomTab] = useState<BottomDrawerTab>('BUILD');
  const [buildCategory, setBuildCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(
    CATALOG_ITEMS.find((i) => i.id === 'seat_bistro') || null
  );
  const [buildRotation, setBuildRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isRemoveMode, setIsRemoveMode] = useState<boolean>(false);
  const [hoveredGrid, setHoveredGrid] = useState<{ x: number; y: number } | null>(null);

  // Left Sidebar Modal & Technical Blueprint Modal
  const [activeLeftModal, setActiveLeftModal] = useState<LeftModalTab>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);

  // Quests & Live Event Box
  const [quests, setQuests] = useState<QuestTask[]>(INITIAL_QUESTS);
  const [showLiveEvents, setShowLiveEvents] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedBpm, setSelectedBpm] = useState<number>(124);
  const [activePlaylist, setActivePlaylist] = useState<string>('Synthwave Midnight');

  // Live Simulated Guest Agents & Floating Cash Pops
  const [guests, setGuests] = useState<GuestAgent[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const xpToNextLevel = level * 150;

  const activeDrink = useMemo(
    () => DRINK_MIXES.find((d) => d.id === activeDrinkId) || DRINK_MIXES[0],
    [activeDrinkId]
  );

  // Compute Club Stats (Hype, Vibe, Bar Tier, Lighting Count, Dance Capacity, Tip Multiplier)
  const clubMetrics = useMemo(() => {
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

    // Outside upgrades add to Hype & Vibe
    totalHype += (parkingState.lotTier - 1) * 25 + (parkingState.bouncerCount - 1) * 15;
    totalVibe += (parkingState.ropeTier - 1) * 20;

    // Normalize 1..3 star segment meters for Top-Right HUD
    const hypeSegments = Math.min(3, Math.max(1, Math.floor(totalHype / 85) + 1));
    const vibeSegments = Math.min(3, Math.max(1, Math.floor(totalVibe / 75) + 1));
    const maxGuests = 6 + parkingState.lotTier * 3 + (unlockedFloors === 2 ? 6 : 0);

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
  }, [placedItems, parkingState, unlockedFloors]);

  // Dynamic Live Event Alerts matching Bottom-Right reference box
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
        message: 'Add Laser Truss or String Lights to boost Vibe!',
        actionTab: 'BUILD',
      });
    }
    const queueCount = guests.filter((g) => g.state === 'QUEUEING').length;
    if (queueCount >= 3 && parkingState.bouncerCount < 3) {
      alerts.push({
        id: 'alert_queue',
        severity: 'WARNING',
        message: 'Queue is getting long! Hire more bouncers.',
        actionTab: 'PARKING',
      });
    }
    if (clubMetrics.danceTileCount < 11) {
      alerts.push({
        id: 'alert_dance',
        severity: 'INFO',
        message: 'Expand Dance Floor tiles for bigger Hype Drops!',
        actionTab: 'BUILD',
      });
    }
    if (unlockedFloors === 1 && cash >= 2500) {
      alerts.push({
        id: 'alert_floor2',
        severity: 'INFO',
        message: 'Ready to unlock Floor 2 VIP Sky Lounge!',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'alert_vibe_peak',
        severity: 'INFO',
        message: 'Club Vibe is electric! VIP celebrities are arriving.',
      });
    }
    return alerts.slice(0, 2);
  }, [clubMetrics, guests, parkingState.bouncerCount, unlockedFloors, cash]);

  // Sync Quests Progress
  useEffect(() => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === 'quest_lighting') {
          return { ...q, currentValue: Math.min(q.targetValue, clubMetrics.lightingCount) };
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

  // Helper to grant XP & handle Level Up
  const addXp = (amount: number) => {
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
  };

  // Spawn initial guests matching the reference screenshot (5 dancers on the 3x3 dance floor + 4 in queue + 2 at tables)
  useEffect(() => {
    const initialGuests: GuestAgent[] = [
      // 5 Dancers on the 3x3 center floor with Beer Mug & Sparkle bubbles
      {
        id: 'g_dance_1',
        name: 'Leo',
        isCelebrity: false,
        floor: 1,
        targetFloor: 1,
        gridX: 3.3,
        gridY: 4.2,
        path: [],
        state: 'DANCING',
        stateTimer: 6,
        patience: 90,
        hype: 80,
        bubble: 'BEER',
        bubbleTimer: 5,
        shirtColor: '#dc2626',
        hairColor: '#78350f',
        pantsColor: '#1e3a8a',
        cashSpent: 45,
      },
      {
        id: 'g_dance_2',
        name: 'Maya',
        isCelebrity: false,
        floor: 1,
        targetFloor: 1,
        gridX: 4.3,
        gridY: 4.8,
        path: [],
        state: 'DANCING',
        stateTimer: 7,
        patience: 95,
        hype: 85,
        bubble: 'BEER',
        bubbleTimer: 6,
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
        gridX: 4.2,
        gridY: 3.7,
        path: [],
        state: 'DANCING',
        stateTimer: 5,
        patience: 88,
        hype: 90,
        bubble: 'SPARKLE',
        bubbleTimer: 5,
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
        gridX: 4.8,
        gridY: 3.4,
        path: [],
        state: 'DANCING',
        stateTimer: 8,
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
        gridX: 5.3,
        gridY: 3.9,
        path: [],
        state: 'DANCING',
        stateTimer: 6.5,
        patience: 90,
        hype: 92,
        bubble: null,
        bubbleTimer: 0,
        shirtColor: '#9333ea',
        hairColor: '#451a03',
        pantsColor: '#1e1b4b',
        cashSpent: 45,
      },
      // Lounge guests on right side
      {
        id: 'g_seat_1',
        name: 'Milo',
        isCelebrity: false,
        floor: 1,
        targetFloor: 1,
        gridX: 6.8,
        gridY: 5.8,
        path: [],
        state: 'RESTING_AT_SEAT',
        stateTimer: 7,
        patience: 85,
        hype: 75,
        bubble: 'CHAT',
        bubbleTimer: 4,
        shirtColor: '#0284c7',
        hairColor: '#1e1b4b',
        pantsColor: '#334155',
        cashSpent: 90,
      },
      // Guests queuing outside along velvet rope with Music & Chat bubbles
      {
        id: 'g_queue_1',
        name: 'Chloe',
        isCelebrity: false,
        floor: 1,
        targetFloor: 1,
        gridX: 1.5,
        gridY: 9.8,
        path: [],
        state: 'QUEUEING',
        stateTimer: 2.0,
        patience: 90,
        hype: 70,
        bubble: 'CHAT',
        bubbleTimer: 5,
        shirtColor: '#c084fc',
        hairColor: '#fde047',
        pantsColor: '#1e1b4b',
        cashSpent: 0,
      },
      {
        id: 'g_queue_2',
        name: 'Dante',
        isCelebrity: false,
        floor: 1,
        targetFloor: 1,
        gridX: 0.8,
        gridY: 9.8,
        path: [],
        state: 'QUEUEING',
        stateTimer: 3.5,
        patience: 88,
        hype: 65,
        bubble: 'MUSIC',
        bubbleTimer: 6,
        shirtColor: '#ec4899',
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
        gridX: 0.1,
        gridY: 9.8,
        path: [],
        state: 'QUEUEING',
        stateTimer: 5.0,
        patience: 85,
        hype: 65,
        bubble: null,
        bubbleTimer: 0,
        shirtColor: '#38bdf8',
        hairColor: '#1e1b4b',
        pantsColor: '#0f172a',
        cashSpent: 0,
      },
    ];
    setGuests(initialGuests);
  }, []);

  // Keep latest state refs for the simulation interval
  const placedRef = useRef(placedItems);
  placedRef.current = placedItems;
  const drinkRef = useRef(activeDrink);
  drinkRef.current = activeDrink;
  const metricsRef = useRef(clubMetrics);
  metricsRef.current = clubMetrics;
  const unlockedFloorsRef = useRef(unlockedFloors);
  unlockedFloorsRef.current = unlockedFloors;
  const bouncerCountRef = useRef(parkingState.bouncerCount);
  bouncerCountRef.current = parkingState.bouncerCount;

  // Main Guest AI & Economy Simulation Loop (Runs every 250ms)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const dt = 0.25;
    const interval = setInterval(() => {
      // Update floating cash popups
      setFloatingTexts((prev) =>
        prev
          .map((ft) => ({ ...ft, age: ft.age + dt * 0.75 }))
          .filter((ft) => ft.age < 1)
      );

      setGuests((prevGuests) => {
        const items = placedRef.current;
        const drink = drinkRef.current;
        const metrics = metricsRef.current;
        const maxFloors = unlockedFloorsRef.current;
        const bouncers = bouncerCountRef.current;

        const updated: GuestAgent[] = [];

        for (const g of prevGuests) {
          const guest = { ...g };
          guest.stateTimer -= dt;
          if (guest.bubbleTimer > 0) {
            guest.bubbleTimer -= dt;
            if (guest.bubbleTimer <= 0) guest.bubble = null;
          }

          // Move along A* path if path has waypoints
          if (guest.path.length > 0) {
            const nextWp = guest.path[0];
            const dx = nextWp.x - guest.gridX;
            const dy = nextWp.y - guest.gridY;
            const dist = Math.hypot(dx, dy);
            const speed = 2.2 * dt;
            if (dist <= speed) {
              guest.gridX = nextWp.x;
              guest.gridY = nextWp.y;
              guest.path = guest.path.slice(1);
            } else {
              guest.gridX += (dx / dist) * speed;
              guest.gridY += (dy / dist) * speed;
            }
            updated.push(guest);
            continue;
          }

          // State Machine Transitions when timer expires and path is complete
          if (guest.stateTimer <= 0) {
            if (guest.state === 'QUEUEING') {
              // Bouncer checks guest in through front door (2, 9)
              guest.gridX = DOOR_COORD.x;
              guest.gridY = DOOR_COORD.y;
              guest.floor = 1;
              // Decide whether to stay on Floor 1 or go to Floor 2 VIP if unlocked
              const wantsFloor2 = maxFloors === 2 && Math.random() < 0.38;
              if (wantsFloor2) {
                guest.targetFloor = 2;
                guest.state = 'CLIMBING_STAIRS';
                guest.path = findGridPath(
                  items,
                  1,
                  guest.gridX,
                  guest.gridY,
                  STAIRS_COORD.x,
                  STAIRS_COORD.y + 1
                );
                guest.stateTimer = 1.0;
              } else {
                const barItem =
                  items.find(
                    (i) =>
                      i.floor === guest.floor &&
                      getCatalogItem(i.catalogId)?.category === 'BAR_UNIT'
                  ) || items[0];
                const bx = barItem ? barItem.gridX + 1 : 2;
                const by = barItem ? barItem.gridY + 1 : 2;
                guest.state = 'WALKING_TO_BAR';
                guest.path = findGridPath(items, guest.floor, guest.gridX, guest.gridY, bx, by);
                guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
                guest.bubbleTimer = 4;
                guest.stateTimer = 1.2;
              }
            } else if (guest.state === 'CLIMBING_STAIRS') {
              guest.floor = 2;
              guest.gridX = STAIRS_COORD.x;
              guest.gridY = STAIRS_COORD.y + 1;
              guest.state = 'WALKING_TO_BAR';
              const bar2 = items.find(
                (i) => i.floor === 2 && getCatalogItem(i.catalogId)?.category === 'BAR_UNIT'
              );
              const bx = bar2 ? bar2.gridX + 1 : 3;
              const by = bar2 ? bar2.gridY + 1 : 2;
              guest.path = findGridPath(items, 2, guest.gridX, guest.gridY, bx, by);
              guest.bubble = 'VIP_CROWN';
              guest.bubbleTimer = 4;
              guest.stateTimer = 1.2;
            } else if (guest.state === 'WALKING_TO_BAR') {
              guest.state = 'ORDERING_DRINK';
              guest.stateTimer = Math.max(0.8, drink.prepTimeSec / metrics.maxBarTier);
              guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
              guest.bubbleTimer = 3.5;
            } else if (guest.state === 'ORDERING_DRINK') {
              // Pay for drink!
              const drinkRevenue = Math.round(
                drink.sellPrice * (1 + metrics.tipBonus * 0.5) * (guest.isCelebrity ? 2.5 : 1)
              );
              setCash((c) => c + drinkRevenue);
              addXp(12);
              setFloatingTexts((fts) => [
                ...fts.slice(-12),
                {
                  id: `ft_${Date.now()}_${Math.random()}`,
                  text: `+$${drinkRevenue}`,
                  floor: guest.floor,
                  gridX: guest.gridX,
                  gridY: guest.gridY,
                  color: '#4ade80',
                  age: 0,
                },
              ]);

              // Head to a Dance Tile on current floor
              const danceTiles = items.filter(
                (i) =>
                  i.floor === guest.floor &&
                  getCatalogItem(i.catalogId)?.category === 'DANCE_TILE'
              );
              const targetTile =
                danceTiles.length > 0
                  ? danceTiles[Math.floor(Math.random() * danceTiles.length)]
                  : { gridX: 4, gridY: 4 };
              guest.state = 'WALKING_TO_DANCE';
              guest.path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                targetTile.gridX,
                targetTile.gridY
              );
              guest.stateTimer = 1.0;
            } else if (guest.state === 'WALKING_TO_DANCE') {
              guest.state = 'DANCING';
              guest.stateTimer = 5 + Math.random() * 4;
              guest.bubble =
                metrics.lightingCount < 2 && Math.random() < 0.35
                  ? 'ANGRY_LIGHT'
                  : Math.random() < 0.5
                  ? 'SPARKLE'
                  : 'BEER';
              guest.bubbleTimer = 4.5;
            } else if (guest.state === 'DANCING') {
              // Find a Lounge Seat to rest & tip
              const seats = items.filter(
                (i) =>
                  i.floor === guest.floor && getCatalogItem(i.catalogId)?.category === 'SEATING'
              );
              if (seats.length > 0) {
                const chosenSeat = seats[Math.floor(Math.random() * seats.length)];
                guest.state = 'WALKING_TO_SEAT';
                guest.path = findGridPath(
                  items,
                  guest.floor,
                  guest.gridX,
                  guest.gridY,
                  chosenSeat.gridX,
                  chosenSeat.gridY
                );
                guest.stateTimer = 1.0;
              } else {
                guest.state = 'LEAVING';
                guest.path = findGridPath(
                  items,
                  guest.floor,
                  guest.gridX,
                  guest.gridY,
                  DOOR_COORD.x,
                  DOOR_COORD.y
                );
                guest.stateTimer = 1.5;
              }
            } else if (guest.state === 'WALKING_TO_SEAT') {
              guest.state = 'RESTING_AT_SEAT';
              guest.stateTimer = 4 + Math.random() * 3;
              guest.bubble = guest.isCelebrity ? 'VIP_CROWN' : 'CHAT';
              guest.bubbleTimer = 3.5;
            } else if (guest.state === 'RESTING_AT_SEAT') {
              // Leave generous lounge tip and exit
              const seatTip = Math.round(
                35 * (1 + metrics.tipBonus) * (guest.isCelebrity ? 3 : 1)
              );
              setCash((c) => c + seatTip);
              addXp(15);
              setFloatingTexts((fts) => [
                ...fts.slice(-12),
                {
                  id: `ft_tip_${Date.now()}_${Math.random()}`,
                  text: `+$${seatTip} TIP`,
                  floor: guest.floor,
                  gridX: guest.gridX,
                  gridY: guest.gridY,
                  color: '#facc15',
                  age: 0,
                },
              ]);

              if (guest.floor === 2) {
                guest.state = 'DESCENDING_STAIRS';
                guest.path = findGridPath(
                  items,
                  2,
                  guest.gridX,
                  guest.gridY,
                  STAIRS_COORD.x,
                  STAIRS_COORD.y + 1
                );
                guest.stateTimer = 1.0;
              } else {
                guest.state = 'LEAVING';
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
                guest.stateTimer = 1.5;
              }
            } else if (guest.state === 'DESCENDING_STAIRS') {
              guest.floor = 1;
              guest.gridX = STAIRS_COORD.x;
              guest.gridY = STAIRS_COORD.y + 1;
              guest.state = 'LEAVING';
              guest.path = findGridPath(
                items,
                1,
                guest.gridX,
                guest.gridY,
                DOOR_COORD.x,
                DOOR_COORD.y
              );
              guest.stateTimer = 1.5;
            } else if (guest.state === 'LEAVING') {
              // Remove guest after reaching exit so new guests spawn in queue
              continue;
            }
          }

          updated.push(guest);
        }

        // Spawn new guest in outside queue if below capacity
        if (updated.length < metrics.maxGuests && Math.random() < 0.35) {
          const isCeleb =
            metrics.totalHype >= 130 && Math.random() < 0.22;
          const namePool = isCeleb ? CELEBRITY_NAMES : GUEST_NAMES;
          const queueWait = Math.max(1.2, 4.2 - bouncers * 0.9);
          const bubbles: BubbleType[] = ['MUSIC', 'CHAT', 'SPARKLE'];
          updated.push({
            id: `guest_${Date.now()}_${Math.random()}`,
            name: namePool[Math.floor(Math.random() * namePool.length)],
            isCelebrity: isCeleb,
            floor: 1,
            targetFloor: 1,
            gridX: 1.2,
            gridY: 9.85,
            path: [],
            state: 'QUEUEING',
            stateTimer: queueWait,
            patience: 100,
            hype: 75,
            bubble: isCeleb
              ? 'VIP_CROWN'
              : bubbles[Math.floor(Math.random() * bubbles.length)],
            bubbleTimer: 4,
            shirtColor: isCeleb
              ? '#facc15'
              : SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
            hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
            pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
            cashSpent: 0,
          });
        }

        return updated;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [gameState]);

  // Subtle rhythmic club beat audio pulse when not muted
  useEffect(() => {
    if (gameState !== 'PLAYING' || isMuted) return;
    const msPerBeat = Math.round((60 / selectedBpm) * 1000 * 2); // Every 2 beats for subtle groove
    const id = setInterval(() => {
      soundEngine.playBeatPulse(clubMetrics.hypeSegments);
    }, msPerBeat);
    return () => clearInterval(id);
  }, [gameState, isMuted, selectedBpm, clubMetrics.hypeSegments]);

  // Keyboard shortcuts (Space/Enter to start on Title Screen, R to rotate in Build Mode, Esc to close drawers)
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
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handle clicking on an isometric grid cell
  const handleGridClick = (coord: { x: number; y: number }) => {
    if (isRemoveMode) {
      // Find item occupying (coord.x, coord.y) on activeFloor
      const target = placedItems.find((p) => {
        if (p.floor !== activeFloor) return false;
        const cat = getCatalogItem(p.catalogId);
        if (!cat) return false;
        const w = p.rotation === 90 || p.rotation === 270 ? cat.depth : cat.width;
        const d = p.rotation === 90 || p.rotation === 270 ? cat.width : cat.depth;
        return coord.x >= p.gridX && coord.x < p.gridX + w && coord.y >= p.gridY && coord.y < p.gridY + d;
      });
      if (target) {
        const cat = getCatalogItem(target.catalogId);
        const refund = cat ? Math.floor(cat.costCash * 0.5) : 50;
        setPlacedItems((prev) => prev.filter((i) => i.uid !== target.uid));
        setCash((c) => c + refund);
        soundEngine.playCashRegister();
        setFloatingTexts((fts) => [
          ...fts,
          {
            id: `refund_${Date.now()}`,
            text: `+$${refund} REFUND`,
            floor: activeFloor,
            gridX: coord.x,
            gridY: coord.y,
            color: '#fbbf24',
            age: 0,
          },
        ]);
      }
      return;
    }

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
        setFloatingTexts((fts) => [
          ...fts,
          {
            id: `err_${Date.now()}`,
            text: 'NEED MORE FUNDS!',
            floor: activeFloor,
            gridX: coord.x,
            gridY: coord.y,
            color: '#f87171',
            age: 0,
          },
        ]);
        return;
      }

      // Deduct currency & place item
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
      setFloatingTexts((fts) => [
        ...fts,
        {
          id: `place_${Date.now()}`,
          text: `+${selectedCatalogItem.hypeBonus} HYPE / +${selectedCatalogItem.vibeBonus} VIBE`,
          floor: activeFloor,
          gridX: coord.x,
          gridY: coord.y,
          color: '#22d3ee',
          age: 0,
        },
      ]);
    }
  };

  // Unlock or Toggle Floor 2 VIP Sky Lounge
  const handleFloor2Action = () => {
    if (unlockedFloors === 1) {
      if (cash >= 2500) {
        setCash((c) => c - 2500);
        setUnlockedFloors(2);
        setActiveFloor(2);
        // Seed Floor 2 with an initial Neon Bar and 2x2 Dance Floor so guests immediately enjoy it
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
        setFloatingTexts((fts) => [
          ...fts,
          {
            id: `f2_need_${Date.now()}`,
            text: 'FLOOR 2 COSTS $2,500!',
            floor: activeFloor,
            gridX: 4,
            gridY: 1,
            color: '#f43f5e',
            age: 0,
          },
        ]);
      }
    } else {
      setActiveFloor((f) => (f === 1 ? 2 : 1));
      soundEngine.playClick();
    }
  };

  // Instant Showcase Toggle: Load either Gritty Dive Bar (Level 1) or Multi-Floor VIP Hotspot (Level 20)
  const handleLoadPreset = (preset: 'DIVE' | 'VIP_MEGA') => {
    if (preset === 'DIVE') {
      setLevel(1);
      setXp(65);
      setCash(1250);
      setGems(5);
      setUnlockedFloors(1);
      setActiveFloor(1);
      setPlacedItems(INITIAL_PLACED_ITEMS);
      setActiveDrinkId('drink_draft_beer');
      setParkingState({ lotTier: 1, bouncerCount: 1, ropeTier: 1 });
      soundEngine.playClick();
    } else {
      setLevel(20);
      setXp(1850);
      setCash(18450);
      setGems(45);
      setUnlockedFloors(2);
      setActiveFloor(1);
      setPlacedItems(VIP_HOTSPOT_ITEMS);
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090518] select-none">
      {/* 1. LIVE 60FPS 2.5D ISOMETRIC NIGHTCLUB CANVAS (Always running behind Title & HUD) */}
      <IsometricClubCanvas
        activeFloor={activeFloor}
        unlockedFloors={unlockedFloors}
        playerLevel={level}
        placedItems={placedItems}
        guests={guests}
        floatingTexts={floatingTexts}
        buildModeItem={activeBottomTab === 'BUILD' && !isRemoveMode ? selectedCatalogItem : null}
        buildRotation={buildRotation}
        hoveredGrid={hoveredGrid}
        activeDrink={activeDrink}
        parkingState={parkingState}
        isRemoveMode={isRemoveMode}
        onHoverGrid={setHoveredGrid}
        onClickGrid={handleGridClick}
        onClickBuyFloor2={handleFloor2Action}
      />

      {/* =====================================================================
          TITLE SCREEN OVERLAY (Game Shell Rule: Bespoke SVG Lockup + Start CTA)
         ===================================================================== */}
      {gameState === 'TITLE' && (
        <div className="fixed inset-0 z-40 flex items-center justify-between px-10 lg:px-20 bg-gradient-to-r from-[#090518]/95 via-[#090518]/75 to-transparent">
          <div className="max-w-xl space-y-6">
            {/* Bespoke Inline SVG Neon Nights Title Lockup */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400">
                <span>2.5D Isometric Nightclub Management Simulation</span>
                <span>·</span>
                <span>Android &amp; Web Engine</span>
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

            <p className="text-base text-purple-100/90 leading-relaxed">
              Transform a gritty single-story basement dive with worn brick walls and a 3x3 disco floor into a multi-story VIP cyberpunk hotspot. Craft glowing cocktails, manage bouncer queues, place laser rigs, and inspect the complete Android Jetpack Compose &amp; Unity C# technical architecture.
            </p>

            {/* Primary Start CTA & Preset Launchers */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => {
                  soundEngine.playUpgradeFanfare();
                  setGameState('PLAYING');
                }}
                className="px-7 py-4 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-slate-950 font-extrabold text-lg shadow-[0_6px_0_#065f46] active:translate-y-0.5 transition-all cursor-pointer"
              >
                Enter Club (Level 1 Dive)
              </button>

              <button
                onClick={() => {
                  handleLoadPreset('VIP_MEGA');
                  setGameState('PLAYING');
                }}
                className="px-5 py-4 rounded-2xl bg-gradient-to-b from-fuchsia-500 to-purple-700 hover:from-fuchsia-400 hover:to-purple-600 text-white font-bold text-base border border-fuchsia-300/40 shadow-[0_6px_0_#4a044e] active:translate-y-0.5 transition-all cursor-pointer"
              >
                Preview Level 20 VIP Mega-Club
              </button>

              <button
                onClick={() => setIsBlueprintOpen(true)}
                className="px-4 py-4 rounded-2xl bg-purple-950/80 hover:bg-purple-900 border border-cyan-400/50 text-cyan-300 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Code2 className="w-4 h-4" />
                <span>Kotlin / C# Architecture</span>
              </button>
            </div>

            {/* Single Flat Control-Hint Line */}
            <div className="text-xs font-mono text-purple-300/75 pt-2">
              Click Isometric Tiles to Place Items · R Key Rotate Furniture · Click Staircase for Floor 2 · Esc Close Menus
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PLAYING HUD ARCHITECTURE (Matched to Reference Image IMG_1503_71984622.jpeg)
          Uses pointer-events-none on wrapper so >85% of isometric canvas stays interactive
         ===================================================================== */}
      {gameState === 'PLAYING' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 sm:p-5">
          {/* -----------------------------------------------------------------
              TOP BAR: TOP-LEFT LEVEL STAR & XP + TOP-RIGHT CURRENCIES & METERS
             ----------------------------------------------------------------- */}
          <div className="flex items-start justify-between gap-4">
            {/* TOP-LEFT: Gold Star Level Badge + XP Bar + Preset Switcher */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="relative flex items-center">
                {/* Gold Star Level Badge */}
                <div className="relative z-10 w-16 h-16 flex flex-col items-center justify-center bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 rounded-2xl border-2 border-amber-100 shadow-[0_4px_0_#92400e] -rotate-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950 leading-none">
                    Level
                  </span>
                  <span className="text-2xl font-black text-amber-950 font-mono tabular-nums leading-tight">
                    {level}
                  </span>
                </div>

                {/* XP Progress Bar */}
                <div className="-ml-3 pl-5 pr-4 py-2 bg-[#16102c]/95 border-2 border-purple-400/40 rounded-r-2xl shadow-lg min-w-[180px] sm:min-w-[230px]">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-200 mb-1">
                    <span>XP</span>
                    <span className="font-mono tabular-nums text-cyan-300">
                      {xp} / {xpToNextLevel}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-purple-950 rounded-full overflow-hidden border border-purple-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Instant Dive vs VIP Stage Switcher & Android Code Button */}
              <div className="hidden xl:flex items-center gap-2 bg-[#16102c]/90 border border-purple-500/40 rounded-xl p-1.5">
                <button
                  onClick={() => handleLoadPreset('DIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    level < 10
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-purple-200 hover:bg-purple-800/50'
                  }`}
                >
                  Lvl 1 Dive Stage
                </button>
                <button
                  onClick={() => handleLoadPreset('VIP_MEGA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    level >= 10
                      ? 'bg-fuchsia-500 text-white'
                      : 'text-purple-200 hover:bg-purple-800/50'
                  }`}
                >
                  Lvl 20 VIP Hotspot
                </button>
                <button
                  onClick={() => setIsBlueprintOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Kotlin / C# Code</span>
                </button>
              </div>
            </div>

            {/* TOP-RIGHT: Cash ($), Gems (+), Hype Lightning Meter, Vibe Flame Meter, Floor Switcher */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                {/* Soft Currency: Cash ($) */}
                <div className="flex items-center gap-2.5 bg-[#16102c]/95 border-2 border-purple-400/40 rounded-full px-3.5 py-1.5 shadow-lg">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-100 flex items-center justify-center font-black text-amber-950 text-sm shadow">
                    $
                  </div>
                  <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                    ${cash.toLocaleString()}
                  </span>
                </div>

                {/* Hard Currency: Gems / Diamonds with + button */}
                <div className="flex items-center gap-2.5 bg-[#16102c]/95 border-2 border-purple-400/40 rounded-full pl-3 pr-2 py-1.5 shadow-lg">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-fuchsia-400 to-purple-600 rotate-45 flex items-center justify-center shadow">
                    <div className="w-2.5 h-2.5 bg-fuchsia-200 rounded-xs" />
                  </div>
                  <span className="text-lg font-extrabold text-white font-mono tabular-nums px-1">
                    {gems}
                  </span>
                  <button
                    onClick={() => {
                      setGems((g) => g + 5);
                      soundEngine.playCashRegister();
                    }}
                    title="Claim +5 Free Designer Gems"
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 text-slate-950 flex items-center justify-center font-black shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>

                {/* Hype & Vibe 3-Segment Star Meters Stack */}
                <div className="flex flex-col gap-1.5">
                  {/* Hype Rating (Lightning Bolt + 3 Segments) */}
                  <div
                    className="flex items-center gap-1.5 bg-[#16102c]/95 border-2 border-purple-400/40 rounded-full px-2.5 py-1 shadow"
                    title={`Club Hype Score: ${clubMetrics.totalHype}`}
                  >
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`w-5 h-3 rounded-xs border ${
                            clubMetrics.hypeSegments >= seg
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 border-amber-200'
                              : 'bg-purple-950/90 border-purple-700/50'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-300 tabular-nums ml-1">
                      {clubMetrics.totalHype}
                    </span>
                  </div>

                  {/* Vibe Multiplier (Flame Icon + 3 Segments) */}
                  <div
                    className="flex items-center gap-1.5 bg-[#16102c]/95 border-2 border-purple-400/40 rounded-full px-2.5 py-1 shadow"
                    title={`Club Vibe Score: ${clubMetrics.totalVibe}`}
                  >
                    <Flame className="w-4 h-4 text-orange-400 fill-orange-500 shrink-0" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`w-5 h-3 rounded-xs border ${
                            clubMetrics.vibeSegments >= seg
                              ? 'bg-gradient-to-r from-orange-500 to-rose-400 border-orange-200'
                              : 'bg-purple-950/90 border-purple-700/50'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-orange-300 tabular-nums ml-1">
                      {(1 + clubMetrics.tipBonus).toFixed(2)}x
                    </span>
                  </div>
                </div>

                {/* Sound Mute Toggle */}
                <button
                  onClick={() => {
                    const next = !isMuted;
                    setIsMuted(next);
                    soundEngine.isMuted = next;
                  }}
                  className="w-10 h-10 rounded-full bg-[#16102c]/95 border-2 border-purple-400/40 flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
                  aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-300" />}
                </button>
              </div>

              {/* Vertical Expansion / Floor Camera Selector Pill */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFloor2Action}
                  className={`px-3.5 py-1.5 rounded-xl border-2 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                    unlockedFloors === 2
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-200 text-white'
                      : 'bg-[#16102c]/95 border-cyan-400/60 text-cyan-300 hover:bg-cyan-950/80'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {unlockedFloors === 1 ? (
                    <span>Unlock Floor 2 VIP ($2,500)</span>
                  ) : (
                    <span>Viewing Floor {activeFloor} · Switch to Floor {activeFloor === 1 ? 2 : 1}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              MIDDLE ZONE: LEFT VERTICAL SIDEBAR + BUILD MODE OVERLAY + LIVE EVENT BOX
             ----------------------------------------------------------------- */}
          <div className="flex-1 flex items-center justify-between relative my-2">
            {/* LEFT SIDEBAR: Quests, DJ Booth, Playlists (Locked early), Celebs (Locked early) */}
            <div className="flex flex-col gap-3 pointer-events-auto">
              {/* 1. Quests Button */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'QUESTS' ? null : 'QUESTS'));
                }}
                className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform active:scale-95 cursor-pointer ${
                  activeLeftModal === 'QUESTS'
                    ? 'bg-purple-700 border-cyan-300 text-white'
                    : 'bg-[#221742]/95 border-purple-400/50 text-purple-100 hover:bg-[#2c1e54]'
                }`}
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 border-2 border-white text-white text-xs font-black flex items-center justify-center shadow">
                  {unclaimedQuestCount > 0 ? unclaimedQuestCount : '!'}
                </span>
                <ClipboardList className="w-7 h-7 text-amber-300" />
                <span className="text-xs font-extrabold tracking-tight">Quests</span>
              </button>

              {/* 2. DJ Booth Button */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'DJ_BOOTH' ? null : 'DJ_BOOTH'));
                }}
                className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform active:scale-95 cursor-pointer ${
                  activeLeftModal === 'DJ_BOOTH'
                    ? 'bg-purple-700 border-cyan-300 text-white'
                    : 'bg-[#221742]/95 border-purple-400/50 text-purple-100 hover:bg-[#2c1e54]'
                }`}
              >
                <Disc3 className="w-7 h-7 text-fuchsia-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-extrabold tracking-tight">DJ Booth</span>
              </button>

              {/* 3. Playlists (Locked at Level 1, Unlocks at Level 3) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'PLAYLISTS' ? null : 'PLAYLISTS'));
                }}
                className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform active:scale-95 cursor-pointer ${
                  activeLeftModal === 'PLAYLISTS'
                    ? 'bg-purple-700 border-cyan-300 text-white'
                    : 'bg-[#1a1233]/95 border-purple-500/40 text-purple-200/80 hover:bg-[#251a47]'
                }`}
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 border-2 border-white text-white text-[11px] font-black flex items-center justify-center shadow">
                  {level < 3 ? <Lock className="w-3 h-3" /> : '!'}
                </span>
                {level < 3 ? (
                  <>
                    <Lock className="w-7 h-7 text-slate-300" />
                    <span className="text-xs font-extrabold">Locked</span>
                  </>
                ) : (
                  <>
                    <Music className="w-7 h-7 text-cyan-300" />
                    <span className="text-xs font-extrabold">Playlists</span>
                  </>
                )}
              </button>

              {/* 4. Celebs VIP Lounge (Locked at Level 1, Unlocks at Level 5) */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setActiveLeftModal((m) => (m === 'CELEBS' ? null : 'CELEBS'));
                }}
                className={`relative w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-xl transition-transform active:scale-95 cursor-pointer ${
                  activeLeftModal === 'CELEBS'
                    ? 'bg-purple-700 border-cyan-300 text-white'
                    : 'bg-[#1a1233]/95 border-purple-500/40 text-purple-200/80 hover:bg-[#251a47]'
                }`}
              >
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 border-2 border-white text-white text-xs font-black flex items-center justify-center shadow">
                  !
                </span>
                {level < 5 ? (
                  <>
                    <Lock className="w-7 h-7 text-slate-300" />
                    <span className="text-xs font-extrabold">Locked</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-7 h-7 text-amber-300" />
                    <span className="text-xs font-extrabold">Celebs</span>
                  </>
                )}
              </button>

              {/* 5. Technical Architecture Blueprint Button (Visible on all screen sizes) */}
              <button
                onClick={() => setIsBlueprintOpen(true)}
                className="w-20 py-2 rounded-xl bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-900 flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                <span className="text-[10px] font-bold">Android Spec</span>
              </button>
            </div>

            {/* LEFT SIDEBAR POPUP DRAWER (Quests, DJ Booth, Playlists, Celebs) */}
            {activeLeftModal && (
              <div className="absolute left-24 top-0 z-30 w-80 sm:w-96 bg-[#181030]/98 border-2 border-purple-400/60 rounded-2xl shadow-2xl p-4 pointer-events-auto text-white">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/30">
                  <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
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
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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
                              <p className="text-xs text-purple-200/75 leading-snug">{q.description}</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-cyan-300 shrink-0">
                              {q.currentValue}/{q.targetValue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-mono text-amber-300">
                              Reward: +${q.rewardCash} · +{q.rewardGems} Gems · +{q.rewardXp} XP
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
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/30">
                      <div className="text-xs text-purple-300 mb-1">Active Tempo &amp; Beat Drop</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-extrabold font-mono text-cyan-300">
                          {selectedBpm} BPM
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[118, 124, 132, 140].map((bpm) => (
                            <button
                              key={bpm}
                              onClick={() => {
                                setSelectedBpm(bpm);
                                soundEngine.setBpm(bpm);
                                soundEngine.playClick();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                                selectedBpm === bpm
                                  ? 'bg-fuchsia-500 text-white'
                                  : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800'
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
                        setCash((c) => c - 150);
                        addXp(45);
                        soundEngine.playUpgradeFanfare();
                        setFloatingTexts((fts) => [
                          ...fts,
                          {
                            id: `hype_drop_${Date.now()}`,
                            text: 'MEGA BASS DROP! +$320 TIPS',
                            floor: activeFloor,
                            gridX: 4,
                            gridY: 4,
                            color: '#f472b6',
                            age: 0,
                          },
                        ]);
                        setCash((c) => c + 320);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-slate-950 font-extrabold text-sm shadow cursor-pointer"
                    >
                      Trigger Laser Bass Drop ($150 → +$320 Crowd Tips)
                    </button>
                  </div>
                )}

                {activeLeftModal === 'PLAYLISTS' && (
                  <div className="space-y-2.5">
                    {level < 3 && (
                      <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                        Reach Level 3 (or click &ldquo;Lvl 20 VIP Hotspot&rdquo; in top bar) to unlock custom genre multipliers.
                      </div>
                    )}
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
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                            activePlaylist === pl.name
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : locked
                              ? 'bg-purple-950/40 border-purple-800/30 text-purple-400 cursor-not-allowed'
                              : 'bg-purple-950/70 border-purple-500/30 text-purple-100 hover:bg-purple-900/50'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold">{pl.name}</div>
                            <div className="text-xs text-cyan-300">{pl.bonus}</div>
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
                  <div className="space-y-2.5">
                    <p className="text-xs text-purple-200/80">
                      Celebrities visit automatically when Club Hype exceeds 130, or invite a VIP entourage directly for an instant cash and hype surge.
                    </p>
                    {CELEBRITY_NAMES.map((cName, idx) => (
                      <div
                        key={cName}
                        className="p-2.5 rounded-xl bg-purple-950/70 border border-amber-400/30 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                            <Crown className="w-4 h-4" />
                            <span>{cName}</span>
                          </div>
                          <div className="text-xs text-purple-200/75">3.0x Drink &amp; Lounge Booth Tips</div>
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
                            setGuests((prev) => [
                              ...prev,
                              {
                                id: `celeb_${Date.now()}_${idx}`,
                                name: cName,
                                isCelebrity: true,
                                floor: activeFloor,
                                targetFloor: activeFloor,
                                gridX: 4,
                                gridY: 4,
                                path: [],
                                state: 'DANCING',
                                stateTimer: 9,
                                patience: 100,
                                hype: 100,
                                bubble: 'VIP_CROWN',
                                bubbleTimer: 8,
                                shirtColor: '#facc15',
                                hairColor: '#1e1b4b',
                                pantsColor: '#311042',
                                cashSpent: 650,
                              },
                            ]);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
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
                BOTTOM-CENTER GHOSTED GREEN "BUILD MODE" BOX
                (Matched directly to the green translucent Build Mode panel in IMG_1503_71984622.jpeg)
               --------------------------------------------------------------- */}
            {activeBottomTab && (
              <div className="mx-auto mt-auto mb-1 pointer-events-auto">
                {activeBottomTab === 'BUILD' && (
                  <div className="w-[360px] sm:w-[540px] md:w-[660px] bg-emerald-500/80 border-2 border-emerald-200 rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(16,185,129,0.35)] text-slate-950">
                    {/* Build Mode Header Bar */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
                          Build Mode (Floor {activeFloor})
                        </h3>
                        <span className="text-xs font-bold text-emerald-950 bg-emerald-200/90 px-2 py-0.5 rounded-md">
                          Click tile on grid to place
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Rotate Furniture Button */}
                        <button
                          onClick={() => {
                            setBuildRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
                            soundEngine.playClick();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900/85 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Rotate Item (Shortcut: R)"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{buildRotation}°</span>
                        </button>

                        {/* Sell / Bulldoze Toggle */}
                        <button
                          onClick={() => {
                            setIsRemoveMode((prev) => !prev);
                            soundEngine.playClick();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            isRemoveMode
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-900/85 text-rose-300 hover:bg-slate-800'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isRemoveMode ? 'Selling ON' : 'Sell'}</span>
                        </button>

                        {/* Close Build Mode X */}
                        <button
                          onClick={() => {
                            setActiveBottomTab(null);
                            setIsRemoveMode(false);
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-900/75 text-white hover:bg-slate-900 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
                      {(
                        [
                          { id: 'ALL', label: 'All Gear' },
                          { id: 'SEATING', label: 'Chairs & Booths' },
                          { id: 'LIGHTING', label: 'Lights & Lasers' },
                          { id: 'DANCE_TILE', label: 'Dance Tiles' },
                          { id: 'BAR_UNIT', label: 'Disco Bars' },
                          { id: 'DJ_BOOTH', label: 'DJ & Speakers' },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setBuildCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            buildCategory === cat.id
                              ? 'bg-slate-950 text-emerald-300 shadow'
                              : 'bg-emerald-700/60 text-white hover:bg-emerald-800/70'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Horizontal Scrollable Item Cards */}
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
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
                            className={`w-36 shrink-0 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-950/95 border-white text-white shadow-lg scale-[1.02]'
                                : 'bg-emerald-950/75 border-emerald-300/50 text-emerald-50 hover:bg-emerald-950/90'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className="text-emerald-300 font-bold">
                                Tier {item.tier} · {item.width}x{item.depth}
                              </span>
                              <span className="text-amber-300 font-bold">+{item.hypeBonus}⚡</span>
                            </div>
                            <div className="text-xs font-extrabold truncate">{item.name}</div>
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-emerald-500/30 text-xs font-mono font-bold">
                              <span className={canAfford ? 'text-emerald-300' : 'text-rose-400'}>
                                ${item.costCash}
                              </span>
                              {item.costGems > 0 && (
                                <span className="text-fuchsia-300">{item.costGems} Gems</span>
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
                  <div className="w-[360px] sm:w-[560px] bg-[#2a1245]/95 border-2 border-fuchsia-400 rounded-2xl p-4 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-fuchsia-200">
                          Drink Crafting &amp; Tiered Mixology Menu
                        </h3>
                        <p className="text-xs text-purple-200/75">
                          Current Bar Tier: Tier {clubMetrics.maxBarTier} · Higher-tier bars unlock Neon Cosmos &amp; Bottle Service
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-purple-900/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-fuchsia-600/35 border-cyan-300'
                                : barUnlocked
                                ? 'bg-purple-950/75 border-purple-500/40 hover:border-fuchsia-400'
                                : 'bg-purple-950/40 border-purple-800/30 opacity-65'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-extrabold" style={{ color: drink.color }}>
                                {drink.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-300">
                                +${drink.sellPrice}/guest
                              </span>
                            </div>
                            <p className="text-xs text-purple-200/75 mt-1 line-clamp-1">
                              {drink.description}
                            </p>
                            <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
                              <span className="text-amber-300">+{drink.hypeBoost} Hype Boost</span>
                              <span className="font-bold text-cyan-300">
                                {!barUnlocked
                                  ? `Requires Tier ${drink.requiredBarTier} Bar`
                                  : isCurrent
                                  ? '✓ SERVING NOW'
                                  : 'Tap to Serve'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PARKING / LINE / BOUNCERS DRAWER */}
                {activeBottomTab === 'PARKING' && (
                  <div className="w-[360px] sm:w-[560px] bg-[#22133d]/95 border-2 border-purple-400 rounded-2xl p-4 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-purple-200">
                          Outside Parking Lot, Velvet Ropes &amp; Bouncer Line
                        </h3>
                        <p className="text-xs text-purple-300/80">
                          Expand capacity from a 2-car gravel patch into a VIP Valet Plaza
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-purple-900/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Upgrade Parking Lot */}
                      <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-mono text-cyan-300">
                            Tier {parkingState.lotTier}/3
                          </div>
                          <div className="text-sm font-extrabold mt-0.5">
                            {parkingState.lotTier === 1
                              ? 'Gravel Patch'
                              : parkingState.lotTier === 2
                              ? 'Neon Street Lot'
                              : 'VIP Valet Plaza'}
                          </div>
                          <p className="text-xs text-purple-200/75 mt-1">
                            Increases max club guest capacity &amp; sports cars outside.
                          </p>
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
                          className="mt-3 w-full py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:bg-purple-900 disabled:text-purple-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          {parkingState.lotTier >= 3
                            ? 'MAXED'
                            : `Upgrade ($${parkingState.lotTier * 600})`}
                        </button>
                      </div>

                      {/* Hire Bouncers */}
                      <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-mono text-cyan-300">
                            {parkingState.bouncerCount}/4 Bouncers
                          </div>
                          <div className="text-sm font-extrabold mt-0.5">Door Security</div>
                          <p className="text-xs text-purple-200/75 mt-1">
                            Admits queued guests faster so lines never get impatient.
                          </p>
                        </div>
                        <button
                          disabled={parkingState.bouncerCount >= 4}
                          onClick={() => {
                            const cost = parkingState.bouncerCount * 400;
                            if (cash < cost) {
                              soundEngine.playError();
                              return;
                            }
                            setCash((c) => c - cost);
                            setParkingState((p) => ({
                              ...p,
                              bouncerCount: Math.min(4, p.bouncerCount + 1),
                            }));
                            addXp(50);
                            soundEngine.playUpgradeFanfare();
                          }}
                          className="mt-3 w-full py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:bg-purple-900 disabled:text-purple-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          {parkingState.bouncerCount >= 4
                            ? 'MAXED'
                            : `Hire ($${parkingState.bouncerCount * 400})`}
                        </button>
                      </div>

                      {/* Upgrade Velvet Rope */}
                      <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/40 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-mono text-cyan-300">
                            Tier {parkingState.ropeTier}/3
                          </div>
                          <div className="text-sm font-extrabold mt-0.5">
                            {parkingState.ropeTier === 1
                              ? 'Basic Queue Rope'
                              : parkingState.ropeTier === 2
                              ? 'Magenta Velvet Rope'
                              : '24K Gold VIP Gate'}
                          </div>
                          <p className="text-xs text-purple-200/75 mt-1">
                            Boosts entryway Vibe multiplier &amp; celebrity arrival rate.
                          </p>
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
                          className="mt-3 w-full py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:bg-purple-900 disabled:text-purple-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          {parkingState.ropeTier >= 3
                            ? 'MAXED'
                            : `Upgrade ($${parkingState.ropeTier * 450})`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* INVITE FRIENDS SOCIAL CREW DRAWER */}
                {activeBottomTab === 'FRIENDS' && (
                  <div className="w-[360px] sm:w-[520px] bg-[#301136]/95 border-2 border-pink-400 rounded-2xl p-4 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-pink-200">
                          Social Entourage &amp; Friend Staff Crew
                        </h3>
                        <p className="text-xs text-pink-200/75">
                          Send VIP Guest Passes to friends for an instant floor flash-mob &amp; cash bonus
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-pink-950/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-pink-950/60 border border-pink-500/30">
                      <div>
                        <div className="text-sm font-bold">Launch Flash-Mob Party Bus</div>
                        <div className="text-xs text-pink-200/80">
                          Spawns 4 hyped dancers immediately &amp; awards +$400 Cover Charge
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCash((c) => c + 400);
                          addXp(60);
                          soundEngine.playUpgradeFanfare();
                          setActiveBottomTab(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-b from-pink-400 to-rose-600 text-white font-extrabold text-xs cursor-pointer shrink-0"
                      >
                        Invite All (+$400)
                      </button>
                    </div>
                  </div>
                )}

                {/* WORLD MAP NIGHTLIFE DISTRICTS DRAWER */}
                {activeBottomTab === 'WORLD_MAP' && (
                  <div className="w-[360px] sm:w-[560px] bg-[#0e2238]/95 border-2 border-cyan-400 rounded-2xl p-4 shadow-2xl text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-cyan-200">
                          Neon City Nightlife Districts Map
                        </h3>
                        <p className="text-xs text-cyan-200/75">
                          Switch between your Basement Dive starting stage and the Level 20 Skyline Penthouse
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveBottomTab(null)}
                        className="w-7 h-7 rounded-lg bg-cyan-950/80 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-400/40 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-mono text-amber-300">DISTRICT 01 · STARTER</div>
                          <div className="text-sm font-extrabold mt-0.5">Brick Alley Dive Bar</div>
                          <p className="text-xs text-cyan-100/75 mt-1">
                            Single-story brick basement, 3x3 retro dance floor, draft pints.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleLoadPreset('DIVE');
                            setActiveBottomTab(null);
                          }}
                          className="mt-3 w-full py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          Load Dive Bar Stage
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-950/70 border border-fuchsia-400/50 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-mono text-fuchsia-300">DISTRICT 02 · VIP SKYLINE</div>
                          <div className="text-sm font-extrabold mt-0.5">Supernova 2-Story Mega-Club</div>
                          <p className="text-xs text-purple-100/75 mt-1">
                            2-Floor laser sanctuary, wraparound gold bar, hologram DJ &amp; bottle service.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleLoadPreset('VIP_MEGA');
                            setActiveBottomTab(null);
                          }}
                          className="mt-3 w-full py-1.5 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-extrabold text-xs cursor-pointer"
                        >
                          Load VIP Mega-Club Stage
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------
                BOTTOM-RIGHT: LIVE EVENT ALERT BOX
                (Matched directly to the blue-header white-body Live event box in IMG_1503_71984622.jpeg)
               --------------------------------------------------------------- */}
            {showLiveEvents && (
              <div className="mt-auto ml-auto w-64 sm:w-72 rounded-2xl overflow-hidden border-2 border-indigo-400/80 shadow-2xl bg-slate-100 text-slate-900 pointer-events-auto">
                {/* Blue Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-3 py-1.5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold">
                    <Info className="w-4 h-4 text-cyan-300" />
                    <span>Live event</span>
                  </div>
                  <button
                    onClick={() => setShowLiveEvents(false)}
                    className="text-blue-200 hover:text-white cursor-pointer"
                    aria-label="Dismiss Live Events"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Alert Rows */}
                <div className="divide-y divide-slate-200">
                  {liveAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        if (alert.actionTab === 'BUILD') {
                          setActiveBottomTab('BUILD');
                          setBuildCategory('LIGHTING');
                        } else if (alert.actionTab === 'PARKING') {
                          setActiveBottomTab('PARKING');
                        }
                        soundEngine.playClick();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {alert.severity === 'CRITICAL' ? (
                        <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          !
                        </div>
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-500 fill-amber-400 text-slate-950 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {alert.message}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -----------------------------------------------------------------
              BOTTOM NAVIGATION BAR: 5 COMMAND BUTTONS
              1. Build/Decorate (Green + UPGRADE)
              2. Drink Mixes (Magenta + UPGRADE)
              3. Parking/Line (Purple + UPGRADE)
              4. Invite Friends (Pink + !)
              5. World Map (Cyan)
             ----------------------------------------------------------------- */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3.5 pt-1 pointer-events-auto">
            {/* 1. Build/Decorate (Green) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'BUILD' ? null : 'BUILD'));
              }}
              className={`relative py-2.5 sm:py-3.5 px-2 rounded-2xl border-2 bg-gradient-to-b from-lime-400 via-emerald-500 to-emerald-700 hover:from-lime-300 hover:to-emerald-600 text-white shadow-[0_5px_0_#064e3b] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeBottomTab === 'BUILD' ? 'border-white ring-2 ring-emerald-300' : 'border-lime-200/80'
              }`}
            >
              <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-lime-500 border-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow">
                UPGRADE
              </span>
              <Hammer className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
              <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow whitespace-nowrap">
                Build/Decorate
              </span>
            </button>

            {/* 2. Drink Mixes (Magenta) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'DRINKS' ? null : 'DRINKS'));
              }}
              className={`relative py-2.5 sm:py-3.5 px-2 rounded-2xl border-2 bg-gradient-to-b from-fuchsia-400 via-fuchsia-600 to-purple-800 hover:from-fuchsia-300 hover:to-purple-700 text-white shadow-[0_5px_0_#4a044e] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeBottomTab === 'DRINKS' ? 'border-white ring-2 ring-fuchsia-300' : 'border-fuchsia-200/80'
              }`}
            >
              <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-lime-500 border-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow">
                UPGRADE
              </span>
              <GlassWater className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
              <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow whitespace-nowrap">
                Drink Mixes
              </span>
            </button>

            {/* 3. Parking/Line (Purple) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'PARKING' ? null : 'PARKING'));
              }}
              className={`relative py-2.5 sm:py-3.5 px-2 rounded-2xl border-2 bg-gradient-to-b from-purple-500 via-purple-700 to-indigo-950 hover:from-purple-400 hover:to-indigo-900 text-white shadow-[0_5px_0_#1e1b4b] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeBottomTab === 'PARKING' ? 'border-white ring-2 ring-purple-300' : 'border-purple-300/70'
              }`}
            >
              <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-lime-500 border-2 border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow">
                UPGRADE
              </span>
              <Car className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
              <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow whitespace-nowrap">
                Parking/Line
              </span>
            </button>

            {/* 4. Invite Friends (Pink) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'FRIENDS' ? null : 'FRIENDS'));
              }}
              className={`relative py-2.5 sm:py-3.5 px-2 rounded-2xl border-2 bg-gradient-to-b from-pink-400 via-rose-500 to-rose-800 hover:from-pink-300 hover:to-rose-700 text-white shadow-[0_5px_0_#881337] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeBottomTab === 'FRIENDS' ? 'border-white ring-2 ring-pink-300' : 'border-pink-200/80'
              }`}
            >
              <span className="absolute -top-2.5 right-2 w-6 h-6 rounded-full bg-rose-600 border-2 border-white text-xs font-black text-white flex items-center justify-center shadow">
                !
              </span>
              <Users className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
              <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow whitespace-nowrap">
                Invite Friends
              </span>
            </button>

            {/* 5. World Map (Cyan) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveBottomTab((t) => (t === 'WORLD_MAP' ? null : 'WORLD_MAP'));
              }}
              className={`relative py-2.5 sm:py-3.5 px-2 rounded-2xl border-2 bg-gradient-to-b from-cyan-300 via-sky-500 to-blue-700 hover:from-cyan-200 hover:to-blue-600 text-white shadow-[0_5px_0_#1e3a8a] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeBottomTab === 'WORLD_MAP' ? 'border-white ring-2 ring-cyan-200' : 'border-cyan-100/80'
              }`}
            >
              <Compass className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow" />
              <span className="text-xs sm:text-sm font-black tracking-tight drop-shadow whitespace-nowrap">
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
