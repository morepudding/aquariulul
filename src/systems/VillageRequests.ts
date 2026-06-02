import type { Resources } from './GameState';

export type VillageRequestId =
  | 'bakery_wood'
  | 'roof_before_rain'
  | 'old_well_stones';

export type VillageRequestDefinition = {
  id: VillageRequestId;
  name: string;
  cost: Partial<Resources>;
  appearanceChronicle: string;
  successChronicle: string;
  expirationChronicle: string;
};

export type ActiveVillageRequest = {
  id: VillageRequestId;
  daysRemaining: number;
};

type VillageRecognitionThreshold = 3 | 6 | 10;

type SavedVillageRequests = {
  activeRequest: ActiveVillageRequest | null;
  villageHelpedCount: number;
  triggeredRecognitionThresholds: VillageRecognitionThreshold[];
};

const STORAGE_KEY = 'petit-monde-vivant:village-requests';
const REQUEST_DURATION_DAYS = 2;
const NEW_REQUEST_CHANCE = 0.4;

const DEFAULT_STATE: SavedVillageRequests = {
  activeRequest: null,
  villageHelpedCount: 0,
  triggeredRecognitionThresholds: [],
};

const VILLAGE_RECOGNITION_THRESHOLDS = [3, 6, 10] satisfies
  VillageRecognitionThreshold[];

const VILLAGE_RECOGNITION_CHRONICLES: Record<
  VillageRecognitionThreshold,
  string
> = {
  3: 'Depuis quelques jours, on laisse parfois une miche de pain ou une poignée de clous près de votre porte, sans chercher à savoir qui l’a déposée.',
  6: 'Au village, on commence à venir vous chercher quand une poutre menace, quand un seau casse, quand une inquiétude circule.',
  10: 'Votre nom passe de bouche en bouche avec une familiarité nouvelle. On ne parle pas d’un héros, plutôt de quelqu’un sur qui le village peut compter.',
};

export const VILLAGE_REQUESTS = [
  {
    id: 'bakery_wood',
    name: 'Le fournil manque de bois',
    cost: { wood: 8 },
    appearanceChronicle:
      'Le fournil manque de bois sec. Sans aide, le pain sera plus rare demain.',
    successChronicle:
      'Le fournil chauffe avant l’aube. Une odeur de pain chaud descend jusque sur la place du village.',
    expirationChronicle:
      'Le fournil a tourné au ralenti. Le village s’éveille avec moins de pain sur les tables.',
  },
  {
    id: 'roof_before_rain',
    name: 'Réparer un toit avant la pluie',
    cost: { wood: 10, stone: 4 },
    appearanceChronicle:
      'Une famille demande de l’aide pour renforcer son toit avant que le ciel ne se gâte.',
    successChronicle:
      'Le toit tient bon. À la première pluie, personne ne doit poser de seau sous les poutres.',
    expirationChronicle:
      'La pluie trouve les failles du vieux toit. On entend parler d’une nuit froide et humide.',
  },
  {
    id: 'old_well_stones',
    name: 'Des pierres pour le vieux puits',
    cost: { stone: 12 },
    appearanceChronicle:
      'Le vieux puits s’effrite. Quelques pierres suffiraient à éviter qu’il ne devienne dangereux.',
    successChronicle:
      'Le puits est consolidé. Les seaux remontent sans racler les bords branlants.',
    expirationChronicle:
      'Personne n’a eu le temps de renforcer le puits. Les villageois l’utilisent avec prudence.',
  },
] satisfies VillageRequestDefinition[];

export class VillageRequests {
  activeRequest: ActiveVillageRequest | null;
  villageHelpedCount: number;
  triggeredRecognitionThresholds: VillageRecognitionThreshold[];

  constructor() {
    const savedState = this.load();

    this.activeRequest = savedState.activeRequest;
    this.villageHelpedCount = savedState.villageHelpedCount;
    this.triggeredRecognitionThresholds =
      savedState.triggeredRecognitionThresholds;
  }

  getActiveDefinition(): VillageRequestDefinition | null {
    if (!this.activeRequest) {
      return null;
    }

    return this.definitionFor(this.activeRequest.id);
  }

  canCompleteActive(resources: Resources): boolean {
    const definition = this.getActiveDefinition();

    if (!definition) {
      return false;
    }

    return (
      resources.wood >= Math.max(0, Math.floor(definition.cost.wood || 0)) &&
      resources.stone >= Math.max(0, Math.floor(definition.cost.stone || 0))
    );
  }

