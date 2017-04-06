
var fs = require('fs-extra');
var childProcess = require('child_process');
var path = require('path');

fs.removeSync('./build');
fs.ensureDirSync('./build/node_modules');


childProcess.execSync('npm run build', { cwd: path.resolve('../packages/all-packages') });


var build = require('../packages/extension-builder').build
build({
    rootPath: '../packages/default-extensions',
    outPath: './build/node_modules/@jupyterlab/default-extensions'
});

fs.copySync('./src/webpack.config.js', './build/webpack.config.js');
