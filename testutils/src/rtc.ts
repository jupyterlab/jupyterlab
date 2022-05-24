/* eslint-disable camelcase */
// Copyright (c) Jupyter Development Team.

import { PromiseDelegate } from '@lumino/coreutils';
import { ChildProcess, spawn } from 'child_process';

let y_server_process: ChildProcess | null = null;

/**
 * A basic WebSocketServer that runs as a child process.
 * This server is used for RTC to sync multiple clients
 *
 * #### Example
 * ```typescript
 * const server = new WebSocketServer();
 *
 * beforeAll(async () => {
 *   await server.start();
 * });
 *
 * afterAll(async () => {
 *  await server.shutdown();
 * });
 * ```
 *
 */
export class WebSocketServer {
  private _verbose: boolean;

  constructor(verbose: boolean = false) {
    this._verbose = verbose;
  }

  /**
   * Start the server.
   *
   * @param url WebSocket url
   * @param port WebSocket port
   *
   * @returns A promise that resolves with the url of the server
   *
   */
  async start(
    url: string = 'localhost',
    port: string = '12345'
  ): Promise<string> {
    if (y_server_process !== null) {
      await this.shutdown();
      return Promise.reject('Server already running');
    }

    const path = __dirname + '/../../node_modules/y-websocket/bin/server.js';
    const env = {
      HOST: url,
      PORT: port,
      PATH: process.env.PATH
    };
    const child = (y_server_process = spawn('node', [path], { env }));

    if (!child) {
      return Promise.reject('spawn failed');
    }

    if (this._verbose) {
      child.stdout.on('data', data => {
        console.info(String(data));
      });
      child.stderr.on('data', data => {
        console.error(String(data));
      });
    }

    child.on('exit', code => {
      if (code !== null && code !== 0) {
        console.error('Child process exited with code ' + String(code));
      }
      if (this._verbose) {
        console.info('Child process exited with code ' + String(code));
      }
    });

    // TODO: check connection
    //const startDelegate = new PromiseDelegate<string>();
    return Promise.resolve('url');
  }

  /**
   * Shut down the server, waiting for it to exit gracefully.
   */
  async shutdown(): Promise<void> {
    if (!y_server_process) {
      return Promise.resolve(void 0);
    }
    const stop = new PromiseDelegate<void>();
    const child = y_server_process;
    child.on('exit', code => {
      y_server_process = null;
      if (code !== null && code !== 0) {
        stop.reject('child process exited with code ' + String(code));
      } else {
        stop.resolve(void 0);
      }
    });

    y_server_process.kill();
    window.setTimeout(() => {
      if (y_server_process) {
        y_server_process.kill(9);
      }
    }, 3000);

    return stop.promise;
  }
}

let server_process: ChildProcess | null = null;

/**
 * A basic YPy WebSocketServer that runs as a child process.
 * This server is used for RTC to sync multiple clients
 *
 * #### Example
 * ```typescript
 * const server = new WebSocketServer();
 *
 * beforeAll(async () => {
 *   await server.start();
 * });
 *
 * afterAll(async () => {
 *  await server.shutdown();
 * });
 * ```
 *
 */
export class PythonWebSocketServer {
  private _verbose: boolean;

  constructor(verbose: boolean = false) {
    this._verbose = verbose;
  }

  /**
   * Start the server.
   *
   * @param url WebSocket url
   * @param port WebSocket port
   *
   * @returns A promise that resolves with the url of the server
   *
   */
  async start(
    url: string = 'localhost',
    port: string = '12345'
  ): Promise<string> {
    if (server_process !== null) {
      await this.shutdown();
      return Promise.reject('Server already running');
    }

    const path = __dirname + '/../scripts/rtc-server.py';
    const child = (server_process = spawn('python', [path, url, port]));

    if (!child) {
      return Promise.reject('spawn failed');
    }

    if (this._verbose) {
      child.stdout.on('data', data => {
        console.info(String(data));
      });
      child.stderr.on('data', data => {
        console.error(String(data));
      });
    }

    child.on('exit', code => {
      if (code !== null && code !== 0) {
        console.error('Child process exited with code ' + String(code));
      }
      if (this._verbose) {
        console.info('Child process exited with code ' + String(code));
      }
    });

    // TODO: check connection
    //const startDelegate = new PromiseDelegate<string>();
    return Promise.resolve('url');
  }

  /**
   * Shut down the server, waiting for it to exit gracefully.
   */
  async shutdown(): Promise<void> {
    if (!server_process) {
      return Promise.resolve(void 0);
    }
    const stop = new PromiseDelegate<void>();
    const child = server_process;
    child.on('exit', code => {
      server_process = null;
      if (code !== null && code !== 0) {
        stop.reject('child process exited with code ' + String(code));
      } else {
        stop.resolve(void 0);
      }
    });

    server_process.kill();
    window.setTimeout(() => {
      if (server_process) {
        server_process.kill(9);
      }
    }, 3000);

    return stop.promise;
  }
}

let client_process: ChildProcess | null = null;

/**
 * A basic Jupyter_YDoc client that runs as a child process.
 * This class is used for RTC to sync backend and frontend
 *
 * #### Example
 * ```typescript
 * const client = new PythonClient();
 *
 * beforeAll(async () => {
 *   await client.start();
 * });
 *
 * afterAll(async () => {
 *  await client.shutdown();
 * });
 * ```
 *
 */
export class PythonClient {
  private _verbose: boolean;

  constructor(verbose: boolean = false) {
    this._verbose = verbose;
  }

  /**
   * Start the server.
   *
   * @param url WebSocket url
   *
   * @returns A promise that resolves when the process is done
   *
   */
  async run(
    type: 'nb' | 'file' = 'nb',
    url: string = 'ws://localhost:12345/test_room'
  ): Promise<string> {
    if (client_process !== null) {
      await this._kill();
      return Promise.reject('Server already running');
    }

    const path = `${__dirname}/../scripts/${type}.py`;
    const child = (client_process = spawn('python', [path, url]));
    const startDelegate = new PromiseDelegate<string>();

    if (!child) {
      return Promise.reject('spawn failed');
    }

    if (this._verbose) {
      child.stdout.on('data', data => {
        console.info(String(data));
      });
      child.stderr.on('data', data => {
        console.error(String(data));
      });
    }

    child.on('exit', code => {
      client_process = null;
      if (code !== null && code !== 0) {
        console.error('Child process exited with code ' + String(code));
      }
      if (this._verbose) {
        console.info('Child process exited with code ' + String(code));
      }
      startDelegate.resolve('Child process exited with code ' + String(code));
    });

    return startDelegate.promise;
  }

  private _kill() {
    if (client_process === null) {
      return;
    }
    client_process.kill();
    window.setTimeout(() => {
      if (client_process) {
        client_process.kill(9);
      }
    }, 3000);
  }
}
