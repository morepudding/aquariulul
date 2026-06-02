export type RegionalProjectStatus = 'not_started' | 'in_progress' | 'completed';

export type OldBridgeProjectState = {
  status: RegionalProjectStatus;
  daysUntilBridgePassable: number;
  daysUntilMerchantsMoreNumerous: number;
};

export type ForestRoadProjectState = {
  status: RegionalProjectStatus;
  daysUntilCompleted: number;
};

export type MineSupportsProjectState = {
  status: RegionalProjectStatus;
  daysUntilCompleted: number;
};

type SavedRegionalProjects = {
  oldBridge: OldBridgeProjectState;
  forestRoad: ForestRoadProjectState;
  mineSupports: MineSupportsProjectState;
};

export const OLD_BRIDGE_PROJECT = {
  name: 'Réparer le vieux pont',
  costWood: 50,
};

export const OLD_BRIDGE_STARTED_TEXT =
  'Les habitants ont commencé la réparation du vieux pont.';

export const FOREST_ROAD_PROJECT = {
  name: 'Tracer une route forestière',
  costWood: 30,
  costStone: 20,
  completionDays: 4,
};

export const FOREST_ROAD_STARTED_TEXT =
  'Des villageois commencent à tracer une route discrète vers les bois les plus denses.';

export const MINE_SUPPORTS_PROJECT = {
  name: 'Étayer l’entrée de la mine',
  costWood: 40,
  costStone: 30,
  completionDays: 4,
};

export const MINE_SUPPORTS_STARTED_TEXT =
  'Des poutres sont apportées jusqu’à l’entrée de la mine. Les villageois parlent d’un travail long, sombre et nécessaire.';

const OLD_BRIDGE_PASSABLE_TEXT = 'Le vieux pont est désormais praticable.';
const OLD_BRIDGE_MERCHANTS_TEXT =
  'Les marchands semblent plus nombreux sur la route.';
const FOREST_ROAD_COMPLETED_TEXT =
  'La nouvelle route forestière permet d’exploiter les bois avec moins de pertes et moins d’allers-retours inutiles.';
const MINE_SUPPORTS_COMPLETED_TEXT =
  'L’entrée de la mine est désormais mieux étayée. Les mineurs perdent moins de temps à sécuriser les galeries les plus proches.';

const STORAGE_KEY = 'petit-monde-vivant:regional-projects';

const DEFAULT_OLD_BRIDGE_STATE: OldBridgeProjectState = {
  status: 'not_started',
  daysUntilBridgePassable: 0,
  daysUntilMerchantsMoreNumerous: 0,
};

const DEFAULT_FOREST_ROAD_STATE: ForestRoadProjectState = {
  status: 'not_started',
  daysUntilCompleted: 0,
};

const DEFAULT_MINE_SUPPORTS_STATE: MineSupportsProjectState = {
  status: 'not_started',
  daysUntilCompleted: 0,
};

const DEFAULT_STATE: SavedRegionalProjects = {
  oldBridge: DEFAULT_OLD_BRIDGE_STATE,
  forestRoad: DEFAULT_FOREST_ROAD_STATE,
  mineSupports: DEFAULT_MINE_SUPPORTS_STATE,
};

export class RegionalProjects {
  oldBridge: OldBridgeProjectState;
  forestRoad: ForestRoadProjectState;
  mineSupports: MineSupportsProjectState;

  constructor() {
    const savedState = this.load();

    this.oldBridge = savedState.oldBridge;
    this.forestRoad = savedState.forestRoad;
    this.mineSupports = savedState.mineSupports;
  }

  canFundOldBridge(wood: number): boolean {
    return (
      this.oldBridge.status === 'not_started' &&
      wood >= OLD_BRIDGE_PROJECT.costWood
    );
  }

  fundOldBridge(): string | null {
    if (this.oldBridge.status !== 'not_started') {
      return null;
    }

    this.oldBridge = {
      status: 'in_progress',
      daysUntilBridgePassable: 3,
      daysUntilMerchantsMoreNumerous: 6,
    };
    this.save();

    return OLD_BRIDGE_STARTED_TEXT;
  }

