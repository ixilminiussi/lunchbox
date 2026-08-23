import { useState } from 'preact/hooks';
import { parseIngredient, scaleIngredient } from '../lib/ingredients';

interface Props {
  ingredients: string[];
  baseServings: number;
}

export default function ServingsAdjuster({ ingredients, baseServings }: Props) {
  const [servings, setServings] = useState(baseServings);

  const parsed = ingredients.map((line) =>
    line.trim().startsWith('#') ? null : parseIngredient(line)
  );

  const decrease = () => setServings((s) => Math.max(1, s - 1));
  const increase = () => setServings((s) => s + 1);

  return (
    <div class="servings-adjuster">
      <div class="servings-control">
        <h2>Ingredients</h2>
        <button class="servings-btn" onClick={decrease} aria-label="Decrease servings">-</button>
        <span class="servings-count">{servings}</span>
        <button class="servings-btn" onClick={increase} aria-label="Increase servings">+</button>
      </div>
      <ul>
        {ingredients.map((original, i) => {
          const trimmed = original.trim();
          if (trimmed.startsWith('#')) {
            return (
              <li key={i} class="ingredient-section">
                {trimmed.replace(/^#+\s*/, '')}
              </li>
            );
          }
          return (
            <li key={i}>
              {servings === baseServings
                ? original
                : scaleIngredient(parsed[i]!, baseServings, servings)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
