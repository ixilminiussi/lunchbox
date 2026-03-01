import type { APIRoute } from 'astro';
import { getUser } from '../../../../lib/session';
import { updateRating } from '../../../../lib/recipes';

export const POST: APIRoute = async ({ params, request }) => {
  const user = getUser(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return new Response('Missing recipe id', { status: 400 });
  }

  const body = await request.json();
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return new Response('Rating must be 1-5', { status: 400 });
  }

  try {
    updateRating(id, user.toLowerCase(), rating);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(e.message, { status: 404 });
  }
};
