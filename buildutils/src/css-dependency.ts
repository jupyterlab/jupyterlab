/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import fs = require('fs-extra');

/**
 * Get the name of the packages imported by a file.
 */
export function getCssPackageImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cssImportRe = /\@import url\('~([^']+)'\);/gm;
    const deps = [];
    while (true) {
      const match = cssImportRe.exec(content);
      if (match === null) {
        break;
      }
      deps.push(match[1]);
    }
    return deps;
  } catch {
    return [];
  }
}

/**
 * Get the CSS dependencies of a file as a list of package names (without the scope).
 */
export function getCssDependencies(filePath: string): string[] {
  return getCssPackageImports(filePath).reduce((pkgs, m) => {
    let slashSearchStart = 0;
    if (m[0] === '@') {
      slashSearchStart = m.indexOf('/') + 1;
    }
    const pkg = m.slice(0, m.indexOf('/', slashSearchStart));
    if (pkgs.indexOf(pkg) === -1) {
      pkgs.push(pkg);
    }
    return pkgs;
  }, []);
}
