
var fs = require('fs-extra');
var childProcess = require('child_process');
var path = require('path');

fs.removeSync('./default-extensions');

childProcess.execSync('npm run build', { cwd: path.resolve('../packages/all-packages') });

var build = require('../packages/extension-builder').build
build({
    rootPath: '../packages/default-extensions',
    outPath: './default-extensions'
});
