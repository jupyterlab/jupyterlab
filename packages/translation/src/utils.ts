/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Normalize domain
 *
 * @param domain Domain to normalize
 * @returns Normalized domain
 */
export function normalizeDomain(domain: string): string {
  return domain.replace('-', '_');
}
