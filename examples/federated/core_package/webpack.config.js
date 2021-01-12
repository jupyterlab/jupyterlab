// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const path = require('path');
const fs = require('fs-extra');
const Handlebars = require('handlebars');
const Build = require('@jupyterlab/builder').Build;
const webpack = require('webpack');
const merge = require('webpack-merge').default;
const baseConfig = require('@jupyterlab/builder/lib/webpack.config.base');
const { ModuleFederationPlugin } = webpack.container;

const packageData = require('./package.json');

// Handle the extensions.
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

const extensionPackages = jlab.extensions;

// Ensure a clear build directory.
const buildDir = path.resolve(jlab.buildDir);
if (fs.existsSync(buildDir)) {
  fs.removeSync(buildDir);
}
fs.ensureDirSync(buildDir);

const outputDir = path.resolve(jlab.outputDir);
if (fs.existsSync(outputDir)) {
  fs.removeSync(outputDir);
}
fs.ensureDirSync(outputDir);

const dataDir = path.resolve(jlab.dataDir);

const schemaDir = path.join(dataDir, 'schemas')
if (fs.existsSync(schemaDir)) {
  fs.removeSync(schemaDir);
}
fs.ensureDirSync(schemaDir);

const themeDir = path.join(dataDir, 'themes')
if (fs.existsSync(themeDir)) {
  fs.removeSync(themeDir);
}
fs.ensureDirSync(themeDir);

// Configuration to handle extension assets
const extensionAssetConfig = Build.ensureAssets({
  packageNames: extensionPackages,
  output: path.resolve(jlab.dataDir)
});
if (dataDir !== buildDir) {
  fs.moveSync(
    path.join(dataDir, 'style.js'),
    path.join(buildDir, 'style.js')
  )
}

// Create the entry point and other assets in build directory.
const source = fs.readFileSync('index.template.js').toString();
const template = Handlebars.compile(source);
const extData = {
  jupyterlab_extensions: extensions,
  jupyterlab_mime_extensions: mimeExtensions
};

fs.writeFileSync(path.join(buildDir, 'index.js'), template(extData));

// Create the bootstrap file that loads federated extensions and calls the
// initialization logic in index.js
const entryPoint = path.join(buildDir, 'bootstrap.js');
fs.copySync('./bootstrap.js', entryPoint);


function createShared(packageData) {
  // Set up module federation sharing config
  const shared = {};
  const extensionPackages = packageData.jupyterlab.extensions;

  // Make sure any resolutions are shared
  for (let [pkg, requiredVersion] of Object.entries(packageData.resolutions)) {
    shared[pkg] = { requiredVersion };
  }

  // Add any extension packages that are not in resolutions (i.e., installed from npm)
  for (let pkg of extensionPackages) {
    if (!shared[pkg]) {
      shared[pkg] = {
        requiredVersion: require(`${pkg}/package.json`).version
      };
    }
  }

  // Add dependencies and sharedPackage config from extension packages if they
  // are not already in the shared config. This means that if there is a
  // conflict, the resolutions package version is the one that is shared.
  const extraShared = [];
  for (let pkg of extensionPackages) {
    let pkgShared = {};
    let {
      dependencies = {},
      jupyterlab: { sharedPackages = {} } = {}
    } = require(`${pkg}/package.json`);
    for (let [dep, requiredVersion] of Object.entries(dependencies)) {
      if (!shared[dep]) {
        pkgShared[dep] = { requiredVersion };
      }
    }

    // Overwrite automatic dependency sharing with custom sharing config
    for (let [dep, config] of Object.entries(sharedPackages)) {
      if (config === false) {
        delete pkgShared[dep];
      } else {
        if ('bundled' in config) {
          config.import = config.bundled;
          delete config.bundled;
        }
        pkgShared[dep] = config;
      }
    }
    extraShared.push(pkgShared);
  }

  // Now merge the extra shared config
  const mergedShare = {};
  for (let sharedConfig of extraShared) {
    for (let [pkg, config] of Object.entries(sharedConfig)) {
      // Do not override the basic share config from resolutions
      if (shared[pkg]) {
        continue;
      }

      // Add if we haven't seen the config before
      if (!mergedShare[pkg]) {
        mergedShare[pkg] = config;
        continue;
      }

      // Choose between the existing config and this new config. We do not try
      // to merge configs, which may yield a config no one wants
      let oldConfig = mergedShare[pkg];

      // if the old one has import: false, use the new one
      if (oldConfig.import === false) {
        mergedShare[pkg] = config;
      }
    }
  }

  Object.assign(shared, mergedShare);

  // Transform any file:// requiredVersion to the version number from the
  // imported package. This assumes (for simplicity) that the version we get
  // importing was installed from the file.
  for (let [pkg, { requiredVersion }] of Object.entries(shared)) {
    if (requiredVersion && requiredVersion.startsWith('file:')) {
      shared[pkg].requiredVersion = require(`${pkg}/package.json`).version;
    }
  }

  // Add singleton package information
  for (let pkg of packageData.jupyterlab.singletonPackages) {
    shared[pkg].singleton = true;
  }

  return shared;
}

const plugins = [
  new ModuleFederationPlugin({
    library: {
      type: 'var',
      name: ['_JUPYTERLAB', 'CORE_LIBRARY_FEDERATION']
    },
    name: 'CORE_FEDERATION',
    shared: createShared(packageData)
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
            test: /[\\/]node_modules[\\/]@(jupyterlab|lumino)[\\/]/,
            name: 'jlab_core'
          }
        }
      }
    },
    plugins
  })
].concat(extensionAssetConfig);

// For debugging, write the config out
const logPath = path.join(buildDir, 'build_log.json');
fs.writeFileSync(logPath, JSON.stringify(module.exports, null, '  '));
