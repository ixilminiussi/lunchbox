import { describe, it, expect } from 'vitest';
import { parseIngredient, scaleIngredient } from '../../src/lib/ingredients';

describe('parseIngredient', () => {
  it('parses integer quantity with unit', () => {
    const p = parseIngredient('2 cups flour');
    expect(p.quantity).toBe(2);
    expect(p.unit).toBe('cups');
    expect(p.name).toBe('flour');
  });

  it('parses unicode fraction ½', () => {
    const p = parseIngredient('½ tsp salt');
    expect(p.quantity).toBe(0.5);
    expect(p.unit).toBe('tsp');
    expect(p.name).toBe('salt');
  });

  it('parses slash fraction 1/2', () => {
    const p = parseIngredient('1/2 cup milk');
    expect(p.quantity).toBe(0.5);
    expect(p.unit).toBe('cup');
    expect(p.name).toBe('milk');
  });

  it('parses mixed number 1 1/2', () => {
    const p = parseIngredient('1 1/2 cups sugar');
    expect(p.quantity).toBe(1.5);
    expect(p.unit).toBe('cups');
    expect(p.name).toBe('sugar');
  });

  it('parses attached unit (350g)', () => {
    const p = parseIngredient('350g spaghetti');
    expect(p.quantity).toBe(350);
    expect(p.unit).toBe('g');
    expect(p.name).toBe('spaghetti');
    expect(p.unitAttached).toBe(true);
  });

  it('handles no unit (2 eggs)', () => {
    const p = parseIngredient('2 eggs');
    expect(p.quantity).toBe(2);
    expect(p.unit).toBe('');
    expect(p.name).toBe('eggs');
  });

  it('handles no quantity (salt to taste)', () => {
    const p = parseIngredient('salt to taste');
    expect(p.quantity).toBeNull();
    expect(p.name).toBe('salt to taste');
  });
});

describe('scaleIngredient', () => {
  it('scales quantity proportionally', () => {
    const parsed = parseIngredient('2 cups flour');
    const result = scaleIngredient(parsed, 4, 8);
    expect(result).toBe('4 cups flour');
  });

  it('preserves attached unit format', () => {
    const parsed = parseIngredient('350g spaghetti');
    const result = scaleIngredient(parsed, 4, 2);
    expect(result).toBe('175g spaghetti');
  });

  it('returns name only when no quantity', () => {
    const parsed = parseIngredient('salt to taste');
    const result = scaleIngredient(parsed, 4, 8);
    expect(result).toBe('salt to taste');
  });
});
