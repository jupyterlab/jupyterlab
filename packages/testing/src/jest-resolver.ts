/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
// ws workaround suggested in https://github.com/websockets/ws/issues/2171#issuecomment-1792147402
// Mentioned solution license is:
//    Copyright (c) Microsoft Corporation. All rights reserved.
//    Licensed under the MIT License.

type IResolverPackage = {
  name?: string;
  exports?: Record<string, unknown>;
  [key: string]: unknown;
};

type IResolverOptions = {
  defaultResolver: (
    path: string,
    options: IResolverOptions & {
      packageFilter?: (pkg: IResolverPackage) => IResolverPackage;
    }
  ) => string;
  [key: string]: unknown;
};

module.exports = (path: string, options: IResolverOptions) => {
  // Call the defaultResolver, so we leverage its cache, error handling, etc.
  return options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg: IResolverPackage) => {
      // This is a workaround for https://github.com/websockets/ws/pull/2118
      if (pkg.name === 'ws') {
        delete (pkg as { exports: { '.': Record<string, unknown> } }).exports[
          '.'
        ].browser;
      }
      return pkg;
    }
  });
};
