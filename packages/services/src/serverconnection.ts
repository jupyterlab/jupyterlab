// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PageConfig, URLExt
} from '@jupyterlab/coreutils';


/**
 * Handle the default `fetch` and `WebSocket` providers.
 */
declare var global: any;

let FETCH: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
let HEADERS: typeof Headers;
let REQUEST: typeof Request;
let WEBSOCKET: typeof WebSocket;

if (typeof window === 'undefined') {
  // Mangle the require statements so it does not get picked up in the
  // browser assets.
  /* tslint:disable */
  let fetchMod = eval('require')('node-fetch');
  FETCH = global.fetch || fetchMod;
  REQUEST = global.Request || fetchMod.Request;
  HEADERS = global.Headers || fetchMod.Headers;
  WEBSOCKET = global.WebSocket || eval('require')('ws');
  /* tslint:enable */
} else {
  FETCH = fetch;
  REQUEST = Request;
  HEADERS = Headers;
  WEBSOCKET = WebSocket;
}


/**
 * The namespace for ServerConnection functions.
 *
 * #### Notes
 * This is only intended to manage communication with the Jupyter server.
 *
 * The default values can be used in a JupyterLab or Jupyter Notebook context.
 *
 * We use `token` authentication if available, falling back on an XSRF
 * cookie if one has been provided on the `document`.
 *
 * A content type of `'application/json'` is added when using authentication
 * and there is no body data to allow the server to prevent malicious forms.
 */
export
namespace ServerConnection {
  /**
   * A Jupyter server settings object.
   * Note that all of the settings are optional when passed to
   * [[makeSettings]].  The default settings are given in [[defaultSettings]].
   */
  export
  interface ISettings {
     /**
      * The base url of the server.
      */
     readonly baseUrl: string;

     /**
      * The page url of the JupyterLab application.
      */
     readonly pageUrl: string;

     /**
      * The base ws url of the server.
      */
     readonly wsUrl: string;

     /**
      * The default request init options.
      */
     readonly init: RequestInit;

     /**
      * The authentication token for requests.  Use an empty string to disable.
      */
     readonly token: string;

     /**
      * The `fetch` method to use.
      */
     readonly fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;

     /**
      * The `Request` object constructor.
      */
     readonly Request: typeof Request;

     /**
      * The `Headers` object constructor.
      */
     readonly Headers: typeof Headers;

     /**
      * The `WebSocket` object constructor.
      */
     readonly WebSocket: typeof WebSocket;
  }

  /**
   * Create a settings object given a subset of options.
   *
   * @param options - An optional partial set of options.
   *
   * @returns The full settings object.
   */
  export
  function makeSettings(options?: Partial<ISettings>) {
    return Private.makeSettings(options);
  }

  /**
   * Make an request to the notebook server.
   *
   * @param url - The url for the request.
   *
   * @param init - The initialization options for the request.
   *
   * @param settings - The server settings to apply to the request.
   *
   * @returns a Promise that resolves with the response.
   *
   * @throws If the url of the request is not a notebook server url.
   *
   * #### Notes
   * The `url` must start with `settings.baseUrl`.  The `init` settings are
   * merged with `settings.init`, with `init` taking precedence.
   * The headers in the two objects are not merged.
   * If there is no body data, we set the content type to `application/json`
   * because it is required by the Notebook server.
   */
  export
  function makeRequest(url: string, init: RequestInit, settings: ISettings): Promise<Response> {
    return Private.handleRequest(url, init, settings);
  }

  /**
   * A wrapped error for a fetch response.
   */
  export
  class ResponseError extends Error {
    /**
     * Create a new response error.
     */
    constructor(response: Response, message?: string) {
      message = (message ||
        `Invalid response: ${response.status} ${response.statusText}`
      );
      super(message);
      this.response = response;
    }

    /**
     * The response associated with the error.
     */
    response: Response;
  }

  /**
   * A wrapped error for a network error.
   */
  export
  class NetworkError extends TypeError {
    /**
     * Create a new network error.
     */
    constructor(original: TypeError) {
      super(original.message);
      this.stack = original.stack;
    }
  }

  /**
   * The default settings.
   */
  export
  const defaultSettings: ServerConnection.ISettings = {
    baseUrl: PageConfig.getBaseUrl(),
    pageUrl: PageConfig.getOption('pageUrl'),
    wsUrl: PageConfig.getWsUrl(),
    token: PageConfig.getToken(),
    init: { 'cache': 'no-store', 'credentials': 'same-origin' },
    fetch: FETCH,
    Headers: HEADERS,
    Request: REQUEST,
    WebSocket: WEBSOCKET
  };
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Handle the server connection settings, returning a new value.
   */
  export
  function makeSettings(options: Partial<ServerConnection.ISettings> = {}): ServerConnection.ISettings {
    let extra: Partial<ServerConnection.ISettings> = {};
    if (options.baseUrl && !options.wsUrl) {
      // Setting baseUrl to https://host... sets wsUrl to wss://host...
      let baseUrl = options.baseUrl;
      if (baseUrl.indexOf('http') !== 0) {
        if (typeof location !== 'undefined') {
          baseUrl = URLExt.join(location.origin, baseUrl);
        } else {
          // TODO: Why are we hardcoding localhost and 8888? That doesn't seem
          // good. See https://github.com/jupyterlab/jupyterlab/issues/4761
          baseUrl = URLExt.join('http://localhost:8888/', baseUrl);
        }
      }
      extra = {
        wsUrl: 'ws' + baseUrl.slice(4),
      };
    }
    return {
      ...ServerConnection.defaultSettings,
      ...options,
      ...extra
    };
  }

  /**
   * Handle a request.
   *
   * @param url - The url for the request.
   *
   * @param init - The overrides for the request init.
   *
   * @param settings - The settings object for the request.
   *
   * #### Notes
   * The `url` must start with `settings.baseUrl`.  The `init` settings
   * take precedence over `settings.init`.
   */
  export
  function handleRequest(url: string, init: RequestInit, settings: ServerConnection.ISettings): Promise<Response> {

    // Handle notebook server requests.
    if (url.indexOf(settings.baseUrl) !== 0) {
      throw new Error('Can only be used for notebook server requests');
    }

    // Use explicit cache buster when `no-store` is set since
    // not all browsers use it properly.
    let cache = init.cache || settings.init.cache;
    if (cache === 'no-store') {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
      url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime();
    }

    let request = new settings.Request(url, { ...settings.init, ...init });

    // Handle authentication.
    let authenticated = false;
    if (settings.token) {
      authenticated = true;
      request.headers.append('Authorization', `token ${settings.token}`);
    } else if (typeof document !== 'undefined' && document.cookie) {
      let xsrfToken = getCookie('_xsrf');
      if (xsrfToken !== void 0) {
        authenticated = true;
        request.headers.append('X-XSRFToken', xsrfToken);
      }
    }

    // Set the content type if there is no given data and we are
    // using an authenticated connection.
    if (!request.bodyUsed && authenticated) {
      request.headers.set('Content-Type', 'application/json');
    }

    // Use `call` to avoid a `TypeError` in the browser.
    return settings.fetch.call(null, request).catch((e: TypeError) => {
      // Convert the TypeError into a more specific error.
      throw new ServerConnection.NetworkError(e);
    });
  }

  /**
   * Get a cookie from the document.
   */
  function getCookie(name: string) {
    // from tornado docs: http://www.tornadoweb.org/en/stable/guide/security.html
    let r = document.cookie.match('\\b' + name + '=([^;]*)\\b');
    return r ? r[1] : void 0;
  }
}
