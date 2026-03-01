import { useState } from 'preact/hooks';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    setQuery(value);
    const grid = document.getElementById('recipe-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>('.recipe-card');
    const q = value.toLowerCase();
    cards.forEach((card) => {
      const title = card.dataset.title ?? '';
      card.style.display = title.includes(q) ? '' : 'none';
    });
  }

  return (
    <div class="search-wrapper">
      <input
        class="search-input"
        type="text"
        placeholder="Search recipes..."
        value={query}
        onInput={handleInput}
      />
    </div>
  );
}
