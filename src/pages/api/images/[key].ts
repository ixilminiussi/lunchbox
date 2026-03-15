import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const { IMAGES: r2 } = locals.runtime.env;
  const key = params.key!;

  const object = await r2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body as ReadableStream, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
