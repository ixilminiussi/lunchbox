import { useState, useEffect } from 'preact/hooks';

interface Props {
  recipeId: string;
}

function getUser(): string | null {
  return localStorage.getItem('lunchbox-user');
}

function ensureUser(): string {
  let user = getUser();
  if (!user) {
    user = prompt('What\'s your name?') ?? 'anon';
    localStorage.setItem('lunchbox-user', user);
  }
  return user;
}

function ratingKey(user: string, recipeId: string) {
  return `lunchbox-rating-${user}-${recipeId}`;
}

export default function RatingStars({ recipeId }: Props) {
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const user = getUser();
    if (user) {
      const stored = localStorage.getItem(ratingKey(user, recipeId));
      if (stored) setRating(parseInt(stored, 10));
    }
  }, [recipeId]);

  function rate(n: number) {
    const user = ensureUser();
    const next = rating === n ? 0 : n;
    if (next === 0) {
      localStorage.removeItem(ratingKey(user, recipeId));
    } else {
      localStorage.setItem(ratingKey(user, recipeId), String(next));
    }
    setRating(next);
  }

  return (
    <div class="rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          class={n <= rating ? 'active' : ''}
          onClick={() => rate(n)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
