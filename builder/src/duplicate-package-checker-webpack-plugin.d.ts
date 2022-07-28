/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Type definitions for duplicate-package-checker-webpack-plugin 2.1
// Project: https://github.com/darrenscerri/duplicate-package-checker-webpack-plugin#readme
// Definitions by: Matt Traynham <https://github.com/mtraynham>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

// Modified to work with Webpack 5 typings by Jason Grout <https://github.com/jasongrout>

/* eslint-disable @typescript-eslint/naming-convention */

// Once to get a typed module first.
declare module 'duplicate-package-checker-webpack-plugin';

// Then we expand the definition with the things we use.
declare module 'duplicate-package-checker-webpack-plugin' {
  import * as webpack from 'webpack';

  export = DuplicatePackageCheckerWebpackPlugin;

  class DuplicatePackageCheckerWebpackPlugin {
    constructor(options?: DuplicatePackageCheckerWebpackPlugin.Options);
    apply(compiler: webpack.Compiler): void;
  }

  namespace DuplicatePackageCheckerWebpackPlugin {
    /** The properties of the instance of a package */
    interface PackageInstanceProperties {
      /** The name of the package */
      name: string;
      /** The version of the package */
      version: string;
      /** Absolute path to the package */
      path: string;
      /** Absolute path to the module that requested the package */
      issuer?: string;
    }

    /** The configurable options for the plugin */
    interface Options {
      /** Also show module that is requiring each duplicate package (default: false) */
      verbose?: boolean;
      /** Emit errors instead of warnings (default: false) */
      emitError?: boolean;
      /** Show help message if duplicate packages are found (default: true) */
      showHelp?: boolean;
      /** Warn also if major versions differ (default: true) */
      strict?: boolean;

      /**
       * Exclude instances of packages from the results.
       * If all instances of a package are excluded, or all instances except one,
       * then the package is no longer considered duplicated and won't be emitted as a warning/error.
       * @param instance The instance of a package being evaluated for exclusion.
       * @returns true to exclude the instance, false otherwise
       */
      exclude?: (instance: PackageInstanceProperties) => boolean;
    }
  }
}
