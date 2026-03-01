import { useState } from 'preact/hooks';

export default function MarkdownImporter() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!markdown.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/recipes/import-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: markdown.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to import');
        setLoading(false);
        return;
      }

      window.location.href = `/recipes/${data.id}`;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <form class="recipe-form" onSubmit={handleSubmit}>
      {error && <p class="login-error">{error}</p>}
      <fieldset>
        <legend>Recipe Markdown</legend>
        <label>
          Paste recipe markdown with YAML frontmatter
          <textarea
            value={markdown}
            onInput={(e) => setMarkdown((e.target as HTMLTextAreaElement).value)}
            rows={20}
            placeholder={"---\ntitle: \"My Recipe\"\nservings: 4\nprep_time: \"10 min\"\ncook_time: \"30 min\"\ningredients:\n  - 1 cup flour\n  - 2 eggs\n---\n\n## Instructions\n\n1. Mix ingredients..."}
            required
          />
        </label>
      </fieldset>
      <button type="submit" class="manage-btn" disabled={loading}>
        {loading ? 'Importing...' : 'Import markdown'}
      </button>
    </form>
  );
}
