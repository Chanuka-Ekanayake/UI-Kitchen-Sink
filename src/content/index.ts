import { ValidationResult, PropertyResult, ScannerMessage, ComponentStandard } from '../shared/types';
import { isStyleMatch } from '../shared/normalizer';

(window as any).__UI_VALIDATOR_LOADED__ = true;
console.log('[UI Validator] Content Script Loaded');
console.log('[UI Validator] Page:', window.location.href);

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexedRule {
  rule: CSSStyleRule;
  selectorText: string;  // the individual selector (after splitting commas)
  sheetHref: string;     // origin URL or 'inline'
  index: number;         // global declaration order for cascade precedence
}

type PseudoResult =
  | { status: 'RESOLVED'; value: string }
  | { status: 'NOT_DEFINED'; value: '' }
  | { status: 'CORS_BLOCKED'; value: '' };

interface DebugEntry {
  sheetHref: string;
  matchedSelector: string;
  rawValue: string;
  resolvedValue: string;
}

// ─── CSSOM Crawler ────────────────────────────────────────────────────────────

/**
 * Crawls every accessible stylesheet recursively (including @media / @supports
 * grouping rules and @import) and flattens all CSSStyleRules into a single
 * ordered array. Each entry preserves the sheet origin and a monotonic index
 * so that cascade ordering is trivially derivable (last wins).
 *
 * Sheets blocked by CORS are tracked in `corsBlockedSheets`.
 */
function buildIndexedRules(): { rules: IndexedRule[]; corsBlockedSheets: string[] } {
  const allRules: IndexedRule[] = [];
  const corsBlockedSheets: string[] = [];
  let globalIndex = 0;

  function crawl(ruleList: CSSRuleList, sheetHref: string) {
    for (let i = 0; i < ruleList.length; i++) {
      const r = ruleList[i];

      if (r instanceof CSSStyleRule) {
        // Split comma-separated selectors so ".a, .b { }" becomes two entries
        const parts = r.selectorText.split(',').map(s => s.trim());
        for (const sel of parts) {
          allRules.push({ rule: r, selectorText: sel, sheetHref, index: globalIndex++ });
        }
      } else if (r instanceof CSSGroupingRule) {
        // Handles @media, @supports, @layer, etc.
        try { crawl(r.cssRules, sheetHref); } catch { /* nested CORS – skip */ }
      } else if ((r as any).styleSheet) {
        // Handles @import rules
        try { crawl((r as any).styleSheet.cssRules, (r as any).styleSheet.href || sheetHref); } catch { /* CORS */ }
      }
    }
  }

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    const href = sheet.href || 'inline';
    try {
      if (sheet.cssRules) {
        crawl(sheet.cssRules, href);
      }
    } catch {
      corsBlockedSheets.push(href);
      console.warn(`[CSSOM Scanner] SecurityError – cannot read cssRules from: ${href}`);
    }
  }

  return { rules: allRules, corsBlockedSheets };
}

// ─── Virtual Proxy Resolver ───────────────────────────────────────────────────

/**
 * Applies a rule's raw `cssText` to a hidden proxy element and reads the
 * resolved / normalised value of `property` via `getComputedStyle`.
 *
 * This solves shorthand → longhand expansion automatically:
 *   e.g. CSS defines `background: red`, user asks for `background-color`
 *        → proxy returns `rgb(255, 0, 0)`.
 */
function resolveViaProxy(cssText: string, property: string): string {
  const proxy = document.createElement('div');
  proxy.style.cssText = `
    position: fixed !important;
    top: -9999px !important;
    left: -9999px !important;
    width: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
    ${cssText}
  `;
  document.body.appendChild(proxy);
  const resolved = window.getComputedStyle(proxy).getPropertyValue(property);
  document.body.removeChild(proxy);
  return resolved;
}

// ─── Core Pseudo-State Value Extractor ────────────────────────────────────────

/**
 * Determines the CSS value for a given `property` under a specific `pseudoState`
 * for the provided `element`.
 *
 * Algorithm:
 *  1. `default` → standard getComputedStyle on the live element.
 *  2. Interactive pseudo (hover/active/focus/visited) →
 *     a. Iterate ALL indexed rules looking for selectors that contain `:state`.
 *     b. Strip the pseudo portion and test `element.matches(basePartOfRule)`.
 *     c. Collect every matching rule (preserving declaration order).
 *     d. Walk matches in reverse (last rule wins – cascade).
 *     e. First try `rule.style.getPropertyValue(property)` directly.
 *     f. If empty → run the Virtual Proxy resolver on `rule.style.cssText`.
 *     g. If still empty → continue to earlier rules.
 *  3. If no rules matched at all → NOT_DEFINED.
 *  4. If ALL sheets were CORS-blocked → CORS_BLOCKED.
 */
