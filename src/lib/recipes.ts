import matter from 'gray-matter';
import { marked } from 'marked';

export interface RecipeData {
  title: string;
  servings: number;
  prep_time: string;
  cook_time: string;
  cuisine?: string;
  meal_type: string;
  difficulty: string;
  tags: string[];
  date: string;
  added_by: string;
  source?: string;
  image?: string;
  ratings: Record<string, number>;
  ingredients: string[];
}

export interface RecipeEntry {
  id: string;
  data: RecipeData;
  body: string;
  renderedHTML: string;
}

export function parseRecipeContent(raw: string, id: string): RecipeEntry {
  const { data, content } = matter(raw);
  const renderedHTML = marked.parse(content, { async: false }) as string;

  return {
    id,
    data: {
      title: data.title ?? '',
      servings: Number(data.servings) || 4,
      prep_time: data.prep_time ?? '',
      cook_time: data.cook_time ?? '',
      cuisine: data.cuisine,
      meal_type: data.meal_type ?? 'dinner',
      difficulty: data.difficulty ?? 'medium',
      tags: Array.isArray(data.tags) ? data.tags : [],
      date: data.date ? String(data.date).split('T')[0] : '2025-01-01',
      added_by: data.added_by ?? '',
      source: data.source,
      image: data.image,
      ratings: data.ratings ?? {},
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    },
    body: content,
    renderedHTML,
  };
}

export async function getAllRecipes(kv: KVNamespace): Promise<RecipeEntry[]> {
  const list = await kv.list();
  const entries: RecipeEntry[] = [];
  for (const key of list.keys) {
    const raw = await kv.get(key.name);
    if (raw) entries.push(parseRecipeContent(raw, key.name));
  }
  return entries;
}

export async function getRecipeById(kv: KVNamespace, id: string): Promise<RecipeEntry | undefined> {
  const raw = await kv.get(id);
  if (!raw) return undefined;
  return parseRecipeContent(raw, id);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function renderFrontmatter(data: RecipeData): string {
  const lines: string[] = ['---'];
  lines.push(`title: ${JSON.stringify(data.title)}`);
  lines.push(`servings: ${data.servings}`);
  lines.push(`prep_time: ${JSON.stringify(data.prep_time)}`);
  lines.push(`cook_time: ${JSON.stringify(data.cook_time)}`);
  if (data.cuisine) lines.push(`cuisine: ${JSON.stringify(data.cuisine)}`);
  lines.push(`meal_type: ${data.meal_type}`);
  lines.push(`difficulty: ${data.difficulty}`);
  lines.push(`tags: [${data.tags.join(', ')}]`);
  lines.push(`date: ${data.date}`);
  lines.push(`added_by: ${data.added_by}`);
  if (data.source) lines.push(`source: ${JSON.stringify(data.source)}`);
  if (data.image) lines.push(`image: ${JSON.stringify(data.image)}`);
  if (data.ratings && Object.keys(data.ratings).length > 0) {
    lines.push('ratings:');
    for (const [user, rating] of Object.entries(data.ratings)) {
      lines.push(`  ${user}: ${rating}`);
    }
  }
  lines.push('ingredients:');
  for (const ing of data.ingredients) {
    lines.push(`  - ${ing}`);
  }
  lines.push('---');
  return lines.join('\n');
}

export function serializeRecipe(data: RecipeData, body: string): string {
  return `${renderFrontmatter(data)}\n\n${body.trim()}\n`;
}

export async function saveRecipe(
  kv: KVNamespace,
  id: string | null,
  data: RecipeData,
  body: string,
): Promise<string> {
  const slug = id ?? slugify(data.title);
  const content = serializeRecipe(data, body);
  await kv.put(slug, content);
  return slug;
}

export async function deleteRecipe(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(id);
}

export async function updateRating(
  kv: KVNamespace,
  id: string,
  user: string,
  rating: number,
): Promise<void> {
  const recipe = await getRecipeById(kv, id);
  if (!recipe) throw new Error(`Recipe not found: ${id}`);

  recipe.data.ratings[user] = rating;
  await saveRecipe(kv, id, recipe.data, recipe.body);
}