  completeActive(): string[] {
    const definition = this.getActiveDefinition();

    if (!definition) {
      return [];
    }

    this.activeRequest = null;
    this.villageHelpedCount += 1;
    const recognitionChronicles = this.collectRecognitionChronicles();
    this.save();
    return [definition.successChronicle, ...recognitionChronicles];
  }

  advanceDay(newRequestChance = NEW_REQUEST_CHANCE): string[] {
    const events: string[] = [];
    const requestChance = Math.min(Math.max(newRequestChance, 0), 1);

    if (this.activeRequest) {
      const definition = this.getActiveDefinition();
      const daysRemaining = Math.max(0, this.activeRequest.daysRemaining - 1);

      if (definition && daysRemaining <= 0) {
        events.push(definition.expirationChronicle);
        this.activeRequest = null;
      } else {
        this.activeRequest = {
          ...this.activeRequest,
          daysRemaining,
        };
      }
    }

    if (!this.activeRequest && Math.random() < requestChance) {
      const definition = this.pickRequest();

      this.activeRequest = {
        id: definition.id,
        daysRemaining: REQUEST_DURATION_DAYS,
      };
      events.push(definition.appearanceChronicle);
    }

    this.save();
    return events;
  }

  reset(): void {
    this.activeRequest = DEFAULT_STATE.activeRequest;
    this.villageHelpedCount = DEFAULT_STATE.villageHelpedCount;
    this.triggeredRecognitionThresholds = [
      ...DEFAULT_STATE.triggeredRecognitionThresholds,
    ];
    this.save();
  }

  private save(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeRequest: this.activeRequest,
        villageHelpedCount: this.villageHelpedCount,
        triggeredRecognitionThresholds: this.triggeredRecognitionThresholds,
      }),
    );
  }

  private load(): SavedVillageRequests {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return structuredClone(DEFAULT_STATE);
    }

    try {
      const parsedState = JSON.parse(rawState) as Partial<SavedVillageRequests>;

      return {
        activeRequest: this.sanitizeActiveRequest(parsedState.activeRequest),
        villageHelpedCount: this.sanitizeHelpedCount(
          parsedState.villageHelpedCount,
        ),
        triggeredRecognitionThresholds:
          this.sanitizeRecognitionThresholds(
            parsedState.triggeredRecognitionThresholds,
          ),
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  private collectRecognitionChronicles(): string[] {
    const chronicles: string[] = [];

    for (const threshold of VILLAGE_RECOGNITION_THRESHOLDS) {
      if (
        this.villageHelpedCount >= threshold &&
        !this.triggeredRecognitionThresholds.includes(threshold)
      ) {
        this.triggeredRecognitionThresholds = [
          ...this.triggeredRecognitionThresholds,
          threshold,
        ];
        chronicles.push(VILLAGE_RECOGNITION_CHRONICLES[threshold]);
      }
    }

    return chronicles;
  }

  private sanitizeActiveRequest(request: unknown): ActiveVillageRequest | null {
    if (typeof request !== 'object' || request === null) {
      return null;
    }

    const candidate = request as Partial<ActiveVillageRequest>;

    const definition = this.definitionFor(candidate.id);

    if (!definition) {
      return null;
    }

    const daysRemaining = Math.max(
      0,
      Math.floor(Number(candidate.daysRemaining) || 0),
    );

    if (daysRemaining <= 0) {
      return null;
    }

    return {
      id: definition.id,
      daysRemaining,
    };
  }

  private sanitizeHelpedCount(count: unknown): number {
    return Math.max(0, Math.floor(Number(count) || 0));
  }

  private sanitizeRecognitionThresholds(
    thresholds: unknown,
  ): VillageRecognitionThreshold[] {
    if (!Array.isArray(thresholds)) {
      return [];
    }

    return thresholds.filter(
      (threshold): threshold is VillageRecognitionThreshold => {
        return (
          threshold === 3 ||
          threshold === 6 ||
          threshold === 10
        );
      },
    );
  }

  private pickRequest(): VillageRequestDefinition {
    const index = Math.floor(Math.random() * VILLAGE_REQUESTS.length);

    return VILLAGE_REQUESTS[index];
  }

  private definitionFor(
    id: unknown,
  ): VillageRequestDefinition | null {
    return VILLAGE_REQUESTS.find((request) => request.id === id) || null;
  }
}
