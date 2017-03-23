// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import encoding = require('text-encoding');

import {
  JSONPrimitive, PromiseDelegate
} from '@phosphor/coreutils';

import * as WebSocket
  from  'ws';

import {
  Server
} from 'ws';

import {
  Contents, Kernel, KernelMessage, TerminalSession, Session
} from '../../lib';

import {
  IAjaxSettings, uuid, IAjaxError
} from '../../lib/utils';

import {
  deserialize, serialize
} from '../../lib/kernel/serialize';

import {
  MockXMLHttpRequest
} from './mockxhr';


// stub for node global
declare var global: any;

global.WebSocket = WebSocket;


/**
 * Optional ajax arguments.
 */
export
const ajaxSettings: IAjaxSettings = {
  timeout: 10,
  requestHeaders: { foo: 'bar', fizz: 'buzz' },
  withCredentials: true,
  user: 'foo',
  password: 'bar'
};


export
const EXAMPLE_KERNEL_INFO: KernelMessage.IInfoReply = {
  protocol_version: '1',
  implementation: 'a',
  implementation_version: '1',
  language_info: {
    name: 'test',
    version: '',
    mimetype: '',
    file_extension: '',
    pygments_lexer: '',
    codemirror_mode: '',
    nbconverter_exporter: ''
  },
  banner: '',
  help_links: {
  }
};


export
const KERNEL_OPTIONS: Kernel.IOptions = {
  baseUrl: 'http://localhost:8888',
  name: 'python',
  username: 'testUser',
};


export
const AJAX_KERNEL_OPTIONS: Kernel.IOptions = {
  baseUrl: 'http://localhost:8888',
  name: 'python',
  username: 'testUser',
  ajaxSettings: ajaxSettings
};


export
const PYTHON_SPEC: any = {
  name: 'Python',
  spec: {
    language: 'python',
    argv: [],
    display_name: 'python',
    env: {},
  },
  resources: { foo: 'bar' },
};


export
const DEFAULT_FILE: Contents.IModel = {
  name: 'test',
  path: '',
  type: 'file',
  created: 'yesterday',
  last_modified: 'today',
  writable: true,
  mimetype: 'text/plain',
  content: 'hello, world!',
  format: 'text'
};


export
const KERNELSPECS: any = {
  default: 'python',
  kernelspecs: {
    python: PYTHON_SPEC,
    shell: {
      name: 'shell',
      spec: {
        language: 'shell',
        argv: [],
        display_name: 'Shell',
        env: {}
      },
      resources: {}
    }
  }
};


export
interface IFakeRequest {
  url: string;
  method: string;
  requestHeaders: any;
  requestBody: string;
  status: number;
  statusText: string;
  async: boolean;
  username: string;
  password: string;
  withCredentials: boolean;
  respond(status: number, headers: any, body: string): void;
}



export
class RequestHandler {
  specs: Kernel.ISpecModels = KERNELSPECS;
  runningKernels: Kernel.IModel[] = [];
  runningSessions: Session.IModel[] = [];
  runningTerminals: TerminalSession.IModel[] = [];

  /**
   * Create a new RequestHandler.
   */
  constructor(onRequest?: (request: MockXMLHttpRequest) => void) {
    if (typeof window === 'undefined') {
      global.XMLHttpRequest = MockXMLHttpRequest;
      global.TextEncoder = encoding.TextEncoder;
      global.TextDecoder = encoding.TextDecoder;
    } else {
      (window as any).XMLHttpRequest = MockXMLHttpRequest;
    }
    MockXMLHttpRequest.requests = [];

    if (!onRequest) {
      onRequest = this._defaultHandler.bind(this);
    }
    this.onRequest = onRequest;
  }

  /**
   * Test whether the handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The request handler for the handler.
   */
  set onRequest(cb: (request: MockXMLHttpRequest) => void) {
    MockXMLHttpRequest.onRequest = cb;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.onRequest = this._defaultHandler.bind(this);
  }

