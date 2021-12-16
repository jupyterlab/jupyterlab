// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const path = require('path');
const fs = require('fs-extra');
const Handlebars = require('handlebars');
const Build = require('@jupyterlab/builder').Build;
const webpack = require('webpack');
const merge = require('webpack-merge').default;
const { createShared } = require('@jupyterlab/builder');
const baseConfig = require('@jupyterlab/builder/lib/webpack.config.base');
const { ModuleFederationPlugin } = webpack.container;

const packageData = require('./package.json');
const jlab = packageData.jupyterlab;

// Create a list of application extensions and mime extensions from
// jlab.extensions
const extensions = {};
const mimeExtensions = {};
for (const key of jlab.extensions) {
  const {
    jupyterlab: { extension, mimeExtension }
  } = require(`${key}/package.json`);
  if (extension !== undefined) {
    extensions[key] = extension === true ? '' : extension;
  }
  if (mimeExtension !== undefined) {
    mimeExtensions[key] = mimeExtension === true ? '' : mimeExtension;
  }
}

// buildDir is a temporary directory where files are copied before the build.
const buildDir = path.resolve(jlab.buildDir);
fs.emptyDirSync(buildDir);

// outputDir is where the final built assets go
const outputDir = path.resolve(jlab.outputDir);
fs.emptyDirSync(outputDir);

// <schemaDir>/schemas is where the settings schemas live
const schemaDir = path.resolve(jlab.schemaDir || outputDir);
// ensureAssets puts schemas in the schemas subdirectory
fs.emptyDirSync(path.join(schemaDir, 'schemas'));

// <themeDir>/themes is where theme assets live
const themeDir = path.resolve(jlab.themeDir || outputDir);
// ensureAssets puts themes in the themes subdirectory
fs.emptyDirSync(path.join(themeDir, 'themes'));

// Deduplicated list of extension package names.
const extensionPackages = [...new Set(jlab.extensions)];

// Configuration to handle extension assets
const extensionAssetConfig = Build.ensureAssets({
  packageNames: extensionPackages,
  output: buildDir,
  schemaOutput: schemaDir,
  themeOutput: themeDir
});

// Create the entry point and other assets in build directory.
const template = Handlebars.compile(
  fs.readFileSync('index.template.js').toString()
);
fs.writeFileSync(
  path.join(buildDir, 'index.js'),
  template({ extensions, mimeExtensions })
);

// Create the bootstrap file that loads federated extensions and calls the
// initialization logic in index.js
const entryPoint = path.join(buildDir, 'bootstrap.js');
fs.copySync('./bootstrap.js', entryPoint);

const shared = createShared({
  extensions: extensionPackages,
  resolutions: packageData.resolutions,
  singletonPackages: jlab.singletonPackages
});

const plugins = [
  new ModuleFederationPlugin({
    library: {
      type: 'var',
      name: ['_JUPYTERLAB', 'CORE_LIBRARY_FEDERATION']
    },
    name: 'CORE_FEDERATION',
    shared
  })
];

module.exports = [
  merge(baseConfig, {
    mode: 'development',
    devtool: 'source-map',
    entry: ['./publicpath.js', entryPoint],
    output: {
      path: path.resolve(outputDir),
      library: {
        type: 'var',
        name: ['_JUPYTERLAB', 'CORE_OUTPUT']
      },
      filename: 'bundle.js'
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          jlab_core: {
            test: /[\\/](node_modules[\\/]@(jupyterlab|lumino)|packages)[\\/]/,
            name: 'jlab_core'
          }
        }
      }
    },
    plugins
  })
].concat(extensionAssetConfig);

// For debugging, write the config out
fs.writeFileSync(
  path.join(buildDir, 'webpack.config-log.json'),
  JSON.stringify(module.exports, null, '  ')
);
