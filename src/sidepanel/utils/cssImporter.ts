import { ComponentBlock, StyleRule } from '../../shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum CSSStyleRule entries processed from a single file */
export const CSS_IMPORT_RULE_LIMIT = 100;

/** Pseudo-class → state mapping we support */
const SUPPORTED_PSEUDOS: Record<string, StyleRule['state']> = {
  ':hover':   'hover',
  ':focus':   'focus',
  ':active':  'active',
  ':visited': 'visited',
};

/** Complex pseudo-functions we cannot handle */
const COMPLEX_PSEUDO_RE = /:(?:has|not|where|is|nth-child|nth-of-type|nth-last-child|nth-last-of-type)\s*\(/i;

/** Combinator characters that make a selector "complex" for our engine */
const COMBINATOR_RE = /[\s>+~]/;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedSelector {
  htmlTag: string;
  cssClass: string;
  cssId: string;
  /** Detected supported pseudo-class state, or 'default' */
  state: StyleRule['state'];
}

export interface CssImportResult {
  components: ComponentBlock[];
  /** Selectors that were skipped because they are too complex */
  ignoredSelectors: string[];
  /** Rules with zero usable declarations */
  emptyRules: number;
  /** Rules beyond the hard limit */
  overLimitRules: number;
  /** Parse / performance warnings */
  warnings: string[];
}

// ─── Safety Guard ─────────────────────────────────────────────────────────────

/**
 * Returns true if the selector is too complex for the audit engine to
 * currently handle (combinators, complex pseudo-functions, attribute selectors).
 */
function isComplexSelector(raw: string): boolean {
  // Strip supported pseudo-classes before checking for combinators so that
  // ".btn:hover" doesn't fire the combinator guard via the colon.
  const stripped = raw
    .replace(/:(?:hover|focus|active|visited)/gi, '')
    .trim();

  if (COMBINATOR_RE.test(stripped)) return true;
  if (COMPLEX_PSEUDO_RE.test(raw)) return true;
  if (/\[/.test(raw)) return true;   // attribute selectors
  if (/::/.test(raw)) return true;   // pseudo-elements (::before etc.)
  return false;
}

// ─── Selector Decomposition ───────────────────────────────────────────────────

/**
 * Decomposes a single simple CSS selector (with optional supported
 * pseudo-class) into the extension's 4-field model.
 *
 * Examples:
 *   ".btn:hover"        → { htmlTag:'',      cssClass:'btn',    cssId:'',        state:'hover'    }
 *   "button#submit"     → { htmlTag:'button', cssClass:'',       cssId:'submit',  state:'default'  }
 *   ".card"             → { htmlTag:'',      cssClass:'card',   cssId:'',        state:'default'  }
 */
export function parseSelector(selectorText: string): ParsedSelector {
  let state: StyleRule['state'] = 'default';

  // Detect and strip supported pseudo-class
  for (const [pseudo, mappedState] of Object.entries(SUPPORTED_PSEUDOS)) {
    if (selectorText.toLowerCase().includes(pseudo)) {
      state = mappedState;
      selectorText = selectorText.replace(new RegExp(pseudo, 'gi'), '').trim();
      break;
    }
  }

  // Strip any remaining pseudo-elements / pseudo-classes
  const clean = selectorText
    .replace(/::?[\w-]+(\(.*?\))?/g, '')
    .trim();

  const TAG_RE  = /^([a-z][a-z0-9-]*)/i;
  const ID_RE   = /#([a-zA-Z_-][a-zA-Z0-9_-]*)/;
  const CLASS_RE = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/;

  const tagMatch   = TAG_RE.exec(clean);
  const idMatch    = ID_RE.exec(clean);
  const classMatch = CLASS_RE.exec(clean);

  return {
    htmlTag:  tagMatch   ? tagMatch[1].toLowerCase() : '',
    cssId:    idMatch    ? idMatch[1]                : '',
    cssClass: classMatch ? classMatch[1]             : '',
    state,
  };
}

// ─── Name Generator ───────────────────────────────────────────────────────────

export function nextCssComponentName(existingNames: string[]): string {
  let index = 1;
  while (existingNames.includes(`CSS Component ${index}`)) index++;
  return `CSS Component ${index}`;
}

// ─── Selector key for deduplication ──────────────────────────────────────────

function selectorKey(p: ParsedSelector): string {
  return `${p.htmlTag}|${p.cssClass}|${p.cssId}`;
}

// ─── CSS Parser ───────────────────────────────────────────────────────────────

/**
 * Parses a raw CSS string into ComponentBlock objects.
 *
 * Key behaviours vs. the previous version:
 * - Rules sharing the same base selector are MERGED into one ComponentBlock
 *   (different pseudo-states → different StyleRules on the same block).
 * - Complex/unsupported selectors are filtered out and listed in `ignoredSelectors`.
 * - Pseudo-class state is captured per rule and stored on each StyleRule.
 */
export function parseCssToComponents(
  cssText: string,
  existingComponentNames: string[] = [],
): CssImportResult {
  const warnings: string[] = [];
  const ignoredSelectors: string[] = [];
  let emptyRules = 0;
  let overLimitRules = 0;
  let cssRules: CSSRuleList | null = null;

  // ── Parse with browser CSSOM ────────────────────────────────────────────────
  try {
    const sheet = new CSSStyleSheet();
    const sanitised = cssText.replace(/@import[^;]+;/g, '/* @import stripped */');
    sheet.replaceSync(sanitised);
    cssRules = sheet.cssRules;
  } catch {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const iDoc = iframe.contentDocument!;
      const style = iDoc.createElement('style');
      style.textContent = cssText;
      iDoc.head.appendChild(style);
      cssRules = style.sheet?.cssRules ?? null;
      document.body.removeChild(iframe);
    } catch {
      warnings.push('CSS parser failed; the file may contain unsupported syntax.');
      return { components: [], ignoredSelectors, emptyRules: 0, overLimitRules: 0, warnings };
    }
  }

  if (!cssRules) {
    warnings.push('No CSS rules could be extracted from the file.');
    return { components: [], ignoredSelectors, emptyRules: 0, overLimitRules: 0, warnings };
  }

  // Flatten @media / @supports into a single list for processing
  const flatRules: CSSStyleRule[] = [];
  const flattenGrouping = (ruleList: CSSRuleList) => {
    for (let i = 0; i < ruleList.length; i++) {
      const r = ruleList[i];
      if (r instanceof CSSStyleRule) {
        flatRules.push(r);
      } else if (r instanceof CSSMediaRule || r instanceof CSSSupportsRule) {
        flattenGrouping((r as CSSGroupingRule).cssRules);
      }
      // @keyframes, @font-face, @charset etc. are silently ignored
    }
  };
  flattenGrouping(cssRules);

  const totalRules = flatRules.length;
  if (totalRules > CSS_IMPORT_RULE_LIMIT) {
    overLimitRules = totalRules - CSS_IMPORT_RULE_LIMIT;
    warnings.push(
      `Large CSS file detected (${totalRules} rules). Only the first ${CSS_IMPORT_RULE_LIMIT} will be imported.`
    );
  }

  // ── Build a selector-keyed map so we can merge rules for the same element ──

  /** Map from selectorKey → ComponentBlock being assembled */
  const componentMap = new Map<string, ComponentBlock>();
  const usedNames: string[] = [...existingComponentNames];

  for (let i = 0; i < Math.min(totalRules, CSS_IMPORT_RULE_LIMIT); i++) {
    const rule = flatRules[i];
    const rawSelector = rule.selectorText.trim();

    // ── Safety guard: skip complex selectors ──────────────────────────────────
    if (isComplexSelector(rawSelector)) {
      ignoredSelectors.push(rawSelector);
      continue;
    }

    // ── Parse selector ────────────────────────────────────────────────────────
    const parsed = parseSelector(rawSelector);

    // Skip selectors that produced no usable parts
    if (!parsed.htmlTag && !parsed.cssClass && !parsed.cssId) {
      emptyRules++;
      continue;
    }

    // ── Extract declarations ──────────────────────────────────────────────────
    const style = rule.style;
    const newRules: StyleRule[] = [];
    for (let k = 0; k < style.length; k++) {
      const property = style[k].trim();
      const value    = style.getPropertyValue(property).trim();
      if (!property || !value) continue;

      newRules.push({
        id:       crypto.randomUUID?.() ?? `${Date.now()}-${i}-${k}`,
        property,
        value,
        severity: 'error',
        state:    parsed.state,
      });
    }

    if (newRules.length === 0) {
      emptyRules++;
      continue;
    }

    // ── Merge or create component ─────────────────────────────────────────────
    const key = selectorKey(parsed);

    if (componentMap.has(key)) {
      // Same base selector — append rules to existing block
      componentMap.get(key)!.styleRules.push(...newRules);
    } else {
      const name = nextCssComponentName(usedNames);
      usedNames.push(name);

      const block: ComponentBlock = {
        id:         crypto.randomUUID?.() ?? `${Date.now()}-${i}`,
        name,
        htmlTag:    parsed.htmlTag,
        cssClass:   parsed.cssClass,
        cssId:      parsed.cssId,
        isEnabled:  true,
        styleRules: newRules,
      };
      componentMap.set(key, block);
    }
  }

  const components = Array.from(componentMap.values());

  return { components, ignoredSelectors, emptyRules, overLimitRules, warnings };
}

// ─── File Reader Wrapper ──────────────────────────────────────────────────────

export function handleCssImportFile(
  file: File,
  existingComponentNames: string[] = [],
): Promise<CssImportResult> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.css') && file.type !== 'text/css') {
      reject(new Error('Invalid File Type: please select a .css file.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('Could not read file contents.');
        resolve(parseCssToComponents(text, existingComponentNames));
      } catch (err: any) {
        reject(new Error(err.message ?? 'CSS parsing failed.'));
      }
    };

    reader.onerror = () => reject(new Error('File read error: could not open the selected file.'));
    reader.readAsText(file);
  });
}
