// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { simulate } from 'simulate-event';

import { ServiceManager } from '@jupyterlab/services';

import { ClientSession } from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { PromiseDelegate, UUID } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';
import {
  TextModelFactory,
  DocumentRegistry,
  Context
} from '@jupyterlab/docregistry';

import { INotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';

export { NBTestUtils } from './notebook-utils';

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
export function testEmission<T, U, V>(
  signal: ISignal<T, U>,
  options: {
    find?: (a: T, b: U) => boolean;
    test?: (a: T, b: U) => void;
    value?: V;
  }
): Promise<V> {
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
export async function isFulfilled<T>(p: PromiseLike<T>): Promise<boolean> {
  let x = Object.create(null);
  let result = await Promise.race([p, x]).catch(() => false);
  return result !== x;
}

/**
 * Convert a requestAnimationFrame into a Promise.
 */
export function framePromise(): Promise<void> {
  const done = new PromiseDelegate<void>();
  requestAnimationFrame(() => {
    done.resolve(void 0);
  });
  return done.promise;
}

/**
 * Return a promise that resolves in the given milliseconds with the given value.
 */
export function sleep<T>(milliseconds: number = 0, value?: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(value);
    }, milliseconds);
  });
}

/**
 * Create a client session object.
 */
export async function createClientSession(
  options: Partial<ClientSession.IOptions> = {}
): Promise<ClientSession> {
  const manager = options.manager || Private.getManager().sessions;

  await manager.ready;
  return new ClientSession({
    manager,
    path: options.path || UUID.uuid4(),
    name: options.name,
    type: options.type,
    kernelPreference: options.kernelPreference || {
      shouldStart: true,
      canStart: true,
      name: manager.specs.default
    }
  });
}

/**
 * Create a context for a file.
 */
export function createFileContext(
  path?: string,
  manager?: ServiceManager.IManager
): Context<DocumentRegistry.IModel> {
  const factory = Private.textFactory;

  manager = manager || Private.getManager();
  path = path || UUID.uuid4() + '.txt';

  return new Context({ manager, factory, path });
}

/**
 * Create a context for a notebook.
 */
export async function createNotebookContext(
  path?: string,
  manager?: ServiceManager.IManager
): Promise<Context<INotebookModel>> {
  const factory = Private.notebookFactory;

  manager = manager || Private.getManager();
  path = path || UUID.uuid4() + '.ipynb';
  await manager.ready;

  return new Context({
    manager,
    factory,
    path,
    kernelPreference: { name: manager.specs.default }
  });
}

/**
 * Wait for a dialog to be attached to an element.
 */
export function waitForDialog(
  host?: HTMLElement,
  timeout?: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let counter = 0;
    const interval = 25;
    const limit = Math.floor((timeout || 250) / interval);
    const seek = () => {
      if (++counter === limit) {
        reject(new Error('Dialog not found'));
        return;
      }

      if ((host || document.body).getElementsByClassName('jp-Dialog')[0]) {
        resolve(undefined);
        return;
      }

      setTimeout(seek, interval);
    };

    seek();
  });
}

/**
 * Accept a dialog after it is attached by accepting the default button.
 */
export async function acceptDialog(
  host?: HTMLElement,
  timeout?: number
): Promise<void> {
  host = host || document.body;
  await waitForDialog(host, timeout);

  const node = host.getElementsByClassName('jp-Dialog')[0];

  if (node) {
    simulate(node as HTMLElement, 'keydown', { keyCode: 13 });
  }
}

/**
 * Dismiss a dialog after it is attached.
 *
 * #### Notes
 * This promise will always resolve successfully.
 */
export async function dismissDialog(
  host?: HTMLElement,
  timeout?: number
): Promise<void> {
  host = host || document.body;

  try {
    await waitForDialog(host, timeout);
  } catch (error) {
    return; // Ignore calls to dismiss the dialog if there is no dialog.
  }

  const node = host.getElementsByClassName('jp-Dialog')[0];

  if (node) {
    simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
  }
}

/**
 * The default outputs used for testing.
 */
export const DEFAULT_OUTPUTS: nbformat.IOutput[] = [
  {
    name: 'stdout',
    output_type: 'stream',
    text: ['hello world\n', '0\n', '1\n', '2\n']
  },
  {
    name: 'stderr',
    output_type: 'stream',
    text: ['output to stderr\n']
  },
  {
    name: 'stderr',
    output_type: 'stream',
    text: ['output to stderr2\n']
  },
  {
    output_type: 'execute_result',
    execution_count: 1,
    data: { 'text/plain': 'foo' },
    metadata: {}
  },
  {
    output_type: 'display_data',
    data: { 'text/plain': 'hello, world' },
    metadata: {}
  },
  {
    output_type: 'error',
    ename: 'foo',
    evalue: 'bar',
    traceback: ['fizz', 'buzz']
  }
];

/**
 * A namespace for private data.
 */
namespace Private {
  let manager: ServiceManager;

  export const textFactory = new TextModelFactory();

  export const notebookFactory = new NotebookModelFactory({});

  /**
   * Get or create the service manager singleton.
   */
  export function getManager(): ServiceManager {
    if (!manager) {
      manager = new ServiceManager();
    }
    return manager;
  }
}
