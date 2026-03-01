export interface ScrapedRecipe {
  title: string;
  servings: number;
  prep_time: string;
  cook_time: string;
  cuisine: string;
  ingredients: string[];
  instructions: string;
  image: string;
  source: string;
}

export function parseISODuration(iso: string): string {
  if (!iso) return '0 min';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

function extractNumber(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) || 4 : 4;
}

export function parseYield(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return extractNumber(val);
  if (Array.isArray(val) && val.length > 0) return extractNumber(String(val[0]));
  return 4;
}

export function parseCuisine(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && val.length > 0) return String(val[0]);
  return '';
}

export function parseImage(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
  }
  if (val?.url) return val.url;
  return '';
}

export function parseInstructions(val: any): string {
  if (!val) return '';

  // Array of HowToStep objects
  if (Array.isArray(val)) {
    const steps: string[] = [];
    for (const item of val) {
      if (typeof item === 'string') {
        steps.push(item.trim());
      } else if (item?.text) {
        steps.push(item.text.trim());
      } else if (item?.itemListElement && Array.isArray(item.itemListElement)) {
        // HowToSection
        for (const sub of item.itemListElement) {
          if (sub?.text) steps.push(sub.text.trim());
        }
      }
    }
    return steps
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n\n');
  }

  return String(val);
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LunchboxBot/1.0)' },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const html = await res.text();

  // Extract all JSON-LD blocks
  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let recipeLD: any = null;

  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      // Direct Recipe object
      if (data['@type'] === 'Recipe') {
        recipeLD = data;
        break;
      }

      // @graph array
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Recipe') {
            recipeLD = item;
            break;
          }
        }
        if (recipeLD) break;
      }

      // Plain array
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@type'] === 'Recipe') {
            recipeLD = item;
            break;
          }
        }
        if (recipeLD) break;
      }
    } catch {
      // skip invalid JSON
    }
  }

  if (!recipeLD) throw new Error('No Recipe JSON-LD found on this page');

  const ingredients = Array.isArray(recipeLD.recipeIngredient)
    ? recipeLD.recipeIngredient.map((s: string) => s.replace(/\s+/g, ' ').trim())
    : [];

  return {
    title: recipeLD.name?.replace(/\s+/g, ' ').trim() || 'Untitled',
    servings: parseYield(recipeLD.recipeYield),
    prep_time: parseISODuration(recipeLD.prepTime || ''),
    cook_time: parseISODuration(recipeLD.cookTime || ''),
    cuisine: parseCuisine(recipeLD.recipeCuisine),
    ingredients,
    instructions: parseInstructions(recipeLD.recipeInstructions),
    image: parseImage(recipeLD.image),
    source: url,
  };
}
