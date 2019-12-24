// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Text } from '@jupyterlab/coreutils';

export function combineClasses(
  ...classNames: (string | false | undefined | null)[]
) {
  return classNames.filter(c => !!c).join(' ');
}

export function getReactAttrs(elem: Element) {
  return elem.getAttributeNames().reduce((d, name) => {
    if (name !== 'style') {
      d[Text.camelCase(name)] = elem.getAttribute(name);
    }
    return d;
  }, {} as any);
}
