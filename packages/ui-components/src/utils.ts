// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Text } from '@jupyterlab/coreutils';

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

export function getReactAttrs(elem: Element) {
  return elem.getAttributeNames().reduce((d, name) => {
    if (name !== 'style') {
      d[Text.camelCase(name)] = elem.getAttribute(name);
    }
    return d;
  }, {} as any);
}
