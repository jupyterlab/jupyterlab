/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import DuplicatePackageCheckerPlugin from 'duplicate-package-checker-webpack-plugin';
import * as fs from 'fs-extra';
import * as webpack from 'webpack';
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { LicenseIdentifiedModule } from 'license-webpack-plugin/dist/LicenseIdentifiedModule';
import { PluginOptions } from 'license-webpack-plugin/dist/PluginOptions';

// From
// https://github.com/webpack/webpack/blob/95120bdf98a01649740b104bebc426b0123651ce/lib/WatchIgnorePlugin.js
const IGNORE_TIME_ENTRY = 'ignore';

export namespace WPPlugin {
  /**
   * A WebPack Plugin that copies the assets to the static directory
   */
  export class FrontEndPlugin {
    constructor(buildDir: string, staticDir: string) {
      this.buildDir = buildDir;
      this.staticDir = staticDir;

      this._first = true;
    }

    apply(compiler: webpack.Compiler): void {
      compiler.hooks.afterEmit.tap('FrontEndPlugin', () => {
        // bail if no staticDir
        if (!this.staticDir) {
          return;
        }

        // ensure a clean static directory on the first emit
        if (this._first && fs.existsSync(this.staticDir)) {
          fs.removeSync(this.staticDir);
        }
        this._first = false;

        fs.copySync(this.buildDir, this.staticDir);
      });
    }

    buildDir: string;
    staticDir: string;

    private _first: boolean;
  }

  /**
   * A helper class for the WatchIgnoreFilterPlugin. This is a close copy of
   * (the non-exported) webpack.IgnoringWatchFileSystem
   */
  class FilterIgnoringWatchFileSystem {
    constructor(wfs: any, ignored: (path: string) => boolean) {
      this.wfs = wfs;

      // ignored should be a callback function that filters the build files
      this.ignored = ignored;
    }

    watch(
      files: any,
      dirs: any,
      missing: any,
      startTime: any,
      options: any,
      callback: any,
      callbackUndelayed: any
    ) {
      files = Array.from(files);
      dirs = Array.from(dirs);
      const notIgnored = (path: string) => !this.ignored(path);
      const ignoredFiles = files.filter(this.ignored);
      const ignoredDirs = dirs.filter(this.ignored);

      const watcher = this.wfs.watch(
        files.filter(notIgnored),
        dirs.filter(notIgnored),
        missing,
        startTime,
        options,
        (
          err: any,
          fileTimestamps: any,
          dirTimestamps: any,
          changedFiles: any,
          removedFiles: any
        ) => {
          if (err) return callback(err);
          for (const path of ignoredFiles) {
            fileTimestamps.set(path, IGNORE_TIME_ENTRY);
          }

          for (const path of ignoredDirs) {
            dirTimestamps.set(path, IGNORE_TIME_ENTRY);
          }

          callback(
            err,
            fileTimestamps,
            dirTimestamps,
            changedFiles,
            removedFiles
          );
        },
        callbackUndelayed
      );

      return {
        close: () => watcher.close(),
        pause: () => watcher.pause(),
        getContextTimeInfoEntries: () => {
          const dirTimestamps = watcher.getContextTimeInfoEntries();
          for (const path of ignoredDirs) {
            dirTimestamps.set(path, IGNORE_TIME_ENTRY);
          }
          return dirTimestamps;
        },
        getFileTimeInfoEntries: () => {
          const fileTimestamps = watcher.getFileTimeInfoEntries();
          for (const path of ignoredFiles) {
            fileTimestamps.set(path, IGNORE_TIME_ENTRY);
          }
          return fileTimestamps;
        }
      };
    }

    ignored: (path: string) => boolean;
    wfs: any;
  }

  /**
   * A WebPack Plugin that ignores files files that are filtered
   * by a callback during a `--watch` build
   */
  export class FilterWatchIgnorePlugin {
    constructor(ignored: (path: string) => boolean) {
      this.ignored = ignored;
    }

    apply(compiler: webpack.Compiler): void {
      compiler.hooks.afterEnvironment.tap('FilterWatchIgnorePlugin', () => {
        compiler.watchFileSystem = new FilterIgnoringWatchFileSystem(
          compiler.watchFileSystem,
          this.ignored
        );
      });
    }

    ignored: (path: string) => boolean;
  }

  export class NowatchDuplicatePackageCheckerPlugin extends DuplicatePackageCheckerPlugin {
    apply(compiler: webpack.Compiler): void {
      const options = this.options;

      compiler.hooks.run.tap(
        'NowatchDuplicatePackageCheckerPlugin',
        compiler => {
          const p = new DuplicatePackageCheckerPlugin(options);
          p.apply(compiler);
        }
      );
    }

    options: DuplicatePackageCheckerPlugin.Options;
  }

  /**
   * A top-level report of the licenses for all code included in a bundle
   *
   * ### Note
   *
   * This is roughly informed by the terms defined in the SPDX spec, though is not
   * an SPDX Document, since there seem to be several (incompatible) specs
   * in that repo.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface ILicenseReport {
    packages: IPackageLicenseInfo[];
  }

  /**
   * A best-effort single bundled package's information.
   *
   * ### Note
   *
   * This is roughly informed by SPDX `packages` and `hasExtractedLicenseInfos`,
   * as making it conformant would vastly complicate the structure.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface IPackageLicenseInfo {
    /** the name of the package as it appears in node_modules */
    name: string;
    /** the version of the package, or an empty string if unknown */
    versionInfo: string;
    /** an SPDX license or LicenseRef, or an empty string if unknown */
    licenseId: string;
    /** the verbatim extracted text of the license, or an empty string if unknown */
    extractedText: string;
  }

  /**
   * A well-known filename for third-party license information.
   *
   * ### Note
   * If an alternate JupyterLab-based ecosystem wanted to implement a different
   * name, they may _still_ need to handle the presence of this file if reusing
   * any core files or extensions.
   *
   * If multiple files are found by `jupyterlab_server, their `packages` will
   * be concatenated.
   */
  export const DEFAULT_LICENSE_REPORT_FILENAME = 'third-party-licenses.json';

  /**
   * a plugin that creates a predictable, machine-readable report of licenses for
   * all modules included in this build
   */
  export class JSONLicenseWebpackPlugin extends LicenseWebpackPlugin {
    constructor(pluginOptions: PluginOptions = {}) {
      super({
        outputFilename: DEFAULT_LICENSE_REPORT_FILENAME,
        ...pluginOptions,
        renderLicenses: modules => this.renderLicensesJSON(modules),
        perChunkOutput: false
      });
    }

    /** render an SPDX-like record */
    renderLicensesJSON(modules: LicenseIdentifiedModule[]): string {
      const report: ILicenseReport = { packages: [] };

      modules.sort((left, right) => (left.name < right.name ? -1 : 1));

      for (const mod of modules) {
        report.packages.push({
          name: mod.name || '',
          versionInfo: mod.packageJson.version || '',
          licenseId: mod.licenseId || '',
          extractedText: mod.licenseText || ''
        });
      }

      return JSON.stringify(report, null, 2);
    }
  }
}
