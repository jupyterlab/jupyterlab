// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/coreutils';


/* tslint:disable */
/**
 * The default window resolver token.
 */
export
const IWindowResolver = new Token<IWindowResolver>('@jupyterlab/coreutils:IWindowResolver');
/* tslint:enable */


/**
 * The description of a window name resolver.
 */
export
interface IWindowResolver {
  /**
   * Resolve a window name to use as a handle among shared resources.
   *
   * @returns A promise that resolves to a window name.
   */
  resolve(): Promise<string>;
}


/**
 * A concrete implementation of a window name resolver.
 */
export
class WindowResolver implements IWindowResolver {
  constructor(options: WindowResolver.IOptions = { candidate: Promise.resolve('') }) {
    this._candidate = options.candidate;
  }

  /**
   * Resolve a window name to use as a handle among shared resources.
   *
   * @returns A promise that resolves to a window name.
   */
  resolve(): Promise<string> {
    return this._candidate.then(name => {
      console.log('Start with candidate:', name);
      return Private.windowName();
    });

  }

  private _candidate: Promise<string>;
}


/**
 * A namespace for `WindowResolver` statics.
 */
export
namespace WindowResolver {
  /**
   * The instantiation options for a window resolver.
   */
  export
  interface IOptions {
    /**
     * A potential preferred default window name.
     */
    candidate: Promise<string>;
  }
}

/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The timeout (in ms) to wait for beacon responders.
   */
  const TIMEOUT = 100;

  /**
   * The internal prefix for private local storage keys.
   */
  const PREFIX = '@jupyterlab/coreutils:StateDB';

  /**
   * The local storage beacon key.
   */
  const BEACON = `${PREFIX}:beacon`;

  /**
   * The local storage window prefix.
   */
  const WINDOW = `${PREFIX}:window-`;

  /**
   * The window name.
   */
  let name: string;

  /**
   * The window name promise.
   */
  let promise: Promise<string>;

  /**
   * Wait until a window name is available and resolve.
   */
  function awaitName(resolve: (value: string) => void): void {
    window.setTimeout(() => {
      if (name) {
        return resolve(name);
      }

      createName().then(value => {
        name = value;
        resolve(name);
      });
    }, TIMEOUT);
  }

  /**
   * Create a name for this window.
   */
  function createName(): Promise<string> {
    console.log('I should generate a name');
    return Promise.resolve('');
  }

  /**
   * Fetch the known window names.
   */
  function fetchWindowNames(): { [name: string]: number } {
      const names: { [name: string]: number } = { };
      const { localStorage } = window;
      let i = localStorage.length;

      while (i) {
        let key = localStorage.key(--i);

        if (key && key.indexOf(WINDOW) === 0) {
          let name = key.replace(WINDOW, '');

          names[name] = parseInt(localStorage.getItem(key), 10);
        }
      }

      return names;
  }

  /**
   * Fire off the signal beacon to solicit pings from other JupyterLab windows.
   */
  function beacon(): void {
    window.localStorage.setItem(BEACON, `${(new Date()).getTime()}`);
  }

  /**
   * Respond to a signal beacon.
   */
  function ping(): void {
    if (name) {
      window.localStorage.setItem(name, `${(new Date()).getTime()}`);
    }
  }

  /**
   * The window storage event handler.
   */
  function storageHandler(event: StorageEvent) {
    const { key } = event;

    console.log('event key', key);

    if (key === BEACON) {
      console.log('The beacon has been fired');
      return ping();
    }

    if (key.indexOf(WINDOW) !== 0) {
      return;
    }

    const windows = fetchWindowNames();
    const name = key.replace(WINDOW, '');

    if (name in windows) {
      console.log(`Window ${name} is a known window.`);
    } else {
      console.log(`Window ${name} is an unknown window.`);
    }
  }

  /**
   * Returns a promise that resolves with the window name used for restoration.
   */
  export
  function windowName(): Promise<string> {
    return promise || (promise = new Promise((resolve) => {
      beacon();
      awaitName(resolve);
    }));
  }

  /**
   * Start the storage event handler immediately.
   */
  window.addEventListener('storage', storageHandler);
}
