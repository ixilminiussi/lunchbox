import type { APIRoute } from 'astro';
import { getUser } from '../../../lib/session';
import { saveRecipe, type RecipeData } from '../../../lib/recipes';

export const POST: APIRoute = async ({ request }) => {
  const user = getUser(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const data: RecipeData = {
    title: body.title || 'Untitled',
    servings: Number(body.servings) || 4,
    prep_time: body.prep_time || '0 min',
    cook_time: body.cook_time || '0 min',
    cuisine: body.cuisine || undefined,
    meal_type: body.meal_type || 'dinner',
    difficulty: body.difficulty || 'medium',
    tags: Array.isArray(body.tags) ? body.tags : [],
    date: body.date || new Date().toISOString().split('T')[0],
    added_by: body.added_by || user,
    source: body.source || undefined,
    image: body.image || undefined,
    ratings: body.ratings || {},
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
  };

  const instructions = body.instructions || '';
  const slug = saveRecipe(null, data, instructions);

  return new Response(JSON.stringify({ id: slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
