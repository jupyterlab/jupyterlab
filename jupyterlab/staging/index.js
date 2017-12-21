/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

require('es6-promise/auto');  // polyfill Promise on IE

var PageConfig = require('@jupyterlab/coreutils').PageConfig;
// eslint-disable-next-line
__webpack_public_path__ = PageConfig.getOption('publicUrl');

// This needs to come after __webpack_public_path__ is set.
require('font-awesome/css/font-awesome.min.css');

/**
 * The main entry point for the application.
 */
function main() {
  var app = require('@jupyterlab/application').JupyterLab;

  // Get the disabled extensions.
  var disabled = { patterns: [], matches: [] };
  var disabledExtensions = [];
  try {
    var tempDisabled = PageConfig.getOption('disabledExtensions');
    if (tempDisabled) {
      disabledExtensions = JSON.parse(tempDisabled).map(function(pattern) {
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
    var tempDeferred = PageConfig.getOption('deferredExtensions');
    if (tempDeferred) {
      deferredExtensions = JSON.parse(tempDeferred).map(function(pattern) {
        deferred.patterns.push(pattern);
        return { raw: pattern, rule: new RegExp(pattern) };
      });
    }
  } catch (error) {
    console.warn('Unable to parse deferred extensions.', error);
  }

  function isDeferred(value) {
    return deferredExtensions.some(function(pattern) {
      return pattern.raw === value || pattern.rule.test(value);
    });
  }

  function isDisabled(value) {
    return disabledExtensions.some(function(pattern) {
      return pattern.raw === value || pattern.rule.test(value);
    });
  }

  var version = PageConfig.getOption('appVersion') || 'unknown';
  var name = PageConfig.getOption('appName') || 'JupyterLab';
  var namespace = PageConfig.getOption('appNamespace') || 'jupyterlab';
  var devMode = PageConfig.getOption('devMode') || 'false';

  // Get the lab config data.
  var urls = Object.create(null);
  [
    'pageUrl', 'publicUrl', 'settingsUrl', 'userSettingsUrl', 'themesUrl'
  ].forEach(function (key) {
    urls[key.replace('Url', '')] = PageConfig.getOption(key);
  });

  var directories = Object.create(null);
  [
    'appSettingsDir', 'templatesDir', 'staticDir', 'schemasDir', 'themesDir'
  ].forEach(function (key) {
    directories[key.replace('Dir', '')] = PageConfig.getOption(key);
  });
  directories['serverRoot'] = PageConfig.getOption('serverRoot');

  var register = [];

  if (version[0] === 'v') {
    version = version.slice(1);
  }

  // Handle the registered mime extensions.
  var mimeExtensions = [];
  // eslint-disable-next-line semi
  {{#each jupyterlab_mime_extensions}}
  try {
    if (isDeferred('{{key}}')) {
      deferred.matches.push('{{key}}');
      ignorePlugins.push('{{key}}');
    }
    if (isDisabled('{{@key}}')) {
      disabled.matches.push('{{@key}}');
    } else {
      var module = require('{{@key}}/{{this}}');
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
  // eslint-disable-next-line semi
  {{/each}}

  // Handled the registered standard extensions.
  // eslint-disable-next-line semi
  {{#each jupyterlab_extensions}}
  try {
    if (isDeferred('{{key}}')) {
      deferred.matches.push('{{key}}');
      ignorePlugins.push('{{key}}');
    }
    if (isDisabled('{{@key}}')) {
      disabled.matches.push('{{@key}}');
    } else {
      module = require('{{@key}}/{{this}}');
      extension = module.default;

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
  // eslint-disable-next-line semi
  {{/each}}

  var lab = new app({
    name: name,
    namespace: namespace,
    version: version,
    devMode: devMode.toLowerCase() === 'true',
    mimeExtensions: mimeExtensions,
    disabled: disabled,
    deferred: deferred,
    urls: urls,
    directories: directories,
    filesCached: PageConfig.getOption('cacheFiles').toLowerCase() == true
  });
  register.forEach(function(item) { lab.registerPluginModule(item); });
  lab.start({ ignorePlugins: ignorePlugins });

  // Handle a selenium test.
  var seleniumTest = PageConfig.getOption('seleniumTest');
  if (seleniumTest.toLowerCase() === 'true') {
    var caught_errors = [];
    window.onerror = function(msg, url, line, col, error) {
      caught_errors.push(String(error));
    };
    console.error = function(message) {
      caught_errors.push(String(message));
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
