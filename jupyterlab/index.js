require('es6-promise/auto');  // polyfill Promise on IE

var PageConfig = require('@jupyterlab/coreutils').PageConfig;
__webpack_public_path__ = PageConfig.getOption('publicUrl');

// This needs to come after __webpack_public_path__ is set.
require('font-awesome/css/font-awesome.min.css');
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

    // Get the disabled extensions.
    var disabled = [];
    try {
        var option = PageConfig.getOption('disabledExtensions');
        disabled = JSON.parse(option);
    } catch (e) {
        // No-op
    }

    // Get the deferred extensions.
    var deferredExtensions = [];
    var ignorePlugins = [];
    try {
        var option = PageConfig.getOption('deferredExtensions');
        deferredExtensions = JSON.parse(option).map(function(pattern) {
            return { raw: pattern, rule: new RegExp(pattern) };
        });
    } catch (e) {
        // No-op
    }

    // Handle the registered mime extensions.
    var mimeExtensions = [];
    {{#each jupyterlab_mime_extensions}}
    try {
        var deferred = !deferredExtensions.some(function(pattern) {
            return pattern.raw === '{{@key}}' || pattern.rule.test('{{@key}}')
        });
        var enabled = !disabled.some(function(pattern) {
            return pattern.raw === '{{@key}}' || pattern.rule.test('{{@key}}')
        });

        if (deferred) {
            ignorePlugins.push('{{key}}');
        }
        if (enabled) {
            mimeExtensions.push(require('{{@key}}/{{this}}'));
        }
    } catch (e) {
        console.error(e);
    }
    {{/each}}

    lab = new app({
        namespace: namespace,
        name: name,
        version: version,
        devMode: devMode.toLowerCase() === 'true',
        settingsDir: settingsDir,
        assetsDir: assetsDir,
        mimeExtensions: mimeExtensions
    });

    // Handled the registered standard extensions.
    {{#each jupyterlab_extensions}}
    try {
        var deferred = !deferredExtensions.some(function(pattern) {
            return pattern.raw === '{{@key}}' || pattern.rule.test('{{@key}}')
        });
        var enabled = !disabled.some(function(pattern) {
            return pattern.raw === '{{@key}}' || pattern.rule.test('{{@key}}')
        });

        if (deferred) {
            ignorePlugins.push('{{key}}');
        }
        if (enabled) {
            lab.registerPluginModule(require('{{@key}}/{{this}}'));
        }
    } catch (e) {
        console.error(e);
    }
    {{/each}}

    lab.start({ ignorePlugins: ignorePlugins });

    // Handle a selenium test.
    var seleniumTest = PageConfig.getOption('seleniumTest');
    if (seleniumTest.toLowerCase() === 'true') {
        var caught_errors = []
        window.onerror = function(msg, url, line, col, error) {
           caught_errors.push(String(error));
        };
        lab.restored.then(function() {
            var el = document.createElement('div');
            el.id = 'seleniumResult';
            el.textContent = JSON.stringify(caught_errors);
            document.body.appendChild(el);
        });
    }

}

window.onload = main;
