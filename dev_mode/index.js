/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig, JupyterPluginRegistry} from '@jupyterlab/coreutils';

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
    const isDisabled = isPluginDisabled(data.name);
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

  function collectDisabledPlugins(extension) {
    const plugins = [];
    for (let plugin of getPlugins(extension)) {
      plugins.push(createPluginInfo(plugin, extension, true));
      disabled.push(plugin.id);
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
      const isDisabled = isPluginDisabled(plugin.id);
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

  // Disabled federated extensions are loaded after restoration only to discover
  // their plugin metadata; they must not be registered or activated.
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

    const addAvailablePlugins = lab.info.addAvailablePlugins?.bind(lab.info);
    if (addAvailablePlugins) {
      addAvailablePlugins(disabledPlugins);
    } else {
      allPlugins.push(...disabledPlugins);
    }
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
    availablePlugins: allPlugins
  });

  // 4. Start the application, which will activate the other plugins
  lab.start({ ignorePlugins, bubblingKeydown: true });

  lab.restored
    .then(() => loadDeferredDisabledFederatedPlugins())
    .catch(reason => {
      console.error('Error when loading disabled federated extensions:', reason);
    });

  // Expose global app instance when in dev mode or when toggled explicitly.
  var exposeAppInBrowser = (PageConfig.getOption('exposeAppInBrowser') || '').toLowerCase() === 'true';
  var devMode = (PageConfig.getOption('devMode') || '').toLowerCase() === 'true';

  if (exposeAppInBrowser || devMode) {
    window.jupyterapp = lab;
  }

  // Handle a browser test.
  if (browserTest.toLowerCase() === 'true') {
    lab.restored
      .then(function() { report(errors); })
      .catch(function(reason) { report([`RestoreError: ${reason.message}`]); });

    // Handle failures to restore after the timeout has elapsed.
    window.setTimeout(function() { report(errors); }, timeout);
  }
}
