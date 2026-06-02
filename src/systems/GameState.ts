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
  dailyActionsRemaining: number;
};

const STORAGE_KEY = 'petit-monde-vivant:state';
const DEFAULT_FOREST_MAX = 100;
export const DAILY_ACTIONS_PER_DAY = 2;

const DEFAULT_STATE: SavedState = {
  resources: {
    wood: 0,
    stone: 0,
  },
  activity: 'village',
  forestCurrent: DEFAULT_FOREST_MAX,
  forestMax: DEFAULT_FOREST_MAX,
  triggeredForestThresholds: [],
  dailyActionsRemaining: DAILY_ACTIONS_PER_DAY,
};

export class GameState {
  resources: Resources;
  activity: Activity;
  forestCurrent: number;
  forestMax: number;
  triggeredForestThresholds: ForestThreshold[];
  dailyActionsRemaining: number;

  constructor() {
    const savedState = this.load();

    this.resources = savedState.resources;
    this.activity = savedState.activity;
    this.forestCurrent = savedState.forestCurrent;
    this.forestMax = savedState.forestMax;
    this.triggeredForestThresholds = savedState.triggeredForestThresholds;
    this.dailyActionsRemaining = savedState.dailyActionsRemaining;
  }

  setActivity(activity: Activity): void {
    if (activity === 'forest' && !this.canUseForest()) {
      return;
    }

    this.activity = activity;
    this.save();
  }

  produce(
    forestStockPreservationChance = 0,
    mineExtraStoneChance = 0,
  ): ForestThreshold[] {
    const newForestThresholds: ForestThreshold[] = [];

    if (this.activity === 'forest') {
      if (!this.canUseForest()) {
        this.activity = 'village';
        this.save();
        return newForestThresholds;
      }

      this.resources.wood += 1;
      if (Math.random() >= forestStockPreservationChance) {
        this.forestCurrent = Math.max(0, this.forestCurrent - 1);
        newForestThresholds.push(...this.collectForestThresholds());
      }

      if (!this.canUseForest()) {
        this.activity = 'village';
      }
    }

    if (this.activity === 'mine') {
      this.resources.stone += Math.random() < mineExtraStoneChance ? 2 : 1;
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

  spendResources(resources: Partial<Resources>): boolean {
    const wood = Math.max(0, Math.floor(resources.wood || 0));
    const stone = Math.max(0, Math.floor(resources.stone || 0));

    if (this.resources.wood < wood || this.resources.stone < stone) {
      return false;
    }

    this.resources.wood -= wood;
    this.resources.stone -= stone;
    this.save();
    return true;
  }

  addResources(resources: Partial<Resources>): void {
    this.resources.wood += Math.max(0, Math.floor(resources.wood || 0));
    this.resources.stone += Math.max(0, Math.floor(resources.stone || 0));
    this.save();
  }

  canUseDailyAction(): boolean {
    return this.dailyActionsRemaining > 0;
  }

  spendDailyAction(): boolean {
    if (!this.canUseDailyAction()) {
      return false;
    }

    this.dailyActionsRemaining = Math.max(0, this.dailyActionsRemaining - 1);
    this.save();
    return true;
  }

  resetDailyActions(): void {
    this.dailyActionsRemaining = DAILY_ACTIONS_PER_DAY;
    this.save();
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
    this.dailyActionsRemaining = DEFAULT_STATE.dailyActionsRemaining;
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
        dailyActionsRemaining: this.dailyActionsRemaining,
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
        dailyActionsRemaining: this.sanitizeDailyActions(
          parsedState.dailyActionsRemaining,
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

  private sanitizeDailyActions(actions: unknown): number {
    if (actions === undefined) {
      return DEFAULT_STATE.dailyActionsRemaining;
    }

    return Math.min(
      Math.max(Math.floor(Number(actions) || 0), 0),
      DAILY_ACTIONS_PER_DAY,
    );
  }

  private isActivity(activity: unknown): activity is Activity {
    return activity === 'forest' || activity === 'mine' || activity === 'village';
  }
}
