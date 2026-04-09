import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';

// Load names plugin so "red", "blue", "transparent" etc. are recognized
extend([namesPlugin]);

/**
 * Normalizes a CSS color string to a consistent lowercase hex format.
 * Handles named colors, RGB, HSL, Hex, and explicit transparent mapping.
 * 
 * @param value - The input CSS color string.
 * @returns The normalized hex color (or rgba for transparent).
 */
export function normalizeColor(value: string): string {
  const trimmed = value.trim().toLowerCase();
  
  // Browsers often evaluate "transparent" as this exact RGBa string
  const transps = ['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)'];
  if (transps.includes(trimmed)) {
    return 'rgba(0, 0, 0, 0)';
  }

  const parsed = colord(trimmed);
  if (parsed.isValid()) {
    // toHex() safely provides a standard valid CSS hexadecimal format, including alpha #000000FF 
    return parsed.toHex();
  }

  return trimmed;
}

/**
 * Normalizes a dimension value (e.g., padding, margin, font-size).
 * Automatically infers and appends 'px' to raw numbers.
 * 
 * @param value - The CSS dimension value.
 * @returns The normalized dimension string with accurate units.
 */
export function normalizeDimension(value: string): string {
  if (!value) return '';

  return value
    .split(/\s+/) // Support compound multi-token values like "10px 20px"
    .map((token) => {
      const trimmed = token.trim();
      // Test if token is purely numeric (supports negatives and decimals)
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        if (trimmed === '0') return '0px';
        return `${trimmed}px`;
      }
      return trimmed.toLowerCase();
    })
    .join(' ');
}

/**
 * Compares actual and expected CSS values with branching logic for different property families.
 * Automatically accommodates a 1.0px rendering tolerance fuzziness for computed dimensions.
 * 
 * @param actual - The actual style value computed by the browser
 * @param expected - The strict expected standard
 * @param property - The CSS property name being tested
 * @returns True if they strictly or fuzzy-functionally match
 */
export function isStyleMatch(actual: string, expected: string, property: string): boolean {
  if (!actual && !expected) return true;
  if (!actual || !expected) return false;

  const prop = property.toLowerCase();

  // 1. Color Branch
  if (prop.includes('color')) {
    const c1 = colord(normalizeColor(actual)).toRgb();
    const c2 = colord(normalizeColor(expected)).toRgb();
    
    // Treat as match if R, G, and B are identical and Alpha is within a 0.02 tolerance
    if (c1.r === c2.r && c1.g === c2.g && c1.b === c2.b) {
      if (Math.abs(c1.a - c2.a) <= 0.02) {
        return true;
      }
    }
    return false;
  }

  // 2. Dimensions Branch
  const isDimension = 
    prop.includes('size') || 
    prop.includes('padding') || 
    prop.includes('margin') || 
    prop.includes('width') || 
    prop.includes('height') || 
    prop.includes('radius') ||
    prop.includes('gap') ||
    prop.includes('top') || 
    prop.includes('bottom') || 
    prop.includes('left') || 
    prop.includes('right');

  if (isDimension) {
    const normActual = normalizeDimension(actual).split(/\s+/);
    const normExpected = normalizeDimension(expected).split(/\s+/);

    if (normActual.length !== normExpected.length) {
      return false; // Structurally incompatible (e.g. 1-value vs 4-value padding shortcut)
    }

    const TOLERANCE_DELTA = 1;

    for (let i = 0; i < normActual.length; i++) {
        const actStr = normActual[i];
        const expStr = normExpected[i];

        // Ensure both evaluate pixel math using floats mapping precisely to CSS subpixels
        const actPxMatch = actStr.match(/^(-?\d+(\.\d+)?)px$/);
        const expPxMatch = expStr.match(/^(-?\d+(\.\d+)?)px$/);

        if (actPxMatch && expPxMatch) {
            const actVal = parseFloat(actPxMatch[1]);
            const expVal = parseFloat(expPxMatch[1]);
            
            // Subpixel tolerance calculation
            if (Math.abs(actVal - expVal) > TOLERANCE_DELTA) {
                return false;
            }
        } else if (actStr !== expStr) {
            // Either string literals (like "auto") or mistmatched units
            return false;
        }
    }
    return true;
  }

  // 3. Absolute Fallback Branch
  return actual.trim().toLowerCase() === expected.trim().toLowerCase();
}
