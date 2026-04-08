import { ValidationResult, PropertyResult, ScannerMessage } from '../shared/types';
import { ComponentStandard } from '../shared/schema';
import { isStyleMatch } from '../shared/normalizer';

(window as any).__UI_VALIDATOR_LOADED__ = true;
console.log('UI Validator Content Script Loaded');
console.log('Content script loaded on', window.location.href);

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
      let passedCount = 0;

      const propertiesToTest = Object.keys(standard.styles);
      const totalProperties = propertiesToTest.length;

      for (const property of propertiesToTest) {
        const rule = standard.styles[property];
        const actualValue = computedStyles.getPropertyValue(property) || '';

        const passed = isStyleMatch(actualValue, rule.expectedValue, property);

        if (passed) {
          passedCount++;
        }

        propertyResults.push({
          property,
          expected: rule.expectedValue,
          actual: actualValue,
          passed,
          severity: rule.severity,
        });
      }

      // Calculate an individual Component Score for each element based on the ratio
      const calculatedScore = totalProperties > 0 ? Math.round((passedCount / totalProperties) * 100) : 100;

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

