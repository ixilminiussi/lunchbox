import type { APIRoute } from 'astro';
import { getUser } from '../../../../lib/session';
import { saveRecipe, deleteRecipe, getRecipeById, type RecipeData } from '../../../../lib/recipes';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const { RECIPES: kv, SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const user = await getUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return new Response('Missing recipe id', { status: 400 });
  }

  const existing = await getRecipeById(kv, id);
  if (!existing) {
    return new Response('Recipe not found', { status: 404 });
  }

  const body = await request.json();
  const data: RecipeData = {
    title: body.title || existing.data.title,
    servings: Number(body.servings) || existing.data.servings,
    prep_time: body.prep_time || existing.data.prep_time,
    cook_time: body.cook_time || existing.data.cook_time,
    cuisine: body.cuisine ?? existing.data.cuisine,
    meal_type: body.meal_type || existing.data.meal_type,
    difficulty: body.difficulty || existing.data.difficulty,
    tags: Array.isArray(body.tags) ? body.tags : existing.data.tags,
    date: body.date || existing.data.date,
    added_by: body.added_by || existing.data.added_by,
    source: body.source ?? existing.data.source,
    image: body.image ?? existing.data.image,
    ratings: body.ratings ?? existing.data.ratings,
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : existing.data.ingredients,
    notes: Array.isArray(body.notes) ? body.notes : existing.data.notes,
  };

  const instructions = body.instructions ?? existing.body;
  await saveRecipe(kv, id, data, instructions);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const { RECIPES: kv, SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const user = await getUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return new Response('Missing recipe id', { status: 400 });
  }

  await deleteRecipe(kv, id);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
