import { simulate } from 'simulate-event';

import { ServiceManager, Session } from '@jupyterlab/services';

import { SessionContext } from '@jupyterlab/apputils';

import { PromiseDelegate, UUID } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';
import {
  TextModelFactory,
  DocumentRegistry,
  Context
} from '@jupyterlab/docregistry';

import { INotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';

/**
 * Test a single emission from a signal.
 *
 * @param signal - The signal we are listening to.
 * @param find - An optional function to determine which emission to test,
 * defaulting to the first emission.
 * @param test - An optional function which contains the tests for the emission, and should throw an error if the tests fail.
 * @param value - An optional value that the promise resolves to if the test is
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
export async function testEmission<T, U, V>(
  signal: ISignal<T, U>,
  options: {
    find?: (a: T, b: U) => boolean;
    test?: (a: T, b: U) => void;
    value?: V;
  } = {}
): Promise<V | undefined> {
  const done = new PromiseDelegate<V | undefined>();
  const object = {};
  signal.connect((sender: T, args: U) => {
    if (options.find?.(sender, args) ?? true) {
      try {
        Signal.disconnectReceiver(object);
        if (options.test) {
          options.test(sender, args);
        }
      } catch (e) {
        done.reject(e);
      }
      done.resolve(options.value ?? undefined);
    }
  }, object);
  return done.promise;
}

/**
 * Expect a failure on a promise with the given message.
 */
export async function expectFailure(
  promise: Promise<any>,
  message?: string
): Promise<void> {
  let called = false;
  try {
    await promise;
    called = true;
  } catch (err) {
    if (message && err.message.indexOf(message) === -1) {
      throw Error(`Error "${message}" not in: "${err.message}"`);
    }
  }
  if (called) {
    throw Error(`Failure was not triggered, message was: ${message}`);
  }
}

/**
 * Do something in the future ensuring total ordering with respect to promises.
 */
export async function doLater(cb: () => void): Promise<void> {
  await Promise.resolve(void 0);
  cb();
}

/**
 * Convert a signal into an array of promises.
 *
 * @param signal - The signal we are listening to.
 * @param numberValues - The number of values to store.
 *
 * @returns a Promise that resolves with an array of `(sender, args)` pairs.
 */
export function signalToPromises<T, U>(
  signal: ISignal<T, U>,
  numberValues: number
): Promise<[T, U]>[] {
  const values: Promise<[T, U]>[] = new Array(numberValues);
  const resolvers: Array<(value: [T, U]) => void> = new Array(numberValues);

  for (let i = 0; i < numberValues; i++) {
    values[i] = new Promise<[T, U]>(resolve => {
      resolvers[i] = resolve;
    });
  }

  let current = 0;
  function slot(sender: T, args: U) {
    resolvers[current++]([sender, args]);
    if (current === numberValues) {
      cleanup();
    }
  }
  signal.connect(slot);

  function cleanup() {
    signal.disconnect(slot);
  }
  return values;
}

/**
 * Convert a signal into a promise for the first emitted value.
 *
 * @param signal - The signal we are listening to.
 *
 * @returns a Promise that resolves with a `(sender, args)` pair.
 */
export function signalToPromise<T, U>(signal: ISignal<T, U>): Promise<[T, U]> {
  return signalToPromises(signal, 1)[0];
}

/**
 * Test to see if a promise is fulfilled.
 *
 * @param delay - optional delay in milliseconds before checking
 * @returns true if the promise is fulfilled (either resolved or rejected), and
 * false if the promise is still pending.
 */
export async function isFulfilled<T>(
  p: PromiseLike<T>,
  delay = 0
): Promise<boolean> {
  const x = Object.create(null);
  let race: any;
  if (delay > 0) {
    race = sleep(delay, x);
  } else {
    race = x;
  }
  const result = await Promise.race([p, race]).catch(() => false);
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
export async function createSessionContext(
  options: Partial<SessionContext.IOptions> = {}
): Promise<SessionContext> {
  const manager = options.sessionManager ?? Private.getManager().sessions;
  const specsManager = options.specsManager ?? Private.getManager().kernelspecs;

  await Promise.all([manager.ready, specsManager.ready]);
  return new SessionContext({
    sessionManager: manager,
    specsManager,
    path: options.path ?? UUID.uuid4(),
    name: options.name,
    type: options.type,
    kernelPreference: options.kernelPreference ?? {
      shouldStart: true,
      canStart: true,
      name: specsManager.specs?.default
    }
  });
}

/**
 * Create a session and return a session connection.
 */
export async function createSession(
  options: Session.ISessionOptions
): Promise<Session.ISessionConnection> {
  const manager = Private.getManager().sessions;
  await manager.ready;
  return manager.startNew(options);
}

/**
 * Create a context for a file.
 */
export function createFileContext(
  path: string = UUID.uuid4() + '.txt',
  manager: ServiceManager.IManager = Private.getManager()
): Context<DocumentRegistry.IModel> {
  const factory = Private.textFactory;
  return new Context({ manager, factory, path });
}

export async function createFileContextWithKernel(
  path: string = UUID.uuid4() + '.txt',
  manager: ServiceManager.IManager = Private.getManager()
) {
  const factory = Private.textFactory;
  const specsManager = manager.kernelspecs;
  await specsManager.ready;

  return new Context({
    manager,
    factory,
    path,
    kernelPreference: {
      shouldStart: true,
      canStart: true,
      name: specsManager.specs?.default
    }
  });
}

/**
 * Create and initialize context for a notebook.
 */
export async function initNotebookContext(
  options: {
    path?: string;
    manager?: ServiceManager.IManager;
    startKernel?: boolean;
  } = {}
): Promise<Context<INotebookModel>> {
  const factory = Private.notebookFactory;
  const manager = options.manager || Private.getManager();
  const path = options.path || UUID.uuid4() + '.ipynb';
  console.debug(
    'Initializing notebook context for',
    path,
    'kernel:',
    options.startKernel
  );

  const startKernel =
    options.startKernel === undefined ? false : options.startKernel;
  await manager.ready;

  const context = new Context({
    manager,
    factory,
    path,
    kernelPreference: {
      shouldStart: startKernel,
      canStart: startKernel,
      shutdownOnDispose: true,
      name: manager.kernelspecs.specs?.default
    }
  });
  await context.initialize(true);

  if (startKernel) {
    await context.sessionContext.initialize();
    await context.sessionContext.session?.kernel?.info;
  }

  return context;
}

/**
 * Wait for a dialog to be attached to an element.
 */
export async function waitForDialog(
  host: HTMLElement = document.body,
  timeout: number = 250
): Promise<void> {
  const interval = 25;
  const limit = Math.floor(timeout / interval);
  for (let counter = 0; counter < limit; counter++) {
    if (host.getElementsByClassName('jp-Dialog')[0]) {
      return;
    }
    await sleep(interval);
  }
  throw new Error('Dialog not found');
}

/**
 * Accept a dialog after it is attached by accepting the default button.
 */
export async function acceptDialog(
  host: HTMLElement = document.body,
  timeout: number = 250
): Promise<void> {
  await waitForDialog(host, timeout);

  const node = host.getElementsByClassName('jp-Dialog')[0];

  if (node) {
    simulate(node as HTMLElement, 'keydown', { keyCode: 13 });
  }
}

/**
 * Click on the warning button in a dialog after it is attached
 */
export async function dangerDialog(
  host: HTMLElement = document.body,
  timeout: number = 250
): Promise<void> {
  await waitForDialog(host, timeout);

  const node = host.getElementsByClassName('jp-mod-warn')[0];

  if (node) {
    simulate(node as HTMLElement, 'click', { button: 1 });
  }
}

/**
 * Dismiss a dialog after it is attached.
 *
 * #### Notes
 * This promise will always resolve successfully.
 */
export async function dismissDialog(
  host: HTMLElement = document.body,
  timeout: number = 250
): Promise<void> {
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
      manager = new ServiceManager({ standby: 'never' });
    }
    return manager;
  }
}
