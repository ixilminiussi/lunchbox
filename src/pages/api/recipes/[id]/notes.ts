import type { APIRoute } from 'astro';
import { getUser } from '../../../../lib/session';
import { addNote, updateNote, deleteNote } from '../../../../lib/recipes';

export const POST: APIRoute = async ({ params, request, locals }) => {
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

  const body = await request.json();
  const step = Number(body.step);
  const text = String(body.text ?? '').trim();
  if (!Number.isInteger(step) || step < 0) {
    return new Response('Invalid step', { status: 400 });
  }
  if (!text) {
    return new Response('Note text is required', { status: 400 });
  }

  try {
    const note = await addNote(kv, id, user.toLowerCase(), step, text);
    return new Response(JSON.stringify(note), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(e.message, { status: 404 });
  }
};

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

  const body = await request.json();
  const noteId = String(body.id ?? '');
  const text = String(body.text ?? '').trim();
  if (!noteId) {
    return new Response('Missing note id', { status: 400 });
  }
  if (!text) {
    return new Response('Note text is required', { status: 400 });
  }

  try {
    await updateNote(kv, id, noteId, user.toLowerCase(), text);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    const status = e.message === 'Not the note owner' ? 403 : 404;
    return new Response(e.message, { status });
  }
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

  const body = await request.json();
  const noteId = String(body.id ?? '');
  if (!noteId) {
    return new Response('Missing note id', { status: 400 });
  }

  try {
    await deleteNote(kv, id, noteId, user.toLowerCase());
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    const status = e.message === 'Not the note owner' ? 403 : 404;
    return new Response(e.message, { status });
  }
};
