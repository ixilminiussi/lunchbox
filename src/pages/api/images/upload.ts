import type { APIRoute } from 'astro';
import { getUser } from '../../../lib/session';

export const POST: APIRoute = async ({ request, locals }) => {
  const { IMAGES: r2, SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const user = await getUser(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
  if (!allowed.includes(ext)) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400 });
  }

  const key = `${crypto.randomUUID()}.${ext}`;
  await r2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return new Response(JSON.stringify({ url: `/api/images/${key}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
