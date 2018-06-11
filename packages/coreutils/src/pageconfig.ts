// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt
} from '@phosphor/coreutils';

import minimist from 'minimist';

import {
  URLExt
} from './url';


/**
 * Declare stubs for the node variables.
 */
declare var process: any;
declare var require: any;


/**
 * The namespace for Page Config functions.
 */
export
namespace PageConfig {
  /**
   * The tree URL construction options.
   */
  export
  interface ITreeOptions {
    /**
     * If `true`, the tree URL will include the current workspace, if any.
     */
    workspace?: boolean;
  }

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
  export
  function getOption(name: string): string {
    if (configData) {
      return configData[name] || Private.getBodyData(name);
    }
    configData = Object.create(null);
    let found = false;

    // Use script tag if available.
    if (typeof document !== 'undefined') {
      const el = document.getElementById('jupyter-config-data');

      if (el) {
        configData = JSON.parse(el.textContent || '') as {
          [key: string]: string
        };
        found = true;
      }
    }
    // Otherwise use CLI if given.
    if (!found && typeof process !== 'undefined') {
      try {
        const cli = minimist(process.argv.slice(2));
        if ('jupyter-config-data' in cli) {
          const path: any = require('path');
          const fullPath = path.resolve(cli['jupyter-config-data']);

          /* tslint:disable */
          // Force Webpack to ignore this require.
          configData = eval('require')(fullPath) as { [key: string]: string };
          /* tslint:enable */
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!JSONExt.isObject(configData)) {
      configData = Object.create(null);
    } else {
      for (let key in configData) {
        // Quote characters are escaped, unescape them.
        configData[key] = String(configData[key]).split('&#39;').join('"');
      }
    }
    return configData![name] || '';
  }

  /**
   * Set global configuration data for the Jupyter application.
   *
   * @param name - The name of the configuration option.
   * @param value - The value to set the option to.
   *
   * @returns The last config value or an empty string if it doesn't exist.
   */
  export
  function setOption(name: string, value: string): string {
    const last = getOption(name);

    configData![name] = value;
    return last;
  }

  /**
   * Get the base url for a Jupyter application.
   */
  export
  function getBaseUrl(): string {
    let baseUrl = getOption('baseUrl');
    if (!baseUrl || baseUrl === '/') {
      baseUrl = (typeof location === 'undefined' ?
                 'http://localhost:8888/' : location.origin + '/');
    }
    return URLExt.parse(baseUrl).toString();
  }

  /**
   * Get the tree url for a JupyterLab application.
   *
   * @param options - The tree URL construction options.
   */
  export
  function getTreeUrl(options: ITreeOptions = { }): string {
    const base = getBaseUrl();
    const page = getOption('pageUrl');
    const workspaces = getOption('workspacesUrl');
    const workspace = getOption('workspace');
    const includeWorkspace = !!options.workspace;

    if (includeWorkspace && workspace) {
      return URLExt.join(base, workspaces, workspace, 'tree');
    } else {
      return URLExt.join(base, page, 'tree');
    }
  }

  /**
   * Get the base websocket url for a Jupyter application.
   */
  export
  function getWsUrl(baseUrl?: string): string {
    let wsUrl = getOption('wsUrl');
    if (!wsUrl) {
      baseUrl = baseUrl || getBaseUrl();
      if (baseUrl.indexOf('http') !== 0) {
        if (typeof location !== 'undefined') {
          baseUrl = URLExt.join(location.origin, baseUrl);
        } else {
          baseUrl = URLExt.join('http://localhost:8888/', baseUrl);
        }
      }
      wsUrl = 'ws' + baseUrl.slice(4);
    }
    return URLExt.parse(wsUrl).toString();
  }

  /**
   * Get the authorization token for a Jupyter application.
   */
  export
  function getToken(): string {
    return getOption('token') || Private.getBodyData('jupyterApiToken');
  }

  /**
   * Get the Notebook version info [major, minor, patch].
   */
  export
  function getNotebookVersion(): [number, number, number] {
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
}


/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * Get a url-encoded item from `body.data` and decode it
   * We should never have any encoded URLs anywhere else in code
   * until we are building an actual request.
   */
  export
  function getBodyData(key: string): string {
    if (typeof document === 'undefined' || !document.body) {
      return '';
    }
    let val = document.body.dataset[key];
    if (typeof val === 'undefined') {
      return '';
    }
    return decodeURIComponent(val);
  }
}
