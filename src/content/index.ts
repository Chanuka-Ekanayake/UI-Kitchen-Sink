import { ValidationResult, PropertyResult, ScannerMessage, ComponentStandard } from '../shared/types';
import { isStyleMatch } from '../shared/normalizer';

(window as any).__UI_VALIDATOR_LOADED__ = true;
console.log('UI Validator Content Script Loaded');
console.log('Content script loaded on', window.location.href);

/**
 * Calculates a precise component score based on weighted severity of passed rules.
 * 
 * @param results - Array of evaluated property results
 * @returns A whole integer percentage clamped between 0 and 100
 */
function calculateComponentScore(results: PropertyResult[]): number {
  if (results.length === 0) return 0;
  
  let totalWeight = 0;
  let passedWeight = 0;
  
  for (const result of results) {
    const weight = result.severity === 'error' ? 3 : 1;
    totalWeight += weight;
    if (result.passed) {
      passedWeight += weight;
    }
  }
  
  if (totalWeight === 0) return 100;
  
  const score = Math.round((passedWeight / totalWeight) * 100);
  return Math.max(0, Math.min(100, score));
}

/**
 * Reconstructs standard CSS shorthand properties from computed longhand variants.
 */
function getResolvedStyle(computedStyles: CSSStyleDeclaration, property: string): string {
  const val = computedStyles.getPropertyValue(property) || (computedStyles as any)[property];
  if (val) return val;

  // Resolve Shorthands
  if (property === 'padding') {
    return `${computedStyles.paddingTop} ${computedStyles.paddingRight} ${computedStyles.paddingBottom} ${computedStyles.paddingLeft}`;
  }
  if (property === 'margin') {
    return `${computedStyles.marginTop} ${computedStyles.marginRight} ${computedStyles.marginBottom} ${computedStyles.marginLeft}`;
  }
  if (property === 'border') {
    return `${computedStyles.borderTopWidth || computedStyles.borderWidth} ${computedStyles.borderTopStyle || computedStyles.borderStyle} ${computedStyles.borderTopColor || computedStyles.borderColor}`;
  }
  if (property === 'border-radius') {
    return `${computedStyles.borderTopLeftRadius} ${computedStyles.borderTopRightRadius} ${computedStyles.borderBottomRightRadius} ${computedStyles.borderBottomLeftRadius}`;
  }
  
  return '';
}

/**
 * Scrapes the DOM comparing existing live elements to their required standard specification.
 * 
 * @param standards - The array of ComponentStandards mapping properties to rules
 * @returns Array of precise ValidationResults constructed via the comparison matrix
 */
function runAudit(standards: ComponentStandard[]): ValidationResult[] {
  const startTime = performance.now();
  const evaluationResults: ValidationResult[] = [];

  for (const standard of standards) {
    let elements: NodeListOf<Element>;

    try {
      elements = document.querySelectorAll(standard.selector);
    } catch (err) {
      console.warn(`Scanner: Invalid selector encountered -> ${standard.selector}`);
      continue;
    }

    if (elements.length === 0) continue;

    // Batching loop mapping: Read-only phase evaluating live computed constraints
    elements.forEach((element, index) => {
      const computedStyles = window.getComputedStyle(element);
      const propertyResults: PropertyResult[] = [];

      const propertiesToTest = Object.keys(standard.styles);

      for (const property of propertiesToTest) {
        const rule = standard.styles[property];
        if (!rule || rule.expectedValue == null) continue;

        const actualValue = getResolvedStyle(computedStyles, property);

        const passed = isStyleMatch(actualValue, rule.expectedValue, property);

        propertyResults.push({
          property,
          expected: rule.expectedValue,
          actual: actualValue,
          passed,
          severity: rule.severity,
        });
      }

      // Compute Weighted Severity calculation ratio
      const calculatedScore = calculateComponentScore(propertyResults);

      // Generate a unique identifier for the elementSelector instance
      const uniqueSelector = `${standard.selector}[${index}]`;

      evaluationResults.push({
        elementSelector: uniqueSelector,
        componentName: standard.name,
        results: propertyResults,
        score: calculatedScore,
      });
    });
  }

  const endTime = performance.now();
  console.log(`UI Scanner complete. Full DOM audit performed in ${(endTime - startTime).toFixed(2)}ms.`);

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
        console.log('Received START_SCAN payload initiating the DOM engine...');
        const auditFindings = runAudit(request.standards);
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

