/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Ensure the integrity of the packages in the repo.
 *
 * Ensure the core package version dependencies match everywhere.
 * Ensure imported packages match dependencies.
 * Ensure a consistent version of all packages.
 * Manage the metapackage meta package.
 */
import { execSync } from 'child_process';
import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as utils from './utils';
import {
  ensurePackage,
  ensureUiComponents,
  IEnsurePackageOptions
} from './ensure-package';

type Dict<T> = { [key: string]: T };

type CoreData = Map<string, any>;

// URL config for this branch
// Source and target branches
// Target RTD version name
// For main these will be the same, for other branches the source
// branch is whichever branch it was created from
// The current release branch should target RTD stable
// Main should target latest
// All other release branches should target a specific named version
const URL_CONFIG = {
  source: 'main',
  target: 'main',
  rtdVersion: 'latest'
};

// Data to ignore.
const MISSING: Dict<string[]> = {
  '@jupyterlab/coreutils': ['path'],
  '@jupyterlab/buildutils': [
    'assert',
    'child_process',
    'fs',
    'path',
    'webpack'
  ],
  '@jupyterlab/builder': ['path'],
  '@jupyterlab/galata': ['fs', 'path', '@jupyterlab/galata'],
  '@jupyterlab/testing': ['child_process', 'fs', 'path'],
  '@jupyterlab/vega5-extension': ['vega-embed']
};

const UNUSED: Dict<string[]> = {
  // url is a polyfill for sanitize-html
  '@jupyterlab/apputils': ['@types/react'],
  '@jupyterlab/application': ['@fortawesome/fontawesome-free'],
  '@jupyterlab/builder': [
    '@lumino/algorithm',
    '@lumino/application',
    '@lumino/commands',
    '@lumino/coreutils',
    '@lumino/disposable',
    '@lumino/domutils',
    '@lumino/dragdrop',
    '@lumino/messaging',
    '@lumino/properties',
    '@lumino/signaling',
    '@lumino/virtualdom',
    '@lumino/widgets',

    // The libraries needed for building other extensions.
    '@babel/core',
    '@babel/preset-env',
    'css-loader',
    'path-browserify',
    'process',
    'style-loader',
    'terser-webpack-plugin',
    'webpack-cli',
    'worker-loader',
    'source-map-loader'
  ],
  '@jupyterlab/buildutils': ['inquirer', 'verdaccio'],
  '@jupyterlab/codemirror': [
    '@codemirror/lang-cpp',
    '@codemirror/lang-css',
    '@codemirror/lang-html',
    '@codemirror/lang-java',
    '@codemirror/lang-javascript',
    '@codemirror/lang-json',
    '@codemirror/lang-markdown',
    '@codemirror/lang-php',
    '@codemirror/lang-python',
    '@codemirror/lang-rust',
    '@codemirror/lang-sql',
    '@codemirror/lang-wast',
    '@codemirror/lang-xml',
    '@codemirror/legacy-modes'
  ],
  '@jupyterlab/codemirror-extension': [
    '@codemirror/lang-markdown',
    '@codemirror/legacy-modes'
  ],
  '@jupyterlab/coreutils': ['path-browserify'],
  '@jupyterlab/fileeditor': ['regexp-match-indices'],
  '@jupyterlab/markedparser-extension': [
    // only (but always) imported asynchronously
    'marked-gfm-heading-id',
    'marked-mangle'
  ],
  '@jupyterlab/services': ['ws'],
  '@jupyterlab/testing': [
    '@babel/core',
    '@babel/preset-env',
    'fs-extra',
    'identity-obj-proxy',
    'jest-environment-jsdom',
    'jest-junit'
  ],
  '@jupyterlab/testutils': [
    '@jupyterlab/application',
    '@jupyterlab/apputils',
    '@jupyterlab/notebook',
    '@jupyterlab/rendermime'
  ],
  '@jupyterlab/test-csvviewer': ['csv-spectrum'],
  '@jupyterlab/vega5-extension': ['vega', 'vega-lite']
};

