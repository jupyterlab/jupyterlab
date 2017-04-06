
function main() {
    var app = require('@jupyterlab/main').app;
    var extensions = require('@jupyterlab/main').extensions;

    lab = new app({
        gitDescription: '2',
        namespace: 'jupyterlab',
        version: '1'
    });
    lab.registerPluginModules(extensions);
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
