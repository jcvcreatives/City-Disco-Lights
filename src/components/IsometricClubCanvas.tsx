import React, { useEffect, useRef } from 'react';
import {
  BubbleType,
  CatalogItem,
  DrinkMix,
  FloatingText,
  GuestAgent,
  ParkingUpgradeState,
  PlacedItem,
} from '../types/game';
import {
  canPlaceItem,
  DOOR_COORD,
  getCatalogItem,
  getRotatedFootprint,
  GRID_SIZE,
  STAIRS_COORD,
} from '../utils/pathfinding';

interface IsometricClubCanvasProps {
  activeFloor: 1 | 2;
  unlockedFloors: 1 | 2;
  playerLevel: number;
  placedItems: PlacedItem[];
  guests: GuestAgent[];
  floatingTexts: FloatingText[];
  buildModeItem: CatalogItem | null;
  buildRotation: 0 | 90 | 180 | 270;
  hoveredGrid: { x: number; y: number } | null;
  activeDrink: DrinkMix;
  parkingState: ParkingUpgradeState;
  isRemoveMode: boolean;
  onHoverGrid: (coord: { x: number; y: number } | null) => void;
  onClickGrid: (coord: { x: number; y: number }) => void;
  onClickBuyFloor2: () => void;
  onClickPlacedItem?: (item: PlacedItem) => void;
}

const TILE_W = 58;
const TILE_H = 29;

