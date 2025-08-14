// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Text } from '@jupyterlab/coreutils';

/**
 * Inner works of class combining functions
 */
function _classes(
  classes: (string | false | undefined | null | { [className: string]: any })[]
): string[] {
  return classes
    .map(c =>
      c && typeof c === 'object'
        ? Object.keys(c).map(key => !!c[key] && key)
        : typeof c === 'string'
        ? c.split(/\s+/)
        : []
    )
    .reduce((flattened, c) => flattened.concat(c), [] as string[])
    .filter(c => !!c) as string[];
}

/**
 * Combines classNames.
 *
 * @param classes - A list of classNames
 *
 * @returns A single string with the combined className
 */
export function classes(
  ...classes: (
    | string
    | false
    | undefined
    | null
    | { [className: string]: any }
  )[]
): string {
  return _classes(classes).join(' ');
}

/**
 * Combines classNames. Removes all duplicates
 *
 * @param classes - A list of classNames
 *
 * @returns A single string with the combined className
 */
export function classesDedupe(
  ...classes: (
    | string
    | false
    | undefined
    | null
    | { [className: string]: any }
  )[]
): string {
  return [...new Set(_classes(classes))].join(' ');
}

/**
 * Translates the attributes of a DOM element into attributes that can
 * be understood by React. Currently not comprehensive, we will add special
 * cases as they become relevant.
 *
 * @param elem - A DOM element
 *
 * @param ignore - An optional list of attribute names to ignore
 *
 * @returns An object with key:value pairs that are the React-friendly
 * translation of elem's attributes
 */
export function getReactAttrs(
  elem: Element,
  { ignore = [] }: { ignore?: string[] } = {}
): { [key: string]: string | null } {
  return elem
    .getAttributeNames()
    .reduce<{ [key: string]: string | null }>((d, name) => {
      if (name === 'style' || ignore.includes(name)) {
        void 0;
      } else if (name.startsWith('data') || name.startsWith('aria')) {
        d[name] = elem.getAttribute(name);
      } else {
        d[Text.camelCase(name)] = elem.getAttribute(name);
      }
      return d;
    }, {});
}

// Toolkit helpers

/**
 * Test whether an object is a tree item or not.
 * @param el Element to test
 * @returns Result
 */
function isTreeItemElement(el: HTMLElement | null): boolean {
  return el instanceof HTMLElement && el.getAttribute('role') === 'treeitem';
}

/**
 * Find the tree item encapsulating the element.
 *
 * @param el Starting element
 * @returns The tree item
 */
export function getTreeItemElement(el: HTMLElement): HTMLElement | null {
  let item = el as HTMLElement | null;
  while (item && !isTreeItemElement(item)) {
    item = item.parentElement;
  }

  return isTreeItemElement(item) ? item : null;
}
