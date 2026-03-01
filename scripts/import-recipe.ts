import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { load } from 'cheerio';

const RECIPES_DIR = path.join(import.meta.dirname, '..', 'src', 'data', 'recipes');

const url = process.argv[2];
if (!url) {
  console.error('Usage: npm run import <url>');
  process.exit(1);
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadImage(imageUrl: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, dest).then(resolve, reject);
      }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', reject);
    }).on('error', reject);
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseTime(iso: string | undefined): string {
  if (!iso) return '0 min';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m} min`;
}

async function main() {
  console.log(`Fetching ${url}...`);
  const html = await fetchUrl(url);
  const $ = load(html);

  // Find JSON-LD with Recipe schema
  let recipe: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '');
      if (json['@type'] === 'Recipe') {
        recipe = json;
      } else if (Array.isArray(json['@graph'])) {
        const found = json['@graph'].find((n: any) => n['@type'] === 'Recipe');
        if (found) recipe = found;
      } else if (Array.isArray(json)) {
        const found = json.find((n: any) => n['@type'] === 'Recipe');
        if (found) recipe = found;
      }
    } catch {}
  });

  if (!recipe) {
    console.error('No Recipe JSON-LD found on this page.');
    process.exit(1);
  }

  const title = cleanText(recipe.name || 'Untitled');
  const slug = slugify(title);
  const servings = parseInt(recipe.recipeYield?.[0] || recipe.recipeYield || '4');
  const prepTime = parseTime(recipe.prepTime);
  const cookTime = parseTime(recipe.cookTime);
  const cuisine = recipe.recipeCuisine?.[0] || recipe.recipeCuisine || '';
  const keywords = (recipe.keywords || '')
    .split(',')
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);

  const ingredients: string[] = (recipe.recipeIngredient || []).map(cleanText);

  // Parse instructions
  let instructions: string[] = [];
  if (Array.isArray(recipe.recipeInstructions)) {
    for (const step of recipe.recipeInstructions) {
      if (typeof step === 'string') {
        instructions.push(cleanText(step));
      } else if (step.text) {
        instructions.push(cleanText(step.text));
      }
    }
  }

  // Handle image
  let imagePath = '';
  const imageUrl = typeof recipe.image === 'string'
    ? recipe.image
    : Array.isArray(recipe.image)
      ? recipe.image[0]
      : recipe.image?.url;

  if (imageUrl) {
    const ext = path.extname(new URL(imageUrl).pathname).split('?')[0] || '.jpg';
    const imageFileName = `${slug}${ext}`;
    const imagesDir = path.join(import.meta.dirname, '..', 'public', 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    const destPath = path.join(imagesDir, imageFileName);
    console.log(`Downloading image...`);
    try {
      await downloadImage(imageUrl, destPath);
      imagePath = `/images/${imageFileName}`;
      console.log(`Saved image to public${imagePath}`);
    } catch (e) {
      console.warn('Failed to download image, skipping.');
    }
  }

  // Build frontmatter
  const tagsList = keywords.length > 0 ? `[${keywords.join(', ')}]` : '[]';
  const ingredientsList = ingredients.map((i) => `  - ${i}`).join('\n');
  const instructionsText = instructions
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n\n');

  const md = `---
title: "${title}"
servings: ${isNaN(servings) ? 4 : servings}
prep_time: "${prepTime}"
cook_time: "${cookTime}"
cuisine: "${cuisine}"
meal_type: dinner
difficulty: medium
tags: ${tagsList}
added_by: Ixil
source: "${url}"
${imagePath ? `image: "${imagePath}"` : '# image:'}
ingredients:
${ingredientsList}
---

## Instructions

${instructionsText}
`;

  fs.mkdirSync(RECIPES_DIR, { recursive: true });
  const filePath = path.join(RECIPES_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, md);
  console.log(`\nRecipe saved to: ${filePath}`);
  console.log('Review the file, then: git add + commit + push');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
