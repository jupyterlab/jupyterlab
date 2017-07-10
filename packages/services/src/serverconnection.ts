// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  JSONValue, PromiseDelegate
} from '@phosphor/coreutils';


/**
 * The namespace for ServerConnection functions.
 */
export
namespace ServerConnection {
  /**
   * Make an Asynchronous XMLHttpRequest.
   *
   * @param request - The data for the request.
   *
   * @param settings - The server settings to apply to the request.
   *
   * @returns a Promise that resolves with the response data.
   */
  export
  function makeRequest(request: IRequest, settings: ISettings): Promise<IResponse> {
    let url = request.url;
    if (request.cache !== true) {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache.
      url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime();
    }
    let xhr = settings.xhrFactory();
    xhr.open(request.method || 'GET', url, true,
             settings.user, settings.password);
    Private.populateRequest(xhr, request, settings);
    return Private.handleRequest(xhr, request, settings);
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
    // Use the singleton default settings if no options are given.
    if (options === void 0) {
      if (Private.defaultSettings === null) {
        Private.defaultSettings = Private.makeSettings();
      }
      return Private.defaultSettings;
    }
    return Private.makeSettings(options);
  }

  /**
   * Create an AJAX error from an AJAX success.
   *
   * @param response - The response object.
   *
   * @param message - The optional new error message.  If not given
   *  we use "Invalid Status: <xhr.status>"
   */
  export
  function makeError(response: IResponse, message?: string): IError {
    let { xhr, request, settings, event } = response;
    message = message || `Invalid Status: ${xhr.status}`;
    return { xhr, request, settings, event, message };
  }

  /**
   * Ajax Request data.
   */
  export
  interface IRequest {
    /**
     * The url of the request.
     */
    url: string;

    /**
     * The HTTP method to use.  Defaults to `'GET'`.
     */
    method?: string;

    /**
     * The return data type (used to parse the return data).  Defaults to 'json'.
     */
    dataType?: string;

    /**
     * The outgoing content type, used to set the `Content-Type` header.  Defaults to `'application/json'` when there is sent data.
     */
    contentType?: string;

    /**
     * The request data.
     */
    data?: JSONValue;

    /**
     * Whether to cache the response. Defaults to `false`.
     */
    cache?: boolean;

    /**
     * A mapping of request headers, used via `setRequestHeader`.
     */
    headers?: { [key: string]: string; };
  }

  /**
   * A server settings object.
   */
  export
  interface ISettings {
    /**
     * The base url of the server.  Defaults to PageConfig.getBaseUrl.
     */
    readonly baseUrl: string;

    /**
     * The base ws url of the server.  Defaults to PageConfig.getWsUrl.
     */
    readonly wsUrl: string;

    /**
     * Is a Boolean that indicates whether or not cross-site Access-Control
     * requests should be made using credentials such as cookies or
     * authorization headers.  Defaults to `false`.
     */
    readonly withCredentials: boolean;

    /**
     * The user name associated with the request.  Defaults to `''`.
     */
    readonly user: string;

    /**
     * The password associated with the request.  Defaults to `''`.
     */
    readonly password: string;

    /**
     * The timeout associated with requests.  Defaults to `0`.
     */
    readonly timeout: number;

    /**
     * The optional token for ajax requests. Defaults to PageConfig `token`.
     */
    readonly token: string;

    /*
     * A mapping of request headers, used via `setRequestHeader`.
     */
    readonly requestHeaders: { readonly [key: string]: string; };

    /**
     * The XMLHttpRequest factory to use.  Defaults creating a new `XMLHttpRequest`.
     */
    readonly xhrFactory: () => XMLHttpRequest;

    /**
     * The WebSocket factory to use.  Defaults to creating a new `WebSocket`.
     */
    readonly wsFactory: (url: string, protocols?: string | string[]) => WebSocket;
  }

  /**
   * Data for a successful  AJAX request.
   */
  export
  interface IResponse {
    /**
     * The `onload` event.
     */
    readonly event: ProgressEvent;

    /**
     * The XHR object.
     */
    readonly xhr: XMLHttpRequest;

    /**
     * The request input data.
     */
    readonly request: IRequest;

    /**
     * The settings associated with the request.
     */
    readonly settings: ISettings;

    /**
     * The data returned by the ajax call.
     */
    readonly data: any;
  }

