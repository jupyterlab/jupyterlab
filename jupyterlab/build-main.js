
var fs = require('fs-extra');
var build = require('../packages/extension-builder').build
var childProcess = require('child_process');
var path = require('path');

fs.removeSync('./build');
fs.ensureDirSync('./build/node_modules');
fs.copySync('../node_modules', './build/node_modules');

build({
    rootPath: '../packages/main',
    outPath: './build/node_modules/@jupyterlab/main'
});

fs.copySync('./package.json', './build/package.json');
fs.copySync('./index.js', './build/index.js');
fs.copySync('./webpack.config.js', './build/webpack.config.js');


childProcess.execSync('npm install', { cwd: path.resolve('./build') });
childProcess.execSync('npm run build', { cwd: path.resolve('./build') })