export const IsometricClubCanvas: React.FC<IsometricClubCanvasProps> = ({
  activeFloor,
  unlockedFloors,
  playerLevel,
  placedItems,
  guests,
  floatingTexts,
  buildModeItem,
  buildRotation,
  hoveredGrid,
  activeDrink,
  parkingState,
  isRemoveMode,
  onHoverGrid,
  onClickGrid,
  onClickBuyFloor2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stairsHitboxRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  // Convert (gridX, gridY, z) to screen pixel coordinates
  const isoToScreen = (gx: number, gy: number, z: number, originX: number, originY: number) => {
    const sx = originX + (gx - gy) * (TILE_W / 2);
    const sy = originY + (gx + gy) * (TILE_H / 2) - z;
    return { x: sx, y: sy };
  };

  // Convert screen pixel coordinates back to isometric grid (gridX, gridY)
  const screenToIso = (sx: number, sy: number, originX: number, originY: number) => {
    const dx = sx - originX;
    const dy = sy - originY;
    const gx = Math.floor((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
    const gy = Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
    return { x: gx, y: gy };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = (timeMs: number) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const originX = width * 0.51;
      const originY = height * 0.31;
      const t = timeMs * 0.001;

      // 1. DEEP MIDNIGHT CYBERPUNK SKY & CITY SKYLINE
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#090518');
      skyGrad.addColorStop(0.45, '#190e36');
      skyGrad.addColorStop(1, '#110c22');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      drawCitySkyline(ctx, width, height, originX, originY, t);

      // 2. OUTSIDE STREET, PARKING LOT & VELVET ROPE QUEUE (Left & Bottom-Left of Club)
      drawParkingAndStreet(ctx, originX, originY, t, parkingState, guests);

      // 3. CLUB FLOOR BASE & BACK BRICK WALLS
      drawClubWallsAndFloor(
        ctx,
        originX,
        originY,
        t,
        activeFloor,
        unlockedFloors,
        playerLevel,
        stairsHitboxRef
      );

      // 4. DANCE FLOOR TILES (Rendered flat on the floor before 3D furniture & guests)
      const floorItems = placedItems.filter((p) => p.floor === activeFloor);
      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category !== 'DANCE_TILE') continue;
        drawDanceTileItem(ctx, item, cat, originX, originY, t);
      }

      // 5. GHOSTED GREEN/RED PLACEMENT PREVIEW OVERLAY (When in Build Mode)
      if (buildModeItem && hoveredGrid) {
        const valid = canPlaceItem(
          placedItems,
          buildModeItem,
          activeFloor,
          hoveredGrid.x,
          hoveredGrid.y,
          buildRotation
        );
        const fp = getRotatedFootprint(buildModeItem, buildRotation);
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
              valid ? 'rgba(74, 222, 128, 0.45)' : 'rgba(248, 113, 113, 0.48)',
              valid ? '#4ade80' : '#f87171',
              2
            );
          }
        }
      } else if (isRemoveMode && hoveredGrid) {
        drawIsoTilePolygon(
          ctx,
          hoveredGrid.x,
          hoveredGrid.y,
          0,
          originX,
          originY,
          'rgba(244, 63, 94, 0.38)',
          '#fb7185',
          2
        );
      }

      // 6. PAINTER'S ALGORITHM DEPTH SORT FOR 3D FURNITURE & GUESTS
      const drawables: Array<{ depth: number; draw: () => void }> = [];

      for (const item of floorItems) {
        const cat = getCatalogItem(item.catalogId);
        if (!cat || cat.category === 'DANCE_TILE') continue;
        const fp = getRotatedFootprint(cat, item.rotation);
        const depth = item.gridX + item.gridY + (fp.width + fp.depth) * 0.5;
        drawables.push({
          depth,
          draw: () => draw3DFurnitureItem(ctx, item, cat, fp, originX, originY, t, activeDrink),
        });
      }

      // Bartender NPC behind the primary bar
      const primaryBar = floorItems.find((i) => getCatalogItem(i.catalogId)?.category === 'BAR_UNIT');
      if (primaryBar) {
        const barDepth = primaryBar.gridX + primaryBar.gridY + 0.8;
        drawables.push({
          depth: barDepth,
          draw: () =>
            drawStaffAvatar(
              ctx,
              primaryBar.gridX + 1,
              primaryBar.gridY + 0.15,
              originX,
              originY,
              t,
              'BARTENDER'
            ),
        });
      }

      // DJ NPC behind the DJ booth
      const primaryDj = floorItems.find((i) => getCatalogItem(i.catalogId)?.category === 'DJ_BOOTH');
      if (primaryDj) {
        const djDepth = primaryDj.gridX + primaryDj.gridY + 0.7;
        drawables.push({
          depth: djDepth,
          draw: () =>
            drawStaffAvatar(
              ctx,
              primaryDj.gridX + 0.6,
              primaryDj.gridY + 0.1,
              originX,
              originY,
              t,
              'DJ'
            ),
        });
      }

      // Guests on current active floor
      const floorGuests = guests.filter((g) => g.floor === activeFloor && g.state !== 'QUEUEING');
      for (const guest of floorGuests) {
        const depth = guest.gridX + guest.gridY + 0.6;
        drawables.push({
          depth,
          draw: () => drawGuestCharacter(ctx, guest, originX, originY, t),
        });
      }

      drawables.sort((a, b) => a.depth - b.depth);
      for (const d of drawables) {
        d.draw();
      }

      // 7. VOLUMETRIC LASER BEAMS & DISCO SPOTLIGHTS (Foreground Atmosphere)
      const lightItems = floorItems.filter(
        (i) => getCatalogItem(i.catalogId)?.category === 'LIGHTING'
      );
      for (const lItem of lightItems) {
        const cat = getCatalogItem(lItem.catalogId);
        if (cat) {
          drawLightingBeams(ctx, lItem, cat, originX, originY, t);
        }
      }

      // 8. FLOATING CASH & HYPE TEXTS
      const floorFloats = floatingTexts.filter((f) => f.floor === activeFloor);
      for (const ft of floorFloats) {
        const pos = isoToScreen(ft.gridX, ft.gridY, 44 + ft.age * 32, originX, originY);
        ctx.save();
        ctx.font = '700 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.age);
        ctx.fillStyle = '#090518';
        ctx.fillText(ft.text, pos.x + 1, pos.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, pos.x, pos.y);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    activeFloor,
    unlockedFloors,
    playerLevel,
    placedItems,
    guests,
    floatingTexts,
    buildModeItem,
    buildRotation,
    hoveredGrid,
    activeDrink,
    parkingState,
    isRemoveMode,
  ]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const originX = rect.width * 0.51;
    const originY = rect.height * 0.31;

    const iso = screenToIso(sx, sy, originX, originY);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      onHoverGrid(iso);
    } else {
      onHoverGrid(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Check if player clicked the "BUY FLOOR 2" staircase sign
    const hb = stairsHitboxRef.current;
    if (
      sx >= hb.x &&
      sx <= hb.x + hb.w &&
      sy >= hb.y &&
      sy <= hb.y + hb.h
    ) {
      onClickBuyFloor2();
      return;
    }

    const originX = rect.width * 0.51;
    const originY = rect.height * 0.31;
    const iso = screenToIso(sx, sy, originX, originY);
    if (iso.x >= 0 && iso.x < GRID_SIZE && iso.y >= 0 && iso.y < GRID_SIZE) {
      onClickGrid(iso);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => onHoverGrid(null)}
      className="w-full h-full block cursor-pointer"
    />
  );
};

