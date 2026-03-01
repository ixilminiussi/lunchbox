import type { APIRoute } from 'astro';
import { validateLogin, setSessionCookie } from '../../../lib/session';

export const POST: APIRoute = async ({ request, locals }) => {
  const { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD } = locals.runtime.env;
  const env = { SESSION_SECRET, IXIL_PASSWORD, MATHILDE_PASSWORD };

  const form = await request.formData();
  const username = (form.get('username') as string) ?? '';
  const password = (form.get('password') as string) ?? '';

  const user = validateLogin(username, password, env);
  if (!user) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/login?error=1' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Set-Cookie': await setSessionCookie(user, env),
    },
  });
};
