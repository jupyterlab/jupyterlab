// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  JSONObject
} from '@phosphor/coreutils';

import * as minimist
  from 'minimist';

import * as path
  from 'path-posix';

import * as urlparse
  from 'url-parse';


// Stub for requirejs.
declare var requirejs: any;


// Export the Promise Delegate for now to preserve API.
export { PromiseDelegate } from '@phosphor/coreutils';


/**
 * Copy the contents of one object to another, recursively.
 *
 * From [stackoverflow](http://stackoverflow.com/a/12317051).
 */
export
function extend(target: any, source: any): any {
  target = target || {};
  for (let prop in source) {
    if (typeof source[prop] === 'object') {
      target[prop] = extend(target[prop], source[prop]);
    } else {
      target[prop] = source[prop];
    }
  }
  return target;
}


/**
 * Get a deep copy of a JSON object.
 */
export
function copy(object: JSONObject): JSONObject {
  return JSON.parse(JSON.stringify(object));
}


/**
 * Get a random 32 character hex string (not a formal UUID)
 */
export
function uuid(): string {
  let s: string[] = [];
  let hexDigits = '0123456789abcdef';
  let nChars = hexDigits.length;
  for (let i = 0; i < 32; i++) {
    s[i] = hexDigits.charAt(Math.floor(Math.random() * nChars));
  }
  return s.join('');
}


/**
 * A URL object.
 *
 * This interface is from the npm package URL object interface. We
 * include it here so that downstream libraries do not have to include
 * the `url` typing files, since the npm `url` package is not in the
 * @types system.
 */

export interface IUrl {
    href?: string;
    protocol?: string;
    hostname?: string;
    port?: string;
    host?: string;
    pathname?: string;
    hash?: string;
    search?: string;
}

/**
 * Parse a url into a URL object.
 *
 * @param url - The URL string to parse.
 *
 * @returns A URL object.
 */

export
function urlParse(url: string): IUrl {
  if (typeof document !== 'undefined') {
    let a = document.createElement('a');
    a.href = url;
    return a;
  }
  return urlparse(url);
}


/**
 * Join a sequence of url components with `'/'`.
 */
