// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONValue, PromiseDelegate
} from '@phosphor/coreutils';

import {
  PageConfig
} from './pageconfig';


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
   * @returns a Promise that resolves with the success data.
   */
  export
  function makeRequest(request: IRequest, settings: ISettings={}): Promise<ISuccess> {
    let url = request.url;
    if (request.cache !== false) {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache.
      url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime();
    }
    settings = Private.handleSettings(settings);
    let xhr: XMLHttpRequest;
    if (settings.factory) {
      xhr = new settings.factory();
    } else {
      xhr = new XMLHttpRequest();
    }
    xhr.open(settings.method!, url, true, settings.user!, settings.password!);
    Private.populateRequest(xhr, settings);
    return Private.handleRequest(xhr, settings);
  }

  /**
   * Create a settings object given a subset of options.
   *
   * @param options - An optional partial set of options.
   *
   * @returns The full settings object.
   */
  export
  function makeSettings(options: Partial<ISettings> = {}) {

  }

  /**
   * Create an AJAX error from an AJAX success.
   *
   * @param success - The original success object.
   *
   * @param message - The optional new error message.  If not given
   *  we use "Invalid Status: <xhr.status>"
   */
  export
  function makeError(success: ISuccess, message?: string): IError {
    let { xhr, settings, event } = success;
    message = message || `Invalid Status: ${xhr.status}`;
    return { xhr, settings, event, message };
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
    data?: JSONValue;

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
     * The optional token for ajax requests. Defaults to PageConfig `token`.
     */
    readonly token: string;

    /*
     * A mapping of request headers, used via `setRequestHeader`.
     */
    readonly requestHeaders: { readonly [key: string]: string; };
  }

  /**
   * Data for a successful  AJAX request.
   */
  export
  interface ISuccess {
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
    readonly data: JSONValue;
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
  /**
   * Handle the ajax settings, returning a new value.
   */
  export
  function handleSettings(settings: AJAX.ISettings): AJAX.ISettings {
    settings = {...settings};
    if (settings.requestHeaders) {
      settings.requestHeaders = {...settings.requestHeaders};
    } else {
      settings.requestHeaders = {};
    }

    // Handle default values.
    settings.method = settings.method || 'GET';
    settings.user = settings.user || '';
    settings.password = settings.password || '';
    settings.withCredentials = !!settings.withCredentials;
    settings.token = settings.token || PageConfig.getOption('token');

    // Ensure that requests have applied data.
    if (!settings.data) {
      settings.data = '{}';
      settings.contentType = 'application/json';
    }

    // Handle authorization.
    if (settings.token) {
      settings.requestHeaders['Authorization'] = `token ${settings.token}`;
    } else if (typeof document !== 'undefined' && document.cookie) {
      let xsrfToken = getCookie('_xsrf');
      if (xsrfToken !== void 0) {
        settings.requestHeaders['X-XSRFToken'] = xsrfToken;
      }
    }
    return settings;
  }

  /**
   * Make an xhr request using settings.
   */
  export
  function populateRequest(xhr: XMLHttpRequest, settings: AJAX.ISettings): void {
    if (settings.contentType !== void 0) {
      xhr.setRequestHeader('Content-Type', settings.contentType);
    }
    if (settings.timeout !== void 0) {
      xhr.timeout = settings.timeout;
    }
    if (settings.withCredentials) {
      xhr.withCredentials = true;
    }

    // Write the request headers.
    let headers = settings.requestHeaders!;
    for (let prop in headers) {
      xhr.setRequestHeader(prop, headers[prop]);
    }
  }

  /**
   * Handle a request.
   */
  export
  function handleRequest(xhr: XMLHttpRequest, settings: AJAX.ISettings): Promise<AJAX.ISuccess> {
    let delegate = new PromiseDelegate();

    xhr.onload = (event: ProgressEvent) => {
      if (xhr.status >= 300) {
        let message = `Invalid Status: ${xhr.status}`;
        delegate.reject({ event, xhr, settings, message });
      }
      let data = xhr.responseText;
      try {
        data = JSON.parse(data);
      } catch (err) {
        // no-op
      }
      delegate.resolve({ xhr, settings, data, event });
    };

    xhr.onabort = (event: Event) => {
      delegate.reject({ xhr, event, settings, message: 'Aborted' });
    };

    xhr.onerror = (event: ErrorEvent) => {
      delegate.reject({ xhr, event, settings, message: event.message });
    };

    xhr.ontimeout = (ev: ProgressEvent) => {
      delegate.reject({ xhr, event, settings, message: 'Timed Out' });
    };

    if (settings.data) {
      xhr.send(settings.data);
    } else {
      xhr.send();
    }

    return delegate.promise;
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
