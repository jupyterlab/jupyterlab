/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module cell-toolbar-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import CellBarExtension from '@jupyterlab/cell-toolbar';

const cellToolbar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/cell-toolbar-extension:plugin',
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    const settings =
      (await settingRegistry?.load(`@jupyterlab/cell-toolbar:plugin`)) ?? null;
    app.docRegistry.addWidgetExtension(
      'Notebook',
      new CellBarExtension(app.commands, settings)
    );
  },
  optional: [ISettingRegistry]
};

export default cellToolbar;
