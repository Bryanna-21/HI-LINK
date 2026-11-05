/**
 * Stable, collision-resistant local IDs.
 *
 * IDs are generated on-device so records can be created offline and later
 * synchronised without renumbering. The random suffix avoids collisions when
 * two records are created in the same millisecond.
 */
export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const random2 = Math.random().toString(36).slice(2, 6);

  return `${prefix}-${Date.now().toString(36)}-${random}${random2}`;
}

export const nowIso = (): string => new Date().toISOString();
