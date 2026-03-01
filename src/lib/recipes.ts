import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const RECIPES_DIR = path.resolve('src/data/recipes');

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

function parseRecipeFile(filePath: string): RecipeEntry {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const id = path.basename(filePath, '.md');
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

export function getAllRecipes(): RecipeEntry[] {
  if (!fs.existsSync(RECIPES_DIR)) return [];
  const files = fs.readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md'));
  return files.map((f) => parseRecipeFile(path.join(RECIPES_DIR, f)));
}

export function getRecipeById(id: string): RecipeEntry | undefined {
  const filePath = path.join(RECIPES_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return undefined;
  return parseRecipeFile(filePath);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderFrontmatter(data: RecipeData): string {
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

export function saveRecipe(
  id: string | null,
  data: RecipeData,
  body: string,
): string {
  const slug = id ?? slugify(data.title);
  const filePath = path.join(RECIPES_DIR, `${slug}.md`);
  const content = `${renderFrontmatter(data)}\n\n${body.trim()}\n`;
  fs.mkdirSync(RECIPES_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return slug;
}

export function deleteRecipe(id: string): void {
  const filePath = path.join(RECIPES_DIR, `${id}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function updateRating(
  id: string,
  user: string,
  rating: number,
): void {
  const recipe = getRecipeById(id);
  if (!recipe) throw new Error(`Recipe not found: ${id}`);

  recipe.data.ratings[user] = rating;
  saveRecipe(id, recipe.data, recipe.body);
}
