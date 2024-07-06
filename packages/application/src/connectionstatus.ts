// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IConnectionStatus } from './tokens';

/**
 * Application connection status
 */
export class ConnectionStatus implements IConnectionStatus {
  /**
   * Whether the application is connected to the server or not.
   *
   * #### Notes
   *
   * Every periodic network polling should be paused while this is set
   * to `false`. Extensions should use this value to decide whether to proceed
   * with the polling.
   * The extensions may also set this value to `false` if there is no need to
   * fetch anything from the server backend basing on some conditions
   * (e.g. when an error message dialog is displayed).
   * At the same time, the extensions are responsible for setting this value
   * back to `true`.
   */
  isConnected = true;
}