function getPseudoStateStyle(
  element: Element,
  pseudoState: string,
  property: string,
  indexedRules: IndexedRule[],
  corsBlockedSheets: string[],
  debugLog: DebugEntry[] | null
): PseudoResult {
  // ── Default: live computed style ──
  if (pseudoState === 'default') {
    const computed = window.getComputedStyle(element);
    return { status: 'RESOLVED', value: getResolvedStyle(computed, property) };
  }

  // ── Interactive pseudo-state: CSSOM search ──
  const pseudoSuffix = `:${pseudoState}`;

  // Collect ALL matching rules for this element + pseudo combination
  const matches: IndexedRule[] = [];

  for (const entry of indexedRules) {
    const sel = entry.selectorText;

    // Quick check: the selector text must contain our pseudo suffix
    if (!sel.includes(pseudoSuffix)) continue;

    // Extract the "base" part before (or around) the pseudo.
    // Handles compound selectors like `.parent:hover .child` too —
    // we replace every pseudo token so the base becomes `.parent .child`,
    // then use element.matches() on that cleaned selector.
    const baseSel = sel.replace(new RegExp(`:${pseudoState}`, 'g'), '');

    if (!baseSel.trim()) continue;

    try {
      if (element.matches(baseSel)) {
        matches.push(entry);
      }
    } catch {
      // Invalid selector after stripping – skip silently
    }
  }

  if (matches.length === 0) {
    // If we had CORS-blocked sheets, the rule might exist there
    if (corsBlockedSheets.length > 0) {
      return { status: 'CORS_BLOCKED', value: '' };
    }
    return { status: 'NOT_DEFINED', value: '' };
  }

  // Walk in reverse declaration order so the last-defined rule wins (cascade)
  for (let i = matches.length - 1; i >= 0; i--) {
    const { rule, selectorText, sheetHref } = matches[i];

    // 1. Try direct property access
    let rawVal = rule.style.getPropertyValue(property);

    // 2. Fallback: Virtual Proxy resolver (shorthand → longhand)
    let resolvedVal = rawVal;
    if (!rawVal) {
      resolvedVal = resolveViaProxy(rule.style.cssText, property);
    }

    if (resolvedVal) {
      if (debugLog) {
        debugLog.push({
          sheetHref,
          matchedSelector: selectorText,
          rawValue: rawVal || '(shorthand)',
          resolvedValue: resolvedVal,
        });
      }
      return { status: 'RESOLVED', value: resolvedVal };
    }
  }

  return { status: 'NOT_DEFINED', value: '' };
}

// ─── Score Calculator ─────────────────────────────────────────────────────────

function calculateComponentScore(results: PropertyResult[]): number {
  if (results.length === 0) return 0;

  let totalWeight = 0;
  let passedWeight = 0;

  for (const result of results) {
    const weight = result.severity === 'error' ? 3 : 1;
    totalWeight += weight;
    if (result.passed) passedWeight += weight;
  }

  if (totalWeight === 0) return 100;
  return Math.max(0, Math.min(100, Math.round((passedWeight / totalWeight) * 100)));
}

// ─── Shorthand Resolver for Default State ─────────────────────────────────────

function getResolvedStyle(computed: CSSStyleDeclaration, property: string): string {
  const val = computed.getPropertyValue(property) || (computed as any)[property];
  if (val) return val;

  if (property === 'padding') {
    return `${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`;
  }
  if (property === 'margin') {
    return `${computed.marginTop} ${computed.marginRight} ${computed.marginBottom} ${computed.marginLeft}`;
  }
  if (property === 'border') {
    return `${computed.borderTopWidth || computed.borderWidth} ${computed.borderTopStyle || computed.borderStyle} ${computed.borderTopColor || computed.borderColor}`;
  }
  if (property === 'border-radius') {
    return `${computed.borderTopLeftRadius} ${computed.borderTopRightRadius} ${computed.borderBottomRightRadius} ${computed.borderBottomLeftRadius}`;
  }

  return '';
}

// ─── Main Audit Engine ────────────────────────────────────────────────────────

