import { ValidationResult, PropertyResult, ScannerMessage } from '../shared/types';
import { ComponentStandard } from '../shared/schema';
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

chrome.runtime.onMessage.addListener(
  (request: ScannerMessage, sender, sendResponse: (response: ValidationResult[]) => void) => {
    if (request.action === 'START_SCAN') {
      console.log('Received START_SCAN payload initiating the DOM engine...');

      // Block execution sequence resolving DOM trees actively
      const auditFindings = runAudit(request.standards);

      // Async Handshake resolution back to the Sidepanel
      sendResponse(auditFindings);

      return true; // Keeps the message channel open for the async handshake paradigm
    }
  }
);

export { };

