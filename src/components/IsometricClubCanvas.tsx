import React, { useEffect, useRef } from 'react';
import {
  BubbleType,
  CatalogItem,
  DrinkMix,
  FloatingText,
  GuestAgent,
  ParkingUpgradeState,
  PlacedItem,
  StaffCatalogItem,
  StaffMemberAgent,
} from '../types/game';
import {
  canPlaceItem,
  DOOR_COORD,
  findGridPath,
  getCatalogItem,
  getRotatedFootprint,
  GRID_SIZE,
  STAIRS_COORD,
} from '../utils/pathfinding';

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

interface IsometricClubCanvasProps {
  isPlaying: boolean;
  activeFloor: 1 | 2;
  unlockedFloors: 1 | 2;
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
  isRemoveMode: boolean;
  cameraZoom: number;
  cameraResetTick: number;
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
const INK = '#150d2a';

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

const SHIRT_COLORS = ['#dc2626', '#6366f1', '#475569', '#e11d48', '#9333ea', '#0284c7', '#10b981'];
const HAIR_COLORS = ['#1e1b4b', '#78350f', '#92400e', '#451a03', '#3b0764'];
const PANTS_COLORS = ['#1e3a8a', '#1e293b', '#312e81', '#334155', '#3b0764'];

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
  isRemoveMode,
  cameraZoom,
  cameraResetTick,
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

  useEffect(() => {
    panOffsetRef.current = { x: 0, y: 0 };
  }, [cameraResetTick]);