function runAudit(standards: ComponentStandard[], debug = false): ValidationResult[] {
  const startTime = performance.now();
  const evaluationResults: ValidationResult[] = [];
  const debugEntries: DebugEntry[] = [];

  // One-time CSSOM crawl
  const { rules: indexedRules, corsBlockedSheets } = buildIndexedRules();

  if (corsBlockedSheets.length > 0) {
    console.warn(
      `[CSSOM Scanner] ${corsBlockedSheets.length} stylesheet(s) blocked by CORS:`,
      corsBlockedSheets
    );
  }

  for (const standard of standards) {
    let elements: NodeListOf<Element>;
    try {
      elements = document.querySelectorAll(standard.selector);
    } catch {
      console.warn(`[Scanner] Invalid selector: "${standard.selector}"`);
      continue;
    }
    if (elements.length === 0) continue;

    elements.forEach(element => {
      const propertyResults: PropertyResult[] = [];

      for (const rule of standard.styles) {
        if (!rule || rule.expectedValue == null) continue;

        const state = rule.state || 'default';
        const result = getPseudoStateStyle(
          element,
          state,
          rule.property,
          indexedRules,
          corsBlockedSheets,
          debug ? debugEntries : null,
        );

        let passed = false;
        let actualDisplay: string;

        switch (result.status) {
          case 'RESOLVED':
            passed = isStyleMatch(result.value, rule.expectedValue, rule.property);
            actualDisplay = result.value;
            break;
          case 'NOT_DEFINED':
            actualDisplay = 'Not Defined';
            break;
          case 'CORS_BLOCKED':
            actualDisplay = 'CORS Blocked';
            break;
        }

        propertyResults.push({
          property: rule.property,
          expected: rule.expectedValue,
          actual: actualDisplay,
          passed,
          severity: rule.severity,
          state,
        });
      }

      const score = calculateComponentScore(propertyResults);
      const idx = Array.from(document.querySelectorAll(standard.selector)).indexOf(element);

      evaluationResults.push({
        elementSelector: `${standard.selector}[${idx}]`,
        componentName: standard.name,
        results: propertyResults,
        score,
      });
    });
  }

  const elapsed = (performance.now() - startTime).toFixed(2);
  console.log(`[UI Scanner] Audit complete in ${elapsed}ms — ${evaluationResults.length} element(s) evaluated.`);

  if (debug && debugEntries.length > 0) {
    console.log('[UI Scanner] Debug — CSSOM Matches:');
    console.table(debugEntries);
  }

  return evaluationResults;
}

const HIGHLIGHT_PADDING = 8;

class OverlayManager {
  private overlay: HTMLElement | null = null;
  private currentSelector: string | null = null;
  private currentIsPassed: boolean | null = null;

  constructor() {
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private initOverlay() {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.id = 'validator-highlight-overlay';
    this.overlay.style.position = 'absolute';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '2147483647';
    this.overlay.style.transition = 'all 0.2s ease-in-out';
    this.overlay.style.borderRadius = '4px';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  // Gracefully decompose arbitrary array notation like: "button.btn-primary[0]" securely back mapping to querySelectorAll
  private resolveSelector(selector: string): HTMLElement | null {
    const match = selector.match(/^(.*)\[(\d+)]$/);
    if (match) {
      const baseSelector = match[1];
      const index = parseInt(match[2], 10);
      try {
        const elements = document.querySelectorAll(baseSelector);
        return (elements[index] as HTMLElement) || null;
      } catch (err) {
        return null;
      }
    }
    
    try {
      return document.querySelector(selector) as HTMLElement;
    } catch (err) {
      return null;
    }
  }

  public updateOverlayPosition(selector: string, isPassed: boolean) {
    this.initOverlay();
    
    const targetElement = this.resolveSelector(selector);
    
    if (!targetElement) {
      console.warn(`Scanner Overlay: Element not found or invalid -> ${selector}`);
      this.hide();
      return;
    }

    this.currentSelector = selector;
    this.currentIsPassed = isPassed;
    
    const rect = targetElement.getBoundingClientRect();

    // Conditional Styling
    if (isPassed) {
      this.overlay!.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; // Green
      this.overlay!.style.border = '2px solid rgba(34, 197, 94, 0.5)';
    } else {
      this.overlay!.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Red
      this.overlay!.style.border = '2px solid rgba(239, 68, 68, 0.5)';
    }

    // Absolute positioning mapped dynamically adding Scroll margins + Padding 
    this.overlay!.style.top = `${rect.top + window.scrollY - HIGHLIGHT_PADDING}px`;
    this.overlay!.style.left = `${rect.left + window.scrollX - HIGHLIGHT_PADDING}px`;
    this.overlay!.style.width = `${rect.width + (HIGHLIGHT_PADDING * 2)}px`;
    this.overlay!.style.height = `${rect.height + (HIGHLIGHT_PADDING * 2)}px`;
    this.overlay!.style.display = 'block';
  }

  public hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    this.currentSelector = null;
  }

  private handleResize() {
    if (this.currentSelector && this.overlay?.style.display !== 'none' && this.currentIsPassed !== null) {
      this.updateOverlayPosition(this.currentSelector, this.currentIsPassed);
    }
  }
}

const overlayManager = new OverlayManager();

chrome.runtime.onMessage.addListener(
  (request: ScannerMessage, sender, sendResponse) => {
    switch (request.action) {
      case 'START_SCAN':
        console.log('[UI Scanner] Received START_SCAN — initiating audit…');
        const auditFindings = runAudit(request.standards, request.debug ?? false);
        sendResponse(auditFindings);
        return true;

      case 'HIGHLIGHT_ELEMENT':
        if (request.action === 'HIGHLIGHT_ELEMENT') {
          overlayManager.updateOverlayPosition(request.payload.selector, request.payload.isPassed);
        }
        sendResponse({ status: 'received' });
        break;

      case 'CLEAR_HIGHLIGHT':
        overlayManager.hide();
        sendResponse({ status: 'received' });
        break;
    }
  }
);

export { };

