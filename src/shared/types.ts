import { ComponentStandard } from './schema';

export interface ComponentBlock {
  id: string;
  name: string;
  htmlTag: string;
  cssClass: string;
  cssId: string;
}

export interface PropertyResult {
  property: string;
  expected: string;
  actual: string;
  passed: boolean;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  elementSelector: string;
  componentName: string;
  results: PropertyResult[];
  score: number;
}

export type ScannerMessage =
  | { action: 'START_SCAN'; standards: ComponentStandard[] }
  | { action: 'HIGHLIGHT_ELEMENT'; payload: { selector: string; isPassed: boolean } }
  | { action: 'RELAY_HIGHLIGHT'; payload: { selector: string; isPassed: boolean } }
  | { action: 'RELAY_CLEAR' }
  | { action: 'CLEAR_HIGHLIGHT' };
