import type { ForestThreshold } from './GameState';

export type ChronicleEvent = {
  day: number;
  text: string;
};

type SavedChronicle = {
  currentDay: number;
  events: ChronicleEvent[];
};

const STORAGE_KEY = 'petit-monde-vivant:chronicle';
const MAX_EVENTS = 20;

const CHRONICLE_EVENTS = [
  'Une caravane traverse la région.',
  "La forêt semble calme aujourd'hui.",
  'Des chasseurs ont été aperçus près du village.',
  'La pluie tombe depuis le matin.',
  "Un marchand s'installe sur la place du village.",
];

const FOREST_CHRONICLE_TEXTS: Record<ForestThreshold, string> = {
  below50: 'Les habitants remarquent que les arbres se raréfient.',
  below20: 'La forêt semble inquiétamment clairsemée.',
  empty: 'La forêt locale a été entièrement exploitée.',
};

const DEFAULT_CHRONICLE: SavedChronicle = {
  currentDay: 1,
  events: [],
};

export class WorldChronicle {
  currentDay: number;
  events: ChronicleEvent[];

  constructor() {
    const savedChronicle = this.load();

    this.currentDay = savedChronicle.currentDay;
    this.events = savedChronicle.events;
  }

  advanceDay(): void {
    this.currentDay += 1;
    this.addEvent(this.randomEvent());
  }

  addForestThresholdEvent(threshold: ForestThreshold): void {
    this.addEvent(FOREST_CHRONICLE_TEXTS[threshold]);
  }

  reset(): void {
    this.currentDay = DEFAULT_CHRONICLE.currentDay;
    this.events = [];
    this.save();
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentDay: this.currentDay,
        events: this.events,
      }),
    );
  }

  private load(): SavedChronicle {
    const rawChronicle = localStorage.getItem(STORAGE_KEY);

    if (!rawChronicle) {
      return structuredClone(DEFAULT_CHRONICLE);
    }

    try {
      const parsedChronicle = JSON.parse(rawChronicle) as Partial<SavedChronicle>;

      return {
        currentDay: Math.max(1, Number(parsedChronicle.currentDay) || 1),
        events: this.sanitizeEvents(parsedChronicle.events),
      };
    } catch {
      return structuredClone(DEFAULT_CHRONICLE);
    }
  }

  private sanitizeEvents(events: unknown): ChronicleEvent[] {
    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .filter((event): event is Partial<ChronicleEvent> => {
        return typeof event === 'object' && event !== null;
      })
      .map((event) => ({
        day: Math.max(1, Number(event.day) || 1),
        text: typeof event.text === 'string' ? event.text : '',
      }))
      .filter((event) => event.text.length > 0)
      .slice(0, MAX_EVENTS);
  }

  addEvent(text: string): void {
    this.events = [
      {
        day: this.currentDay,
        text,
      },
      ...this.events,
    ].slice(0, MAX_EVENTS);

    this.save();
  }

  private randomEvent(): string {
    const index = Math.floor(Math.random() * CHRONICLE_EVENTS.length);

    return CHRONICLE_EVENTS[index];
  }
}
