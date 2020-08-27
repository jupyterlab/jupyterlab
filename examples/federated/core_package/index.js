// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

// Promise.allSettled polyfill, until our supported browsers implement it
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
if (Promise.allSettled === undefined) {
  Promise.allSettled = promises =>
    Promise.all(
      promises.map(promise =>
        promise
          .then(value => ({
            status: "fulfilled",
            value,
          }), reason => ({
            status: "rejected",
            reason,
          }))
      )
    );
}

// This must be after the public path is set.
// This cannot be extracted because the public path is dynamic.
require('./imports.css');

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const newScript = document.createElement('script');
    newScript.onerror = reject;
    newScript.onload = resolve;
    newScript.async = true;
    document.head.appendChild(newScript);
    newScript.src = url;
  });
}

async function loadComponent(url, scope) {
  await loadScript(url);

  // From MIT-licensed https://github.com/module-federation/module-federation-examples/blob/af043acd6be1718ee195b2511adf6011fba4233c/advanced-api/dynamic-remotes/app1/src/App.js#L6-L12
  await __webpack_init_sharing__('default');
  const container = window._JUPYTERLAB[scope];
  // Initialize the container, it may provide shared modules and may need ours
  await container.init(__webpack_share_scopes__.default);
}

async function createModule(scope, module) {
  try {
    const factory = await window._JUPYTERLAB[scope].get(module);
    return factory();  
  } catch(e) {
    console.warn(`Failed to create module: package: ${scope}; module: ${module}`);
    throw e;
  }
}

/**
 * The main entry point for the application.
 */
async function main() {
  var JupyterLab = require('@jupyterlab/application').JupyterLab;
  var disabled = [];
  var deferred = [];
  var ignorePlugins = [];
  var register = [];

  // This is all the data needed to load and activate plugins. This should be
  // gathered by the server and put onto the initial page template.
  const extension_data = JSON.parse(
    PageConfig.getOption('dynamic_extensions')
  );

  const dynamicExtensionPromises = [];
  const dynamicMimeExtensionPromises = [];
  const dynamicStylePromises = [];

  // We first load all dynamic components so that the shared module
  // deduplication can run and figure out which shared modules from all
  // components should be actually used.
  const extensions = await Promise.allSettled(extension_data.map( async data => {
    await loadComponent(
      `${URLExt.join(PageConfig.getOption('fullLabextensionsUrl'), data.name, data.load)}`,
      data.name
    );
    return data;
  }));

  extensions.forEach(p => {
    if (p.status === "rejected") {
      // There was an error loading the component
      console.error(p.reason);
      return;
    }

    const data = p.value;
    if (data.extension) {
      dynamicExtensionPromises.push(createModule(data.name, data.extension));
    }
    if (data.mimeExtension) {
      dynamicMimeExtensionPromises.push(createModule(data.name, data.mimeExtension));
    }
    if (data.style) {
      dynamicStylePromises.push(createModule(data.name, data.style));
    }
  });

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
    for (let plugin of plugins) {
      if (PageConfig.Extension.isDisabled(plugin.id)) {
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

  // Handle the registered mime extensions.
  const mimeExtensions = [];
  {{#each jupyterlab_mime_extensions}}
  try {
    for (let plugin of activePlugins(require('{{@key}}/{{this}}'))) {
      mimeExtensions.push(plugin);
    }
  } catch (e) {
    console.error(e);
  }
  {{/each}}

  // Add the dynamic mime extensions.
  const dynamicMimeExtensions = await Promise.allSettled(dynamicMimeExtensionPromises);
  dynamicMimeExtensions.forEach(p => {
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
  try {
    for (let plugin of activePlugins(require('{{@key}}/{{this}}'))) {
      register.push(plugin);
    }
  } catch (e) {
    console.error(e);
  }
  {{/each}}

  // Add the dynamic extensions.
  const dynamicExtensions = await Promise.allSettled(dynamicExtensionPromises);
  dynamicExtensions.forEach(p => {
    if (p.status === "fulfilled") {
      for (let plugin of activePlugins(p.value)) {
        register.push(plugin);
      }
    } else {
      console.error(p.reason);
    }
  });

  // Load all dynamic component styles and log errors for any that do not
  (await Promise.allSettled(dynamicStylePromises)).filter(({status}) => status === "rejected").forEach(({reason}) => {
     console.error(reason);
    });

  const lab = new JupyterLab({
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
  });
  register.forEach(function(item) { lab.registerPluginModule(item); });
  lab.start({ ignorePlugins });
  lab.restored.then(() => {
    console.debug('Example started!');
  });
}

window.addEventListener('load', main);
