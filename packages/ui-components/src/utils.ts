// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export function combineClasses(...classNames: (string | undefined)[]) {
  return classNames.filter(c => !!c).join(' ');
}
