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
const loader = new ModuleLoader();


/**
 * Synchronously require a module that has already been loaded.
 *
 * @param path - The semver-mangled fully qualified path of the module.
 *   For example, "foo@^1.1.0/lib/bar/baz.js".
 *
 * @returns The exports of the requested module, if registered.  The module
 *   selected is the registered module that maximally satisfies the semver
 *   range of the request.
 */
export
function requireModule(path: string): any {
  return loader.require.call(loader, path);
}


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
 * Requre a bundle is to be loaded on a page.
 *
 * @param path - The public path of the bundle (e.g. "lab/jupyter.bundle.js").
 *
 * @returns A promise that resolves with the requested bundle.
 */
export
function requireBundle(path: string): Promise<void> {
  return loader.ensureBundle.call(loader, path);
}


/**
 * Get an entry point given by the user after validating.
 */
export
function getEntryPoint(entryPoint: string): Application.IPlugin<Widget, any>[] {
  let plugins = requireModule(entryPoint);
  try {
    plugins = extractPlugins(plugins);
  } catch (err) {
    console.error(err);
    plugins = [];
  }
  return plugins;
}
