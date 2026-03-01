import { normalise } from './dietary';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

// Ingredient substrings mapped to the season(s) they indicate.
// Pantry staples (tinned tomatoes, garlic, onion, oil, etc.) are excluded.
const SEASONAL_INGREDIENTS: Record<string, Season[]> = {
  // Winter
  'blood orange': ['winter'],
  'clementine': ['winter'],
  'satsuma': ['winter'],
  'pomegranate': ['winter'],
  'cranberry': ['winter'],
  'parsnip': ['winter'],
  'swede': ['winter'],
  'turnip': ['winter'],
  'celeriac': ['winter'],
  'brussels sprout': ['winter'],
  'kale': ['winter'],
  'cavolo nero': ['winter'],
  'chicory': ['winter'],
  'radicchio': ['winter'],
  'chestnut': ['winter', 'autumn'],
  'quince': ['winter', 'autumn'],

  // Spring
  'asparagus': ['spring'],
  'jersey royal': ['spring'],
  'new potato': ['spring'],
  'spring onion': ['spring'],
  'radish': ['spring'],
  'watercress': ['spring'],
  'sorrel': ['spring'],
  'wild garlic': ['spring'],
  'rhubarb': ['spring'],
  'purple sprouting broccoli': ['spring'],
  'spring greens': ['spring'],
  'lamb': ['spring'],
  'pea shoot': ['spring'],
  'morel': ['spring'],
  'mint': ['spring', 'summer'],

  // Summer
  'tomato': ['summer'],
  'courgette': ['summer'],
  'zucchini': ['summer'],
  'aubergine': ['summer'],
  'eggplant': ['summer'],
  'bell pepper': ['summer'],
  'sweetcorn': ['summer'],
  'corn on the cob': ['summer'],
  'cucumber': ['summer'],
  'strawberry': ['summer'],
  'raspberry': ['summer'],
  'blueberry': ['summer'],
  'blackberry': ['summer', 'autumn'],
  'cherry': ['summer'],

  'peach': ['summer'],
  'nectarine': ['summer'],
  'apricot': ['summer'],
  'watermelon': ['summer'],
  'melon': ['summer'],
  'broad bean': ['summer'],
  'runner bean': ['summer'],
  'french bean': ['summer'],
  'basil': ['summer'],
  'fennel': ['summer'],
  'samphire': ['summer'],

  // Autumn
  'pumpkin': ['autumn'],
  'butternut squash': ['autumn'],
  'squash': ['autumn'],
  'sweet potato': ['autumn'],
  'beetroot': ['autumn'],
  'mushroom': ['autumn'],
  'porcini': ['autumn'],
  'chanterelle': ['autumn'],
  'fig': ['autumn'],
  'damson': ['autumn'],
  'plum': ['autumn'],
  'apple': ['autumn'],
  'pear': ['autumn'],
  'cobnut': ['autumn'],
  'hazelnut': ['autumn'],
  'walnut': ['autumn'],
  'sage': ['autumn'],
  'leek': ['autumn', 'winter'],
  'cauliflower': ['autumn', 'winter'],
  'cabbage': ['autumn', 'winter'],
  'celery': ['autumn'],
};

// Sort longest-first for greedy substring matching (same pattern as dietary.ts)
const sortedKeys = Object.keys(SEASONAL_INGREDIENTS).sort((a, b) => b.length - a.length);

export function inferSeasons(ingredientLines: string[]): Season[] {
  const seasons = new Set<Season>();

  for (const raw of ingredientLines) {
    const line = normalise(raw);
    for (const key of sortedKeys) {
      if (line.includes(key)) {
        for (const s of SEASONAL_INGREDIENTS[key]) {
          seasons.add(s);
        }
        break;
      }
    }
  }

  return [...seasons];
}

const MONTH_TO_SEASON: Season[] = [
  'winter',  // Jan
  'winter',  // Feb
  'spring',  // Mar
  'spring',  // Apr
  'spring',  // May
  'summer',  // Jun
  'summer',  // Jul
  'summer',  // Aug
  'autumn',  // Sep
  'autumn',  // Oct
  'autumn',  // Nov
  'winter',  // Dec
];

export function getCurrentSeason(): Season {
  return MONTH_TO_SEASON[new Date().getMonth()];
}
