export type SpriteAssetKey =
  | 'floor_tile'
  | 'bar_counter'
  | 'dj_booth'
  | 'speaker_stack'
  | 'cocktail_table'
  | 'vip_couch'
  | 'stanchion'
  | 'car_taxi'
  | 'car_sedan'
  | 'chibi_guest';

export interface SpriteAssetDefinition {
  key: SpriteAssetKey;
  label: string;
  category: string;
  recommendedSize: string;
  anchorDescription: string;
}

export const SPRITE_ASSET_DEFINITIONS: SpriteAssetDefinition[] = [
  {
    key: 'floor_tile',
    label: 'Dance Floor Tile',
    category: 'Architecture & Floor',
    recommendedSize: '128×64 px',
    anchorDescription: 'Bottom-center of isometric diamond tile',
  },
  {
    key: 'bar_counter',
    label: 'Bar Counter & Shelves',
    category: 'Bar & Mixology',
    recommendedSize: '256×220 px',
    anchorDescription: 'Bottom-center of isometric bar footprint',
  },
  {
    key: 'dj_booth',
    label: 'DJ Turntable Console',
    category: 'Stage & Audio',
    recommendedSize: '220×180 px',
    anchorDescription: 'Bottom-center of DJ booth footprint',
  },
  {
    key: 'speaker_stack',
    label: 'Studio Speaker Tower',
    category: 'Stage & Audio',
    recommendedSize: '128×180 px',
    anchorDescription: 'Bottom-center of speaker cabinet base',
  },
  {
    key: 'cocktail_table',
    label: 'High-Top Cocktail Table',
    category: 'Tables & Seating',
    recommendedSize: '128×140 px',
    anchorDescription: 'Bottom-center of pedestal base plate',
  },
  {
    key: 'vip_couch',
    label: 'Tufted VIP Lounge Sofa',
    category: 'Tables & Seating',
    recommendedSize: '240×190 px',
    anchorDescription: 'Bottom-center of 2-tile sofa footprint',
  },
  {
    key: 'stanchion',
    label: 'Gold Stanchion & Velvet Rope',
    category: 'Exterior & Entry Line',
    recommendedSize: '96×110 px',
    anchorDescription: 'Bottom-center of gold stanchion base',
  },
  {
    key: 'car_taxi',
    label: 'Retro Yellow City Taxi',
    category: 'Exterior & Street',
    recommendedSize: '180×120 px',
    anchorDescription: 'Bottom-center between front & rear tires',
  },
  {
    key: 'car_sedan',
    label: 'Boxy Retro Street Sedan',
    category: 'Exterior & Street',
    recommendedSize: '180×120 px',
    anchorDescription: 'Bottom-center between front & rear tires',
  },
  {
    key: 'chibi_guest',
    label: '2.5D Chibi Clubber Sprite',
    category: 'Characters & AI',
    recommendedSize: '96×140 px',
    anchorDescription: 'Bottom-center between character sneakers',
  },
];

const STORAGE_PREFIX = 'neon_nights_custom_sprite_v1_';

class IsometricAssetManager {
  private images = new Map<SpriteAssetKey, HTMLImageElement>();
  private dataUrls = new Map<SpriteAssetKey, string>();
  private listeners = new Set<() => void>();

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage() {
    if (typeof window === 'undefined') return;
    for (const def of SPRITE_ASSET_DEFINITIONS) {
      try {
        const savedUrl = window.localStorage.getItem(STORAGE_PREFIX + def.key);
        if (savedUrl) {
          this.loadFromUrl(def.key, savedUrl, false);
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public loadFromUrl(key: SpriteAssetKey, url: string, persist: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.images.set(key, img);
        this.dataUrls.set(key, url);
        if (persist && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_PREFIX + key, url);
          } catch {
            // Storage quota exceeded; keep in memory
          }
        }
        this.notify();
        resolve();
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    });
  }

  public async uploadFile(key: SpriteAssetKey, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result;
        if (typeof result === 'string') {
          try {
            await this.loadFromUrl(key, result, true);
            resolve();
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error('Invalid image file data'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  public clearSprite(key: SpriteAssetKey): void {
    this.images.delete(key);
    this.dataUrls.delete(key);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  public clearAllSprites(): void {
    for (const def of SPRITE_ASSET_DEFINITIONS) {
      this.images.delete(def.key);
      this.dataUrls.delete(def.key);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_PREFIX + def.key);
        } catch {
          // Ignore
        }
      }
    }
    this.notify();
  }

  public hasSprite(key: SpriteAssetKey): boolean {
    const img = this.images.get(key);
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  public getPreviewUrl(key: SpriteAssetKey): string | null {
    return this.dataUrls.get(key) || null;
  }

  public getLoadedCount(): number {
    return this.images.size;
  }

  /**
   * Draws the custom transparent PNG sprite anchored at its isometric bottom-center footprint.
   * Returns true if a custom sprite was drawn, or false if the engine should render its
   * crisp #0D0D14 black-outlined 2.5D Flash/vector fallback illustration.
   */
  public drawBottomCenterAnchoredSprite(
    ctx: CanvasRenderingContext2D,
    key: SpriteAssetKey,
    bottomCenterX: number,
    bottomCenterY: number,
    targetWidth: number,
    targetHeight?: number
  ): boolean {
    const img = this.images.get(key);
    if (!img || !img.complete || img.naturalWidth <= 0) {
      return false;
    }

    const aspect = img.naturalHeight / Math.max(1, img.naturalWidth);
    const drawW = targetWidth;
    const drawH = targetHeight ?? drawW * aspect;

    const drawX = bottomCenterX - drawW * 0.5;
    const drawY = bottomCenterY - drawH;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return true;
  }
}

export const assetManager = new IsometricAssetManager();