// Packages that are allowed to have differing versions
const DIFFERENT_VERSIONS: Array<string> = ['vega-lite', 'vega', 'vega-embed'];

// Packages that have backward versions support
const BACKWARD_VERSIONS: Record<string, Record<string, string>> = {
  '@jupyterlab/rendermime-interfaces': {
    '@lumino/coreutils': '^1.11.0',
    '@lumino/widgets': '^1.37.2'
  }
};

const SKIP_CSS: Dict<string[]> = {
  '@jupyterlab/application': ['@jupyterlab/rendermime'],
  '@jupyterlab/application-extension': ['@jupyterlab/apputils'],
  '@jupyterlab/builder': [
    '@lumino/algorithm',
    '@lumino/application',
    '@lumino/commands',
    '@lumino/coreutils',
    '@lumino/disposable',
    '@lumino/domutils',
    '@lumino/dragdrop',
    '@lumino/messaging',
    '@lumino/properties',
    '@lumino/signaling',
    '@lumino/virtualdom',
    '@lumino/widgets'
  ],
  '@jupyterlab/completer': ['@jupyterlab/codeeditor'],
  '@jupyterlab/docmanager': ['@jupyterlab/statusbar'], // Statusbar styles should not be used by status reporters
  '@jupyterlab/docregistry': [
    '@jupyterlab/codeeditor', // Only used for model
    '@jupyterlab/codemirror', // Only used for Mode.findByFileName
    '@jupyterlab/rendermime' // Only used for model
  ],
  '@jupyterlab/documentsearch': [
    '@jupyterlab/cells',
    '@jupyterlab/codeeditor',
    '@jupyterlab/codemirror',
    '@jupyterlab/fileeditor',
    '@jupyterlab/notebook'
  ],
  '@jupyterlab/filebrowser': ['@jupyterlab/statusbar'],
  '@jupyterlab/fileeditor': ['@jupyterlab/statusbar'],
  '@jupyterlab/galata': [
    '@jupyterlab/application',
    '@jupyterlab/apputils',
    '@jupyterlab/debugger',
    '@jupyterlab/docmanager',
    '@jupyterlab/notebook'
  ],
  '@jupyterlab/galata-extension': [
    '@jupyterlab/application',
    '@jupyterlab/apputils',
    '@jupyterlab/cells',
    '@jupyterlab/debugger',
    '@jupyterlab/docmanager',
    '@jupyterlab/notebook'
  ],
  '@jupyterlab/help-extension': ['@jupyterlab/application'],
  '@jupyterlab/lsp': ['codemirror'],
  '@jupyterlab/metapackage': [
    '@jupyterlab/ui-components',
    '@jupyterlab/apputils',
    '@jupyterlab/codeeditor',
    '@jupyterlab/statusbar',
    '@jupyterlab/codemirror',
    '@jupyterlab/rendermime-interfaces',
    '@jupyterlab/rendermime',
    '@jupyterlab/docregistry',
    '@jupyterlab/application',
    '@jupyterlab/property-inspector',
    '@jupyterlab/application-extension',
    '@jupyterlab/docmanager',
    '@jupyterlab/filebrowser',
    '@jupyterlab/mainmenu',
    '@jupyterlab/apputils-extension',
    '@jupyterlab/attachments',
    '@jupyterlab/outputarea',
    '@jupyterlab/cells',
    '@jupyterlab/notebook',
    '@jupyterlab/cell-toolbar',
    '@jupyterlab/cell-toolbar-extension',
    '@jupyterlab/celltags-extension',
    '@jupyterlab/fileeditor',
    '@jupyterlab/codemirror-extension',
    '@jupyterlab/completer',
    '@jupyterlab/console',
    '@jupyterlab/completer-extension',
    '@jupyterlab/launcher',
    '@jupyterlab/console-extension',
    '@jupyterlab/csvviewer',
    '@jupyterlab/documentsearch',
    '@jupyterlab/csvviewer-extension',
    '@jupyterlab/debugger',
    '@jupyterlab/debugger-extension',
    '@jupyterlab/docmanager-extension',
    '@jupyterlab/documentsearch-extension',
    '@jupyterlab/extensionmanager',
    '@jupyterlab/extensionmanager-extension',
    '@jupyterlab/filebrowser-extension',
    '@jupyterlab/fileeditor-extension',
    '@jupyterlab/inspector',
    '@jupyterlab/help-extension',
    '@jupyterlab/htmlviewer',
    '@jupyterlab/htmlviewer-extension',
    '@jupyterlab/hub-extension',
    '@jupyterlab/imageviewer',
    '@jupyterlab/imageviewer-extension',
    '@jupyterlab/inspector-extension',
    '@jupyterlab/javascript-extension',
    '@jupyterlab/json-extension',
    '@jupyterlab/launcher-extension',
    '@jupyterlab/logconsole',
    '@jupyterlab/logconsole-extension',
    '@jupyterlab/lsp',
    '@jupyterlab/lsp-extension',
    '@jupyterlab/mainmenu-extension',
    '@jupyterlab/markdownviewer',
    '@jupyterlab/markdownviewer-extension',
    '@jupyterlab/markedparser-extension',
    '@jupyterlab/mathjax-extension',
    '@jupyterlab/mermaid',
    '@jupyterlab/mermaid-extension',
    '@jupyterlab/metadataform',
    '@jupyterlab/metadataform-extension',
    '@jupyterlab/nbconvert-css',
    '@jupyterlab/notebook-extension',
    '@jupyterlab/pdf-extension',
    '@jupyterlab/pluginmanager',
    '@jupyterlab/pluginmanager-extension',
    '@jupyterlab/rendermime-extension',
    '@jupyterlab/running',
    '@jupyterlab/running-extension',
    '@jupyterlab/services-extension',
    '@jupyterlab/settingeditor',
    '@jupyterlab/settingeditor-extension',
    '@jupyterlab/shortcuts-extension',
    '@jupyterlab/statusbar-extension',
    '@jupyterlab/terminal',
    '@jupyterlab/terminal-extension',
    '@jupyterlab/theme-dark-extension',
    '@jupyterlab/theme-light-extension',
    '@jupyterlab/toc',
    '@jupyterlab/toc-extension',
    '@jupyterlab/tooltip',
    '@jupyterlab/tooltip-extension',
    '@jupyterlab/translation-extension',
    '@jupyterlab/ui-components-extension',
    '@jupyterlab/vega5-extension',
    '@jupyterlab/workspaces-extension'
  ],
  '@jupyterlab/notebook': ['@jupyterlab/application'],
  '@jupyterlab/rendermime-interfaces': ['@lumino/widgets'],
  '@jupyterlab/shortcuts-extension': ['@jupyterlab/application'],
  '@jupyterlab/testutils': [
    '@jupyterlab/application',
    '@jupyterlab/apputils',
    '@jupyterlab/notebook',
    '@jupyterlab/rendermime',
    '@jupyterlab/testing'
  ],
  '@jupyterlab/theme-light-extension': [
    '@jupyterlab/application',
    '@jupyterlab/apputils'
  ],
  '@jupyterlab/theme-dark-extension': [
    '@jupyterlab/application',
    '@jupyterlab/apputils'
  ]
};

