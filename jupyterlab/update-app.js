var data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

let names = Object.keys(data.jupyterlab.extensions).filter(function(name) {
  packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});
Build.ensureAssets({
  packageNames: names,
  output: '..'
});

// Hacks to be removed in 0.28 final release.
var path = require('path');
var fs = require('fs-extra');

var base = path.join('.', 'node_modules', '@jupyterlab');
var schemas = path.join('..', 'schemas');

var src = path.join(base, 'shortcuts-extension', 'schema', 'plugin.json')
var dest = path.join(schemas, 'jupyter.extensions.shortcuts.json')
fs.copySync(src, dest)

src = path.join(base, 'apputils-extension', 'schema', 'themes.json')
dest = path.join(schemas, 'jupyter.services.theme-manager.json')
fs.copySync(src, dest)

src = path.join(base, 'codemirror-extension', 'schema', 'commands.json')
dest = path.join(schemas, 'jupyter.services.codemirror-commands.json')
fs.copySync(src, dest)

src = path.join(base, 'fileeditor-extension', 'schema', 'plugin.json')
dest = path.join(schemas, 'jupyter.services.editor-tracker.json')
fs.copySync(src, dest)