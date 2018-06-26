// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import encoding from 'text-encoding';

import WebSocket from 'ws';

import expect from 'expect.js';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  JSONObject, JSONPrimitive, PromiseDelegate
} from '@phosphor/coreutils';

import { Response } from 'node-fetch';


import {
  ISignal, Signal
} from '@phosphor/signaling';

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
 * Expect a failure on a promise with the given message, then call `done` if provided.
 */
export
async function expectFailure(promise: Promise<any>, done?: () => void, message?: string): Promise<any> {
  let result = promise.then((msg: any) => {
    throw Error('Expected failure did not occur');
  }, (error: Error) => {
    if (message && error.message.indexOf(message) === -1) {
      throw Error(`Error "${message}" not in: "${error.message}"`);
    }
  });

  return done ? result.then(done, done) : result;
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
    const port = 8081;
    this._server = new WebSocket.Server({ port });
    this.serverSettings = ServerConnection.makeSettings({
      wsUrl: `ws://localhost:${port}/`,
      WebSocket: WebSocket as any
    });
    this._ready = new PromiseDelegate<void>();
    this._server.on('connection', ws => {
      this._ws = ws;
      this.onSocket(ws);
      this._ready.resolve(undefined);
      let connect = this._onConnect;
      if (connect) {
        connect(ws);
      }
    });
  }

  readonly serverSettings: ServerConnection.ISettings;

  get ready() {
    return this._ready.promise;
  }

  /**
   * Dispose the socket test rig.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._server.close();
    this._server = null;
  }

  /**
   * Test if the socket test rig is disposed.
   */
  get isDisposed(): boolean {
    return this._server === null;
  }

  /**
   * Send a raw message from the server to a connected client.
   */
  sendRaw(msg: string | ArrayBuffer) {
    this._ws.send(msg);
  }

  /**
   * Close the socket.
   */
  async close(): Promise<void> {
    this._ready = new PromiseDelegate<void>();
    this._ws.close();
  }

  /**
   * Register the handler for connections.
   */
  onConnect(cb: (ws: WebSocket) => void): void {
    this._onConnect = cb;
  }

  /**
   * A callback executed when a new server websocket is created.
   */
  protected onSocket(sock: WebSocket): void { /* no-op */ }

  private _ws: WebSocket = null;
  private _ready: PromiseDelegate<void> = null;
  private _server: WebSocket.Server = null;
  private _onConnect: (ws: WebSocket) => void = null;
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

  /**
   * The parent header sent on messages.
   *
   * #### Notes:
   * Set to `undefined` to send no parent header.
   */
  parentHeader: KernelMessage.IHeader | undefined;

  /**
   * Send the status from the server to the client.
   */
  sendStatus(msgId: string, status: Kernel.Status) {
    return this.sendMessage({msgId, msgType: 'status', channel: 'iopub'}, {execution_state: status});
  }

  /**
   * Send an iopub stream message.
   */
  sendStream(msgId: string, content: KernelMessage.IStreamMsg['content']) {
    return this.sendMessage({msgId, msgType: 'stream', channel: 'iopub'}, content);
  }

  /**
   * Send an iopub display message.
   */
  sendDisplayData(msgId: string, content: KernelMessage.IDisplayDataMsg['content']) {
    return this.sendMessage({msgId, msgType: 'display_data', channel: 'iopub'}, content);
  }

  /**
   * Send an iopub display message.
   */
  sendUpdateDisplayData(msgId: string, content: KernelMessage.IUpdateDisplayDataMsg['content']) {
    return this.sendMessage({msgId, msgType: 'update_display_data', channel: 'iopub'}, content);
  }
  /**
   * Send an iopub comm open message.
   */
  sendCommOpen(msgId: string, content: KernelMessage.ICommOpenMsg['content']) {
    return this.sendMessage({msgId, msgType: 'comm_open', channel: 'iopub'}, content);
  }

  /**
   * Send an iopub comm close message.
   */
  sendCommClose(msgId: string, content: KernelMessage.ICommCloseMsg['content']) {
    return this.sendMessage({msgId, msgType: 'comm_close', channel: 'iopub'}, content);
  }

  /**
   * Send an iopub comm message.
   */
  sendCommMsg(msgId: string, content: KernelMessage.ICommMsgMsg['content']) {
    return this.sendMessage({msgId, msgType: 'comm_msg', channel: 'iopub'}, content);
  }

  sendExecuteResult(msgId: string, content: KernelMessage.IExecuteResultMsg['content']) {
    return this.sendMessage({msgId, msgType: 'execute_result', channel: 'iopub'}, content);
  }

  sendExecuteReply(msgId: string, content: KernelMessage.IExecuteReply['content']) {
    return this.sendMessage({msgId, msgType: 'execute_reply', channel: 'shell'}, content);
  }

  sendKernelInfoReply(msgId: string, content: KernelMessage.IInfoReplyMsg['content']) {
    return this.sendMessage({msgId, msgType: 'kernel_info_reply', channel: 'shell'}, content);
  }

  sendInputRequest(msgId: string, content: KernelMessage.IInputRequestMsg['content']) {
    return this.sendMessage({msgId, msgType: 'input_request', channel: 'stdin'}, content);
  }

  /**
   * Send a kernel message with sensible defaults.
   */
  sendMessage(options: MakeOptional<KernelMessage.IOptions, 'session'>, content: any) {
    options.session = this.serverSessionId;
    let msg = KernelMessage.createMessage(options as KernelMessage.IOptions, content);
    msg.parent_header = this.parentHeader;
    this.send(msg);
    return msg.header.msg_id;
  }

  /**
   * Send a kernel message from the server to the client.
   */
  send(msg: KernelMessage.IMessage): void {
    this.sendRaw(serialize(msg));
  }

  /**
   * Start a client-side kernel talking to our websocket server.
   */
  async start(): Promise<Kernel.IKernel> {
    // Set up the kernel request response.
    handleRequest(this, 201, { name: 'test', id: uuid() });

    // Construct a new kernel.
    let serverSettings = this.serverSettings;
    this._kernel = await Kernel.startNew({ serverSettings });
    await this.ready;
    await this._kernel.ready;
    return this._kernel;
  }

  /**
   * Shut down the current kernel
   */
  async shutdown(): Promise<void> {
    if (this._kernel && !this._kernel.isDisposed) {
      // Set up the kernel request response.
      handleRequest(this, 204, {});
      await this._kernel.shutdown();
    }
  }

  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: KernelMessage.IMessage) => void): void {
    this._onMessage = cb;
  }

  /**
   * Dispose the tester.
   */
  dispose() {
    super.dispose();
    if (this._kernel && !this._kernel.isDisposed) {
      this._kernel.dispose();
      this._kernel = null;
    }
  }

  /**
   * Set up a new server websocket to pretend like it is a server kernel.
   */
  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    // TODO: Does the kernel actually send the status in the original websocket? Can it ever send the status?
    // this.sendStatus(this._initialStatus);
    sock.on('message', (msg: any) => {
      if (msg instanceof Buffer) {
        msg = new Uint8Array(msg).buffer;
      }
      let data = deserialize(msg);
      if (data.header.msg_type === 'kernel_info_request') {
        // First send status busy message.
        this.parentHeader = data.header;
        this.sendStatus(uuid(), 'busy');

        // Then send the kernel_info_reply message.
        this.sendKernelInfoReply(uuid(), EXAMPLE_KERNEL_INFO);

        // Then send status idle message.
        this.sendStatus(uuid(), 'idle');
        this.parentHeader = undefined;
      } else {
        let onMessage = this._onMessage;
        if (onMessage) {
          onMessage(data);
        }
      }
    });
  }

  readonly serverSessionId = uuid();

  private _initialStatus = 'starting';
  private _kernel: Kernel.IKernel | null = null;
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
class SessionTester extends SocketTester {


