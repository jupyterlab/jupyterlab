// Get the appropriate dependency for a package.
var childProcess = require('child_process');
var path = require('path');
var glob = require('glob');
var sortPackageJson = require('sort-package-json');
var ts = require("typescript");
var fs = require('fs');


// Ensure that the lerna package versions are the same everywhere
// Ensure all imports are used

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

// Look in all of the packages.
var basePath = path.resolve('.');
var lernaConfig = require(path.join(basePath, 'lerna.json'));
var paths = [];
for (let spec of lernaConfig.packages) {
  paths = paths.concat(glob.sync(path.join(basePath, spec)));
}

var versions = {};

// Pick up all the package versions.
paths.forEach(function(pkgPath) {
// Read in the package.json.
  try {
    var package = require(path.join(pkgPath, 'package.json'));
  } catch (e) {
    console.log('Skipping package ' + pkgPath);
    return;
  }

  versions[package.name] = package.version;
});


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
 * Validate the integrity of a package in a directory.
 */
function validate(dname, pkg) {
    filenames = glob.sync(path.join(dname, 'src/*.ts*'));
    filenames = filenames.concat(glob.sync(path.join(dname, 'src/**/*.ts*')));

    if (filenames.length == 0) {
        return [];
    }

    var imports = [];
    var deps = pkg['dependencies'];

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

    var problems = [];
    names.forEach(function(name) {
        if (MISSING[pkg.name] && MISSING[pkg.name].indexOf(name) !== -1) {
            return;
        }
        if (name == '.' || name == '..') {
            return;
        }
        if (!deps[name]) {
            problems.push('Missing package: ' + name);
        }
    });
    Object.keys(deps).forEach(function(name) {
        if (versions[name]) {
            var desired = '^' + versions[name];
            if (deps[name] !== desired) {
                problems.push('Bad core version: ' + name + ' should be ' + desired);
            }
            pkg.dependencies[name] = versions[name];
        }
        if (UNUSED[pkg.name] && UNUSED[pkg.name].indexOf(name) !== -1) {
            return;
        }
        if (names.indexOf(name) === -1) {
            problems.push('Unused package: ' + name);
            delete pkg.dependencies[name]
        }
    });

    // Write out changed files using sort-package-json
    var text = JSON.stringify(sortPackageJson(pkg), null, 2) + '\n';
    var pkgJsonPath = path.resolve(path.join(dname, 'package.json'));
    fs.writeFileSync(pkgJsonPath, text);

    return problems;
}


// TODO: ensure all-packages



var errors = {};

// Validate each package.
paths.forEach(function(pkgPath) {
    try {
        var pkg = require(path.resolve(path.join(pkgPath, 'package.json')));
    } catch (e) {
        return;
    }
    var problems = validate(pkgPath, pkg);
    if (problems.length > 0) {
        errors[pkg.name] = problems;
    }
});


// Handle any errors.
if (Object.keys(errors).length > 0) {
    console.log('Package integrity failures:')
    console.log(JSON.stringify(errors, null, 2));
    process.exit(1);
}
