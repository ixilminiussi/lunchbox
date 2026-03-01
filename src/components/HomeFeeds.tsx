import { useState, useEffect, useMemo } from 'preact/hooks';
import type { Season } from '../lib/seasons';

interface RecipeData {
  id: string;
  title: string;
  image?: string;
  prep_time: string;
  cook_time: string;
  difficulty: string;
  dietary: string[];
  date: string; // ISO string
  seasons: Season[];
}

interface Props {
  recipes: RecipeData[];
  currentSeason: Season;
}

const USERS = ['ixil', 'mathilde'] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRating(user: string, recipeId: string): number | null {
  try {
    const v = localStorage.getItem(`lunchbox-rating-${user}-${recipeId}`);
    return v ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}

const SEASON_LABEL: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
};

function RecipeCard({ r }: { r: RecipeData }) {
  return (
    <a href={`/recipes/${r.id}`} class="feed-card" style="text-decoration: none; color: inherit;">
      <article>
        {r.image ? (
          <img class="feed-card__image" src={r.image} alt={r.title} loading="lazy" />
        ) : (
          <div class="feed-card__no-image">🍽</div>
        )}
        <div class="feed-card__body">
          <h3 class="recipe-card-title">{r.title}</h3>
          <div class="recipe-card-meta">
            <span>Prep {r.prep_time}</span>
            <span>Cook {r.cook_time}</span>
            <span>{r.difficulty}</span>
          </div>
          <div class="recipe-card-badges">
            {r.dietary.map((d) => (
              <span key={d} class={`badge badge-${d}`}>
                {d === 'gluten-free' ? 'GF' : d === 'dairy-free' ? 'DF' : d === 'nut-free' ? 'NF' : d}
              </span>
            ))}
          </div>
        </div>
      </article>
    </a>
  );
}

function FeedRow({ title, recipes }: { title: string; recipes: RecipeData[] }) {
  if (recipes.length === 0) return null;
  return (
    <section class="feed-section">
      <h2 class="feed-section__title">{title}</h2>
      <div class="feed-row">
        {recipes.map((r) => (
          <RecipeCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

export default function HomeFeeds({ recipes, currentSeason }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const data: Record<string, Record<string, number>> = {};
    for (const user of USERS) {
      data[user] = {};
      for (const r of recipes) {
        const rating = getRating(user, r.id);
        if (rating !== null) {
          data[user][r.id] = rating;
        }
      }
    }
    setRatings(data);
    setLoaded(true);
  }, [recipes]);

  const luckyRecipe = useMemo(() => {
    if (recipes.length === 0) return null;
    return recipes[Math.floor(Math.random() * recipes.length)];
  }, [recipes]);

  const recentlyAdded = useMemo(() => {
    return [...recipes]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [recipes]);

  const seasonalPicks = useMemo(() => {
    if (!loaded) return [];
    return shuffle(
      recipes.filter((r) => {
        if (!r.seasons.includes(currentSeason)) return false;
        const ixilRating = ratings['ixil']?.[r.id];
        const mathildeRating = ratings['mathilde']?.[r.id];
        return ixilRating !== undefined && ixilRating >= 4
          && mathildeRating !== undefined && mathildeRating >= 4;
      })
    );
  }, [recipes, currentSeason, loaded, ratings]);

  const ixilList = useMemo(() => {
    if (!loaded) return [];
    const userRatings = ratings['ixil'] || {};
    return shuffle(
      recipes
        .filter((r) => userRatings[r.id] !== undefined)
        .sort((a, b) => (userRatings[b.id] || 0) - (userRatings[a.id] || 0))
    ).slice(0, 8);
  }, [recipes, loaded, ratings]);

  const mathildeList = useMemo(() => {
    if (!loaded) return [];
    const userRatings = ratings['mathilde'] || {};
    return shuffle(
      recipes
        .filter((r) => userRatings[r.id] !== undefined)
        .sort((a, b) => (userRatings[b.id] || 0) - (userRatings[a.id] || 0))
    ).slice(0, 8);
  }, [recipes, loaded, ratings]);

  if (!loaded) return null;

  return (
    <div class="home-feeds">
      {luckyRecipe && (
        <div class="lucky-section">
          <a href={`/recipes/${luckyRecipe.id}`} class="lucky-btn">
            random recipe &rarr;
          </a>
        </div>
      )}

      {recentlyAdded.length > 0 ? (
        <FeedRow title="Recently Added" recipes={recentlyAdded} />
      ) : (
        <section class="feed-section">
          <h2 class="feed-section__title">Recently Added</h2>
          <p style="color: var(--color-text-light); padding: 1rem 0;">No recipes yet.</p>
        </section>
      )}

      <FeedRow
        title={`${SEASON_LABEL[currentSeason]} Picks`}
        recipes={seasonalPicks}
      />

      <FeedRow title="Ixil's List" recipes={ixilList} />
      <FeedRow title="Mathilde's List" recipes={mathildeList} />
    </div>
  );
}
