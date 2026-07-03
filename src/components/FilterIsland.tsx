import { useState, useMemo } from 'preact/hooks';

interface RecipeData {
  id: string;
  title: string;
  image?: string;
  prep_time: string;
  cook_time: string;
  difficulty: string;
  cuisine: string;
  meal_type: string;
  tags: string[];
  added_by: string;
  dietary: string[];
  ingredients: string[];
  ratings: Record<string, number>;
}

interface Props {
  recipes: RecipeData[];
  cuisines: string[];
  mealTypes: string[];
  allTags: string[];
  allDiets: string[];
  authors: string[];
  allIngredientNames: string[];
}

function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\d.,/½⅓¼¾⅔⅛]+/g, '')
    .replace(/\b(g|kg|ml|l|cl|dl|oz|lb|tsp|tbsp|cup|cups|tablespoon|teaspoon|bunch|clove|cloves|pinch|handful|slice|slices|piece|pieces|large|small|medium|fresh|dried|ground|whole|finely|roughly|chopped|diced|minced|grated|sliced|to taste|optional|c a s|c a c|cuil a soupe|cuil a cafe|gousse|gousses|pincee|poignee|tranche|tranches|morceau|morceaux|botte|brin|brins|gros|petit|moyen|frais|fraiche|seche|sechee|moulu|entier|entiere|finement|grossierement|hache|emince|rape|coupe|fondu|cuit|cuite|un peu)\b/g, '')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(recipeIngredients: string[], selected: Set<string>): number {
  if (selected.size === 0) return 0;
  let count = 0;
  for (const sel of selected) {
    const selLower = sel.toLowerCase();
    for (const ing of recipeIngredients) {
      const norm = normaliseForMatch(ing);
      if (norm.includes(selLower) || selLower.includes(norm)) {
        count++;
        break;
      }
    }
  }
  return count;
}

