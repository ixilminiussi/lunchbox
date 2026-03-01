export const prerender = false;
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { getUser } from '../../../lib/session';

const RECIPES_DIR = path.resolve('src/data/recipes');

export const GET: APIRoute = async ({ request }) => {
  const user = getUser(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!fs.existsSync(RECIPES_DIR)) {
    return new Response('No recipes found', { status: 404 });
  }

  const files = fs.readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    return new Response('No recipes found', { status: 404 });
  }

  const zip = new JSZip();
  for (const file of files) {
    const content = fs.readFileSync(path.join(RECIPES_DIR, file), 'utf-8');
    zip.file(file, content);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="lunchbox-recipes.zip"',
    },
  });
};
