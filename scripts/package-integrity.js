/**
 * Verify the integrity of each package - ensure package json matches
 * imports
 */
var readFileSync = require("fs").readFileSync;
var writeFileSync = require("fs").writeFileSync;
var ts = require("typescript");
var glob = require("glob");
var childProcess = require('child_process');
var path = require('path');


// Packages to ignore
var IGNORE = ['..', '.', 'd3', 'vega', 'vega-lite', 'font-awesome', 'es6-promise'];


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
function validate(dname) {
    filenames = glob.sync(dname + '/src/*.ts*');
    filenames = filenames.concat(glob.sync(dname + '/src/**/*.ts*'));

    if (filenames.length == 0) {
        return [];
    }

    var imports = [];

    try {
        var pkg = require(path.resolve(dname) + '/package.json');
    } catch (e) {
        return [];
    }
    var deps = pkg['dependencies'];

    // Extract all of the imports from the TypeScript files.
    filenames.forEach(fileName => {
        var sourceFile = ts.createSourceFile(fileName, readFileSync(fileName).toString(), ts.ScriptTarget.ES6, /*setParentNodes */ true);
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
        if (IGNORE.indexOf(name) !== -1) {
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
        }
        if (IGNORE.indexOf(name) !== -1) {
            return;
        }
        if (names.indexOf(name) === -1) {
            problems.push('Unused package: ' + name);
        }
    });
    return problems;
}

// Find all of the packages.
var basePath = path.resolve('.');
var lernaConfig = require(path.join(basePath, 'lerna.json'));

// Gather the versions of each package.
var versions = {};
lernaConfig.packages.forEach(function(spec) {
    var dirs = glob.sync(path.join(basePath, spec));
    dirs.forEach(function(dname) {
        try {
            var pkg = require(path.resolve(dname) + '/package.json');
            versions[pkg['name']] = pkg['version'];
        } catch (e) {
            return;
        }
    });
});

var errors = {};

// Validate each package.
lernaConfig.packages.forEach(function(spec) {
    var dirs = glob.sync(path.join(basePath, spec));
    dirs.forEach(function(dname) {
        var name = path.relative('.', dname);
        var problems = validate(dname);
        if (problems.length > 0) {
            errors[name] = problems;
        }
    });
});

// Handle any errors.
if (Object.keys(errors).length > 0) {
    console.log('Package integrity failures:')
    console.log(JSON.stringify(errors, null, 2));
    process.exit(1);
}
