import { z } from 'zod';

export const UIPropertyRuleSchema = z.object({
  expectedValue: z.string(),
  description: z.string().optional(),
  severity: z.enum(['error', 'warning']),
});

export type UIPropertyRule = z.infer<typeof UIPropertyRuleSchema>;

export const ComponentStandardSchema = z.object({
  id: z.string(),
  name: z.string(),
  selector: z.string(),
  styles: z.record(z.string(), UIPropertyRuleSchema),
});

export type ComponentStandard = z.infer<typeof ComponentStandardSchema>;

export const MOCK_STANDARDS: ComponentStandard[] = [
  {
    id: 'primary-button-standard',
    name: 'Primary Button',
    selector: 'button.btn-primary',
    styles: {
      'background-color': {
        expectedValue: 'rgb(0, 128, 0)',
        severity: 'error',
      },
      'border-radius': {
        expectedValue: '5px',
        severity: 'warning',
      },
      'padding': {
        expectedValue: '10px 20px',
        severity: 'error',
      },
    },
  },
  {
    id: 'main-heading-standard',
    name: 'Main Heading',
    selector: 'h1',
    styles: {
      'font-size': {
        expectedValue: '32px',
        severity: 'error',
      },
      'color': {
        expectedValue: 'oklch(0.21 0.034 264.665)',
        severity: 'warning',
      },
    },
  },
];
