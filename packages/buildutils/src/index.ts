/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject, ReadonlyJSONObject
} from '@phosphor/coreutils';


export
namespace Build {
  /**
   */
  export
  interface IEnsureOptions {
    /**
     * The input directory that contains a package's assets.
     */
    input: string;

    /**
     * The package data for the JupyterLab application, composed at build time.
     */
    jupyterlab: JSONObject;

    /**
     * The name of the plugin.
     */
    name: string;

    /**
     * The output directory where the build assets should reside.
     */
    output: string;

    /**
     * Whether the current assets should be overwritten if they already exist.
     *
     * #### Notes
     * The default value is `false`.
     */
    overwrite?: boolean;

    /**
     * The package data for the plugin being processed.
     */
    package: ReadonlyJSONObject;
  }

  /**
   * Ensures that the assets of a plugin are populated for a build.
   */
  export
  function ensureAssets(options: IEnsureOptions): void {
    throw new Error('Build.ensureAssets has not been implemented.');
  }
}
