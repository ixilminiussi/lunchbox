import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/recipes' }),
  schema: z.object({
    title: z.string(),
    servings: z.number(),
    prep_time: z.string(),
    cook_time: z.string(),
    cuisine: z.string().optional(),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()).default([]),
    added_by: z.string(),
    source: z.string().optional(),
    image: z.string().optional(),
    ratings: z.record(z.string(), z.number()).optional().default({}),
    ingredients: z.array(z.string()),
    date: z.coerce.date().optional().default(new Date('2025-01-01')),
  }),
});

export const collections = { recipes };
