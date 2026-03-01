export const prerender = false;
import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/session';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
