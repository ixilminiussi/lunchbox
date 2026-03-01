import { describe, it, expect, vi } from 'vitest';
import { parseISODuration, parseYield, parseInstructions, scrapeRecipe } from '../../src/lib/scraper';

describe('parseISODuration', () => {
  it('parses hours and minutes', () => {
    expect(parseISODuration('PT1H30M')).toBe('1h 30min');
  });

  it('parses hours only', () => {
    expect(parseISODuration('PT2H')).toBe('2h');
  });

  it('parses minutes only', () => {
    expect(parseISODuration('PT45M')).toBe('45 min');
  });

  it('handles empty string', () => {
    expect(parseISODuration('')).toBe('0 min');
  });

  it('returns raw string for non-ISO format', () => {
    expect(parseISODuration('about 30 minutes')).toBe('about 30 minutes');
  });
});

describe('parseYield', () => {
  it('handles number', () => {
    expect(parseYield(4)).toBe(4);
  });

  it('handles string', () => {
    expect(parseYield('6 servings')).toBe(6);
  });

  it('handles array', () => {
    expect(parseYield(['8 portions'])).toBe(8);
  });

  it('defaults to 4', () => {
    expect(parseYield(undefined)).toBe(4);
  });
});

describe('parseInstructions', () => {
  it('formats HowToStep array', () => {
    const steps = [
      { text: 'Preheat oven.' },
      { text: 'Mix ingredients.' },
    ];
    const result = parseInstructions(steps);
    expect(result).toContain('1. Preheat oven.');
    expect(result).toContain('2. Mix ingredients.');
  });

  it('handles string array', () => {
    const result = parseInstructions(['Step one', 'Step two']);
    expect(result).toContain('1. Step one');
    expect(result).toContain('2. Step two');
  });

  it('handles HowToSection with itemListElement', () => {
    const sections = [
      { itemListElement: [{ text: 'Do A' }, { text: 'Do B' }] },
    ];
    const result = parseInstructions(sections);
    expect(result).toContain('1. Do A');
    expect(result).toContain('2. Do B');
  });

  it('returns empty string for null', () => {
    expect(parseInstructions(null)).toBe('');
  });
});

describe('scrapeRecipe', () => {
  it('extracts recipe from JSON-LD', async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Test Soup",
            "recipeYield": "4",
            "prepTime": "PT10M",
            "cookTime": "PT30M",
            "recipeIngredient": ["1 onion", "2 carrots"],
            "recipeInstructions": [{"text": "Chop veggies."}, {"text": "Simmer."}],
            "image": "https://example.com/soup.jpg"
          }
        </script>
      </head><body></body></html>
    `;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    try {
      const recipe = await scrapeRecipe('https://example.com/soup');
      expect(recipe.title).toBe('Test Soup');
      expect(recipe.servings).toBe(4);
      expect(recipe.prep_time).toBe('10 min');
      expect(recipe.cook_time).toBe('30 min');
      expect(recipe.ingredients).toEqual(['1 onion', '2 carrots']);
      expect(recipe.instructions).toContain('Chop veggies');
      expect(recipe.source).toBe('https://example.com/soup');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws when no JSON-LD found', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>No recipe here</body></html>',
    });

    try {
      await expect(scrapeRecipe('https://example.com/nope')).rejects.toThrow('No Recipe JSON-LD');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
