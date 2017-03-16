var readFileSync = require("fs").readFileSync;
var writeFileSync = require("fs").writeFileSync;
var ts = require("typescript");
var glob = require("glob");
var childProcess = require('child_process');
var path = require('path');


function getImports(sourceFile) {
    var imports = [];
    handleNode(sourceFile);

    function handleNode(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
                var name = node.moduleSpecifier.getText();
                name = name.slice(1, name.length - 1);
                imports.push(name);
                break;
        }
        ts.forEachChild(node, handleNode);
    }
    return imports;
}


var dname = process.argv[2];
glob(dname + '/src/*.ts', function(er, filenames) {

    var imports = [];
    var package = require(path.resolve(dname) + '/package.json');
    package['name'] = '@jupyterlab/' + path.basename(dname);
    package['version'] = '0.1.0';

    filenames.forEach(fileName => {

        // Parse a file
        let sourceFile = ts.createSourceFile(fileName, readFileSync(fileName).toString(), ts.ScriptTarget.ES6, /*setParentNodes */ true);

        imports = imports.concat(getImports(sourceFile));
    });

    var names = Array.from(new Set(imports)).sort();
    for (let i = 0; i < names.length; i++) {
        if (names[i].slice(0, 2) === '..') {
            process.stdout.write(names[i] + '\n');
            let name = names[i].split('../').join('');
            name = '@jupyterlab/' + name;
            package['dependencies'][name] = '^0.1.0';
        }
    }
    writeFileSync(path.resolve(dname) + '/package.json', JSON.stringify(package, null, 2));

    for (let i = 0; i < names.length; i++) {
        if (names[i] in package['dependencies']) {
            continue;
        }
        if (names[i][0] !== '.') {
            process.stdout.write(names[i] + '\n');
            var cmd = 'npm install --save ' + names[i] + '@latest';
            try {
                childProcess.execSync(cmd, { stdio: [0, 1, 2] });
            } catch (err) {
                process.stdout.write('skipping ' + files[i] + '\n');
            }
        }
    }
});
