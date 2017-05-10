// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt
} from '@phosphor/coreutils';

import * as minimist
  from 'minimist';

import {
  URLExt
} from './url';


/**
 * Declare stubs for the node variables.
 */
declare var global: any;
declare var process: any;
declare var require: any;


/**
 * The namespace for Page Config functions.
 */
export
namespace PageConfig {
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
   * configuration as valid JSON.
   * For node applications, it is assumed that the process was launched
   * with a `--jupyter-config-data` option pointing to a JSON settings
   * file.
   */
  export
  function getOption(name: string): string {
    if (configData) {
      return configData[name] || '';
    }
    configData = Object.create(null);
    // Use CLI if on node.
    if (typeof window === 'undefined') {
      let cli = minimist(process.argv.slice(2));
      if ('jupyter-config-data' in cli) {
        let path: any = require('path');
        let fullPath = path.resolve(cli['jupyter-config-data']);
        try {
          configData = global.require(fullPath) as { [key: string]: string };
        } catch (e) {
          console.error(e);
        }
      }
    // Use script tag if in the browser.
    } else {
      let el = document.getElementById('jupyter-config-data');
      if (el) {
        configData = JSON.parse(el.textContent || '') as { [key: string]: string };
      }
    }
    if (!JSONExt.isObject(configData)) {
      configData = Object.create(null);
    } else {
      for (let key in configData) {
        configData[key] = String(configData[key]);
      }
    }
    return configData[name] || '';
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
    let parsed = URLExt.parse(baseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  }

  /**
   * Get the base websocket URLExt for a Jupyter application.
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
    let parsed = URLExt.parse(wsUrl);
    return `${parsed.protocol}//${parsed.host}`;
  }

  /**
   * Private page config data for the Jupyter application.
   */
  let configData: { [key: string]: string } | null = null;
}
