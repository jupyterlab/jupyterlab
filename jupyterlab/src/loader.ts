// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ModuleLoader
} from '@jupyterlab/application';


/**
 * A module loader instance.
 */
const _loader = new ModuleLoader();


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
  _loader.define.call(_loader, path, callback);
}


export
const loader = _loader;
