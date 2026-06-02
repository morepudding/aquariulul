export type RegionalProjectStatus = 'not_started' | 'in_progress' | 'completed';

export type OldBridgeProjectState = {
  status: RegionalProjectStatus;
  daysUntilBridgePassable: number;
  daysUntilMerchantsMoreNumerous: number;
};

type SavedRegionalProjects = {
  oldBridge: OldBridgeProjectState;
};

export const OLD_BRIDGE_PROJECT = {
  name: 'Réparer le vieux pont',
  costWood: 50,
};

export const OLD_BRIDGE_STARTED_TEXT =
  'Les habitants ont commencé la réparation du vieux pont.';

const OLD_BRIDGE_PASSABLE_TEXT = 'Le vieux pont est désormais praticable.';
const OLD_BRIDGE_MERCHANTS_TEXT =
  'Les marchands semblent plus nombreux sur la route.';

const STORAGE_KEY = 'petit-monde-vivant:regional-projects';

const DEFAULT_OLD_BRIDGE_STATE: OldBridgeProjectState = {
  status: 'not_started',
  daysUntilBridgePassable: 0,
  daysUntilMerchantsMoreNumerous: 0,
};

const DEFAULT_STATE: SavedRegionalProjects = {
  oldBridge: DEFAULT_OLD_BRIDGE_STATE,
};

export class RegionalProjects {
  oldBridge: OldBridgeProjectState;

  constructor() {
    const savedState = this.load();

    this.oldBridge = savedState.oldBridge;
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

  advanceDay(): string[] {
    if (this.oldBridge.status !== 'in_progress') {
      return [];
    }

    const events: string[] = [];
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

    this.save();
    return events;
  }

  reset(): void {
    this.oldBridge = structuredClone(DEFAULT_OLD_BRIDGE_STATE);
    this.save();
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        oldBridge: this.oldBridge,
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