  get initialStatus(): string {
    return this._initialStatus;
  }

  set initialStatus(status: string) {
    this._initialStatus = status;
  }

  /**
   * Start a mock session.
   */
  async startSession(): Promise<Session.ISession> {
    handleRequest(this, 201, createSessionModel());
    let serverSettings = this.serverSettings;
    this._session = await Session.startNew({ path: uuid(), serverSettings });
    await this.ready;
    await this._session.kernel.ready;
    return this._session;
  }

  /**
   * Shut down the current session
   */
  async shutdown(): Promise<void> {
    if (this._session) {
      // Set up the session request response.
      handleRequest(this, 204, {});
      await this._session.shutdown();
    }
  }

  dispose(): void {
    super.dispose();
    if (this._session) {
      this._session.dispose();
      this._session = null;
    }
  }

  /**
   * Send the status from the server to the client.
   */
  sendStatus(status: string, parentHeader?: KernelMessage.IHeader) {
    let options: KernelMessage.IOptions = {
      msgType: 'status',
      channel: 'iopub',
      session: this.serverSessionId
    };
    let msg = KernelMessage.createMessage(options, { execution_state: status } );
    if (parentHeader) {
      msg.parent_header = parentHeader;
    }
    this.send(msg);
  }


  /**
   * Send a kernel message from the server to the client.
   */
  send(msg: KernelMessage.IMessage): void {
    this.sendRaw(serialize(msg));
  }


  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: KernelMessage.IMessage) => void): void {
    this._onMessage = cb;
  }

  /**
   * Set up a new server websocket to pretend like it is a server kernel.
   */
  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    sock.on('message', (msg: any) => {
      if (msg instanceof Buffer) {
        msg = new Uint8Array(msg).buffer;
      }
      let data = deserialize(msg);
      if (data.header.msg_type === 'kernel_info_request') {
        // First send status busy message.
        this.sendStatus('busy', data.header);

        // Then send the kernel_info_reply message.
        let options: KernelMessage.IOptions = {
          msgType: 'kernel_info_reply',
          channel: 'shell',
          session: this.serverSessionId
        };
        let msg = KernelMessage.createMessage(options, EXAMPLE_KERNEL_INFO );
        msg.parent_header = data.header;
        this.send(msg);

        // Then send status idle message.
        this.sendStatus('idle', data.header);
      } else {
        let onMessage = this._onMessage;
        if (onMessage) {
          onMessage(data);
        }
      }
    });
  }

  readonly serverSessionId = uuid();
  private _initialStatus = 'starting';
  private _session: Session.ISession;
  private _onMessage: (msg: KernelMessage.IMessage) => void = null;

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


