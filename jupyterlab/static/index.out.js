require('es6-promise/auto');  // polyfill Promise on IE

var PageConfig = require('@jupyterlab/coreutils').PageConfig;
__webpack_public_path__ = PageConfig.getOption('publicUrl');

// This needs to come after __webpack_public_path__ is set.
require('font-awesome/css/font-awesome.min.css');
var app = require('@jupyterlab/application').JupyterLab;


function main() {
    // Get the disabled extensions.
    var disabled = { patterns: [], matches: [] };
    var disabledExtensions = [];
    try {
        var option = PageConfig.getOption('disabledExtensions');
        if (option) {
            disabledExtensions = JSON.parse(option).map(function(pattern) {
                disabled.patterns.push(pattern);
                return { raw: pattern, rule: new RegExp(pattern) };
            });
        }
    } catch (error) {
        console.warn('Unable to parse disabled extensions.', error);
    }

    // Get the deferred extensions.
    var deferred = { patterns: [], matches: [] };
    var deferredExtensions = [];
    var ignorePlugins = [];
    try {
        var option = PageConfig.getOption('deferredExtensions');
        if (option) {
            deferredExtensions = JSON.parse(option).map(function(pattern) {
                deferred.patterns.push(pattern);
                return { raw: pattern, rule: new RegExp(pattern) };
            });
        }
    } catch (error) {
        console.warn('Unable to parse deferred extensions.', error);
    }

    function isDeferred(value) {
        return deferredExtensions.some(function(pattern) {
            return pattern.raw === value || pattern.rule.test(value)
        })
    }

    function isDisabled(value) {
        return disabledExtensions.some(function(pattern) {
            return pattern.raw === value || pattern.rule.test(value)
        });
    }

    var version = PageConfig.getOption('appVersion') || 'unknown';
    var name = PageConfig.getOption('appName') || 'JupyterLab';
    var namespace = PageConfig.getOption('appNamespace') || 'jupyterlab';
    var devMode = PageConfig.getOption('devMode') || 'false';
    var settingsDir = PageConfig.getOption('settingsDir') || '';
    var assetsDir = PageConfig.getOption('assetsDir') || '';
    var register = [];

    if (version[0] === 'v') {
        version = version.slice(1);
    }

    // Handle the registered mime extensions.
    var mimeExtensions = [];
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/json-extension')) {
            disabled.matches.push('@jupyterlab/json-extension');
        } else {
            var module = require('@jupyterlab/json-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    mimeExtensions.push(plugin);
                });
            } else {
                mimeExtensions.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/pdf-extension')) {
            disabled.matches.push('@jupyterlab/pdf-extension');
        } else {
            var module = require('@jupyterlab/pdf-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    mimeExtensions.push(plugin);
                });
            } else {
                mimeExtensions.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/vdom-extension')) {
            disabled.matches.push('@jupyterlab/vdom-extension');
        } else {
            var module = require('@jupyterlab/vdom-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    mimeExtensions.push(plugin);
                });
            } else {
                mimeExtensions.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/vega2-extension')) {
            disabled.matches.push('@jupyterlab/vega2-extension');
        } else {
            var module = require('@jupyterlab/vega2-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    mimeExtensions.push(plugin);
                });
            } else {
                mimeExtensions.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }

    // Handled the registered standard extensions.
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/application-extension')) {
            disabled.matches.push('@jupyterlab/application-extension');
        } else {
            var module = require('@jupyterlab/application-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/apputils-extension')) {
            disabled.matches.push('@jupyterlab/apputils-extension');
        } else {
            var module = require('@jupyterlab/apputils-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/codemirror-extension')) {
            disabled.matches.push('@jupyterlab/codemirror-extension');
        } else {
            var module = require('@jupyterlab/codemirror-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/completer-extension')) {
            disabled.matches.push('@jupyterlab/completer-extension');
        } else {
            var module = require('@jupyterlab/completer-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/console-extension')) {
            disabled.matches.push('@jupyterlab/console-extension');
        } else {
            var module = require('@jupyterlab/console-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/csvviewer-extension')) {
            disabled.matches.push('@jupyterlab/csvviewer-extension');
        } else {
            var module = require('@jupyterlab/csvviewer-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/docmanager-extension')) {
            disabled.matches.push('@jupyterlab/docmanager-extension');
        } else {
            var module = require('@jupyterlab/docmanager-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/faq-extension')) {
            disabled.matches.push('@jupyterlab/faq-extension');
        } else {
            var module = require('@jupyterlab/faq-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/filebrowser-extension')) {
            disabled.matches.push('@jupyterlab/filebrowser-extension');
        } else {
            var module = require('@jupyterlab/filebrowser-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/fileeditor-extension')) {
            disabled.matches.push('@jupyterlab/fileeditor-extension');
        } else {
            var module = require('@jupyterlab/fileeditor-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/help-extension')) {
            disabled.matches.push('@jupyterlab/help-extension');
        } else {
            var module = require('@jupyterlab/help-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/imageviewer-extension')) {
            disabled.matches.push('@jupyterlab/imageviewer-extension');
        } else {
            var module = require('@jupyterlab/imageviewer-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/inspector-extension')) {
            disabled.matches.push('@jupyterlab/inspector-extension');
        } else {
            var module = require('@jupyterlab/inspector-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/launcher-extension')) {
            disabled.matches.push('@jupyterlab/launcher-extension');
        } else {
            var module = require('@jupyterlab/launcher-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/markdownviewer-extension')) {
            disabled.matches.push('@jupyterlab/markdownviewer-extension');
        } else {
            var module = require('@jupyterlab/markdownviewer-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/notebook-extension')) {
            disabled.matches.push('@jupyterlab/notebook-extension');
        } else {
            var module = require('@jupyterlab/notebook-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/running-extension')) {
            disabled.matches.push('@jupyterlab/running-extension');
        } else {
            var module = require('@jupyterlab/running-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/settingeditor-extension')) {
            disabled.matches.push('@jupyterlab/settingeditor-extension');
        } else {
            var module = require('@jupyterlab/settingeditor-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/shortcuts-extension')) {
            disabled.matches.push('@jupyterlab/shortcuts-extension');
        } else {
            var module = require('@jupyterlab/shortcuts-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/tabmanager-extension')) {
            disabled.matches.push('@jupyterlab/tabmanager-extension');
        } else {
            var module = require('@jupyterlab/tabmanager-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/terminal-extension')) {
            disabled.matches.push('@jupyterlab/terminal-extension');
        } else {
            var module = require('@jupyterlab/terminal-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/theme-dark-extension')) {
            disabled.matches.push('@jupyterlab/theme-dark-extension');
        } else {
            var module = require('@jupyterlab/theme-dark-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/theme-light-extension')) {
            disabled.matches.push('@jupyterlab/theme-light-extension');
        } else {
            var module = require('@jupyterlab/theme-light-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }
    try {
        if (isDeferred('')) {
            deferred.matches.push('');
            ignorePlugins.push('');
        }
        if (isDisabled('@jupyterlab/tooltip-extension')) {
            disabled.matches.push('@jupyterlab/tooltip-extension');
        } else {
            var module = require('@jupyterlab/tooltip-extension/');
            var extension = module.default;

            // Handle CommonJS exports.
            if (!module.hasOwnProperty('__esModule')) {
              extension = module;
            }

            if (Array.isArray(extension)) {
                extension.forEach(function(plugin) {
                    if (isDeferred(plugin.id)) {
                        deferred.matches.push(plugin.id);
                        ignorePlugins.push(plugin.id);
                    }
                    if (isDisabled(plugin.id)) {
                        disabled.matches.push(plugin.id);
                        return;
                    }
                    register.push(plugin);
                });
            } else {
                register.push(extension);
            }
        }
    } catch (e) {
        console.error(e);
    }

    lab = new app({
        namespace: namespace,
        name: name,
        version: version,
        devMode: devMode.toLowerCase() === 'true',
        settingsDir: settingsDir,
        assetsDir: assetsDir,
        mimeExtensions: mimeExtensions,
        disabled: disabled,
        deferred: deferred
    });
    register.forEach(function(item) { lab.registerPluginModule(item); });
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
