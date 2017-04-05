

function main() {
    var JupyterLab = require('@jupyterlab/application').JupyterLab;
    var extensions = require('./lib').extensions;

    lab = new JupyterLab({
        gitDescription: '2',
        namespace: 'jupyterlab',
        version: '1'
    });
    lab.registerPluginModules(extensions);
    lab.start();
}

window.onload = main;
