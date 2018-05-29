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
   * @param candidate - The potential window name being resolved.
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

  private _name: string | null = null;
}


/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The internal prefix for private local storage keys.
   */
  const PREFIX = '@jupyterlab/coreutils:StateDB';

  /**
   * The local storage beacon key.
   */
  const BEACON = `${PREFIX}:beacon`;

  /**
   * The timeout (in ms) to wait for beacon responders.
   *
   * #### Notes
   * This value is a whole number between 100 and 500 in order to prevent
   * perfect timeout collisions between multiple simultaneously opening windows
   * that have the same URL. This is an edge case because multiple windows
   * should not ordinarily share the same URL, but it can be contrived.
   */
  const TIMEOUT = Math.floor(100 + Math.random() * 400);

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
  let name: string | null = null;

  /**
   * Whether the name resolution has completed.
   */
  let resolved = false;

  /**
   * Start the storage event handler.
   */
  export
  function initialize(): void {
    if (initialized) {
      return;
    }

    // Only initialize once.
    initialized = true;

    // Listen to all storage events for beacons and window names.
    window.addEventListener('storage', (event: StorageEvent) => {
      const { key, newValue } = event;

      // All the keys we care about have values.
      if (newValue === null) {
        return;
      }

      // If the beacon was fired, respond with a ping.
      if (key === BEACON) {
        window.localStorage.removeItem(WINDOW);
        window.localStorage.setItem(WINDOW, resolved ? name : candidate);
        return;
      }

      // If the window name is known, bail.
      if (resolved || key !== WINDOW) {
        return;
      }

      // If a reported window name and candidate collide, reject the candidate.
      if (candidate === newValue) {
        resolved = true;
        delegate.reject(`Window name candidate "${candidate}" already exists`);
      }
    });
  }

  /**
   * Returns a promise that resolves with the window name used for restoration.
   */
  export
  function resolve(potential: string): Promise<string> {
    if (resolved) {
      return delegate.promise;
    }

    // Set the local candidate.
    candidate = potential;

    // Wait until other windows have reported before claiming the candidate.
    window.setTimeout(() => {
      // If the window name has not already been resolved, accept the candidate.
      // The only kind of resolution that can happen otherwise is a rejection in
      // the storage handler upon receipt of a window name that is identical to
      // the candidate.
      if (!resolved) {
        resolved = true;
        delegate.resolve(name = candidate);
      }
    }, TIMEOUT);

    // Fire the beacon to collect other windows' names.
    window.localStorage.removeItem(BEACON);
    window.localStorage.setItem(BEACON, `${(new Date()).getTime()}`);

    return delegate.promise;
  }
}
