import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRecipeContent,
  slugify,
  renderFrontmatter,
  serializeRecipe,
  getAllRecipes,
  getRecipeById,
  saveRecipe,
  deleteRecipe,
  type RecipeData,
} from '../../src/lib/recipes';

// Mock KV using a Map
function createMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => { store.set(key, value); },
    delete: async (key: string) => { store.delete(key); },
    list: async () => ({
      keys: [...store.keys()].map((name) => ({ name })),
      list_complete: true,
      cacheStatus: null,
    }),
  } as unknown as KVNamespace;
}

const sampleMarkdown = `---
title: "Test Recipe"
servings: 4
prep_time: "10 min"
cook_time: "20 min"
meal_type: dinner
difficulty: easy
tags: [quick, pasta]
date: 2025-06-01
added_by: Ixil
ingredients:
  - 350g spaghetti
  - 2 eggs
---

## Instructions

1. Boil water
2. Cook pasta
`;

describe('parseRecipeContent', () => {
  it('parses frontmatter and body', () => {
    const entry = parseRecipeContent(sampleMarkdown, 'test-recipe');
    expect(entry.id).toBe('test-recipe');
    expect(entry.data.title).toBe('Test Recipe');
    expect(entry.data.servings).toBe(4);
    expect(entry.data.ingredients).toEqual(['350g spaghetti', '2 eggs']);
    expect(entry.data.tags).toEqual(['quick', 'pasta']);
    expect(entry.renderedHTML).toContain('Boil water');
  });

  it('handles missing optional fields', () => {
    const minimal = `---
title: "Minimal"
servings: 2
prep_time: "5 min"
cook_time: "10 min"
meal_type: lunch
difficulty: easy
added_by: Mathilde
ingredients:
  - rice
---

Cook rice.
`;
    const entry = parseRecipeContent(minimal, 'minimal');
    expect(entry.data.cuisine).toBeUndefined();
    expect(entry.data.source).toBeUndefined();
    expect(entry.data.tags).toEqual([]);
    expect(entry.data.ratings).toEqual({});
  });
});

describe('slugify', () => {
  it('converts title to slug', () => {
    expect(slugify('Pasta Carbonara')).toBe('pasta-carbonara');
  });

  it('handles special characters', () => {
    expect(slugify('Crème Brûlée!')).toBe('cr-me-br-l-e');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('  --hello-- ')).toBe('hello');
  });
});

describe('renderFrontmatter', () => {
  it('renders valid YAML frontmatter', () => {
    const data: RecipeData = {
      title: 'Test',
      servings: 4,
      prep_time: '10 min',
      cook_time: '20 min',
      cuisine: 'Italian',
      meal_type: 'dinner',
      difficulty: 'easy',
      tags: ['quick'],
      date: '2025-06-01',
      added_by: 'Ixil',
      ratings: { ixil: 4 },
      ingredients: ['pasta', 'eggs'],
    };
    const fm = renderFrontmatter(data);
    expect(fm).toMatch(/^---/);
    expect(fm).toMatch(/---$/);
    expect(fm).toContain('title: "Test"');
    expect(fm).toContain('cuisine: "Italian"');
    expect(fm).toContain('  ixil: 4');
    expect(fm).toContain('  - pasta');
  });
});

describe('serializeRecipe round-trip', () => {
  it('serialize then parse returns equivalent data', () => {
    const data: RecipeData = {
      title: 'Round Trip',
      servings: 2,
      prep_time: '5 min',
      cook_time: '15 min',
      meal_type: 'lunch',
      difficulty: 'medium',
      tags: ['test'],
      date: '2025-06-01',
      added_by: 'Mathilde',
      ratings: {},
      ingredients: ['1 cup rice', '2 cups water'],
    };
    const body = '1. Cook rice\n2. Serve';
    const serialized = serializeRecipe(data, body);
    const parsed = parseRecipeContent(serialized, 'round-trip');
    expect(parsed.data.title).toBe('Round Trip');
    expect(parsed.data.servings).toBe(2);
    expect(parsed.data.ingredients).toEqual(['1 cup rice', '2 cups water']);
    expect(parsed.body.trim()).toContain('Cook rice');
  });
});

describe('KV operations', () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKV();
  });

  it('saveRecipe + getRecipeById round-trip', async () => {
    const data: RecipeData = {
      title: 'KV Test',
      servings: 4,
      prep_time: '10 min',
      cook_time: '20 min',
      meal_type: 'dinner',
      difficulty: 'easy',
      tags: [],
      date: '2025-01-01',
      added_by: 'Ixil',
      ratings: {},
      ingredients: ['water'],
    };
    const slug = await saveRecipe(kv, null, data, 'Boil water');
    expect(slug).toBe('kv-test');

    const recipe = await getRecipeById(kv, slug);
    expect(recipe).toBeDefined();
    expect(recipe!.data.title).toBe('KV Test');
  });

  it('getAllRecipes returns all saved recipes', async () => {
    await saveRecipe(kv, 'recipe-a', {
      title: 'A', servings: 1, prep_time: '', cook_time: '',
      meal_type: 'lunch', difficulty: 'easy', tags: [], date: '2025-01-01',
      added_by: 'Ixil', ratings: {}, ingredients: [],
    }, 'body a');

    await saveRecipe(kv, 'recipe-b', {
      title: 'B', servings: 1, prep_time: '', cook_time: '',
      meal_type: 'lunch', difficulty: 'easy', tags: [], date: '2025-01-01',
      added_by: 'Ixil', ratings: {}, ingredients: [],
    }, 'body b');

    const all = await getAllRecipes(kv);
    expect(all).toHaveLength(2);
  });

  it('deleteRecipe removes the recipe', async () => {
    await saveRecipe(kv, 'to-delete', {
      title: 'Delete Me', servings: 1, prep_time: '', cook_time: '',
      meal_type: 'lunch', difficulty: 'easy', tags: [], date: '2025-01-01',
      added_by: 'Ixil', ratings: {}, ingredients: [],
    }, 'body');

    await deleteRecipe(kv, 'to-delete');
    const result = await getRecipeById(kv, 'to-delete');
    expect(result).toBeUndefined();
  });

  it('getRecipeById returns undefined for missing key', async () => {
    const result = await getRecipeById(kv, 'nonexistent');
    expect(result).toBeUndefined();
  });
});
