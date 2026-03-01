const UNICODE_FRACTIONS: Record<string, number> = {
  '\u00BD': 1 / 2, // ½
  '\u2153': 1 / 3, // ⅓
  '\u2154': 2 / 3, // ⅔
  '\u00BC': 1 / 4, // ¼
  '\u00BE': 3 / 4, // ¾
  '\u2155': 1 / 5, // ⅕
  '\u2156': 2 / 5, // ⅖
  '\u2157': 3 / 5, // ⅗
  '\u2158': 4 / 5, // ⅘
  '\u2159': 1 / 6, // ⅙
  '\u215A': 5 / 6, // ⅚
  '\u215B': 1 / 8, // ⅛
  '\u215C': 3 / 8, // ⅜
  '\u215D': 5 / 8, // ⅝
  '\u215E': 7 / 8, // ⅞
};

const UNITS = [
  'kg', 'g', 'mg', 'lb', 'lbs', 'oz',
  'l', 'ml', 'dl', 'cl',
  'cup', 'cups', 'tbsp', 'tsp',
  'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'bunch', 'bunches', 'clove', 'cloves',
  'pinch', 'handful', 'handfuls',
  'slice', 'slices', 'piece', 'pieces',
  'can', 'cans', 'tin', 'tins',
  'sprig', 'sprigs', 'stalk', 'stalks',
];

export interface ParsedIngredient {
  quantity: number | null;
  unit: string;
  name: string;
  unitAttached: boolean; // e.g. "350g" vs "1 cup"
}

// Regex: optional integer, optional slash-fraction or unicode fraction, then rest
// Matches: "350", "1/2", "1 1/2", "½", "1½", ""
const QTY_RE = new RegExp(
  `^(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\.\\d+|\\d+)?\\s*([${Object.keys(UNICODE_FRACTIONS).join('')}])?\\s*`
);

function parseQuantity(s: string): { quantity: number | null; rest: string } {
  const trimmed = s.trim();
  const match = trimmed.match(QTY_RE);
  if (!match || (!match[1] && !match[2])) {
    return { quantity: null, rest: trimmed };
  }

  let qty = 0;
  const numPart = match[1];
  const fracChar = match[2];

  if (numPart) {
    if (numPart.includes(' ') && numPart.includes('/')) {
      // Mixed number: "1 1/2"
      const [whole, frac] = numPart.split(/\s+/);
      const [num, den] = frac.split('/');
      qty = parseInt(whole) + parseInt(num) / parseInt(den);
    } else if (numPart.includes('/')) {
      // Slash fraction: "1/2"
      const [num, den] = numPart.split('/');
      qty = parseInt(num) / parseInt(den);
    } else {
      qty = parseFloat(numPart);
    }
  }

  if (fracChar) {
    qty += UNICODE_FRACTIONS[fracChar] ?? 0;
  }

  const rest = trimmed.slice(match[0].length);
  return { quantity: qty, rest };
}

export function parseIngredient(line: string): ParsedIngredient {
  const { quantity, rest } = parseQuantity(line);

  if (quantity === null) {
    return { quantity: null, unit: '', name: rest, unitAttached: false };
  }

  // Check for attached unit (e.g. "350g spaghetti" — no space between number and unit)
  const attachedMatch = rest.match(new RegExp(`^(${UNITS.join('|')})\\b(.*)`, 'i'));
  if (attachedMatch) {
    const unit = attachedMatch[1];
    const name = attachedMatch[2].trim();
    // Determine if unit was attached to the number in the original string
    const qtyMatch = line.match(QTY_RE);
    const afterQty = line.slice(qtyMatch?.[0].length ?? 0);
    const unitAttached = afterQty.startsWith(unit) && !line.includes(` ${unit}`);
    return { quantity, unit, name, unitAttached };
  }

  // Check for spaced unit (e.g. "1 cup flour")
  const spacedMatch = rest.match(new RegExp(`^(${UNITS.join('|')})\\b\\s*(.*)`, 'i'));
  if (spacedMatch) {
    return { quantity, unit: spacedMatch[1], name: spacedMatch[2].trim(), unitAttached: false };
  }

  // No unit found (e.g. "2 eggs")
  return { quantity, unit: '', name: rest.trim(), unitAttached: false };
}

function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toString();
}

export function scaleIngredient(
  parsed: ParsedIngredient,
  baseServings: number,
  targetServings: number,
): string {
  if (parsed.quantity === null) {
    return [parsed.unit, parsed.name].filter(Boolean).join(' ');
  }

  const scaled = (parsed.quantity / baseServings) * targetServings;
  const qty = formatQuantity(scaled);

  if (parsed.unit) {
    const unitPart = parsed.unitAttached ? parsed.unit : ` ${parsed.unit}`;
    return `${qty}${unitPart} ${parsed.name}`.trim();
  }

  return `${qty} ${parsed.name}`.trim();
}