// ============================================================================
// ISOMETRIC DRAWING HELPERS
// ============================================================================

function drawIsoTilePolygon(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  z: number,
  originX: number,
  originY: number,
  fill: string,
  stroke?: string,
  lineWidth: number = 1
) {
  const p0 = {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2) - z,
  };
  const p1 = {
    x: originX + (gx + 1 - gy) * (TILE_W / 2),
    y: originY + (gx + 1 + gy) * (TILE_H / 2) - z,
  };
  const p2 = {
    x: originX + (gx + 1 - (gy + 1)) * (TILE_W / 2),
    y: originY + (gx + 1 + (gy + 1)) * (TILE_H / 2) - z,
  };
  const p3 = {
    x: originX + (gx - (gy + 1)) * (TILE_W / 2),
    y: originY + (gx + (gy + 1)) * (TILE_H / 2) - z,
  };

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draws an extruded 2.5D isometric prism spanning [gx..gx+w, gy..gy+d] with height h.
 */
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
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor: string = 'rgba(15, 23, 42, 0.7)'
) {
  const topN = {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2) - (zBase + h),
  };
  const topE = {
    x: originX + (gx + w - gy) * (TILE_W / 2),
    y: originY + (gx + w + gy) * (TILE_H / 2) - (zBase + h),
  };
  const topS = {
    x: originX + (gx + w - (gy + d)) * (TILE_W / 2),
    y: originY + (gx + w + (gy + d)) * (TILE_H / 2) - (zBase + h),
  };
  const topW = {
    x: originX + (gx - (gy + d)) * (TILE_W / 2),
    y: originY + (gx + (gy + d)) * (TILE_H / 2) - (zBase + h),
  };

  const botE = { x: topE.x, y: topE.y + h };
  const botS = { x: topS.x, y: topS.y + h };
  const botW = { x: topW.x, y: topW.y + h };

  // Left visible face (W -> S)
  ctx.beginPath();
  ctx.moveTo(topW.x, topW.y);
  ctx.lineTo(topS.x, topS.y);
  ctx.lineTo(botS.x, botS.y);
  ctx.lineTo(botW.x, botW.y);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Right visible face (S -> E)
  ctx.beginPath();
  ctx.moveTo(topS.x, topS.y);
  ctx.lineTo(topE.x, topE.y);
  ctx.lineTo(botE.x, botE.y);
  ctx.lineTo(botS.x, botS.y);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(topN.x, topN.y);
  ctx.lineTo(topE.x, topE.y);
  ctx.lineTo(topS.x, topS.y);
  ctx.lineTo(topW.x, topW.y);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.stroke();
}

