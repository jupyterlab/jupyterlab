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
          const dirTimestamps = watcher.getContextInfoEntries();
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

  /** A single module's license(s) */
  export interface ILicenseRecord {
    version: string;
    licenseId: string | null;
    licenseText: string | null;
  }

  /** A top-level report of the licenses for all code included in a build */
  export interface ILicenseReport {
    licenses: {
      [key: string]: ILicenseRecord;
    };
  }

  export const LICENSE_REPORT_FILENAME = 'third-party-licenses.json';

  /**
   * a plugin that creates a predictable, machine-readable report of licenses for
   * all modules included in this build
   */
  export class JSONLicenseWebpackPlugin extends LicenseWebpackPlugin {
    constructor(pluginOptions: PluginOptions = {}) {
      super({
        ...pluginOptions,
        renderLicenses: modules => this.renderLicensesJSON(modules),
        perChunkOutput: false,
        outputFilename: LICENSE_REPORT_FILENAME
      });
    }

    /** render a simple JSON slug */
    renderLicensesJSON(modules: LicenseIdentifiedModule[]): string {
      const licenseData: ILicenseReport = {
        licenses: modules
          .sort((left, right) => (left.name < right.name ? -1 : 1))
          .reduce(
            (memo, module) => ({
              ...memo,
              [module.name]: {
                version: module.packageJson.version,
                licenseId: module.licenseId || null,
                licenseText: module.licenseText || null
              }
            }),
            {} as Record<string, ILicenseRecord>
          )
      };

      return JSON.stringify(licenseData, null, 2);
    }
  }
}
