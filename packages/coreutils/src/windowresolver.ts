// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PromiseDelegate, Token
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
   * A window name to use as a handle among shared resources.
   */
  readonly name: string;
}


/**
 * A concrete implementation of a window name resolver.
 */
export
class WindowResolver implements IWindowResolver {
  /**
   * Create a new window name resolver.
   */
  constructor() {
    Private.initialize();
  }

  /**
   * The resolved window name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Resolve a window name to use as a handle among shared resources.
   *
   * @param candidate - A potential preferred default window name.
   *
   * #### Notes
   * Typically, the name candidate should be a JupyterLab workspace name or
   * an empty string if there is no workspace.
   *
   * If the returned promise rejects, a window name cannot be resolved without
   * user intervention, which typically means navigation to a new URL.
   */
  resolve(candidate: string): Promise<void> {
    return Private.resolve(candidate).then(name => { this._name = name; });
  }

  private _name: string;
}


/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The local storage beacon key.
   */
  const BEACON = `${PREFIX}:beacon`;

  /**
   * The internal prefix for private local storage keys.
   */
  const PREFIX = '@jupyterlab/coreutils:StateDB';

  /**
   * The timeout (in ms) to wait for beacon responders.
   */
  const TIMEOUT = 250;

  /**
   * The local storage window key.
   */
  const WINDOW = `${PREFIX}:window`;

  /**
   * A potential preferred default window name.
   */
  let candidate: string;

  /**
   * The window name promise.
   */
  let delegate = new PromiseDelegate<string>();

  /**
   * The initialization flag.
   */
  let initialized = false;

  /**
   * The window name.
   */
  let name: string;

  /**
   * Whether the name resolution has completed.
   */
  let resolved = false;

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
    delegate.promise.then(() => {
      console.log(`Ping ${WINDOW} with value: "${name}"`);
      window.localStorage.removeItem(WINDOW);
      window.localStorage.setItem(WINDOW, name);
    }).catch(() => { /* no-op */ });
  }

  /**
   * The window storage event handler.
   */
  function storage(event: StorageEvent) {
    const { key, newValue } = event;

    if (key === BEACON) {
      return ping();
    }

    if (resolved || key !== WINDOW || newValue === null) {
      return;
    }

    console.log(`Received window name "${newValue}"`);
    if (candidate === newValue) {
      resolved = true;
      delegate.reject(`Window name candidate "${candidate}" already exists`);
    }
  }


  /**
   * Wait until a window name is available and resolve.
   */
  function wait(): void {
    // If the window name has not already been resolved, accept the candidate.
    // The only kind of resolution that can happen otherwise, is a rejection in
    // the storage handler upon receipt of a window name that is identical to
    // the candidate.
    window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        delegate.resolve(name = candidate);
      }
    }, TIMEOUT);
  }

  /**
   * Start the storage event handler.
   */
  export
  function initialize(): void {
    if (initialized) {
      return;
    }

    initialized = true;
    window.addEventListener('storage', storage);
  }

  /**
   * Returns a promise that resolves with the window name used for restoration.
   */
  export
  function resolve(potential: string): Promise<string> {
    if (resolved) {
      return delegate.promise;
    }

    candidate = potential;

    console.log(`Resolve a window name, start with candidate: "${candidate}"`);
    beacon();
    wait();

    return delegate.promise;
  }
}