function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  originX: number,
  originY: number,
  t: number
) {
  // Left & Right Cyberpunk Neon Buildings in background matching reference art
  const buildings = [
    { x: originX - 520, y: 30, w: 85, h: 320, color: '#130d2e', neon: '#22d3ee', sign: 'CYBER' },
    { x: originX - 420, y: 10, w: 95, h: 340, color: '#1a103c', neon: '#f43f5e', sign: 'PULSE' },
    { x: originX - 310, y: 45, w: 78, h: 270, color: '#150d30', neon: '#a855f7', sign: 'PARTY' },
    { x: originX - 215, y: 20, w: 72, h: 220, color: '#1e1242', neon: '#38bdf8', sign: 'VIP' },
    { x: originX + 185, y: 15, w: 92, h: 300, color: '#160d33', neon: '#e879f9', sign: 'DISCO' },
    { x: originX + 295, y: 35, w: 115, h: 340, color: '#1b113e', neon: '#22d3ee', sign: 'LIVE' },
    { x: originX + 425, y: 55, w: 90, h: 290, color: '#120a2a', neon: '#facc15', sign: 'CLUB' },
  ];

  for (const b of buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Glowing Billboard Sign
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.5 + b.x);
    ctx.save();
    ctx.strokeStyle = b.neon;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.strokeRect(b.x + 12, b.y + 24, b.w - 24, 48);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(b.x + 12, b.y + 24, b.w - 24, 48);

    ctx.fillStyle = b.neon;
    ctx.font = '800 11px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.sign, b.x + b.w / 2, b.y + 52);
    ctx.restore();

    // Window grid
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    for (let wy = b.y + 90; wy < b.y + b.h - 20; wy += 22) {
      for (let wx = b.x + 12; wx < b.x + b.w - 16; wx += 18) {
        ctx.fillRect(wx, wy, 10, 12);
      }
    }
  }
}

function drawParkingAndStreet(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  t: number,
  parkingState: ParkingUpgradeState,
  guests: GuestAgent[]
) {
  // Street sidewalk outside bottom-left wall (Y = 10..13)
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = GRID_SIZE; gy < GRID_SIZE + 3; gy++) {
      const isSidewalk = gy === GRID_SIZE;
      drawIsoTilePolygon(
        ctx,
        gx,
        gy,
        0,
        originX,
        originY,
        isSidewalk ? '#2e264e' : '#18142c',
        isSidewalk ? '#3f3569' : '#241e3d',
        1
      );
    }
  }

  // Parking lot bays on left side (gx = -5..-1, gy = 3..11)
  for (let gx = -4; gx <= -1; gx++) {
    for (let gy = 4; gy <= 11; gy++) {
      drawIsoTilePolygon(
        ctx,
        gx,
        gy,
        0,
        originX,
        originY,
        parkingState.lotTier >= 2 ? '#1f1b38' : '#19152c',
        'rgba(148, 163, 184, 0.18)',
        1
      );
    }
  }

  // Parked Cars (More cars & luxury sports cars as Parking Lot tier upgrades)
  drawParkedCar(ctx, -3.2, 6.2, originX, originY, '#06b6d4', '#0e7490');
  drawParkedCar(ctx, -2.5, 9.2, originX, originY, '#475569', '#334155');
  if (parkingState.lotTier >= 2) {
    drawParkedCar(ctx, -3.2, 3.8, originX, originY, '#f43f5e', '#be123c');
  }
  if (parkingState.lotTier >= 3) {
    drawParkedCar(ctx, -1.8, 11.1, originX, originY, '#facc15', '#ca8a04');
  }

  // Streetlamps casting warm pools of light
  const lampCoords = [
    { gx: -1.2, gy: 4.5 },
    { gx: -1.2, gy: 7.5 },
    { gx: 0.4, gy: 10.4 },
  ];
  for (const lc of lampCoords) {
    const base = {
      x: originX + (lc.gx - lc.gy) * (TILE_W / 2),
      y: originY + (lc.gx + lc.gy) * (TILE_H / 2),
    };
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, base.y - 54);
    ctx.lineTo(base.x - 10, base.y - 58);
    ctx.stroke();

    // Warm lamp glow cone
    const glow = ctx.createRadialGradient(
      base.x - 10,
      base.y - 58,
      2,
      base.x - 10,
      base.y - 25,
      42
    );
    glow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
    glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(base.x - 10, base.y - 35, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Velvet Rope Stanchions outside front door (DOOR_COORD = 2, 9)
  const ropeColor =
    parkingState.ropeTier === 3
      ? '#facc15'
      : parkingState.ropeTier === 2
      ? '#ec4899'
      : '#a855f7';

  for (let i = 0; i < 3; i++) {
    const postA = {
      x: originX + (1.5 - i * 0.9 - 10.1) * (TILE_W / 2),
      y: originY + (1.5 - i * 0.9 + 10.1) * (TILE_H / 2),
    };
    const postB = {
      x: originX + (1.5 - (i + 1) * 0.9 - 10.1) * (TILE_W / 2),
      y: originY + (1.5 - (i + 1) * 0.9 + 10.1) * (TILE_H / 2),
    };

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(postA.x, postA.y);
    ctx.lineTo(postA.x, postA.y - 18);
    ctx.stroke();

    ctx.strokeStyle = ropeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(postA.x, postA.y - 14);
    ctx.quadraticCurveTo((postA.x + postB.x) / 2, (postA.y + postB.y) / 2 - 7, postB.x, postB.y - 14);
    ctx.stroke();
  }

  // Render queueing guests waiting outside along the velvet rope
  const queueGuests = guests.filter((g) => g.state === 'QUEUEING');
  queueGuests.forEach((qg, idx) => {
    const qx = 1.4 - idx * 0.75;
    const qy = 9.85;
    drawGuestCharacterAt(ctx, qg, qx, qy, originX, originY, t);
  });
}

