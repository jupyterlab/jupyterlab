/**
 * Ensure the integrity of the packages in the repo.
 *
 * Ensure the core package version dependencies match everywhere.
 * Ensure imported packages match dependencies.
 * Ensure a consistent version of all packages.
 * Manage the all-packages meta package.
 */
import childProcess = require('child_process');
import path = require('path');
import glob = require('glob');
import ts = require('typescript');
import fs = require('fs-extra');
import getDependency = require('./get-dependency');
import utils = require('./utils');


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
let seenDeps: { [key: string]: string } = {};


/**
 * Ensure the integrity of a package.
 */
function ensurePackage(pkgName: string): string[] {
  let dname = pkgPaths[pkgName];
  let data = pkgData[pkgName];
  let deps: { [key: string]: string } = data.dependencies;
  let devDeps: { [key: string]: string } = data.devDependencies;
  let messages: string[] = [];

  // Verify dependencies are consistent.
  Object.keys(deps).forEach(name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency.getDependency(name);
    }
    if (deps[name] !== seenDeps[name]) {
      messages.push('Updated dependency: ' + name);
    }
    deps[name] = seenDeps[name];
  });

  // Verify devDependencies are consistent.
  Object.keys(devDeps).forEach(name => {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency.getDependency(name);
    }
    if (devDeps[name] !== seenDeps[name]) {
      messages.push('Updated devDependency: ' + name);
    }
    devDeps[name] = seenDeps[name];
  });

  // For TypeScript files, verify imports match dependencies.
  let filenames: string[] = [];
  filenames = glob.sync(path.join(dname, 'src/*.ts*'));
  filenames = filenames.concat(glob.sync(path.join(dname, 'src/**/*.ts*')));

  if (filenames.length === 0) {
    if (utils.ensurePackageData(data, path.join(dname, 'package.json'))) {
      messages.push('foo');
    }
    return messages;
  }

  let imports: string[] = [];

  // Extract all of the imports from the TypeScript files.
  filenames.forEach(fileName => {
    let sourceFile = ts.createSourceFile(fileName,
        fs.readFileSync(fileName).toString(), (ts.ScriptTarget as any).ES6,
        /*setParentNodes */ true);
    imports = imports.concat(getImports(sourceFile));
  });
  let names: string[] = Array.from(new Set(imports)).sort();
  names = names.map(function(name) {
    let parts = name.split('/');
    if (name.indexOf('@') === 0) {
      return parts[0] + '/' + parts[1];
    }
    return parts[0];
  });

  // Look for imports with no dependencies.
  names.forEach(name => {
    if (MISSING[pkgName] && MISSING[pkgName].indexOf(name) !== -1) {
      return;
    }
    if (name === '.' || name === '..') {
      return;
    }
    if (!deps[name]) {
      messages.push('Missing dependency: ' + name);
      if (!(name in seenDeps)) {
        seenDeps[name] = getDependency.getDependency(name);
      }
      deps[name] = seenDeps[name];
    }
  });

  // Look for unused packages
  Object.keys(deps).forEach(name => {
    if (UNUSED[pkgName] && UNUSED[pkgName].indexOf(name) !== -1) {
      return;
    }
    if (names.indexOf(name) === -1) {
      messages.push('Unused dependency: ' + name);
      delete data.dependencies[name];
    }
  });

  if (utils.ensurePackageData(data, path.join(dname, 'package.json'))) {
    messages.push('bar');
  }
  return messages;
}


/**
 * Extract the module imports from a TypeScript source file.
 *
 * @param sourceFile - The path to the source file.
 *
 * @returns An array of package names.
 */
function getImports(sourceFile: ts.SourceFile): string[] {
  let imports: string[] = [];
  handleNode(sourceFile);

  function handleNode(node: any): void {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        imports.push(node.moduleSpecifier.text);
        break;
      case ts.SyntaxKind.ImportEqualsDeclaration:
        imports.push(node.moduleReference.expression.text);
        break;
      default:
        // no-op
    }
    ts.forEachChild(node, handleNode);
  }
  return imports;
}


/**
 * Ensure the all-packages package.
 *
 * @returns An array of messages for changes.
 */
function ensureAllPackages(): string[] {
  let basePath = path.resolve('.');
  let allPackagesPath = path.join(basePath, 'packages', 'all-packages');
  let allPackageJson = path.join(allPackagesPath, 'package.json');
  let allPackageData = require(allPackageJson);
  let indexPath = path.join(allPackagesPath, 'src', 'index.ts');
  let index = fs.readFileSync(indexPath, 'utf8');
  let lines = index.split('\n').slice(0, 3);
  let messages: string[] = [];

  utils.getCorePaths().forEach(pkgPath => {
    if (pkgPath === allPackagesPath) {
      return;
    }
    let name = pkgNames[pkgPath];
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
    lines.push('import "' + name + '";\n');

    if (!valid) {
      messages.push('Updated: ' + name);
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
  let corePackage = require(corePath);

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
       data = require(dataPath);
    } catch (e) {
      return;
    }
    if (data.private === true) {
      return;
    }

    // Make sure it is included as a dependency.
    corePackage.dependencies[data.name] = '^' + String(data.version);
    let relativePath = path.join('..', 'packages' + path.basename(pkgPath));
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
      data = require(path.join(pkgPath, 'package.json'));
    } catch (e) {
      return;
    }

    pkgData[data.name] = data;
    pkgPaths[data.name] = pkgPath;
    pkgNames[pkgPath] = data.name;
  });

  // Validate each package.
  for (let name in pkgData) {
    let pkgMessages = ensurePackage(name);
    if (pkgMessages.length > 0) {
      messages[name] = pkgMessages;
    }
  }

  // Handle the top level package.
  let corePath: string = path.resolve('.', 'package.json');
  let coreData: any = require(corePath);
  if (utils.ensurePackageData(coreData, corePath)) {
    messages['baz'] = ['buzz'];
  }

  // Handle the all-packages metapackage.
  let pkgMessages = ensureAllPackages();
  if (pkgMessages.length > 0) {
    let pkgName ='@jupyterlab/all-packages';
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
    } else {
      console.log('\n\nPlease commit the changes by running:');
      console.log('git commit -a -m "Package integrity updates"');
    }
    if (process.env.TRAVIS_BRANCH) {
      process.exit(1);
    }
  } else {
    console.log('Repo integrity verified!');
  }
}

ensureIntegrity();
