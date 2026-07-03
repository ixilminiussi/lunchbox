import { useState } from 'preact/hooks';
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
  date: string;
  seasons: Season[];
  ratings: Record<string, number>;
}

interface Props {
  luckyRecipe: RecipeData | null;
  recentlyAdded: RecipeData[];
  seasonalPicks: RecipeData[];
  ixilList: RecipeData[];
  mathildeList: RecipeData[];
  currentSeason: Season;
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

function RecipeCard({ r, viewMode }: { r: RecipeData; viewMode: 'grid' | 'row' }) {
  return (
    <a href={`/recipes/${r.id}`} class="feed-card" style="text-decoration: none; color: inherit;">
      <article class="recipe-card">
        {viewMode === 'grid' && (
          r.image ? (
            <img class="recipe-card-image" src={r.image} alt={r.title} loading="lazy" />
          ) : (
            <div class="no-image">🍽</div>
          )
        )}
        <div class="recipe-card-body">
          {viewMode === 'row' ? (
            <>
              <div class="recipe-card-row-line">
                <div class="recipe-card-row-line-left">
                  <h3 class="recipe-card-title">{r.title}</h3>
                  {r.added_by && (
                    <span class={`recipe-card-author ${authorClass(r.added_by)}`}>{r.added_by}</span>
                  )}
                </div>
                <div class="recipe-card-row-line-right">
                  <div class="recipe-card-badges">
                    {r.dietary.map((d) => (
                      <span key={d} class={`badge badge-${d}`}>
                        {d === 'gluten-free' ? 'GF' : d === 'dairy-free' ? 'DF' : d === 'nut-free' ? 'NF' : d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div class="recipe-card-row-line">
                <div class="recipe-card-row-line-left recipe-card-meta">
                  <span>Prep {r.prep_time}</span>
                  <span>Cook {r.cook_time}</span>
                  <span>{r.difficulty}</span>
                </div>
                <div class="recipe-card-row-line-right">
                  {(r.ratings?.ixil !== undefined || r.ratings?.mathilde !== undefined) && (
                    <span class="rating-compact">
                      {r.ratings?.ixil !== undefined && <span class="author-ixil">I:{r.ratings.ixil}</span>}
                      {r.ratings?.ixil !== undefined && r.ratings?.mathilde !== undefined && ' '}
                      {r.ratings?.mathilde !== undefined && <span class="author-mathilde">M:{r.ratings.mathilde}</span>}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </article>
    </a>
  );
}

function FeedRow({ title, recipes, viewMode }: { title: string; recipes: RecipeData[]; viewMode: 'grid' | 'row' }) {
  if (recipes.length === 0) return null;
  return (
    <section class="feed-section">
      <h2 class="feed-section__title">{title}</h2>
      <div class={`feed-row ${viewMode === 'row' ? 'feed-row-rows' : ''}`}>
        {recipes.map((r) => (
          <RecipeCard key={r.id} r={r} viewMode={viewMode} />
        ))}
      </div>
    </section>
  );
}

export default function HomeFeeds({ luckyRecipe, recentlyAdded, seasonalPicks, ixilList, mathildeList, currentSeason }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');

  return (
    <div class="home-feeds">
      {luckyRecipe && (
        <div class="lucky-section">
          <a href={`/recipes/${luckyRecipe.id}`} class="lucky-btn">
            random recipe &rarr;
          </a>
        </div>
      )}

      <div class="view-toggle">
        <button
          class={viewMode === 'grid' ? 'view-toggle-active' : ''}
          onClick={() => setViewMode('grid')}
        >
          ▦ Grid
        </button>
        <button
          class={viewMode === 'row' ? 'view-toggle-active' : ''}
          onClick={() => setViewMode('row')}
        >
          ☰ Rows
        </button>
      </div>

      {recentlyAdded.length > 0 ? (
        <FeedRow title="Recently Added" recipes={recentlyAdded} viewMode={viewMode} />
      ) : (
        <section class="feed-section">
          <h2 class="feed-section__title">Recently Added</h2>
          <p style="color: var(--color-text-light); padding: 1rem 0;">No recipes yet.</p>
        </section>
      )}

      <FeedRow
        title={`${SEASON_LABEL[currentSeason]} Picks`}
        recipes={seasonalPicks}
        viewMode={viewMode}
      />

      <FeedRow title="Ixil's List" recipes={ixilList} viewMode={viewMode} />
      <FeedRow title="Mathilde's List" recipes={mathildeList} viewMode={viewMode} />
    </div>
  );
}
