/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IConverterRegistry,
  IDataExplorer,
  IDataRegistry
} from '@jupyterlab/databus';
import {
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { Signal } from '@phosphor/signaling';

/**
 * Integrates the databus into the doc registry.
 */
export default {
  activate: activateDocRegistry,
  id: '@jupyterlab/databus-extension:doc-registry',
  requires: [IDataRegistry, IConverterRegistry, IDataExplorer],
  autoStart: true
} as JupyterLabPlugin<void>;

function activateDocRegistry(
  { docRegistry }: JupyterLab,
  dataRegistry: IDataRegistry,
  converterRegistry: IConverterRegistry,
  dataExplorer: IDataExplorer
): void {
  const widget = dataExplorer;

  docRegistry.addWidgetFactory({
    /**
     * The name of the widget to display in dialogs.
     */
    name: 'some-name',
    /**
     * The file types the widget can view.
     */
    fileTypes: ['csv'],
    /**
     * The file types for which the factory should be the default.
     */
    defaultFor: [],
    /**
     * The file types for which the factory should be the default for rendering,
     * if that is different than the default factory (which may be for editing).
     * If undefined, then it will fall back on the default file type.
     */
    defaultRendered: [],
    /**
     * Whether the widget factory is read only.
     */
    readOnly: false,
    /**
     * The registered name of the model type used to create the widgets.
     */
    modelName: 'text',
    /**
     * Whether the widgets prefer having a kernel started.
     */
    preferKernel: false,
    /**
     * Whether the widgets can start a kernel when opened.
     */
    canStartKernel: false,

    /**
     * A signal emitted when a new widget is created.
     */
    widgetCreated: new Signal<DocumentRegistry.IWidgetFactory<any, any>, any>(
      null
    ),
    /**
     * Create a new widget given a context.
     *
     * #### Notes
     * It should emit the [widgetCreated] signal with the new widget.
     */
    createNew(context: DocumentRegistry.IContext<any>): IDocumentWidget {
      const url = context.urlResolver.getDownloadUrl(context.path);
      console.log('Download URL', url);
      return new DocumentWidget({
        content: widget,
        context: context
      });
    },

    isDisposed: false,
    dispose(): void {
      return;
    }
  });
}
