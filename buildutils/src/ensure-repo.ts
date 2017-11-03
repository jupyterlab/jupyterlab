/*-----------------------------------------------------------------------------
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
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as utils from './utils';
import { ensurePackage } from './ensure-package';


// Data to ignore.
let MISSING: { [key: string]: string[] } = {
  '@jupyterlab/buildutils': ['path']
};

let UNUSED: { [key: string]: string[] } = {
  '@jupyterlab/apputils-extension': ['es6-promise'],
  '@jupyterlab/theme-dark-extension': ['font-awesome'],
  '@jupyterlab/theme-light-extension': ['font-awesome'],
  '@jupyterlab/vega2-extension': ['d3', 'vega', 'vega-lite']
};

let pkgData: { [key: string]: any } = {};
let pkgPaths: { [key: string]: string } = {};
let pkgNames: { [key: string]: string } = {};
let depCache: { [key: string]: string } = {};


/**
 * Ensure the metapackage package.
 *
 * @returns An array of messages for changes.
 */
function ensureMetaPackage(): string[] {
  let basePath = path.resolve('.');
  let MetaPackagePath = path.join(basePath, 'packages', 'metapackage');
  let allPackageJson = path.join(MetaPackagePath, 'package.json');
  let allPackageData = utils.readJSONFile(allPackageJson);
  let indexPath = path.join(MetaPackagePath, 'src', 'index.ts');
  let index = fs.readFileSync(indexPath, 'utf8');
  let lines = index.split('\n').slice(0, 3);
  let messages: string[] = [];
  let seen: { [key: string]: boolean } = {};

  utils.getCorePaths().forEach(pkgPath => {
    if (pkgPath === MetaPackagePath) {
      return;
    }
    let name = pkgNames[pkgPath];
    if (!name) {
      return;
    }
    seen[name] = true;
    let data = pkgData[name];
    let valid = true;

    // Ensure it is a dependency.
    if (!allPackageData.dependencies[name]) {
      valid = false;
      allPackageData.dependencies[name] = '^' + data.version;
    }

    // Ensure it is in index.ts
    if (index.indexOf(name) === -1) {
      valid = false;
    }
    lines.push(`import "${name}";`);

    if (!valid) {
      messages.push(`Updated: ${name}`);
    }
  });

  // Make sure there are no extra deps.
  Object.keys(allPackageData.dependencies).forEach(name => {
    if (!(name in seen)) {
      messages.push(`Removing dependency: ${name}`);
      delete allPackageData.dependencies[name];
    }
  });

  // Write the files.
  if (messages.length > 0) {
    utils.ensurePackageData(allPackageData, allPackageJson);
  }
  let newIndex = lines.join('\n');
  if (newIndex !== index) {
    messages.push('Index changed');
    fs.writeFileSync(indexPath, lines.join('\n'));
  }

  return messages;
}


/**
 * Ensure the jupyterlab application package.
 */
function ensureJupyterlab(): string[] {
  // Get the current version of JupyterLab
  let cmd = 'python setup.py --version';
  let version = String(childProcess.execSync(cmd)).trim();

  let basePath = path.resolve('.');
  let corePath = path.join(basePath, 'jupyterlab', 'package.json');
  let corePackage = utils.readJSONFile(corePath);

  corePackage.jupyterlab.extensions = {};
  corePackage.jupyterlab.mimeExtensions = {};
  corePackage.jupyterlab.version = version;
  corePackage.jupyterlab.linkedPackages = {};
  corePackage.dependencies = {};

  let singletonPackages = corePackage.jupyterlab.singletonPackages;

  utils.getCorePaths().forEach(pkgPath => {
    let dataPath = path.join(pkgPath, 'package.json');
    let data: any;
    try {
       data = utils.readJSONFile(dataPath);
    } catch (e) {
      return;
    }
    if (data.private === true) {
      return;
    }

    // Make sure it is included as a dependency.
    corePackage.dependencies[data.name] = '^' + String(data.version);
    let relativePath = path.join('..', 'packages', path.basename(pkgPath));
    corePackage.jupyterlab.linkedPackages[data.name] = relativePath;
    // Add its dependencies to the core dependencies if they are in the
    // singleton packages.
    let deps = data.dependencies || {};
    for (let dep in deps) {
      if (singletonPackages.indexOf(dep) !== -1) {
        corePackage.dependencies[dep] = deps[dep];
      }
    }

    let jlab = data.jupyterlab;
    if (!jlab) {
      return;
    }

    // Handle extensions.
    ['extension', 'mimeExtension'].forEach(item => {
      let ext = jlab[item];
      if (ext === true) {
        ext = '';
      }
      if (typeof ext !== 'string') {
        return;
      }
      corePackage.jupyterlab[item + 's'][data.name] = ext;
    });
  });

  // Write the package.json back to disk.
  if (utils.ensurePackageData(corePackage, corePath)) {
    return ['Updated core'];
  }
  return [];
}


/**
 * Ensure the repo integrity.
 */
function ensureIntegrity(): void {
  let messages: { [key: string]: string[] } = {};

  // Pick up all the package versions.
  utils.getLernaPaths().forEach(pkgPath => {
    // Read in the package.json.
    let data: any;
    try {
      data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
    } catch (e) {
      return;
    }

    pkgData[data.name] = data;
    pkgPaths[data.name] = pkgPath;
    pkgNames[pkgPath] = data.name;
  });

  // Validate each package.
  for (let name in pkgData) {
    let options = {
      pkgPath: pkgPaths[name],
      data: pkgData[name],
      depCache,
      missing: MISSING[name],
      unused: UNUSED[name]
    };
    let pkgMessages = ensurePackage(options);
    if (pkgMessages.length > 0) {
      messages[name] = pkgMessages;
    }
  }

  // Handle the top level package.
  let corePath = path.resolve('.', 'package.json');
  let coreData: any = utils.readJSONFile(corePath);
  if (utils.ensurePackageData(coreData, corePath)) {
    messages['top'] = ['Update package.json'];
  }

  // Handle the metapackage metapackage.
  let pkgMessages = ensureMetaPackage();
  if (pkgMessages.length > 0) {
    let pkgName ='@jupyterlab/metapackage';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Handle the JupyterLab application top package.
  pkgMessages = ensureJupyterlab();
  if (pkgMessages.length > 0) {
    let pkgName = '@jupyterlab/application-top';
    if (!messages[pkgName]) {
      messages[pkgName] = [];
    }
    messages[pkgName] = messages[pkgName].concat(pkgMessages);
  }

  // Handle any messages.
  if (Object.keys(messages).length > 0) {
    console.log(JSON.stringify(messages, null, 2));
    if (process.env.TRAVIS_BRANCH) {
      console.log('\n\nPlease run `npm run integrity` locally and commit the changes');
      process.exit(1);
    }
    utils.run('npm install');
    console.log('\n\nPlease commit the changes by running:');
    console.log('git commit -a -m "Package integrity updates"');
  } else {
    console.log('Repo integrity verified!');
  }
}

ensureIntegrity();