  canFundForestRoad(wood: number, stone: number): boolean {
    return (
      this.oldBridge.status === 'completed' &&
      this.forestRoad.status === 'not_started' &&
      wood >= FOREST_ROAD_PROJECT.costWood &&
      stone >= FOREST_ROAD_PROJECT.costStone
    );
  }

  fundForestRoad(): string | null {
    if (
      this.oldBridge.status !== 'completed' ||
      this.forestRoad.status !== 'not_started'
    ) {
      return null;
    }

    this.forestRoad = {
      status: 'in_progress',
      daysUntilCompleted: FOREST_ROAD_PROJECT.completionDays,
    };
    this.save();

    return FOREST_ROAD_STARTED_TEXT;
  }

  hasCompletedForestRoad(): boolean {
    return this.forestRoad.status === 'completed';
  }

  canFundMineSupports(wood: number, stone: number): boolean {
    return (
      this.oldBridge.status === 'completed' &&
      this.mineSupports.status === 'not_started' &&
      wood >= MINE_SUPPORTS_PROJECT.costWood &&
      stone >= MINE_SUPPORTS_PROJECT.costStone
    );
  }

  fundMineSupports(): string | null {
    if (
      this.oldBridge.status !== 'completed' ||
      this.mineSupports.status !== 'not_started'
    ) {
      return null;
    }

    this.mineSupports = {
      status: 'in_progress',
      daysUntilCompleted: MINE_SUPPORTS_PROJECT.completionDays,
    };
    this.save();

    return MINE_SUPPORTS_STARTED_TEXT;
  }

  hasCompletedMineSupports(): boolean {
    return this.mineSupports.status === 'completed';
  }

  advanceDay(): string[] {
    const events: string[] = [];

    if (this.oldBridge.status === 'in_progress') {
      const previousDaysUntilBridgePassable =
        this.oldBridge.daysUntilBridgePassable;
      const previousDaysUntilMerchantsMoreNumerous =
        this.oldBridge.daysUntilMerchantsMoreNumerous;

      this.oldBridge = {
        ...this.oldBridge,
        daysUntilBridgePassable: Math.max(
          0,
          this.oldBridge.daysUntilBridgePassable - 1,
        ),
        daysUntilMerchantsMoreNumerous: Math.max(
          0,
          this.oldBridge.daysUntilMerchantsMoreNumerous - 1,
        ),
      };

      if (
        previousDaysUntilBridgePassable > 0 &&
        this.oldBridge.daysUntilBridgePassable === 0
      ) {
        events.push(OLD_BRIDGE_PASSABLE_TEXT);
      }

      if (
        previousDaysUntilMerchantsMoreNumerous > 0 &&
        this.oldBridge.daysUntilMerchantsMoreNumerous === 0
      ) {
        events.push(OLD_BRIDGE_MERCHANTS_TEXT);
        this.oldBridge = {
          ...this.oldBridge,
          status: 'completed',
        };
      }
    }

    if (this.forestRoad.status === 'in_progress') {
      const previousDaysUntilCompleted = this.forestRoad.daysUntilCompleted;

      this.forestRoad = {
        ...this.forestRoad,
        daysUntilCompleted: Math.max(0, this.forestRoad.daysUntilCompleted - 1),
      };

      if (
        previousDaysUntilCompleted > 0 &&
        this.forestRoad.daysUntilCompleted === 0
      ) {
        events.push(FOREST_ROAD_COMPLETED_TEXT);
        this.forestRoad = {
          ...this.forestRoad,
          status: 'completed',
        };
      }
    }

    if (this.mineSupports.status === 'in_progress') {
      const previousDaysUntilCompleted = this.mineSupports.daysUntilCompleted;

      this.mineSupports = {
        ...this.mineSupports,
        daysUntilCompleted: Math.max(
          0,
          this.mineSupports.daysUntilCompleted - 1,
        ),
      };

      if (
        previousDaysUntilCompleted > 0 &&
        this.mineSupports.daysUntilCompleted === 0
      ) {
        events.push(MINE_SUPPORTS_COMPLETED_TEXT);
        this.mineSupports = {
          ...this.mineSupports,
          status: 'completed',
        };
      }
    }

    this.save();
    return events;
  }

