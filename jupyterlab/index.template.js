require('es6-promise/auto');  // polyfill Promise on IE'
require('font-awesome/css/font-awesome.min.css');
require('@jupyterlab/default-theme/style/index.css');

var app = require('@jupyterlab/application').JupyterLab;
var utils = require('@jupyterlab/services').utils;


function main() {
    var version = utils.getConfigOption('appVersion') || 'unknown';
    var name = utils.getConfigOption('appName') || 'JupyterLab';
    var namespace = utils.getConfigOption('appNamespace') || 'jupyterlab';
    var devMode = utils.getConfigOption('devMode') || 'false';

    if (version[0] === 'v') {
        version = version.slice(1);
    }

    lab = new app({
        namespace: namespace,
        name: name,
        version: version,
        devMode: devMode.toLowerCase() === 'true'
    });
    {{#each jupyterlab_extensions}}
    try {
        lab.registerPluginModule(require('{{this}}'));
    } catch (e) {
        console.error(e);
    }
    {{/each}}
    var ignorePlugins = [];
    try {
        var option = utils.getConfigOption('ignorePlugins');
        ignorePlugins = JSON.parse(option);
    } catch (e) {
        console.error("Invalid ignorePlugins config:", option);
    }
    lab.start({ "ignorePlugins": ignorePlugins });
}

window.onload = main;