const pkgData: Dict<any> = {};
const pkgPaths: Dict<string> = {};
const pkgNames: Dict<string> = {};
const depCache: Dict<string> = {};
const locals: Dict<string> = {};

/**
 * Ensure branch integrity - GitHub and RTD urls, and workflow target branches
 *
 * @returns An array of messages for changes.
 */
function ensureBranch(): string[] {
  const messages: string[] = [];

  const { source, target, rtdVersion } = URL_CONFIG;

  // Handle the github_version in conf.py
  const confPath = 'docs/source/conf.py';
  const oldConfData = fs.readFileSync(confPath, 'utf-8');
  const confTest = new RegExp('"github_version": "(.*)"');
  const newConfData = oldConfData.replace(
    confTest,
    `"github_version": "${target}"`
  );
  if (newConfData !== oldConfData) {
    messages.push(`Overwriting ${confPath}`);
    fs.writeFileSync(confPath, newConfData, 'utf-8');
  }

  // Handle urls in files
  // Get all files matching the desired file types
  const fileTypes = ['.json', '.md', '.rst', '.yml', '.ts', '.tsx', '.py'];
  let files = execSync('git ls-tree -r HEAD --name-only')
    .toString()
    .trim()
    .split(/\r?\n/);
  files = files.filter(filePath => {
    return (
      fileTypes.indexOf(path.extname(filePath)) !== -1 &&
      !filePath.endsWith('_static/switcher.json')
    );
  });

  // Set up string replacements
  const base = '/jupyterlab/jupyterlab';
  const rtdString = `jupyterlab.readthedocs.io/en/${rtdVersion}/`;
  const urlMap = [
    [`\/jupyterlab\/jupyterlab\/${source}\/`, `${base}/${target}/`],
    [`\/jupyterlab\/jupyterlab\/blob\/${source}\/`, `${base}/blob/${target}/`],
    [`\/jupyterlab\/jupyterlab\/tree\/${source}\/`, `${base}/tree/${target}/`],
    [`jupyterlab.readthedocs.io\/en\/.*?\/`, rtdString]
  ];

  // Make the string replacements
  files.forEach(filePath => {
    if (path.basename(filePath) === 'ensure-repo.ts') {
      return;
    }
    const oldData = fs.readFileSync(filePath, 'utf-8');
    let newData = oldData;
    urlMap.forEach(section => {
      const test = new RegExp(section[0], 'g');
      const replacer = section[1];
      if (newData.match(test)) {
        newData = newData.replace(test, replacer);
      }
    });

    // Make sure the root RTD links point to stable
    const badgeLink = '(http://jupyterlab.readthedocs.io/en/stable/)';
    const toReplace = badgeLink.replace('stable', rtdVersion);
    if (badgeLink !== toReplace) {
      while (newData.indexOf(toReplace) !== -1) {
        newData = newData.replace(toReplace, badgeLink);
      }
    }

    if (newData !== oldData) {
      messages.push(`Overwriting ${filePath}`);
      fs.writeFileSync(filePath, newData, 'utf-8');
    }
  });

  // Handle workflow file target branches
  const workflows = glob.sync(path.join('.github', 'workflows', '*.yml'));
  workflows.forEach(filePath => {
    let workflowData = fs.readFileSync(filePath, 'utf-8');
    const test = new RegExp(`\\[${source}\\]`, 'g');
    if (workflowData.match(test)) {
      if (workflowData.match(test)![1] !== `[${target}]`) {
        messages.push(`Overwriting ${filePath}`);
        workflowData = workflowData.replace(test, `[${target}]`);
        fs.writeFileSync(filePath, workflowData, 'utf-8');
      }
    }
  });

  return messages;
}

