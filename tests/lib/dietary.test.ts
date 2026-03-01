import { describe, it, expect } from 'vitest';
import { normalise, inferDietary } from '../../src/lib/dietary';

describe('normalise', () => {
  it('strips accents', () => {
    // "fraiche" is also stripped as a French descriptor
    expect(normalise('crème fraîche')).toBe('creme');
    expect(normalise('béchamel')).toBe('bechamel');
  });

  it('strips numbers, fractions, and units', () => {
    expect(normalise('250g flour')).toBe('flour');
    expect(normalise('1/2 cup milk')).toBe('milk');
    expect(normalise('½ tsp salt')).toBe('salt');
  });

  it('handles French units', () => {
    expect(normalise('2 cuil a soupe huile')).toBe('huile');
    expect(normalise('1 gousse ail')).toBe('ail');
  });

  it('strips descriptors', () => {
    expect(normalise('finely chopped fresh basil')).toBe('basil');
    expect(normalise('finement hache persil')).toBe('persil');
  });
});

describe('inferDietary', () => {
  it('returns all diets for empty ingredients', () => {
    const diets = inferDietary([]);
    expect(diets).toEqual(['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free']);
  });

  it('detects non-vegan/non-vegetarian (EN)', () => {
    const diets = inferDietary(['500g chicken breast', '1 onion', 'salt']);
    expect(diets).not.toContain('vegan');
    expect(diets).not.toContain('vegetarian');
  });

  it('detects non-vegan/non-vegetarian (FR)', () => {
    const diets = inferDietary(['200g poulet', '1 oignon']);
    expect(diets).not.toContain('vegan');
    expect(diets).not.toContain('vegetarian');
  });

  it('detects dairy violation', () => {
    const diets = inferDietary(['100ml milk', '50g butter']);
    expect(diets).not.toContain('dairy-free');
    expect(diets).not.toContain('vegan');
    expect(diets).toContain('vegetarian');
  });

  it('detects gluten violation', () => {
    const diets = inferDietary(['250g flour', '100ml water']);
    expect(diets).not.toContain('gluten-free');
  });

  it('buckwheat (no flour keyword) is gluten-free', () => {
    // "buckwheat flour" matches "flour" in DB → gluten violation
    // Pure buckwheat doesn't trigger gluten
    const diets = inferDietary(['200g buckwheat', '2 eggs']);
    expect(diets).toContain('gluten-free');
  });

  it('handles mixed violations', () => {
    const diets = inferDietary(['100g butter', '250g flour', '3 eggs']);
    expect(diets).not.toContain('vegan');
    expect(diets).not.toContain('dairy-free');
    expect(diets).not.toContain('gluten-free');
    expect(diets).toContain('vegetarian');
    expect(diets).toContain('nut-free');
  });
});
