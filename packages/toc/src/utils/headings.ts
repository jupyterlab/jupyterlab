// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Tests whether a heading is a notebook heading.
 *
 * @param heading - heading to test
 * @returns boolean indicating whether a heading is a notebook heading
 */
export function isNotebookHeading(heading: any): boolean {
  return heading.type !== undefined && heading.cellRef !== undefined;
}
