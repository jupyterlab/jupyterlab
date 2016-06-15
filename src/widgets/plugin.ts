// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IWidgetExtension, IDocumentContext, IDocumentModel, DocumentRegistry
} from '../docregistry';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookPanel
} from '../notebook/notebook/panel';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  WidgetManager, WidgetRenderer
} from './index';

import {
  IKernel
} from 'jupyter-js-services';

const WIDGET_MIMETYPE = 'application/vnd.jupyter.widget';


/**
 * The widget manager provider.
 */
export
const widgetManagerExtension = {
  id: 'jupyter.extensions.widgetManager',
  requires: [DocumentRegistry],
  activate: activateWidgetExtension
};

export
class IPyWidgetExtension implements IWidgetExtension<NotebookPanel>{
  /**
   * Create a new extension object.
   */
  createNew(nb: NotebookPanel, model: IDocumentModel,
            context: IDocumentContext): IDisposable {
    let wManager = new WidgetManager(context);
    let wRenderer = new WidgetRenderer(wManager);

    nb.content.rendermime.addRenderer(WIDGET_MIMETYPE, wRenderer, 0)
    return new DisposableDelegate(() => {
      nb.content.rendermime.removeRenderer(WIDGET_MIMETYPE);
      wRenderer.dispose();
      wManager.dispose();
    })
  }
}

/**
 * Activate the widget extension.
 */
function activateWidgetExtension(app: Application, registry: DocumentRegistry) {
  registry.registerExtension('Notebook', new IPyWidgetExtension());
}
