/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import miniSVGDataURI from 'mini-svg-data-uri';

import * as webpack from 'webpack';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';

/**
 *  A namespace for JupyterLab build utilities.
 */
export namespace Build {
  /**
   * The options used to ensure a root package has the appropriate
   * assets for its JupyterLab extension packages.
   */
  export interface IEnsureOptions {
    /**
     * The output directory where the build assets should reside.
     */
    output: string;

    /**
     * The directory for the schema directory, defaults to the output directory.
     */
    schemaOutput?: string;

    /**
     * The directory for the theme directory, defaults to the output directory
     */
    themeOutput?: string;

    /**
     * The names of the packages to ensure.
     */
    packageNames: ReadonlyArray<string>;

    /**
     * The package paths to ensure.
     */
    packagePaths?: ReadonlyArray<string>;
  }

  /**
   * The JupyterLab extension attributes in a module.
   */
  export interface ILabExtension {
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
    readonly themePath?: string;
  }

  /**
   * A minimal definition of a module's package definition (i.e., package.json).
   */
  export interface IModule {
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
   * Ensures that the assets of plugin packages are populated for a build.
   *
   * @ Returns An array of lab extension config data.
   */
  export function ensureAssets(
    options: IEnsureOptions
  ): webpack.Configuration[] {
    const {
      output,
      schemaOutput = output,
      themeOutput = output,
      packageNames
    } = options;

    const themeConfig: webpack.Configuration[] = [];

    const packagePaths: string[] = options.packagePaths?.slice() || [];

    let cssImports: string[] = [];

    packageNames.forEach(name => {
      packagePaths.push(
        path.dirname(require.resolve(path.join(name, 'package.json')))
      );
    });

    packagePaths.forEach(packagePath => {
      const packageDataPath = require.resolve(
        path.join(packagePath, 'package.json')
      );
      const packageDir = path.dirname(packageDataPath);
      const data = fs.readJSONSync(packageDataPath);
      const name = data.name;
      const extension = normalizeExtension(data);

      const { schemaDir, themePath } = extension;

      // We prefer the styleModule key if it exists, falling back to
      // the normal style key.
      if (typeof data.styleModule === 'string') {
        cssImports.push(`${name}/${data.styleModule}`);
      } else if (typeof data.style === 'string') {
        cssImports.push(`${name}/${data.style}`);
      }

      // Handle schemas.
      if (schemaDir) {
        const schemas = glob.sync(
          path.join(path.join(packageDir, schemaDir), '*')
        );
        const destination = path.join(schemaOutput, 'schemas', name);

        // Remove the existing directory if necessary.
        if (fs.existsSync(destination)) {
          try {
            const oldPackagePath = path.join(destination, 'package.json.orig');
            const oldPackageData = fs.readJSONSync(oldPackagePath);
            if (oldPackageData.version === data.version) {
              fs.removeSync(destination);
            }
          } catch (e) {
            fs.removeSync(destination);
          }
        }

        // Make sure the schema directory exists.
        fs.mkdirpSync(destination);

        // Copy schemas.
        schemas.forEach(schema => {
          const file = path.basename(schema);
          fs.copySync(schema, path.join(destination, file));
        });

        // Write the package.json file for future comparison.
        fs.copySync(
          path.join(packageDir, 'package.json'),
          path.join(destination, 'package.json.orig')
        );
      }

      if (!themePath) {
        return;
      }
      themeConfig.push({
        mode: 'production',
        entry: {
          index: path.join(packageDir, themePath)
        },
        output: {
          path: path.resolve(path.join(themeOutput, 'themes', name)),
          // we won't use these JS files, only the extracted CSS
          filename: '[name].js',
          hashFunction: 'sha256'
        },
        module: {
          rules: [
            {
              test: /\.css$/,
              use: [MiniCssExtractPlugin.loader, require.resolve('css-loader')]
            },
            {
              test: /\.svg/,
              type: 'asset/inline',
              generator: {
                dataUrl: (content: any) => miniSVGDataURI(content.toString())
              }
            },
            {
              test: /\.(cur|png|jpg|gif|ttf|woff|woff2|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
              type: 'asset'
            }
          ]
        },
        plugins: [
          new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: '[name].css',
            chunkFilename: '[id].css'
          })
        ]
      });
    });

    cssImports.sort((a, b) => a.localeCompare(b));
    const styleContents = `/* This is a generated file of CSS imports */
/* It was generated by @jupyterlab/builder in Build.ensureAssets() */

${cssImports.map(x => `import '${x}';`).join('\n')}
`;

    const stylePath = path.join(output, 'style.js');

    // Make sure the output dir exists before writing to it.
    if (!fs.existsSync(output)) {
      fs.mkdirSync(output);
    }
    fs.writeFileSync(stylePath, styleContents, {
      encoding: 'utf8'
    });

    return themeConfig;
  }

  /**
   * Returns JupyterLab extension metadata from a module.
   */
  export function normalizeExtension(module: IModule): ILabExtension {
    let { jupyterlab, main, name } = module;

    main = main || 'index.js';

    if (!jupyterlab) {
      throw new Error(`Module ${name} does not contain JupyterLab metadata.`);
    }

    let { extension, mimeExtension, schemaDir, themePath } = jupyterlab;

    extension = extension === true ? main : extension;
    mimeExtension = mimeExtension === true ? main : mimeExtension;

    if (extension && mimeExtension && extension === mimeExtension) {
      const message = 'extension and mimeExtension cannot be the same export.';

      throw new Error(message);
    }

    return { extension, mimeExtension, schemaDir, themePath };
  }
}
