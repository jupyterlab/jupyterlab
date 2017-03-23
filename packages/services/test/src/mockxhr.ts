// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

// Mock implementation of XMLHttpRequest following
// https://developer.mozilla.org/en-US/docs/Web/API/xmlhttprequest


/**
 * Mock XMLHttpRequest object.
 * Handles a global list of request, and adds the ability to respond()
 * to them.
 */
export
class MockXMLHttpRequest {

  static UNSENT = 0;            // open() has not been called yet.
  static OPENED = 1;            // send() has been called.
  static HEADERS_RECEIVED = 2;  // send() has been called, and headers and status are available.
  static LOADING = 3;           // Downloading; responseText holds partial data.
  static DONE = 4;              // The operation is complete.

  /**
   * Global list of XHRs.
   */
  static requests: MockXMLHttpRequest[] = [];

  /**
   * Register a callback for the next request.
   *
   * It is automatically cleared after the request.
   */
  static onRequest: (request: MockXMLHttpRequest) => void = null;

  /**
   * Ready state of the request.
   */
  get readyState(): number {
    return this._readyState;
  }

  /**
   * Password of the request.
   */
  get password(): string {
    return this._password;
  }

  /**
   * Async status of the request.
   */
  get async(): boolean {
    return this._async;
  }

  /**
   * Response data for the request.
   */
  get response(): any {
    return this._response;
  }

  /**
   * Response data for the request as string.
   */
  get responseText(): string {
    return '' + this._response;
  }

  /**
   * Enumerated value that represents the response type.
   */
  get responseType(): string {
    return this._responseType;
  }

  /**
   * Status code of the response of the request.
   */
  get status(): number {
    return this._status;
  }

  /**
   * The status string returned by the server.
   */
  get statusText() {
    return this._statusText;
  }

  /**
   * Get the number of milliseconds to wait before a request is
   * automatically canceled.
   */
  get timeout(): number {
    return this._timeout;
  }

  /**
   * Set the number of milliseconds to wait before a request is
   * automatically canceled.
   */
  set timeout(timeout: number) {
    this._timeout = timeout;
  }

  /**
   * Set a callback for with the request is loaded.
   */
  set onload(cb: () => void) {
    this._onLoad = cb;
  }

  /**
   * Set a callback for when the request has an error.
   */
  set onerror(cb: (evt?: any) => void) {
    this._onError = cb;
  }

  /**
   * Set a callback for when the request is in progress.
   */
  set onprogress(cb: () => void) {
    throw new Error('Not implemented');
    //this._onProgress = cb;
  }

  /**
   * Set a callback for when the ready state changes.
   */
  set onreadystatechange(cb: () => void) {
    this._onReadyState = cb;
  }

  /**
   * Set a callback for when the ready state changes.
   */
  set ontimeout(cb: () => void) {
    this._onTimeout = cb;
  }

  /**
   * Get the method of the request.
   */
  get method(): string {
    return this._method;
  }

  /**
   * Get the url of the request.
   */
  get url(): string {
    return this._url;
  }

  /**
   * Get the body request data.
   */
  get requestBody(): any {
    return this._data;
  }

  /**
   * Initialize a request.
   */
  open(method: string, url: string, async?: boolean, user?: string, password?:string): void {
    this._method = method;
    this._url = url;
    if (async !== void 0) {
      this._async = async;
    }
    if (user !== void 0) {
      this._user = user;
    }
    this._password = password || '';
    this._readyState = MockXMLHttpRequest.OPENED;
    doLater(() => {
      var onReadyState = this._onReadyState;
      if (onReadyState) onReadyState();
    });
  }

  /**
   * Override the MIME type returned by the server.
   */
  overrideMimeType(mime: string): void {
    this._mimetype = mime;
  }

  /**
   * Sends the request.
   */
  send(data?: any) {
    if (data !== void 0) {
      this._data = data;
    }
    MockXMLHttpRequest.requests.push(this);
    setTimeout(() => {
      if (MockXMLHttpRequest.requests.indexOf(this) === -1) {
        console.warn('Unhandled request:', JSON.stringify(this));
        throw new Error('Unhandled request: ' + JSON.stringify(this));
      }
      var onRequest = MockXMLHttpRequest.onRequest;
      if (onRequest) onRequest(this);
      if (this._timeout > 0) {
        setTimeout(() => {
          if (this._readyState != MockXMLHttpRequest.DONE) {
            var cb = this._onTimeout;
            if (cb) cb();
          }
        }, this._timeout);
      }
    }, 0);
  }

  /**
   * Get a copy of the HTTP request header.
   */
  get requestHeaders(): { [key: string]: any } {
    return JSON.parse(JSON.stringify(this._requestHeader));
  }

  /**
   * Set the value of an HTTP request header.
   */
  setRequestHeader(header: string, value: string) {
    this._requestHeader[header] = value;
  }

  /**
   * Returns the string containing the text of the specified header,
   * or null if either the response has not yet been received
   * or the header doesn't exist in the response.
   */
  getResponseHeader(header: string): string {
    if (this._responseHeader.hasOwnProperty(header)) {
      return this._responseHeader[header];
    }
  }

  /**
   * Respond to a Mock XHR.
   */
  respond(statusCode: number, response: any, header?: any) {
    if (header === void 0) {
      header = {'Content-Type': 'text/json'};
    }
    if (typeof response !== 'string') {
      response = JSON.stringify(response);
    }
    this._status = statusCode;
    this._response = response;
    this._responseHeader = header;
    this._readyState = MockXMLHttpRequest.DONE;

    doLater(() => {
      this._statusText = `${statusCode} ${statusReasons[statusCode]}`;
      var onReadyState = this._onReadyState;
      if (onReadyState) onReadyState();
      var onLoad = this._onLoad;
      if (onLoad) onLoad();
    });
  }

  /**
   * Simulate a request error.
   */
  error(error: Error): void {
    this._response = '';
    this._readyState = MockXMLHttpRequest.DONE;

    doLater(() => {
      var onError = this._onError;
      if (onError) onError(error);
    });
  }

  private _readyState = MockXMLHttpRequest.UNSENT;
  private _response: any = '';
  private _responseType = '';
  private _status = -1;
  private _statusText = '';
  private _timeout = -1;
  private _mimetype = '';
  private _data: any;
  private _method = '';
  private _url = '';
  private _async = true;
  private _user = '';
  private _password = '';
  private _onLoad: () => void = null;
  private _onError: (evt: Error) => void = null;
  private _onProgress: () => void = null;
  private _requestHeader: { [key: string]: any } = Object.create(null);
  private _responseHeader: { [key: string]: any } = Object.create(null);
  private _onReadyState: () => void = null;
  private _onTimeout: () => void = null;
}



/**
 * Do something in the future ensuring total ordering wrt to Promises.
 */
function doLater(cb: () => void): void {
  Promise.resolve().then(cb);
}


/**
 * Status code reasons.
 */
var statusReasons: { [ key: number]: string } = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Moved Temporarily',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Time-out',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Large',
  415: 'Unsupported Media Type',
  416: 'Requested range not satisfiable',
  417: 'Expectation Failed',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Time-out',
  505: 'HTTP Version not supported',
  507: 'Insufficient Storage'
}