  useEffect(() => {
    if (typeof dayNightOverrideHour === 'number') {
      gameHourRef.current = dayNightOverrideHour;
    }
  }, [dayNightOverrideHour]);

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
    isRemoveMode,
    cameraZoom,
    dayNightOverrideHour,
    onCycleTimeReport,
    onEarnRevenue,
    onStaffTaskComplete,
    onQueueCountChange,
    onClickGrid,
    onClickBuyFloor2,
  });

  useEffect(() => {
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
      isRemoveMode,
      cameraZoom,
      dayNightOverrideHour,
      onCycleTimeReport,
      onEarnRevenue,
      onStaffTaskComplete,
      onQueueCountChange,
      onClickGrid,
      onClickBuyFloor2,
    };
  });

  const getViewportTransform = (width: number, height: number, userZoom: number) => {
    const autoScale = Math.min(1.22, Math.max(0.55, Math.min(width / 760, height / 640)));
    const scale = autoScale * userZoom;
    const tileW = BASE_TILE_W * scale;
    const tileH = BASE_TILE_H * scale;
    const originX = width * (width < 640 ? 0.53 : 0.505) + panOffsetRef.current.x;
    const originY = height * (width < 640 ? 0.28 : 0.305) + panOffsetRef.current.y;
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

  // Dedicated 60fps Game Loop (Simulation + Canvas Paint in a single requestAnimationFrame loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let lastTimeMs = performance.now();
    let spawnAccumulator = 0;
    let lastReportedQueueCount = -1;

    let viewportWidth = canvas.clientWidth || window.innerWidth;
    let viewportHeight = canvas.clientHeight || window.innerHeight;

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = canvas.clientWidth || window.innerWidth;
      viewportHeight = canvas.clientHeight || window.innerHeight;
      const targetW = Math.floor(viewportWidth * dpr);
      const targetH = Math.floor(viewportHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);

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

      const guests = guestsRef.current;
      let earnedCashThisFrame = 0;
      let earnedXpThisFrame = 0;

      for (let i = guests.length - 1; i >= 0; i--) {
        const guest = guests[i];
        guest.stateTimer -= dt;
        if (guest.bubbleTimer > 0) {
          guest.bubbleTimer -= dt;
          if (guest.bubbleTimer <= 0) {
            guest.bubble = null;
          }
        }

        if (guest.path.length > 0) {
          const nextWp = guest.path[0];
          const dx = nextWp.x - guest.gridX;
          const dy = nextWp.y - guest.gridY;
          const dist = Math.hypot(dx, dy);
          const speed = 2.25 * dt;
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
            guest.gridX = DOOR_COORD.x;
            guest.gridY = DOOR_COORD.y;
            guest.floor = 1;
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
              guest.stateTimer = 0.8;
            } else {
              const barItem =
                items.find(
                  (it) =>
                    it.floor === guest.floor &&
                    getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
                ) || items[0];
              const bx = barItem ? barItem.gridX + 1 : 2;
              const by = barItem ? barItem.gridY + 1 : 2;
              guest.state = 'WALKING_TO_BAR';
              guest.path = findGridPath(items, guest.floor, guest.gridX, guest.gridY, bx, by);
              guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
              guest.bubbleTimer = 4;
              guest.stateTimer = 0.9;
            }
          } else if (guest.state === 'CLIMBING_STAIRS') {
            guest.floor = 2;
            guest.gridX = STAIRS_COORD.x;
            guest.gridY = STAIRS_COORD.y + 1;
            guest.state = 'WALKING_TO_BAR';
            const bar2 = items.find(
              (it) => it.floor === 2 && getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
            );
            const bx = bar2 ? bar2.gridX + 1 : 3;
            const by = bar2 ? bar2.gridY + 1 : 2;
            guest.path = findGridPath(items, 2, guest.gridX, guest.gridY, bx, by);
            guest.bubble = 'VIP_CROWN';
            guest.bubbleTimer = 4;
            guest.stateTimer = 0.9;
          } else if (guest.state === 'WALKING_TO_BAR') {
            guest.state = 'ORDERING_DRINK';
            guest.stateTimer = Math.max(0.75, drink.prepTimeSec / metrics.maxBarTier);
            guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
            guest.bubbleTimer = 3.5;
          } else if (guest.state === 'ORDERING_DRINK') {
            const drinkRevenue = Math.round(
              drink.sellPrice * (1 + metrics.tipBonus * 0.5) * (guest.isCelebrity ? 2.5 : 1)
            );
            earnedCashThisFrame += drinkRevenue;
            earnedXpThisFrame += 12;

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

            const danceTiles = items.filter(
              (it) =>
                it.floor === guest.floor &&
                getCatalogItem(it.catalogId)?.category === 'DANCE_TILE'
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
            guest.stateTimer = 0.8;
          } else if (guest.state === 'WALKING_TO_DANCE') {
            guest.state = 'DANCING';
            guest.stateTimer = 5 + Math.random() * 4;
            guest.bubble =
              metrics.lightingCount < 2 && Math.random() < 0.25
                ? 'SPARKLE'
                : Math.random() < 0.45
                ? 'SPARKLE'
                : 'BEER';
            guest.bubbleTimer = 5.5;
          } else if (guest.state === 'DANCING') {
            const seats = items.filter(
              (it) =>
                it.floor === guest.floor && getCatalogItem(it.catalogId)?.category === 'SEATING'
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
              guest.stateTimer = 0.8;
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
              guest.stateTimer = 1.2;
            }
          } else if (guest.state === 'WALKING_TO_SEAT') {
            guest.state = 'RESTING_AT_SEAT';
            guest.stateTimer = 4 + Math.random() * 3;
            guest.bubble = guest.isCelebrity ? 'VIP_CROWN' : 'CHAT';
            guest.bubbleTimer = 3.5;
          } else if (guest.state === 'RESTING_AT_SEAT') {
            const seatTip = Math.round(
              35 * (1 + metrics.tipBonus) * (guest.isCelebrity ? 3 : 1)
            );
            earnedCashThisFrame += seatTip;
            earnedXpThisFrame += 15;

            if (fts.length < 18) {
              fts.push({
                id: `ft_tip_${performance.now()}_${Math.random()}`,
                text: `+$${seatTip} TIP`,
                floor: guest.floor,
                gridX: guest.gridX,
                gridY: guest.gridY,
                color: '#facc15',
                age: 0,
              });
            }

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
              guest.stateTimer = 0.8;
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
              guest.stateTimer = 1.2;
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
            guest.stateTimer = 1.2;
          } else if (guest.state === 'LEAVING') {
            guests.splice(i, 1);
          }
        }
      }

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

        // Smooth 60fps interpolation along A* waypoints for patrolling Waiters / reassigned staff
        if (staff.path.length > 0) {
          const nextWp = staff.path[0];
          const dx = nextWp.x - staff.gridX;
          const dy = nextWp.y - staff.gridY;
          const dist = Math.hypot(dx, dy);
          const speed = 2.65 * dt;
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

        // Role-specific automated tasks when timer completes
        if (staff.taskTimer <= 0) {
          if (staff.role === 'BARTENDER') {
            // Speed up any guest currently ordering a drink on this floor & generate automated flair mix bonus
            const orderingGuests = guests.filter(
              (g) => g.floor === staff.floor && g.state === 'ORDERING_DRINK'
            );
            for (const og of orderingGuests) {
              og.stateTimer = Math.min(og.stateTimer, 0.25);
            }

            const flairTip = Math.round(18 + drink.sellPrice * 0.28);
            earnedCashThisFrame += flairTip;
            earnedXpThisFrame += 6;
            staff.drinksServed += 1;
            staff.actionBubble = '🍸';
            staff.bubbleTimer = 2.2;
            staff.taskState = 'MIXING_DRINK';
            staff.taskTimer = 3.6 + Math.random() * 1.6;
            props.onStaffTaskComplete?.(staff.uid, 'SERVED_DRINK');

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
            // Accelerate outside queue admission & collect VIP security cover charge
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
            staff.taskTimer = 4.2 + Math.random() * 1.5;
            props.onStaffTaskComplete?.(staff.uid, 'CHECKED_IN_GUEST');

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
            // Waiter A* Patrol Cycle: Bar Counter -> Lounge Seat/Table -> Serve Drink Tray -> Return
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
              // Pick up glowing drink tray from bar and A* pathfind to a Lounge Table or Dancing Guest
              staff.carryingDrinkColor = drink.color;
              staff.actionBubble = '🍸';
              staff.bubbleTimer = 2.5;
              staff.taskState = 'WALKING_TO_TABLE';
              const targetSeat =
                floorSeats.length > 0
                  ? floorSeats[Math.floor(Math.random() * floorSeats.length)]
                  : { gridX: staff.postGridX, gridY: staff.postGridY };
              staff.path = findGridPath(
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
              // Deliver tray service & collect table tip!
              const traySale = Math.round(drink.sellPrice * (1.15 + metrics.tipBonus * 0.4));
              earnedCashThisFrame += traySale;
              earnedXpThisFrame += 10;
              staff.drinksServed += 1;
              staff.carryingDrinkColor = null;
              staff.actionBubble = '$$';
              staff.bubbleTimer = 2.0;
              props.onStaffTaskComplete?.(staff.uid, 'SERVED_DRINK');

              if (fts.length < 18) {
                fts.push({
                  id: `ft_waiter_${performance.now()}_${Math.random()}`,
                  text: `+$${traySale} TABLE`,
                  floor: staff.floor,
                  gridX: staff.gridX,
                  gridY: staff.gridY,
                  color: '#f472b6',
                  age: 0,
                });
              }

              // Path back to bar counter to pick up next tray
              const targetBar =
                floorBars.length > 0
                  ? floorBars[0]
                  : { gridX: 2, gridY: 1 };
              staff.taskState = 'RETURNING_TO_BAR';
              staff.path = findGridPath(
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

      if (earnedCashThisFrame > 0 || earnedXpThisFrame > 0) {
        props.onEarnRevenue(earnedCashThisFrame, earnedXpThisFrame);
      }

      spawnAccumulator += dt;
      if (spawnAccumulator >= 0.7) {
        spawnAccumulator = 0;
        if (guests.length < metrics.maxGuests && Math.random() < 0.65) {
          const isCeleb = metrics.totalHype >= 130 && Math.random() < 0.22;
          const namePool = isCeleb ? CELEBRITY_NAMES : GUEST_NAMES;
          const bouncerStaffCount = staffList.filter((s) => s.role === 'BOUNCER').length;
          const queueWait = Math.max(
            0.8,
            4.2 - (bouncers + bouncerStaffCount) * 0.75
          );
          const bubbles: BubbleType[] = ['MUSIC', 'CHAT'];
          guests.push({
            id: `guest_${performance.now()}_${Math.random()}`,
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
            bubbleTimer: 5,
            shirtColor: isCeleb
              ? '#facc15'
              : SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
            hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
            pantsColor: PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)],
            cashSpent: 0,
          });
        }

        const qLen = guests.filter((g) => g.state === 'QUEUEING').length;
        if (qLen !== lastReportedQueueCount) {
          lastReportedQueueCount = qLen;
          props.onQueueCountChange(qLen);
        }
      }
    };

    let cycleReportTimer = 0;

    const renderFrame = (timeMs: number) => {
      const rawDt = (timeMs - lastTimeMs) * 0.001;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      lastTimeMs = timeMs;

      stepSimulation60fps(dt);

      const props = latestPropsRef.current;

      // Advance Day/Night Cycle game time smoothly (1 full 24h cycle every ~75s when not locked to a manual preset)
      if (props.isPlaying && typeof props.dayNightOverrideHour !== 'number') {
        gameHourRef.current = (gameHourRef.current + dt * 0.32) % 24;
      }

      const cycle = computeDayNightCycleState(gameHourRef.current);

      cycleReportTimer += dt;
      if (cycleReportTimer >= 0.65 && props.onCycleTimeReport) {
        cycleReportTimer = 0;
        props.onCycleTimeReport({
          hour: cycle.hour,
          formattedTime: cycle.formattedTime,
          phaseLabel: cycle.phaseLabel,
          nightIntensity: cycle.nightIntensity,
          emissiveMultiplier: cycle.emissiveMultiplier,
        });
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

      // 2. OUTSIDE STREET, PARKING LOT, CARS, STREETLAMPS & VELVET ROPE QUEUE
      drawIllustratedParkingAndStreet(
        ctx,
        originX,
        originY,
        tileW,
        tileH,
        scale,
        t,
        props.parkingState,
        guestsRef.current
      );

      // 3. CLUB CUTAWAY WALLS, EXPOSED BRICKS, STAIRCASE, SCAFFOLDING & BOTTLE SHELVES
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
        stairsHitboxRef
      );

      // 4. PASTEL RAINBOW GLOWING 6x6 DANCE FLOOR GRID (Matching the center disco floor in IMG_1503.jpeg)
      const floorItems = props.placedItems.filter((p) => p.floor === props.activeFloor);
      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category !== 'DANCE_TILE') continue;
        drawIllustratedDanceTile(ctx, item, cat, originX, originY, tileW, tileH, scale, t);
      }

      // 5. GHOSTED PLACEMENT PREVIEW OVERLAY (Furniture OR Staff Stationing)
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

      // 6. PAINTER'S ALGORITHM DEPTH SORT FOR 3D FURNITURE, HIRED STAFF & GUESTS
      const drawables: Array<{ depth: number; draw: () => void }> = [];

      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category === 'DANCE_TILE') continue;
        const fp = getRotatedFootprint(cat, item.rotation);
        const depth = item.gridX + item.gridY + (fp.width + fp.depth) * 0.5;
        drawables.push({
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
              props.activeDrink
            ),
        });
      }

      // DJ NPC with purple headphones behind the DJ booth
      const primaryDj = floorItems.find(
        (i) => getCatalogItem(i.catalogId)?.category === 'DJ_BOOTH'
      );
      if (primaryDj) {
        drawables.push({
          depth: primaryDj.gridX + primaryDj.gridY + 0.35,
          draw: () =>
            drawIllustratedStaff(
              ctx,
              primaryDj.gridX + 0.65,
              primaryDj.gridY - 0.15,
              originX,
              originY,
              tileW,
              tileH,
              scale,
              t,
              'DJ'
            ),
        });
      }

      // Render all Hired Staff Members on the active floor (Bartenders, Bouncers, Waiters)
      const floorStaff = props.staffMembers.filter((s) => s.floor === props.activeFloor);
      for (let i = 0; i < floorStaff.length; i++) {
        const sm = floorStaff[i];
        const depth = sm.gridX + sm.gridY + 0.58;
        drawables.push({
          depth,
          draw: () =>
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
            ),
        });
      }

      // Active Floor Guests
      const allGuests = guestsRef.current;
      for (let i = 0; i < allGuests.length; i++) {
        const guest = allGuests[i];
        if (guest.floor !== props.activeFloor || guest.state === 'QUEUEING') continue;
        const depth = guest.gridX + guest.gridY + 0.6;
        drawables.push({
          depth,
          draw: () =>
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
              t
            ),
        });
      }

      // Foreground Entrance Archway Wall Cutaway (at DOOR_COORD = 2, 9)
      drawables.push({
        depth: DOOR_COORD.x + DOOR_COORD.y + 2.2,
        draw: () => drawEntranceArchwayCutaway(ctx, originX, originY, tileW, tileH, scale),
      });

      drawables.sort((a, b) => a.depth - b.depth);
      for (let i = 0; i < drawables.length; i++) {
        drawables[i].draw();
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

      // 8. INTENSIFIED NEON EMISSIVE GLOW PASS FOR ALL PLACED ITEMS & VOLUMETRIC LASERS
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
        props.activeDrink
      );

      for (const lItem of floorItems) {
        const cat = getCatalogItem(lItem.catalogId);
        if (cat && cat.category === 'LIGHTING' && cat.tier >= 2) {
          drawLightingBeams(ctx, lItem, cat, originX, originY, tileW, tileH, scale, t);
        }
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

  // Unified Cross-Browser & Mobile Touch Pointer Handlers
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
    const { tileW, tileH, originX, originY } = getViewportTransform(
      rect.width,
      rect.height,
      props.cameraZoom
    );
    const iso = screenToIso(sx, sy, originX, originY, tileW, tileH);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      hoveredGridRef.current = iso;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const props = latestPropsRef.current;

    if (dragStateRef.current.isDown && dragStateRef.current.pointerId === e.pointerId) {
      const dx = sx - dragStateRef.current.startX;
      const dy = sy - dragStateRef.current.startY;
      if (Math.hypot(dx, dy) > 9) {
        dragStateRef.current.hasDragged = true;
      }
      if (dragStateRef.current.hasDragged) {
        panOffsetRef.current = {
          x: Math.max(-360, Math.min(360, dragStateRef.current.initialPanX + dx)),
          y: Math.max(-260, Math.min(260, dragStateRef.current.initialPanY + dy)),
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

    const wasDragged = dragStateRef.current.hasDragged;
    dragStateRef.current.isDown = false;
    dragStateRef.current.pointerId = null;

    if (wasDragged) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const props = latestPropsRef.current;

    const hb = stairsHitboxRef.current;
    if (sx >= hb.x && sx <= hb.x + hb.w && sy >= hb.y && sy <= hb.y + hb.h) {
      props.onClickBuyFloor2();
      return;
    }

    const { tileW, tileH, originX, originY } = getViewportTransform(
      rect.width,
      rect.height,
      props.cameraZoom
    );
    const iso = screenToIso(sx, sy, originX, originY, tileW, tileH);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      hoveredGridRef.current = iso;
      props.onClickGrid(iso);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
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
 * Draws the exact cyberpunk city skyline behind the nightclub with glowing cyan/magenta billboards,
 * dancing silhouette sign, smiley icon, and singer billboard on the right (matching IMG_1503.jpeg).
 */
function drawIllustratedCitySkyline(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  scale: number,
  t: number
) {
  const buildings = [
    // Far left cyan-striped skyscraper
    { dx: -440, dy: -210, w: 72, h: 310, color: '#1b1638', roofSpire: true, stripeColor: '#22d3ee' },
    // Left building with large magenta/cyan dancing girl neon billboard
    { dx: -355, dy: -195, w: 82, h: 290, color: '#221842', billboard: 'DANCER' },
    // Mid-left building with green smiley & vertical pink neon script
    { dx: -265, dy: -225, w: 68, h: 270, color: '#2a1d4e', billboard: 'SMILEY_VERTICAL' },
    // Inner-left building with cyan "PARTY" sign & pink rooftop sign
    { dx: -188, dy: -210, w: 78, h: 240, color: '#231742', billboard: 'PARTY' },
    // Right skyscraper with blue grid windows
    { dx: 185, dy: -230, w: 88, h: 290, color: '#211940', windowGrid: true },
    // Far-right building with huge Singer Billboard & Equalizer Heartbeat billboard
    { dx: 280, dy: -195, w: 135, h: 310, color: '#2a1c4d', billboard: 'SINGER_AND_WAVE' },
  ];

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const bx = originX + b.dx * scale;
    const by = originY + b.dy * scale;
    const bw = b.w * scale;
    const bh = b.h * scale;

    // Building body with ink outline
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(bx, by, bw, bh);

    if (b.roofSpire) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      for (let s = 1; s <= 3; s++) {
        ctx.beginPath();
        ctx.moveTo(bx + s * 18 * scale, by + 20 * scale);
        ctx.lineTo(bx + s * 18 * scale, by + bh - 40 * scale);
        ctx.stroke();
      }
    }

    if (b.windowGrid) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      for (let wy = by + 18 * scale; wy < by + bh - 40 * scale; wy += 16 * scale) {
        for (let wx = bx + 10 * scale; wx < bx + bw - 14 * scale; wx += 15 * scale) {
          ctx.fillRect(wx, wy, 9 * scale, 10 * scale);
        }
      }
    }

    if (b.billboard === 'DANCER') {
      // Glowing cyan/magenta vertical billboard with neon silhouette
      const sx = bx + 10 * scale;
      const sy = by + 55 * scale;
      const sw = bw - 20 * scale;
      const sh = 115 * scale;
      fillStrokeRoundedRect(ctx, sx, sy, sw, sh, 6 * scale, '#190e38', '#22d3ee', 2.5 * scale);
      // Neon magenta dancer silhouette wave
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.arc(sx + sw * 0.5, sy + sh * 0.32, 9 * scale, 0, Math.PI * 2);
      ctx.moveTo(sx + sw * 0.35, sy + sh * 0.75);
      ctx.quadraticCurveTo(sx + sw * 0.5, sy + sh * 0.45, sx + sw * 0.68, sy + sh * 0.75);
      ctx.stroke();
    }

    if (b.billboard === 'SMILEY_VERTICAL') {
      // Green neon smiley top + magenta vertical neon pill
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + 28 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.stroke();

      fillStrokeRoundedRect(
        ctx,
        bx + 16 * scale,
        by + 50 * scale,
        bw - 32 * scale,
        92 * scale,
        10 * scale,
        '#3b0764',
        '#f472b6',
        2.5 * scale
      );
      ctx.fillStyle = '#fbcfe8';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(bx + bw / 2, by + (66 + k * 18) * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (b.billboard === 'PARTY') {
      // Pink rooftop billboard
      fillStrokeRoundedRect(
        ctx,
        bx + 14 * scale,
        by - 28 * scale,
        52 * scale,
        28 * scale,
        4 * scale,
        '#4a044e',
        '#f472b6',
        2 * scale
      );
      // Cyan "PARTY" banner
      fillStrokeRoundedRect(
        ctx,
        bx + 8 * scale,
        by + 88 * scale,
        bw - 16 * scale,
        32 * scale,
        5 * scale,
        '#083344',
        '#22d3ee',
        2.2 * scale
      );
      ctx.fillStyle = '#67e8f9';
      ctx.font = `800 ${Math.max(8, Math.round(11 * scale))}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('PARTY', bx + bw / 2, by + 108 * scale);
    }

    if (b.billboard === 'SINGER_AND_WAVE') {
      // Top Singer Neon Billboard (matching top-right of IMG_1503.jpeg)
      const sx = bx + 12 * scale;
      const sy = by + 35 * scale;
      const sw = bw - 24 * scale;
      const sh = 72 * scale;
      fillStrokeRoundedRect(ctx, sx, sy, sw, sh, 6 * scale, '#2e1065', '#e879f9', 2.5 * scale);
      // Singer portrait silhouette
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(sx + 28 * scale, sy + 28 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx + 16 * scale, sy + 42 * scale, 24 * scale, 22 * scale);
      // Neon text lines on billboard
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx + 52 * scale, sy + 22 * scale, 44 * scale, 6 * scale);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(sx + 52 * scale, sy + 36 * scale, 34 * scale, 5 * scale);

      // Lower Heartbeat / Audio Waveform Neon Billboard
      const wx = bx + 16 * scale;
      const wy = by + 125 * scale;
      const ww = bw - 32 * scale;
      const wh = 54 * scale;
      fillStrokeRoundedRect(ctx, wx, wy, ww, wh, 6 * scale, '#0f172a', '#22d3ee', 2.2 * scale);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.moveTo(wx + 8 * scale, wy + wh / 2);
      for (let p = 1; p <= 7; p++) {
        const px = wx + (p / 8) * ww;
        const amp = (p % 2 === 0 ? -14 : 14) * Math.sin(t * 4 + p) * scale;
        ctx.lineTo(px, wy + wh / 2 + amp);
      }
      ctx.lineTo(wx + ww - 8 * scale, wy + wh / 2);
      ctx.stroke();
    }
  }
}

/**
 * Draws the outside asphalt parking lot with white diagonal parking lines, rounded teal & dark sedans,
 * tall curved streetlights casting warm golden light cones, sidewalk curb, and velvet rope queue.
 */
function drawIllustratedParkingAndStreet(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  parkingState: ParkingUpgradeState,
  guests: GuestAgent[]
) {
  // Dark Slate/Indigo Asphalt Base on Left & Bottom
  const lotPoly = [
    { gx: -7, gy: 1 },
    { gx: 0, gy: 1 },
    { gx: 0, gy: 10 },
    { gx: 11, gy: 10 },
    { gx: 11, gy: 15 },
    { gx: -7, gy: 15 },
  ];
  ctx.beginPath();
  lotPoly.forEach((pt, idx) => {
    const sx = originX + (pt.gx - pt.gy) * (tileW / 2);
    const sy = originY + (pt.gx + pt.gy) * (tileH / 2);
    if (idx === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fillStyle = '#221d38';
  ctx.fill();

  // Sidewalk pavement along the club's front-left wall (gx = -1.5..0, gy = 1..10.5) & front-right wall
  for (let gy = 1; gy < GRID_SIZE + 1; gy++) {
    drawIsoTilePolygon(
      ctx,
      -1,
      gy,
      0,
      originX,
      originY,
      tileW,
      tileH,
      '#352d54',
      '#231c3d',
      1.2
    );
  }
  for (let gx = -1; gx < GRID_SIZE + 1; gx++) {
    drawIsoTilePolygon(
      ctx,
      gx,
      GRID_SIZE,
      0,
      originX,
      originY,
      tileW,
      tileH,
      '#352d54',
      '#231c3d',
      1.2
    );
  }

  // Diagonal White Parking Space Lines on Left Lot
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
  ctx.lineWidth = 2 * scale;
  for (let row = 3; row <= 11; row += 2) {
    const p1x = originX + (-2.2 - row) * (tileW / 2);
    const p1y = originY + (-2.2 + row) * (tileH / 2);
    const p2x = originX + (-4.5 - row) * (tileW / 2);
    const p2y = originY + (-4.5 + row) * (tileH / 2);
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
  }

  // Illustrated Isometric Rounded Cars (Teal Hatchback & Dark Navy Coupe from IMG_1503.jpeg)
  drawIllustratedSedan(ctx, -3.5, 5.5, originX, originY, tileW, tileH, scale, '#2dd4bf', '#0f766e');
  drawIllustratedSedan(ctx, -2.5, 8.6, originX, originY, tileW, tileH, scale, '#334155', '#1e293b');
  if (parkingState.lotTier >= 2) {
    drawIllustratedSedan(ctx, -3.6, 3.2, originX, originY, tileW, tileH, scale, '#f43f5e', '#9f1239');
  }
  if (parkingState.lotTier >= 3) {
    drawIllustratedSedan(ctx, -1.5, 11.2, originX, originY, tileW, tileH, scale, '#facc15', '#a16207');
  }

  // Velvet Rope Stanchions along sidewalk queue leading to Front Door
  const ropeColor =
    parkingState.ropeTier === 3
      ? '#facc15'
      : parkingState.ropeTier === 2
      ? '#f43f5e'
      : '#c026d3';

  const stanchions = [
    { gx: -0.3, gy: 6.2 },
    { gx: -0.3, gy: 7.7 },
    { gx: -0.3, gy: 9.2 },
  ];
  for (let i = 0; i < stanchions.length; i++) {
    const st = stanchions[i];
    const px = originX + (st.gx - st.gy) * (tileW / 2);
    const py = originY + (st.gx + st.gy) * (tileH / 2);

    // Gold/Chrome Base & Pole
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(px, py, 4.5 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - 19 * scale);
    ctx.stroke();

    if (i < stanchions.length - 1) {
      const next = stanchions[i + 1];
      const nx = originX + (next.gx - next.gy) * (tileW / 2);
      const ny = originY + (next.gx + next.gy) * (tileH / 2);
      ctx.strokeStyle = ropeColor;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py - 15 * scale);
      ctx.quadraticCurveTo((px + nx) / 2, (py + ny) / 2 - 6 * scale, nx, ny - 15 * scale);
      ctx.stroke();
    }
  }

  // Queueing Guests standing along the sidewalk (left wall exterior, matching IMG_1503.jpeg)
  const queueGuests = guests.filter((g) => g.state === 'QUEUEING');
  queueGuests.forEach((qg, idx) => {
    const qx = -0.75;
    const qy = 8.9 - idx * 0.95;
    drawIllustratedCharacter(ctx, qg, qx, qy, originX, originY, tileW, tileH, scale, t);
  });

  // Curved Streetlamps with volumetric warm yellow light cones (Matching left side of IMG_1503.jpeg)
  const lamps = [
    { gx: -1.4, gy: 4.5 },
    { gx: -1.4, gy: 7.2 },
    { gx: -1.4, gy: 10.0 },
    { gx: 0.4, gy: 11.4 },
  ];
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i];
    const lx = originX + (l.gx - l.gy) * (tileW / 2);
    const ly = originY + (l.gx + l.gy) * (tileH / 2);

    // Pole
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly - 54 * scale);
    ctx.quadraticCurveTo(lx, ly - 62 * scale, lx - 12 * scale, ly - 60 * scale);
    ctx.stroke();

    // Lamp Hood
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(lx - 13 * scale, ly - 60 * scale, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warm Golden Cone of Light
    ctx.save();
    const coneGrad = ctx.createLinearGradient(
      lx - 13 * scale,
      ly - 60 * scale,
      lx - 13 * scale,
      ly - 5 * scale
    );
    coneGrad.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
    coneGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(lx - 13 * scale, ly - 60 * scale);
    ctx.lineTo(lx - 38 * scale, ly - 4 * scale);
    ctx.lineTo(lx + 12 * scale, ly - 4 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawIllustratedSedan(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  bodyColor: string,
  shadeColor: string
) {
  const cx = originX + (gx - gy) * (tileW / 2);
  const cy = originY + (gx + gy) * (tileH / 2);

  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3 * scale, 32 * scale, 15 * scale, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Lower Car Body (Rounded cartoon chassis with bold ink border)
  fillStrokeRoundedRect(
    ctx,
    cx - 28 * scale,
    cy - 14 * scale,
    56 * scale,
    22 * scale,
    9 * scale,
    bodyColor,
    INK,
    2 * scale
  );

  // Upper Cabin / Windows
  fillStrokeRoundedRect(
    ctx,
    cx - 17 * scale,
    cy - 25 * scale,
    34 * scale,
    14 * scale,
    7 * scale,
    shadeColor,
    INK,
    1.8 * scale
  );

  // Windshield & Side Glass
  fillStrokeRoundedRect(
    ctx,
    cx - 13 * scale,
    cy - 23 * scale,
    13 * scale,
    10 * scale,
    3 * scale,
    '#38bdf8',
    INK,
    1.2 * scale
  );
  fillStrokeRoundedRect(
    ctx,
    cx + 2 * scale,
    cy - 23 * scale,
    11 * scale,
    10 * scale,
    3 * scale,
    '#0284c7',
    INK,
    1.2 * scale
  );

  // Wheels
  const wheels = [
    { wx: cx - 15 * scale, wy: cy + 7 * scale },
    { wx: cx + 14 * scale, wy: cy + 5 * scale },
  ];
  for (const w of wheels) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(w.wx, w.wy, 6.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(w.wx, w.wy, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing Yellow Headlights
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(cx - 25 * scale, cy - 3 * scale, 2.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the cutaway nightclub walls with grey stone top caps, exposed red-brown brick cracks,
 * draped warm string lights, 3-tier backbar bottle shelf, staircase with padlock, wooden scaffolding,
 * yellow/black hazard barrier, and glowing "BUY FLOOR 2" + "LOCKED - LEVEL 20" neon signs.
 */
function drawIllustratedClubShell(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  activeFloor: 1 | 2,
  unlockedFloors: 1 | 2,
  playerLevel: number,
  stairsHitboxRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }>
) {
  const wallH = 112 * scale;
  const wallThickness = 9 * scale;

  // 1. Interior 10x10 Purple-Slate Club Floor
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const isAlt = (gx + gy) % 2 === 0;
      const fill =
        activeFloor === 2
          ? isAlt
            ? '#332554'
            : '#2c1f4a'
          : isAlt
          ? '#463b5c'
          : '#3f3554';
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
        'rgba(21, 13, 42, 0.35)',
        1
      );
    }
  }

  const nw = { x: originX, y: originY };
  const sw = {
    x: originX - GRID_SIZE * (tileW / 2),
    y: originY + GRID_SIZE * (tileH / 2),
  };
  const se = {
    x: originX + GRID_SIZE * (tileW / 2),
    y: originY + GRID_SIZE * (tileH / 2),
  };

  // 2. LEFT BACK WALL (gy = 0..10 along gx = 0)
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.lineTo(sw.x, sw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  ctx.fillStyle = activeFloor === 2 ? '#3b2763' : '#53415e';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * scale;
  ctx.stroke();

  // Left Wall Thick Stone Top Cap
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y - wallH);
  ctx.lineTo(sw.x, sw.y - wallH);
  ctx.lineTo(sw.x - wallThickness, sw.y - wallH - wallThickness * 0.5);
  ctx.lineTo(nw.x, nw.y - wallH - wallThickness);
  ctx.closePath();
  ctx.fillStyle = '#645375';
  ctx.fill();
  ctx.stroke();

  // 3. RIGHT BACK WALL (gx = 0..10 along gy = 0)
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  ctx.fillStyle = activeFloor === 2 ? '#2e1d52' : '#463652';
  ctx.fill();
  ctx.stroke();

  // Right Wall Thick Stone Top Cap
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y - wallH);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.lineTo(se.x + wallThickness, se.y - wallH - wallThickness * 0.5);
  ctx.lineTo(nw.x, nw.y - wallH - wallThickness);
  ctx.closePath();
  ctx.fillStyle = '#5a4a6b';
  ctx.fill();
  ctx.stroke();

  // 4. EXPOSED CRACKED BRICK PATCHES ON WALLS (Matching Dive Aesthetic in IMG_1503.jpeg)
  drawExposedBrickPatch(ctx, sw.x + 28 * scale, sw.y - 68 * scale, scale, false);
  drawExposedBrickPatch(ctx, nw.x - 24 * scale, nw.y - 96 * scale, scale, true);
  drawExposedBrickPatch(ctx, se.x - 95 * scale, se.y - 65 * scale, scale, false);

  // 5. 3-TIER WOODEN BACKBAR BOTTLE SHELVING ON LEFT WALL (With colorful liquor bottles)
  drawBackbarBottleShelves(ctx, originX, originY, tileW, tileH, scale);

  // 6. DRAPED WARM EDISON STRING LIGHTS ON BOTH WALLS
  drawWallStringLights(
    ctx,
    sw.x + 15 * scale,
    sw.y - wallH + 22 * scale,
    nw.x - 25 * scale,
    nw.y - wallH + 18 * scale,
    scale,
    t
  );
  drawWallStringLights(
    ctx,
    nw.x + 155 * scale,
    nw.y - wallH + 85 * scale,
    se.x - 12 * scale,
    se.y - wallH + 22 * scale,
    scale,
    t
  );

  // 7. BACK-CORNER STAIRCASE, PADLOCK, SCAFFOLDING, HAZARD STRIPE & NEON SIGNS (Matching top-center of IMG_1503.jpeg)
  const stairBaseX = originX + 1.8 * (tileW / 2);
  const stairBaseY = originY + 1.8 * (tileH / 2);

  // Stone Stair Steps ascending right-to-left
  for (let s = 0; s < 7; s++) {
    const stepX = stairBaseX + (36 - s * 7) * scale;
    const stepY = stairBaseY - (26 + s * 11) * scale;
    fillStrokeRoundedRect(
      ctx,
      stepX,
      stepY,
      44 * scale,
      11 * scale,
      2 * scale,
      s % 2 === 0 ? '#524763' : '#3f364e',
      INK,
      1.5 * scale
    );
  }

  // Padlock Icon on Staircase when Floor 2 is locked
  if (unlockedFloors === 1) {
    const lockX = stairBaseX + 20 * scale;
    const lockY = stairBaseY - 62 * scale;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(lockX, lockY - 6 * scale, 5 * scale, Math.PI, 0);
    ctx.stroke();
    fillStrokeRoundedRect(
      ctx,
      lockX - 7 * scale,
      lockY - 6 * scale,
      14 * scale,
      12 * scale,
      3 * scale,
      '#64748b',
      INK,
      1.5 * scale
    );
  }

  // Wooden Construction Scaffolding behind DJ booth (Top Right)
  const scaffX = stairBaseX + 76 * scale;
  const scaffY = stairBaseY - 98 * scale;
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(scaffX, scaffY, 54 * scale, 65 * scale);
  ctx.beginPath();
  ctx.moveTo(scaffX, scaffY);
  ctx.lineTo(scaffX + 54 * scale, scaffY + 65 * scale);
  ctx.moveTo(scaffX + 54 * scale, scaffY);
  ctx.lineTo(scaffX, scaffY + 65 * scale);
  ctx.stroke();

  // Yellow & Black Hazard Construction Barrier below "BUY FLOOR 2"
  const barX = stairBaseX + 32 * scale;
  const barY = stairBaseY - 30 * scale;
  fillStrokeRoundedRect(
    ctx,
    barX,
    barY,
    62 * scale,
    18 * scale,
    3 * scale,
    '#d97706',
    INK,
    1.8 * scale
  );
  ctx.fillStyle = '#1e1b4b';
  for (let k = 0; k < 4; k++) {
    ctx.fillRect(barX + (6 + k * 15) * scale, barY + 2 * scale, 7 * scale, 14 * scale);
  }

  // Glowing Cyan "BUY FLOOR 2" Sign + Pink "LOCKED - LEVEL 20" Neon Sign
  const signBox = {
    x: stairBaseX + 26 * scale,
    y: stairBaseY - 66 * scale,
    w: 155 * scale,
    h: 56 * scale,
  };
  stairsHitboxRef.current = signBox;

  // Cyan "BUY FLOOR 2" Box
  fillStrokeRoundedRect(
    ctx,
    signBox.x,
    signBox.y,
    74 * scale,
    26 * scale,
    5 * scale,
    'rgba(8, 51, 68, 0.92)',
    '#22d3ee',
    2.2 * scale
  );
  ctx.fillStyle = '#67e8f9';
  ctx.font = `800 ${Math.max(8, Math.round(10 * scale))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    unlockedFloors === 1 ? 'BUY FLOOR 2' : `FLOOR ${activeFloor === 1 ? '2 ▲' : '1 ▼'}`,
    signBox.x + 37 * scale,
    signBox.y + 16 * scale
  );

  // Pink/Cyan "LOCKED - LEVEL 20" Box right next to it
  fillStrokeRoundedRect(
    ctx,
    signBox.x + 80 * scale,
    signBox.y + 8 * scale,
    76 * scale,
    38 * scale,
    6 * scale,
    'rgba(59, 7, 100, 0.92)',
    unlockedFloors === 2 ? '#4ade80' : '#f472b6',
    2.2 * scale
  );
  ctx.fillStyle = unlockedFloors === 2 ? '#4ade80' : '#f472b6';
  ctx.font = `800 ${Math.max(8, Math.round(10.5 * scale))}px "Outfit", sans-serif`;
  ctx.fillText(
    unlockedFloors === 2 ? 'VIP OPEN' : 'LOCKED',
    signBox.x + 118 * scale,
    signBox.y + 24 * scale
  );
  ctx.fillStyle = '#22d3ee';
  ctx.font = `700 ${Math.max(7, Math.round(8.5 * scale))}px "JetBrains Mono", monospace`;
  ctx.fillText(
    unlockedFloors === 2 ? 'TAP TO SWITCH' : '- LEVEL 20',
    signBox.x + 118 * scale,
    signBox.y + 38 * scale
  );
}

function drawExposedBrickPatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  tall: boolean
) {
  ctx.save();
  const rows = tall ? 6 : 3;
  const cols = tall ? 3 : 4;
  const bw = 13 * scale;
  const bh = 6.5 * scale;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = x + (c * bw + (r % 2 === 1 ? bw * 0.5 : 0));
      const by = y + r * bh;
      fillStrokeRoundedRect(
        ctx,
        bx,
        by,
        bw - 1.5 * scale,
        bh - 1.5 * scale,
        1.5 * scale,
        (r + c) % 2 === 0 ? '#7c3f38' : '#63312c',
        INK,
        1 * scale
      );
    }
  }
  ctx.restore();
}

/**
 * Draws the 3-tier wooden liquor shelving unit mounted on the left brick wall behind the bartender,
 * stocked with colorful glowing bottles (matching IMG_1503.jpeg).
 */
function drawBackbarBottleShelves(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
) {
  // Mounted along gx = 0.15, gy = 1.2..5.2
  const pStart = {
    x: originX + (0.15 - 1.2) * (tileW / 2),
    y: originY + (0.15 + 1.2) * (tileH / 2),
  };
  const pEnd = {
    x: originX + (0.15 - 5.2) * (tileW / 2),
    y: originY + (0.15 + 5.2) * (tileH / 2),
  };

  // Backboard
  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y - 18 * scale);
  ctx.lineTo(pEnd.x, pEnd.y - 18 * scale);
  ctx.lineTo(pEnd.x, pEnd.y - 74 * scale);
  ctx.lineTo(pStart.x, pStart.y - 74 * scale);
  ctx.closePath();
  ctx.fillStyle = '#4a2c1d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  const bottleColors = ['#38bdf8', '#f43f5e', '#4ade80', '#facc15', '#c084fc', '#fb923c'];

  // 3 Shelves + Tiny Bottles
  for (let tier = 0; tier < 3; tier++) {
    const zOffset = (24 + tier * 17) * scale;
    ctx.strokeStyle = '#78482f';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y - zOffset);
    ctx.lineTo(pEnd.x, pEnd.y - zOffset);
    ctx.stroke();

    const numBottles = 10;
    for (let b = 1; b < numBottles; b++) {
      const u = b / numBottles;
      const bx = pStart.x + (pEnd.x - pStart.x) * u;
      const by = pStart.y + (pEnd.y - pStart.y) * u - zOffset;
      const bColor = bottleColors[(b + tier * 2) % bottleColors.length];

      fillStrokeRoundedRect(
        ctx,
        bx - 2.2 * scale,
        by - 10 * scale,
        4.4 * scale,
        9 * scale,
        1.5 * scale,
        bColor,
        INK,
        1 * scale
      );
      // Bottle neck
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 1 * scale, by - 13 * scale, 2 * scale, 3 * scale);
    }
  }
}

