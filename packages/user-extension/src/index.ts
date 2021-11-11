// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module user-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { ICurrentUser, User } from '@jupyterlab/user';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const settings = '@jupyterlab/user-extension:settings:open';
}

/**
 *
 */
const userPlugin: JupyterFrontEndPlugin<User> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  requires: [IStateDB],
  provides: ICurrentUser,
  activate: (app: JupyterFrontEnd, state: IStateDB): User => {
    return new User(state);
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [userPlugin];

export default plugins;
