export interface BlueprintSection {
  id: string;
  title: string;
  subtitle: string;
  language: 'Kotlin (Jetpack Compose + Custom Canvas)' | 'C# (Unity 2.5D Isometric)';
  summary: string;
  code: string;
}

export const ANDROID_BLUEPRINT_SECTIONS: BlueprintSection[] = [
  {
    id: 'floor-engine',
    title: '1. Vertical / Multiple Floor Architecture',
    subtitle: 'Dynamic Multi-Floor Rendering Engine & Cross-Level Stair/Elevator Pathfinding',
    language: 'Kotlin (Jetpack Compose + Custom Canvas)',
    summary:
      'Separates the nightclub into stacked FloorLayer graphs (Floor 1 Dive/Main Room, Floor 2 VIP Sky Lounge). Agents transition vertically via StaircasePortal nodes at (gridX = 4, gridY = 0) while rendering uses painter-sorted depth keys (gridX + gridY).',
    code: `package com.neonnights.engine.floor

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.DrawScope

data class GridCoord(val x: Int, val y: Int, val floor: Int = 1)

class MultiFloorClubEngine(
    val gridSize: Int = 10,
    val stairsPortal: GridCoord = GridCoord(4, 0, 1)
) {
    var activeCameraFloor: Int = 1
    var unlockedFloors: Int = 1
    val placedItems = mutableStateListOf<PlacedFurniture>()
    val activeGuests = mutableStateListOf<ClubGuestAgent>()

    /**
     * Converts 2.5D Isometric Grid (gridX, gridY, elevationZ) to Screen Pixel Offset
     */
    fun isoToScreen(
        gridX: Float,
        gridY: Float,
        elevationZ: Float,
        origin: Offset,
        tileWidth: Float = 64f,
        tileHeight: Float = 32f
    ): Offset {
        val screenX = origin.x + (gridX - gridY) * (tileWidth / 2f)
        val screenY = origin.y + (gridX + gridY) * (tileHeight / 2f) - elevationZ
        return Offset(screenX, screenY)
    }

    /**
     * Routes a guest across floors. If targetFloor != guest.currentFloor,
     * A* first paths to the Staircase Portal (4, 0), transitions floor state,
     * and computes the destination path on the new floor.
     */
    fun assignMultiFloorDestination(
        guest: ClubGuestAgent,
        targetCoord: GridCoord,
        pathfinder: IsoPathfinder
    ) {
        if (guest.currentFloor != targetCoord.floor && unlockedFloors >= targetCoord.floor) {
            guest.pendingFloorTarget = targetCoord
            guest.pathQueue = pathfinder.findPath(
                floor = guest.currentFloor,
                start = GridCoord(guest.gridX.toInt(), guest.gridY.toInt(), guest.currentFloor),
                goal = stairsPortal.copy(floor = guest.currentFloor)
            ).toMutableList()
            guest.state = GuestBehaviourState.CLIMBING_STAIRS
        } else {
            guest.pathQueue = pathfinder.findPath(
                floor = guest.currentFloor,
                start = GridCoord(guest.gridX.toInt(), guest.gridY.toInt(), guest.currentFloor),
                goal = targetCoord
            ).toMutableList()
        }
    }

    /**
     * Painter's Algorithm Depth Sort: renders back-to-front by (gridX + gridY)
     */
    fun DrawScope.renderActiveFloor(origin: Offset) {
        val floorFurniture = placedItems.filter { it.floor == activeCameraFloor }
        val floorGuests = activeGuests.filter { it.currentFloor == activeCameraFloor }

        val renderQueue = mutableListOf<Pair<Float, () -> Unit>>()

        floorFurniture.forEach { item ->
            val depthKey = (item.gridX + item.gridY + item.footprintWidth + item.footprintDepth).toFloat()
            renderQueue.add(depthKey to { drawIsometricFurniture(item, origin) })
        }

        floorGuests.forEach { guest ->
            val depthKey = guest.gridX + guest.gridY + 0.5f
            renderQueue.add(depthKey to { drawGuestSpriteAndBubble(guest, origin) })
        }

        renderQueue.sortBy { it.first }
        renderQueue.forEach { (_, drawCall) -> drawCall() }
    }
}`,
  },
  {
    id: 'upgrade-schemas',
    title: '2. Comprehensive Upgrade & Buy Data Schemas',
    subtitle: 'Tiered Items, Drink Mixology Recipes, Level Locks, and Vibe/Hype Multipliers',
    language: 'Kotlin (Jetpack Compose + Custom Canvas)',
    summary:
      'Strongly-typed Room / Kotlin serialization data models for Floor expansions, Chairs/Booths, DanceTiles, BarUnits, DJEquipment, and LightFixtures with soft/hard currency costs and tip multipliers.',
    code: `package com.neonnights.data.schema

import kotlinx.serialization.Serializable

enum class ItemCategory {
    DANCE_TILE, BAR_UNIT, SEATING, DJ_BOOTH, LIGHTING, OUTSIDE_VALET
}

@Serializable
data class ClubCatalogItem(
    val id: String,
    val name: String,
    val category: ItemCategory,
    val tier: Int,                  // Tier 1 (Dive) -> Tier 3 (VIP Supernova)
    val costCash: Int,              // Soft currency ($)
    val costGems: Int,              // Hard currency (Diamonds)
    val unlockLevel: Int,           // Level gate (e.g., Level 20 for Floor 2 / VIP gear)
    val footprintWidth: Int,        // Grid X size (e.g., 3x2 Wraparound Bar)
    val footprintDepth: Int,        // Grid Y size
    val isWalkable: Boolean,        // True for DanceTile, False for Bars/Couches
    val hypeDropBonus: Int,         // Increases dancer Hype generation
    val vibeMultiplierBonus: Float, // Increases lighting/audio Vibe score
    val seatTipBonus: Float,        // Multiplies guest drink & seating tips
    val barPrepSpeedMultiplier: Float = 1.0f
)

@Serializable
data class DrinkMixRecipe(
    val id: String,
    val displayName: String,
    val tier: Int,
    val requiredBarTier: Int,
    val prepCostCash: Int,
    val sellPriceCash: Int,
    val hypeBoost: Int,
    val mixDurationSeconds: Float
)

data class ClubEconomyState(
    val level: Int = 1,
    val xp: Int = 45,
    val xpToNextLevel: Int = 200,
    val cash: Int = 1250,
    val gems: Int = 5,
    val unlockedFloors: Int = 1,
    val activeDrinkId: String = "drink_draft_beer",
    val bouncerCount: Int = 1,
    val parkingLotTier: Int = 1
) {
    fun computeTotalClubHype(placed: List<PlacedCatalogInstance>): Int =
        placed.sumOf { it.catalog.hypeDropBonus }

    fun computeTotalVibeMultiplier(placed: List<PlacedCatalogInstance>): Float =
        1.0f + placed.sumOf { it.catalog.vibeMultiplierBonus.toDouble() }.toFloat()
}`,
  },
  {
    id: 'isometric-pathfinding',
    title: '3. Isometric Grid Coordinate Pathfinding & Progression AI',
    subtitle: 'Multi-Tile Footprint Collision Detection & Guest Finite State Machine',
    language: 'C# (Unity 2.5D Isometric)',
    summary:
      'Handles screen-to-isometric raycasting, multi-tile footprint collision checks for 3x2 wraparound bars, dynamic A* navigation graph updates on furniture placement, and the Queue -> Bouncer -> Bar -> Dance -> Seat -> Tip loop.',
    code: `using System.Collections.Generic;
using UnityEngine;

namespace NeonNights.AI
{
    public enum GuestLoopState { QueueOutside, BouncerCheckIn, WalkToBar, OrderDrink, DanceOnFloor, RelaxAtSeat, LeaveAndTip }

    public class IsometricGridPathfinder : MonoBehaviour
    {
        public const int GridSize = 10;
        private bool[,,] _walkableMatrix = new bool[3, GridSize, GridSize];

        public Vector2Int ScreenToIsoGrid(Vector2 screenPos, Vector2 origin, float tileW = 64f, float tileH = 32f)
        {
            float dx = screenPos.x - origin.x;
            float dy = screenPos.y - origin.y;
            int gx = Mathf.FloorToInt((dx / (tileW * 0.5f) + dy / (tileH * 0.5f)) * 0.5f);
            int gy = Mathf.FloorToInt((dy / (tileH * 0.5f) - dx / (tileW * 0.5f)) * 0.5f);
            return new Vector2Int(gx, gy);
        }

        public bool CanPlaceMultiTileItem(int floor, int startX, int startY, int width, int depth, HashSet<Vector2Int> occupied)
        {
            if (startX < 0 || startY < 0 || startX + width > GridSize || startY + depth > GridSize)
                return false;

            for (int x = startX; x < startX + width; x++)
            {
                for (int y = startY; y < startY + depth; y++)
                {
                    Vector2Int cell = new Vector2Int(x, y);
                    if (cell == new Vector2Int(4, 0) || cell == new Vector2Int(2, 9)) return false; // Stairs & Doorway
                    if (occupied.Contains(cell)) return false;
                }
            }
            return true;
        }

        public void TickGuestAgent(GuestEntity guest, ClubMetrics club, float dt)
        {
            guest.StateTimer -= dt;
            if (guest.Path.Count > 0)
            {
                Vector2 target = guest.Path[0];
                guest.Position = Vector2.MoveTowards(guest.Position, target, dt * 2.4f);
                if (Vector2.Distance(guest.Position, target) < 0.05f) guest.Path.RemoveAt(0);
                return;
            }

            switch (guest.State)
            {
                case GuestLoopState.QueueOutside:
                    if (club.TryBouncerAdmit(guest))
                        TransitionTo(guest, GuestLoopState.WalkToBar, club.FindNearestBarPosition(guest.Floor));
                    break;

                case GuestLoopState.WalkToBar:
                    guest.ActiveBubble = ThoughtBubble.BeerMug;
                    TransitionTo(guest, GuestLoopState.DanceOnFloor, club.FindRandomDanceTile(guest.Floor));
                    break;

                case GuestLoopState.DanceOnFloor:
                    guest.ActiveBubble = ThoughtBubble.SparkleHype;
                    club.AddFloatingIncome(guest.Position, Mathf.RoundToInt(club.ActiveDrinkPrice * club.VibeMultiplier));
                    TransitionTo(guest, GuestLoopState.RelaxAtSeat, club.FindAvailableSeat(guest.Floor));
                    break;

                case GuestLoopState.RelaxAtSeat:
                    int tip = Mathf.RoundToInt(25 * (1f + club.SeatTipBonus) * (guest.IsCelebrity ? 3f : 1f));
                    club.AddFloatingIncome(guest.Position, tip);
                    TransitionTo(guest, GuestLoopState.LeaveAndTip, new Vector2Int(2, 9));
                    break;
            }
        }
    }
}`,
  },
  {
    id: 'build-decorate-ui',
    title: '4. Interactive Upgrade Phase & Ghosted Placement Overlay UI',
    subtitle: 'Jetpack Compose HUD + Build/Decorate Drawer with Cash/Gem Deduction',
    language: 'Kotlin (Jetpack Compose + Custom Canvas)',
    summary:
      'Implements the 5-button bottom command bar, ghosted green valid-tile placement preview, rotation toggles, and immediate currency deduction + XP award upon item purchase.',
    code: `@Composable
fun BuildDecorateOverlay(
    economy: ClubEconomyState,
    selectedItem: ClubCatalogItem?,
    hoveredTile: GridCoord?,
    isPlacementValid: Boolean,
    onSelectCatalogItem: (ClubCatalogItem) -> Unit,
    onConfirmPlacement: (ClubCatalogItem, GridCoord) -> Unit,
    onDismiss: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Green Ghosted Build Mode Box matched to reference UI
        AnimatedVisibility(
            visible = true,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 96.dp)
        ) {
            Surface(
                color = Color(0xCC4ADE80),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(2.dp, Color(0xFF86EFAC))
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Build Mode",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(CatalogRepository.items) { item ->
                            val canAfford = economy.cash >= item.costCash && economy.gems >= item.costGems
                            CatalogItemCard(
                                item = item,
                                isSelected = selectedItem?.id == item.id,
                                canAfford = canAfford,
                                onClick = { onSelectCatalogItem(item) }
                            )
                        }
                    }
                }
            }
        }
    }
}`,
  },
];