/**
 * Draws the front-left entrance cutaway archway wall segment that guests walk through.
 */
function drawEntranceArchwayCutaway(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
) {
  const gx = 0;
  const gy = 8.4;
  const p1 = {
    x: originX + (gx - gy) * (tileW / 2),
    y: originY + (gx + gy) * (tileH / 2),
  };
  const p2 = {
    x: originX + (gx - (gy + 1.6)) * (tileW / 2),
    y: originY + (gx + (gy + 1.6)) * (tileH / 2),
  };
  const h = 64 * scale;

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p2.x, p2.y - h);
  ctx.lineTo(p1.x, p1.y - h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(71, 56, 89, 0.88)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * scale;
  ctx.stroke();
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
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 22 * scale, x2, y2);
  ctx.stroke();

  const bulbs = 11;
  for (let i = 1; i < bulbs; i++) {
    const u = i / bulbs;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * ((x1 + x2) / 2) + u * u * x2;
    const by =
      (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * ((y1 + y2) / 2 + 22 * scale) + u * u * y2;
    const twinkle = 0.72 + 0.28 * Math.sin(t * 4.5 + i * 1.4);

    // Warm outer halo
    ctx.fillStyle = `rgba(251, 191, 36, ${twinkle * 0.38})`;
    ctx.beginPath();
    ctx.arc(bx, by, 6.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Bulb core
    ctx.fillStyle = `rgba(254, 240, 138, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(bx, by, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws the glowing 6x6 sub-tile pastel rainbow disco floor (every 1x1 logical dance tile renders a 2x2
 * illuminated neon sub-grid so a 3x3 dance floor displays the exact 6x6 glowing pastel grid from IMG_1503.jpeg).
 */
function drawIllustratedDanceTile(
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
  const fp = getRotatedFootprint(cat, item.rotation);
  const pastelColors = [
    '#67e8f9', // glowing cyan
    '#f472b6', // neon pink
    '#fde047', // warm yellow
    '#86efac', // mint green
    '#c084fc', // lavender purple
    '#fda4af', // coral rose
    '#38bdf8', // sky blue
  ];

  // Subdivide each 1x1 grid cell into 2x2 glowing sub-squares (3x3 tiles = 6x6 illuminated squares!)
  const subDiv = 2;
  const subStep = 1 / subDiv;

  for (let dx = 0; dx < fp.width; dx += subStep) {
    for (let dy = 0; dy < fp.depth; dy += subStep) {
      const gx = item.gridX + dx;
      const gy = item.gridY + dy;

      const hash = Math.floor(gx * 4.3 + gy * 6.1 + t * 1.8);
      const baseColor = pastelColors[Math.abs(hash) % pastelColors.length];

      const halfW = tileW / 2;
      const halfH = tileH / 2;
      const p0x = originX + (gx - gy) * halfW;
      const p0y = originY + (gx + gy) * halfH - 1.5 * scale;
      const p1x = originX + (gx + subStep - gy) * halfW;
      const p1y = originY + (gx + subStep + gy) * halfH - 1.5 * scale;
      const p2x = originX + (gx - gy) * halfW;
      const p2y = originY + (gx + subStep + (gy + subStep)) * halfH - 1.5 * scale;
      const p3x = originX + (gx - (gy + subStep)) * halfW;
      const p3y = originY + (gx + (gy + subStep)) * halfH - 1.5 * scale;

      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();

      ctx.fillStyle = baseColor;
      ctx.fill();
      ctx.strokeStyle = '#312e81';
      ctx.lineWidth = 1.4 * scale;
      ctx.stroke();

      // Inner bright center glow highlight
      const cx = p0x;
      const cy = (p0y + p2y) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, tileW * 0.12, tileH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draws detailed 2.5D illustrated furniture:
 * - Bar Units with wooden paneling, bar stools in front, beer tap/register, and glowing drinks
 * - DJ Booth on a dark concrete stage platform with purple neon front symbol and dual spinning turntables
 * - Patched brown leather couches, low grey coffee tables, round wooden bistro tables & chairs, and purple corner VIP booth
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
  activeDrink: DrinkMix
) {
  if (cat.category === 'BAR_UNIT') {
    const h = (cat.tier === 3 ? 27 : 23) * scale;
    const topColor = cat.tier === 1 ? '#8c583a' : cat.accentColor;
    const sideColor = cat.tier === 1 ? '#5c3824' : cat.primaryColor;

    // Main bar counter
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      fp.width,
      fp.depth,
      0,
      h,
      originX,
      originY,
      tileW,
      tileH,
      topColor,
      sideColor,
      '#3d2417',
      INK,
      1.8 * scale
    );

    // Round wooden bar stools arranged along the front edge of the bar (Matching IMG_1503.jpeg)
    const numStools = Math.max(2, Math.max(fp.width, fp.depth));
    for (let s = 0; s < numStools; s++) {
      const sxGrid =
        fp.depth > fp.width ? item.gridX + fp.width + 0.35 : item.gridX + s + 0.5;
      const syGrid =
        fp.depth > fp.width ? item.gridY + s + 0.5 : item.gridY + fp.depth + 0.35;
      drawBarStool(ctx, sxGrid, syGrid, originX, originY, tileW, tileH, scale);
    }

    // Drinks & purple six-pack carrier on top of counter
    const cx = originX + (item.gridX + fp.width * 0.5 - (item.gridY + fp.depth * 0.5)) * (tileW / 2);
    const cy =
      originY + (item.gridX + fp.width * 0.5 + (item.gridY + fp.depth * 0.5)) * (tileH / 2) - h;
    fillStrokeRoundedRect(
      ctx,
      cx - 6 * scale,
      cy - 7 * scale,
      12 * scale,
      7 * scale,
      2 * scale,
      '#a855f7',
      INK,
      1.2 * scale
    );
    ctx.fillStyle = activeDrink.color;
    ctx.beginPath();
    ctx.arc(cx + 14 * scale, cy - 3 * scale, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (cat.category === 'DJ_BOOTH') {
    // Raised Dark Concrete Stage Riser (3x1.5 look) with scuffed cracks
    drawIsoPrism(
      ctx,
      item.gridX - 0.3,
      item.gridY,
      fp.width + 0.8,
      fp.depth + 0.4,
      0,
      12 * scale,
      originX,
      originY,
      tileW,
      tileH,
      '#3b3554',
      '#28233b',
      '#1e1a2e',
      INK,
      1.8 * scale
    );

    // Blue-Purple DJ Console Box on top of Stage Riser
    drawIsoPrism(
      ctx,
      item.gridX + 0.1,
      item.gridY + 0.15,
      fp.width * 0.78,
      fp.depth * 0.75,
      12 * scale,
      17 * scale,
      originX,
      originY,
      tileW,
      tileH,
      '#4f46e5',
      '#312e81',
      '#1e1b4b',
      INK,
      1.8 * scale
    );

    // Glowing Magenta Neon Waveform Emblem on front of DJ Booth (Matching IMG_1503.jpeg)
    const frontX =
      originX + (item.gridX + 0.75 - (item.gridY + 0.85)) * (tileW / 2);
    const frontY =
      originY + (item.gridX + 0.75 + (item.gridY + 0.85)) * (tileH / 2) - 19 * scale;
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(frontX - 9 * scale, frontY - 2 * scale);
    ctx.lineTo(frontX - 3 * scale, frontY - 8 * scale);
    ctx.lineTo(frontX + 3 * scale, frontY + 2 * scale);
    ctx.lineTo(frontX + 9 * scale, frontY - 5 * scale);
    ctx.stroke();

    // Dual Spinning Vinyl Turntables on top of DJ Console
    const deckX = originX + (item.gridX + 0.65 - (item.gridY + 0.45)) * (tileW / 2);
    const deckY =
      originY + (item.gridX + 0.65 + (item.gridY + 0.45)) * (tileH / 2) - 31 * scale;
    for (const offset of [-9, 9]) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(
        deckX + offset * scale,
        deckY + (offset > 0 ? 4 : 0) * scale,
        6.5 * scale,
        3.8 * scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4 * scale;
      ctx.stroke();
    }
  } else if (cat.category === 'SEATING') {
    if (cat.id === 'seat_bistro') {
      // Round Wooden Bistro Table + 2 Wooden Chairs (Right lounge area in IMG_1503.jpeg)
      const tx = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (tileW / 2);
      const ty = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (tileH / 2);

      // Table Pedestal
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty - 14 * scale);
      ctx.stroke();

      // Round Wood Tabletop
      ctx.fillStyle = '#78482f';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 15 * scale, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();

      // Side Wooden Chair
      drawWoodenChair(ctx, tx + 16 * scale, ty - 4 * scale, scale);
    } else if (cat.id === 'seat_worn_couch') {
      // Worn Patched Couch with Torn Cushion Details + Low Coffee Table
      const isLeftWall = item.gridX === 0;
      const mainColor = isLeftWall ? '#64586e' : '#735742';
      const darkColor = isLeftWall ? '#493f52' : '#543e2e';

      drawIsoPrism(
        ctx,
        item.gridX,
        item.gridY,
        fp.width,
        fp.depth,
        0,
        11 * scale,
        originX,
        originY,
        tileW,
        tileH,
        mainColor,
        darkColor,
        '#2e231c',
        INK,
        1.6 * scale
      );
      // Backrest
      drawIsoPrism(
        ctx,
        item.gridX,
        item.gridY,
        fp.width > fp.depth ? fp.width : 0.35,
        fp.depth > fp.width ? fp.depth : 0.35,
        11 * scale,
        11 * scale,
        originX,
        originY,
        tileW,
        tileH,
        mainColor,
        darkColor,
        '#2e231c',
        INK,
        1.6 * scale
      );
      // Torn Fabric Patch Detail
      const px = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (tileW / 2);
      const py = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (tileH / 2) - 13 * scale;
      ctx.fillStyle = '#291d18';
      ctx.fillRect(px - 4 * scale, py - 2 * scale, 7 * scale, 4 * scale);
    } else {
      // Plush Purple/Magenta Corner VIP Lounge Booth with Round Drink Table (Bottom-corner of IMG_1503.jpeg)
      drawIsoPrism(
        ctx,
        item.gridX,
        item.gridY,
        fp.width,
        fp.depth,
        0,
        14 * scale,
        originX,
        originY,
        tileW,
        tileH,
        '#7e22ce',
        '#581c87',
        '#3b0764',
        INK,
        1.8 * scale
      );
      drawIsoPrism(
        ctx,
        item.gridX,
        item.gridY,
        fp.width,
        0.4,
        14 * scale,
        11 * scale,
        originX,
        originY,
        tileW,
        tileH,
        '#a855f7',
        '#6b21a8',
        '#4c1d95',
        INK,
        1.8 * scale
      );
      // Center table in booth
      const bx = originX + (item.gridX + 1 - (item.gridY + 1)) * (tileW / 2);
      const by = originY + (item.gridX + 1 + (item.gridY + 1)) * (tileH / 2) - 16 * scale;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(bx, by, 10 * scale, 5.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  } else if (cat.category === 'LIGHTING') {
    drawIsoPrism(
      ctx,
      item.gridX + 0.3,
      item.gridY + 0.3,
      0.4,
      0.4,
      0,
      44 * scale,
      originX,
      originY,
      tileW,
      tileH,
      cat.accentColor,
      '#334155',
      '#1e293b',
      INK,
      1.5 * scale
    );
    const orbX = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (tileW / 2);
    const orbY =
      originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (tileH / 2) - 50 * scale;
    ctx.fillStyle = cat.accentColor;
    ctx.beginPath();
    ctx.arc(orbX, orbY, (6 + Math.sin(t * 5) * 1.4) * scale, 0, Math.PI * 2);
    ctx.fill();
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

  // Metal Base & Stem
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 5.5 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 11 * scale);
  ctx.stroke();

  // Round Wooden Cushion Top
  ctx.fillStyle = '#78482f';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 12 * scale, 6 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();
}

function drawWoodenChair(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 4 * scale, y);
  ctx.lineTo(x - 4 * scale, y - 9 * scale);
  ctx.moveTo(x + 4 * scale, y);
  ctx.lineTo(x + 4 * scale, y - 16 * scale);
  ctx.stroke();

  fillStrokeRoundedRect(
    ctx,
    x - 6 * scale,
    y - 11 * scale,
    11 * scale,
    4 * scale,
    1.5 * scale,
    '#78482f',
    INK,
    1.2 * scale
  );
  fillStrokeRoundedRect(
    ctx,
    x + 1 * scale,
    y - 19 * scale,
    4 * scale,
    8 * scale,
    1.5 * scale,
    '#78482f',
    INK,
    1.2 * scale
  );
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
  const srcX = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (tileW / 2);
  const srcY =
    originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (tileH / 2) - 50 * scale;
  const sweepX = originX + Math.sin(t * 1.9 + item.gridX) * 110 * scale;
  const sweepY = originY + (130 + Math.cos(t * 1.4 + item.gridY) * 45) * scale;

  ctx.save();
  const grad = ctx.createLinearGradient(srcX, srcY, sweepX, sweepY);
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.38)');
  grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(srcX, srcY);
  ctx.lineTo(sweepX - 30 * scale, sweepY);
  ctx.lineTo(sweepX + 30 * scale, sweepY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the expressive cartoon Bartender (ponytail, blue vest) and DJ (purple headphones, leaning over decks).
 */
function drawIllustratedStaff(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number,
  role: 'BARTENDER' | 'DJ'
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2) - 16 * scale;
  const bounce = Math.sin(t * 5) * 1.8 * scale;

  // Torso
  fillStrokeRoundedRect(
    ctx,
    px - 7.5 * scale,
    py - 19 * scale + bounce,
    15 * scale,
    16 * scale,
    4 * scale,
    role === 'DJ' ? '#2563eb' : '#3b82f6',
    INK,
    1.6 * scale
  );

  // Head
  ctx.fillStyle = role === 'DJ' ? '#d97706' : '#fcd34d';
  ctx.beginPath();
  ctx.arc(px, py - 26 * scale + bounce, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.arc(px, py - 28 * scale + bounce, 7.2 * scale, Math.PI, 0);
  ctx.fill();

  // Eyes
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px - 2.2 * scale, py - 25.5 * scale + bounce, 1.1 * scale, 0, Math.PI * 2);
  ctx.arc(px + 2.2 * scale, py - 25.5 * scale + bounce, 1.1 * scale, 0, Math.PI * 2);
  ctx.fill();

  if (role === 'DJ') {
    // Big Purple DJ Headphones
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.8 * scale;
    ctx.beginPath();
    ctx.arc(px, py - 26 * scale + bounce, 8.2 * scale, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(px - 8 * scale, py - 25 * scale + bounce, 3 * scale, 0, Math.PI * 2);
    ctx.arc(px + 8 * scale, py - 25 * scale + bounce, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws an interactive hired Staff Member (Bartender, Bouncer, or Waiter) on the isometric grid
 * with role-specific uniform, cocktail shaker / sunglasses / drink tray, and station ring.
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
  isRelocating: boolean
) {
  const px = originX + (staff.gridX - staff.gridY) * (tileW / 2);
  const py = originY + (staff.gridX + staff.gridY) * (tileH / 2);
  const isWalking = staff.path.length > 0;
  const bounce =
    (isWalking
      ? Math.abs(Math.sin(t * 9 + staff.gridX * 3)) * 3.5
      : Math.sin(t * 4.5 + staff.gridX) * 1.4) * scale;

  // 1. Glowing Role Station Halo under Staff Member
  const ringColor =
    isRelocating
      ? '#22d3ee'
      : staff.role === 'BARTENDER'
      ? 'rgba(56, 189, 248, 0.55)'
      : staff.role === 'BOUNCER'
      ? 'rgba(250, 204, 21, 0.55)'
      : 'rgba(244, 114, 182, 0.55)';

  ctx.save();
  ctx.fillStyle = 'rgba(15, 10, 30, 0.45)';
  ctx.beginPath();
  ctx.ellipse(px, py, 10.5 * scale, 5.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ringColor;
  ctx.lineWidth = (isRelocating ? 2.6 : 1.8) * scale;
  ctx.beginPath();
  ctx.ellipse(px, py, 11.5 * scale, 5.8 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Legs & Shoes
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.6 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px - 3.2 * scale, py - 13 * scale - bounce);
  ctx.lineTo(px - 3.6 * scale, py - 1 * scale);
  ctx.moveTo(px + 3.2 * scale, py - 13 * scale - bounce);
  ctx.lineTo(px + 3.6 * scale, py - 1 * scale);
  ctx.stroke();

  // 3. Role-Specific Torso / Uniform
  const torsoW = (staff.role === 'BOUNCER' ? 16.5 : 14.5) * scale;
  fillStrokeRoundedRect(
    ctx,
    px - torsoW / 2,
    py - 28.5 * scale - bounce,
    torsoW,
    16.5 * scale,
    4.5 * scale,
    staff.uniformColor,
    INK,
    1.7 * scale
  );

  // Role uniform accents (Vest lapels / Gold security badge / Waiter apron)
  if (staff.role === 'BARTENDER') {
    // Bartender dark apron & shaker arm motion
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px - 4.5 * scale, py - 21 * scale - bounce, 9 * scale, 8.5 * scale);
    // Silver Cocktail Shaker in hand
    const shakeOffset = Math.sin(t * 14) * 2.5 * scale;
    fillStrokeRoundedRect(
      ctx,
      px + 8 * scale,
      py - 26 * scale - bounce + shakeOffset,
      4.5 * scale,
      8.5 * scale,
      2 * scale,
      '#e2e8f0',
      INK,
      1.2 * scale
    );
  } else if (staff.role === 'BOUNCER') {
    // Gold Security Shield Pin & VIP Earpiece cord
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(px + 3.8 * scale, py - 23.5 * scale - bounce, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Crossed muscular arms
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 3.6 * scale;
    ctx.beginPath();
    ctx.moveTo(px - 7 * scale, py - 21 * scale - bounce);
    ctx.lineTo(px + 7 * scale, py - 20 * scale - bounce);
    ctx.stroke();
  } else if (staff.role === 'WAITER') {
    // Waiter white bistro apron + Raised Silver Serving Tray with Glowing Neon Drink
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(px - 4.5 * scale, py - 19.5 * scale - bounce, 9 * scale, 7 * scale);

    // Extended Serving Arm + Silver Tray
    const trayX = px + 11.5 * scale;
    const trayY = py - 25.5 * scale - bounce;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 2.8 * scale;
    ctx.beginPath();
    ctx.moveTo(px + 6 * scale, py - 22 * scale - bounce);
    ctx.lineTo(trayX, trayY + 2 * scale);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(trayX, trayY, 6.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();

    // Glowing Drink Glass on Waiter's Tray
    ctx.fillStyle = staff.carryingDrinkColor || '#22d3ee';
    fillStrokeRoundedRect(
      ctx,
      trayX - 2.2 * scale,
      trayY - 6.5 * scale,
      4.4 * scale,
      6 * scale,
      1.2 * scale,
      staff.carryingDrinkColor || '#22d3ee',
      INK,
      1 * scale
    );
  }

  // 4. Head & Face
  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(px, py - 35.5 * scale - bounce, 6.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  if (staff.role === 'BOUNCER') {
    // Cool dark Bouncer Sunglasses
    fillStrokeRoundedRect(
      ctx,
      px - 5.5 * scale,
      py - 37.5 * scale - bounce,
      11 * scale,
      3.8 * scale,
      1 * scale,
      '#090518',
      '#38bdf8',
      1 * scale
    );
  } else {
    // Expressive eyes
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px - 2.2 * scale, py - 35.5 * scale - bounce, 1.1 * scale, 0, Math.PI * 2);
    ctx.arc(px + 2.2 * scale, py - 35.5 * scale - bounce, 1.1 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair
  ctx.fillStyle = staff.hairColor;
  ctx.beginPath();
  ctx.arc(px, py - 37.5 * scale - bounce, 7.1 * scale, Math.PI * 0.92, Math.PI * 0.08);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  // 5. Role Tag Pill & Task Bubble overhead
  const roleTag =
    staff.role === 'BARTENDER'
      ? 'MIX'
      : staff.role === 'BOUNCER'
      ? 'SEC'
      : 'WAIT';
  const badgeColor =
    staff.role === 'BARTENDER'
      ? '#0284c7'
      : staff.role === 'BOUNCER'
      ? '#4c1d95'
      : '#be185d';

  fillStrokeRoundedRect(
    ctx,
    px - 12 * scale,
    py - 51 * scale - bounce,
    24 * scale,
    10 * scale,
    3.5 * scale,
    badgeColor,
    '#ffffff',
    1.1 * scale
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.max(7, Math.round(7.5 * scale))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(roleTag, px, py - 43.5 * scale - bounce);

  ctx.restore();
}

/**
 * Draws the expressive illustrated cartoon guests (matching the 5 dancers on the floor, seated lounge
 * patrons, and queued guests outside in IMG_1503.jpeg) with comic speech bubbles overhead.
 */
function drawIllustratedCharacter(
  ctx: CanvasRenderingContext2D,
  guest: GuestAgent,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  t: number
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2);

  const isDancing = guest.state === 'DANCING';
  const bounce =
    (isDancing ? Math.abs(Math.sin(t * 6.5 + gx * 2.7)) * 5.5 : Math.sin(t * 3 + gx) * 1.1) * scale;
  const armWave = isDancing ? Math.sin(t * 7 + gy * 3) * 6 * scale : 0;

  // Floor shadow
  ctx.fillStyle = 'rgba(15, 10, 30, 0.42)';
  ctx.beginPath();
  ctx.ellipse(px, py, 9 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shoes & Legs
  ctx.strokeStyle = guest.pantsColor;
  ctx.lineWidth = 3.5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px - 3.2 * scale, py - 13 * scale - bounce);
  ctx.lineTo(px - 3.8 * scale, py - 1 * scale - bounce * 0.25);
  ctx.moveTo(px + 3.2 * scale, py - 13 * scale - bounce);
  ctx.lineTo(px + 3.8 * scale, py - 1 * scale - bounce * 0.25);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = guest.shirtColor;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(px - 6 * scale, py - 24 * scale - bounce);
  ctx.lineTo(px - 11 * scale, py - 16 * scale - bounce - armWave);
  ctx.moveTo(px + 6 * scale, py - 24 * scale - bounce);
  ctx.lineTo(px + 11 * scale, py - 16 * scale - bounce + armWave);
  ctx.stroke();

  // Torso / Jacket with dark cartoon outline
  fillStrokeRoundedRect(
    ctx,
    px - 7 * scale,
    py - 28 * scale - bounce,
    14 * scale,
    16 * scale,
    4.5 * scale,
    guest.shirtColor,
    INK,
    1.6 * scale
  );

  // Head
  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(px, py - 35 * scale - bounce, 6.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  // Expressive Eyes & Smile
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px - 2.2 * scale, py - 35 * scale - bounce, 1.1 * scale, 0, Math.PI * 2);
  ctx.arc(px + 2.2 * scale, py - 35 * scale - bounce, 1.1 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Styled Cartoon Hair
  ctx.fillStyle = guest.hairColor;
  ctx.beginPath();
  ctx.arc(px, py - 37 * scale - bounce, 7.2 * scale, Math.PI * 0.92, Math.PI * 0.08);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  if (guest.isCelebrity) {
    ctx.fillStyle = '#facc15';
    ctx.font = `800 ${Math.max(8, Math.round(10 * scale))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('★ VIP', px, py - 45 * scale - bounce);
  }

  if (guest.bubble) {
    drawIllustratedSpeechBubble(ctx, px, py - 58 * scale - bounce, scale, guest.bubble);
  }
}

/**
 * Draws the crisp white rounded comic speech bubbles with frothy golden beer mugs, orange 4-point sparkles,
 * purple music eighth-notes, and blue chat ellipses (matching IMG_1503.jpeg).
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

  // Crisp White Rounded Rect Bubble with dark ink outline
  fillStrokeRoundedRect(
    ctx,
    x - 16 * s,
    y - 15 * s,
    32 * s,
    26 * s,
    8 * s,
    '#ffffff',
    INK,
    2 * s
  );

  // Pointer triangle tail at bottom center
  ctx.beginPath();
  ctx.moveTo(x - 4.5 * s, y + 10 * s);
  ctx.lineTo(x, y + 16 * s);
  ctx.lineTo(x + 4.5 * s, y + 10 * s);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * s;
  ctx.stroke();
  // Cover top seam of tail
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4 * s, y + 8.5 * s, 8 * s, 3 * s);

  if (bubble === 'BEER') {
    // Detailed Frothy Golden Beer Mug with Handle
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(x + 3 * s, y - 5 * s, 4.5 * s, 7 * s);
    fillStrokeRoundedRect(
      ctx,
      x - 6 * s,
      y - 6 * s,
      10 * s,
      11 * s,
      2 * s,
      '#f59e0b',
      '#78350f',
      1.4 * s
    );
    // White foam head
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x - 4 * s, y - 6.5 * s, 3 * s, 0, Math.PI * 2);
    ctx.arc(x - 1 * s, y - 7 * s, 3.2 * s, 0, Math.PI * 2);
    ctx.arc(x + 2 * s, y - 6.5 * s, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (bubble === 'SPARKLE') {
    // Orange & Gold 4-Point Diamond Sparkle Stars
    drawFourPointStar(ctx, x - 3 * s, y - 1 * s, 7 * s, '#f97316');
    drawFourPointStar(ctx, x + 5 * s, y - 5 * s, 4.5 * s, '#facc15');
    drawFourPointStar(ctx, x + 4 * s, y + 4 * s, 3.5 * s, '#fb923c');
  } else if (bubble === 'MUSIC') {
    // Purple Beamed Eighth Music Note (♫)
    ctx.fillStyle = '#6d28d9';
    ctx.font = `900 ${Math.round(15 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', x, y - 1.5 * s);
  } else if (bubble === 'CHAT') {
    // Light Blue Circle with 3 White Dots inside (Matching queued guest in IMG_1503.jpeg)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x, y - 2 * s, 8.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.3 * s;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    for (const dx of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y - 2 * s, 1.4 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (bubble === 'COCKTAIL') {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 7 * s);
    ctx.lineTo(x + 6 * s, y - 7 * s);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 6 * s);
    ctx.stroke();
  } else if (bubble === 'CASH') {
    ctx.fillStyle = '#16a34a';
    ctx.font = `900 ${Math.round(12 * s)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$$', x, y - 1.5 * s);
  } else {
    ctx.fillStyle = '#eab308';
    ctx.font = `900 ${Math.round(13 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', x, y - 1.5 * s);
  }

  ctx.restore();
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1;
  ctx.stroke();
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
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number,
  cycle: InternalDayNightState
) {
  ctx.save();

  // Center of the 6x6 Dance Floor in screen coordinates (grid 4.5, 4.5)
  const clubCenterX = originX + (4.5 - 4.5) * (tileW / 2);
  const clubCenterY = originY + (4.5 + 4.5) * (tileH / 2) - 10 * scale;

  // Radial night darkness vignette: slightly lighter directly over the illuminated dance floor,
  // deeper darkness across the surrounding street, walls, and skyline
  const innerRadius = 90 * scale;
  const outerRadius = Math.max(width, height) * 0.78;
  const nightGrad = ctx.createRadialGradient(
    clubCenterX,
    clubCenterY,
    innerRadius,
    clubCenterX,
    clubCenterY,
    outerRadius
  );

  const centerDarkAlpha = (0.06 + cycle.nightIntensity * 0.24).toFixed(3);
  const midDarkAlpha = (0.14 + cycle.nightIntensity * 0.38).toFixed(3);
  const edgeDarkAlpha = (0.22 + cycle.nightIntensity * 0.52).toFixed(3);

  nightGrad.addColorStop(0, `rgba(8, 4, 24, ${centerDarkAlpha})`);
  nightGrad.addColorStop(0.55, `rgba(6, 3, 20, ${midDarkAlpha})`);
  nightGrad.addColorStop(1, `rgba(3, 1, 12, ${edgeDarkAlpha})`);

  ctx.fillStyle = nightGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Intensifies the neon emissive glow of all placed items (Dance Tiles, Bar Units, DJ Booths,
 * Lighting Rigs, VIP Booths/Seating) using GPU-friendly additive ('lighter') blending as night progresses.
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
  cycle: InternalDayNightState,
  activeDrink: DrinkMix
) {
  // Emissive intensity scales smoothly with nightIntensity + subtle beat pulse
  const beatPulse = 0.88 + 0.12 * Math.sin(t * 6.5);
  const glowStrength = Math.min(1.0, (0.18 + cycle.nightIntensity * 0.82) * beatPulse);
  if (glowStrength <= 0.05) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Exterior Streetlamps & Skyline Neon Sign Additive Bloom at Night
  const lampPositions = [
    { gx: -2.1, gy: 4.0 },
    { gx: -2.1, gy: 7.4 },
    { gx: 2.0, gy: 11.4 },
  ];
  for (const lp of lampPositions) {
    const lx = originX + (lp.gx - lp.gy) * (tileW / 2);
    const ly = originY + (lp.gx + lp.gy) * (tileH / 2);
    const lampPool = ctx.createRadialGradient(lx, ly, 2 * scale, lx, ly, 42 * scale);
    lampPool.addColorStop(0, `rgba(56, 189, 248, ${(0.22 * glowStrength).toFixed(3)})`);
    lampPool.addColorStop(0.5, `rgba(250, 204, 21, ${(0.1 * glowStrength).toFixed(3)})`);
    lampPool.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = lampPool;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 42 * scale, 22 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Placed Items Emissive Neon Glow (Scales with item category, tier, and cycle.nightIntensity)
  for (let i = 0; i < floorItems.length; i++) {
    const item = floorItems[i];
    const cat = getCatalogItem(item.catalogId);
    if (!cat) continue;

    const fp = getRotatedFootprint(cat, item.rotation);
    const centerGx = item.gridX + fp.width * 0.5;
    const centerGy = item.gridY + fp.depth * 0.5;
    const cx = originX + (centerGx - centerGy) * (tileW / 2);
    const cy = originY + (centerGx + centerGy) * (tileH / 2);
    const tierBoost = 0.85 + cat.tier * 0.22;

    if (cat.category === 'DANCE_TILE') {
      // Radiant upward disco floor bloom that intensifies at night
      const rx = Math.max(1, fp.width) * tileW * 0.72;
      const ry = Math.max(1, fp.depth) * tileH * 0.72;
      const colorPhase = Math.floor(item.gridX * 3 + item.gridY * 5 + t * 2) % 3;
      const neonRgb =
        colorPhase === 0
          ? '34, 211, 238' // cyan
          : colorPhase === 1
          ? '244, 114, 182' // magenta pink
          : '168, 85, 247'; // electric purple

      const tileGlow = ctx.createRadialGradient(cx, cy - 4 * scale, 2 * scale, cx, cy - 4 * scale, rx);
      tileGlow.addColorStop(
        0,
        `rgba(${neonRgb}, ${(0.24 * glowStrength * tierBoost).toFixed(3)})`
      );
      tileGlow.addColorStop(
        0.55,
        `rgba(${neonRgb}, ${(0.11 * glowStrength * tierBoost).toFixed(3)})`
      );
      tileGlow.addColorStop(1, `rgba(${neonRgb}, 0)`);

      ctx.fillStyle = tileGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4 * scale, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.category === 'BAR_UNIT') {
      // Under-counter LED strip & glowing top bar counter aura
      const barRx = Math.max(fp.width, fp.depth) * tileW * 0.65;
      const barGlow = ctx.createRadialGradient(
        cx,
        cy - 14 * scale,
        4 * scale,
        cx,
        cy - 14 * scale,
        barRx
      );
      barGlow.addColorStop(
        0,
        `rgba(56, 189, 248, ${(0.32 * glowStrength * tierBoost).toFixed(3)})`
      );
      barGlow.addColorStop(
        0.5,
        `rgba(236, 72, 153, ${(0.16 * glowStrength * tierBoost).toFixed(3)})`
      );
      barGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = barGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 14 * scale, barRx, barRx * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing drink mix orb highlight on bar counter
      ctx.fillStyle = activeDrink.color;
      ctx.globalAlpha = Math.min(0.85, 0.35 * glowStrength * tierBoost);
      ctx.beginPath();
      ctx.arc(cx + 12 * scale, cy - 24 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (cat.category === 'DJ_BOOTH') {
      // Intense Magenta & Cyan Stage Console Neon Bloom
      const djRadius = 64 * scale * tierBoost;
      const djGlow = ctx.createRadialGradient(
        cx,
        cy - 20 * scale,
        3 * scale,
        cx,
        cy - 20 * scale,
        djRadius
      );
      djGlow.addColorStop(0, `rgba(244, 114, 182, ${(0.42 * glowStrength).toFixed(3)})`);
      djGlow.addColorStop(0.45, `rgba(56, 189, 248, ${(0.22 * glowStrength).toFixed(3)})`);
      djGlow.addColorStop(1, 'rgba(244, 114, 182, 0)');

      ctx.fillStyle = djGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 20 * scale, djRadius, djRadius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.category === 'LIGHTING') {
      // High-intensity overhead fixture orb bloom + sweeping floor spotlight pool
      const orbY = cy - 50 * scale;
      const orbRadius = (28 + cat.tier * 10) * scale;
      const orbGlow = ctx.createRadialGradient(cx, orbY, 2 * scale, cx, orbY, orbRadius);
      orbGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.55 * glowStrength).toFixed(3)})`);
      orbGlow.addColorStop(0.35, `rgba(34, 211, 238, ${(0.38 * glowStrength).toFixed(3)})`);
      orbGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Floor spotlight pool directly beneath or sweeping from light fixture
      const poolX = cx + Math.sin(t * 2.1 + item.gridX) * 24 * scale;
      const poolY = cy + Math.cos(t * 1.7 + item.gridY) * 12 * scale;
      const poolR = (36 + cat.tier * 12) * scale;
      const poolGrad = ctx.createRadialGradient(poolX, poolY, 2 * scale, poolX, poolY, poolR);
      poolGrad.addColorStop(0, `rgba(236, 72, 153, ${(0.34 * glowStrength).toFixed(3)})`);
      poolGrad.addColorStop(0.5, `rgba(34, 211, 238, ${(0.16 * glowStrength).toFixed(3)})`);
      poolGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(poolX, poolY, poolR, poolR * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.category === 'SEATING') {
      // Under-booth neon rim aura & warm tabletop coaster glow
      const seatR = Math.max(fp.width, fp.depth) * 28 * scale;
      const seatGlow = ctx.createRadialGradient(
        cx,
        cy - 8 * scale,
        2 * scale,
        cx,
        cy - 8 * scale,
        seatR
      );
      if (cat.tier >= 2) {
        seatGlow.addColorStop(0, `rgba(192, 132, 252, ${(0.32 * glowStrength).toFixed(3)})`);
        seatGlow.addColorStop(0.55, `rgba(56, 189, 248, ${(0.14 * glowStrength).toFixed(3)})`);
        seatGlow.addColorStop(1, 'rgba(192, 132, 252, 0)');
      } else {
        seatGlow.addColorStop(0, `rgba(251, 191, 36, ${(0.22 * glowStrength).toFixed(3)})`);
        seatGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      }

      ctx.fillStyle = seatGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8 * scale, seatR, seatR * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

