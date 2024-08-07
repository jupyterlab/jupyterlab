/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PromiseDelegate } from '@lumino/coreutils';
import { DisposableSet } from '@lumino/disposable';
import { PageConfig, PluginRegistry2 } from '@jupyterlab/coreutils';
import './style.js';
import { LabIcon, DummySidePanel } from '@jupyterlab/ui-components';

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

const modulesCache = new Map();

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

  const pluginRegistry = new PluginRegistry2();
  var EntrypointJupyterLab = (await import('@jupyterlab/application')).EntrypointJupyterLab;
  var JupyterLab = (await import('@jupyterlab/application')).JupyterLab;
  var disabled = [];
  var deferred = [];
  var ignorePlugins = [];
  var register = [];
  var entrypoints = {}


  const federatedExtensionPromises = [];
  const federatedMimeExtensionPromises = [];
  const federatedStylePromises = [];

  // Start initializing the federated extensions
  const extensions = JSON.parse(
    PageConfig.getOption('federated_extensions')
  );

  const queuedFederated = [];

  extensions.forEach(data => {
    if (data.extension) {
      queuedFederated.push(data.name);
      federatedExtensionPromises.push(createModule(data.name, data.extension));
    }
    if (data.mimeExtension) {
      queuedFederated.push(data.name);
      federatedMimeExtensionPromises.push(createModule(data.name, data.mimeExtension));
    }

    if (data.style && !PageConfig.Extension.isDisabled(data.name)) {
      federatedStylePromises.push(createModule(data.name, data.style));
    }
  });

  const allPlugins = [];

  function* processPlugins(plugins, scope) {
    for (let plugin of plugins) {
      const isDisabled = PageConfig.Extension.isDisabled(plugin.id);
      allPlugins.push({
        id: plugin.id,
        description: plugin.description,
        requires: plugin.requires ? plugin.requires.map(token => typeof token === 'string' ? { name: token } : token) : [],
        optional: plugin.optional ? plugin.optional.map(token => typeof token === 'string' ? { name: token } : token) : [],
        provides: plugin.provides ? plugin.provides : null,
        autoStart: plugin.autoStart,
        enabled: !isDisabled,
        extension: scope
      });
      if (isDisabled) {
        disabled.push(plugin.id);
        continue;
      }
      if (PageConfig.Extension.isDeferred(plugin.id)) {
        deferred.push(plugin.id);
        ignorePlugins.push(plugin.id);
      }
      yield plugin;
    }
  }

  /**
   * Iterate over active plugins in an extension.
   *
   * #### Notes
   * This also populates the disabled, deferred, and ignored arrays.
   */
  function* activePlugins(extension) {
    // Handle commonjs or es2015 modules
    let exports;
    if (extension.hasOwnProperty('__esModule')) {
      exports = extension.default;
    } else {
      // CommonJS exports.
      exports = extension;
    }

    let plugins = Array.isArray(exports) ? exports : [exports];
    yield* processPlugins(plugins, extension.__scope__);
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
      const pkgJson = await import('{{@key}}/package.json');

      const pkgPlugins = pkgJson['jupyterlab']['plugins'];
      if (pkgPlugins) {
        const entryPointData = pkgJson['jupyterlab']['entrypoint'];

        if(entryPointData){
          Object.entries(entryPointData).forEach(([entryPoint, data]) => {
            if (!entrypoints[entryPoint]) {
              entrypoints[entryPoint] = []
            }
            data.forEach(pluginData=>{
              entrypoints[entryPoint].push({
                extension: '{{@key}}',
                pluginId: pluginData.pluginId,
                data : pluginData,
                activate: () => {
                  return pluginRegistry.activatePlugin(pluginData.pluginId)
                }
              })
            })
          });
        }
        for(let plugin of processPlugins(pkgPlugins, '{{@key}}')) {
          register.push({...plugin, loader: async () => {
            const candidate = modulesCache.get('{{@key}}{{#if this}}/{{this}}{{/if}}');
            if(candidate) {
              return (await candidate);
            }
            const delegate = new PromiseDelegate();
            modulesCache.set('{{@key}}{{#if this}}/{{this}}{{/if}}', delegate.promise);
            let ext = await import('{{@key}}{{#if this}}/{{this}}{{/if}}');
            ext.__scope__ = '{{@key}}';
            delegate.resolve(ext);
            return ext;
          }})
        }
      } else {
        const delegate = new PromiseDelegate();
        modulesCache.set('{{@key}}{{#if this}}/{{this}}{{/if}}', delegate.promise);
        let ext = await import('{{@key}}{{#if this}}/{{this}}{{/if}}');
        ext.__scope__ = '{{@key}}';
        delegate.resolve(ext);
        for (let plugin of activePlugins(ext)) {
          register.push(plugin);
        }
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

  if(entrypoints.widgetFactory){
    entrypoints.widgetFactory.forEach((pluginEntrypoint)=>{
      pluginEntrypoint.activate = () => {
        return pluginRegistry.activatePlugin(pluginEntrypoint.pluginId)
      }
    })
  }
  const EnhancedJupyterLab = EntrypointJupyterLab(JupyterLab)
  const lab = new EnhancedJupyterLab({
    pluginRegistry,
    entrypoints,
    mimeExtensions,
    disabled: {
      matches: disabled,
      patterns: PageConfig.Extension.disabled
        .map(function (val) { return val.raw; })
    },
    deferred: {
      matches: deferred,
      patterns: PageConfig.Extension.deferred
        .map(function (val) { return val.raw; })
    },
    availablePlugins: allPlugins
  });
  register.forEach(function(item) { pluginRegistry.registerPlugin(item); });

  const commandEntrypoints = lab.getEntrypoint('commandFactory')
  if(commandEntrypoints){
    commandEntrypoints.forEach(pluginCommandFactory=>{
      const dispose = lab.commands.addCommand(pluginCommandFactory.data.name, {
        // Translator needs to be exposed.
        label: pluginCommandFactory.data.label,
        execute: async ()=>{
          lab.disposeEntrypointPlaceholder(pluginCommandFactory.extension)
          await pluginRegistry.activatePlugin(pluginCommandFactory.pluginId)
          lab.commands.execute(pluginCommandFactory.data.name)
        }
      });
      lab.setEntrypointDisposables(pluginCommandFactory.extension, dispose);
    })
  }
  const panelFactoryEntrypoints = lab.getEntrypoint('panelFactory')
  if(panelFactoryEntrypoints){
    panelFactoryEntrypoints.forEach(factory=>{
        const v = new DummySidePanel({
          activate : async ()=>{
            lab.disposeEntrypointPlaceholder(factory.extension)
            await pluginRegistry.activatePlugin(factory.pluginId)
            lab.shell.activateById(factory.data.id)
          }
        })
        v.id = factory.data.id;
        const extensionIcon = LabIcon.resolve({icon: factory.data.iconName})
        v.title.icon = extensionIcon;
        // Should be translated
        v.title.caption = 'Extension Manager';
        factory.data.attributes.forEach(({name,value})=>{
          v.node.setAttribute(name, value);
        })
        lab.setEntrypointDisposables(factory.extension, v)
        lab.shell.add(v, factory.data.position, { rank: factory.data.rank });
    })
  }

  lab.start({ ignorePlugins, bubblingKeydown: true });

  // FIXME to delete - for testing set csv plugin loaded at arbitrary later time
  // setTimeout(() => {
  //   pluginRegistry.activatePlugin("@jupyterlab/csvviewer-extension:csv")
  // }, 8000)

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