/**
 * Ensure the metapackage package.
 *
 * @returns An array of messages for changes.
 */
function ensureMetaPackage(): string[] {
  const basePath = path.resolve('.');
  const mpPath = path.join(basePath, 'packages', 'metapackage');
  const mpJson = path.join(mpPath, 'package.json');
  const mpData = utils.readJSONFile(mpJson);
  const messages: string[] = [];
  const seen: Dict<boolean> = {};

  utils.getCorePaths().forEach(pkgPath => {
    if (path.resolve(pkgPath) === path.resolve(mpPath)) {
      return;
    }
    const name = pkgNames[pkgPath];
    if (!name) {
      return;
    }
    seen[name] = true;
    const data = pkgData[name];
    let valid = true;

    // Ensure it is a dependency.
    if (!mpData.dependencies[name] && name !== '@jupyterlab/testing') {
      valid = false;
      mpData.dependencies[name] = '^' + data.version;
    }

    if (!valid) {
      messages.push(`Updated: ${name}`);
    }
  });

  // Make sure there are no extra deps.
  Object.keys(mpData.dependencies).forEach(name => {
    if (!(name in seen)) {
      messages.push(`Removing dependency: ${name}`);
      delete mpData.dependencies[name];
    }
  });

  // Add to build:all target
  mpData.scripts['build:all'] = 'npm run build';

  // Write the files.
  if (messages.length > 0) {
    utils.writePackageData(mpJson, mpData);
  }

  // Update the global data.
  pkgData[mpData.name] = mpData;

  return messages;
}