  reset(): void {
    this.oldBridge = structuredClone(DEFAULT_OLD_BRIDGE_STATE);
    this.forestRoad = structuredClone(DEFAULT_FOREST_ROAD_STATE);
    this.mineSupports = structuredClone(DEFAULT_MINE_SUPPORTS_STATE);
    this.save();
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        oldBridge: this.oldBridge,
        forestRoad: this.forestRoad,
        mineSupports: this.mineSupports,
      }),
    );
  }

  private load(): SavedRegionalProjects {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return structuredClone(DEFAULT_STATE);
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<SavedRegionalProjects>;

      return {
        oldBridge: this.sanitizeOldBridgeState(parsedState.oldBridge),
        forestRoad: this.sanitizeForestRoadState(parsedState.forestRoad),
        mineSupports: this.sanitizeMineSupportsState(parsedState.mineSupports),
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  private sanitizeOldBridgeState(state: unknown): OldBridgeProjectState {
    if (typeof state !== 'object' || state === null) {
      return structuredClone(DEFAULT_OLD_BRIDGE_STATE);
    }

    const candidate = state as Partial<OldBridgeProjectState>;
    const status = this.sanitizeStatus(candidate.status);

    if (status === 'not_started') {
      return structuredClone(DEFAULT_OLD_BRIDGE_STATE);
    }

    if (status === 'completed') {
      return {
        status,
        daysUntilBridgePassable: 0,
        daysUntilMerchantsMoreNumerous: 0,
      };
    }

    const daysUntilBridgePassable = this.sanitizeRemainingDays(
      candidate.daysUntilBridgePassable,
    );
    const daysUntilMerchantsMoreNumerous = this.sanitizeRemainingDays(
      candidate.daysUntilMerchantsMoreNumerous,
    );

    if (daysUntilBridgePassable <= 0 && daysUntilMerchantsMoreNumerous <= 0) {
      return {
        status: 'completed',
        daysUntilBridgePassable: 0,
        daysUntilMerchantsMoreNumerous: 0,
      };
    }

    return {
      status,
      daysUntilBridgePassable,
      daysUntilMerchantsMoreNumerous,
    };
  }

  private sanitizeForestRoadState(state: unknown): ForestRoadProjectState {
    if (typeof state !== 'object' || state === null) {
      return structuredClone(DEFAULT_FOREST_ROAD_STATE);
    }

    const candidate = state as Partial<ForestRoadProjectState>;
    const status = this.sanitizeStatus(candidate.status);

    if (status === 'not_started') {
      return structuredClone(DEFAULT_FOREST_ROAD_STATE);
    }

    if (status === 'completed') {
      return {
        status,
        daysUntilCompleted: 0,
      };
    }

    const daysUntilCompleted = this.sanitizeRemainingDays(
      candidate.daysUntilCompleted,
    );

    if (daysUntilCompleted <= 0) {
      return {
        status: 'completed',
        daysUntilCompleted: 0,
      };
    }

    return {
      status,
      daysUntilCompleted,
    };
  }

  private sanitizeMineSupportsState(state: unknown): MineSupportsProjectState {
    if (typeof state !== 'object' || state === null) {
      return structuredClone(DEFAULT_MINE_SUPPORTS_STATE);
    }

    const candidate = state as Partial<MineSupportsProjectState>;
    const status = this.sanitizeStatus(candidate.status);

    if (status === 'not_started') {
      return structuredClone(DEFAULT_MINE_SUPPORTS_STATE);
    }

    if (status === 'completed') {
      return {
        status,
        daysUntilCompleted: 0,
      };
    }

    const daysUntilCompleted = this.sanitizeRemainingDays(
      candidate.daysUntilCompleted,
    );

    if (daysUntilCompleted <= 0) {
      return {
        status: 'completed',
        daysUntilCompleted: 0,
      };
    }

    return {
      status,
      daysUntilCompleted,
    };
  }

  private sanitizeRemainingDays(days: unknown): number {
    return Math.max(0, Math.floor(Number(days) || 0));
  }

  private sanitizeStatus(status: unknown): RegionalProjectStatus {
    if (
      status === 'not_started' ||
      status === 'in_progress' ||
      status === 'completed'
    ) {
      return status;
    }

    return DEFAULT_OLD_BRIDGE_STATE.status;
  }
}