function drawParkedCar(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  topColor: string,
  sideColor: string
) {
  drawIsoPrism(ctx, gx, gy, 1.4, 0.85, 0, 11, originX, originY, topColor, sideColor, sideColor);
  drawIsoPrism(
    ctx,
    gx + 0.25,
    gy + 0.12,
    0.85,
    0.6,
    11,
    8,
    originX,
    originY,
    '#1e293b',
    '#0f172a',
    '#334155'
  );
}

function drawClubWallsAndFloor(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  t: number,
  activeFloor: 1 | 2,
  unlockedFloors: 1 | 2,
  playerLevel: number,
  stairsHitboxRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }>
) {
  const WALL_H = 115;

  // 1. Interior 10x10 Grid Tiles
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const isChecker = (gx + gy) % 2 === 0;
      const baseFill =
        activeFloor === 2
          ? isChecker
            ? '#231742'
            : '#1d1238'
          : isChecker
          ? '#2a2438'
          : '#231e30';
      drawIsoTilePolygon(
        ctx,
        gx,
        gy,
        0,
        originX,
        originY,
        baseFill,
        'rgba(148, 163, 184, 0.14)',
        1
      );
    }
  }

  // 2. Left Back Wall (gy = 0..10 along gx = 0)
  const nw = { x: originX, y: originY };
  const sw = {
    x: originX - GRID_SIZE * (TILE_W / 2),
    y: originY + GRID_SIZE * (TILE_H / 2),
  };
  const se = {
    x: originX + GRID_SIZE * (TILE_W / 2),
    y: originY + GRID_SIZE * (TILE_H / 2),
  };

  // Left Wall Surface
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.lineTo(sw.x, sw.y - WALL_H);
  ctx.lineTo(nw.x, nw.y - WALL_H);
  ctx.closePath();
  ctx.fillStyle = activeFloor === 2 ? '#251747' : '#3b2832';
  ctx.fill();
  ctx.strokeStyle = '#634354';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Right Back Wall (gx = 0..10 along gy = 0)
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(se.x, se.y - WALL_H);
  ctx.lineTo(nw.x, nw.y - WALL_H);
  ctx.closePath();
  ctx.fillStyle = activeFloor === 2 ? '#1d113a' : '#2f2029';
  ctx.fill();
  ctx.strokeStyle = '#634354';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Exposed brick patches & warm string lights on walls (matching IMG_1503_71984622.jpeg)
  drawWallStringLights(ctx, nw.x, nw.y - WALL_H + 24, sw.x, sw.y - WALL_H + 24, t);
  drawWallStringLights(ctx, nw.x + 140, nw.y - WALL_H + 95, se.x, se.y - WALL_H + 24, t);

  // 3. STAIRCASE TO FLOOR 2 & "BUY FLOOR 2 / LOCKED" NEON BILLBOARD (at gx = 4..5, gy = 0)
  const stairX = originX + 4.3 * (TILE_W / 2);
  const stairY = originY + 4.3 * (TILE_H / 2);

  // Draw steps rising up the back-right wall
  for (let s = 0; s < 5; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#475569' : '#334155';
    ctx.fillRect(stairX - 18 + s * 6, stairY - 38 - s * 11, 34, 10);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(stairX - 18 + s * 6, stairY - 38 - s * 11, 34, 10);
  }

  // Clickable Neon Sign on Wall ("BUY FLOOR 2" or "FLOOR 2 VIP OPEN")
  const signBox = {
    x: stairX - 12,
    y: stairY - 82,
    w: 138,
    h: 54,
  };
  stairsHitboxRef.current = signBox;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = unlockedFloors === 2 ? '#4ade80' : '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(signBox.x, signBox.y, signBox.w, signBox.h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = '800 11px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  if (unlockedFloors === 1) {
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('BUY FLOOR 2 ($2,500)', signBox.x + signBox.w / 2, signBox.y + 21);
    ctx.fillStyle = '#f472b6';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText(
      playerLevel >= 3 ? 'READY TO UNLOCK!' : 'UNLOCKS AT LVL 3 (OR TAP)',
      signBox.x + signBox.w / 2,
      signBox.y + 40
    );
  } else {
    ctx.fillStyle = '#4ade80';
    ctx.fillText(
      activeFloor === 1 ? 'GO TO FLOOR 2 VIP ▲' : 'GO TO FLOOR 1 MAIN ▼',
      signBox.x + signBox.w / 2,
      signBox.y + 23
    );
    ctx.fillStyle = '#facc15';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('SKY LOUNGE ACTIVE', signBox.x + signBox.w / 2, signBox.y + 41);
  }
  ctx.restore();

  // 4. Front Door Archway on bottom-left edge (DOOR_COORD = 2, 9)
  const doorPos = {
    x: originX + (DOOR_COORD.x - (DOOR_COORD.y + 1)) * (TILE_W / 2),
    y: originY + (DOOR_COORD.x + (DOOR_COORD.y + 1)) * (TILE_H / 2),
  };
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(doorPos.x - 16, doorPos.y);
  ctx.lineTo(doorPos.x - 16, doorPos.y - 38);
  ctx.lineTo(doorPos.x + 16, doorPos.y - 24);
  ctx.lineTo(doorPos.x + 16, doorPos.y + 12);
  ctx.stroke();
}

