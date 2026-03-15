import { useState } from 'preact/hooks';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TAG_CATEGORIES = [
  { name: 'Style / Origin', tags: ['traditional', 'modern', 'fusion', 'experimental', 'invention', 'family-recipe'] },
  { name: 'Atmosphere / Occasion', tags: ['cozy', 'festive', 'fine-dining', 'street-food', 'luxurious'] },
  { name: 'Flavor / Intensity', tags: ['light', 'bold', 'hearty', 'fresh', 'spicy'] },
  { name: 'Temperature', tags: ['warm', 'cold'] },
  { name: 'Technique / Format', tags: ['barbecue', 'baked', 'fried', 'air-fried', 'slow-cooked', 'raw', 'one-pot', 'shareable', 'portable', 'plated'] },
  { name: 'Conservation / Shelf-life', tags: ['freezer-friendly', 'make-ahead', 'best-fresh'] },
];

interface Props {
  mode: 'create' | 'edit';
  recipeId?: string;
  initial?: {
    title: string;
    servings: number;
    prep_time: string;
    cook_time: string;
    cuisine: string;
    meal_type: string;
    difficulty: string;
    tags: string[];
    added_by: string;
    source: string;
    image: string;
    ingredients: string;
    instructions: string;
  };
}

export default function RecipeForm({ mode, recipeId, initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [prepTime, setPrepTime] = useState(initial?.prep_time ?? '');
  const [cookTime, setCookTime] = useState(initial?.cook_time ?? '');
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? '');
  const [mealType, setMealType] = useState(initial?.meal_type ?? 'dinner');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'medium');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(initial?.tags ?? []));
  const [addedBy, setAddedBy] = useState(initial?.added_by ?? 'Ixil');
  const [source, setSource] = useState(initial?.source ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/images/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Image upload failed');
      } else {
        setImage(data.url);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');

    const ingredientsList = ingredients
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Format instructions as markdown with numbered steps
    let instructionsBody = instructions.trim();
    // If not already formatted as numbered steps, just use as-is
    if (!instructionsBody.startsWith('## ')) {
      instructionsBody = `## Instructions\n\n${instructionsBody}`;
    }

    const payload = {
      title: title.trim(),
      servings: parseInt(servings) || 4,
      prep_time: prepTime,
      cook_time: cookTime,
      cuisine: cuisine || undefined,
      meal_type: mealType,
      difficulty,
      tags: [...selectedTags],
      added_by: addedBy,
      source: source || undefined,
      image: image || undefined,
      ingredients: ingredientsList,
      instructions: instructionsBody,
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const url = mode === 'edit' ? `/api/recipes/${recipeId}` : '/api/recipes';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(`Failed to save: ${await res.text()}`);
        setSaving(false);
        return;
      }

      const data = await res.json();
      const slug = mode === 'edit' ? recipeId : data.id;
      window.location.href = `/recipes/${slug}`;
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <form class="recipe-form" onSubmit={handleSubmit}>
      {error && <p class="login-error">{error}</p>}

      <fieldset>
        <legend>Basic Info</legend>
        <label>
          Title
          <input type="text" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} required />
        </label>
        <div class="recipe-form__row">
          <label>
            Servings
            <input type="number" min="1" value={servings} onInput={(e) => setServings((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            Prep Time
            <input type="text" placeholder="e.g. 10 min" value={prepTime} onInput={(e) => setPrepTime((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            Cook Time
            <input type="text" placeholder="e.g. 20 min" value={cookTime} onInput={(e) => setCookTime((e.target as HTMLInputElement).value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Classification</legend>
        <div class="recipe-form__row">
          <label>
            Cuisine
            <input type="text" placeholder="e.g. Italian" value={cuisine} onInput={(e) => setCuisine((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            Meal Type
            <select value={mealType} onChange={(e) => setMealType((e.target as HTMLSelectElement).value)}>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty((e.target as HTMLSelectElement).value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tags</legend>
        {TAG_CATEGORIES.map((cat) => (
          <div key={cat.name} class="recipe-form__tag-group">
            <span class="recipe-form__tag-label">{cat.name}</span>
            <div class="tag-multiselect">
              {cat.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  class={`tag-chip ${selectedTags.has(t) ? 'tag-chip-active' : ''}`}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Attribution</legend>
        <div class="recipe-form__row">
          <label>
            Added By
            <select value={addedBy} onChange={(e) => setAddedBy((e.target as HTMLSelectElement).value)}>
              <option value="Ixil">Ixil</option>
              <option value="Mathilde">Mathilde</option>
            </select>
          </label>
          <label>
            Source URL
            <input type="url" value={source} onInput={(e) => setSource((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {uploading && <span>Uploading...</span>}
            <input type="text" placeholder="Or paste image URL" value={image} onInput={(e) => setImage((e.target as HTMLInputElement).value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Ingredients</legend>
        <textarea
          rows={10}
          placeholder="One ingredient per line"
          value={ingredients}
          onInput={(e) => setIngredients((e.target as HTMLTextAreaElement).value)}
        />
      </fieldset>

      <fieldset>
        <legend>Instructions</legend>
        <textarea
          rows={12}
          placeholder="Numbered steps, e.g.:\n1. First step\n\n2. Second step"
          value={instructions}
          onInput={(e) => setInstructions((e.target as HTMLTextAreaElement).value)}
        />
      </fieldset>

      <button type="submit" class="manage-btn" disabled={saving}>
        {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create recipe'}
      </button>
    </form>
  );
}
