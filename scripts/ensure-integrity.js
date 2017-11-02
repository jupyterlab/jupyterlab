/**
 * Ensure the integrity of the packages in the repo.
 *
 * Ensure the core package version dependencies match everywhere.
 * Ensure imports match dependencies for TypeScript packages.
 * Manage the all-packages meta package.
 */
var path = require('path');
var glob = require('glob');
var ts = require("typescript");
var fs = require('fs-extra');
var getDependency = require('./get-dependency');
var utils = require('./utils');


// Data to ignore.
var MISSING = {
  "@jupyterlab/buildutils": ["path"]
}

var UNUSED = {
  "@jupyterlab/apputils-extension": ["es6-promise"],
  "@jupyterlab/theme-dark-extension": ["font-awesome"],
  "@jupyterlab/theme-light-extension": ["font-awesome"],
  "@jupyterlab/vega2-extension": ["d3","vega","vega-lite"]
}

var pkgData = {};
var pkgPaths = {};
var pkgNames = {};
var seenDeps = {};


/**
 * Ensure the integrity of a package.
 */
function ensurePackage(pkgName) {
  var dname = pkgPaths[pkgName];
  var data = pkgData[pkgName];
  var deps = data.dependencies;
  var devDeps = data.devDependencies;
  var messages = [];

  // Verify dependencies are consistent.
  Object.keys(deps).forEach(function(name) {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency(name);
    }
    deps[name] = seenDeps[name];
  });

  // Verify devDependencies are consistent.
  Object.keys(devDeps).forEach(function(name) {
    if (!(name in seenDeps)) {
      seenDeps[name] = getDependency(name);
    }
    devDeps[name] = seenDeps[name];
  });

  // For TypeScript files, verify imports match dependencies.
  filenames = glob.sync(path.join(dname, 'src/*.ts*'));
  filenames = filenames.concat(glob.sync(path.join(dname, 'src/**/*.ts*')));

  if (filenames.length == 0) {
    if (utils.ensurePackageData(data, path.join(dname, 'package.json'))) {
      messages.push('Package data changed');
    }
    return messages;
  }

  var imports = [];

  // Extract all of the imports from the TypeScript files.
  filenames.forEach(fileName => {
    var sourceFile = ts.createSourceFile(fileName,
        fs.readFileSync(fileName).toString(), ts.ScriptTarget.ES6,
        /*setParentNodes */ true);
    imports = imports.concat(getImports(sourceFile));
  });
  var names = Array.from(new Set(imports)).sort();
  names = names.map(function(name) {
    var parts = name.split('/');
    if (name.indexOf('@') === 0) {
      return parts[0] + '/' + parts[1];
    }
    return parts[0];
  })

  // Look for imports with no dependencies.
  names.forEach(function(name) {
    if (MISSING[pkgName] && MISSING[pkgName].indexOf(name) !== -1) {
      return;
    }
    if (name == '.' || name == '..') {
      return;
    }
    if (!deps[name]) {
      messages.push('Missing dependency: ' + name);
      if (!(name in seenDeps)) {
        seenDeps[name] = getDependency(name);
      }
      deps[name] = seenDeps[name];
    }
  });

  // Look for unused packages
  Object.keys(deps).forEach(function(name) {
    if (UNUSED[pkgName] && UNUSED[pkgName].indexOf(name) !== -1) {
      return;
    }
    if (names.indexOf(name) === -1) {
      messages.push('Unused dependency: ' + name);
      delete data.dependencies[name]
    }
  });

  if (utils.ensurePackageData(data, path.join(dname, 'package.json'))) {
    messages.push('Package data changed');
  }
  return messages;
}


/**
 * Extract the module imports from a TypeScript source file.
 */
function getImports(sourceFile) {
  var imports = [];
  handleNode(sourceFile);

  function handleNode(node) {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        imports.push(node.moduleSpecifier.text);
        break;
      case ts.SyntaxKind.ImportEqualsDeclaration:
        imports.push(node.moduleReference.expression.text);
        break;
    }
    ts.forEachChild(node, handleNode);
  }
  return imports;
}


/**
 * Ensure the all-packages package.
 */
function ensureAllPackages() {
  var basePath = path.resolve('.');
  var allPackagesPath = path.join(basePath, 'packages', 'all-packages');
  var allPackageJson = path.join(allPackagesPath, 'package.json');
  var allPackageData = require(allPackageJson);
  var tsconfigPath = path.join(allPackagesPath, 'tsconfig.json');
  var tsconfig = require(tsconfigPath);
  var indexPath = path.join(allPackagesPath, 'src', 'index.ts');
  var index = fs.readFileSync(indexPath, 'utf8');
  var lines = index.split('\n').slice(0, 3);
  var messages = [];

  utils.getCorePaths().forEach(function (pkgPath) {
    if (pkgPath === allPackagesPath) {
      return;
    }
    var name = pkgNames[pkgPath];
    var data = pkgData[name];
    var valid = true;

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
  if (utils.ensurePackageData(allPackageData, allPackageJson)) {
    messages.push('Package data changed');
  }
  var newIndex = lines.join('\n');
  if (newIndex != index) {
    messages.push('Index changed');
    fs.writeFileSync(indexPath, lines.join('\n'));
  }

  return messages;
}


/**
 * Ensure the repo integrity.
 */
function ensureIntegrity() {
  var messages = {};

  // Pick up all the package versions.
  utils.getLernaPaths().forEach(function(pkgPath) {
    pkgPath = path.resolve(pkgPath);
    // Read in the package.json.
    try {
      var package = require(path.join(pkgPath, 'package.json'));
    } catch (e) {
      return;
    }

    pkgData[package.name] = package;
    pkgPaths[package.name] = pkgPath;
    pkgNames[pkgPath] = package.name;
  });

  // Validate each package.
  for (let name in pkgData) {
    var pkgMessages = ensurePackage(name);
    if (pkgMessages.length > 0) {
      messages[name] = pkgMessages;
    }
  };

  // Handle the all-packages metapackage.
  var pkgMessages = ensureAllPackages();
  if (pkgMessages.length > 0) {
    var allName ='@jupyterlab/all-packages';
    if (!messages[allName]) {
      messages[allName] = [];
    }
    messages[allName] = messages[allName].concat(pkgMessages);
  }

  // Handle any messages.
  if (Object.keys(messages).length > 0) {
    console.log(JSON.stringify(messages, null, 2));
    if (process.env.TRAVIS_BRANCH) {
      console.log('\n\nPlease run `npm run integrity` locally and commit the changes');
    } else {
      console.log('\n\nPlease commit the changes by running:');
      console.log('git commit -a -m "Package integrity updates"')
    }
    process.exit(1);
  } else {
    console.log('Repo integrity verified!');
  }
}

ensureIntegrity();
