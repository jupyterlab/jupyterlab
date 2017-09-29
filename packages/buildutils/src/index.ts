/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';

export
namespace Build {
  /**
   */
  export
  interface IEnsureOptions {
    /**
     * The package data for the extensions being processed.
     */
    module: IModule;

    /**
     * The input directory that contains a package's assets.
     */
    input: string;

    /**
     * The output directory where the build assets should reside.
     */
    output: string;

    /**
     * Whether the current assets should be overwritten if they already exist.
     *
     * #### Notes
     * The default value is `false`.
     */
    overwrite?: boolean;
  }

  /**
   * The JupyterLab extension attributes in a module.
   */
  export
  interface ILabExtension {
    /**
     * Indicates whether the extension is a standalone extension.
     *
     * #### Notes
     * If `true`, the `main` export of the package is used. If set to a string
     * path, the export from that path is loaded as a JupyterLab extension. It
     * is possible for one package to have both an `extension` and a
     * `mimeExtension` but they cannot be identical (i.e., the same export
     * cannot be declared both an `extension` and a `mimeExtension`).
     */
    readonly extension?: boolean | string;

    /**
     * Indicates whether the extension is a MIME renderer extension.
     *
     * #### Notes
     * If `true`, the `main` export of the package is used. If set to a string
     * path, the export from that path is loaded as a JupyterLab extension. It
     * is possible for one package to have both an `extension` and a
     * `mimeExtension` but they cannot be identical (i.e., the same export
     * cannot be declared both an `extension` and a `mimeExtension`).
     */
    readonly mimeExtension?: boolean | string;

    /**
     * The local schema file path in the extension package.
     */
    readonly schemaDir?: string;

    /**
     * The local theme file path in the extension package.
     */
    readonly themeDir?: string;
  }

  /**
   * A minimal definition of a module's package definition (i.e., package.json).
   */
  export
  interface IModule {
    /**
     * The JupyterLab metadata/
     */
    jupyterlab?: ILabExtension;

    /**
     * The main entry point in a module.
     */
    main?: string;

    /**
     * The name of a module.
     */
    name: string;
  }

  /**
   * Ensures that the assets of a plugin are populated for a build.
   */
  export
  function ensureAssets(options: IEnsureOptions): void {
    const { module, input, output, overwrite } = options;
    const { name } = module;
    const extension = normalizeExtension(module);
    const { schemaDir, themeDir } = extension;

    // Handle schemas.
    if (schemaDir) {
      const schemas = glob.sync(path.join(path.join(input, schemaDir), '*'));
      const destination = path.join(output, 'schemas', name);

      // Make sure the schema directory exists.
      if (overwrite) {
        fs.rmdirSync(destination);
      }
      fs.mkdirpSync(destination);

      // Copy schemas.
      schemas.forEach(schema => {
        const file = path.basename(schema);

        fs.copySync(schema, path.join(destination, file));
      });
    }

    // Handle themes.
    if (themeDir) {
      const theme = name.replace(/@/g, '').replace(/\//g, '-');
      const from = path.join(input, themeDir);
      const destination = path.join(output, 'themes', theme);

      if (overwrite) {
        fs.rmdirSync(destination);
      }
      fs.copySync(from, destination);
    }
  }

  /**
   * Returns JupyterLab extension metadata from a module.
   */
  export
  function normalizeExtension(module: IModule): ILabExtension {
    let { jupyterlab, main, name } = module;

    main = main || 'index.js';

    if (!jupyterlab) {
      throw new Error(`Module ${name} does not contain JupyterLab metadata.`);
    }

    let { extension, mimeExtension, schemaDir, themeDir } = jupyterlab;

    extension = extension === true ? main : extension;
    mimeExtension = mimeExtension === true ? main : mimeExtension;

    if (extension && mimeExtension && extension === mimeExtension) {
      const message = 'extension and mimeExtension cannot be the same export.';

      throw new Error(message);
    }

    return { extension, mimeExtension, schemaDir, themeDir };
  }
}
