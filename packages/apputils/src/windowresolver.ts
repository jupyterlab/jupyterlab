// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@lumino/coreutils';
import { IWindowResolver } from './tokens';

/**
 * A concrete implementation of a window name resolver.
 */
export class WindowResolver implements IWindowResolver {
  /**
   * The resolved window name.
   *
   * #### Notes
   * If the `resolve` promise has not resolved, the behavior is undefined.
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
    return Private.resolve(candidate).then(name => {
      this._name = name;
    });
  }

  private _name: string;
}

/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The internal prefix for private local storage keys.
   */
  const PREFIX = '@jupyterlab/statedb:StateDB';

  /**
   * The local storage beacon key.
   */
  const BEACON = `${PREFIX}:beacon`;

  /**
   * The timeout (in ms) to wait for beacon responders.
   *
   * #### Notes
   * This value is a whole number between 200 and 500 in order to prevent
   * perfect timeout collisions between multiple simultaneously opening windows
   * that have the same URL. This is an edge case because multiple windows
   * should not ordinarily share the same URL, but it can be contrived.
   */
  const TIMEOUT = Math.floor(200 + Math.random() * 300);

  /**
   * The local storage window key.
   */
  const WINDOW = `${PREFIX}:window`;

  /**
   * Current beacon request
   *
   * #### Notes
   * We keep track of the current request so that we can ignore our own beacon
   * requests. This is to work around a bug in Safari, where Safari sometimes
   * triggers local storage events for changes made by the current tab. See
   * https://github.com/jupyterlab/jupyterlab/issues/6921#issuecomment-540817283
   * for more details.
   */
  let currentBeaconRequest: string | null = null;

  /**
   * A potential preferred default window name.
   */
  let candidate: string | null = null;

  /**
   * The window name promise.
   */
  const delegate = new PromiseDelegate<string>();

  /**
   * The known window names.
   */
  const known: { [window: string]: null } = {};

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
  function initialize(): void {
    // Listen to all storage events for beacons and window names.
    window.addEventListener('storage', (event: StorageEvent) => {
      const { key, newValue } = event;

      // All the keys we care about have values.
      if (newValue === null) {
        return;
      }

      // If the beacon was fired, respond with a ping.
      if (
        key === BEACON &&
        newValue !== currentBeaconRequest &&
        candidate !== null
      ) {
        ping(resolved ? name : candidate);
        return;
      }

      // If the window name is resolved, bail.
      if (resolved || key !== WINDOW) {
        return;
      }

      const reported = newValue.replace(/-\d+$/, '');

      // Store the reported window name.
      known[reported] = null;

      // If a reported window name and candidate collide, reject the candidate.
      if (!candidate || candidate in known) {
        reject();
      }
    });
  }

  /**
   * Ping peers with payload.
   */
  function ping(payload: string | null): void {
    if (payload === null) {
      return;
    }

    const { localStorage } = window;

    localStorage.setItem(WINDOW, `${payload}-${new Date().getTime()}`);
  }

  /**
   * Reject the candidate.
   */
  function reject(): void {
    resolved = true;
    currentBeaconRequest = null;
    delegate.reject(`Window name candidate "${candidate}" already exists`);
  }

  /**
   * Returns a promise that resolves with the window name used for restoration.
   */
  export function resolve(potential: string): Promise<string> {
    if (resolved) {
      return delegate.promise;
    }

    // Set the local candidate.
    candidate = potential;

    if (candidate in known) {
      reject();
      return delegate.promise;
    }

    const { localStorage, setTimeout } = window;

    // Wait until other windows have reported before claiming the candidate.
    setTimeout(() => {
      if (resolved) {
        return;
      }

      // If the window name has not already been resolved, check one last time
      // to confirm it is not a duplicate before resolving.
      if (!candidate || candidate in known) {
        return reject();
      }

      resolved = true;
      currentBeaconRequest = null;
      delegate.resolve((name = candidate));
      ping(name);
    }, TIMEOUT);

    // Fire the beacon to collect other windows' names.
    currentBeaconRequest = `${Math.random()}-${new Date().getTime()}`;
    localStorage.setItem(BEACON, currentBeaconRequest);

    return delegate.promise;
  }

  // Initialize the storage listener at runtime.
  (() => {
    initialize();
  })();
}
