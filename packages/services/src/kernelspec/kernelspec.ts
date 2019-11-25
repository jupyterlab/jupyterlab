// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '..';
import * as restapi from './restapi';
import { ISignal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';

import { ISpecModel, ISpecModels } from './restapi';
export { ISpecModel, ISpecModels };

/**
 * Fetch all of the kernel specs.
 *
 * @param settings - The optional server settings.
 *
 * @returns A promise that resolves with the kernel specs.
 *
 * #### Notes
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
 */
export function getSpecs(
  settings?: ServerConnection.ISettings
): Promise<ISpecModels> {
  return restapi.getSpecs(settings);
}

/**
 * Object which manages kernel instances for a given base url.
 *
 * #### Notes
 * The manager is responsible for maintaining the state of kernel specs.
 */
export interface IManager extends IDisposable {
  /**
   * A signal emitted when the kernel specs change.
   */
  specsChanged: ISignal<IManager, ISpecModels>;

  /**
   * A signal emitted when there is a connection failure.
   * TODO: figure out the relationship between this and the other connection status signals for kernels.
   */
  connectionFailure: ISignal<IManager, ServerConnection.NetworkError>;

  /**
   * The server settings for the manager.
   */
  serverSettings?: ServerConnection.ISettings;

  /**
   * The kernel spec models.
   *
   * #### Notes
   * The value will be null until the manager is ready.
   */
  readonly specs: ISpecModels | null;

  /**
   * Whether the manager is ready.
   */
  readonly isReady: boolean;

  /**
   * A promise that resolves when the manager is initially ready.
   */
  readonly ready: Promise<void>;

  /**
   * Force a refresh of the specs from the server.
   *
   * @returns A promise that resolves when the specs are fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  refreshSpecs(): Promise<void>;
}