/**
 * Get the core data for the given core paths.
 */
function getCoreData(corePaths: string[]): CoreData {
  const coreData = new Map<string, any>();

  corePaths.forEach(pkgPath => {
    const dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }

    coreData.set(data.name, data);
  });

  return coreData;
}

/**
 * Ensure a core package.
 */
function ensureCorePackage(corePackage: any, corePaths: string[]) {
  corePackage.jupyterlab.extensions = {};
  corePackage.dependencies = {};

  const singletonPackages: string[] = corePackage.jupyterlab.singletonPackages;
  const coreData = getCoreData(corePaths);

  corePaths.forEach(pkgPath => {
    const dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }

    // If the package has a tokens.ts file, make sure it is noted as a singleton
    if (
      fs.existsSync(path.join(pkgPath, 'src', 'tokens.ts')) &&
      !singletonPackages.includes(data.name)
    ) {
      singletonPackages.push(data.name);
    }
  });

  // These are not sorted when writing out by default
  singletonPackages.sort();

  // Populate the yarn resolutions. First we make sure direct packages have
  // resolutions.
  coreData.forEach((data, name) => {
    // Insist on a restricted version in the yarn resolution.
    corePackage.resolutions[name] = `~${data.version}`;
  });

  // Then fill in any missing packages that should be singletons from the direct
  // package dependencies.
  coreData.forEach(data => {
    if (data.dependencies) {
      Object.entries(data.dependencies).forEach(([dep, version]) => {
        if (
          singletonPackages.includes(dep) &&
          !(dep in corePackage.resolutions)
        ) {
          corePackage.resolutions[dep] = version;
        }
      });
    }
  });

  // At this point, each singleton should have a resolution. Check this.
  const unresolvedSingletons = singletonPackages.filter(
    pkg => !(pkg in corePackage.resolutions)
  );
  if (unresolvedSingletons.length > 0) {
    throw new Error(
      `Singleton packages must have a resolved version number; these do not: ${unresolvedSingletons.join(
        ', '
      )}`
    );
  }
}

/**
 * Ensure the federated example core package.
 */
function ensureFederatedExample(): string[] {
  const basePath = path.resolve('.');
  const corePath = path.join(
    basePath,
    'examples',
    'federated',
    'core_package',
    'package.json'
  );
  const corePackage = utils.readJSONFile(corePath);
  // the list of dependencies might differ from the main JupyterLab application
  const dependencies = new Set(Object.keys(corePackage.dependencies));

  const corePaths = utils.getCorePaths().filter(p => {
    return dependencies.has(`@jupyterlab/${path.basename(p)}`);
  });

  ensureCorePackage(corePackage, corePaths);

  const coreData = getCoreData(corePaths);
  corePackage.jupyterlab.extensions = [];
  coreData.forEach((data, name) => {
    // Make sure it is included as a dependency.
    corePackage.dependencies[data.name] = `^${data.version}`;

    const meta = data.jupyterlab;
    const keep = meta?.extension || meta?.mimeExtension;
    if (!keep) {
      return;
    }
    corePackage.jupyterlab.extensions.push(name);
  });

  corePackage.jupyterlab.extensions.sort();

  // Write the package.json back to disk.
  if (utils.writePackageData(corePath, corePackage)) {
    return ['Updated federated example'];
  }
  return [];
}

/**
 * Ensure the jupyterlab application package.
 */
