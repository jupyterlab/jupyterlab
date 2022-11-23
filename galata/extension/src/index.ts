// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, Notification } from '@jupyterlab/apputils';
import { GalataInpage } from './global';
import { IGalataHelpers, PLUGIN_ID_GALATA_HELPERS } from './tokens';

export type {
  IGalataInpage,
  INotebookRunCallback,
  IPluginNameToInterfaceMap,
  IWaitForSelectorOptions
} from './tokens';

export { IGalataHelpers } from './tokens';

/**
 * Add Galata in-page object
 */
window.galataip = new GalataInpage();

const galataPlugin: JupyterFrontEndPlugin<IGalataHelpers> = {
  id: PLUGIN_ID_GALATA_HELPERS,
  autoStart: true,
  activate: (app: JupyterFrontEnd): IGalataHelpers => {
    return Object.freeze({
      notifications: Notification.manager,
      dialogs: Dialog.tracker
    });
  }
};

export default galataPlugin;