function drawWallStringLights(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
) {
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 18, x2, y2);
  ctx.stroke();

  const bulbs = 9;
  for (let i = 1; i < bulbs; i++) {
    const u = i / bulbs;
    const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * ((x1 + x2) / 2) + u * u * x2;
    const by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * ((y1 + y2) / 2 + 18) + u * u * y2;
    const twinkle = 0.65 + 0.35 * Math.sin(t * 4 + i * 1.3);

    ctx.fillStyle = `rgba(253, 224, 71, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDanceTileItem(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  t: number
) {
  const fp = getRotatedFootprint(cat, item.rotation);
  const paletteTier1 = ['#38bdf8', '#f472b6', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
  const paletteTier2 = ['#22d3ee', '#e879f9', '#3b82f6', '#f43f5e'];
  const paletteTier3 = ['#facc15', '#ec4899', '#22d3ee', '#a855f7'];

  const palette =
    cat.tier === 3 ? paletteTier3 : cat.tier === 2 ? paletteTier2 : paletteTier1;

  for (let dx = 0; dx < fp.width; dx++) {
    for (let dy = 0; dy < fp.depth; dy++) {
      const gx = item.gridX + dx;
      const gy = item.gridY + dy;
      const colorIdx = Math.floor(t * 2.8 + gx * 1.7 + gy * 2.3) % palette.length;
      const color = palette[Math.abs(colorIdx)];

      drawIsoTilePolygon(
        ctx,
        gx,
        gy,
        1,
        originX,
        originY,
        color,
        '#ffffff',
        cat.tier >= 2 ? 1.8 : 1.2
      );
    }
  }
}

function draw3DFurnitureItem(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  fp: { width: number; depth: number },
  originX: number,
  originY: number,
  t: number,
  activeDrink: DrinkMix
) {
  if (cat.category === 'BAR_UNIT') {
    // Main bar counter prism
    const h = cat.tier === 3 ? 28 : 24;
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
      cat.accentColor,
      cat.primaryColor,
      '#1e1b4b'
    );

    // Back-wall bottle shelving + glowing drink glasses on top of counter
    for (let i = 0; i < fp.width; i++) {
      const glassPos = {
        x: originX + (item.gridX + i + 0.5 - (item.gridY + 0.5)) * (TILE_W / 2),
        y: originY + (item.gridX + i + 0.5 + (item.gridY + 0.5)) * (TILE_H / 2) - h,
      };
      ctx.fillStyle = activeDrink.color;
      ctx.beginPath();
      ctx.arc(glassPos.x, glassPos.y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (cat.category === 'DJ_BOOTH') {
    // Stage riser + console desk + spinning dual turntables
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      fp.width,
      fp.depth,
      0,
      12,
      originX,
      originY,
      '#312e81',
      '#1e1b4b',
      '#0f172a'
    );
    drawIsoPrism(
      ctx,
      item.gridX + 0.15,
      item.gridY + 0.15,
      fp.width * 0.75,
      fp.depth * 0.75,
      12,
      16,
      originX,
      originY,
      cat.accentColor,
      cat.primaryColor,
      '#3b0764'
    );

    // Turntable platters on top
    const deckPos = {
      x: originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (TILE_W / 2),
      y: originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (TILE_H / 2) - 30,
    };
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(deckPos.x - 8, deckPos.y, 6, 0, Math.PI * 2);
    ctx.arc(deckPos.x + 10, deckPos.y + 4, 6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (cat.category === 'SEATING') {
    // Base cushion + backrest
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      fp.width,
      fp.depth,
      0,
      13,
      originX,
      originY,
      cat.accentColor,
      cat.primaryColor,
      '#1e293b'
    );
    drawIsoPrism(
      ctx,
      item.gridX,
      item.gridY,
      fp.width,
      0.35,
      13,
      11,
      originX,
      originY,
      cat.primaryColor,
      cat.primaryColor,
      '#0f172a'
    );
  } else if (cat.category === 'LIGHTING') {
    // Tall truss pillar + glowing top fixture
    drawIsoPrism(
      ctx,
      item.gridX + 0.3,
      item.gridY + 0.3,
      0.4,
      0.4,
      0,
      46,
      originX,
      originY,
      cat.accentColor,
      '#334155',
      '#1e293b'
    );
    const orbPos = {
      x: originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (TILE_W / 2),
      y: originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (TILE_H / 2) - 52,
    };
    ctx.fillStyle = cat.accentColor;
    ctx.beginPath();
    ctx.arc(orbPos.x, orbPos.y, 7 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightingBeams(
  ctx: CanvasRenderingContext2D,
  item: PlacedItem,
  cat: CatalogItem,
  originX: number,
  originY: number,
  t: number
) {
  const src = {
    x: originX + (item.gridX + 0.5 - (item.gridY + 0.5)) * (TILE_W / 2),
    y: originY + (item.gridX + 0.5 + (item.gridY + 0.5)) * (TILE_H / 2) - 52,
  };
  const sweepX = originX + Math.sin(t * 1.9 + item.gridX) * 110;
  const sweepY = originY + 130 + Math.cos(t * 1.4 + item.gridY) * 45;

  ctx.save();
  const grad = ctx.createLinearGradient(src.x, src.y, sweepX, sweepY);
  grad.addColorStop(0, cat.tier >= 2 ? 'rgba(34, 211, 238, 0.42)' : 'rgba(253, 224, 71, 0.25)');
  grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.lineTo(sweepX - 32, sweepY);
  ctx.lineTo(sweepX + 32, sweepY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStaffAvatar(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  t: number,
  role: 'BARTENDER' | 'DJ'
) {
  const pos = {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2) - 18,
  };
  const bounce = Math.sin(t * 5) * 2;

  // Torso
  ctx.fillStyle = role === 'DJ' ? '#38bdf8' : '#f43f5e';
  ctx.beginPath();
  ctx.roundRect(pos.x - 7, pos.y - 18 + bounce, 14, 16, 4);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 24 + bounce, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Headphones for DJ
  if (role === 'DJ') {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 24 + bounce, 7.5, Math.PI, 0);
    ctx.stroke();
  }
}

function drawGuestCharacter(
  ctx: CanvasRenderingContext2D,
  guest: GuestAgent,
  originX: number,
  originY: number,
  t: number
) {
  drawGuestCharacterAt(ctx, guest, guest.gridX, guest.gridY, originX, originY, t);
}

function drawGuestCharacterAt(
  ctx: CanvasRenderingContext2D,
  guest: GuestAgent,
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  t: number
) {
  const pos = {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2),
  };

  const isDancing = guest.state === 'DANCING';
  const bounce = isDancing ? Math.abs(Math.sin(t * 7 + gx * 3)) * 6 : Math.sin(t * 3 + gx) * 1.2;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = guest.pantsColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pos.x - 3, pos.y - 12 - bounce);
  ctx.lineTo(pos.x - 4, pos.y - bounce * 0.3);
  ctx.moveTo(pos.x + 3, pos.y - 12 - bounce);
  ctx.lineTo(pos.x + 4, pos.y - bounce * 0.3);
  ctx.stroke();

  // Shirt / Jacket
  ctx.fillStyle = guest.shirtColor;
  ctx.beginPath();
  ctx.roundRect(pos.x - 6.5, pos.y - 26 - bounce, 13, 15, 4);
  ctx.fill();
  ctx.strokeStyle = '#090518';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 32 - bounce, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair
  ctx.fillStyle = guest.hairColor;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y - 34 - bounce, 6.2, Math.PI, 0);
  ctx.fill();

  // Celebrity gold aura crown
  if (guest.isCelebrity) {
    ctx.fillStyle = '#facc15';
    ctx.font = '700 10px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ VIP', pos.x, pos.y - 42 - bounce);
  }

  // Overhead Thought Bubble (matching Beer Mug, Sparkles, Music Note, Impatience in reference image)
  if (guest.bubble) {
    drawThoughtBubble(ctx, pos.x, pos.y - 54 - bounce, guest.bubble);
  }
}

function drawThoughtBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bubble: BubbleType
) {
  ctx.save();
  // White rounded speech bubble with dark outline
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(x - 14, y - 13, 28, 22, 7);
  ctx.fill();
  ctx.stroke();

  // Bubble pointer tail
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 9);
  ctx.lineTo(x, y + 14);
  ctx.lineTo(x + 4, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (bubble === 'BEER') {
    // Frothy golden beer mug icon
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x - 6, y - 7, 12, 3);
  } else if (bubble === 'COCKTAIL') {
    // Magenta martini triangle
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y - 6);
    ctx.lineTo(x, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  } else if (bubble === 'SPARKLE') {
    // Orange/Gold 4-point sparkle stars
    ctx.fillStyle = '#f97316';
    ctx.font = '700 13px sans-serif';
    ctx.fillText('✦', x - 2, y - 1);
    ctx.fillStyle = '#facc15';
    ctx.font = '700 9px sans-serif';
    ctx.fillText('✦', x + 6, y - 4);
  } else if (bubble === 'MUSIC') {
    ctx.fillStyle = '#7c3aed';
    ctx.font = '700 13px sans-serif';
    ctx.fillText('♫', x, y - 1);
  } else if (bubble === 'CHAT') {
    ctx.fillStyle = '#0284c7';
    ctx.font = '700 13px sans-serif';
    ctx.fillText('•••', x, y - 1);
  } else if (bubble === 'CASH') {
    ctx.fillStyle = '#16a34a';
    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.fillText('$$', x, y - 1);
  } else if (bubble === 'ANGRY_LIGHT' || bubble === 'ANGRY_QUEUE' || bubble === 'ANGRY_SEAT') {
    ctx.fillStyle = '#dc2626';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('!', x, y - 1);
  } else if (bubble === 'VIP_CROWN') {
    ctx.fillStyle = '#eab308';
    ctx.font = '800 12px sans-serif';
    ctx.fillText('♛', x, y - 1);
  }

  ctx.restore();
}
