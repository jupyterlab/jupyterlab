/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module cell-toolbar
 */
 import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
  } from '@jupyterlab/application';
  import { ISettingRegistry } from '@jupyterlab/settingregistry';
  import { CellBarExtension } from './celltoolbartracker';
  import { EXTENSION_ID } from './tokens';
  
  /**
   * Initialization data for the cell-toolbar extension.
   */
  const extension: JupyterFrontEndPlugin<void> = {
    id: `${EXTENSION_ID}:plugin`,
    autoStart: true,
    activate: async (
      app: JupyterFrontEnd,
      settingRegistry: ISettingRegistry | null
    ) => {
      const settings =
        (await settingRegistry?.load(`${EXTENSION_ID}:plugin`)) ?? null;
      app.docRegistry.addWidgetExtension(
        'Notebook',
        new CellBarExtension(app.commands, settings)
      );
    },
    optional: [ISettingRegistry]
  };
  
  export default extension;
  