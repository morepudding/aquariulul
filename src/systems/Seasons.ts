export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonInfo = {
  id: SeasonId;
  label: string;
  dayInSeason: number;
  dayInYear: number;
  forestRegenerationDelayMs: number;
  villageRequestChance: number;
  merchantRouteChance: number;
  transitionChronicle: string;
};

export const DAYS_PER_SEASON = 10;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * 4;

const SEASONS = [
  {
    id: 'spring',
    label: 'Printemps',
    forestRegenerationDelayMs: 8000,
    villageRequestChance: 0.4,
    merchantRouteChance: 0.3,
    transitionChronicle:
      'Les premières pousses percent entre les pierres humides. Le village rouvre ses volets avec prudence.',
  },
  {
    id: 'summer',
    label: 'Été',
    forestRegenerationDelayMs: 10000,
    villageRequestChance: 0.5,
    merchantRouteChance: 0.3,
    transitionChronicle:
      'Les journées s’allongent et les bras manquent. Chaque toit, chaque four, chaque chemin réclame sa part d’effort.',
  },
  {
    id: 'autumn',
    label: 'Automne',
    forestRegenerationDelayMs: 10000,
    villageRequestChance: 0.4,
    merchantRouteChance: 0.4,
    transitionChronicle:
      'Les feuilles roussissent sur les talus. Les charrettes passent plus lourdes, les regards se tournent vers les réserves.',
  },
  {
    id: 'winter',
    label: 'Hiver',
    forestRegenerationDelayMs: 15000,
    villageRequestChance: 0.5,
    merchantRouteChance: 0.3,
    transitionChronicle:
      'Le froid serre les chemins et ralentit les gestes. Le village apprend à compter ce qu’il lui reste.',
  },
] satisfies Array<Omit<SeasonInfo, 'dayInSeason' | 'dayInYear'>>;

export function seasonForDay(day: number): SeasonInfo {
  const safeDay = Math.max(1, Math.floor(day) || 1);
  const zeroBasedDayInYear = (safeDay - 1) % DAYS_PER_YEAR;
  const seasonIndex = Math.floor(zeroBasedDayInYear / DAYS_PER_SEASON);
  const dayInSeason = (zeroBasedDayInYear % DAYS_PER_SEASON) + 1;
  const season = SEASONS[seasonIndex];

  return {
    ...season,
    dayInSeason,
    dayInYear: zeroBasedDayInYear + 1,
  };
}

export function isSeasonStartDay(day: number): boolean {
  return seasonForDay(day).dayInSeason === 1;
}
