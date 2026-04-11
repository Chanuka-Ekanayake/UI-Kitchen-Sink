export interface UIPropertyRule {
  property: string;
  expectedValue: string;
  severity: 'error' | 'warning';
  state: 'default' | 'hover' | 'active' | 'focus' | 'visited';
}

export interface ComponentStandard {
  id: string;
  name: string;
  selector: string;
  styles: UIPropertyRule[];
}

export interface StyleRule {
  id: string;
  property: string;
  value: string;
  severity: 'error' | 'warning';
  state: 'default' | 'hover' | 'active' | 'focus' | 'visited';
}

export interface ComponentBlock {
  id: string;
  name: string;
  htmlTag: string;
  cssClass: string;
  cssId: string;
  styleRules: StyleRule[];
}

export interface PropertyResult {
  property: string;
  expected: string;
  actual: string;
  passed: boolean;
  severity: 'error' | 'warning';
  state: 'default' | 'hover' | 'active' | 'focus' | 'visited';
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
