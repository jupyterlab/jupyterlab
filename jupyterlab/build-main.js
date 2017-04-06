
var fs = require('fs-extra');
var childProcess = require('child_process');
var path = require('path');

fs.removeSync('./build');
fs.ensureDirSync('./build/node_modules');


childProcess.execSync('npm run build', { cwd: path.resolve('../packages/extension-builder') });
childProcess.execSync('npm run build', { cwd: path.resolve('../packages/main') });


var build = require('../packages/extension-builder').build
build({
    rootPath: '../packages/main',
    outPath: './build/node_modules/@jupyterlab/main'
});

fs.copySync('./src/package.json', './build/package.json');
fs.copySync('./src/index.js', './build/index.js');
fs.copySync('./src/webpack.config.js', './build/webpack.config.js');


childProcess.execSync('npm dedupe', { cwd: path.resolve('./build') });
fs.copySync('./node_modules', './build/node_modules', { dereference: true });
childProcess.execSync('npm run build', { cwd: path.resolve('./build') })
