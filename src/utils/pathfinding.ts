import { CATALOG_ITEMS, CatalogItem, PlacedItem } from '../types/game';

export const GRID_SIZE = 10; // 10x10 interior tiles per floor
export const STAIRS_COORD = { x: 4, y: 0 }; // Back wall staircase leading to Floor 2
export const DOOR_COORD = { x: 2, y: 9 }; // Front entrance door on bottom-left wall

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.id === catalogId);
}

export function getRotatedFootprint(
  item: CatalogItem,
  rotation: 0 | 90 | 180 | 270
): { width: number; depth: number } {
  if (rotation === 90 || rotation === 270) {
    return { width: item.depth, depth: item.width };
  }
  return { width: item.width, depth: item.depth };
}

/**
 * Checks whether a catalog item can be placed at (gridX, gridY) on the target floor.
 * Ensures no out-of-bounds placement, no blocking of the staircase or front entrance,
 * and no overlap with existing items.
 */
export function canPlaceItem(
  placedItems: PlacedItem[],
  catalogItem: CatalogItem,
  floor: 1 | 2 | 3,
  gridX: number,
  gridY: number,
  rotation: 0 | 90 | 180 | 270,
  ignoreUid?: string
): boolean {
  const { width, depth } = getRotatedFootprint(catalogItem, rotation);

  if (gridX < 0 || gridY < 0 || gridX + width > GRID_SIZE || gridY + depth > GRID_SIZE) {
    return false;
  }

  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < depth; dy++) {
      const tx = gridX + dx;
      const ty = gridY + dy;

      // Keep staircase entrance clear
      if (tx === STAIRS_COORD.x && ty === STAIRS_COORD.y) {
        return false;
      }
      // Keep front entrance doorway clear on Floor 1
      if (floor === 1 && tx === DOOR_COORD.x && ty === DOOR_COORD.y) {
        return false;
      }
    }
  }

  // Check collisions with existing items on the same floor
  const floorItems = placedItems.filter((p) => p.floor === floor && p.uid !== ignoreUid);
  for (const existing of floorItems) {
    const existingCat = getCatalogItem(existing.catalogId);
    if (!existingCat) continue;
    const exFp = getRotatedFootprint(existingCat, existing.rotation);

    const overlapX = gridX < existing.gridX + exFp.width && gridX + width > existing.gridX;
    const overlapY = gridY < existing.gridY + exFp.depth && gridY + depth > existing.gridY;
    if (overlapX && overlapY) {
      return false;
    }
  }

  return true;
}

/**
 * Builds a walkability matrix for a given floor.
 * Dance tiles are walkable; bars, couches, DJ booths, and light pillars are obstacles.
 */
export function buildWalkableMatrix(placedItems: PlacedItem[], floor: 1 | 2 | 3): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => true)
  );

  for (const placed of placedItems) {
    if (placed.floor !== floor) continue;
    const cat = getCatalogItem(placed.catalogId);
    if (!cat || cat.walkable) continue;

    const { width, depth } = getRotatedFootprint(cat, placed.rotation);
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < depth; dy++) {
        const tx = placed.gridX + dx;
        const ty = placed.gridY + dy;
        if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
          matrix[ty][tx] = false;
        }
      }
    }
  }

  return matrix;
}

/**
 * Finds the nearest walkable tile adjacent to a target coordinate (e.g. standing in front of a bar or couch).
 */
export function findNearestWalkableTile(
  matrix: boolean[][],
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(targetX)));
  const clampedY = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(targetY)));

  if (matrix[clampedY]?.[clampedX]) {
    return { x: clampedX, y: clampedY };
  }

  const dirs = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
  ];

  for (let radius = 1; radius <= 3; radius++) {
    for (const d of dirs) {
      const nx = clampedX + d.dx * radius;
      const ny = clampedY + d.dy * radius;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && matrix[ny][nx]) {
        return { x: nx, y: ny };
      }
    }
  }

  return { x: DOOR_COORD.x, y: DOOR_COORD.y };
}

