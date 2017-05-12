// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  JSONExt, JSONObject
} from '@phosphor/coreutils';


// Stub for requirejs.
declare var requirejs: any;


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
 * Add token to ajaxSettings.requestHeaders if defined.
 * Always returns a copy of ajaxSettings, and a dict.
 */
export
function ajaxSettingsWithToken(ajaxSettings?: IAjaxSettings, token?: string): IAjaxSettings {
  if (!ajaxSettings) {
    ajaxSettings = {};
  } else {
    ajaxSettings = JSONExt.deepCopy(ajaxSettings);
  }
  if (!token) {
    token = PageConfig.getOption('token');
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
