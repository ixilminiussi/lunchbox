import { useMemo } from 'preact/hooks';
import type { Season } from '../lib/seasons';

interface RecipeData {
  id: string;
  title: string;
  image?: string;
  prep_time: string;
  cook_time: string;
  difficulty: string;
  added_by: string;
  dietary: string[];
  date: string; // ISO string
  seasons: Season[];
  ratings: Record<string, number>;
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

const SEASON_LABEL: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
};

function authorClass(addedBy: string): string {
  return addedBy?.toLowerCase() === 'mathilde' ? 'author-mathilde' : 'author-ixil';
}

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
          {r.added_by && (
            <span class={`recipe-card-author ${authorClass(r.added_by)}`}>{r.added_by}</span>
          )}
          <div class="recipe-card-badges">
            {r.dietary.map((d) => (
              <span key={d} class={`badge badge-${d}`}>
                {d === 'gluten-free' ? 'GF' : d === 'dairy-free' ? 'DF' : d === 'nut-free' ? 'NF' : d}
              </span>
            ))}
          </div>
          {(r.ratings?.ixil !== undefined || r.ratings?.mathilde !== undefined) && (
            <span class="rating-compact">
              {r.ratings?.ixil !== undefined && <span class="author-ixil">I:{r.ratings.ixil}</span>}
              {r.ratings?.ixil !== undefined && r.ratings?.mathilde !== undefined && ' '}
              {r.ratings?.mathilde !== undefined && <span class="author-mathilde">M:{r.ratings.mathilde}</span>}
            </span>
          )}
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
    return shuffle(
      recipes.filter((r) => {
        if (!r.seasons.includes(currentSeason)) return false;
        const ixilRating = r.ratings?.['ixil'];
        const mathildeRating = r.ratings?.['mathilde'];
        return ixilRating !== undefined && ixilRating >= 4
          && mathildeRating !== undefined && mathildeRating >= 4;
      })
    );
  }, [recipes, currentSeason]);

  const ixilList = useMemo(() => {
    return shuffle(
      recipes
        .filter((r) => r.ratings?.['ixil'] !== undefined)
        .sort((a, b) => (b.ratings?.['ixil'] || 0) - (a.ratings?.['ixil'] || 0))
    ).slice(0, 8);
  }, [recipes]);

  const mathildeList = useMemo(() => {
    return shuffle(
      recipes
        .filter((r) => r.ratings?.['mathilde'] !== undefined)
        .sort((a, b) => (b.ratings?.['mathilde'] || 0) - (a.ratings?.['mathilde'] || 0))
    ).slice(0, 8);
  }, [recipes]);

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
