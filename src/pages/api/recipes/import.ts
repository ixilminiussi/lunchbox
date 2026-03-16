import type { APIRoute } from 'astro';
import { getUser } from '../../../lib/session';
import { scrapeRecipe } from '../../../lib/scraper';

async function rehostedImageUrl(imageUrl: string, r2: R2Bucket): Promise<string> {
  if (!imageUrl) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/avif': 'avif',
    };
    const ext = extMap[contentType] || 'jpg';
    const key = `${crypto.randomUUID()}.${ext}`;
    await r2.put(key, await res.arrayBuffer(), {
      httpMetadata: { contentType },
    });
    return `/api/images/${key}`;
  } catch {
    return '';
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { IMAGES: r2, SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
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
    if (recipe.image) {
      recipe.image = await rehostedImageUrl(recipe.image, r2);
    }
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
