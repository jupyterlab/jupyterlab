// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONExt } from '@lumino/coreutils';
import minimist from 'minimist';
import { URLExt } from './url';

/**
 * Declare stubs for the node variables.
 */
declare let process: any;
declare let require: any;

/**
 * The namespace for `PageConfig` functions.
 */
export namespace PageConfig {
  /**
   * Get global configuration data for the Jupyter application.
   *
   * @param name - The name of the configuration option.
   *
   * @returns The config value or an empty string if not found.
   *
   * #### Notes
   * All values are treated as strings.
   * For browser based applications, it is assumed that the page HTML
   * includes a script tag with the id `jupyter-config-data` containing the
   * configuration as valid JSON.  In order to support the classic Notebook,
   * we fall back on checking for `body` data of the given `name`.
   *
   * For node applications, it is assumed that the process was launched
   * with a `--jupyter-config-data` option pointing to a JSON settings
   * file.
   */
  export function getOption(name: string): string {
    if (configData) {
      return configData[name] || getBodyData(name);
    }
    configData = Object.create(null);
    let found = false;

    // Use script tag if available.
    if (typeof document !== 'undefined' && document) {
      const el = document.getElementById('jupyter-config-data');

      if (el) {
        configData = JSON.parse(el.textContent || '') as {
          [key: string]: string;
        };
        found = true;
      }
    }
    // Otherwise use CLI if given.
    if (!found && typeof process !== 'undefined' && process.argv) {
      try {
        const cli = minimist(process.argv.slice(2));
        const path: any = require('path');
        let fullPath = '';
        if ('jupyter-config-data' in cli) {
          fullPath = path.resolve(cli['jupyter-config-data']);
        } else if ('JUPYTER_CONFIG_DATA' in process.env) {
          fullPath = path.resolve(process.env['JUPYTER_CONFIG_DATA']);
        }
        if (fullPath) {
          // Force Webpack to ignore this require.
          // eslint-disable-next-line
          configData = eval('require')(fullPath) as { [key: string]: string };
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!JSONExt.isObject(configData)) {
      configData = Object.create(null);
    } else {
      for (const key in configData) {
        // PageConfig expects strings
        if (typeof configData[key] !== 'string') {
          configData[key] = JSON.stringify(configData[key]);
        }
      }
    }
    return configData![name] || getBodyData(name);
  }

  /**
   * Set global configuration data for the Jupyter application.
   *
   * @param name - The name of the configuration option.
   * @param value - The value to set the option to.
   *
   * @returns The last config value or an empty string if it doesn't exist.
   */
  export function setOption(name: string, value: string): string {
    const last = getOption(name);

    configData![name] = value;
    return last;
  }

  /**
   * Get the base url for a Jupyter application, or the base url of the page.
   */
  export function getBaseUrl(): string {
    return URLExt.normalize(getOption('baseUrl') || '/');
  }

  /**
   * Get the tree url for a JupyterLab application.
   */
  export function getTreeUrl(): string {
    return URLExt.join(getBaseUrl(), getOption('treeUrl'));
  }

  /**
   * Get the base url for sharing links (usually baseUrl)
   */
  export function getShareUrl(): string {
    return URLExt.normalize(getOption('shareUrl') || getBaseUrl());
  }

  /**
   * Get the tree url for shareable links.
   * Usually the same as treeUrl,
   * but overridable e.g. when sharing with JupyterHub.
   */
  export function getTreeShareUrl(): string {
    return URLExt.normalize(URLExt.join(getShareUrl(), getOption('treeUrl')));
  }

  /**
   * Create a new URL given an optional mode and tree path.
   *
   * This is used to create URLS when the mode or tree path change as the user
   * changes mode or the current document in the main area. If fields in
   * options are omitted, the value in PageConfig will be used.
   *
   * @param options - IGetUrlOptions for the new path.
   */
  export function getUrl(options: IGetUrlOptions): string {
    let path = options.toShare ? getShareUrl() : getBaseUrl();
    const mode = options.mode ?? getOption('mode');
    const workspace = options.workspace ?? getOption('workspace');
    const labOrDoc = mode === 'single-document' ? 'doc' : 'lab';
    path = URLExt.join(path, labOrDoc);
    if (workspace !== defaultWorkspace) {
      path = URLExt.join(
        path,
        'workspaces',
        encodeURIComponent(getOption('workspace') ?? defaultWorkspace)
      );
    }
    const treePath = options.treePath ?? getOption('treePath');
    if (treePath) {
      path = URLExt.join(path, 'tree', URLExt.encodeParts(treePath));
    }
    return path;
  }

  export const defaultWorkspace: string = 'default';

  /**
   * Options for getUrl
   */

  export interface IGetUrlOptions {
    /**
     * The optional mode as a string 'single-document' or 'multiple-document'. If
     * the mode argument is missing, it will be provided from the PageConfig.
     */
    mode?: string;

    /**
     * The optional workspace as a string. If this argument is missing, the value will
     * be pulled from PageConfig. To use the default workspace (no /workspaces/<name>
     * URL segment will be included) pass the string PageConfig.defaultWorkspace.
     */
    workspace?: string;

    /**
     * Whether the url is meant to be shared or not; default false.
     */
    toShare?: boolean;

    /**
     * The optional tree path as as string. If treePath is not provided it will be
     * provided from the PageConfig. If an empty string, the resulting path will not
     * contain a tree portion.
     */
    treePath?: string;
  }

  /**
   * Get the base websocket url for a Jupyter application, or an empty string.
   */
  export function getWsUrl(baseUrl?: string): string {
    let wsUrl = getOption('wsUrl');
    if (!wsUrl) {
      baseUrl = baseUrl ? URLExt.normalize(baseUrl) : getBaseUrl();
      if (baseUrl.indexOf('http') !== 0) {
        return '';
      }
      wsUrl = 'ws' + baseUrl.slice(4);
    }
    return URLExt.normalize(wsUrl);
  }

  /**
   * Returns the URL converting this notebook to a certain
   * format with nbconvert.
   */
  export function getNBConvertURL({
    path,
    format,
    download
  }: {
    path: string;
    format: string;
    download: boolean;
  }): string {
    const notebookPath = URLExt.encodeParts(path);
    const url = URLExt.join(getBaseUrl(), 'nbconvert', format, notebookPath);
    if (download) {
      return url + '?download=true';
    }
    return url;
  }

  /**
   * Get the authorization token for a Jupyter application.
   */
  export function getToken(): string {
    return getOption('token') || getBodyData('jupyterApiToken');
  }

  /**
   * Get the Notebook version info [major, minor, patch].
   */
  export function getNotebookVersion(): [number, number, number] {
    const notebookVersion = getOption('notebookVersion');
    if (notebookVersion === '') {
      return [0, 0, 0];
    }
    return JSON.parse(notebookVersion);
  }

  /**
   * Private page config data for the Jupyter application.
   */
  let configData: { [key: string]: string } | null = null;

  /**
   * Get a url-encoded item from `body.data` and decode it
   * We should never have any encoded URLs anywhere else in code
   * until we are building an actual request.
   */
  function getBodyData(key: string): string {
    if (typeof document === 'undefined' || !document.body) {
      return '';
    }
    const val = document.body.dataset[key];
    if (typeof val === 'undefined') {
      return '';
    }
    return decodeURIComponent(val);
  }

  /**
   * The namespace for page config `Extension` functions.
   */
  export namespace Extension {
    /**
     * Populate an array from page config.
     *
     * @param key - The page config key (e.g., `deferredExtensions`).
     *
     * #### Notes
     * This is intended for `deferredExtensions` and `disabledExtensions`.
     */
    function populate(key: string): string[] {
      try {
        const raw = getOption(key);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (error) {
        console.warn(`Unable to parse ${key}.`, error);
      }
      return [];
    }

    /**
     * The collection of deferred extensions in page config.
     */
    export const deferred = populate('deferredExtensions');

    /**
     * The collection of disabled extensions in page config.
     */
    export const disabled = populate('disabledExtensions');

    /**
     * Returns whether a plugin is deferred.
     *
     * @param id - The plugin ID.
     */
    export function isDeferred(id: string): boolean {
      // Check for either a full plugin id match or an extension
      // name match.
      const separatorIndex = id.indexOf(':');
      let extName = '';
      if (separatorIndex !== -1) {
        extName = id.slice(0, separatorIndex);
      }
      return deferred.some(val => val === id || (extName && val === extName));
    }

    /**
     * Returns whether a plugin is disabled.
     *
     * @param id - The plugin ID.
     */
    export function isDisabled(id: string): boolean {
      // Check for either a full plugin id match or an extension
      // name match.
      const separatorIndex = id.indexOf(':');
      let extName = '';
      if (separatorIndex !== -1) {
        extName = id.slice(0, separatorIndex);
      }
      return disabled.some(val => val === id || (extName && val === extName));
    }
  }
}
