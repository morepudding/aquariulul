type SavedDailyWork = {
  lastWoodcutterWorkDay: number;
};

export const WOODCUTTER_WORK = {
  name: 'Travail de bûcheron',
  requiredForestCurrent: 10,
  attempts: 5,
  requiredSuccesses: 3,
  successWood: 10,
  failureWood: 3,
  successChronicle:
    'Vous avez participé à une coupe de bois pour les besoins du village.',
  failureChronicle:
    'Votre journée de coupe fut laborieuse, mais quelques bûches ont été rapportées.',
};

const STORAGE_KEY = 'petit-monde-vivant:daily-work';

const DEFAULT_STATE: SavedDailyWork = {
  lastWoodcutterWorkDay: 0,
};

export class DailyWork {
  lastWoodcutterWorkDay: number;

  constructor() {
    const savedState = this.load();

    this.lastWoodcutterWorkDay = savedState.lastWoodcutterWorkDay;
  }

  canStartWoodcutterWork(
    currentDay: number,
    forestCurrent: number,
    dailyActionsRemaining = 1,
  ): boolean {
    return (
      dailyActionsRemaining > 0 &&
      forestCurrent >= WOODCUTTER_WORK.requiredForestCurrent &&
      this.lastWoodcutterWorkDay !== currentDay
    );
  }

  markWoodcutterWorkDone(day: number): void {
    this.lastWoodcutterWorkDay = Math.max(1, Math.floor(day) || 1);
    this.save();
  }

  reset(): void {
    this.lastWoodcutterWorkDay = DEFAULT_STATE.lastWoodcutterWorkDay;
    this.save();
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastWoodcutterWorkDay: this.lastWoodcutterWorkDay,
      }),
    );
  }

  private load(): SavedDailyWork {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return structuredClone(DEFAULT_STATE);
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<SavedDailyWork>;

      return {
        lastWoodcutterWorkDay: Math.max(
          0,
          Math.floor(Number(parsedState.lastWoodcutterWorkDay) || 0),
        ),
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }
}
