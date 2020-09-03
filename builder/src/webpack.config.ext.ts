// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';
import * as webpack from 'webpack';
import { Build } from './build';
import { merge } from 'webpack-merge';
import * as fs from 'fs';
import * as glob from 'glob';
import Ajv from 'ajv';
import { readJSONFile, writeJSONFile } from '@jupyterlab/buildutils';

const baseConfig = require('./webpack.config.base');
const { ModuleFederationPlugin } = webpack.container;

const packagePath: string = process.env.PACKAGE_PATH || '';
const corePath: string = process.env.CORE_PATH || '';
const staticUrl: string = process.env.STATIC_URL || '';

const data = require(path.join(packagePath, 'package.json'));

const ajv = new Ajv({ useDefaults: true });
const validate = ajv.compile(require('../metadata_schema.json'));
let valid = validate(data.jupyterlab || {});
if (!valid) {
  console.error(validate.errors);
  process.exit(1);
}

let outputPath = data.jupyterlab['outputDir'];
outputPath = path.join(packagePath, outputPath);

// Handle the extension entry point and the lib entry point, if different
const index = require.resolve(packagePath);
const exposes: { [id: string]: string } = {
  './index': index
};

if (data.jupyterlab.extension === true) {
  exposes['./extension'] = index;
} else if (typeof data.jupyterlab.extension === 'string') {
  exposes['./extension'] = path.join(packagePath, data.jupyterlab.extension);
}

if (data.jupyterlab.mimeExtension === true) {
  exposes['./mimeExtension'] = index;
} else if (typeof data.jupyterlab.mimeExtension === 'string') {
  exposes['./mimeExtension'] = path.join(
    packagePath,
    data.jupyterlab.mimeExtension
  );
}

if (data.style) {
  exposes['./style'] = path.join(packagePath, data.style);
}

const coreData = require(path.join(corePath, 'package.json'));

const shared: any = {};

// Start with core package versions.
const coreDeps: any = {
  ...coreData.dependencies,
  ...(coreData.resolutions || {})
};

Object.keys(coreDeps).forEach(element => {
  shared[element] = { requiredVersion: coreDeps[element] };
});

// Add package dependencies.
Object.keys(data.dependencies).forEach(element => {
  if (!shared[element]) {
    shared[element] = {};
  }
});

// Remove non-shared.
(data.jupyterlab.nonSharedPackages || []).forEach((element: string) => {
  delete shared[element];
});

// Start with core singletons.
coreData.jupyterlab.singletonPackages.forEach((element: string) => {
  if (!shared[element]) {
    shared[element] = {};
  }
  shared[element].import = false;
  shared[element].singleton = true;
});

// Add package singletons.
(data.jupyterlab.singletonPackages || []).forEach((element: string) => {
  if (!shared[element]) {
    shared[element] = {};
  }
  shared[element].import = false;
});

// Remove non-singletons.
(data.jupyterlab.nonSingletonPackages || []).forEach((element: string) => {
  if (!shared[element]) {
    shared[element] = {};
  }
  shared[element].singleton = false;
});

// add itself to shared
if (shared[data.name]) {
  console.error(`Overriding '${data.name}' in module shared list.`);
}
shared[data.name] = {
  version: data.version,
  singleton: true,
  import: index
};

// Ensure a clean output directory - remove files but not the directory
// in case it is a symlink
if (fs.existsSync(outputPath)) {
  const outputFiles = fs.readdirSync(outputPath);
  outputFiles.forEach(filePath => {
    filePath = path.join(outputPath, filePath);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    } else {
      fs.rmdirSync(filePath, { recursive: true });
    }
  });
}
fs.mkdirSync(outputPath, { recursive: true });

const extras = Build.ensureAssets({
  packageNames: [],
  packagePaths: [packagePath],
  output: outputPath
});

fs.copyFileSync(
  path.join(packagePath, 'package.json'),
  path.join(outputPath, 'package.json')
);

const webpackPublicPathString = staticUrl
  ? `"${staticUrl}"`
  : `getOption('fullLabextensionsUrl') + '/${data.name}/'`;
const publicpath = path.join(outputPath, 'publicPath.js');
fs.writeFileSync(
  publicpath,
  `
function getOption(name) {
  let configData = Object.create(null);
  // Use script tag if available.
  if (typeof document !== 'undefined' && document) {
    const el = document.getElementById('jupyter-config-data');

    if (el) {
      configData = JSON.parse(el.textContent || '{}');
    }
  }
  return configData[name] || '';
}

// eslint-disable-next-line no-undef
__webpack_public_path__ = ${webpackPublicPathString};
`
);

class CleanupPlugin {
  apply(compiler: any) {
    compiler.hooks.done.tap('Cleanup', () => {
      // Find the remoteEntry file and add it to the package.json metadata
      const files = glob.sync(path.join(outputPath, 'remoteEntry.*.js'));
      let newestTime = -1;
      let newestRemote = '';
      files.forEach(fpath => {
        const mtime = fs.statSync(fpath).mtime.getTime();
        if (mtime > newestTime) {
          newestRemote = fpath;
          newestTime = mtime;
        }
      });
      const data = readJSONFile(path.join(outputPath, 'package.json'));
      const _build: any = {
        load: path.basename(newestRemote)
      };
      if (exposes['./extension'] !== undefined) {
        _build.extension = './extension';
      }
      if (exposes['./mimeExtension'] !== undefined) {
        _build.mimeExtension = './mimeExtension';
      }
      if (exposes['./style'] !== undefined) {
        _build.style = './style';
      }
      data.jupyterlab._build = _build;
      writeJSONFile(path.join(outputPath, 'package.json'), data);
    });
  }
}

const config = [
  merge(baseConfig, {
    // Using empty object {} for entry because we want only
    // entrypoints generated by ModuleFederationPlugin
    entry: {
      [data.name]: publicpath
    },
    output: {
      filename: '[name].[contenthash].js',
      path: outputPath
    },
    module: {
      rules: [{ test: /\.html$/, use: 'file-loader' }]
    },
    plugins: [
      new ModuleFederationPlugin({
        name: data.name,
        library: {
          type: 'var',
          name: ['_JUPYTERLAB', data.name]
        },
        filename: 'remoteEntry.[contenthash].js',
        exposes,
        shared
      }),
      new CleanupPlugin()
    ]
  })
].concat(extras);

module.exports = (env: any, argv: any) => {
  if (argv.mode === 'development') {
    const logPath = path.join(outputPath, 'build_log.json');
    fs.writeFileSync(logPath, JSON.stringify(config, null, '  '));
  }

  return config;
};
