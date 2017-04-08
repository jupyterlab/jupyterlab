
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
function build(options: build.IOptions): void {
  new Private.Builder(options);
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
      this._validateEntry();

      // Find the cache dir.
      let childProcess = (require('child_process') as any);
      this._cacheDir = childProcess.execSync('npm config get cache',
        { encoding: 'utf8' }
      ).trim();

      fs.removeSync(this._outPath);
      fs.ensureDirSync(this._outPath);
      fs.ensureDirSync(this._tempDir);

      // Handle the packages starting at the root.
      this._handlePackage(this._rootPath);

      // Create the entry point file.
      this._createEntry();

      // Remove the temp dir.
      fs.removeSync(this._tempDir);
    }

    /**
     * Validate the entry point of the extension.
     */
    private _validateEntry(): void {
      let packagePath = path.join(this._rootPath, 'package.json');
      if (!fs.existsSync(packagePath)) {
        throw Error('Requires a package.json file in the root path');
      }
      let data = require(packagePath);
      if (!data.main) {
        throw Error('Must specify a "main" entry point in package.json');
      }
      let mainPath = path.join(this._rootPath, data.main);
      if (!fs.existsSync(mainPath)) {
        throw Error('Main entry point not found, perhaps unbuilt?');
      }
    }

    /**
     * Handle the package and its dependencies, recursively.
     */
    private _handlePackage(basePath: string): void {
      let data = require(path.join(basePath, 'package.json'));
      let name = data.name + '@' + data.version;
      if (this._packages.has(name)) {
        return;
      }
      this._packages.add(name);

      // If it is a remote package, attempt to get it from the cache.
      if (data.dist) {
        let cacheDir = path.join(this._cacheDir, data.name, data.version);
        if (fs.existsSync(cacheDir)) {
          this._moveCached(cacheDir, data);
        } else {
          this._moveDist(basePath, data, name);
        }
      } else {
        this._moveLocal(basePath, data, name);
      }

      // Handle the dependencies.
      for (let dep in data.dependencies) {
        this._handlePackage(this._findPackage(basePath, dep));
      }
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
     * Move a remote package that was not in our cache.
     */
    private _moveDist(basePath: string, data: any, name: string): void {
      // Move to a staging directory - remove node_modules.
      // TODO

      // Cleanse the data and write
      // TODO - remove underscore keys and dist.
      let packageFile = path.join(destDir, 'package', 'package.json');
      fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');

      // Create the cache files.
      this._createCache(stageDir, data);
    }

    /**
     * Move a local package.
     */
    private _moveLocal(basePath: string, data: any, name: string): void {
      // Stream to the staging directory.
      let FN = require('fstream-npm') as any;
      // TODO
      // https://github.com/npm/fstream-npm

      // Create the cache files.
      this._createCache(stageDir, data);
    }

    /**
     * Create the cache data from a staging directory.
     */
    private _createCache(stageDir: string, data: any): void {
      // Ensure directories.
      let destDir = path.join(this._outPath, 'cache', data.name, data.version);
      fs.ensureDirSync(path.join(destDir, 'package'));

      // Create the tarball.
      let tarFile = path.join(destDir, 'package.tgz');
      let options = {
        noProprietary: true,
        fromBase: true
      };
      let pack = (require('tar-pack') as any).pack;
      pack(basePath, options)
         .pipe(fs.createWriteStream(tarFile));

      // Create the package.json
      let packageFile = path.join(destDir, 'package', 'package.json');
      fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');
    }


    /**
     * Create the entry point file.
     */
    private _createEntry() {
      let data = require(path.join(this._rootPath, 'package.json'));
      // Scoped packages get special treatment.
      let name = data.name;
      if (name[0] === '@') {
        name = name.substr(1).replace(/\//g, '-');
      }
      let tarFile = name + '-' + data.version + '.tgz';

      // Create a `package` dir and pull the staged file contents.
      let packageDir = path.join(this._outPath, 'package');
      fs.ensureDirSync(packageDir);
      let sourcePath = path.join(
        this._outPath, 'cache', data.name, data.version
      );
      fs.copySync(sourcePath, packageDir);

      // Create the tarball from that dir.
      let pack = (require('tar-pack') as any).pack;
      pack(packageDir, options)
         .pipe(fs.createWriteStream(tarFile));

      // Remove the temp dir.
      fs.removeSync(packageDir);
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
