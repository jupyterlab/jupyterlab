// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Text } from '@jupyterlab/coreutils';

export function combineClasses(...classNames: (string | undefined)[]) {
  return classNames.filter(c => !!c).join(' ');
}

export function domAttrToReact(attr: string) {
  return Text.camelCase(attr).replace(':', '');
}
