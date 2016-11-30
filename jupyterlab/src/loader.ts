// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ModuleLoader
} from '@jupyterlab/extension-builder/lib/loader';

import {
  extractPlugins
} from '@jupyterlab/extension-builder/lib/extract';

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * A module loader instance.
 */
export
const loader = new ModuleLoader();


/**
 * Define a module that can be synchronously required.
 *
 * @param path - The version-mangled fully qualified path of the module.
 *   For example, "foo@1.0.1/lib/bar/baz.js".
 *
 * @param callback - The callback function for invoking the module.
 */
export
function define(path: string, callback: ModuleLoader.DefineCallback): void {
  loader.define.call(loader, path, callback);
}


/**
 * Get an entry point given by the user after validating.
 */
export
function getEntryPoint(modLoader: ModuleLoader, entryPoint: string): Application.IPlugin<Widget, any>[] {
  let plugins = modLoader.require(entryPoint);
  try {
    plugins = extractPlugins(plugins);
  } catch (err) {
    console.error(err);
    plugins = [];
  }
  return plugins;
}
