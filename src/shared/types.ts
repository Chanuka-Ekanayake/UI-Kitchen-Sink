import { ComponentStandard } from './schema';

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
  | { action: 'HIGHLIGHT_ELEMENT'; payload: { selector: string } }
  | { action: 'RELAY_HIGHLIGHT'; payload: { selector: string } }
  | { action: 'CLEAR_HIGHLIGHT' };
