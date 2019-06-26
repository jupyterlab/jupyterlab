/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

const fs = require('fs-extra');
const webpack = require('webpack');

/**
 * A WebPack Plugin that copies the assets to the static directory and
 * fixes the output of the HTMLWebpackPlugin
 */
class JupyterFrontEndPlugin {
  constructor(buildDir, staticDir) {
    this.buildDir = buildDir;
    this.staticDir = staticDir;

    this._first = true;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('JupyterFrontEndPlugin', () => {
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
}

/**
 * A WebPack Plugin that ignores files outside of
 * the packages in Jupyterlab
 */
class JupyterIgnorePlugin extends webpack.IgnorePlugin {
  constructor(ignored) {
    super({});

    // ignored should be a callback function that filters the build files
    this.ignored = ignored;
  }

  checkIgnore(result) {
    if (!result) return result;
    return this.ignored(result.resource) ? result : null;
  }
}

/**
 * A helper class for the JupyterWatchIgnorePlugin. This is a close copy of
 * (the non-exported) webpack.IgnoringWatchFileSystem
 */
class JupyterIgnoringWatchFileSystem {
  constructor(wfs, ignored) {
    this.wfs = wfs;
    // ignored should be a callback function that filters the build files
    this.ignored = ignored;
  }

  watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
    const notIgnored = path => !this.ignored(path);

    const ignoredFiles = files.filter(ignored);
    const ignoredDirs = dirs.filter(ignored);

    const watcher = this.wfs.watch(
      files.filter(notIgnored),
      dirs.filter(notIgnored),
      missing,
      startTime,
      options,
      (
        err,
        filesModified,
        dirsModified,
        missingModified,
        fileTimestamps,
        dirTimestamps,
        removedFiles
      ) => {
        if (err) return callback(err);
        for (const path of ignoredFiles) {
          fileTimestamps.set(path, 1);
        }

        for (const path of ignoredDirs) {
          dirTimestamps.set(path, 1);
        }

        callback(
          err,
          filesModified,
          dirsModified,
          missingModified,
          fileTimestamps,
          dirTimestamps,
          removedFiles
        );
      },
      callbackUndelayed
    );

    return {
      close: () => watcher.close(),
      pause: () => watcher.pause(),
      getContextTimestamps: () => {
        const dirTimestamps = watcher.getContextTimestamps();
        for (const path of ignoredDirs) {
          dirTimestamps.set(path, 1);
        }
        return dirTimestamps;
      },
      getFileTimestamps: () => {
        const fileTimestamps = watcher.getFileTimestamps();
        for (const path of ignoredFiles) {
          fileTimestamps.set(path, 1);
        }
        return fileTimestamps;
      }
    };
  }
}

/**
 * A WebPack Plugin that ignores files outside of
 * the packages in Jupyterlab during a `--watch` build
 */
class JupyterWatchIgnorePlugin {
  constructor(ignored) {
    this.ignored = ignored;
  }

  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('WatchIgnorePlugin', () => {
      compiler.watchFileSystem = new JupyterIgnoringWatchFileSystem(
        compiler.watchFileSystem,
        this.ignored
      );
    });
  }
}

exports.JupyterFrontEndPlugin = JupyterFrontEndPlugin;
exports.JupyterIgnorePlugin = JupyterIgnorePlugin;
exports.JupyterWatchIgnorePlugin = JupyterWatchIgnorePlugin;
