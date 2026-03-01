import { describe, it, expect } from 'vitest';
import { inferSeasons, getCurrentSeason } from '../../src/lib/seasons';

describe('inferSeasons', () => {
  it('detects summer from tomato', () => {
    const seasons = inferSeasons(['400g tomatoes', '1 onion']);
    expect(seasons).toContain('summer');
  });

  it('detects winter + autumn from chestnut', () => {
    const seasons = inferSeasons(['200g chestnuts']);
    expect(seasons).toContain('winter');
    expect(seasons).toContain('autumn');
  });

  it('returns empty for pantry staples only', () => {
    const seasons = inferSeasons(['1 onion', '2 cloves garlic', 'salt', 'olive oil']);
    expect(seasons).toEqual([]);
  });

  it('detects multiple seasons from mixed ingredients', () => {
    const seasons = inferSeasons(['asparagus', 'pumpkin']);
    expect(seasons).toContain('spring');
    expect(seasons).toContain('autumn');
  });
});

describe('getCurrentSeason', () => {
  it('returns a valid season', () => {
    const season = getCurrentSeason();
    expect(['winter', 'spring', 'summer', 'autumn']).toContain(season);
  });
});
