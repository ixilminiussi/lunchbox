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
  const [cuisine, setCuisine] = useState('');
  const [mealType, setMealType] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [diet, setDiet] = useState('');
  const [author, setAuthor] = useState('');
  const [search, setSearch] = useState('');

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
      if (cuisine && r.cuisine !== cuisine) return false;
      if (mealType && r.meal_type !== mealType) return false;
      if (selectedTags.size > 0 && ![...selectedTags].every((t) => r.tags.includes(t))) return false;
      if (diet && !r.dietary.includes(diet)) return false;
      if (author && r.added_by !== author) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    if (fridgeMode && selectedIngredients.size > 0) {
      result = result
        .map((r) => ({ ...r, _matchCount: countMatches(r.ingredients, selectedIngredients) }))
        .sort((a, b) => b._matchCount - a._matchCount);
    }

    return result;
  }, [recipes, cuisine, mealType, selectedTags, diet, author, search, fridgeMode, selectedIngredients]);

  function clear() {
    setCuisine('');
    setMealType('');
    setSelectedTags(new Set());
    setDiet('');
    setAuthor('');
    setSearch('');
  }

  const showMatchBadges = fridgeMode && selectedIngredients.size > 0;

  return (
    <div>
      <div class="filter-bar">
        <input
          class="search-input"
          style="flex: 1; min-width: 150px;"
          type="text"
          placeholder="Search..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        {cuisines.length > 0 && (
          <select value={cuisine} onChange={(e) => setCuisine((e.target as HTMLSelectElement).value)}>
            <option value="">All Cuisines</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <select value={mealType} onChange={(e) => setMealType((e.target as HTMLSelectElement).value)}>
          <option value="">All Meals</option>
          {mealTypes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {allTags.length > 0 && (
          <div class="tag-multiselect">
            {allTags.map((t) => (
              <button
                key={t}
                class={`tag-chip ${selectedTags.has(t) ? 'tag-chip-active' : ''}`}
                onClick={() =>
                  setSelectedTags((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    return next;
                  })
                }
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {allDiets.length > 0 && (
          <select value={diet} onChange={(e) => setDiet((e.target as HTMLSelectElement).value)}>
            <option value="">All Diets</option>
            {allDiets.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        {authors.length > 1 && (
          <select value={author} onChange={(e) => setAuthor((e.target as HTMLSelectElement).value)}>
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
        <button onClick={clear}>Clear</button>
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

      <div class="recipe-grid">
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
                {r.image ? (
                  <img class="recipe-card-image" src={r.image} alt={r.title} loading="lazy" />
                ) : (
                  <div class="no-image">🍽</div>
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
