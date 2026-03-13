/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// ws workaround suggested in https://github.com/websockets/ws/issues/2171#issuecomment-1792147402
// Mentioned solution license is:
//    Copyright (c) Microsoft Corporation. All rights reserved.
//    Licensed under the MIT License.

module.exports = (path: string, options: any) => {
  // Call the defaultResolver, so we leverage its cache, error handling, etc.
  return options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg: any) => {
      // This is a workaround for https://github.com/websockets/ws/pull/2118
      if (pkg.name === 'ws') {
        delete pkg['exports']['.']['browser'];
      }
      return pkg;
    }
  });
};