/**
 * A* Pathfinding on the 10x10 Isometric Grid.
 */
export function findGridPath(
  placedItems: PlacedItem[],
  floor: 1 | 2 | 3,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): Array<{ x: number; y: number }> {
  const matrix = buildWalkableMatrix(placedItems, floor);
  const sx = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(startX)));
  const sy = Math.max(0, Math.min(GRID_SIZE - 1, Math.round(startY)));
  const validGoal = findNearestWalkableTile(matrix, goalX, goalY);
  const gx = validGoal.x;
  const gy = validGoal.y;

  if (sx === gx && sy === gy) return [];

  interface Node {
    x: number;
    y: number;
    g: number;
    f: number;
    parent?: Node;
  }

  const open: Node[] = [{ x: sx, y: sy, g: 0, f: Math.abs(gx - sx) + Math.abs(gy - sy) }];
  const closed = new Set<string>();

  const neighbors = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let iterations = 0;
  while (open.length > 0 && iterations < 200) {
    iterations++;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const key = `${current.x},${current.y}`;

    if (current.x === gx && current.y === gy) {
      const path: Array<{ x: number; y: number }> = [];
      let curr: Node | undefined = current;
      while (curr && !(curr.x === sx && curr.y === sy)) {
        path.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      return path;
    }

    closed.add(key);

    for (const n of neighbors) {
      const nx = current.x + n.dx;
      const ny = current.y + n.dy;
      const nKey = `${nx},${ny}`;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      if (closed.has(nKey)) continue;
      if (!matrix[ny][nx] && !(nx === gx && ny === gy)) continue;

      const gScore = current.g + 1;
      const existing = open.find((o) => o.x === nx && o.y === ny);
      if (!existing) {
        open.push({
          x: nx,
          y: ny,
          g: gScore,
          f: gScore + Math.abs(gx - nx) + Math.abs(gy - ny),
          parent: current,
        });
      } else if (gScore < existing.g) {
        existing.g = gScore;
        existing.f = gScore + Math.abs(gx - nx) + Math.abs(gy - ny);
        existing.parent = current;
      }
    }
  }

  // Direct fallback if boxed in
  return [{ x: gx, y: gy }];
}

/**
 * Builds a guaranteed non-empty isometric waypoint path for a staff member
 * walking from their current interpolated (startX, startY) to a destination station (goalX, goalY).
 * Routes around obstacles via A* and always terminates smoothly at (goalX, goalY) without instant jumping.
 */
export function buildStaffStationPath(
  placedItems: PlacedItem[],
  floor: 1 | 2 | 3,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): Array<{ x: number; y: number }> {
  const dist = Math.hypot(goalX - startX, goalY - startY);
  if (dist < 0.04) {
    return [];
  }

  const aStarPath = findGridPath(placedItems, floor, startX, startY, goalX, goalY);
  const waypoints: Array<{ x: number; y: number }> = [...aStarPath];

  const lastWp = waypoints.length > 0 ? waypoints[waypoints.length - 1] : { x: startX, y: startY };
  if (Math.hypot(goalX - lastWp.x, goalY - lastWp.y) > 0.05) {
    waypoints.push({ x: goalX, y: goalY });
  }

  // If start and goal were adjacent or on non-walkable counter tiles where A* returned a single jump,
  // subdivide long segments so the staff member visibly walks across each isometric tile transition.
  if (waypoints.length === 1 && dist > 1.25) {
    const steps = Math.min(8, Math.max(2, Math.ceil(dist)));
    const smoothWaypoints: Array<{ x: number; y: number }> = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      smoothWaypoints.push({
        x: Number((startX + (goalX - startX) * t).toFixed(2)),
        y: Number((startY + (goalY - startY) * t).toFixed(2)),
      });
    }
    return smoothWaypoints;
  }

  return waypoints;
}

