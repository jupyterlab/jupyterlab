// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import encoding = require('text-encoding');

import WebSocket = require('ws');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  JSONObject, JSONPrimitive, PromiseDelegate
} from '@phosphor/coreutils';

import { Response } from 'node-fetch';

import {
  Contents, TerminalSession, ServerConnection
} from '../../lib';

import {
  Kernel, KernelMessage
} from '../../lib/kernel';

import {
  deserialize, serialize
} from '../../lib/kernel/serialize';

import {
  Session
} from '../../lib/session';


// stub for node global
declare var global: any;


/**
 * This can be used by test modules that wouldn't otherwise import
 * this file.
 */
export
function init() {
  if (typeof global !== 'undefined') {
    global.TextEncoder = encoding.TextEncoder;
    global.TextDecoder = encoding.TextDecoder;
  }
}


// Call init.
init();


/**
 * Create a set of server settings.
 */
export
function makeSettings(settings?: Partial<ServerConnection.ISettings>): ServerConnection.ISettings {
  return ServerConnection.makeSettings(settings);
}


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
  help_links: [{
    text: 'A very helpful link',
    url: 'https://very.helpful.website'
  }]
};


export
const KERNEL_OPTIONS: Kernel.IOptions = {
  name: 'python',
  username: 'testUser',
};


export
const PYTHON_SPEC: JSONObject = {
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
  path: 'foo/test',
  type: 'file',
  created: 'yesterday',
  last_modified: 'today',
  writable: true,
  mimetype: 'text/plain',
  content: 'hello, world!',
  format: 'text'
};


export
const KERNELSPECS: JSONObject = {
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


/**
 * Create a message from an existing message.
 */
export
function createMsg(channel: KernelMessage.Channel, parentHeader: JSONObject): KernelMessage.IMessage {
  return {
    channel: channel,
    parent_header: JSON.parse(JSON.stringify(parentHeader)),
    content: {},
    header: JSON.parse(JSON.stringify(parentHeader)),
    metadata: {},
    buffers: []
  };
}


/**
 * Get a single handler for a request.
 */
export
function getRequestHandler(status: number, body: any): ServerConnection.ISettings {
  let fetch = (info: RequestInfo, init: RequestInit) => {
    // Normalize the body.
    body = JSON.stringify(body);

    // Create the response and return it as a promise.
    let response = new Response(body, { status });
    return Promise.resolve(response as any);
  };
  return ServerConnection.makeSettings({ fetch });
}


/**
 * An interface for a service that has server settings.
 */
export
interface IService {
  readonly serverSettings: ServerConnection.ISettings;
}


/**
 * Handle a single request with a mock response.
 */
export
function handleRequest(item: IService, status: number, body: any) {
  // Store the existing fetch function.
  let oldFetch = item.serverSettings.fetch;

  // A single use callback.
  let temp = (info: RequestInfo, init: RequestInit) => {
    // Restore fetch.
    (item.serverSettings as any).fetch = oldFetch;

    // Normalize the body.
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    // Create the response and return it as a promise.
    let response = new Response(body, { status });
    return Promise.resolve(response as any);
  };

  // Override the fetch function.
  (item.serverSettings as any).fetch = temp;
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
 * Do something in the future ensuring total ordering wrt to Promises.
 */
export
function doLater(cb: () => void): void {
  Promise.resolve().then(cb);
}


/**
 * Socket class test rig.
 */
class SocketTester implements IService {
  /**
   * Create a new request and socket tester.
   */
  constructor() {
    this._server = new WebSocket.Server({ port: 8080 });
    this.serverSettings = ServerConnection.makeSettings({
      wsUrl: 'ws://localhost:8080/',
      WebSocket: WebSocket as any
    });
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

  readonly serverSettings: ServerConnection.ISettings;

  start(): Promise<Kernel.IKernel> {
    handleRequest(this, 201, { name: 'test', id: uuid() });
    let serverSettings = this.serverSettings;
    return Kernel.startNew({ serverSettings }).then(k => {
      this._kernel = k;
      return k;
    });
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this._kernel) {
      this._kernel.dispose();
    }
    this._server.close();
    this._server = null;
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
  private _server: WebSocket.Server = null;
  private _onConnect: (ws: WebSocket) => void = null;
  private _kernel: Kernel.IKernel | null = null;
  protected settings: ServerConnection.ISettings;
}


/**
 * Kernel class test rig.
 */
export
class KernelTester extends SocketTester {

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
 * Create a unique session id.
 */
export
function createSessionModel(id?: string): Session.IModel {
  return {
    id: id || uuid(),
    path: uuid(),
    name: '',
    type: '',
    kernel: { id: uuid(), name: uuid() }
  };
}


/**
 * Session test rig.
 */
export
class SessionTester extends KernelTester {
  /**
   * Start a mock session.
   */
  startSession(): Promise<Session.ISession> {
    handleRequest(this, 201, createSessionModel());
    let serverSettings = this.serverSettings;
    return Session.startNew({ path: uuid(), serverSettings }).then(s => {
      this._session = s;
      return s;
    });
  }

  dispose(): void {
    if (this._session) {
      this._session.dispose();
    }
    super.dispose();
  }

  private _session: Session.ISession;
}


/**
 * Terminal session test rig.
 */
export
class TerminalTester extends SocketTester {
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

