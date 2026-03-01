export const prerender = false;
import type { APIRoute } from 'astro';
import matter from 'gray-matter';
import { getUser } from '../../../lib/session';
import { saveRecipe } from '../../../lib/recipes';

export const POST: APIRoute = async ({ request }) => {
  const user = getUser(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const markdown = body.markdown;
  if (!markdown || typeof markdown !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing markdown field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed;
  try {
    parsed = matter(markdown);
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse frontmatter' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, content } = parsed;

  if (!data.title || typeof data.title !== 'string') {
    return new Response(JSON.stringify({ error: 'Frontmatter must include a title' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const recipeData = {
    title: data.title,
    servings: Number(data.servings) || 4,
    prep_time: data.prep_time ?? '',
    cook_time: data.cook_time ?? '',
    cuisine: data.cuisine,
    meal_type: data.meal_type ?? 'dinner',
    difficulty: data.difficulty ?? 'medium',
    tags: Array.isArray(data.tags) ? data.tags : [],
    date: data.date ? String(data.date).split('T')[0] : new Date().toISOString().split('T')[0],
    added_by: data.added_by ?? user,
    source: data.source,
    image: data.image,
    ratings: data.ratings ?? {},
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
  };

  const id = saveRecipe(null, recipeData, content);

  return new Response(JSON.stringify({ id }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
