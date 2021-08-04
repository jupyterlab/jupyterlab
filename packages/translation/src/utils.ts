/**
 * Normalize domain
 *
 * @param domain Domain to normalize
 * @returns Normalized domain
 */
export function normalizeDomain(domain: string): string {
  return domain.replace('-', '_');
}
