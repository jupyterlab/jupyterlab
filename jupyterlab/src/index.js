
require('es6-promise/auto');  // polyfill Promise on IE'
require('font-awesome/css/font-awesome.min.css');
require('@jupyterlab/default-theme/style/index.css');

var app = require('@jupyterlab/application').JupyterLab;
var mainExtensions = require('@jupyterlab/main');


function main() {
    lab = new app({
        gitDescription: process.env.GIT_DESCRIPTION,
        namespace: 'jupyterlab',
        version: process.env.JUPYTERLAB_VERSION
    });
    lab.registerPluginModule(mainExtensions);
    {% for extension in jupyterlab_extensions %}
    try {
        lab.registerPluginModule(require('{{extension}}'));
    } catch (e) {
        console.error(e);
    }
    {% endfor %}
    lab.start();
}

window.onload = main;
