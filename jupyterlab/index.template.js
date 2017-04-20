require('es6-promise/auto');  // polyfill Promise on IE'
require('font-awesome/css/font-awesome.min.css');
require('@jupyterlab/default-theme/style/index.css');

var app = require('@jupyterlab/application').JupyterLab;
var utils = require('@jupyterlab/services').utils;


function main() {
    lab = new app({
        gitDescription: process.env.GIT_DESCRIPTION,
        namespace: 'jupyterlab',
        version: process.env.JUPYTERLAB_VERSION
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
