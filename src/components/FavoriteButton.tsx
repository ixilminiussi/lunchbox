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

function favKey(user: string, recipeId: string) {
  return `lunchbox-fav-${user}-${recipeId}`;
}

export default function FavoriteButton({ recipeId }: Props) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setFav(localStorage.getItem(favKey(user, recipeId)) === '1');
    }
  }, [recipeId]);

  function toggle() {
    const user = ensureUser();
    const next = !fav;
    if (next) {
      localStorage.setItem(favKey(user, recipeId), '1');
    } else {
      localStorage.removeItem(favKey(user, recipeId));
    }
    setFav(next);
  }

  return (
    <button class="favorite-btn" onClick={toggle} aria-label={fav ? 'Unfavorite' : 'Favorite'}>
      {fav ? '♥' : '♡'}
    </button>
  );
}
