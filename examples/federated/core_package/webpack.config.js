// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
const data = require('./package.json');
const Build = require('@jupyterlab/buildutils').Build;
const webpack = require('webpack');
const { ModuleFederationPlugin } = webpack.container;
const path = require('path');

const names = Object.keys(data.dependencies).filter(function(name) {
  const packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});

const extras = Build.ensureAssets({
  packageNames: names,
  output: './build'
});

const rules = [
  { test: /\.css$/, use: ['style-loader', 'css-loader'] },
  { test: /\.html$/, use: 'file-loader' },
  { test: /\.md$/, use: 'raw-loader' },
  { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
  { test: /\.js.map$/, use: 'file-loader' },
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/font-woff'
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/font-woff'
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/octet-stream'
  },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
  {
    // In .css files, svg is loaded as a data URI.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.css$/,
    use: {
      loader: 'svg-url-loader',
      options: { encoding: 'none', limit: 10000 }
    }
  },
  {
    // In .ts and .tsx files (both of which compile to .js), svg files
    // must be loaded as a raw string instead of data URIs.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.js$/,
    use: {
      loader: 'raw-loader'
    }
  }
];

const options = {
  devtool: 'source-map',
  bail: true,
  mode: 'development'
};

let dependencies = {
  ...data.dependencies,
  '@jupyterlab/rendermime': '^2.1.0',
  '@jupyterlab/coreutils': '^4.1.0',
  '@jupyterlab/settingregistry': '^2.1.0',
  '@lumino/algorithm': '^1.2.3',
  '@lumino/application': '^1.8.4',
  '@lumino/commands': '^1.10.1',
  '@lumino/coreutils': '^1.4.3',
  '@lumino/disposable': '^1.3.5',
  '@lumino/domutils': '^1.1.7',
  '@lumino/dragdrop': '^1.5.1',
  '@lumino/messaging': '^1.3.3',
  '@lumino/properties': '^1.1.6',
  '@lumino/signaling': '^1.3.5',
  '@lumino/virtualdom': '^1.6.1',
  '@lumino/widgets': '^1.11.1',
  react: '~16.9.0',
  'react-dom': '~16.9.0'
};
delete dependencies['@jupyterlab/markdownviewer-extension'];

let shared = Object.fromEntries(
  Object.entries(dependencies).filter(
    ([pkg]) => pkg.startsWith('@lumino') || pkg.startsWith('@jupyterlab')
  )
);
module.exports = [
  {
    entry: './index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      library: {
        type: 'var',
        name: ['MYNAMESPACE', 'NAME_OUTPUT']
      },
      filename: 'bundle.js',
      publicPath: '/foo/static/example/'
    },
    stats: 'verbose',
    ...options,
    module: { rules },
    plugins: [
      new ModuleFederationPlugin({
        library: {
          type: 'var',
          name: ['MYNAMESPACE', 'NAME_LIBRARY_FEDERATION']
        },
        name: 'NAME_FEDERATION',
        shared: Object.fromEntries(
          Object.entries(shared).map(([pkg, version]) => [
            pkg,
            { singleton: true, requiredVersion: version }
          ])
        )
      }),
      new webpack.DefinePlugin({
        'process.env': '{}',
        process: {}
      })
    ]
  }
].concat(extras);
