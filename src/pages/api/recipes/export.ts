import type { APIRoute } from 'astro';
import JSZip from 'jszip';
import { getUser } from '../../../lib/session';
import { getAllRecipes, serializeRecipe } from '../../../lib/recipes';

export const GET: APIRoute = async ({ request, locals }) => {
  const { RECIPES: kv, SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const user = await getUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const recipes = await getAllRecipes(kv);
  if (recipes.length === 0) {
    return new Response('No recipes found', { status: 404 });
  }

  const zip = new JSZip();
  for (const recipe of recipes) {
    const content = serializeRecipe(recipe.data, recipe.body);
    zip.file(`${recipe.id}.md`, content);
  }

  const buf = await zip.generateAsync({ type: 'uint8array' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="lunchbox-recipes.zip"',
    },
  });
};
