
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

fs.copySync('./src/webpack.config.js', './build/webpack.config.js');
