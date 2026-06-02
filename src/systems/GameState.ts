export type Activity = 'forest' | 'mine' | 'village';

export type Resources = {
  wood: number;
  stone: number;
};

export type ForestThreshold = 'below50' | 'below20' | 'empty';

type SavedState = {
  resources: Resources;
  activity: Activity;
  forestCurrent: number;
  forestMax: number;
  triggeredForestThresholds: ForestThreshold[];
};

const STORAGE_KEY = 'petit-monde-vivant:state';
const DEFAULT_FOREST_MAX = 100;

const DEFAULT_STATE: SavedState = {
  resources: {
    wood: 0,
    stone: 0,
  },
  activity: 'village',
  forestCurrent: DEFAULT_FOREST_MAX,
  forestMax: DEFAULT_FOREST_MAX,
  triggeredForestThresholds: [],
};

export class GameState {
  resources: Resources;
  activity: Activity;
  forestCurrent: number;
  forestMax: number;
  triggeredForestThresholds: ForestThreshold[];

  constructor() {
    const savedState = this.load();

    this.resources = savedState.resources;
    this.activity = savedState.activity;
    this.forestCurrent = savedState.forestCurrent;
    this.forestMax = savedState.forestMax;
    this.triggeredForestThresholds = savedState.triggeredForestThresholds;
  }

  setActivity(activity: Activity): void {
    if (activity === 'forest' && !this.canUseForest()) {
      return;
    }

    this.activity = activity;
    this.save();
  }

  produce(): ForestThreshold[] {
    const newForestThresholds: ForestThreshold[] = [];

    if (this.activity === 'forest') {
      if (!this.canUseForest()) {
        this.activity = 'village';
        this.save();
        return newForestThresholds;
      }

      this.resources.wood += 1;
      this.forestCurrent = Math.max(0, this.forestCurrent - 1);
      newForestThresholds.push(...this.collectForestThresholds());

      if (!this.canUseForest()) {
        this.activity = 'village';
      }
    }

    if (this.activity === 'mine') {
      this.resources.stone += 1;
    }

    this.save();
    return newForestThresholds;
  }

  harvestForestWood(amount: number): ForestThreshold[] {
    const harvestedWood = Math.max(0, Math.floor(amount));

    if (harvestedWood <= 0) {
      return [];
    }

    this.resources.wood += harvestedWood;
    this.forestCurrent = Math.max(0, this.forestCurrent - harvestedWood);

    const newForestThresholds = this.collectForestThresholds();

    if (!this.canUseForest()) {
      this.activity = 'village';
    }

    this.save();
    return newForestThresholds;
  }

  regenerateForest(): void {
    if (this.forestCurrent >= this.forestMax) {
      return;
    }

    this.forestCurrent = Math.min(this.forestMax, this.forestCurrent + 1);
    this.save();
  }

  spendWood(amount: number): boolean {
    if (this.resources.wood < amount) {
      return false;
    }

    this.resources.wood -= amount;
    this.save();
    return true;
  }

  canUseForest(): boolean {
    return this.forestCurrent > 0;
  }

  reset(): void {
    this.resources = structuredClone(DEFAULT_STATE.resources);
    this.activity = DEFAULT_STATE.activity;
    this.forestCurrent = DEFAULT_STATE.forestCurrent;
    this.forestMax = DEFAULT_STATE.forestMax;
    this.triggeredForestThresholds = [];
    this.save();
  }

  save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        resources: this.resources,
        activity: this.activity,
        forestCurrent: this.forestCurrent,
        forestMax: this.forestMax,
        triggeredForestThresholds: this.triggeredForestThresholds,
      }),
    );
  }

  private load(): SavedState {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return structuredClone(DEFAULT_STATE);
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<SavedState>;
      const forestMax = this.sanitizeForestMax(parsedState.forestMax);
      const forestCurrent = this.sanitizeForestCurrent(
        parsedState.forestCurrent,
        forestMax,
      );
      const activity = this.isActivity(parsedState.activity)
        ? parsedState.activity
        : DEFAULT_STATE.activity;

      return {
        resources: {
          wood: Number(parsedState.resources?.wood) || 0,
          stone: Number(parsedState.resources?.stone) || 0,
        },
        activity:
          activity === 'forest' && forestCurrent <= 0 ? 'village' : activity,
        forestCurrent,
        forestMax,
        triggeredForestThresholds: this.sanitizeForestThresholds(
          parsedState.triggeredForestThresholds,
        ),
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  private collectForestThresholds(): ForestThreshold[] {
    const thresholds: ForestThreshold[] = [];

    if (this.forestCurrent < 50) {
      thresholds.push(...this.markForestThreshold('below50'));
    }

    if (this.forestCurrent < 20) {
      thresholds.push(...this.markForestThreshold('below20'));
    }

    if (this.forestCurrent === 0) {
      thresholds.push(...this.markForestThreshold('empty'));
    }

    return thresholds;
  }

  private markForestThreshold(threshold: ForestThreshold): ForestThreshold[] {
    if (this.triggeredForestThresholds.includes(threshold)) {
      return [];
    }

    this.triggeredForestThresholds = [
      ...this.triggeredForestThresholds,
      threshold,
    ];
    return [threshold];
  }

  private sanitizeForestMax(forestMax: unknown): number {
    const value = Number(forestMax) || DEFAULT_STATE.forestMax;

    return Math.max(1, value);
  }

  private sanitizeForestCurrent(forestCurrent: unknown, forestMax: number): number {
    if (forestCurrent === undefined) {
      return DEFAULT_STATE.forestCurrent;
    }

    return Math.min(Math.max(Number(forestCurrent) || 0, 0), forestMax);
  }

  private sanitizeForestThresholds(thresholds: unknown): ForestThreshold[] {
    if (!Array.isArray(thresholds)) {
      return [];
    }

    return thresholds.filter((threshold): threshold is ForestThreshold => {
      return (
        threshold === 'below50' ||
        threshold === 'below20' ||
        threshold === 'empty'
      );
    });
  }

  private isActivity(activity: unknown): activity is Activity {
    return activity === 'forest' || activity === 'mine' || activity === 'village';
  }
}
