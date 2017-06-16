require('es6-promise/auto');  // polyfill Promise on IE

var PageConfig = require('@jupyterlab/coreutils').PageConfig;
__webpack_public_path__ = PageConfig.getOption('publicUrl');

// This needs to come after __webpack_public_path__ is set.
require('font-awesome/css/font-awesome.min.css');
// Load the core theming before any other package.
require('@jupyterlab/theming/style/index.css');

var app = require('@jupyterlab/application').JupyterLab;

function main() {
    var version = PageConfig.getOption('appVersion') || 'unknown';
    var name = PageConfig.getOption('appName') || 'JupyterLab';
    var namespace = PageConfig.getOption('appNamespace') || 'jupyterlab';
    var devMode = PageConfig.getOption('devMode') || 'false';
    var settingsDir = PageConfig.getOption('settingsDir') || '';
    var assetsDir = PageConfig.getOption('assetsDir') || '';

    if (version[0] === 'v') {
        version = version.slice(1);
    }
    var disabled = [];
    try {
        var option = PageConfig.getOption('disabledExtensions');
        disabled = JSON.parse(option);
    } catch (e) {
        // No-op
    }

    lab = new app({
        namespace: namespace,
        name: name,
        version: version,
        devMode: devMode.toLowerCase() === 'true',
        settingsDir: settingsDir,
        assetsDir: assetsDir
    });
    {{#each jupyterlab_extensions}}
    try {
        if (disabled.indexOf('{{this}}') === -1) {
            lab.registerPluginModule(require('{{this}}'));
        }
    } catch (e) {
        console.error(e);
    }
    {{/each}}
    var ignorePlugins = [];
    try {
        var option = PageConfig.getOption('ignorePlugins');
        ignorePlugins = JSON.parse(option);
    } catch (e) {
        // No-op
    }
    lab.start({ "ignorePlugins": ignorePlugins });
}

window.onload = main;
