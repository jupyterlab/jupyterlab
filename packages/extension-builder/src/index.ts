
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
      this._validateEntry();

      fs.removeSync(this._outPath);
      fs.ensureDirSync(this._outPath);

      // Handle the packages starting at the root.
      this._handlePackage(this._rootPath);
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
      this._movePackage(basePath, data, name);

      // Handle the dependencies.
      for (let dep in data.dependencies) {
        this._handlePackage(this._findPackage(basePath, dep));
      }
    }

    /**
     * Move packages from npm.
     */
    private _movePackage(basePath: string, data: any, name: string): void {
      // Pull in the whole package except its node modules.
      function fileFilter(entry: any): boolean {
        return entry.basename !== 'node_modules';
      }

      let destDir = path.join(this._outPath, data.name, data.version);
      fs.ensureDirSync(path.join(destDir, 'package'));
      let tarFile = path.join(destDir, 'package.tgz');
      let options = {
        noProprietary: true,
        filter: fileFilter,
        fromBase: true
      };
      let pack = (require('tar-pack') as any).pack;
      pack(basePath, options)
         .pipe(fs.createWriteStream(tarFile));

      let packageFile = path.join(destDir, 'package', 'package.json');
      fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');
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
    private _rootPath: string;
    private _outPath: string;
  }
}