  /**
   * Respond to the latest Ajax request.
   */
  respond(statusCode: number, data: any, header?: any): void {
    let len = MockXMLHttpRequest.requests.length;
    let request = MockXMLHttpRequest.requests[len - 1];
    request.respond(statusCode, data, header);
  }

  /**
   * The default handler for requests.
   */
  private _defaultHandler(request: MockXMLHttpRequest): void {
    let url = request.url;
    if (url.indexOf('api/sessions') !== -1) {
      this._handleSessionRequest(request);
    } else if (url.indexOf('api/kernelspecs') !== -1) {
      this.respond(200, this.specs);
    } else if (url.indexOf('api/kernels') !== -1) {
      this._handleKernelRequest(request);
    } else if (url.indexOf('api/terminals') !== -1) {
      this._handleTerminalRequst(request);
    }
  }

  /**
   * Handle kernel requests.
   */
  private _handleKernelRequest(request: MockXMLHttpRequest): void {
    let url = request.url;
    switch (request.method) {
    case 'POST':
      let data = { id: uuid(), name: KERNEL_OPTIONS.name };
      if (url.indexOf('interrupt') !== -1) {
        this.respond(204, data);
      } else if (url.indexOf('restart') !== -1) {
        this.respond(200, data);
      } else {
        this.respond(201, data);
      }
      break;
    case 'GET':
      for (let model of this.runningKernels) {
        if (request.url.indexOf(model.id) !== -1) {
          this.respond(200, model);
          return;
        }
      }
      for (let model of this.runningSessions) {
        if (request.url.indexOf(model.kernel.id) !== -1) {
          this.respond(200, model.kernel);
          return;
        }
      }
      this.respond(200, this.runningKernels);
      break;
    case 'DELETE':
      this.respond(204, {});
      break;
    default:
      break;
    }
  }

  /**
   * Handle session requests.
   */
  private _handleSessionRequest(request: MockXMLHttpRequest): void {
    let session: Session.IModel = {
      id: uuid(),
      kernel: {
        name: 'python',
        id: uuid()
      },
      notebook: {
        path: uuid()
      }
    };
    switch (request.method) {
    case 'PATCH':
      this.respond(200, session);
      break;
    case 'GET':
      for (let model of this.runningSessions) {
        if (request.url.indexOf(model.id) !== -1) {
          this.respond(200, model);
          return;
        }
      }
      this.respond(200, this.runningSessions);
      break;
    case 'POST':
      let model = { name: session.kernel.name, id: session.kernel.id };
      this.runningKernels.push(model);
      this.respond(201, session);
      break;
    case 'DELETE':
      this.respond(204, {});
      break;
    default:
      break;
    }
  }

  /**
   * Handle terminal requests.
   */
  private _handleTerminalRequst(request: MockXMLHttpRequest): void {
    switch (request.method) {
    case 'POST':
      this.respond(200, { name: uuid() });
      break;
    case 'GET':
      this.respond(200, this.runningTerminals);
      break;
    case 'DELETE':
      this.respond(204, {});
      break;
    default:
      break;
    }
  };

  private _isDisposed = false;
}


/**
 * Request and socket class test rig.
 */
class RequestSocketTester extends RequestHandler {
  /**
   * Create a new request and socket tester.
   */
  constructor(onRequest?: (request: any) => void) {
    super(onRequest);
    this._server = new Server({ port: 8888 });
    this._promiseDelegate = new PromiseDelegate<void>();
    this._server.on('connection', ws => {
      this._ws = ws;
      this.onSocket(ws);
      this._promiseDelegate.resolve(void 0);
      let connect = this._onConnect;
      if (connect) {
        connect(ws);
      }
    });
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._server.close();
    this._server = null;
    super.dispose();
  }

  get isDisposed(): boolean {
    return this._server === null;
  }

