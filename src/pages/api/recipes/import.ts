import type { APIRoute } from 'astro';
import { getUser } from '../../../lib/session';
import { scrapeRecipe } from '../../../lib/scraper';

export const POST: APIRoute = async ({ request, locals }) => {
  const { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const user = await getUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const url = body.url;
  if (!url || typeof url !== 'string') {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    const recipe = await scrapeRecipe(url);
    return new Response(JSON.stringify(recipe), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