export default function FilterIsland({
  recipes,
  cuisines,
  mealTypes,
  allTags,
  allDiets,
  authors,
  allIngredientNames,
}: Props) {
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set());
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedDiets, setSelectedDiets] = useState<Set<string>>(new Set());
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  // Fridge mode state
  const [fridgeMode, setFridgeMode] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [ingredientSearch, setIngredientSearch] = useState('');

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visibleIngredients = useMemo(() => {
    let list = allIngredientNames.filter((n) => !selectedIngredients.has(n));
    if (ingredientSearch) {
      const q = ingredientSearch.toLowerCase();
      list = list.filter((n) => n.toLowerCase().includes(q));
    }
    return list.slice(0, 20);
  }, [allIngredientNames, selectedIngredients, ingredientSearch]);

  const filtered = useMemo(() => {
    let result = recipes.filter((r) => {
      if (selectedCuisines.size > 0 && !selectedCuisines.has(r.cuisine)) return false;
      if (selectedMealTypes.size > 0 && !selectedMealTypes.has(r.meal_type)) return false;
      if (selectedTags.size > 0 && !r.tags.some((t) => selectedTags.has(t))) return false;
      if (selectedDiets.size > 0 && ![...selectedDiets].every((d) => r.dietary.includes(d))) return false;
      if (selectedAuthors.size > 0 && !selectedAuthors.has(r.added_by)) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    if (fridgeMode && selectedIngredients.size > 0) {
      result = result
        .map((r) => ({ ...r, _matchCount: countMatches(r.ingredients, selectedIngredients) }))
        .sort((a, b) => b._matchCount - a._matchCount);
    }

    return result;
  }, [recipes, selectedCuisines, selectedMealTypes, selectedTags, selectedDiets, selectedAuthors, search, fridgeMode, selectedIngredients]);

  function clear() {
    setSelectedCuisines(new Set());
    setSelectedMealTypes(new Set());
    setSelectedTags(new Set());
    setSelectedDiets(new Set());
    setSelectedAuthors(new Set());
    setSearch('');
  }

  const showMatchBadges = fridgeMode && selectedIngredients.size > 0;

  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');

  return (
    <div>
      <div class="filter-bar">
        <div class="filter-group">
          <input
            class="search-input"
            style="flex: 1; min-width: 150px;"
            type="text"
            placeholder="Search..."
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
          <button onClick={clear}>Clear</button>
        </div>
        {cuisines.length > 1 && (
          <div class="filter-group">
            <span class="filter-group__label">cuisine</span>
            {cuisines.map((c) => (
              <button
                key={c}
                class={`tag-chip ${selectedCuisines.has(c) ? 'tag-chip-active' : ''}`}
                onClick={() => toggle(selectedCuisines, setSelectedCuisines, c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {mealTypes.length > 1 && (
          <div class="filter-group">
            <span class="filter-group__label">meal</span>
            {mealTypes.map((m) => (
              <button
                key={m}
                class={`tag-chip ${selectedMealTypes.has(m) ? 'tag-chip-active' : ''}`}
                onClick={() => toggle(selectedMealTypes, setSelectedMealTypes, m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        {allTags.length > 1 && (
          <div class="filter-group">
            <span class="filter-group__label">tags</span>
            {allTags.map((t) => (
              <button
                key={t}
                class={`tag-chip ${selectedTags.has(t) ? 'tag-chip-active' : ''}`}
                onClick={() => toggle(selectedTags, setSelectedTags, t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {allDiets.length > 1 && (
          <div class="filter-group">
            <span class="filter-group__label">diet</span>
            {allDiets.map((d) => (
              <button
                key={d}
                class={`tag-chip ${selectedDiets.has(d) ? 'tag-chip-active' : ''}`}
                onClick={() => toggle(selectedDiets, setSelectedDiets, d)}
              >
                {d === 'gluten-free' ? 'GF' : d === 'dairy-free' ? 'DF' : d === 'nut-free' ? 'NF' : d}
              </button>
            ))}
          </div>
        )}
        {authors.length > 1 && (
          <div class="filter-group">
            <span class="filter-group__label">author</span>
            {authors.map((a) => (
              <button
                key={a}
                class={`tag-chip ${selectedAuthors.has(a) ? 'tag-chip-active' : ''}`}
                onClick={() => toggle(selectedAuthors, setSelectedAuthors, a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div class="fridge-section">
        <button
          class={`fridge-toggle ${fridgeMode ? 'fridge-toggle-active' : ''}`}
          onClick={() => setFridgeMode(!fridgeMode)}
        >
          What's in my fridge?
        </button>

        {fridgeMode && (
          <div class="fridge-panel">
            {selectedIngredients.size > 0 && (
              <div class="ingredient-selected">
                {[...selectedIngredients].map((name) => (
                  <button
                    key={name}
                    class="ingredient-chip ingredient-chip-active"
                    onClick={() => toggleIngredient(name)}
                  >
                    {name} &times;
                  </button>
                ))}
              </div>
            )}
            <input
              class="search-input"
              type="text"
              placeholder="Search ingredients..."
              value={ingredientSearch}
              onInput={(e) => setIngredientSearch((e.target as HTMLInputElement).value)}
              style="margin-bottom: 0.5rem;"
            />
            <div class="ingredient-list">
              {visibleIngredients.map((name) => (
                <button
                  key={name}
                  class="ingredient-chip"
                  onClick={() => toggleIngredient(name)}
                >
                  {name}
                </button>
              ))}
              {visibleIngredients.length === 0 && (
                <span style="font-size: 0.85rem; color: var(--color-text-light);">No ingredients found</span>
              )}
            </div>
          </div>
        )}
      </div>

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

      <div class={`recipe-grid ${viewMode === 'row' ? 'recipe-grid-rows' : ''}`}>
        {filtered.length === 0 && <p style="color: var(--color-text-light);">No recipes match your filters.</p>}
        {filtered.map((r) => {
          const matchCount = showMatchBadges ? countMatches(r.ingredients, selectedIngredients) : 0;
          const totalSelected = selectedIngredients.size;
          const matchClass = matchCount === totalSelected ? 'match-full'
            : matchCount > 0 ? 'match-partial'
            : 'match-none';

          return (
            <a key={r.id} href={`/recipes/${r.id}`} style="text-decoration: none; color: inherit;">
              <article class="recipe-card">
                {viewMode === 'grid' && (
                  r.image ? (
                    <img class="recipe-card-image" src={r.image} alt={r.title} loading="lazy" />
                  ) : (
                    <div class="no-image">🍽</div>
                  )
                )}
                <div class="recipe-card-body">
                  <h3 class="recipe-card-title">{r.title}</h3>
                  <div class="recipe-card-meta">
                    <span>Prep {r.prep_time}</span>
                    <span>Cook {r.cook_time}</span>
                    <span>{r.difficulty}</span>
                  </div>
                  {r.added_by && (
                    <span class={`recipe-card-author ${r.added_by.toLowerCase() === 'mathilde' ? 'author-mathilde' : 'author-ixil'}`}>
                      {r.added_by}
                    </span>
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
                  {showMatchBadges && (
                    <span class={`match-badge ${matchClass}`}>
                      {matchCount}/{totalSelected} ingredients
                    </span>
                  )}
                </div>
              </article>
            </a>
          );
        })}
      </div>
    </div>
  );
}