/**
 * Test a single emission from a signal.
 *
 * @param signal - The signal we are listening to.
 * @param find - An optional function to determine which emission to test,
 * defaulting to the first emission.
 * @param test - An optional function which contains the tests for the emission.
 * @param value - An optional value that the promise resolves to if it is
 * successful.
 *
 * @returns a promise that rejects if the function throws an error (e.g., if an
 * expect test doesn't pass), and resolves otherwise.
 *
 * #### Notes
 * The first emission for which the find function returns true will be tested in
 * the test function. If the find function is not given, the first signal
 * emission will be tested.
 *
 * You can test to see if any signal comes which matches a criteria by just
 * giving a find function. You can test the very first signal by just giving a
 * test function. And you can test the first signal matching the find criteria
 * by giving both.
 *
 * The reason this function is asynchronous is so that the thing causing the
 * signal emission (such as a websocket message) can be asynchronous.
 */
export
async function testEmission<T, U, V>(signal: ISignal<T, U>, options: {
  find?: (a: T, b: U) => boolean
  test?: (a: T, b: U) => void,
  value?: V
}): Promise<V> {
  const done = new PromiseDelegate<V>();
  const object = {};
  signal.connect((sender: T, args: U) => {
    if (!options.find || options.find(sender, args)) {
      try {
        Signal.disconnectReceiver(object);
        if (options.test) {
          options.test(sender, args);
        }
      } catch (e) {
        done.reject(e);
      }
      done.resolve(options.value || undefined);
    }
  }, object);
  return done.promise;
}

/**
 * Test to see if a promise is fulfilled.
 *
 * @returns true if the promise is fulfilled (either resolved or rejected), and
 * false if the promise is still pending.
 */
export
async function isFulfilled<T>(p: PromiseLike<T>): Promise<boolean> {
  let x = Object.create(null);
  let result = await (Promise.race([p, x]).catch(() => false));
  return result !== x;
}

/**
 * Make a new type with the given keys declared as optional.
 *
 * #### Notes
 * An example:
 *
 * interface A {a: number, b: string}
 * type B = MakeOptional<A, 'a'>
 * let x: B = {b: 'test'}
 */
type MakeOptional<T, K> = Pick<T, Exclude<keyof T, K>> & {
  [P in Extract<keyof T, K>]?: T[P]
};
