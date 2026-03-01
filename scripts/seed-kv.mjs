#!/usr/bin/env node

// Reads all .md recipe files from src/data/recipes/ and uploads them
// to the Cloudflare KV namespace bound as RECIPES.
//
// Usage:
//   npm run seed                          # uses wrangler.toml binding
//   KV_NAMESPACE_ID=abc123 npm run seed   # explicit namespace id

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const RECIPES_DIR = resolve('src/data/recipes');

const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md'));

if (files.length === 0) {
  console.log('No recipe files found in', RECIPES_DIR);
  process.exit(0);
}

console.log(`Found ${files.length} recipe(s) to upload:\n`);

for (const file of files) {
  const id = basename(file, '.md');
  const filePath = join(RECIPES_DIR, file);
  const content = readFileSync(filePath, 'utf-8');

  // Write content to a temp file to avoid shell escaping issues
  const tmpFile = join(RECIPES_DIR, `_tmp_${id}.txt`);
  const { writeFileSync, unlinkSync } = await import('node:fs');
  writeFileSync(tmpFile, content);

  try {
    const nsId = process.env.KV_NAMESPACE_ID || '48ce101e61894a1ca98ad0f523db26f3';

    execSync(
      `npx wrangler kv key put "${id}" --path "${tmpFile}" --namespace-id ${nsId} --remote`,
      { stdio: 'inherit' },
    );
    console.log(`  ✓ ${id}`);
  } catch (err) {
    console.error(`  ✗ ${id}:`, err.message);
  } finally {
    unlinkSync(tmpFile);
  }
}

console.log('\nDone!');
