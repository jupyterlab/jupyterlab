// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
const data = require('./package.json');
const Build = require('@jupyterlab/builder').Build;
const webpack = require('webpack');
const merge = require('webpack-merge').default;
const baseConfig = require('@jupyterlab/builder/lib/webpack.config.base');
const { ModuleFederationPlugin } = webpack.container;
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');


// Ensure a clear build directory.
const buildDir = path.resolve(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  fs.removeSync(buildDir);
}
fs.ensureDirSync(buildDir);

// Configuration to handle extension assets
const extensionAssetConfig = Build.ensureAssets({
  packageNames: jlab.extensions,
  output: buildDir
});

const singletons = {};

jlab.singletonPackages.forEach(element => {
  singletons[element] = { singleton: true };
});

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

// Create the entry point file.
const source = fs.readFileSync('index.js').toString();
const template = Handlebars.compile(source);
const extData = {
  jupyterlab_extensions: extensions,
  jupyterlab_mime_extensions: mimeExtensions
};
const result = template(extData);

fs.writeFileSync(path.join(buildDir, 'index.out.js'), result);

// Make a bootstrap entrypoint
const entryPoint = path.join(buildDir, 'bootstrap.js');
fs.copySync('./bootstrap.js', entryPoint);

if (process.env.NODE_ENV === 'production') {
  baseConfig.mode = 'production';
}

module.exports = [
  merge(baseConfig, {
    mode: 'development',
    entry: ['./publicpath.js', './' + path.relative(__dirname, entryPoint)],
    output: {
      path: buildDir,
      library: {
        type: 'var',
        name: ['_JUPYTERLAB', 'CORE_OUTPUT']
      },
      filename: 'bundle.js'
    },
    plugins: [
      new ModuleFederationPlugin({
        library: {
          type: 'var',
          name: ['_JUPYTERLAB', 'CORE_LIBRARY_FEDERATION']
        },
        name: 'CORE_FEDERATION',
        shared: {
          ...data.resolutions,
          ...singletons
        }
      })
    ]
  })
].concat(extensionAssetConfig);