function ensureJupyterlab(): string[] {
  const basePath = path.resolve('.');
  const corePath = path.join(basePath, 'dev_mode', 'package.json');
  const corePackage = utils.readJSONFile(corePath);
  const corePaths = utils.getCorePaths();

  ensureCorePackage(
    corePackage,
    corePaths.filter(p => !/\/packages\/testing$/.test(p))
  );
  corePackage.jupyterlab.mimeExtensions = {};

  const coreData = getCoreData(corePaths);
  coreData.forEach((data, name) => {
    // Determine if the package wishes to be included in the top-level
    // dependencies.
    const meta = data.jupyterlab;
    const keep = !!(
      meta &&
      (meta.coreDependency || meta.extension || meta.mimeExtension)
    );
    if (!keep) {
      return;
    }

    // Make sure it is included as a dependency.
    corePackage.dependencies[data.name] = `~${data.version}`;

    // Handle extensions.
    ['extension', 'mimeExtension'].forEach(item => {
      let ext = data.jupyterlab[item];
      if (ext === true) {
        ext = '';
      }
      if (typeof ext !== 'string') {
        return;
      }
      corePackage.jupyterlab[`${item}s`][name] = ext;
    });
  });

  corePackage.jupyterlab.linkedPackages = {};
  utils.getLernaPaths().forEach(pkgPath => {
    const dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }
    // Skip private packages.
    if (data.private === true) {
      return;
    }

    // watch all src, build, and test files in the Jupyterlab project
    const relativePath = utils.ensureUnixPathSep(
      path.join('..', path.relative(basePath, pkgPath))
    );
    corePackage.jupyterlab.linkedPackages[data.name] = relativePath;
  });

  // Update the dev mode version.
  const curr = utils.getPythonVersion();
  corePackage.jupyterlab.version = curr;

  // Write the package.json back to disk.
  if (utils.writePackageData(corePath, corePackage)) {
    return ['Updated dev mode'];
  }
  return [];
}

/**
 * Ensure buildutils and builder bin files are symlinked
 */
function ensureBuildUtils() {
  const basePath = path.resolve('.');
  ['builder', 'buildutils'].forEach(packageName => {
    const utilsPackage = path.join(basePath, packageName, 'package.json');
    const utilsData = utils.readJSONFile(utilsPackage);
    for (const name in utilsData.bin) {
      const src = path.join(basePath, packageName, utilsData.bin[name]);
      const dest = path.join(basePath, 'node_modules', '.bin', name);
      try {
        fs.lstatSync(dest);
        fs.removeSync(dest);
      } catch (e) {
        // no-op
      }
      fs.symlinkSync(src, dest, 'file');
      fs.chmodSync(dest, 0o777);
    }
  });
}

/**
 * Ensure the repo integrity.
 */
