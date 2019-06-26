/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

const plib = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const package_data = require('./package.json');

// get the data from ./package.json
const jlab = package_data.jupyterlab;

// Set up variables for the watch mode ignore plugins
let watched = {};
let ignoreCache = Object.create(null);
Object.keys(jlab.watchedPackages).forEach(function(name) {
  if (name in watched) return;
  const localPath = require.resolve(plib.join(name, 'package.json'));
  watched[name] = plib.dirname(localPath);
});

/**
 * Sync a local path to a linked package path if they are files and differ.
 */
function maybeSync(localPath, name, rest) {
  const stats = fs.statSync(localPath);
  if (!stats.isFile(localPath)) {
    return;
  }
  const source = fs.realpathSync(plib.join(jlab.watchedPackages[name], rest));
  if (source === fs.realpathSync(localPath)) {
    return;
  }
  fs.watchFile(source, { interval: 500 }, function(curr) {
    if (!curr || curr.nlink === 0) {
      return;
    }
    try {
      fs.copySync(source, localPath);
    } catch (err) {
      console.error(err);
    }
  });
}

/**
 * A filter function used by all of the Jupyter ignore plugins.
 * Set up to exclude all files that are not in a package
 * contained by the Jupyterlab repo
 */
const ignored = path => {
  path = plib.resolve(path);
  if (path in ignoreCache) {
    return ignoreCache[path];
  }

  // Limit the watched files to those in our local linked package dirs.
  let ignore = true;
  Object.keys(watched).some(function(name) {
    // Bail if already found.
    const rootPath = watched[name];
    const contained = path.indexOf(rootPath + plib.sep) !== -1;
    if (path !== rootPath && !contained) {
      return false;
    }
    const rest = path.slice(rootPath.length);
    if (rest.indexOf('node_modules') === -1) {
      ignore = false;
      maybeSync(path, name, rest);
    }
    return true;
  });
  ignoreCache[path] = ignore;
  return ignore;
};

/**
 * A WebPack Plugin that copies the assets to the static directory and
 * fixes the output of the HTMLWebpackPlugin
 */
function JupyterFrontEndPlugin() {}

JupyterFrontEndPlugin.prototype.apply = function(compiler) {
  compiler.hooks.afterEmit.tap(
    'JupyterFrontEndPlugin',
    function() {
      // Copy the static assets.
      const staticDir = jlab.staticDir;
      if (!staticDir) {
        return;
      }
      // Ensure a clean static directory on the first emit.
      if (this._first && fs.existsSync(staticDir)) {
        fs.removeSync(staticDir);
      }
      this._first = false;
      fs.copySync(buildDir, staticDir);
    }.bind(this)
  );
};

JupyterFrontEndPlugin.prototype._first = true;

/**
 * A WebPack Plugin that ignores files outside of
 * the packages in Jupyterlab
 */
class JupyterIgnorePlugin extends webpack.IgnorePlugin {
  constructor() {
    super({});
  }

  checkIgnore(result) {
    if (!result) return result;
    return ignored(result.resource) ? result : null;
  }
}

/**
 * A helper class for the JupyterWatchIgnorePlugin. This is a close copy of
 * (the non-exported) webpack.IgnoringWatchFileSystem
 */
class JupyterIgnoringWatchFileSystem {
  constructor(wfs) {
    this.wfs = wfs;
  }

  watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
    const notIgnored = path => !ignored(path);

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
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('WatchIgnorePlugin', () => {
      compiler.watchFileSystem = new JupyterIgnoringWatchFileSystem(
        compiler.watchFileSystem
      );
    });
  }
}

exports.JupyterFrontEndPlugin = JupyterFrontEndPlugin;
exports.JupyterIgnorePlugin = JupyterIgnorePlugin;
exports.JupyterWatchIgnorePlugin = JupyterWatchIgnorePlugin;
