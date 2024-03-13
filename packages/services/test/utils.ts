// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject,
  JSONPrimitive,
  PromiseDelegate,
  UUID
} from '@lumino/coreutils';
import WebSocket from 'ws';
import {
  Contents,
  Kernel,
  KernelManager,
  KernelMessage,
  ServerConnection,
  Session,
  SessionManager,
  Terminal
} from '../src';
import { deserialize, serialize } from '../src/kernel/serialize';

/**
 * Create a set of server settings.
 */
export function makeSettings(
  settings?: Partial<ServerConnection.ISettings>
): ServerConnection.ISettings {
  return ServerConnection.makeSettings(settings);
}

const EXAMPLE_KERNEL_INFO: KernelMessage.IInfoReplyMsg['content'] = {
  status: 'ok',
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
  help_links: [
    {
      text: 'A very helpful link',
      url: 'https://very.helpful.website'
    }
  ]
};

export const PYTHON_SPEC: JSONObject = {
  name: 'Python',
  spec: {
    language: 'python',
    argv: [],
    display_name: 'python',
    env: {}
  },
  resources: { foo: 'bar' }
};

export const DEFAULT_FILE: Contents.IModel = {
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

export const KERNELSPECS: JSONObject = {
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
 * Get a single handler for a request.
 */
export function getRequestHandler(
  status: number,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  body: any
): ServerConnection.ISettings {
  const customFetch = (info: RequestInfo, init?: RequestInit) => {
    // Normalize the body.
    body = JSON.stringify(body);

    // Create the response and return it as a promise.
    const response = new Response(body, { status });
    return Promise.resolve(response as any);
  };
  return ServerConnection.makeSettings({ fetch: customFetch });
}

/**
 * An interface for a service that has server settings.
 */
export interface IService {
  readonly serverSettings: ServerConnection.ISettings;
}

/**
 * Handle a single request with a mock response.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function handleRequest(item: IService, status: number, body: any): void {
  // Store the existing fetch function.
  const oldFetch = item.serverSettings.fetch;

  // A single use callback.
  const temp = (info: RequestInfo, init: RequestInit) => {
    // Restore fetch.
    (item.serverSettings as any).fetch = oldFetch;

    // Normalize the body.
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }
    // Body should be null for these status codes
    if (status === 204 || status === 205) {
      body = null;
    }

    // Create the response and return it as a promise.
    const response = new Response(body, { status });
    return Promise.resolve(response as any);
  };

  // Override the fetch function.
  (item.serverSettings as any).fetch = temp;
}

/**
 * Get a random integer between two values
 *
 * This implementation comes from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; // The maximum is exclusive and the minimum is inclusive
}

/**
 * Socket class test rig.
 */
class SocketTester implements IService {
  /**
   * Create a new request and socket tester.
   */
  constructor() {
    let port: number;

    // Retry 6 random ports before giving up
    for (let retry = 0; retry <= 5; retry++) {
      try {
        port = getRandomInt(9000, 20000);
        this._server = new WebSocket.Server({
          port,
          handleProtocols: () => {
            return KernelMessage.supportedKernelWebSocketProtocols
              .v1KernelWebsocketJupyterOrg;
          }
        });
      } catch (err) {
        if (retry === 5) {
          throw err;
        } else {
          continue;
        }
      }
      // We have a successful port
      break;
    }
    this.serverSettings = ServerConnection.makeSettings({
      wsUrl: `ws://localhost:${port!}/`,
      WebSocket: WebSocket as any
    });
    this._ready = new PromiseDelegate<void>();
    this._server!.on('connection', ws => {
      this._ws = ws;
      this.onSocket(ws);
      this._ready!.resolve();
      const connect = this._onConnect;
      if (connect) {
        connect(ws);
      }
    });
  }

  readonly serverSettings: ServerConnection.ISettings;

  get ready() {
    return this._ready!.promise;
  }

  /**
   * Dispose the socket test rig.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this._server) {
      this._server.close();
    }
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
    this._ws!.send(msg);
  }

  /**
   * Close the socket.
   */
  async close(): Promise<void> {
    this._ready = new PromiseDelegate<void>();
    this._ws!.close();
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
  protected onSocket(sock: WebSocket): void {
    /* no-op */
  }

  private _ws: WebSocket | null = null;
  private _ready: PromiseDelegate<void> | null = null;
  private _server: WebSocket.Server | null = null;
  private _onConnect: ((ws: WebSocket) => void) | null = null;
  protected settings: ServerConnection.ISettings;
}

export class FakeKernelManager extends KernelManager {
  // Override requestRunning since we aren't starting kernels
  // on the server.
  // This prevents kernel connections from being culled.
  requestRunning(): Promise<void> {
    return Promise.resolve(void 0);
  }
}

/**
 * Kernel class test rig.
 */
export class KernelTester extends SocketTester {
  constructor() {
    super();
    this._kernelManager = new FakeKernelManager({
      serverSettings: this.serverSettings
    });
  }

  initialStatus: Kernel.Status = 'starting';

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
  sendStatus(msgId: string, status: Kernel.Status): string {
    return this.sendMessage({
      msgId,
      msgType: 'status',
      channel: 'iopub',
      content: { execution_state: status }
    });
  }

  /**
   * Send an iopub stream message.
   */
  sendStream(
    msgId: string,
    content: KernelMessage.IStreamMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'stream',
      channel: 'iopub',
      content
    });
  }

  /**
   * Send an iopub display message.
   */
  sendDisplayData(
    msgId: string,
    content: KernelMessage.IDisplayDataMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'display_data',
      channel: 'iopub',
      content
    });
  }

  /**
   * Send an iopub display message.
   */
  sendUpdateDisplayData(
    msgId: string,
    content: KernelMessage.IUpdateDisplayDataMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'update_display_data',
      channel: 'iopub',
      content
    });
  }
  /**
   * Send an iopub comm open message.
   */
  sendCommOpen(
    msgId: string,
    content: KernelMessage.ICommOpenMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'comm_open',
      channel: 'iopub',
      content
    });
  }

  /**
   * Send an iopub comm close message.
   */
  sendCommClose(
    msgId: string,
    content: KernelMessage.ICommCloseMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'comm_close',
      channel: 'iopub',
      content
    });
  }

  /**
   * Send an iopub comm message.
   */
  sendCommMsg(
    msgId: string,
    content: KernelMessage.ICommMsgMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'comm_msg',
      channel: 'iopub',
      content
    });
  }

  sendExecuteResult(
    msgId: string,
    content: KernelMessage.IExecuteResultMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'execute_result',
      channel: 'iopub',
      content
    });
  }

  sendExecuteReply(
    msgId: string,
    content: KernelMessage.IExecuteReplyMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'execute_reply',
      channel: 'shell',
      content
    });
  }

  sendKernelInfoReply(
    msgId: string,
    content: KernelMessage.IInfoReplyMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'kernel_info_reply',
      channel: 'shell',
      content
    });
  }

  sendInputRequest(
    msgId: string,
    content: KernelMessage.IInputRequestMsg['content']
  ): string {
    return this.sendMessage({
      msgId,
      msgType: 'input_request',
      channel: 'stdin',
      content
    });
  }

  /**
   * Send a kernel message with sensible defaults.
   */
  sendMessage<T extends KernelMessage.Message>(
    options: MakeOptional<KernelMessage.IOptions<T>, 'session'>
  ): string {
    const msg = KernelMessage.createMessage<any>({
      session: this.serverSessionId,
      ...options
    });
    msg.parent_header = this.parentHeader;
    this.send(msg);
    return msg.header.msg_id;
  }

  /**
   * Send a kernel message from the server to the client with newest protocol.
   */
  send(msg: KernelMessage.Message): void {
    this.sendRaw(
      serialize(
        msg,
        KernelMessage.supportedKernelWebSocketProtocols
          .v1KernelWebsocketJupyterOrg
      )
    );
  }

  /**
   * Start a client-side kernel talking to our websocket server.
   */
  async start(): Promise<Kernel.IKernelConnection> {
    // Set up the kernel request response.
    handleRequest(this, 201, { name: 'test', id: UUID.uuid4() });

    // Construct a new kernel.
    this._kernel = await this._kernelManager.startNew();

    // Wait for the other side to signal it is connected
    await this.ready;

    // Wait for the initial kernel info reply if we have a normal status
    if (this.initialStatus === 'starting') {
      await this._kernel.info;
    }

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
  dispose(): void {
    if (this._kernel) {
      this._kernel.dispose();
      this._kernel = null;
    }
    super.dispose();
  }

  /**
   * Set up a new server websocket to pretend like it is a server kernel.
   * Use the newest protocol.
   */
  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    this.sendStatus(UUID.uuid4(), this.initialStatus);
    sock.on('message', (msg: any) => {
      if (msg instanceof Buffer) {
        msg = new Uint8Array(msg).buffer;
      }
      const data = deserialize(
        msg,
        KernelMessage.supportedKernelWebSocketProtocols
          .v1KernelWebsocketJupyterOrg
      );
      if (data.header.msg_type === 'kernel_info_request') {
        // First send status busy message.
        this.parentHeader = data.header;
        this.sendStatus(UUID.uuid4(), 'busy');

        // Then send the kernel_info_reply message.
        this.sendKernelInfoReply(UUID.uuid4(), EXAMPLE_KERNEL_INFO);

        // Then send status idle message.
        this.sendStatus(UUID.uuid4(), 'idle');
        this.parentHeader = undefined;
      } else {
        const onMessage = this._onMessage;
        if (onMessage) {
          onMessage(data);
        }
      }
    });
  }

  readonly serverSessionId = UUID.uuid4();
  private _kernelManager: Kernel.IManager;
  private _kernel: Kernel.IKernelConnection | null = null;
  private _onMessage: ((msg: KernelMessage.IMessage) => void) | null = null;
}

