/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module docprovider
 */

export interface IProvider {
  /**
   * Resolves to true if the initial content has been initialized on the server. false otherwise.
   */
  requestInitialContent(): Promise<boolean>;
  putInitializedState(): void;
  acquireLock(): Promise<number>;
  releaseLock(lock: number): void;
  destroy(): void;
}

export * from './yprovider';
export * from './mock';
