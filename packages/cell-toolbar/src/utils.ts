/**
 * Get the value of a CSS variable
 *
 * @param name CSS variable name
 * @returns The CSS variable value
 */
export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
