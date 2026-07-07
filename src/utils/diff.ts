/**
 * Diff Utility
 * Phase 3: Simple field-by-field object comparison
 */
import type { ConfigDiffLine } from '@/types/configTemplate';

/**
 * Compare two config objects and return a list of differences.
 * - Keys only in `a` → type: 'removed'
 * - Keys only in `b` → type: 'added'
 * - Keys in both but values differ → type: 'changed'
 */
export function diffConfigs(a: Record<string, any>, b: Record<string, any>): ConfigDiffLine[] {
  const result: ConfigDiffLine[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const aVal = a[key];
    const bVal = b[key];

    if (!(key in b)) {
      // Key removed (only in a)
      result.push({ key, type: 'removed', oldValue: aVal });
    } else if (!(key in a)) {
      // Key added (only in b)
      result.push({ key, type: 'added', newValue: bVal });
    } else if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      // Changed
      result.push({ key, type: 'changed', oldValue: aVal, newValue: bVal });
    }
  }

  return result;
}