  /**
   * Data for an unsuccesful AJAX request.
   */
  export
  interface IError {
    /**
     * The event triggering the error.
     */
    readonly event: Event;

    /**
     * The XHR object.
     */
    readonly xhr: XMLHttpRequest;

    /**
     * The request input data.
     */
    readonly request: IRequest;

    /**
     * The settings associated with the request.
     */
    readonly settings: ISettings;

    /**
     * The error message associated with the error.
     */
    readonly message: string;
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  export
  let defaultSettings: ServerConnection.ISettings = null;

  /**
   * Handle the server connection settings, returning a new value.
   */
  export
  function makeSettings(options: Partial<ServerConnection.ISettings> = {}): ServerConnection.ISettings {
    let baseUrl = options.baseUrl || PageConfig.getBaseUrl();
    return {
      baseUrl,
      wsUrl: options.wsUrl || PageConfig.getWsUrl(baseUrl),
      user: options.user || '',
      password: options.password || '',
      withCredentials: !!options.withCredentials,
      timeout: options.timeout || 0,
      token: options.token || PageConfig.getOption('token'),
      requestHeaders: { ...options.requestHeaders || {} },
      xhrFactory: options.xhrFactory || xhrFactory,
      wsFactory: options.wsFactory || wsFactory
    };
  }

  /**
   * Make an xhr request using settings.
   */
  export
  function populateRequest(xhr: XMLHttpRequest, request: ServerConnection.IRequest, settings: ServerConnection.ISettings): void {
    if (request.contentType !== void 0) {
      xhr.setRequestHeader('Content-Type', request.contentType);
    } else if (request.data) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.timeout = settings.timeout;
    if (settings.withCredentials) {
      xhr.withCredentials = true;
    }

    // Write the request headers.
    let headers = request.headers;
    if (headers) {
      for (let prop in headers) {
        xhr.setRequestHeader(prop, headers[prop]);
      }
    }

    headers = settings.requestHeaders;
    for (let prop in headers) {
      xhr.setRequestHeader(prop, headers[prop]);
    }

    // Handle authorization.
    if (settings.token) {
      xhr.setRequestHeader('Authorization', `token ${settings.token}`);
    } else if (typeof document !== 'undefined' && document.cookie) {
      let xsrfToken = getCookie('_xsrf');
      if (xsrfToken !== void 0) {
        xhr.setRequestHeader('X-XSRFToken', xsrfToken);
      }
    }
  }

  /**
   * Handle a request.
   */
  export
  function handleRequest(xhr: XMLHttpRequest, request: ServerConnection.IRequest, settings: ServerConnection.ISettings): Promise<ServerConnection.IResponse> {
    let delegate = new PromiseDelegate<ServerConnection.IResponse>();

    xhr.onload = (event: ProgressEvent) => {
      if (xhr.status >= 300) {
        let message = xhr.statusText || `Invalid Status: ${xhr.status}`;
        delegate.reject({ event, xhr, request, settings, message });
      }
      let data = xhr.responseText;
      if (request.dataType === 'json' || request.dataType === undefined) {
         try {
          data = JSON.parse(data);
        } catch (err) {
          // no-op
        }
      }
      delegate.resolve({ xhr, request, settings, data, event });
    };

    xhr.onabort = (event: Event) => {
      delegate.reject({ xhr, event, request, settings, message: 'Aborted' });
    };

    xhr.onerror = (event: ErrorEvent) => {
      delegate.reject({ xhr, event, request, settings, message: event.message });
    };

    xhr.ontimeout = (event: ProgressEvent) => {
      delegate.reject({ xhr, event, request, settings, message: 'Timed Out' });
    };

    // Send the request, adding data if needed.
    switch (request.method) {
    case 'GET':
    case 'DELETE':
    case 'HEAD':
    case 'CONNECT':
    case 'TRACE':
      // These methods take no payload.
      xhr.send();
      break;
    default:
      // Set the content type if there is no given data.
      if (!request.data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      xhr.send(request.data || '{}');
    }

    return delegate.promise;
  }

  /**
   * Create a new xhr object.
   */
  function xhrFactory(): XMLHttpRequest {
    return new XMLHttpRequest();
  }

  /**
   * Create a new ws object.
   */
  function wsFactory(url: string, protocols?: string | string[]): WebSocket {
    return new WebSocket(url, protocols);
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
