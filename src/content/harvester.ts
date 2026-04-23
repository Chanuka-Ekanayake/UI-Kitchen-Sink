import { ComponentBlock, StyleRule } from '../shared/types';

/**
 * Parses the DOM to find structurally significant UI elements,
 * extracting their computed CSS into a standardized ComponentBlock format.
 */
export function harvestActivePage(): ComponentBlock[] {
  const elements = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
  const harvested: ComponentBlock[] = [];
  
  // Rule 1: Always capture these structural inputs/buttons
  const alwaysCapture = ['BUTTON', 'INPUT', 'SELECT', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL'];
  // Rule 2: Capture these ONLY if they have a class or ID
  const conditionalCapture = ['DIV', 'SPAN'];

  // Set of properties to extract explicitly
  const propertiesToExtract = [
    'background-color',
    'color',
    'font-size',
    'font-weight',
    'border',
    'border-radius',
    'padding',
    'margin'
  ];

  for (const el of elements) {
    const tag = el.tagName.toUpperCase();
    let shouldCapture = false;

    if (alwaysCapture.includes(tag)) {
      shouldCapture = true;
    } else if (conditionalCapture.includes(tag)) {
      if (el.id || el.classList.length > 0) {
        shouldCapture = true;
      }
    }

    if (!shouldCapture) continue;

    // Filter out hidden elements to avoid scraping layout ghost tags
    const computed = window.getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden') {
      continue;
    }

    // Extract styles
    const rules: StyleRule[] = [];
    propertiesToExtract.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
        rules.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(),
          property: prop,
          value: val,
          severity: 'error',
          state: 'default'
        });
      }
    });

    if (rules.length === 0) continue; // Skip if it literally has no stylings

    // Auto-name generation
    const cssClass = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const cssId = el.id ? `#${el.id}` : '';
    const primarySelector = cssClass || cssId;
    const name = primarySelector ? `${tag} ${primarySelector}` : `${tag} Element`;

    harvested.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(),
      name,
      htmlTag: tag.toLowerCase(),
      cssClass: cssClass.replace('.', ''),
      cssId: cssId.replace('#', ''),
      isEnabled: true,
      styleRules: rules
    });
  }

  // Deduplicate on identical tags+classes so we don't send 100 copies of .branded-button
  const uniqueMap = new Map<string, ComponentBlock>();
  for (const comp of harvested) {
    const key = `${comp.htmlTag}|${comp.cssClass}|${comp.cssId}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, comp);
    }
  }

  return Array.from(uniqueMap.values());
}
