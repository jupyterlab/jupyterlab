// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, Notification } from '@jupyterlab/apputils';
import { IGalataHelpers, PLUGIN_ID_GALATA_HELPERS } from './tokens';

export const galataPlugin: JupyterFrontEndPlugin<IGalataHelpers> = {
  id: PLUGIN_ID_GALATA_HELPERS,
  activate: (app: JupyterFrontEnd): IGalataHelpers => {
    return Object.freeze({
      notifications: Notification.manager,
      dialogs: Dialog.tracker
    });
  }
};
