import { useState } from 'preact/hooks';

interface Props {
  recipeId: string;
  ratings: Record<string, number>;
  currentUser: string | null;
}

function Stars({
  rating,
  interactive,
  onRate,
}: {
  rating: number;
  interactive: boolean;
  onRate?: (n: number) => void;
}) {
  return (
    <span class="rating-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          class={`rating-star ${n <= rating ? 'rating-star--filled' : ''}`}
          disabled={!interactive}
          onClick={() => interactive && onRate?.(n)}
          type="button"
        >
          {n <= rating ? '★' : '☆'}
        </button>
      ))}
    </span>
  );
}

export default function RatingDisplay({ recipeId, ratings: initialRatings, currentUser }: Props) {
  const [ratings, setRatings] = useState(initialRatings);
  const [saving, setSaving] = useState(false);

  const handleRate = async (n: number) => {
    if (!currentUser || saving) return;
    setSaving(true);
    const userKey = currentUser.toLowerCase();
    setRatings((prev) => ({ ...prev, [userKey]: n }));
    try {
      await fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: n }),
      });
    } catch {
      // revert on error
      setRatings(initialRatings);
    }
    setSaving(false);
  };

  const userKey = currentUser?.toLowerCase();

  return (
    <div class="rating-display">
      <div class="rating-row">
        <span class="author-ixil" style="font-weight:600; min-width:5ch;">Ixil</span>
        <Stars
          rating={ratings?.ixil ?? 0}
          interactive={userKey === 'ixil'}
          onRate={handleRate}
        />
      </div>
      <div class="rating-row">
        <span class="author-mathilde" style="font-weight:600; min-width:5ch;">Mathilde</span>
        <Stars
          rating={ratings?.mathilde ?? 0}
          interactive={userKey === 'mathilde'}
          onRate={handleRate}
        />
      </div>
    </div>
  );
}
