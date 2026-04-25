import { useState } from 'preact/hooks';
import RecipeForm from './RecipeForm';

interface Props {
  currentUser: string;
}

export default function ImportLoader({ currentUser }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState<any>(null);

  const handleImport = async (e: Event) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to import');
        setLoading(false);
        return;
      }

      setImported(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (imported) {
    return (
      <RecipeForm
        mode="create"
        initial={{
          title: imported.title,
          servings: imported.servings,
          prep_time: imported.prep_time,
          cook_time: imported.cook_time,
          cuisine: imported.cuisine,
          meal_type: 'dinner',
          difficulty: 'medium',
          tags: [],
          added_by: currentUser,
          source: imported.source,
          image: imported.image,
          ingredients: imported.ingredients,
          instructions: (imported.instructions as string)
            .split(/\n*\d+\.\s+/)
            .filter(Boolean)
            .map((s: string) => s.trim()),
        }}
      />
    );
  }

  return (
    <form class="recipe-form" onSubmit={handleImport}>
      {error && <p class="login-error">{error}</p>}
      <fieldset>
        <legend>Recipe URL</legend>
        <label>
          Paste the URL of a recipe page
          <input
            type="url"
            value={url}
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            placeholder="https://..."
            required
          />
        </label>
      </fieldset>
      <button type="submit" class="manage-btn" disabled={loading}>
        {loading ? 'Importing...' : 'Import'}
      </button>
    </form>
  );
}
