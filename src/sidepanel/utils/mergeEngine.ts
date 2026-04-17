import { ComponentBlock, Profile } from '../../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MergeResolution = 'KEEP_ORIGINAL' | 'KEEP_NEW' | 'KEEP_BOTH';
export type MergeMode = 'NEW' | 'APPEND';

export interface ConflictItem {
  existing: ComponentBlock;
  incoming: ComponentBlock;
}

export interface MergeConflict {
  /** Unique key for React rendering */
  id: string;
  existing: ComponentBlock;
  incoming: ComponentBlock;
}

export interface MergeSummary {
  addedCount: number;
  skippedCount: number;
  conflictsResolved: number;
  finalComponents: ComponentBlock[];
}

// ─── Unique Name Resolver ─────────────────────────────────────────────────────

/**
 * Ensures `baseName` is unique within `existingNames`.
 * Appends " 2", " 3", … until a free slot is found.
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) return baseName;
  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter++;
  }
  return `${baseName} ${counter}`;
}

// ─── Deep Component Comparison ────────────────────────────────────────────────

function selectorOf(c: ComponentBlock): string {
  return `${c.htmlTag}|${c.cssClass}|${c.cssId}`;
}

function stylesEqual(a: ComponentBlock, b: ComponentBlock): boolean {
  if (a.styleRules.length !== b.styleRules.length) return false;
  return a.styleRules.every((ra, i) => {
    const rb = b.styleRules[i];
    return (
      ra.property.trim() === rb.property.trim() &&
      ra.value.trim() === rb.value.trim() &&
      ra.state === rb.state &&
      ra.severity === rb.severity
    );
  });
}

export type ComparisonResult = 'EXACT_DUPLICATE' | 'SELECTOR_CONFLICT' | 'NO_MATCH';

/**
 * Compares an incoming component against an existing one.
 *
 * - EXACT_DUPLICATE      → same selector + same styles  → auto-skip
 * - SELECTOR_CONFLICT    → same selector + diff styles  → prompt user
 * - NO_MATCH             → different selector            → safe to add
 */
export function compareComponents(
  existing: ComponentBlock,
  incoming: ComponentBlock
): ComparisonResult {
  if (selectorOf(existing) !== selectorOf(incoming)) return 'NO_MATCH';
  return stylesEqual(existing, incoming) ? 'EXACT_DUPLICATE' : 'SELECTOR_CONFLICT';
}

// ─── Merge Engine ─────────────────────────────────────────────────────────────

export interface ProcessImportOptions {
  importedProfile: Profile;
  existingProfiles: Profile[];
  targetProfileId: string | null;   // used only in APPEND mode
  mode: MergeMode;
  /** Resolutions provided by the user for each conflict (keyed by conflict.id) */
  resolutions?: Record<string, MergeResolution>;
}

export interface ProcessImportResult {
  /** The final list of profiles to write back to state */
  updatedProfiles: Profile[];
  /** ID to switch the active profile to */
  newActiveProfileId: string;
  /** Unresolved conflicts that still need user input */
  pendingConflicts: MergeConflict[];
  summary: MergeSummary;
}

/**
 * The merge orchestrator.
 *
 * Call once without `resolutions` to get `pendingConflicts`.
 * Once the user resolves them, call again with `resolutions` filled in.
 */
export function processImport(opts: ProcessImportOptions): ProcessImportResult {
  const { importedProfile, existingProfiles, targetProfileId, mode, resolutions = {} } = opts;

  // ── NEW MODE ────────────────────────────────────────────────────────────────
  if (mode === 'NEW') {
    const existingNames = existingProfiles.map(p => p.name);
    const uniqueName = generateUniqueName(importedProfile.name, existingNames);

    const freshProfile: Profile = {
      ...importedProfile,
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      name: uniqueName,
      // Give every component a fresh ID too so they never collide with any profile
      components: importedProfile.components.map(c => ({
        ...c,
        id: crypto.randomUUID?.() ?? Date.now().toString(),
      })),
    };

    return {
      updatedProfiles: [...existingProfiles, freshProfile],
      newActiveProfileId: freshProfile.id,
      pendingConflicts: [],
      summary: {
        addedCount: freshProfile.components.length,
        skippedCount: 0,
        conflictsResolved: 0,
        finalComponents: freshProfile.components,
      },
    };
  }

  // ── APPEND MODE ─────────────────────────────────────────────────────────────
  const targetProfile = existingProfiles.find(p => p.id === targetProfileId);
  if (!targetProfile) {
    // Fallback: treat as NEW if target doesn't exist
    return processImport({ ...opts, mode: 'NEW' });
  }

  let addedCount = 0;
  let skippedCount = 0;
  let conflictsResolved = 0;
  const pendingConflicts: MergeConflict[] = [];
  const mergedComponents: ComponentBlock[] = [...targetProfile.components];

  for (const incoming of importedProfile.components) {
    // Check against all existing components in the target
    let outcome: ComparisonResult = 'NO_MATCH';
    let conflictingExisting: ComponentBlock | null = null;

    for (const existing of targetProfile.components) {
      const cmp = compareComponents(existing, incoming);
      if (cmp === 'EXACT_DUPLICATE') {
        outcome = 'EXACT_DUPLICATE';
        break;
      }
      if (cmp === 'SELECTOR_CONFLICT') {
        outcome = 'SELECTOR_CONFLICT';
        conflictingExisting = existing;
        break;
      }
    }

    if (outcome === 'EXACT_DUPLICATE') {
      skippedCount++;
      continue;
    }

    if (outcome === 'SELECTOR_CONFLICT' && conflictingExisting) {
      const conflictId = `${conflictingExisting.id}__${incoming.id}`;
      const resolution = resolutions[conflictId];

      if (!resolution) {
        // No resolution yet – register as pending and move on
        pendingConflicts.push({ id: conflictId, existing: conflictingExisting, incoming });
        continue;
      }

      // Apply resolution
      if (resolution === 'KEEP_ORIGINAL') {
        skippedCount++;
        conflictsResolved++;
        continue;
      }

      if (resolution === 'KEEP_NEW') {
        const idx = mergedComponents.findIndex(c => c.id === conflictingExisting!.id);
        if (idx !== -1) {
          mergedComponents[idx] = {
            ...conflictingExisting,
            styleRules: incoming.styleRules,
          };
        }
        conflictsResolved++;
        continue;
      }

      if (resolution === 'KEEP_BOTH') {
        const existingNames = mergedComponents.map(c => c.name);
        const uniqueName = generateUniqueName(incoming.name, existingNames);
        const freshComp: ComponentBlock = {
          ...incoming,
          id: crypto.randomUUID?.() ?? Date.now().toString(),
          name: uniqueName,
        };
        mergedComponents.push(freshComp);
        addedCount++;
        conflictsResolved++;
        continue;
      }
    }

    // NO_MATCH — safe add (with name dedup)
    const existingNames = mergedComponents.map(c => c.name);
    const uniqueName = generateUniqueName(incoming.name, existingNames);
    const freshComp: ComponentBlock = {
      ...incoming,
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      name: uniqueName,
    };
    mergedComponents.push(freshComp);
    addedCount++;
  }

  const updatedTarget: Profile = { ...targetProfile, components: mergedComponents };
  const updatedProfiles = existingProfiles.map(p =>
    p.id === targetProfileId ? updatedTarget : p
  );

  return {
    updatedProfiles,
    newActiveProfileId: targetProfile.id,
    pendingConflicts,
    summary: {
      addedCount,
      skippedCount,
      conflictsResolved,
      finalComponents: mergedComponents,
    },
  };
}
