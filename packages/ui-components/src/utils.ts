// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export function combineClassNames(...classNames: (string | undefined)[]) {
  return classNames.join(' ');
}