  /**
   * Send a raw message to the server.
   */
  sendRaw(msg: string | ArrayBuffer) {
    this._promiseDelegate.promise.then(() => {
      this._ws.send(msg);
    });
  }

  /**
   * Close the socket.
   */
  close() {
    this._promiseDelegate.promise.then(() => {
      this._promiseDelegate = new PromiseDelegate<void>();
      this._ws.close();
    });
  }

  /**
   * Register the handler for connections.
   */
  onConnect(cb: (ws: WebSocket) => void): void {
    this._onConnect = cb;
  }

  protected onSocket(sock: WebSocket): void { /* no-op */ }

  private _ws: WebSocket = null;
  private _promiseDelegate: PromiseDelegate<void> = null;
  private _server: Server = null;
  private _onConnect: (ws: WebSocket) => void = null;
}


/**
 * Kernel class test rig.
 */
export
class KernelTester extends RequestSocketTester {

  get initialStatus(): string {
    return this._initialStatus;
  }

  set initialStatus(status: string) {
    this._initialStatus = status;
  }

  sendStatus(status: string) {
    let options: KernelMessage.IOptions = {
      msgType: 'status',
      channel: 'iopub',
      session: uuid(),
    };
    let msg = KernelMessage.createMessage(options, { execution_state: status } );
    this.send(msg);
  }

  send(msg: KernelMessage.IMessage): void {
    this.sendRaw(serialize(msg));
  }

  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: KernelMessage.IMessage) => void): void {
    this._onMessage = cb;
  }

  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    this.sendStatus(this._initialStatus);
    sock.on('message', (msg: any) => {
      if (msg instanceof Buffer) {
        msg = new Uint8Array(msg).buffer;
      }
      let data = deserialize(msg);
      if (data.header.msg_type === 'kernel_info_request') {
        data.parent_header = data.header;
        data.header.msg_type = 'kernel_info_reply';
        data.content = EXAMPLE_KERNEL_INFO;
        this.send(data);
      } else {
        let onMessage = this._onMessage;
        if (onMessage) {
          onMessage(data);
        }
      }
    });
  }

  private _initialStatus = 'starting';
  private _onMessage: (msg: KernelMessage.IMessage) => void = null;
}


/**
 * Terminal session test rig.
 */
export
class TerminalTester extends RequestSocketTester {

  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: TerminalSession.IMessage) => void) {
    this._onMessage = cb;
  }

  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    sock.on('message', (msg: any) => {
      let onMessage = this._onMessage;
      if (onMessage) {
        let data = JSON.parse(msg) as JSONPrimitive[];
        let termMsg: TerminalSession.IMessage = {
          type: data[0] as TerminalSession.MessageType,
          content: data.slice(1)
        };
        onMessage(termMsg);
      }
    });
  }

  private _onMessage: (msg: TerminalSession.IMessage) => void = null;
}


/**
 * Expect a failure on a promise with the given message, then call `done`.
 */
export
function expectFailure(promise: Promise<any>, done: () => void, message?: string): Promise<any> {
  return promise.then((msg: any) => {
    throw Error('Expected failure did not occur');
  }, (error: Error) => {
    if (message && error.message.indexOf(message) === -1) {
      throw Error(`Error "${message}" not in: "${error.message}"`);
    }
  }).then(done, done);
}


/**
 * Expect an Ajax failure with a given throwError.
 */
export
function expectAjaxError(promise: Promise<any>, done: () => void, throwError: string): Promise<any> {
  return promise.then((msg: any) => {
    throw Error('Expected failure did not occur');
  }, (error: IAjaxError) => {
    if (error.throwError !== throwError) {
      throw Error(`Error "${throwError}" not equal to "${error.throwError}"`);
    }
  }).then(done, done);
}


/**
 * Do something in the future ensuring total ordering wrt to Promises.
 */
export
function doLater(cb: () => void): void {
  Promise.resolve().then(cb);
}
