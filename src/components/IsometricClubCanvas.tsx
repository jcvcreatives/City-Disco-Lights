import React, { useEffect, useRef } from 'react';
import {
  BubbleType,
  CatalogItem,
  DancerMoveVariant,
  DrinkMix,
  FloatingText,
  GuestAgent,
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
  clubBpm?: number;
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
const INK = '#111116';

const GUEST_NAMES = [
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
  floor: 1 | 2;
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

  const dancerParticlesRef = useRef<DancerHypeParticle[]>([]);
  const prevHypeSegmentsRef = useRef<number>(clubMetrics.hypeSegments);

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
    clubBpm,
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

  const getViewportTransform = (width: number, height: number, userZoom: number) => {
    const autoScale = Math.min(1.18, Math.max(0.54, Math.min(width / 780, height / 670)));
    const scale = autoScale * userZoom;
    const tileW = BASE_TILE_W * scale;
    const tileH = BASE_TILE_H * scale;
    const floorLift = latestPropsRef.current.activeFloor >= 2 ? -36 * scale : 0;
    const originX = width * (width < 640 ? 0.525 : 0.505) + panOffsetRef.current.x;
    const originY = height * (width < 640 ? 0.205 : 0.225) + panOffsetRef.current.y + floorLift;
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
    let particleEmitAccumulator = 0;
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

    const spawnParticlesAboveDancer = (dancer: GuestAgent, count: number) => {
      const particles = dancerParticlesRef.current;
      for (let k = 0; k < count; k++) {
        if (particles.length >= 160) {
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

      const guests = guestsRef.current;

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
          // Confetti pops up above the dancer, then flutters gently downward
          p.vy += 36 * dt;
        } else {
          // Bubbles accelerate slightly upward with buoyancy
          p.vy -= 4 * dt;
        }
      }

      const currentBpm = Math.max(90, Math.min(180, props.clubBpm || 124));
      const beatDurationSec = 60 / currentBpm;

      if (metrics.hypeSegments >= 3) {
        const activeDancers = guests.filter(
          (g) => g.state === 'DANCING' || g.state === 'DANCER_MOVES'
        );
        // Celebrate immediately when Hype reaches maximum 3 segments
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

      for (let i = guests.length - 1; i >= 0; i--) {
        const guest = guests[i];
        guest.stateTimer -= dt;
        if (guest.bubbleTimer > 0) {
          guest.bubbleTimer -= dt;
          if (guest.bubbleTimer <= 0) {
            guest.bubble = null;
          }
        }

        // BPM-driven DANCER_MOVES AI randomization while guest is on the dance floor
        if (guest.state === 'DANCER_MOVES' || guest.state === 'DANCING') {
          if (!guest.danceMove) {
            guest.danceMove = pickRandomDancerMoveForBpm(currentBpm);
            guest.dancePhaseOffset = Math.random() * Math.PI * 2;
          }
          // Automatically promote DANCING guests into DANCER_MOVES after their initial warm-up beat
          if (guest.state === 'DANCING' && guest.stateTimer < 6.5) {
            guest.state = 'DANCER_MOVES';
            guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
            guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 4));
          }
          if (guest.state === 'DANCER_MOVES') {
            guest.danceMoveTimer = (guest.danceMoveTimer ?? beatDurationSec * 8) - dt;
            if (guest.danceMoveTimer <= 0) {
              // Randomize next dance sprite animation move on a relaxed 8-beat musical phrase boundary
              guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
              guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
            }
          }
        }

        if (guest.path.length > 0) {
          const nextWp = guest.path[0];
          const dx = nextWp.x - guest.gridX;
          const dy = nextWp.y - guest.gridY;
          const dist = Math.hypot(dx, dy);
          // Natural, unhurried walking speed (~1.12 tiles/sec)
          const speed = 1.12 * dt;
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
              const barSlot = pickSeparatedBarSlot(items, guests, guest.floor, guest.id);
              guest.state = 'WALKING_TO_BAR';
              const path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                Math.round(barSlot.x),
                Math.round(barSlot.y)
              );
              if (path.length > 0) {
                path[path.length - 1] = { x: barSlot.x, y: barSlot.y };
              } else {
                path.push({ x: barSlot.x, y: barSlot.y });
              }
              guest.path = path;
              guest.bubble = drink.tier >= 3 ? 'COCKTAIL' : 'BEER';
              guest.bubbleTimer = 4;
              guest.stateTimer = 0.9;
            }
          } else if (guest.state === 'CLIMBING_STAIRS') {
            guest.floor = 2;
            guest.gridX = STAIRS_COORD.x;
            guest.gridY = STAIRS_COORD.y + 1;
            guest.state = 'WALKING_TO_BAR';
            const barSlot2 = pickSeparatedBarSlot(items, guests, 2, guest.id);
            const path = findGridPath(
              items,
              2,
              guest.gridX,
              guest.gridY,
              Math.round(barSlot2.x),
              Math.round(barSlot2.y)
            );
            if (path.length > 0) {
              path[path.length - 1] = { x: barSlot2.x, y: barSlot2.y };
            } else {
              path.push({ x: barSlot2.x, y: barSlot2.y });
            }
            guest.path = path;
            guest.bubble = 'VIP_CROWN';
            guest.bubbleTimer = 4;
            guest.stateTimer = 0.9;
          } else if (guest.state === 'WALKING_TO_BAR') {
            guest.state = 'ORDERING_DRINK';
            guest.stateTimer = Math.max(1.8, (drink.prepTimeSec / metrics.maxBarTier) * 1.35);
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

            // 32% of patrons head straight from the bar to sit in a chair or stand at a cocktail table
            const seats = items.filter(
              (it) =>
                it.floor === guest.floor && getCatalogItem(it.catalogId)?.category === 'SEATING'
            );
            if (seats.length > 0 && Math.random() < 0.32) {
              const seatSlot = pickSeparatedSeatOrTableSlot(items, guests, guest.floor, guest.id);
              guest.state = 'WALKING_TO_SEAT';
              const path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                Math.round(seatSlot.x),
                Math.round(seatSlot.y)
              );
              if (path.length > 0) {
                path[path.length - 1] = { x: seatSlot.x, y: seatSlot.y };
              } else {
                path.push({ x: seatSlot.x, y: seatSlot.y });
              }
              guest.path = path;
              guest.stateTimer = 0.8;
            } else {
              const danceSlot = pickSeparatedDanceSlot(items, guests, guest.floor, guest.id);
              guest.state = 'WALKING_TO_DANCE';
              const path = findGridPath(
                items,
                guest.floor,
                guest.gridX,
                guest.gridY,
                Math.round(danceSlot.x),
                Math.round(danceSlot.y)
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
            guest.danceMove = pickRandomDancerMoveForBpm(currentBpm);
            guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
            guest.dancePhaseOffset = Math.random() * Math.PI * 2;
            guest.stateTimer = 8.5 + Math.random() * 5.0;
            guest.bubble =
              metrics.lightingCount < 2 && Math.random() < 0.25
                ? 'SPARKLE'
                : Math.random() < 0.5
                ? 'MUSIC'
                : 'SPARKLE';
            guest.bubbleTimer = 5.5;
          } else if (guest.state === 'DANCING' || guest.state === 'DANCER_MOVES') {
            // 30% chance to chain into another DANCER_MOVES freestyle burst before heading to sit in a chair or stand at a table
            const danceTiles = items.filter(
              (it) =>
                it.floor === guest.floor &&
                getCatalogItem(it.catalogId)?.category === 'DANCE_TILE'
            );
            if (guest.state === 'DANCING' || (danceTiles.length > 0 && Math.random() < 0.3)) {
              guest.state = 'DANCER_MOVES';
              guest.danceMove = pickRandomDancerMoveForBpm(currentBpm, guest.danceMove);
              guest.danceMoveTimer = beatDurationSec * (6 + Math.floor(Math.random() * 5));
              guest.stateTimer = 6.5 + Math.random() * 4.0;
              guest.bubble = Math.random() < 0.5 ? 'MUSIC' : 'SPARKLE';
              guest.bubbleTimer = 4.0;
            } else {
              const seats = items.filter(
                (it) =>
                  it.floor === guest.floor && getCatalogItem(it.catalogId)?.category === 'SEATING'
              );
              if (seats.length > 0) {
                const seatSlot = pickSeparatedSeatOrTableSlot(items, guests, guest.floor, guest.id);
                guest.state = 'WALKING_TO_SEAT';
                const path = findGridPath(
                  items,
                  guest.floor,
                  guest.gridX,
                  guest.gridY,
                  Math.round(seatSlot.x),
                  Math.round(seatSlot.y)
                );
                if (path.length > 0) {
                  path[path.length - 1] = { x: seatSlot.x, y: seatSlot.y };
                } else {
                  path.push({ x: seatSlot.x, y: seatSlot.y });
                }
                guest.path = path;
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
            }
          } else if (guest.state === 'WALKING_TO_SEAT') {
            guest.state = 'RESTING_AT_SEAT';
            guest.stateTimer = 7.5 + Math.random() * 4.5;
            guest.bubble = guest.isCelebrity ? 'VIP_CROWN' : Math.random() < 0.5 ? 'COCKTAIL' : 'CHAT';
            guest.bubbleTimer = 4.5;
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

      // 2A-Bis. Continuous Personal-Space Separation Pass so patrons never stack or overlap
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

        // Smooth 60fps natural walking transition along A* waypoints between stations
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

        // Guarantee zero instant jumping: if a staff member is away from their assigned post
        // (and not a Waiter mid-delivery), smoothly pathfind back to (postGridX, postGridY)
        if (
          staff.role !== 'WAITER' &&
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

        // Role-specific automated tasks & station-to-station patrol walks when timer completes
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
            staff.taskTimer = 3.2 + Math.random() * 1.4;
            props.onStaffTaskComplete?.(staff.uid, 'SERVED_DRINK');

            // Smooth station transition along the bar counter between pours
            const floorBars = items.filter(
              (it) =>
                it.floor === staff.floor &&
                getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
            );
            const atAssignedPost =
              Math.hypot(staff.postGridX - staff.gridX, staff.postGridY - staff.gridY) < 0.25;
            if (atAssignedPost && floorBars.length > 0) {
              const barUnit = floorBars[staff.drinksServed % floorBars.length];
              const patrolX = Math.max(0, Math.min(GRID_SIZE - 1, barUnit.gridX + 1));
              const patrolY = Math.max(0, Math.min(GRID_SIZE - 1, barUnit.gridY + 1));
              if (Math.hypot(patrolX - staff.gridX, patrolY - staff.gridY) > 0.4) {
                staff.path = buildStaffStationPath(
                  items,
                  staff.floor,
                  staff.gridX,
                  staff.gridY,
                  patrolX,
                  patrolY
                );
              }
            } else if (!atAssignedPost) {
              staff.path = buildStaffStationPath(
                items,
                staff.floor,
                staff.gridX,
                staff.gridY,
                staff.postGridX,
                staff.postGridY
              );
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
            staff.taskTimer = 3.6 + Math.random() * 1.4;
            props.onStaffTaskComplete?.(staff.uid, 'CHECKED_IN_GUEST');

            // Smooth security patrol transition between assigned post and front rope entrance
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
              // Pick up glowing drink tray from bar and A* pathfind to a Lounge Table or assigned post
              staff.carryingDrinkColor = drink.color;
              staff.actionBubble = '🍸';
              staff.bubbleTimer = 2.5;
              staff.taskState = 'WALKING_TO_TABLE';
              const targetSeat =
                floorSeats.length > 0
                  ? floorSeats[Math.floor(Math.random() * floorSeats.length)]
                  : { gridX: staff.postGridX, gridY: staff.postGridY };
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

      // Negative isometric Z-offset & negative z-index layer offset relative to the building's floor level (Floors 2+)
      // On Floor 1: zOffset = 0, carZIndex = 100 (foreground street level)
      // On Floor 2+: negative zOffset (-92 * (activeFloor - 1) * scale) and negative carZIndex (-100 * (activeFloor - 1))
      // so parked cars and street elements render visually and depth-wise *underneath* the elevated building structure.
      const streetZOffset = props.activeFloor >= 2 ? -(props.activeFloor - 1) * 92 * scale : 0;
      const parkedCarsZIndex = props.activeFloor >= 2 ? -(props.activeFloor - 1) * 100 : 100;
      const floorDropH = -streetZOffset;
      const streetOriginY = originY - streetZOffset;

      // 2. GROUND-LEVEL ENTRANCE PLAZA, SIDEWALK, CROSSWALK & PARKING LOT (At negative zOffset below the building)
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

      // 2A. CONDITIONAL NEGATIVE Z-INDEX PARKED CARS PASS (When activeFloor >= 2, carZIndex < 0 so cars render UNDERNEATH the building slab & understructure)
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
          props.activeFloor
        );
      }

      // 2B. LOWER BUILDING 1ST-FLOOR EXTERIOR FACADE UNDERSTRUCTURE & OVERHANG SHADOW (When on Floor 2+)
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
      const sequencer = computeRhythmicLightingSequencer(t, activeBpm);

      // 3. CLUB CUTAWAY WALLS, NEON STRIPS, SIGNS, TRUSSES & DISCO BALL
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
        sequencer
      );

      // 4. SUNKEN BEVELED DANCE FLOOR GRID WITH BPM-SYNCED RHYTHMIC SEQUENCER PULSING
      const floorItems = props.placedItems.filter((p) => p.floor === props.activeFloor);
      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category !== 'DANCE_TILE') continue;
        drawIllustratedDanceTile(ctx, item, cat, originX, originY, tileW, tileH, scale, t, sequencer);
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

      // 6. PAINTER'S ALGORITHM DEPTH & Z-INDEX SORT FOR 3D FURNITURE, HIRED STAFF, GUESTS & FRONT QUEUE
      const drawables: Array<{ zIndex: number; depth: number; draw: () => void }> = [];

      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category === 'DANCE_TILE') continue;
        const fp = getRotatedFootprint(cat, item.rotation);
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
          zIndex: 0,
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
          zIndex: 0,
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

      // Active Floor Interior Guests
      const allGuests = guestsRef.current;
      for (let i = 0; i < allGuests.length; i++) {
        const guest = allGuests[i];
        if (guest.floor !== props.activeFloor || guest.state === 'QUEUEING') continue;
        const depth = guest.gridX + guest.gridY + 0.6;
        drawables.push({
          zIndex: 0,
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
              t,
              activeBpm
            ),
        });
      }

      // Foreground Entrance Archway Wall Cutaway & Neon Entry Sign (only on Floor 1 at zIndex 0; on Floor 2+ it sits under the building facade)
      if (props.activeFloor === 1) {
        drawables.push({
          zIndex: 0,
          depth: DOOR_COORD.x + DOOR_COORD.y + 1.15,
          draw: () => drawEntranceArchwayCutaway(ctx, originX, streetOriginY, tileW, tileH, scale),
        });
      }

      // Front Sidewalk Queueing Guests standing right in front of the ground-level Entrance Archway
      const queueGuests = allGuests.filter((g) => g.state === 'QUEUEING');
      queueGuests.forEach((qg, idx) => {
        const qx = 1.65 - idx * 0.88;
        const qy = 10.42 + (idx % 2) * 0.14;
        drawables.push({
          zIndex: parkedCarsZIndex < 0 ? parkedCarsZIndex + 10 : 0,
          depth: qx + qy + 2.5,
          draw: () =>
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
            ),
        });
      });

      drawables.sort((a, b) => (a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.depth - b.depth));
      for (let i = 0; i < drawables.length; i++) {
        drawables[i].draw();
      }

      // 6B. FOREGROUND PARKED CARS PASS (Only when parkedCarsZIndex >= 0 on Floor 1)
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
          props.activeFloor
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

      for (const lItem of floorItems) {
        const cat = getCatalogItem(lItem.catalogId);
        if (cat && cat.category === 'LIGHTING' && cat.tier >= 2) {
          drawLightingBeams(ctx, lItem, cat, originX, originY, tileW, tileH, scale, t);
        }
      }

      // 8B. MAX-HYPE (3/3 SEGMENTS) DANCER CONFETTI & BUBBLES PARTICLE SYSTEM
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
            if (lifeRatio > 0.88) {
              // Tiny bubble pop ring burst at end of lifetime
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 1.4 * scale;
              ctx.beginPath();
              ctx.arc(sx, sy, r * 1.45, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              // Translucent glossy neon bubble with dark cel outline & white catchlight
              ctx.fillStyle = p.color;
              ctx.globalAlpha = alpha * 0.32;
              ctx.beginPath();
              ctx.arc(sx, sy, r, 0, Math.PI * 2);
              ctx.fill();

              ctx.globalAlpha = alpha;
              ctx.strokeStyle = INK;
              ctx.lineWidth = 1.3 * scale;
              ctx.beginPath();
              ctx.arc(sx, sy, r, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = p.color;
              ctx.lineWidth = 1.1 * scale;
              ctx.beginPath();
              ctx.arc(sx, sy, Math.max(0.5, r - 0.8 * scale), 0, Math.PI * 2);
              ctx.stroke();

              // Specular bubble highlight dot
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
            }
          } else {
            // 3D tumbling cyber-neon confetti ribbon with dark cel-shaded outline
            const w = p.size * 1.55 * scale;
            const h = p.size * 0.85 * Math.max(0.28, Math.abs(Math.cos(p.rotation * 1.6))) * scale;
            ctx.translate(sx, sy);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.strokeStyle = INK;
            ctx.lineWidth = 1.1 * scale;
            ctx.beginPath();
            ctx.rect(-w / 2, -h / 2, w, h);
            ctx.fill();
            ctx.stroke();
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

  // 2. Concrete Sidewalk Apron framing the 10x10 Club Platform (-1.4..11.4)
  const sidewalkOuter = [
    { gx: -1.35, gy: -1.35 },
    { gx: 11.35, gy: -1.35 },
    { gx: 11.35, gy: 11.35 },
    { gx: -1.35, gy: 11.35 },
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

  // 3. White Crosswalk Stripes at Top-Left, Top-Right, and Front Intersections
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

  // Top-left crosswalk, top-right crosswalk, and front pedestrian crosswalk
  drawCrosswalk(-3.8, -1.1, 0, 0.42, 1.1, 0.22, 5);
  drawCrosswalk(11.6, -1.1, 0, 0.42, 1.1, 0.22, 5);
  drawCrosswalk(1.9, 11.55, 0, 0.38, 1.15, 0.2, 5);

  // 4. Diagonal White Parking Stall Lines across the Front Asphalt Road (gy = 11.45..13.5)
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.36)';
  ctx.lineWidth = 2 * scale;
  for (let stallGx = -1.8; stallGx <= 8.8; stallGx += 2.15) {
    const p1x = originX + (stallGx - 11.45) * halfW;
    const p1y = originY + (stallGx + 11.45) * halfH;
    const p2x = originX + (stallGx - 0.5 - 13.45) * halfW;
    const p2y = originY + (stallGx - 0.5 + 13.45) * halfH;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
  }

  // 5. Red Carpet Runner leading to the Back-Left Entrance Doorway & Front VIP Entry
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

  // Back-left wall entrance red carpet runner + front VIP carpet runner
  drawRedCarpet(-1.3, 6.1, 0.05, 7.35);
  drawRedCarpet(1.65, 10.0, 3.15, 11.3);

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

  // 6B. Stray Stacked Cardboard Boxes on Right Sidewalk/Street (gx=12.6, gy=6.9)
  drawIsoPrism(
    ctx,
    12.3,
    6.7,
    0.85,
    0.85,
    0,
    9 * scale,
    originX,
    originY,
    tileW,
    tileH,
    '#b47b44',
    '#8c5a2b',
    '#6e441f',
    INK,
    1.6 * scale
  );
  drawIsoPrism(
    ctx,
    12.42,
    6.82,
    0.55,
    0.55,
    9 * scale,
    6 * scale,
    originX,
    originY,
    tileW,
    tileH,
    '#c88d55',
    '#9c6735',
    '#784d25',
    INK,
    1.4 * scale
  );

  // 6C. Green Street Dumpster Bin on Far-Right Sidewalk (gx=11.4, gy=4.5)
  drawIsoPrism(
    ctx,
    11.35,
    4.3,
    0.95,
    1.25,
    0,
    17 * scale,
    originX,
    originY,
    tileW,
    tileH,
    '#15803d',
    '#166534',
    '#14532d',
    INK,
    1.8 * scale
  );

  // 6D. Orange Traffic Cones on Street Corners
  const cones = [
    { gx: -1.7, gy: 8.6 },
    { gx: 10.9, gy: 10.7 },
    { gx: 11.4, gy: 1.5 },
  ];
  for (const c of cones) {
    const cx = originX + (c.gx - c.gy) * halfW;
    const cy = originY + (c.gx + c.gy) * halfH;
    // Square base
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();
    // Cone body
    ctx.beginPath();
    ctx.moveTo(cx - 3.8 * scale, cy);
    ctx.lineTo(cx, cy - 11.5 * scale);
    ctx.lineTo(cx + 3.8 * scale, cy);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.stroke();
    // White reflective collar stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2 * scale, cy - 6.5 * scale, 4 * scale, 2.2 * scale);
  }

  // 6E. Red Fire Hydrant & Street Trees on Upper-Right Sidewalk (Matching top-right of IMG_1506_5bdf15ca.jpeg)
  const hydX = originX + (4.2 - -3.1) * halfW;
  const hydY = originY + (4.2 + -3.1) * halfH;
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

  const streetTrees = [
    { gx: 2.5, gy: -3.8 },
    { gx: 6.4, gy: -2.9 },
  ];
  for (const tr of streetTrees) {
    const tx = originX + (tr.gx - tr.gy) * halfW;
    const ty = originY + (tr.gx + tr.gy) * halfH;
    // Tree trunk
    fillStrokeRoundedRect(
      ctx,
      tx - 2.5 * scale,
      ty - 22 * scale,
      5 * scale,
      22 * scale,
      1.5 * scale,
      '#5c3a21',
      INK,
      1.6 * scale
    );
    // Rounded cartoon canopy clusters
    for (const leaf of [
      { dx: -7, dy: -26, r: 9, c: '#166534' },
      { dx: 7, dy: -26, r: 9, c: '#14532d' },
      { dx: 0, dy: -33, r: 10.5, c: '#15803d' },
    ]) {
      ctx.fillStyle = leaf.c;
      ctx.beginPath();
      ctx.arc(tx + leaf.dx * scale, ty + leaf.dy * scale, leaf.r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();
    }
  }

  // 7. Draped Warm-White String Lights on Poles along Both Upper Sidewalks (Matching IMG_1506_5bdf15ca.jpeg)
  const drawPoleStringLights = (poles: Array<{ gx: number; gy: number }>) => {
    const poleTops: Array<{ x: number; y: number }> = [];
    for (const p of poles) {
      const px = originX + (p.gx - p.gy) * halfW;
      const py = originY + (p.gx + p.gy) * halfH;
      const topY = py - 46 * scale;
      poleTops.push({ x: px, y: topY });

      // Ground warm light pool
      const pool = ctx.createRadialGradient(px, py, 2 * scale, px, py, 24 * scale);
      pool.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
      pool.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(px, py, 24 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark metal pole
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2.6 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, topY);
      ctx.stroke();

      // Glowing pole top bulb
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

  // Left-back sidewalk string light poles & Right-back sidewalk string light poles
  drawPoleStringLights([
    { gx: -1.15, gy: 9.2 },
    { gx: -1.15, gy: 4.6 },
    { gx: -1.15, gy: 0.0 },
  ]);
  drawPoleStringLights([
    { gx: 0.4, gy: -1.15 },
    { gx: 3.6, gy: -1.15 },
    { gx: 6.8, gy: -1.15 },
    { gx: 10.0, gy: -1.15 },
  ]);
}

/**
 * Draws the foreground velvet rope queue barriers, front parked cars (including the Boxy Yellow Taxi Cab),
 * and curved streetlamps using a conditional negative z-index offset and negative vertical zOffset
 * relative to the building's floor level when on Floor 2 or higher.
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
  activeFloor: number = 1
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

      // Gold Circular Stanchion Base
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(px, py, 5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5 * scale;
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
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();

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

  // 2. Front Parked Vehicles in Foreground Stalls with Negative Z-Index & Negative Z-Offset relative to Floor 2+
  const underBuildingGyShift = isUnderBuilding ? -0.95 : 0;
  drawCar(
    ctx,
    -0.65,
    11.85 + underBuildingGyShift,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    '#2dd4bf',
    '#0f766e',
    false,
    zOffset,
    zIndex
  );
  // Stylized Boxy Yellow Taxi Cab right by the front crosswalk
  drawCar(
    ctx,
    1.55,
    12.15 + underBuildingGyShift,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    '#facc15',
    '#ca8a04',
    true,
    zOffset,
    zIndex
  );
  drawCar(
    ctx,
    3.85,
    12.15 + underBuildingGyShift,
    originX,
    originY,
    tileW,
    tileH,
    scale,
    '#f43f5e',
    '#9f1239',
    false,
    zOffset,
    zIndex
  );
  if (parkingState.lotTier >= 2) {
    drawCar(
      ctx,
      6.1,
      12.15 + underBuildingGyShift,
      originX,
      originY,
      tileW,
      tileH,
      scale,
      '#38bdf8',
      '#1e3a8a',
      false,
      zOffset,
      zIndex
    );
  }
  if (parkingState.lotTier >= 3) {
    drawCar(
      ctx,
      8.2,
      12.1 + underBuildingGyShift,
      originX,
      originY,
      tileW,
      tileH,
      scale,
      '#a855f7',
      '#581c87',
      false,
      zOffset,
      zIndex
    );
  }
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
  zIndex: number = 100
) {
  const cx = originX + (gx - gy) * (tileW / 2);
  const cy = originY + (gx + gy) * (tileH / 2) - zOffset;
  const isUnderBuilding = zIndex < 0;
  const carScale = isUnderBuilding ? scale * 0.92 : scale;

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

  // Glowing Yellow Headlights & Taillights
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(cx - 25 * carScale, cy - 3 * carScale, 3 * carScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(cx + 25 * carScale, cy - 4 * carScale, 2.5 * carScale, 0, Math.PI * 2);
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
  activeFloor: 1 | 2,
  unlockedFloors: 1 | 2,
  _playerLevel: number,
  stairsHitboxRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }>,
  sequencer: RhythmicLightingSequencerState
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  // Low-to-medium open-air walls matching IMG_1506_5bdf15ca.jpeg (no tall enclosing walls blocking view!)
  const wallH = 64 * scale;
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
  // Front-left & front-right slab lip thickness
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

      // Subtle cel-shaded marble vein lines on alternating tiles (matching dark veined floor in IMG_1506_5bdf15ca.jpeg)
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

  // Glowing Neon Pink/Magenta Perimeter Border Tube around the open-air slab front edges (BPM-pulsed)
  ctx.save();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = (2.4 + sequencer.kickEnvelope * 1.1) * scale;
  ctx.globalAlpha = Math.min(1, 0.65 + sequencer.kickEnvelope * 0.35);
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y);
  ctx.lineTo(s.x, s.y);
  ctx.lineTo(se.x, se.y);
  ctx.stroke();
  ctx.restore();

  // 2. LOW-TO-MEDIUM BACK-LEFT WALL (gy = 0..10 along gx = 0) with Neon Pink Trim & Vertical Light Strips
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.lineTo(sw.x, sw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  const leftWallGrad = ctx.createLinearGradient(nw.x, nw.y - wallH, sw.x, sw.y);
  leftWallGrad.addColorStop(0, '#2a164d');
  leftWallGrad.addColorStop(0.5, '#1e113a');
  leftWallGrad.addColorStop(1, '#150c2b');
  ctx.fillStyle = leftWallGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 3. LOW-TO-MEDIUM BACK-RIGHT WALL (gx = 0..10 along gy = 0) with Neon Pink Trim & Vertical Light Strips
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.closePath();
  const rightWallGrad = ctx.createLinearGradient(nw.x, nw.y - wallH, se.x, se.y);
  rightWallGrad.addColorStop(0, '#231342');
  rightWallGrad.addColorStop(0.5, '#1a0e33');
  rightWallGrad.addColorStop(1, '#120924');
  ctx.fillStyle = rightWallGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // Glowing Magenta/Pink Neon Top & Base Trim Strips along both Back Walls
  ctx.save();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = (2.3 + sequencer.kickEnvelope * 0.9) * scale;
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y - wallH);
  ctx.lineTo(nw.x, nw.y - wallH);
  ctx.lineTo(se.x, se.y - wallH);
  ctx.stroke();

  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(sw.x, sw.y - 1.5 * scale);
  ctx.lineTo(nw.x, nw.y - 1.5 * scale);
  ctx.lineTo(se.x, se.y - 1.5 * scale);
  ctx.stroke();

  // Vertical Glowing Cyan & Magenta Neon Light Strips along both Back Walls (Sequenced to BPM!)
  const leftStrips = [0.18, 0.34, 0.56, 0.84];
  for (let i = 0; i < leftStrips.length; i++) {
    const u = leftStrips[i];
    const sx = nw.x + (sw.x - nw.x) * u;
    const sy = nw.y + (sw.y - nw.y) * u;
    const stripSeq = sequencer.getDecorEmissiveState(0, u * 10, i);
    ctx.strokeStyle = i % 2 === 0 ? '#22d3ee' : '#f472b6';
    ctx.globalAlpha = stripSeq.toggledOn ? 1.0 : 0.32;
    ctx.lineWidth = (stripSeq.toggledOn ? 2.6 : 1.6) * scale;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6 * scale);
    ctx.lineTo(sx, sy - wallH + 6 * scale);
    ctx.stroke();
  }

  const rightStrips = [0.16, 0.36, 0.62, 0.84];
  for (let i = 0; i < rightStrips.length; i++) {
    const u = rightStrips[i];
    const sx = nw.x + (se.x - nw.x) * u;
    const sy = nw.y + (se.y - nw.y) * u;
    const stripSeq = sequencer.getDecorEmissiveState(u * 10, 0, i + 4);
    ctx.strokeStyle = i % 2 === 0 ? '#f472b6' : '#22d3ee';
    ctx.globalAlpha = stripSeq.toggledOn ? 1.0 : 0.32;
    ctx.lineWidth = (stripSeq.toggledOn ? 2.6 : 1.6) * scale;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 6 * scale);
    ctx.lineTo(sx, sy - wallH + 6 * scale);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 4. SINGLE GLOWING PURPLE/CYAN ENTRANCE DOORWAY ON THE BACK-LEFT WALL (gy = 6.2..7.3 along gx = 0)
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
  doorGrad.addColorStop(0, '#22d3ee');
  doorGrad.addColorStop(0.5, '#7e22ce');
  doorGrad.addColorStop(1, '#090514');
  ctx.fillStyle = doorGrad;
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke();

  // 5. GLOWING ISOMETRIC WALL NEON SIGNS (Matching IMG_1506_5bdf15ca.jpeg):
  // - Back-Left Wall: "GOOD TIMES" (purple/pink) & "CLUB NEON" (bright cyan/white)
  // - Back-Right Wall: "LOVE THE BASS" (bright cyan) & "COCKTAILS" (glowing pink/purple)
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
    // Neon outer glow backing toggled by the BPM sequencer
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = (signSeq.toggledOn ? 4.2 : 2.2) * scale;
    ctx.globalAlpha = signSeq.toggledOn ? Math.min(1, 0.55 + sequencer.kickEnvelope * 0.45) : 0.25;
    ctx.strokeText(text, 0, 0);
    ctx.globalAlpha = 1;
    // Crisp dark ink outline + bright core
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6 * scale;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = signSeq.toggledOn ? textColor : glowColor;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const isoAngleLeft = -Math.atan2(halfH, halfW);
  const isoAngleRight = Math.atan2(halfH, halfW);

  // Back-left wall neon signs
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.25,
    nw.y + (sw.y - nw.y) * 0.25 - 40 * scale,
    isoAngleLeft,
    'CLUB NEON',
    '#22d3ee',
    '#e0f2fe',
    12.5,
    1
  );
  drawIsoWallSign(
    nw.x + (sw.x - nw.x) * 0.56,
    nw.y + (sw.y - nw.y) * 0.56 - 42 * scale,
    isoAngleLeft,
    'GOOD TIMES',
    '#a855f7',
    '#f3e8ff',
    9.5,
    2
  );

  // Back-right wall neon signs
  drawIsoWallSign(
    nw.x + (se.x - nw.x) * 0.44,
    nw.y + (se.x - nw.x) * 0.22 - 44 * scale,
    isoAngleRight,
    'LOVE THE BASS',
    '#06b6d4',
    '#67e8f9',
    11.0,
    3
  );
  drawIsoWallSign(
    nw.x + (se.x - nw.x) * 0.83,
    nw.y + (se.y - nw.y) * 0.83 - 38 * scale,
    isoAngleRight,
    'COCKTAILS',
    '#ec4899',
    '#fbcfe8',
    10.5,
    4
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

    ctx.strokeStyle = '#f43f5e';
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

    // Mounted Cyan/Blue Spotlight Cans + Volumetric Light Cones
    for (let sp = 0; sp < 3; sp++) {
      const ly = ty - th + (10 + sp * 16) * scale;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(tx + 5 * scale, ly, 3.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();

      // Translucent cyan spotlight beam cone
      ctx.save();
      const beamGrad = ctx.createLinearGradient(
        tx + 5 * scale,
        ly,
        tx + 46 * scale,
        ly + 32 * scale
      );
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(tx + 5 * scale, ly);
      ctx.lineTo(tx + 48 * scale, ly + 22 * scale);
      ctx.lineTo(tx + 36 * scale, ly + 42 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  drawTrussTower(1.5, 0.2);
  drawTrussTower(7.2, 0.2);

  // 7. TROPICAL POTTED PALM TREES & CORNER MONSTERA PLANTS (Matching IMG_1506_5bdf15ca.jpeg)
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

  // 9. OVERHEAD SILVER MIRROR DISCO BALL & VOLUMETRIC LASER PYRAMID CONE (Centerpiece of IMG_1506_5bdf15ca.jpeg)
  const discoX = originX + (3.2 - 3.6) * halfW;
  const discoY = originY + (3.2 + 3.6) * halfH - 86 * scale;
  const apexY = discoY - 26 * scale;

  // Volumetric multi-ray laser pyramid radiating from above the disco ball down across the dance floor
  ctx.save();
  const rayTargets = [
    { dx: -75, dy: 92, c: 'rgba(34, 211, 238, 0.55)' },
    { dx: -42, dy: 112, c: 'rgba(250, 204, 21, 0.5)' },
    { dx: -12, dy: 120, c: 'rgba(34, 211, 238, 0.6)' },
    { dx: 22, dy: 115, c: 'rgba(244, 114, 182, 0.5)' },
    { dx: 58, dy: 98, c: 'rgba(56, 189, 248, 0.55)' },
    { dx: 138, dy: 72, c: 'rgba(250, 204, 21, 0.45)' },
  ];
  for (let r = 0; r < rayTargets.length; r++) {
    const rt = rayTargets[r];
    const wobble = Math.sin(t * 2.4 + r) * 6 * scale;
    ctx.strokeStyle = rt.c;
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(discoX, apexY);
    ctx.lineTo(discoX + rt.dx * scale + wobble, discoY + rt.dy * scale);
    ctx.stroke();
  }
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

  // 10. Compact Interactive Floor 2 / VIP Sky Lounge Neon Sign Hitbox on Back Corner
  const signBox = {
    x: nw.x + 14 * scale,
    y: nw.y - wallH - 22 * scale,
    w: 94 * scale,
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
    'rgba(17, 17, 22, 0.88)',
    unlockedFloors === 2 ? '#4ade80' : '#22d3ee',
    1.8 * scale
  );
  ctx.fillStyle = '#67e8f9';
  ctx.font = `800 ${Math.max(7, Math.round(8.5 * scale))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    unlockedFloors === 1 ? '▲ UNLOCK FLOOR 2' : `FLOOR ${activeFloor === 1 ? '2 ▲' : '1 ▼'}`,
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
 * Compact doorway accent helper (kept non-obstructive for the open-air layout).
 */
function drawEntranceArchwayCutaway(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  tileW: number,
  tileH: number,
  scale: number
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
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.6 * scale;
  ctx.beginPath();
  ctx.moveTo(doorLeft.x, doorLeft.y);
  ctx.lineTo(doorRight.x, doorRight.y);
  ctx.stroke();
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
 * Draws the sunken-look grid of glowing square dance floor tiles cycling smoothly through
 * cyan, magenta, lime green, yellow, and orange with a thick #111116 dark outline and subtle inner bevel.
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
  sequencer?: RhythmicLightingSequencerState
) {
  const fp = getRotatedFootprint(cat, item.rotation);
  const palette = [
    '#22d3ee', // glowing cyan
    '#38bdf8', // electric aqua
    '#e879f9', // vibrant magenta
    '#4ade80', // lime green
    '#fde047', // sunny yellow
    '#fb923c', // neon orange
  ];

  // Subdivide each 1x1 grid cell into 2x2 sunken beveled LED sub-squares
  const subDiv = 2;
  const subStep = 1 / subDiv;
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  for (let dx = 0; dx < fp.width; dx += subStep) {
    for (let dy = 0; dy < fp.depth; dy += subStep) {
      const gx = item.gridX + dx;
      const gy = item.gridY + dy;

      const ix = Math.round(gx * 2);
      const iy = Math.round(gy * 2);
      const stepIndex = sequencer ? sequencer.step16 : Math.floor(t * 2.5);
      const isCyanBase = (ix + iy) % 2 === 0;
      const colorIdx = isCyanBase
        ? (ix + iy + Math.floor(stepIndex * 0.5)) % 2
        : Math.abs(ix * 3 + iy * 5 + Math.floor(stepIndex * 0.5)) % palette.length;
      const baseColor = palette[colorIdx];

      // BPM-synced rhythmic sequencer toggles and pulses each sub-tile's emissive state
      const emissiveState = sequencer
        ? sequencer.getDecorEmissiveState(gx, gy, ix + iy)
        : { isToggledOn: true, emissiveIntensity: 1.0, channelIndex: 0 };

      // Sunken recess offset (+1.0 * scale below floor level)
      const p0x = originX + (gx - gy) * halfW;
      const p0y = originY + (gx + gy) * halfH + 1.0 * scale;
      const p1x = originX + (gx + subStep - gy) * halfW;
      const p1y = originY + (gx + subStep + gy) * halfH + 1.0 * scale;
      const p2x = originX + (gx - gy) * halfW;
      const p2y = originY + (gx + subStep + (gy + subStep)) * halfH + 1.0 * scale;
      const p3x = originX + (gx - (gy + subStep)) * halfW;
      const p3y = originY + (gx + (gy + subStep)) * halfH + 1.0 * scale;

      // Outer tile frame with thick #111116 outline
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = emissiveState.isToggledOn
        ? Math.min(1, 0.78 + emissiveState.emissiveIntensity * 0.22)
        : 0.48;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0 * scale;
      ctx.stroke();

      // Inner sunken bevel rim (brightens on active sequencer beat step)
      const cx = p0x;
      const cy = (p0y + p2y) / 2;
      const bevelAlpha = emissiveState.isToggledOn
        ? Math.min(0.88, 0.35 + emissiveState.emissiveIntensity * 0.42)
        : 0.22;
      ctx.strokeStyle = `rgba(255, 255, 255, ${bevelAlpha.toFixed(2)})`;
      ctx.lineWidth = (emissiveState.isToggledOn ? 1.3 : 0.95) * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy - tileH * 0.17);
      ctx.lineTo(cx + tileW * 0.17, cy);
      ctx.lineTo(cx, cy + tileH * 0.17);
      ctx.lineTo(cx - tileW * 0.17, cy);
      ctx.closePath();
      ctx.stroke();

      // Specular center glow core pulsing with the BPM beat envelope
      const coreScale = emissiveState.isToggledOn
        ? 0.11 + (emissiveState.emissiveIntensity - 0.6) * 0.045
        : 0.08;
      const coreAlpha = emissiveState.isToggledOn
        ? Math.min(0.75, 0.24 + emissiveState.emissiveIntensity * 0.32)
        : 0.14;
      ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - tileH * coreScale);
      ctx.lineTo(cx + tileW * coreScale, cy);
      ctx.lineTo(cx, cy + tileH * coreScale);
      ctx.lineTo(cx - tileW * coreScale, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

const drawIllustratedDanceTile = drawTile;

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
  activeDrink: DrinkMix
) {
  if (cat.category === 'BAR_UNIT') {
    drawBar(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t, activeDrink);
  } else if (cat.category === 'DJ_BOOTH') {
    drawDJBooth(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t);
  } else if (cat.category === 'SEATING') {
    drawTable(ctx, item, cat, fp, originX, originY, tileW, tileH, scale, t);
  } else if (cat.category === 'LIGHTING') {
    drawLightingFixture(ctx, item, cat, originX, originY, tileW, tileH, scale, t);
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

  // 2. Main Bar Counter Chassis with Padded Purple/Magenta Panels & Glossy White Countertop
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
    '#f8fafc', // glossy white marble/acrylic bar top
    '#581c87', // padded deep purple front-left panel
    '#3b0764', // shaded dark violet side panel
    INK,
    2.2 * scale
  );

  // 3. Glowing Neon Magenta/Cyan Beveled Trim Inset on the Front Face of the Bar Counter
  const panelStartGx = item.gridX + 0.15;
  const panelStartGy = item.gridY + fp.depth;
  const panelEndGx = item.gridX + fp.width - 0.15;
  const panelEndGy = item.gridY + fp.depth;

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
    const gx = item.gridX + (alongY ? 0.5 : u * fp.width);
    const gy = item.gridY + (alongY ? u * fp.depth : 0.5);
    const cx = originX + (gx - gy) * halfW;
    const cy = originY + (gx + gy) * halfH - h;

    // Silver Cocktail Shaker with #111116 outline
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

  // 5. Round Cushioned Bar Stools with Metallic Bases arranged along the front edge
  const numStools = Math.max(2, lengthTiles);
  for (let s = 0; s < numStools; s++) {
    const sxGrid = alongY ? item.gridX + fp.width + 0.36 : item.gridX + s + 0.5;
    const syGrid = alongY ? item.gridY + s + 0.5 : item.gridY + fp.depth + 0.36;
    drawBarStool(ctx, sxGrid, syGrid, originX, originY, tileW, tileH, scale);
  }
}

/**
 * Draws the DJ Booth & Stage along the back-right neon-striped wall (Matching IMG_1506_5bdf15ca.jpeg):
 * - Detailed black-and-neon console table on a low stage riser
 * - Two circular vinyl turntables with spinning record grooves & silver tonearms
 * - Central mixer with glowing faders and an angled glowing laptop
 * - Stacked black studio monitor speakers with yellow/gold & silver speaker cones
 * - Gold record plaques and a golden crown trophy mounted beside the booth
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

  // 2. Flanking Tall Stacked Black Studio Monitor Speakers with Gold & Silver Speaker Cones (Left & Right of DJ Console)
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

  // 3. Detailed Black-and-Neon DJ Console Table
  const consoleH = 18 * scale;
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

  // 4. Two Circular Vinyl Turntables + Central Mixer with Glowing Faders + Angled Laptop on Console Top
  const deckCenterX = originX + (item.gridX + fp.width * 0.5 - (item.gridY + 0.45)) * halfW;
  const deckCenterY =
    originY + (item.gridX + fp.width * 0.5 + (item.gridY + 0.45)) * halfH - (riserH + consoleH);

  // Left & Right Circular Vinyl Turntables
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

  // Central 4-Channel DJ Mixer with Glowing Faders
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
 * Draws Detailed Tables & Seating (Matching IMG_1506_5bdf15ca.jpeg — NO plain brown rectangles!):
 * - Round high-top purple/neon cocktail tables with thin metallic pedestals and circular bases, paired with sleek cushioned club chairs
 * - Tufted purple/magenta VIP lounge booth sofas with black dining tables and glowing cocktail glasses/golden coins
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
    // Round High-Top Purple/Magenta Cocktail Table with Thin Metallic Pedestal, Circular Base & Cushioned Club Chairs
    const tx = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * halfW;
    const ty = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * halfH;

    // Companion Cushioned Club Chair behind table
    drawCushionedClubChair(ctx, tx - 14 * scale, ty - 4 * scale, scale, '#7e22ce');

    // Circular Chrome Base Plate with #111116 outline
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(tx, ty, 7.5 * scale, 3.8 * scale, 0, 0, Math.PI * 2);
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
    ctx.ellipse(tx, ty - 15.5 * scale, 14 * scale, 7.8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.ellipse(tx, ty - 17 * scale, 13.5 * scale, 7.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Glowing cocktail glass on high-top table
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(tx + 2 * scale, ty - 19.5 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();

    // Foreground Cushioned Club Chair
    drawCushionedClubChair(ctx, tx + 14 * scale, ty + 2 * scale, scale, '#9333ea');
  } else {
    // Tufted Purple/Magenta VIP Lounge Sofa & Black Lounge Dining Table (Matching back-left VIP booths in IMG_1506_5bdf15ca.jpeg)
    const seatH = 12 * scale;
    const backH = 13 * scale;
    const topPurple = cat.tier >= 3 ? '#9333ea' : '#7e22ce';
    const frontPurple = cat.tier >= 3 ? '#6b21a8' : '#581c87';
    const sidePurple = '#3b0764';

    // 1. Plush Cushioned Sofa Base
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      fp.width,
      fp.depth,
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
    const backW = fp.width >= fp.depth ? fp.width : 0.42;
    const backD = fp.depth > fp.width ? fp.depth : 0.42;
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
      const tGx = item.gridX + (fp.width >= fp.depth ? u * fp.width : 0.25);
      const tGy = item.gridY + (fp.depth > fp.width ? u * fp.depth : 0.25);
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

    // 3. Sleek Black VIP Lounge Table with Neon Gold/Cyan Rim in front of the Tufted Sofa
    const tableGx = item.gridX + (fp.width >= fp.depth ? 0.25 : 0.52);
    const tableGy = item.gridY + (fp.depth > fp.width ? 0.25 : 0.52);
    const tableW = Math.max(0.55, fp.width * 0.58);
    const tableD = Math.max(0.55, fp.depth * 0.58);
    drawIsoPrism(
      ctx,
      tableGx,
      tableGy,
      tableW,
      tableD,
      0,
      13.5 * scale,
      originX,
      originY,
      tileW,
      tileH,
      '#1e293b',
      '#0f172a',
      '#090d16',
      INK,
      1.8 * scale
    );

    // Bottle service / glowing cocktail glasses on VIP table
    const bx = originX + (tableGx + tableW * 0.5 - (tableGy + tableD * 0.5)) * halfW;
    const by = originY + (tableGx + tableW * 0.5 + (tableGy + tableD * 0.5)) * halfH - 14.5 * scale;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(bx - 3 * scale, by - 2 * scale, 2.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(bx + 3.5 * scale, by - 2.5 * scale, 2.6 * scale, 0, Math.PI * 2);
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

  // Circular Metallic Base Plate with #111116 outline
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 5.5 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Chrome Pedestal Stem & Footrest Ring
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 11.5 * scale);
  ctx.stroke();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 11.5 * scale);
  ctx.stroke();

  // Round Padded Neon-Purple Cushion Top with Specular Highlight
  ctx.fillStyle = '#7e22ce';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 12 * scale, 6.2 * scale, 3.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.ellipse(sx - 1 * scale, sy - 12.8 * scale, 3.5 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCushionedClubChair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  cushionColor: string
) {
  // Metallic pedestal base
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(x, y, 5.2 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 9.5 * scale);
  ctx.stroke();

  // Round cushioned seat
  ctx.fillStyle = cushionColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 10 * scale, 6.5 * scale, 3.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.7 * scale;
  ctx.stroke();

  // Curved padded backrest
  fillStrokeRoundedRect(
    ctx,
    x - 5.5 * scale,
    y - 18.5 * scale,
    11 * scale,
    7.5 * scale,
    3.5 * scale,
    '#a855f7',
    INK,
    1.7 * scale
  );
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
  t: number
) {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const tx = originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * halfW;
  const ty = originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * halfH;
  const th = 48 * scale;

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
  ctx.strokeStyle = cat.accentColor;
  ctx.lineWidth = 1.4 * scale;
  ctx.strokeRect(tx - 3 * scale, ty - th + 2 * scale, 6 * scale, th - 4 * scale);

  // Glowing top spotlight orb
  const orbY = ty - th - 4 * scale;
  ctx.fillStyle = cat.accentColor;
  ctx.beginPath();
  ctx.arc(tx, orbY, (6.5 + Math.sin(t * 4) * 1.2) * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();
}

function drawLightingBeams(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  _cat: CatalogItem,
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
  const sweepX = originX + Math.sin(t * 1.25 + item.gridX) * 110 * scale;
  const sweepY = originY + (130 + Math.cos(t * 0.95 + item.gridY) * 45) * scale;

  ctx.save();
  const grad = ctx.createLinearGradient(srcX, srcY, sweepX, sweepY);
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.36)');
  grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(srcX, srcY);
  ctx.lineTo(sweepX - 28 * scale, sweepY);
  ctx.lineTo(sweepX + 28 * scale, sweepY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the Chibi DJ with spiky magenta hair, cyan hoodie, and big DJ headphones behind the turntables
 * (matching the DJ in IMG_1506_5bdf15ca.jpeg).
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
  // Calm, smooth DJ head-bob to the beat
  const bounce = Math.sin(t * 2.8) * 1.4 * scale;

  // Chibi Hoodie Torso
  fillStrokeRoundedRect(
    ctx,
    px - 7.5 * scale,
    py - 19 * scale + bounce,
    15 * scale,
    15.5 * scale,
    4.5 * scale,
    role === 'DJ' ? '#22d3ee' : '#3b82f6',
    INK,
    2.0 * scale
  );

  // Oversized Chibi Head (1:1 head-to-body ratio)
  const headY = py - 27.5 * scale + bounce;
  const headR = 8.4 * scale;
  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(px, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1 * scale;
  ctx.stroke();

  // Spiky Magenta Punk DJ Hair (Matching DJ in IMG_1506_5bdf15ca.jpeg)
  ctx.fillStyle = role === 'DJ' ? '#ec4899' : '#111116';
  ctx.beginPath();
  ctx.moveTo(px - 8 * scale, headY - 2 * scale);
  ctx.lineTo(px - 9 * scale, headY - 10 * scale);
  ctx.lineTo(px - 3 * scale, headY - 7 * scale);
  ctx.lineTo(px, headY - 13 * scale);
  ctx.lineTo(px + 4 * scale, headY - 7 * scale);
  ctx.lineTo(px + 9 * scale, headY - 10 * scale);
  ctx.lineTo(px + 8 * scale, headY - 2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Crisp Dot Eyes
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(px - 2.6 * scale, headY + 0.5 * scale, 1.4 * scale, 0, Math.PI * 2);
  ctx.arc(px + 2.6 * scale, headY + 0.5 * scale, 1.4 * scale, 0, Math.PI * 2);
  ctx.fill();

  if (role === 'DJ') {
    // Oversized DJ Headphones with #111116 outline
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2 * scale;
    ctx.beginPath();
    ctx.arc(px, headY, 9.2 * scale, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(px - 8.6 * scale, headY + 0.5 * scale, 3.2 * scale, 0, Math.PI * 2);
    ctx.arc(px + 8.6 * scale, headY + 0.5 * scale, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  }
}

/**
 * Draws an interactive hired Staff Member (Bartender, Bouncer, or Waiter) on the isometric grid
 * with a natural-speed 60fps multi-limb Chibi walking stride animation, glowing dashed waypoint path trail,
 * target station beacon ring, and role-specific props (cocktail shaker, sunglasses, drink tray).
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
  const walkPhase = staff.walkCycle ?? t * 6.5 + (staff.gridX + staff.gridY) * 2.5;

  // Natural, unhurried stride cycle & gentle vertical bounce
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

  const roleAccent =
    staff.role === 'BARTENDER'
      ? '#38bdf8'
      : staff.role === 'BOUNCER'
      ? '#facc15'
      : '#f472b6';

  ctx.save();

  // 0. Glowing Dashed Waypoint Trail & Destination Station Beacon while Walking
  if (isWalking && staff.path.length > 0) {
    ctx.save();
    ctx.strokeStyle = roleAccent;
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.lineDashOffset = -t * 16 * scale;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let i = 0; i < staff.path.length; i++) {
      const wp = staff.path[i];
      const wx = originX + (wp.x - wp.y) * (tileW / 2);
      const wy = originY + (wp.x + wp.y) * (tileH / 2);
      ctx.lineTo(wx, wy);
    }
    ctx.stroke();

    const destWp = staff.path[staff.path.length - 1];
    const destX = originX + (destWp.x - destWp.y) * (tileW / 2);
    const destY = originY + (destWp.x + destWp.y) * (tileH / 2);
    const pulseRadius = (8.5 + Math.sin(t * 4) * 1.8) * scale;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = roleAccent;
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.ellipse(destX, destY, pulseRadius, pulseRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1. Glowing Role Station Halo & Dynamic Ground Shadow under Staff Member
  const ringColor =
    isRelocating
      ? '#22d3ee'
      : staff.role === 'BARTENDER'
      ? 'rgba(56, 189, 248, 0.55)'
      : staff.role === 'BOUNCER'
      ? 'rgba(250, 204, 21, 0.55)'
      : 'rgba(244, 114, 182, 0.55)';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(px, py, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ringColor;
  ctx.lineWidth = (isRelocating ? 2.4 : 1.6) * scale;
  ctx.beginPath();
  ctx.ellipse(px, py, 11 * scale, 5.5 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Animated Multi-Limb Walking Stride (Left & Right Legs + Sneakers)
  const leftStrideX = strideSin * 3.2 * scale;
  const rightStrideX = -strideSin * 3.2 * scale;
  const leftFootLift = isWalking ? Math.max(0, strideCos) * 2.2 * scale : 0;
  const rightFootLift = isWalking ? Math.max(0, -strideCos) * 2.2 * scale : 0;

  const hipY = py - 12.5 * scale - bounce;
  const leftFootX = px - 3.2 * scale + leftStrideX;
  const leftFootY = py - 1.2 * scale - leftFootLift;
  const rightFootX = px + 3.2 * scale + rightStrideX;
  const rightFootY = py - 1.2 * scale - rightFootLift;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.6 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px - 3.0 * scale + leanX * 0.4, hipY);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.moveTo(px + 3.0 * scale + leanX * 0.4, hipY);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.6 * scale;
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
      '#f8fafc',
      INK,
      1.4 * scale
    );
  }

  // 3. Role-Specific Chibi Torso / Uniform
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
    staff.uniformColor,
    INK,
    2.1 * scale
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
      '#1e293b',
      INK,
      1.3 * scale
    );
    const leftHandX = px - 9 * scale + leanX + armSwing;
    const leftHandY = py - 17 * scale - bounce;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 3 * scale;
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
      '#f5cba7',
      INK,
      1.4 * scale
    );

    // Smooth cocktail shaker motion
    const shakeOffset = (isWalking ? strideCos * 1.4 : Math.sin(t * 5.5) * 1.8) * scale;
    fillStrokeRoundedRect(
      ctx,
      px + 7.5 * scale + leanX - armSwing * 0.4,
      py - 25.5 * scale - bounce + shakeOffset,
      4.5 * scale,
      8.5 * scale,
      2 * scale,
      '#e2e8f0',
      INK,
      1.5 * scale
    );
  } else if (staff.role === 'BOUNCER') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(px + 3.8 * scale + leanX, py - 22.5 * scale - bounce, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (isWalking) {
      for (const side of [-1, 1]) {
        const handX = px + side * 9.5 * scale + leanX + side * armSwing;
        const handY = py - 16.5 * scale - bounce - side * armSwing * 0.25;
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 3.6 * scale;
        ctx.beginPath();
        ctx.moveTo(px + side * 7.2 * scale + leanX, py - 23 * scale - bounce);
        ctx.lineTo(handX, handY);
        ctx.stroke();
        fillStrokeRoundedRect(
          ctx,
          handX - 2.2 * scale,
          handY - 2.2 * scale,
          4.4 * scale,
          4.4 * scale,
          1.3 * scale,
          '#f5cba7',
          INK,
          1.4 * scale
        );
      }
    } else {
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 3.8 * scale;
      ctx.beginPath();
      ctx.moveTo(px - 7 * scale, py - 20.5 * scale - bounce);
      ctx.lineTo(px + 7 * scale, py - 19.5 * scale - bounce);
      ctx.stroke();
    }
  } else if (staff.role === 'WAITER') {
    fillStrokeRoundedRect(
      ctx,
      px - 4.5 * scale + leanX,
      py - 19 * scale - bounce,
      9 * scale,
      6.8 * scale,
      1.5 * scale,
      '#f8fafc',
      INK,
      1.3 * scale
    );

    const leftHandX = px - 8.5 * scale + leanX + armSwing;
    const leftHandY = py - 17 * scale - bounce;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 2.8 * scale;
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
      '#f5cba7',
      INK,
      1.3 * scale
    );

    const trayX = px + 11.5 * scale + leanX - armSwing * 0.25;
    const trayY = py - 25 * scale - bounce * 0.75;
    ctx.strokeStyle = staff.uniformColor;
    ctx.lineWidth = 2.8 * scale;
    ctx.beginPath();
    ctx.moveTo(px + 6 * scale + leanX, py - 21.5 * scale - bounce);
    ctx.lineTo(trayX, trayY + 2 * scale);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(trayX, trayY, 6.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * scale;
    ctx.stroke();

    fillStrokeRoundedRect(
      ctx,
      trayX - 2.2 * scale,
      trayY - 6.5 * scale,
      4.4 * scale,
      6 * scale,
      1.2 * scale,
      staff.carryingDrinkColor || '#22d3ee',
      INK,
      1.2 * scale
    );
  }

  // 4. Oversized Chibi Head & Expressive Face (1:1 Chibi head-to-body ratio)
  const headX = px + leanX * 1.1;
  const headY = py - 35 * scale - bounce;
  const headR = 8.8 * scale;

  ctx.fillStyle = '#f5cba7';
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * scale;
  ctx.stroke();

  const gazeShift = Math.max(-1.4, Math.min(1.4, isoDirX * 0.9)) * scale;
  if (staff.role === 'BOUNCER') {
    fillStrokeRoundedRect(
      ctx,
      headX - 6.2 * scale + gazeShift * 0.5,
      headY - 2 * scale,
      12.4 * scale,
      4.2 * scale,
      1.2 * scale,
      '#090518',
      '#38bdf8',
      1.3 * scale
    );
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(headX - 2.8 * scale + gazeShift, headY - 0.2 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.arc(headX + 2.8 * scale + gazeShift, headY - 0.2 * scale, 1.55 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylish Hair with #111116 outline
  ctx.fillStyle = staff.hairColor;
  ctx.beginPath();
  ctx.arc(headX, headY - 2 * scale, headR + 0.5 * scale, Math.PI * 0.94, Math.PI * 0.06);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0 * scale;
  ctx.stroke();

  // Circular Cocktail / Status Bubble above Bartender or Waiter (matching circular purple cocktail icons in IMG_1506_5bdf15ca.jpeg)
  const bubbleY = headY - 17 * scale;
  ctx.fillStyle = staff.role === 'BOUNCER' ? '#facc15' : '#9333ea';
  ctx.beginPath();
  ctx.arc(headX, bubbleY, 6.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
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
  clubBpm: number = 124
) {
  const px = originX + (gx - gy) * (tileW / 2);
  const py = originY + (gx + gy) * (tileH / 2);

  const isWalking = guest.path.length > 0;
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

  // Detect whether this patron is Sitting in a Chair/VIP Sofa vs Standing at a High-Top Cocktail Table or Bar Counter
  const isAtChairOrSofaZone =
    gx < 1.35 || // Left-wall tufted purple VIP lounge booths
    (gx > 7.45 && gy > 6.35) || // Corner VIP velvet booth
    // Seated club chair slot beside high-top bistro cocktail tables
    (Math.abs(gx - 1.12) < 0.35 && Math.abs(gy - 7.42) < 0.35) ||
    (Math.abs(gx - 4.12) < 0.35 && Math.abs(gy - 7.42) < 0.35);

  const isSittingInChair =
    !isWalking &&
    guest.state === 'RESTING_AT_SEAT' &&
    (isAtChairOrSofaZone || guest.id.includes('chair') || guest.id.includes('seat'));

  const isStandingAtTable =
    !isWalking &&
    !isSittingInChair &&
    (guest.state === 'ORDERING_DRINK' || guest.state === 'RESTING_AT_SEAT');

  // Smooth, relaxed half-tempo musical groove angular frequency (~2.6 rad/sec at 124 BPM -> ~0.83 gentle bobs/sec)
  const grooveOmega = (Math.max(90, Math.min(160, clubBpm)) / 60) * Math.PI * 0.82;
  const phase = t * grooveOmega + (guest.dancePhaseOffset ?? (gx * 2.1 + gy * 1.7));
  const beatSin = Math.sin(phase);
  const beatCos = Math.cos(phase);
  const halfBeatSin = Math.sin(phase * 0.5);

  // Walking kinematics (calm, natural stride when moving along path)
  const walkPhase = t * 5.8 + seed;
  const walkSin = isWalking ? Math.sin(walkPhase) : 0;
  const walkCos = isWalking ? Math.cos(walkPhase) : 0;

  // When sitting in a chair or VIP booth, lower the upper body onto the seat cushion (-6.0 * scale)
  const seatDrop = isSittingInChair ? -6.0 * scale : 0;

  let bounce =
    (isWalking
      ? Math.abs(walkSin) * 1.8
      : isSittingInChair
      ? Math.sin(t * 1.7 + seed) * 0.45
      : Math.sin(t * 2.1 + gx) * 0.75) *
      scale +
    seatDrop;
  let swayX = isStandingAtTable ? Math.sin(t * 1.5 + seed) * 0.8 * scale : 0;
  let bodyScaleX = 1;
  let leftLegDx = isWalking ? walkSin * 2.6 * scale : 0;
  let rightLegDx = isWalking ? -walkSin * 2.6 * scale : 0;
  let leftLegLift = isWalking ? Math.max(0, walkCos) * 1.8 * scale : 0;
  let rightLegLift = isWalking ? Math.max(0, -walkCos) * 1.8 * scale : 0;
  let leftHandOffsetX = (-9.5 + (isWalking ? -walkSin * 2.2 : 0)) * scale;
  let leftHandOffsetY = -16.5 * scale;
  let rightHandOffsetX = (6.5 + (isWalking ? walkSin * 2.2 : 0)) * scale;
  let rightHandOffsetY = -16.5 * scale;
  let headTiltX = isSittingInChair || isStandingAtTable ? Math.sin(t * 1.6 + seed) * 0.75 * scale : 0;
  let moveRingColor = isSittingInChair
    ? '#c084fc'
    : isStandingAtTable
    ? '#38bdf8'
    : 'rgba(255, 255, 255, 0.35)';

  if (isSittingInChair) {
    // Relaxed seated arm posture: left hand resting on lap/cushion, right hand holding drink or chatting
    leftHandOffsetX = -7.8 * scale;
    leftHandOffsetY = -14.2 * scale;
    rightHandOffsetX = 7.4 * scale;
    rightHandOffsetY = (-16.8 + Math.sin(t * 2.0 + seed) * 0.9) * scale;
  } else if (isStandingAtTable) {
    // Natural bar / high-top table standing posture: one hand resting by waist, other holding cocktail glass at table height
    leftHandOffsetX = -8.8 * scale;
    leftHandOffsetY = -15.8 * scale;
    rightHandOffsetX = 8.4 * scale;
    rightHandOffsetY = (-18.5 + Math.sin(t * 2.2 + seed) * 1.1) * scale;
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
  }

  // 0. Subtle Circular Floor Selection / Vibe Ring & Ground Shadow (Matching rings under patrons in IMG_1506_5bdf15ca.jpeg)
  ctx.save();
  ctx.strokeStyle = guest.isCelebrity ? '#facc15' : moveRingColor;
  ctx.lineWidth = 1.4 * scale;
  ctx.globalAlpha = isDancing ? 0.52 : 0.28;
  ctx.beginPath();
  ctx.ellipse(px + swayX * 0.4, py, 10.5 * scale, 5.2 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.beginPath();
  ctx.ellipse(px + swayX * 0.5, py, 8.8 * scale, 4.4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const torsoW = 14.0 * scale * bodyScaleX;
  const cx = px + swayX;

  // 1. Legs & Trendy Streetwear Sneakers with Thick #111116 Outlines
  const legW = 4.1 * scale * Math.max(0.75, bodyScaleX);

  if (isSittingInChair) {
    // True 2.5D Seated Posture: horizontal thighs resting on the chair/sofa cushion + bent lower calves hanging down
    const seatDir = gx < 4.5 ? 1 : -1; // Face inward toward table / dance floor
    const thighY = py - 8.2 * scale;
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
      guest.pantsColor,
      INK,
      1.8 * scale
    );
    fillStrokeRoundedRect(
      ctx,
      Math.min(cx + 0.4 * scale, rightKneeX),
      thighY + 0.6 * scale,
      6.4 * scale,
      3.8 * scale,
      1.6 * scale,
      guest.pantsColor,
      INK,
      1.8 * scale
    );

    // Bent lower calves hanging down from the cushion front edge
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 1.8 * scale,
      thighY + 1.8 * scale,
      3.8 * scale,
      5.8 * scale,
      1.5 * scale,
      guest.pantsColor,
      INK,
      1.8 * scale
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 1.8 * scale,
      thighY + 2.4 * scale,
      3.8 * scale,
      5.8 * scale,
      1.5 * scale,
      guest.pantsColor,
      INK,
      1.8 * scale
    );

    // Seated sneakers resting near the base of the chair/sofa
    fillStrokeRoundedRect(
      ctx,
      leftKneeX - 2.1 * scale,
      thighY + 6.4 * scale,
      4.8 * scale,
      2.7 * scale,
      1.1 * scale,
      '#f8fafc',
      INK,
      1.5 * scale
    );
    fillStrokeRoundedRect(
      ctx,
      rightKneeX - 2.1 * scale,
      thighY + 7.0 * scale,
      4.8 * scale,
      2.7 * scale,
      1.1 * scale,
      '#f8fafc',
      INK,
      1.5 * scale
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
      guest.pantsColor,
      INK,
      1.9 * scale
    );
    fillStrokeRoundedRect(
      ctx,
      rightLegX,
      rightLegY,
      legW,
      9.5 * scale,
      1.8 * scale,
      guest.pantsColor,
      INK,
      1.9 * scale
    );

    // White/Neon Streetwear Sneakers
    fillStrokeRoundedRect(
      ctx,
      leftLegX - 0.5 * scale,
      leftLegY + 7.5 * scale,
      legW + 1.2 * scale,
      3.0 * scale,
      1.2 * scale,
      '#f8fafc',
      INK,
      1.5 * scale
    );
    fillStrokeRoundedRect(
      ctx,
      rightLegX - 0.5 * scale,
      rightLegY + 7.5 * scale,
      legW + 1.2 * scale,
      3.0 * scale,
      1.2 * scale,
      '#f8fafc',
      INK,
      1.5 * scale
    );
  }

  // 2. Arms & Stylized Chibi Hands
  const leftHandX = cx + leftHandOffsetX;
  const leftHandY = py + leftHandOffsetY - bounce;
  const rightHandX = cx + rightHandOffsetX;
  const rightHandY = py + rightHandOffsetY - bounce;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.2 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5.8 * scale * bodyScaleX, py - 21 * scale - bounce);
  ctx.lineTo(leftHandX + 1.6 * scale, leftHandY + 1.6 * scale);
  ctx.moveTo(cx + 5.8 * scale * bodyScaleX, py - 21 * scale - bounce);
  ctx.lineTo(rightHandX + 1.6 * scale, rightHandY + 1.6 * scale);
  ctx.stroke();

  ctx.strokeStyle = guest.shirtColor;
  ctx.lineWidth = 3.0 * scale;
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
    skinTone,
    INK,
    1.6 * scale
  );
  fillStrokeRoundedRect(
    ctx,
    rightHandX,
    rightHandY,
    3.6 * scale,
    3.6 * scale,
    1.2 * scale,
    skinTone,
    INK,
    1.6 * scale
  );

  // When Standing at a High-Top Table / Bar Counter or Seated with a Drink, draw a glowing cocktail glass in the right hand
  if (isStandingAtTable || (isSittingInChair && seed % 2 === 0)) {
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
      drinkColor,
      INK,
      1.3 * scale
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gxGlass - 1.2 * scale, gyGlass - 3.0 * scale, 2.4 * scale, 1.1 * scale);
  }

  // 3. Chibi Streetwear Torso (Hoodie, Vest, or Stylish Club Dress — 14px height to match 1:1 Chibi head!)
  fillStrokeRoundedRect(
    ctx,
    cx - torsoW * 0.5,
    py - 24.5 * scale - bounce,
    torsoW,
    (isDressOutfit && !isSittingInChair ? 16.0 : 14.0) * scale,
    4.5 * scale,
    guest.shirtColor,
    INK,
    2.2 * scale
  );

  // Streetwear Vest / Graphic Hoodie Accents
  if (seed % 3 === 1) {
    // Contrasting center tee / open jacket placket
    fillStrokeRoundedRect(
      ctx,
      cx - 2.4 * scale * bodyScaleX,
      py - 24.0 * scale - bounce,
      4.8 * scale * bodyScaleX,
      13.0 * scale,
      1.4 * scale,
      '#f8fafc',
      INK,
      1.3 * scale
    );
  } else if (seed % 3 === 2) {
    // Neon chest stripe
    ctx.fillStyle = '#fde047';
    ctx.fillRect(
      cx - 4.5 * scale * bodyScaleX,
      py - 19.5 * scale - bounce,
      9 * scale * bodyScaleX,
      2.2 * scale
    );
  }

  // 4. Oversized Rounded Chibi Head (1:1 head-to-body ratio, radius 9.0 * scale, thick #111116 outline)
  const headX = cx + headTiltX;
  const headY = py - 34.2 * scale - bounce;
  const headR = 9.0 * scale;

  // If Voluminous Afro (hairVariant === 1), draw the back Afro puff Halo behind the head first
  if (hairVariant === 1) {
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 2.2 * scale, headR + 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.3 * scale;
    ctx.stroke();
  }

  // Rounded Chibi Face
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3 * scale;
  ctx.stroke();

  // 5. Distinct Stylish Hairstyles & Headgear (Afros, Double Buns, Spiky Hair, Caps, Beanies)
  if (hairVariant === 0) {
    // Trendy Streetwear Baseball Cap with Visor
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(headX, headY - 2 * scale, headR + 0.4 * scale, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();

    fillStrokeRoundedRect(
      ctx,
      headX + 0.5 * scale,
      headY - 4.0 * scale,
      9.8 * scale,
      3.2 * scale,
      1.5 * scale,
      '#0284c7',
      INK,
      1.7 * scale
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
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();
  } else if (hairVariant === 3) {
    // Ribbed Knit Street Beanie with Top Pom
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(headX, headY - 2.5 * scale, headR + 0.5 * scale, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();

    fillStrokeRoundedRect(
      ctx,
      headX - 9.2 * scale,
      headY - 5.5 * scale,
      18.4 * scale,
      4.0 * scale,
      2 * scale,
      '#f472b6',
      INK,
      1.8 * scale
    );
  } else if (hairVariant === 4) {
    // Stylish Double Space Buns + Bangs
    ctx.fillStyle = guest.hairColor;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(headX + side * 7.2 * scale, headY - 7.8 * scale, 3.8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9 * scale;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(headX, headY - 2.2 * scale, headR + 0.3 * scale, Math.PI * 0.95, Math.PI * 0.05);
    ctx.fill();
    ctx.stroke();
  } else {
    // Sleek Side-Swept Club Hair
    ctx.fillStyle = guest.hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 2.0 * scale, headR + 0.5 * scale, Math.PI * 0.92, Math.PI * 0.08);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0 * scale;
    ctx.stroke();
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
      guest.isCelebrity ? '#facc15' : '#22d3ee',
      INK,
      1.6 * scale
    );
  } else {
    // Signature Chibi Black Dot Eyes with tiny white specular catchlight
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

  // 7. Crisp Circular Speech / Thought Bubbles & Floating Dark Patron Quote Tooltip (Matching IMG_1506_5bdf15ca.jpeg)
  if (guest.name === 'Mia H.' || guest.id === 'g_dance_2') {
    drawPatronQuoteTooltip(
      ctx,
      headX,
      headY - 22 * scale,
      scale,
      'MIA H.',
      "I think I'm in love."
    );
  } else if (guest.bubble) {
    drawIllustratedSpeechBubble(ctx, headX, headY - 20 * scale, scale, guest.bubble);
  } else if (seed % 3 === 0) {
    // Subtle circular status badge ($, ★, or ♛) matching the overhead circles in IMG_1506_5bdf15ca.jpeg
    const badgeType: BubbleType =
      seed % 9 === 0 ? 'VIP_CROWN' : seed % 6 === 0 ? 'CASH' : 'SPARKLE';
    drawIllustratedSpeechBubble(ctx, headX, headY - 19 * scale, scale * 0.88, badgeType);
  }
}

const drawIllustratedCharacter = drawCharacter;

/**
 * Draws the dark translucent rounded patron quote card ("MIA H. / I think I'm in love.")
 * with floating pink heart icons matching the bottom-center of IMG_1506_5bdf15ca.jpeg.
 */
function drawPatronQuoteTooltip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  name: string,
  quote: string
) {
  ctx.save();
  const s = Math.max(0.85, scale);
  const boxW = 86 * s;
  const boxH = 26 * s;

  fillStrokeRoundedRect(
    ctx,
    x - boxW / 2,
    y - boxH / 2,
    boxW,
    boxH,
    6 * s,
    'rgba(17, 17, 22, 0.92)',
    '#38bdf8',
    1.6 * s
  );

  ctx.fillStyle = '#38bdf8';
  ctx.font = `900 ${Math.max(7, Math.round(7.5 * s))}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y - 3 * s);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 ${Math.max(7, Math.round(7.5 * s))}px "Outfit", sans-serif`;
  ctx.fillText(quote, x, y + 7.5 * s);

  // Floating pink heart cluster below tooltip
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
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the crisp circular white/gold/purple speech & thought bubbles with thick #111116 black outlines
 * (music notes ♫, cocktail drink glasses, golden $ coins, golden crowns ♛, purple ★ badges, and exclamation marks)
 * matching IMG_1506_5bdf15ca.jpeg.
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

  // Determine circular bubble background style matching IMG_1506_5bdf15ca.jpeg:
  // - White circles with thick #111116 outlines for Music Notes (♫), Crowns (♛), Drinks, and Alerts (!)
  // - Golden coin circles for Cash ($)
  // - Deep purple circles for Star (★) vibe badges
  const isCashCoin = bubble === 'CASH';
  const isPurpleStar = bubble === 'SPARKLE';
  const r = (isCashCoin || isPurpleStar ? 8.5 : 11.5) * s;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(x, y + 1.5 * s, r, 0, Math.PI * 2);
  ctx.fill();

  // Main Circular Bubble with Thick #111116 Black Outline
  ctx.fillStyle = isCashCoin ? '#eab308' : isPurpleStar ? '#581c87' : '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.1 * s;
  ctx.stroke();

  // Small bottom pointer tail for large white thought/speech bubbles
  if (!isCashCoin && !isPurpleStar) {
    ctx.beginPath();
    ctx.moveTo(x - 3.2 * s, y + r - 1 * s);
    ctx.lineTo(x, y + r + 4.5 * s);
    ctx.lineTo(x + 3.2 * s, y + r - 1 * s);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
  }

  if (bubble === 'MUSIC') {
    // Crisp Black Beamed Music Note (♫) inside White Circle (matching dancers in IMG_1506_5bdf15ca.jpeg)
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(13.5 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', x, y + 0.5 * s);
  } else if (bubble === 'VIP_CROWN') {
    // Golden Crown inside White Circle (matching crown bubbles on the dance floor in IMG_1506_5bdf15ca.jpeg)
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y + 3.5 * s);
    ctx.lineTo(x - 6.5 * s, y - 3.5 * s);
    ctx.lineTo(x - 2.5 * s, y - 0.5 * s);
    ctx.lineTo(x, y - 5 * s);
    ctx.lineTo(x + 2.5 * s, y - 0.5 * s);
    ctx.lineTo(x + 6.5 * s, y - 3.5 * s);
    ctx.lineTo(x + 5.5 * s, y + 3.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
  } else if (bubble === 'CASH') {
    // Golden Dollar Coin ($)
    ctx.fillStyle = '#fef08a';
    ctx.font = `900 ${Math.round(11 * s)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 0.5 * s);
  } else if (bubble === 'SPARKLE') {
    // Gold Star (★) inside Purple Circle
    ctx.fillStyle = '#facc15';
    ctx.font = `900 ${Math.round(10.5 * s)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x, y + 0.5 * s);
  } else if (bubble === 'COCKTAIL' || bubble === 'BEER') {
    // Neon Cocktail Martini Glass with #111116 outline
    ctx.fillStyle = bubble === 'COCKTAIL' ? '#ec4899' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(x - 5.5 * s, y - 4.5 * s);
    ctx.lineTo(x + 5.5 * s, y - 4.5 * s);
    ctx.lineTo(x, y + 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + 1 * s);
    ctx.lineTo(x, y + 5.5 * s);
    ctx.moveTo(x - 3.5 * s, y + 5.5 * s);
    ctx.lineTo(x + 3.5 * s, y + 5.5 * s);
    ctx.stroke();
  } else {
    // Bold Exclamation Mark (!) inside White Circle
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
  activeDrink: DrinkMix,
  sequencer: RhythmicLightingSequencerState
) {
  // Base emissive intensity scales with nightIntensity and the BPM-synced rhythmic sequencer pulse
  const baseNightGlow = Math.min(1.0, 0.24 + cycle.nightIntensity * 0.76);
  if (baseNightGlow <= 0.05) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 0. Central Dance Floor BPM-Synced Pulsing Light Wash & Expanding Beat Ring
  const dfCenterGx = 4.0;
  const dfCenterGy = 4.0;
  const dfCx = originX + (dfCenterGx - dfCenterGy) * (tileW / 2);
  const dfCy = originY + (dfCenterGx + dfCenterGy) * (tileH / 2);
  const dfPulseRadius = (105 + sequencer.danceFloorPulse * 38) * scale;
  const dfWash = ctx.createRadialGradient(dfCx, dfCy, 4 * scale, dfCx, dfCy, dfPulseRadius);
  const washColors = [
    ['34, 211, 238', '236, 72, 153'],
    ['236, 72, 153', '168, 85, 247'],
    ['74, 222, 128', '34, 211, 238'],
    ['250, 204, 21', '236, 72, 153'],
  ];
  const [primaryRgb, secondaryRgb] = washColors[sequencer.barStep4 % washColors.length];
  const washAlpha = (0.14 + sequencer.danceFloorPulse * 0.22) * baseNightGlow;
  dfWash.addColorStop(0, `rgba(${primaryRgb}, ${washAlpha.toFixed(3)})`);
  dfWash.addColorStop(0.55, `rgba(${secondaryRgb}, ${(washAlpha * 0.52).toFixed(3)})`);
  dfWash.addColorStop(1, `rgba(${primaryRgb}, 0)`);
  ctx.fillStyle = dfWash;
  ctx.beginPath();
  ctx.ellipse(dfCx, dfCy, dfPulseRadius, dfPulseRadius * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

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
    lampPool.addColorStop(0, `rgba(56, 189, 248, ${(0.22 * baseNightGlow).toFixed(3)})`);
    lampPool.addColorStop(0.5, `rgba(250, 204, 21, ${(0.1 * baseNightGlow).toFixed(3)})`);
    lampPool.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = lampPool;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 42 * scale, 22 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Placed Items Emissive Neon Glow (Toggled & modulated in sync with the club BPM sequencer)
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

    const itemSeq = sequencer.getDecorEmissiveState(item.gridX, item.gridY, i);
    const glowStrength =
      baseNightGlow *
      (itemSeq.isToggledOn
        ? 0.55 + itemSeq.emissiveIntensity * 0.72
        : 0.16);

    if (cat.category === 'DANCE_TILE') {
      // Radiant upward disco floor bloom that toggles and pulses on the BPM beat grid
      const rx = Math.max(1, fp.width) * tileW * (0.64 + sequencer.danceFloorPulse * 0.24);
      const ry = Math.max(1, fp.depth) * tileH * (0.64 + sequencer.danceFloorPulse * 0.24);
      const colorPhase = (item.gridX * 3 + item.gridY * 5 + sequencer.barStep4) % 3;
      const neonRgb =
        colorPhase === 0
          ? '34, 211, 238' // cyan
          : colorPhase === 1
          ? '244, 114, 182' // magenta pink
          : '168, 85, 247'; // electric purple

      const tileGlow = ctx.createRadialGradient(cx, cy - 4 * scale, 2 * scale, cx, cy - 4 * scale, rx);
      tileGlow.addColorStop(
        0,
        `rgba(${neonRgb}, ${Math.min(0.85, 0.22 * glowStrength * tierBoost).toFixed(3)})`
      );
      tileGlow.addColorStop(
        0.55,
        `rgba(${neonRgb}, ${Math.min(0.6, 0.1 * glowStrength * tierBoost).toFixed(3)})`
      );
      tileGlow.addColorStop(1, `rgba(${neonRgb}, 0)`);

      ctx.fillStyle = tileGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4 * scale, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.category === 'BAR_UNIT') {
      // Under-counter LED strip & glowing top bar counter aura pulsing with BPM
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
        `rgba(56, 189, 248, ${Math.min(0.85, 0.28 * glowStrength * tierBoost).toFixed(3)})`
      );
      barGlow.addColorStop(
        0.5,
        `rgba(236, 72, 153, ${Math.min(0.65, 0.14 * glowStrength * tierBoost).toFixed(3)})`
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
      // Intense Magenta & Cyan Stage Console Neon Bloom synced to downbeat kick
      const djRadius = (60 + sequencer.kickEnvelope * 18) * scale * tierBoost;
      const djGlow = ctx.createRadialGradient(
        cx,
        cy - 20 * scale,
        3 * scale,
        cx,
        cy - 20 * scale,
        djRadius
      );
      djGlow.addColorStop(0, `rgba(244, 114, 182, ${Math.min(0.9, 0.38 * glowStrength).toFixed(3)})`);
      djGlow.addColorStop(0.45, `rgba(56, 189, 248, ${Math.min(0.7, 0.2 * glowStrength).toFixed(3)})`);
      djGlow.addColorStop(1, 'rgba(244, 114, 182, 0)');

      ctx.fillStyle = djGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 20 * scale, djRadius, djRadius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cat.category === 'LIGHTING') {
      // High-intensity overhead fixture orb bloom + sweeping floor spotlight pool
      const orbY = cy - 50 * scale;
      const orbRadius = (26 + cat.tier * 10 + sequencer.kickEnvelope * 8) * scale;
      const orbGlow = ctx.createRadialGradient(cx, orbY, 2 * scale, cx, orbY, orbRadius);
      orbGlow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.95, 0.5 * glowStrength).toFixed(3)})`);
      orbGlow.addColorStop(0.35, `rgba(34, 211, 238, ${Math.min(0.8, 0.34 * glowStrength).toFixed(3)})`);
      orbGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Floor spotlight pool directly beneath or sweeping from light fixture
      const poolX = cx + Math.sin(t * 2.1 + item.gridX) * 24 * scale;
      const poolY = cy + Math.cos(t * 1.7 + item.gridY) * 12 * scale;
      const poolR = (34 + cat.tier * 11 + sequencer.danceFloorPulse * 12) * scale;
      const poolGrad = ctx.createRadialGradient(poolX, poolY, 2 * scale, poolX, poolY, poolR);
      poolGrad.addColorStop(0, `rgba(236, 72, 153, ${Math.min(0.8, 0.3 * glowStrength).toFixed(3)})`);
      poolGrad.addColorStop(0.5, `rgba(34, 211, 238, ${Math.min(0.5, 0.15 * glowStrength).toFixed(3)})`);
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
        seatGlow.addColorStop(0, `rgba(192, 132, 252, ${Math.min(0.75, 0.28 * glowStrength).toFixed(3)})`);
        seatGlow.addColorStop(0.55, `rgba(56, 189, 248, ${Math.min(0.45, 0.12 * glowStrength).toFixed(3)})`);
        seatGlow.addColorStop(1, 'rgba(192, 132, 252, 0)');
      } else {
        seatGlow.addColorStop(0, `rgba(251, 191, 36, ${Math.min(0.6, 0.2 * glowStrength).toFixed(3)})`);
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
  clubBpm: number
): RhythmicLightingSequencerState {
  const safeBpm = Math.max(85, Math.min(180, clubBpm || 124));
  const beatsPerSec = safeBpm / 60;
  const totalBeats = t * beatsPerSec;
  const beatPhase = totalBeats - Math.floor(totalBeats);
  const barStep4 = Math.floor(totalBeats) % 4;
  const step16 = Math.floor(totalBeats * 4) % 16;

  // Punchy exponential decay on each quarter-note beat for realistic club kick-drum light pulsing
  const kickEnvelope = Math.pow(1 - beatPhase, 2.15);
  const halfBeatEnv = Math.pow(1 - ((totalBeats * 2) % 1), 1.85);
  const danceFloorPulse = 0.35 + 0.65 * kickEnvelope;

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
 * Slot-selection & Personal-Space Separation Helpers for Natural Bar, Table, Chair, and Dance Floor Behavior
 */
function pickMostSeparatedSlot(
  candidates: Array<{ x: number; y: number }>,
  guests: GuestAgent[],
  floor: 1 | 2,
  excludeGuestId: string
): { x: number; y: number } {
  if (candidates.length === 0) return { x: 4.0, y: 4.0 };
  const floorGuests = guests.filter(
    (g) => g.floor === floor && g.id !== excludeGuestId && g.state !== 'QUEUEING'
  );
  if (floorGuests.length === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Score each candidate slot by its minimum distance to any other patron or their target destination
  let bestSlot = candidates[0];
  let bestScore = -Infinity;

  for (const cand of candidates) {
    let minDist = Infinity;
    for (const fg of floorGuests) {
      const targetPt = fg.path.length > 0 ? fg.path[fg.path.length - 1] : { x: fg.gridX, y: fg.gridY };
      const dCurrent = Math.hypot(cand.x - fg.gridX, cand.y - fg.gridY);
      const dTarget = Math.hypot(cand.x - targetPt.x, cand.y - targetPt.y);
      const d = Math.min(dCurrent, dTarget);
      if (d < minDist) minDist = d;
    }
    // Add slight random jitter so ties pick naturally varied spots
    const score = minDist + Math.random() * 0.18;
    if (score > bestScore) {
      bestScore = score;
      bestSlot = cand;
    }
  }

  return bestSlot;
}

function pickSeparatedBarSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: 1 | 2,
  excludeGuestId: string
): { x: number; y: number } {
  const barItems = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'BAR_UNIT'
  );
  const candidates: Array<{ x: number; y: number }> = [];

  for (const bar of barItems) {
    const cat = getCatalogItem(bar.catalogId);
    if (!cat) continue;
    const fp = getRotatedFootprint(cat, bar.rotation);
    if (fp.width >= fp.depth) {
      // Horizontal bar along back wall: customer standing/stool spots in front of counter
      for (let step = 0.25; step < fp.width; step += 1.05) {
        candidates.push({
          x: Math.min(9.1, Math.max(0.4, bar.gridX + step)),
          y: Math.min(9.1, Math.max(0.4, bar.gridY + fp.depth + 0.18)),
        });
      }
    } else {
      // Vertical bar along right side: customer standing/stool spots on the interior side of the counter
      const customerX = bar.gridX > 4 ? bar.gridX - 0.72 : bar.gridX + fp.width + 0.22;
      for (let step = 0.25; step < fp.depth; step += 1.08) {
        candidates.push({
          x: Math.min(9.1, Math.max(0.4, customerX)),
          y: Math.min(9.1, Math.max(0.4, bar.gridY + step)),
        });
      }
    }
  }

  if (candidates.length === 0) {
    candidates.push({ x: 6.28, y: 2.35 }, { x: 6.28, y: 3.55 }, { x: 6.28, y: 5.35 }, { x: 1.45, y: 1.2 });
  }

  return pickMostSeparatedSlot(candidates, guests, floor, excludeGuestId);
}

function pickSeparatedSeatOrTableSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: 1 | 2,
  excludeGuestId: string
): { x: number; y: number } {
  const seatItems = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'SEATING'
  );
  const candidates: Array<{ x: number; y: number }> = [];

  for (const seat of seatItems) {
    const cat = getCatalogItem(seat.catalogId);
    if (!cat) continue;
    const fp = getRotatedFootprint(cat, seat.rotation);

    if (cat.id === 'seat_bistro') {
      // High-top cocktail table:
      // 1) Seated slot directly on the cushioned club chair
      candidates.push({ x: seat.gridX + 0.12, y: seat.gridY + 0.42 });
      // 2) Standing slots naturally spaced beside the high-top cocktail table
      candidates.push({ x: seat.gridX + 0.92, y: seat.gridY + 0.18 });
      candidates.push({ x: seat.gridX + 0.68, y: seat.gridY + 0.96 });
    } else {
      // Tufted VIP lounge booth / couch: well-separated cushion slots along the sofa
      if (fp.depth >= fp.width) {
        candidates.push({ x: seat.gridX + 0.35, y: seat.gridY + 0.28 });
        if (fp.depth > 1) {
          candidates.push({ x: seat.gridX + 0.35, y: seat.gridY + 1.38 });
        }
      } else {
        candidates.push({ x: seat.gridX + 0.28, y: seat.gridY + 0.35 });
        if (fp.width > 1) {
          candidates.push({ x: seat.gridX + 1.38, y: seat.gridY + 0.35 });
        }
      }
    }
  }

  if (candidates.length === 0) {
    candidates.push({ x: 0.35, y: 1.3 }, { x: 1.12, y: 7.42 }, { x: 4.92, y: 7.18 });
  }

  return pickMostSeparatedSlot(candidates, guests, floor, excludeGuestId);
}

function pickSeparatedDanceSlot(
  items: PlacedItem[],
  guests: GuestAgent[],
  floor: 1 | 2,
  excludeGuestId: string
): { x: number; y: number } {
  const danceTiles = items.filter(
    (it) => it.floor === floor && getCatalogItem(it.catalogId)?.category === 'DANCE_TILE'
  );
  const candidates: Array<{ x: number; y: number }> = [];

  for (const dt of danceTiles) {
    candidates.push({
      x: dt.gridX + 0.18 + ((dt.gridY * 3) % 5) * 0.12,
      y: dt.gridY + 0.18 + ((dt.gridX * 3) % 5) * 0.12,
    });
  }

  if (candidates.length === 0) {
    candidates.push({ x: 3.5, y: 3.5 }, { x: 4.6, y: 4.6 });
  }

  return pickMostSeparatedSlot(candidates, guests, floor, excludeGuestId);
}

function applyGuestPersonalSpaceSeparation(guests: GuestAgent[], dt: number) {
  const minSpacing = 0.92; // Minimum comfortable personal space in grid tiles
  const pushRate = Math.min(0.25, dt * 1.85);

  for (let i = 0; i < guests.length; i++) {
    const a = guests[i];
    if (a.state === 'QUEUEING' || a.path.length > 0) continue;

    for (let j = i + 1; j < guests.length; j++) {
      const b = guests[j];
      if (b.floor !== a.floor || b.state === 'QUEUEING' || b.path.length > 0) continue;

      const dx = b.gridX - a.gridX;
      const dy = b.gridY - a.gridY;
      const dist = Math.hypot(dx, dy);

      if (dist < minSpacing) {
        const overlap = (minSpacing - dist) * pushRate;
        const angle = dist > 0.001 ? Math.atan2(dy, dx) : (i * 1.7 + j * 2.3);
        const ux = Math.cos(angle) * overlap * 0.5;
        const uy = Math.sin(angle) * overlap * 0.5;

        a.gridX = Math.max(0.28, Math.min(9.2, a.gridX - ux));
        a.gridY = Math.max(0.28, Math.min(9.2, a.gridY - uy));
        b.gridX = Math.max(0.28, Math.min(9.2, b.gridX + ux));
        b.gridY = Math.max(0.28, Math.min(9.2, b.gridY + uy));
      }
    }
  }
}


