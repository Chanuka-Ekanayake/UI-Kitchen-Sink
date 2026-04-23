import { Profile, ComponentBlock, StyleRule } from '../../shared/types';

// ─── Interchange Schema ────────────────────────────────────────────────────────

export const SCHEMA_VERSION = '1.0';

export interface ExportedProfile {
  schemaVersion: string;
  exportedAt: string;
  profile: Profile;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidStyleRule(r: any): r is StyleRule {
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.id === 'string' &&
    typeof r.property === 'string' &&
    typeof r.value === 'string' &&
    (r.severity === 'error' || r.severity === 'warning') &&
    typeof r.state === 'string'
  );
}

function isValidComponentBlock(c: any): c is ComponentBlock {
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.htmlTag === 'string' &&
    typeof c.cssClass === 'string' &&
    typeof c.cssId === 'string' &&
    typeof c.isEnabled === 'boolean' &&
    Array.isArray(c.styleRules) &&
    c.styleRules.every(isValidStyleRule)
  );
}

/**
 * Validates the parsed JSON object against the Profile interchange schema.
 * Throws a user-friendly error if invalid.
 */
function validateImportedData(data: any): ExportedProfile {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid Profile Format: file is not a JSON object.');
  }

  // Accept both the wrapped ExportedProfile format AND a raw Profile object
  // for maximum compatibility with hand-crafted files.
  let profile: any;

  if ('profile' in data && 'schemaVersion' in data) {
    // Full ExportedProfile wrapper
    profile = data.profile;
  } else if ('name' in data && 'components' in data) {
    // Raw Profile object – wrap it
    profile = data;
  } else {
    throw new Error(
      'Invalid Profile Format: missing required fields "name" and "components".'
    );
  }

  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    throw new Error('Invalid Profile Format: "name" must be a non-empty string.');
  }

  if (!Array.isArray(profile.components)) {
    throw new Error('Invalid Profile Format: "components" must be an array.');
  }

  // Patch any missing fields for forward-compat when loading older exports
  const patchedComponents: ComponentBlock[] = profile.components.map((c: any, i: number) => {
    if (typeof c !== 'object' || c === null) {
      throw new Error(`Invalid Profile Format: component at index ${i} is not an object.`);
    }
    return {
      id: c.id ?? crypto.randomUUID?.() ?? Date.now().toString(),
      name: c.name ?? '',
      htmlTag: c.htmlTag ?? '',
      cssClass: c.cssClass ?? '',
      cssId: c.cssId ?? '',
      isEnabled: c.isEnabled ?? true,
      styleRules: Array.isArray(c.styleRules)
        ? c.styleRules.map((r: any) => ({
          id: r.id ?? crypto.randomUUID?.() ?? Date.now().toString(),
          property: r.property ?? '',
          value: r.value ?? r.expectedValue ?? '',
          severity: r.severity ?? 'error',
          state: r.state ?? 'default',
        }))
        : [],
    };
  });

  const validatedProfile: Profile = {
    id: profile.id ?? crypto.randomUUID?.() ?? Date.now().toString(),
    name: profile.name.trim(),
    components: patchedComponents,
  };

  return {
    schemaVersion: data.schemaVersion ?? SCHEMA_VERSION,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    profile: validatedProfile,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serializes a Profile to a formatted JSON file and triggers a browser download.
 */
export function exportProfile(profile: Profile): void {
  const payload: ExportedProfile = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const safeName = profile.name.replace(/[^a-z0-9_\- ]/gi, '_').trim();
  const filename = `${safeName}_Export_${dateStr}.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke the object URL after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export type ImportMode = 'add-as-new' | 'merge';

export interface ImportResult {
  profile: Profile;
  mode: ImportMode;
}

/**
 * Reads a .json File using the FileReader API, validates it, and resolves with
 * the validated Profile ready to be inserted into state.
 */
export function handleImportFile(
  file: File,
  mode: ImportMode = 'add-as-new'
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      reject(new Error('Invalid File Type: please select a .json file.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Invalid Profile Format: could not read file contents.');
        }

        const parsed = JSON.parse(text);
        const validated = validateImportedData(parsed);

        // Always assign a fresh ID so imported profiles never collide with existing ones
        const freshProfile: Profile = {
          ...validated.profile,
          id: crypto.randomUUID?.() ?? Date.now().toString(),
        };

        resolve({ profile: freshProfile, mode });
      } catch (err: any) {
        if (err instanceof SyntaxError) {
          reject(new Error('Invalid Profile Format: file is not valid JSON.'));
        } else {
          reject(err);
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('File read error: could not open the selected file.'));
    };

    reader.readAsText(file);
  });
}

/**
 * Placeholder for the future merge workflow (ST-6.1.B).
 * Currently logs the incoming data and returns it unchanged.
 */
export function initiateMerge(importedProfile: Profile): Profile {
  // TODO: implement conflict-resolution UI in ST-6.1.B
  return importedProfile;
}
