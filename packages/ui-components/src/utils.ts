// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export function combineClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(c => !!c).join(' ');
}

export function camelize(str: string, upper: boolean = false): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+|-+)/g, function(match, index) {
    if (+match === 0 || match[0] === '-') {
      return '';
    } else if (index === 0 && !upper) {
      return match.toLowerCase();
    } else {
      return match.toUpperCase();
    }
  });
}
