require('es6-promise/auto');  // polyfill Promise on IE

var PageConfig = require('@jupyterlab/coreutils').PageConfig;
__webpack_public_path__ = PageConfig.getOption('publicUrl');

// This needs to come after __webpack_public_path__ is set.
require('font-awesome/css/font-awesome.min.css');
var app = require('@jupyterlab/application').JupyterLab;


function main() {
    // Get the disabled extensions.
    var disabled = [];
    try {
        var option = PageConfig.getOption('disabledExtensions');
        disabled = JSON.parse(option).map(function(pattern) {
            return { raw: pattern, rule: new RegExp(pattern) };
        });
    } catch (error) {
        console.warn('Unable to parse disabled extensions.', error);
    }

    // Get the deferred extensions.
    var deferredExtensions = [];
    var ignorePlugins = [];
    try {
        var option = PageConfig.getOption('deferredExtensions');
        deferredExtensions = JSON.parse(option).map(function(pattern) {
            return { raw: pattern, rule: new RegExp(pattern) };
        });
    } catch (error) {
        console.warn('Unable to parse deferred extensions.', error);
    }

    function isDeferred(value) {
        return deferredExtensions.some(function(pattern) {
            return pattern.raw === value || pattern.rule.test(value)
        })
    }

    function isDisabled() {
        return disabled.some(function(pattern) {
            return pattern.raw === '{{@key}}' || pattern.rule.test('{{@key}}')
        });
    }

    var version = PageConfig.getOption('appVersion') || 'unknown';
    var name = PageConfig.getOption('appName') || 'JupyterLab';
    var namespace = PageConfig.getOption('appNamespace') || 'jupyterlab';
    var devMode = PageConfig.getOption('devMode') || 'false';
    var settingsDir = PageConfig.getOption('settingsDir') || '';
    var assetsDir = PageConfig.getOption('assetsDir') || '';

    if (version[0] === 'v') {
        version = version.slice(1);
    }

    // Handle the registered mime extensions.
    var mimeExtensions = [];
    {{#each jupyterlab_mime_extensions}}
    try {
        if (isDeferred('{{key}}')) {
            ignorePlugins.push('{{key}}');
        }
        if (!isDisabled('{{@key}}')) {
            var module = require('{{@key}}/{{this}}');
            if (Array.isArray(module)) {
                module.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        ignorePlugins.push(plugin.id);
                    }
                    if (!isDisabled(plugin.id)) {
                        mimeExtensions.push(plugin.id);
                    }
                });
            } else {
                mimeExtensions.push(module);
            }
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
        if (isDeferred('{{key}}')) {
            ignorePlugins.push('{{key}}');
        }
        if (!isDisabled('{{@key}}')) {
            var module = require('{{@key}}/{{this}}');
            if (Array.isArray(module)) {
                module.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        ignorePlugins.push(plugin.id);
                    }
                    if (!isDisabled(plugin.id)) {
                        lab.registerPluginModule(plugin.id);
                    }
                });
            } else {
                lab.registerPluginModule(module);
            }
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

window.addEventListener('load', main);
