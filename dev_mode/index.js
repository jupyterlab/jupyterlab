/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig, JupyterPluginRegistry} from '@jupyterlab/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';

import './style.js';

async function createModule(scope, module) {
  try {
    const factory = await window._JUPYTERLAB[scope].get(module);
    const instance = factory();
    instance.__scope__ = scope;
    return instance;
  } catch(e) {
    console.warn(`Failed to create module: package: ${scope}; module: ${module}`);
    throw e;
  }
}

// How long to wait for an idle period before giving up and running the work
// anyway.
const IDLE_TIMEOUT = 5000;

/**
 * Resolve once the browser has an idle period.
 *
 * #### Notes
 * Falls back to the next task when `requestIdleCallback` is not available
 * (Safari before 16.4).
 */
function whenIdle() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * The main entry point for the application.
 */
export async function main() {

   // Handle a browser test.
   // Set up error handling prior to loading extensions.
   var browserTest = PageConfig.getOption('browserTest');
   if (browserTest.toLowerCase() === 'true') {
     var el = document.createElement('div');
     el.id = 'browserTest';
     document.body.appendChild(el);
     el.textContent = '[]';
     el.style.display = 'none';
     var errors = [];
     var reported = false;
     var timeout = 25000;

     var report = function() {
       if (reported) {
         return;
       }
       reported = true;
       el.className = 'completed';
     }

     window.onerror = function(msg, url, line, col, error) {
       errors.push(String(error));
       el.textContent = JSON.stringify(errors)
     };
     console.error = function(message) {
       errors.push(String(message));
       el.textContent = JSON.stringify(errors)
     };
  }

  var pluginRegistry = new JupyterPluginRegistry();
  var JupyterLab = require('@jupyterlab/application').JupyterLab;
  var disabled = [];
  var deferred = [];
  var ignorePlugins = [];
  var register = [];


  const federatedExtensionPromises = [];
  const federatedMimeExtensionPromises = [];
  const federatedStylePromises = [];
  const deferredDisabledFederatedModules = [];

  // Start initializing the federated extensions
  const extensions = JSON.parse(
    PageConfig.getOption('federated_extensions')
  );

  // Keep a mapping of renamed plugin ids to ensure user configs don't break.
  // The mapping is defined in the main index.js for JupyterLab, since it may not be relevant for
  // other lab-based applications (they may not use the same set of plugins).
  const renamedPluginIds = {
    '@jupyterlab/application:mimedocument': '@jupyterlab/application-extension:mimedocument',
    '@jupyterlab/help-extension:licenses': '@jupyterlab/apputils-extension:licenses-plugin',
    '@jupyterlab/lsp:ILSPCodeExtractorsManager': '@jupyterlab/lsp-extension:code-extractor-manager',
    '@jupyterlab/translation:translator': '@jupyterlab/translation-extension:translator',
    '@jupyterlab/workspaces:commands': '@jupyterlab/workspaces-extension:commands'
  };

  // Transparently handle the case of renamed plugins, so current configs don't break.
  // And emit a warning in the dev tools console to notify about the rename so
  // users can update their config.
  const disabledExtensions = PageConfig.Extension.disabled.map(id => {
    if (renamedPluginIds[id]) {
      console.warn(`Plugin ${id} has been renamed to ${renamedPluginIds[id]}. Consider updating your config to use the new name.`);
      return renamedPluginIds[id];
    }
    return id;
  });

  const deferredExtensions = PageConfig.Extension.deferred.map(id => {
    if (renamedPluginIds[id]) {
      console.warn(`Plugin id ${id} has been renamed to ${renamedPluginIds[id]}. Consider updating your config to use the new name.`);
      return renamedPluginIds[id];
    }
    return id;
  });

  // This is basically a copy of PageConfig.Extension.isDisabled to
  // take into account the case of renamed plugins.
  const isPluginDisabled = (id) => {
    const separatorIndex = id.indexOf(':');
    let extName = '';
    if (separatorIndex !== -1) {
      extName = id.slice(0, separatorIndex);
    }
    return disabledExtensions.some(val => val === id || (extName && val === extName));
  }

  // Whether a whole extension package is disabled, that is whether its name is
  // listed in `disabledExtensions`. Such a package is disabled as a unit: every
  // plugin it provides is disabled, including a plugin whose id does not start
  // with the package name.
  const isExtensionDisabled = (name) => {
    return disabledExtensions.some(val => val === name);
  }

  // Report a plugin which is only disabled because the whole package providing
  // it is disabled. Such a plugin does not follow the plugin id convention, so
  // the user cannot tell from the config that it was disabled too.
  const warnAboutPackageLevelDisable = (pluginId, scope) => {
    console.warn(`Plugin ${pluginId} does not start with the name of the extension providing it (${scope}), which is disabled, so this plugin is disabled too. To keep it enabled, list the plugin ids to disable in disabledExtensions instead of ${scope}.`);
  }

  // This is basically a copy of PageConfig.Extension.isDeferred to
  // take into account the case of renamed plugins.
  const isPluginDeferred = (id) => {
    const separatorIndex = id.indexOf(':');
    let extName = '';
    if (separatorIndex !== -1) {
      extName = id.slice(0, separatorIndex);
    }
    return deferredExtensions.some(val => val === id || (extName && val === extName));
  }

  const queuedFederated = [];

  extensions.forEach(data => {
    const isDisabled = isExtensionDisabled(data.name);
    if (data.extension) {
      queuedFederated.push(data.name);
      if (isDisabled) {
        deferredDisabledFederatedModules.push({
          name: data.name,
          module: data.extension
        });
      } else {
        federatedExtensionPromises.push(createModule(data.name, data.extension));
      }
    }
    if (data.mimeExtension) {
      queuedFederated.push(data.name);
      if (isDisabled) {
        deferredDisabledFederatedModules.push({
          name: data.name,
          module: data.mimeExtension
        });
      } else {
        federatedMimeExtensionPromises.push(createModule(data.name, data.mimeExtension));
      }
    }

    if (data.style && !isDisabled) {
      federatedStylePromises.push(createModule(data.name, data.style));
    }
  });

  const allPlugins = [];

  /**
   * Get the plugins from an extension.
   */
  function getPlugins(extension) {
    // Handle commonjs or es2015 modules
    let exports;
    if (extension.hasOwnProperty('__esModule')) {
      exports = extension.default;
    } else {
      // CommonJS exports.
      exports = extension;
    }

    return Array.isArray(exports) ? exports : [exports];
  }

  function createPluginInfo(plugin, extension, isDisabled) {
    return {
      id: plugin.id,
      description: plugin.description,
      requires: plugin.requires ?? [],
      optional: plugin.optional ?? [],
      provides: plugin.provides ?? null,
      autoStart: plugin.autoStart,
      enabled: !isDisabled,
      extension: extension.__scope__
    };
  }

  function recordPlugin(plugin, extension, isDisabled) {
    allPlugins.push(createPluginInfo(plugin, extension, isDisabled));
    if (isDisabled) {
      disabled.push(plugin.id);
    }
  }

  /**
   * Collect the metadata of the plugins of an extension disabled as a whole.
   */
  function collectDisabledPlugins(extension) {
    const plugins = [];
    for (let plugin of getPlugins(extension)) {
      if (!isPluginDisabled(plugin.id)) {
        warnAboutPackageLevelDisable(plugin.id, extension.__scope__);
      }
      plugins.push(createPluginInfo(plugin, extension, true));
    }
    return plugins;
  }

  /**
   * Iterate over active plugins in an extension.
   *
   * #### Notes
   * This also populates the disabled, deferred, and ignored arrays.
   */
  function* activePlugins(extension) {
    const plugins = getPlugins(extension);
    for (let plugin of plugins) {
      const disabledById = isPluginDisabled(plugin.id);
      const isDisabled =
        disabledById || isExtensionDisabled(extension.__scope__);
      if (isDisabled && !disabledById) {
        warnAboutPackageLevelDisable(plugin.id, extension.__scope__);
      }
      recordPlugin(plugin, extension, isDisabled);
      if (isDisabled) {
        continue;
      }
      if (isPluginDeferred(plugin.id)) {
        deferred.push(plugin.id);
        ignorePlugins.push(plugin.id);
      }
      yield plugin;
    }
  }

  // Disabled federated extensions are loaded once the application started, only
  // to discover their plugin metadata; they must not be registered or activated.
  async function loadDeferredDisabledFederatedPlugins() {
    const deferredDisabledFederatedPlugins = await Promise.allSettled(
      deferredDisabledFederatedModules.map(data => createModule(data.name, data.module))
    );
    const disabledPlugins = [];

    deferredDisabledFederatedPlugins.forEach(p => {
      if (p.status === "fulfilled") {
        try {
          disabledPlugins.push(...collectDisabledPlugins(p.value));
        } catch (e) {
          console.error(e);
        }
      } else {
        console.error(p.reason);
      }
    });

    return disabledPlugins;
  }

  // Handle the registered mime extensions.
  const mimeExtensions = [];
  {{#each jupyterlab_mime_extensions}}
  if (!queuedFederated.includes('{{@key}}')) {
    try {
      let ext = require('{{@key}}{{#if this}}/{{this}}{{/if}}');
      ext.__scope__ = '{{@key}}';
      for (let plugin of activePlugins(ext)) {
        mimeExtensions.push(plugin);
      }
    } catch (e) {
      console.error(e);
    }
  }
  {{/each}}

  // Add the federated mime extensions.
  const federatedMimeExtensions = await Promise.allSettled(federatedMimeExtensionPromises);
  federatedMimeExtensions.forEach(p => {
    if (p.status === "fulfilled") {
      for (let plugin of activePlugins(p.value)) {
        mimeExtensions.push(plugin);
      }
    } else {
      console.error(p.reason);
    }
  });

  // Handled the registered standard extensions.
  {{#each jupyterlab_extensions}}
  if (!queuedFederated.includes('{{@key}}')) {
    try {
      let ext = require('{{@key}}{{#if this}}/{{this}}{{/if}}');
      ext.__scope__ = '{{@key}}';
      for (let plugin of activePlugins(ext)) {
        register.push(plugin);
      }
    } catch (e) {
      console.error(e);
    }
  }
  {{/each}}

  // Add the federated extensions.
  const federatedExtensions = await Promise.allSettled(federatedExtensionPromises);
  federatedExtensions.forEach(p => {
    if (p.status === "fulfilled") {
      for (let plugin of activePlugins(p.value)) {
        register.push(plugin);
      }
    } else {
      console.error(p.reason);
    }
  });

  // Load all federated component styles and log errors for any that do not
  (await Promise.allSettled(federatedStylePromises)).filter(({status}) => status === "rejected").forEach(({reason}) => {
    console.error(reason);
  });

  // 2. Register the plugins
  pluginRegistry.registerPlugins(register);

  // 3. Get and resolve the service manager and connection status plugins
  const IConnectionStatus = require('@jupyterlab/services').IConnectionStatus;
  const IServiceManager = require('@jupyterlab/services').IServiceManager;
  const connectionStatus = await pluginRegistry.resolveOptionalService(IConnectionStatus);
  const serviceManager = await pluginRegistry.resolveRequiredService(IServiceManager);

  // The plugins of the disabled federated extensions are only known once the
  // application started; the application adds them to its info once this
  // promise resolves.
  const disabledFederatedPlugins = new PromiseDelegate();

  const lab = new JupyterLab({
    pluginRegistry,
    serviceManager,
    mimeExtensions,
    connectionStatus,
    disabled: {
      matches: disabled,
      patterns: disabledExtensions
        .map(function (val) { return val.raw; })
    },
    deferred: {
      matches: deferred,
      patterns: deferredExtensions
        .map(function (val) { return val.raw; })
    },
    availablePlugins: allPlugins,
    pendingAvailablePlugins: disabledFederatedPlugins.promise
  });

  // 4. Start the application, which will activate the other plugins
  lab.start({ ignorePlugins, bubblingKeydown: true });

  // Wait for all plugins, including the deferred ones, to be activated and for
  // the browser to be idle, so that loading the disabled extensions does not
  // compete with the work the application does while starting.
  lab.allPluginsActivated
    .then(whenIdle)
    .then(loadDeferredDisabledFederatedPlugins)
    .then(
      plugins => disabledFederatedPlugins.resolve(plugins),
      reason => disabledFederatedPlugins.reject(reason)
    );

  // Expose global app instance when in dev mode or when toggled explicitly.
  var exposeAppInBrowser = (PageConfig.getOption('exposeAppInBrowser') || '').toLowerCase() === 'true';
  var devMode = (PageConfig.getOption('devMode') || '').toLowerCase() === 'true';

  if (exposeAppInBrowser || devMode) {
    window.jupyterapp = lab;
  }

  // Handle a browser test.
  if (browserTest.toLowerCase() === 'true') {
    disabledFederatedPlugins.promise
      .then(function() { report(errors); })
      .catch(function(reason) { report([`RestoreError: ${reason.message}`]); });

    // Handle failures to restore after the timeout has elapsed.
    window.setTimeout(function() { report(errors); }, timeout);
  }
}
