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
    if (!found && typeof process !== 'undefined') {
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
   * but overrideable e.g. when sharing with JupyterHub.
   */
  export function getTreeShareUrl(): string {
    return URLExt.normalize(URLExt.join(getShareUrl(), getOption('treeUrl')));
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
    function populate(key: string): { raw: string; rule: RegExp }[] {
      try {
        const raw = getOption(key);
        if (raw) {
          return JSON.parse(raw).map((pattern: string) => {
            return { raw: pattern, rule: new RegExp(pattern) };
          });
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
      return deferred.some(val => val.raw === id || val.rule.test(id));
    }

    /**
     * Returns whether a plugin is disabled.
     *
     * @param id - The plugin ID.
     */
    export function isDisabled(id: string): boolean {
      return disabled.some(val => val.raw === id || val.rule.test(id));
    }
  }
}