export async function ensureIntegrity(): Promise<boolean> {
  const messages: Dict<string[]> = {};

  if (process.env.SKIP_INTEGRITY_CHECK === 'true') {
    console.log('Skipping integrity check');
    return true;
  }

  // Handle branch integrity
  const branchMessages = ensureBranch();
  if (branchMessages.length > 0) {
    messages['branch'] = branchMessages;
  }

  // Pick up all the package versions.
  const paths = utils.getLernaPaths();

  // This package is not part of the workspaces but should be kept in sync.
  paths.push('./jupyterlab/tests/mock_packages/mimeextension');

  const cssImports: Dict<string[]> = {};
  const cssModuleImports: Dict<string[]> = {};

  // Get the package graph.
  const graph = utils.getPackageGraph();

  // Gather all of our package data and other metadata.
  paths.forEach(pkgPath => {
    // Read in the package.json.
    let data: any;
    try {
      data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
    } catch (e) {
      console.error(e);
      return;
    }

    pkgData[data.name] = data;
    pkgPaths[data.name] = pkgPath;
    pkgNames[pkgPath] = data.name;
    locals[data.name] = pkgPath;
  });

  // Build up an ordered list of CSS imports for each local package.
  Object.keys(locals).forEach(name => {
    const data = pkgData[name];
    const deps: Dict<string> = data.dependencies || {};
    const skip = SKIP_CSS[name] || [];
    // Initialize cssData with explicit css imports if available
    const cssData: Dict<string[]> = {
      ...(data.jupyterlab && data.jupyterlab.extraStyles)
    };
    const cssModuleData: Dict<string[]> = {
      ...(data.jupyterlab && data.jupyterlab.extraStyles)
    };

    // Add automatic dependency css
    Object.keys(deps).forEach(depName => {
      // Bail for skipped imports and known extra styles.
      if (skip.includes(depName) || depName in cssData) {
        return;
      }

      const depData = graph.getNodeData(depName) as any;
      if (typeof depData.style === 'string') {
        cssData[depName] = [depData.style];
      }
      if (typeof depData.styleModule === 'string') {
        cssModuleData[depName] = [depData.styleModule];
      } else if (typeof depData.style === 'string') {
        cssModuleData[depName] = [depData.style];
      }
    });

    // Get our CSS imports in dependency order.
    cssImports[name] = [];
    cssModuleImports[name] = [];

    graph.dependenciesOf(name).forEach(depName => {
      if (depName in cssData) {
        cssData[depName].forEach(cssPath => {
          cssImports[name].push(`${depName}/${cssPath}`);
        });
      }
      if (depName in cssModuleData) {
        cssModuleData[depName].forEach(cssModulePath => {
          cssModuleImports[name].push(`${depName}/${cssModulePath}`);
        });
      }
    });
  });

  // Update the metapackage.
  let pkgMessages = ensureMetaPackage();
  if (pkgMessages.length > 0) {
    const pkgName = '@jupyterlab/metapackage';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Validate each package.
  for (const name in locals) {
    // application-top is handled elsewhere
    if (name === '@jupyterlab/application-top') {
      continue;
    }
    const unused = UNUSED[name] || [];
    // Allow jest-junit to be unused in the test suite.
    if (name.indexOf('@jupyterlab/test-') === 0) {
      unused.push('jest-junit');
    }

    const options: IEnsurePackageOptions = {
      pkgPath: pkgPaths[name],
      data: pkgData[name],
      depCache,
      missing: MISSING[name],
      unused,
      locals,
      cssImports: cssImports[name],
      cssModuleImports: cssModuleImports[name],
      differentVersions: DIFFERENT_VERSIONS,
      backwardVersions: BACKWARD_VERSIONS
    };

    if (name === '@jupyterlab/metapackage') {
      options.noUnused = false;
    }

    const pkgMessages = await ensurePackage(options);
    if (pkgMessages.length > 0) {
      messages[name] = pkgMessages;
    }
  }

  // ensure the icon svg imports
  pkgMessages = await ensureUiComponents(pkgPaths['@jupyterlab/ui-components']);
  if (pkgMessages.length > 0) {
    const pkgName = '@jupyterlab/ui-components';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Handle the top level package.
  const corePath = path.resolve('.', 'package.json');
  const coreData: any = utils.readJSONFile(corePath);
  if (utils.writePackageData(corePath, coreData)) {
    messages['top'] = ['Update package.json'];
  }

  // Handle buildutils
  ensureBuildUtils();

  // Handle the federated example application
  pkgMessages = ensureFederatedExample();
  if (pkgMessages.length > 0) {
    messages['@jupyterlab/example-federated-core'] = pkgMessages;
  }

  // Handle the JupyterLab application top package.
  pkgMessages = ensureJupyterlab();
  if (pkgMessages.length > 0) {
    messages['@application/top'] = pkgMessages;
  }

  // Handle any messages.
  if (Object.keys(messages).length > 0) {
    console.debug(JSON.stringify(messages, null, 2));
    if (process.argv.indexOf('--force') !== -1) {
      console.debug(
        '\n\nPlease run `jlpm run integrity` locally and commit the changes'
      );
      process.exit(1);
    }
    try {
      utils.run('jlpm install');
    } catch (error) {
      // Fallback in case this script is called during editable installation
      utils.run(`node jupyterlab/staging/yarn.js install`);
    }

    console.debug('\n\nMade integrity changes!');
    console.debug('Please commit the changes by running:');
    console.debug('git commit -a -m "Package integrity updates"');
    return false;
  }

  console.debug('Repo integrity verified!');
  return true;
}

if (require.main === module) {
  void ensureIntegrity().catch(e => {
    process.exitCode = 1;
    console.error(e);
  });
}
