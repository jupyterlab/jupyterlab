
import * as fs
  from 'fs-extra';

import * as path
  from 'path';


/**
 * Build a JupyterLab extension.
 *
 * @param options - The options used to build the extension asset tree.
 */
export
function build(options: build.IOptions): Promise<void> {
  let builder = new Private.Builder(options);
  return builder.build();
}


/**
 * The namespace for `build` function statics.
 */
export
namespace build {
  /**
   * The options used to build the extension.
   */
  export interface IOptions {
    /**
     * The root path of the build, defaults to the cwd.
     */
    rootPath?: string;

    /**
     * The output path of the build, defaults to `'./build'`.
     */
    outPath?: string;
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The builder implementation.
   */
  export
  class Builder {
    /**
     * Create a builder.
     */
    constructor(options: build.IOptions) {
      this._rootPath = path.resolve(options.rootPath || '.');
      this._outPath = path.resolve(options.outPath || './build');
      this._tempDir = path.join(this._outPath, 'temp');
    }

    /**
     * Build the files.
     */
    build(): Promise<void> {
      this._validateEntry(this._rootPath);

      // Find the cache dir.
      let childProcess = (require('child_process') as any);
      this._cacheDir = childProcess.execSync('npm config get cache',
        { encoding: 'utf8' }
      ).trim();

      fs.removeSync(this._outPath);
      fs.ensureDirSync(this._outPath);
      fs.ensureDirSync(this._tempDir);

      // Handle the packages starting at the root.
      return this._handlePackage(this._rootPath).then(() => {
        // Create the entry point file.
        return this._createEntry();
      }).then(() => {
        // Remove the temp dir.
        fs.removeSync(this._tempDir);
      });
    }

    /**
     * Validate the entry point of the extension.
     */
    private _validateEntry(basePath: string): void {
      let packagePath = path.join(basePath, 'package.json');
      if (!fs.existsSync(packagePath)) {
        throw Error(`Missing package.json file in package: ${basePath}`);
      }
      let data = require(packagePath);
      if (!data.main) {
        throw Error('Must specify a "main" entry point in package.json');
      }
      let mainPath = path.join(basePath, data.main);
      if (!fs.existsSync(mainPath)) {
        throw Error('Main entry point not found, perhaps unbuilt?');
      }
    }

    /**
     * Handle the package and its dependencies, recursively.
     */
    private _handlePackage(basePath: string): Promise<void> {
      let data = require(path.join(basePath, 'package.json'));
      let name = this._getPackageName(data);

      if (this._packages.has(name)) {
        return Promise.resolve(void 0);
      }
      this._packages.add(name);

      let promises: Promise<void>[] = [];

      // // Handle the dependencies.
      for (let dep in data.dependencies) {
        promises.push(this._handlePackage(this._findPackage(basePath, dep)));
      }

      // If it is a remote package, attempt to get it from the cache.
      if (data.dist) {
        let cacheDir = path.join(this._cacheDir, data.name, data.version);
        if (fs.existsSync(cacheDir)) {
          this._moveCached(cacheDir, data);
        } else {
          promises.push();
        }
      } else {
        promises.push(this._moveLocal(basePath, data, name));
      }
      return Promise.all(promises).then(() => { /* no-op */ });
    }

    /**
     * Move a cached package to our store.
     */
    private _moveCached(cacheDir: string, data: any): void {
      let destDir = path.join(this._outPath, 'cache', data.name, data.version);
      fs.ensureDirSync(destDir);
      fs.copySync(cacheDir, destDir);
    }

    /**
     * Move a local package.
     */
    private _moveLocal(basePath: string, data: any, name: string): Promise<void> {
      // Stream to the staging directory and cache.
      let FN = require('fstream-npm') as any;
      let fstream = require('fstream') as any;
      this._validateEntry(basePath);
      let stageDir = path.join(this._tempDir, name);
      fs.ensureDirSync(stageDir);

      let target = new fstream.DirWriter({
        Directory: true, type: 'Directory', path: stageDir
      });

      return new Promise<void>((resolve, reject) => {
        FN({ path: basePath })
          .on('error', (err: any) => reject(err))
          .pipe(target)
          .on('end', () => {
            this._createCache(stageDir, data).then(() => {
              resolve();
            });
          });
      });
    }

    /**
     * Create the cache data from a staging directory.
     */
    private _createCache(stageDir: string, data: any): Promise<void> {
      // Ensure directories.
      let destDir = path.join(this._outPath, 'cache', data.name, data.version);
      fs.ensureDirSync(path.join(destDir, 'package'));

      // Remove extra keys from data.
      let keys = Object.keys(data);
      for (let key of keys) {
        if (key[0] === '_' || key === 'dist') {
          delete data[key];
        }
      }
      // Overwrite the package.json
      let packageFile = path.join(stageDir, 'package.json');
      fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');

      // Create the package.json in the new folder.
      packageFile = path.join(destDir, 'package', 'package.json');
      fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');

      // Create the tarball.
      let tarFile = path.join(destDir, 'package.tgz');
      let options = {
        noProprietary: true,
        fromBase: true
      };
      let pack = (require('tar-pack') as any).pack;

      return new Promise<void>((resolve, reject) => {
        pack(stageDir, options)
           .pipe(fs.createWriteStream(tarFile))
           .on('error', (err: any) => reject(err))
           .on('close', () => {
            resolve();
           });
      });
    }

    /**
     * Get path-friendly name of package.
     */
    private _getPackageName(data: any): string {
      let name = data.name;
      if (name[0] === '@') {
        name = name.substr(1).replace(/\//g, '-');
      }
      return name + '-' + data.version;
    }

    /**
     * Create the entry point file.
     */
    private _createEntry(): Promise<void> {
      let data = require(path.join(this._rootPath, 'package.json'));
      let name = this._getPackageName(data);
      let tarFile = path.join(this._outPath, name + '.tgz');

      // Create a `package` dir and pull the staged file contents.
      let packageDir = path.join(this._outPath, 'package');
      fs.ensureDirSync(packageDir);
      let sourcePath = path.join(this._tempDir, name);
      fs.copySync(sourcePath, packageDir);

      // Create the tarball from that dir.
      let pack = (require('tar-pack') as any).pack;
      let options = {
        noProprietary: true
      };
      return new Promise<void>((resolve, reject) => {
        pack(packageDir, options)
         .on('error', (err: any) => reject(err))
         .pipe(fs.createWriteStream(tarFile))
         .on('close', () => {
            // Remove the temp dir.
            fs.removeSync(packageDir);
            resolve();
          });
      });
    }

    /**
     * Walk up the tree to the root path looking for the package.
     */
    private _findPackage(basePath: string, name: string): string {
      while (true) {
        let packagePath = path.join(basePath, 'node_modules', name);
        if (fs.existsSync(packagePath)) {
          return fs.realpathSync(packagePath);
        }
        let prev = basePath;
        basePath = path.resolve(basePath, '..');
        if (prev === basePath) {
          throw new Error(`Could not find module '${name}'`);
        }
      }
    }

    private _packages = new Set();
    private _tempDir: string;
    private _rootPath: string;
    private _outPath: string;
    private _cacheDir: string;
  }
}
