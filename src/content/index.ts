import { ValidationResult, PropertyResult, ScannerMessage } from '../shared/types';
import { ComponentStandard } from '../shared/schema';
import { isStyleMatch } from '../shared/normalizer';

console.log('UI Validator Core active on:', window.location.href);

/**
 * Executes a full UI standardization audit against the live DOM.
 * Built with purely read-only functional boundaries to prevent layout thrashing and maintain 60fps performance tracking.
 * 
 * @param standards The array of ComponentStandards determining rules logic
 * @returns Array of precise ValidationResult components
 */
function runAudit(standards: ComponentStandard[]): ValidationResult[] {
  const startTime = performance.now();
  const results: ValidationResult[] = [];

  for (const standard of standards) {
    let elements: NodeListOf<Element>;
    
    try {
      // Selector phase bounds explicitly trapped 
      elements = document.querySelectorAll(standard.selector);
    } catch (e) {
      console.warn(`[UI Validator] Invalid selector trapped/skipped: ${standard.selector}`);
      continue;
    }

    // Gracefully bypass if targets are missing from standard compliance requirements
    if (elements.length === 0) {
      continue;
    }

    elements.forEach((element, index) => {
      // Lock extraction to the specific element context
      const el = element as Element;
      
      // 1. Batch Extraction & Access Simulation (Read-Only)
      const computedStyles = window.getComputedStyle(el);
      
      // 2. Compute Style Evaluation Logic per Standard Definition
      const propertyResults: PropertyResult[] = [];
      let passedCount = 0;
      const definedProperties = Object.keys(standard.styles);
      const totalProps = definedProperties.length;

      for (const propName of definedProperties) {
        const rule = standard.styles[propName];
        
        // CSS Property Lookup string retrieval directly from browser tree
        const actualValue = computedStyles.getPropertyValue(propName);
        const expectedValue = rule.expectedValue;
        
        // Dynamic Normalization Branch matching
        const passed = isStyleMatch(actualValue, expectedValue, propName);
        
        if (passed) {
          passedCount++;
        }

        propertyResults.push({
          property: propName,
          expected: expectedValue,
          actual: actualValue,
          passed: passed,
          severity: rule.severity
        });
      }

      // 3. Mathematical Grade Compilation out of 100 scaling
      const score = totalProps > 0 ? Math.round((passedCount / totalProps) * 100) : 100;
      
      // Assemble and push final identity metadata mapped mapping securely attached node coordinates
      results.push({
        elementSelector: `${standard.selector} [Instance ${index + 1}]`,
        componentName: standard.name,
        results: propertyResults,
        score: score
      });
    });
  }

  // 4. Performance Audit Logging Hook ensuring transparent metric feedback loops
  const endTime = performance.now();
  console.log(`[UI Validator] Real-time DOM Extraction cycle complete: ${(endTime - startTime).toFixed(3)}ms. Evaluated ${results.length} unique nodes.`);

  return results;
}

chrome.runtime.onMessage.addListener(
  (request: ScannerMessage, sender, sendResponse: (response: ValidationResult[]) => void) => {
    if (request.action === 'START_SCAN') {
      console.log('Sidepanel invoked extraction target constraint logic...');
      
      try {
        // Execute primary runAudit synchronous phase
        const auditResults = runAudit(request.standards);
        // Safely transmit resulting evaluation
        sendResponse(auditResults);
      } catch (error) {
        console.error('[UI Validator] Critical failure during extraction execution phase:', error);
      }
      
      // Maintain architectural open message connection bridging
      return true;
    }
  }
);

export {};
