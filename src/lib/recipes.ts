import matter from 'gray-matter';
import { marked } from 'marked';

export interface InstructionNote {
  id: string;
  step: number;
  user: string;
  text: string;
}

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
  notes: InstructionNote[];
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
      notes: Array.isArray(data.notes) ? data.notes : [],
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
    if (raw) {
      try {
        entries.push(parseRecipeContent(raw, key.name));
      } catch {
        // skip malformed recipe rather than crashing all pages
      }
    }
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
  lines.push(`tags: [${data.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
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
    lines.push(`  - ${JSON.stringify(ing)}`);
  }
  if (data.notes && data.notes.length > 0) {
    lines.push('notes:');
    for (const note of data.notes) {
      lines.push(`  - id: ${JSON.stringify(note.id)}`);
      lines.push(`    step: ${note.step}`);
      lines.push(`    user: ${JSON.stringify(note.user)}`);
      lines.push(`    text: ${JSON.stringify(note.text)}`);
    }
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

export async function addNote(
  kv: KVNamespace,
  id: string,
  user: string,
  step: number,
  text: string,
): Promise<InstructionNote> {
  const recipe = await getRecipeById(kv, id);
  if (!recipe) throw new Error(`Recipe not found: ${id}`);

  const note: InstructionNote = { id: crypto.randomUUID(), step, user, text };
  recipe.data.notes = [...recipe.data.notes.filter((n) => !(n.step === step && n.user === user)), note];
  await saveRecipe(kv, id, recipe.data, recipe.body);
  return note;
}

export async function updateNote(
  kv: KVNamespace,
  id: string,
  noteId: string,
  user: string,
  text: string,
): Promise<void> {
  const recipe = await getRecipeById(kv, id);
  if (!recipe) throw new Error(`Recipe not found: ${id}`);

  const note = recipe.data.notes.find((n) => n.id === noteId);
  if (!note) throw new Error(`Note not found: ${noteId}`);
  if (note.user !== user) throw new Error('Not the note owner');

  note.text = text;
  await saveRecipe(kv, id, recipe.data, recipe.body);
}

export async function deleteNote(
  kv: KVNamespace,
  id: string,
  noteId: string,
  user: string,
): Promise<void> {
  const recipe = await getRecipeById(kv, id);
  if (!recipe) throw new Error(`Recipe not found: ${id}`);

  const note = recipe.data.notes.find((n) => n.id === noteId);
  if (!note) throw new Error(`Note not found: ${noteId}`);
  if (note.user !== user) throw new Error('Not the note owner');

  recipe.data.notes = recipe.data.notes.filter((n) => n.id !== noteId);
  await saveRecipe(kv, id, recipe.data, recipe.body);
}
