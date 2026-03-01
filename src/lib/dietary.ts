import ingredientDb from '../data/ingredients.json';

type IngredientDB = Record<string, { violates: string[] }>;

const ALL_DIETS = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free'] as const;
export type Diet = (typeof ALL_DIETS)[number];

const db = ingredientDb as IngredientDB;

// Sort keys longest-first for greedy substring matching
const sortedKeys = Object.keys(db).sort((a, b) => b.length - a.length);

export function normalise(line: string): string {
  return line
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents: é→e, à→a, etc.
    .replace(/[\d.,/½⅓¼¾⅔⅛]+/g, '')       // strip numbers & fractions
    .replace(/\b(g|kg|ml|l|cl|dl|oz|lb|tsp|tbsp|cup|cups|tablespoon|teaspoon|bunch|clove|cloves|pinch|handful|slice|slices|piece|pieces|large|small|medium|fresh|dried|ground|whole|finely|roughly|chopped|diced|minced|grated|sliced|to taste|optional|c a s|c a c|cuil a soupe|cuil a cafe|gousse|gousses|pincee|poignee|tranche|tranches|morceau|morceaux|botte|brin|brins|gros|petit|moyen|frais|fraiche|seche|sechee|moulu|entier|entiere|finement|grossierement|hache|emince|rape|coupe|fondu|cuit|cuite|un peu)\b/g, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferDietary(ingredientLines: string[]): Diet[] {
  const violations = new Set<string>();

  for (const raw of ingredientLines) {
    const line = normalise(raw);

    for (const key of sortedKeys) {
      if (line.includes(key)) {
        for (const v of db[key].violates) {
          violations.add(v);
        }
        break; // longest match wins, move to next ingredient
      }
    }
  }

  return ALL_DIETS.filter((d) => !violations.has(d));
}