/**
 * Create a unique session id.
 */
export function createSessionModel(id?: string): Session.IModel {
  return {
    id: id || UUID.uuid4(),
    path: UUID.uuid4(),
    name: '',
    type: '',
    kernel: { id: UUID.uuid4(), name: UUID.uuid4() }
  };
}

/**
 * Session test rig.
 */
export class SessionTester extends SocketTester {
  constructor() {
    super();
    const kernelManager = new KernelManager({
      serverSettings: this.serverSettings
    });
    this._sessionManager = new SessionManager({ kernelManager });
  }

  initialStatus: Kernel.Status = 'starting';

  /**
   * Start a mock session.
   */
  async startSession(): Promise<Session.ISessionConnection> {
    handleRequest(this, 201, createSessionModel());
    this._session = await this._sessionManager!.startNew({
      path: UUID.uuid4(),
      name: UUID.uuid4(),
      type: 'test'
    });
    await this.ready;
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
      this._session = null!;
    }
  }

  /**
   * Send the status from the server to the client.
   */
  sendStatus(
    status: Kernel.Status,
    parentHeader?: KernelMessage.IHeader
  ): void {
    const msg = KernelMessage.createMessage({
      msgType: 'status',
      channel: 'iopub',
      session: this.serverSessionId,
      content: {
        execution_state: status
      }
    });
    if (parentHeader) {
      msg.parent_header = parentHeader;
    }
    this.send(msg);
  }

  /**
   * Send a kernel message from the server to the client with newest protocol.
   */
  send(msg: KernelMessage.IMessage): void {
    this.sendRaw(
      serialize(
        msg,
        KernelMessage.supportedKernelWebSocketProtocols
          .v1KernelWebsocketJupyterOrg
      )
    );
  }

  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: KernelMessage.IMessage) => void): void {
    this._onMessage = cb;
  }

  /**
   * Set up a new server websocket to pretend like it is a server kernel.
   * Use the newest protocol.
   */
  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    sock.on('message', (msg: any) => {
      if (msg instanceof Buffer) {
        msg = new Uint8Array(msg).buffer;
      }
      const data = deserialize(
        msg,
        KernelMessage.supportedKernelWebSocketProtocols
          .v1KernelWebsocketJupyterOrg
      );
      if (KernelMessage.isInfoRequestMsg(data)) {
        // First send status busy message.
        this.sendStatus('busy', data.header);

        // Then send the kernel_info_reply message.
        const reply = KernelMessage.createMessage({
          msgType: 'kernel_info_reply',
          channel: 'shell',
          session: this.serverSessionId,
          content: EXAMPLE_KERNEL_INFO
        });
        reply.parent_header = data.header;
        this.send(reply);

        // Then send status idle message.
        this.sendStatus('idle', data.header);
      } else {
        const onMessage = this._onMessage;
        if (onMessage) {
          onMessage(data);
        }
      }
    });
  }

  readonly serverSessionId = UUID.uuid4();
  private _session: Session.ISessionConnection;
  private _onMessage: ((msg: KernelMessage.IMessage) => void) | null = null;
  private _sessionManager: Session.IManager | null = null;
}

/**
 * Terminal session test rig.
 */
export class TerminalTester extends SocketTester {
  /**
   * Register the message callback with the websocket server.
   */
  onMessage(cb: (msg: Terminal.IMessage) => void): void {
    this._onMessage = cb;
  }

  protected onSocket(sock: WebSocket): void {
    super.onSocket(sock);
    sock.on('message', (msg: any) => {
      const onMessage = this._onMessage;
      if (onMessage) {
        const data = JSON.parse(msg) as JSONPrimitive[];
        const termMsg: Terminal.IMessage = {
          type: data[0] as Terminal.MessageType,
          content: data.slice(1)
        };
        onMessage(termMsg);
      }
    });
  }

  private _onMessage: ((msg: Terminal.IMessage) => void) | null = null;
}

/**
 * Make a new type with the given keys declared as optional.
 *
 * #### Notes
 * An example:
 *
 * interface A {a: number, b: string}
 * type B = MakeOptional<A, 'a'>
 * const x: B = {b: 'test'}
 */
type MakeOptional<T, K> = Pick<T, Exclude<keyof T, K>> & {
  [P in Extract<keyof T, K>]?: T[P];
};
