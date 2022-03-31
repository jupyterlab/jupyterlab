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
import {
  createToolbarFactory,
  IToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { CellToolbarFactory } from '@jupyterlab/cell-toolbar';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { IObservableList } from '@jupyterlab/observables';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { Toolbar } from '@jupyterlab/ui-components';

const FACTORY = 'Cell';
const PLUGIN_ID = '@jupyterlab/cell-toolbar-extension:plugin';

async function activatePlugin(
  app: JupyterFrontEnd,
  settingRegistry: ISettingRegistry,
  translator: ITranslator,
  toolbarRegistry: IToolbarWidgetRegistry | null
) {
  let toolbarFactory:
    | ((
        widget: IDocumentWidget<Toolbar>
      ) => IObservableList<DocumentRegistry.IToolbarItem>)
    | undefined;

  if (toolbarRegistry) {
    toolbarFactory = createToolbarFactory(
      toolbarRegistry,
      settingRegistry,
      FACTORY,
      PLUGIN_ID,
      translator
    );
  }

  const trans = translator.load('jupyterlab');

  const factory = new CellToolbarFactory({
    name: FACTORY,
    label: trans.__('Notebook'),
    fileTypes: ['notebook'],
    toolbarFactory,
    translator: translator
  });

  app.docRegistry.addWidgetFactory(factory);
}

const cellToolbar: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  activate: activatePlugin,
  requires: [ISettingRegistry, ITranslator],
  optional: [IToolbarWidgetRegistry]
};

export default cellToolbar;