export
function urlPathJoin(...parts: string[]): string {
  // Adapted from url-join.
  // Copyright (c) 2016 José F. Romaniello, MIT License.
  // https://github.com/jfromaniello/url-join/blob/v1.1.0/lib/url-join.js
  let str = [].slice.call(parts, 0).join('/');

  // make sure protocol is followed by two slashes
  str = str.replace(/:\//g, '://');

  // remove consecutive slashes
  str = str.replace(/([^:\s])\/+/g, '$1/');

  // remove trailing slash before parameters or hash
  str = str.replace(/\/(\?|&|#[^!])/g, '$1');

  // replace ? in parameters with &
  str = str.replace(/(\?.+)\?/g, '$1&');

  return str;
}


/**
 * Encode the components of a multi-segment url.
 *
 * #### Notes
 * Preserves the `'/'` separators.
 * Should not include the base url, since all parts are escaped.
 */
export
function urlEncodeParts(uri: string): string {
  return urlPathJoin(...uri.split('/').map(encodeURIComponent));
}


/**
 * Return a serialized object string suitable for a query.
 *
 * From [stackoverflow](http://stackoverflow.com/a/30707423).
 */
export
function jsonToQueryString(json: JSONObject): string {
  return '?' + Object.keys(json).map(key =>
    encodeURIComponent(key) + '=' + encodeURIComponent(String(json[key]))
  ).join('&');
}


/**
 * Input settings for an AJAX request.
 */
export
interface IAjaxSettings extends JSONObject {
  /**
   * The HTTP method to use.  Defaults to `'GET'`.
   */
  method?: string;

  /**
   * The return data type (used to parse the return data).
   */
  dataType?: string;

  /**
   * The outgoing content type, used to set the `Content-Type` header.
   */
  contentType?: string;

  /**
   * The request data.
   */
  data?: any;

  /**
   * Whether to cache the response. Defaults to `true`.
   */
  cache?: boolean;

  /**
   * The number of milliseconds a request can take before automatically
   * being terminated.  A value of 0 (which is the default) means there is
   * no timeout.
   */
  timeout?: number;

  /**
   * A mapping of request headers, used via `setRequestHeader`.
   */
  requestHeaders?: { [key: string]: string; };

  /**
   * Is a Boolean that indicates whether or not cross-site Access-Control
   * requests should be made using credentials such as cookies or
   * authorization headers.  Defaults to `false`.
   */
  withCredentials?: boolean;

  /**
   * The user name associated with the request.  Defaults to `''`.
   */
  user?: string;

  /**
   * The password associated with the request.  Defaults to `''`.
   */
  password?: string;
}


/**
 * Data for a successful  AJAX request.
 */
export
interface IAjaxSuccess {
  /**
   * The `onload` event.
   */
  readonly event: ProgressEvent;

  /**
   * The XHR object.
   */
  readonly xhr: XMLHttpRequest;

  /**
   * The ajax settings associated with the request.
   */
  readonly ajaxSettings: IAjaxSettings;

  /**
   * The data returned by the ajax call.
   */
  readonly data: any;
}


/**
 * Data for an unsuccesful AJAX request.
 */
export
interface IAjaxError {
  /**
   * The event triggering the error.
   */
  readonly event: Event;

  /**
   * The XHR object.
   */
  readonly xhr: XMLHttpRequest;

  /**
   * The ajax settings associated with the request.
   */
  readonly ajaxSettings: IAjaxSettings;

  /**
   * The error message, if `onerror`.
   */
  readonly throwError?: string;
}


function _getCookie(name: string) {
  // from tornado docs: http://www.tornadoweb.org/en/stable/guide/security.html
  var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
  return r ? r[1] : void 0;
}
/**
 * Asynchronous XMLHTTPRequest handler.
 *
 * @param url - The url to request.
 *
 * @param settings - The settings to apply to the request and response.
 *
 * #### Notes
 * Based on this [example](http://www.html5rocks.com/en/tutorials/es6/promises/#toc-promisifying-xmlhttprequest).
 */
export
function ajaxRequest(url: string, ajaxSettings: IAjaxSettings): Promise<IAjaxSuccess> {
  let method = ajaxSettings.method || 'GET';

  // Ensure that requests have applied data.
  if (!ajaxSettings.data) {
    ajaxSettings.data = '{}';
    ajaxSettings.contentType = 'application/json';
  }

  let user = ajaxSettings.user || '';
  let password = ajaxSettings.password || '';
  let headers = ajaxSettings.requestHeaders || {};

  if (!ajaxSettings.cache) {
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache.
    url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime();
  }

  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true, user, password);

    if (ajaxSettings.contentType !== void 0) {
      xhr.setRequestHeader('Content-Type', ajaxSettings.contentType);
    }
    if (ajaxSettings.timeout !== void 0) {
      xhr.timeout = ajaxSettings.timeout;
    }
    if (!!ajaxSettings.withCredentials) {
      xhr.withCredentials = true;
    }

    // Try to add the xsrf token if there is no existing authorization.
    let token = headers['Authorization'];
    if (!token && typeof document !== 'undefined' && document.cookie) {
      let xsrfToken = _getCookie('_xsrf');
      if (xsrfToken !== void 0) {
        xhr.setRequestHeader('X-XSRFToken', xsrfToken);
      }
    }

     for (let prop in headers) {
       xhr.setRequestHeader(prop, headers[prop]);
     }

    xhr.onload = (event: ProgressEvent) => {
      if (xhr.status >= 300) {
        reject({ event, xhr, ajaxSettings, throwError: xhr.statusText });
      }
      let data = xhr.responseText;
      try {
        data = JSON.parse(data);
      } catch (err) {
        // no-op
      }
      resolve({ xhr, ajaxSettings, data, event });
    };

    xhr.onabort = (event: Event) => {
      reject({ xhr, event, ajaxSettings });
    };

    xhr.onerror = (event: ErrorEvent) => {
      reject({ xhr, event, ajaxSettings });
    };

    xhr.ontimeout = (ev: ProgressEvent) => {
      reject({ xhr, event, ajaxSettings });
    };

    if (ajaxSettings.data) {
      xhr.send(ajaxSettings.data);
    } else {
      xhr.send();
    }
  });
}


/**
 * Create an ajax error from an ajax success.
 *
 * @param success - The original success object.
 *
 * @param throwError - The optional new error name.  If not given
 *  we use "Invalid Status: <xhr.status>"
 */
export
function makeAjaxError(success: IAjaxSuccess, throwError?: string): IAjaxError {
  let xhr = success.xhr;
  let ajaxSettings = success.ajaxSettings;
  let event = success.event;
  throwError = throwError || `Invalid Status: ${xhr.status}`;
  return { xhr, ajaxSettings, event, throwError };
}


/**
 * Try to load an object from a module or a registry.
 *
 * Try to load an object from a module asynchronously if a module
 * is specified, otherwise tries to load an object from the global
 * registry, if the global registry is provided.
 */
export
function loadObject(name: string, moduleName: string, registry?: { [key: string]: any }): Promise<any> {
  return new Promise((resolve, reject) => {
    // Try loading the view module using require.js
    if (moduleName) {
      if (typeof requirejs === 'undefined') {
        throw new Error('requirejs not found');
      }
      requirejs([moduleName], (mod: any) => {
        if (mod[name] === void 0) {
          let msg = `Object '${name}' not found in module '${moduleName}'`;
          reject(new Error(msg));
        } else {
          resolve(mod[name]);
        }
      }, reject);
    } else {
      if (registry && registry[name]) {
        resolve(registry[name]);
      } else {
        reject(new Error(`Object '${name}' not found in registry`));
      }
    }
  });
};


/**
 * Global config data for the Jupyter application.
 */
let configData: any = null;


/**
 * Declare a stub for the node process variable.
 */
declare var process: any;


/**
 *  Make an object fully immutable by freezing each object in it.
 */
function deepFreeze(obj: any): any {

  // Freeze properties before freezing self
  Object.getOwnPropertyNames(obj).forEach(function(name) {
    let prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop === 'object' && prop !== null && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });

  // Freeze self
  return Object.freeze(obj);
}


/**
 * Get global configuration data for the Jupyter application.
 *
 * @param name - The name of the configuration option.
 *
 * @returns The config value or `undefined` if not found.
 *
 * #### Notes
 * For browser based applications, it is assumed that the page HTML
 * includes a script tag with the id `jupyter-config-data` containing the
 * configuration as valid JSON.
 */
export
function getConfigOption(name: string): string {
  if (configData) {
    return configData[name];
  }
  if (typeof document === 'undefined') {
    configData = minimist(process.argv.slice(2));
  } else {
    let el = document.getElementById('jupyter-config-data');
    if (el) {
      configData = JSON.parse(el.textContent);
    } else {
      configData = {};
    }
  }
  configData = deepFreeze(configData);
  return configData[name];
}


/**
 * Get the base URL for a Jupyter application.
 */
export
function getBaseUrl(): string {
  let baseUrl = getConfigOption('baseUrl');
  if (!baseUrl || baseUrl === '/') {
    baseUrl = (typeof location === 'undefined' ?
               'http://localhost:8888/' : location.origin + '/');
  }
  return baseUrl;
}


/**
 * Get the base websocket URL for a Jupyter application.
 */
export
function getWsUrl(baseUrl?: string): string {
  let wsUrl = getConfigOption('wsUrl');
  if (!wsUrl) {
    baseUrl = baseUrl || getBaseUrl();
    if (baseUrl.indexOf('http') !== 0) {
      if (typeof location !== 'undefined') {
        baseUrl = path.join(location.origin, baseUrl);
      } else {
        baseUrl = path.join('http://localhost:8888/', baseUrl);
      }
    }
    wsUrl = 'ws' + baseUrl.slice(4);
  }
  return wsUrl;
}

/**
 * Add token to ajaxSettings.requestHeaders if defined.
 * Always returns a copy of ajaxSettings, and a dict.
 */
export
function ajaxSettingsWithToken(ajaxSettings?: IAjaxSettings, token?: string): IAjaxSettings {
  if (!ajaxSettings) {
    ajaxSettings = {};
  } else {
    ajaxSettings = copy(ajaxSettings);
  }
  if (!token) {
    token = getConfigOption('token');
  }
  if (!token || token === '') {
    return ajaxSettings;
  }
  if (!ajaxSettings.requestHeaders) {
    ajaxSettings.requestHeaders = {};
  }
  ajaxSettings.requestHeaders['Authorization'] = `token ${token}`;
  return ajaxSettings;
}
