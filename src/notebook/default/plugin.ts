// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  IClipboard
} from '../../clipboard';

import {
  IRenderMime
} from '../../rendermime';

import {
  NotebookWidgetFactory
} from '../notebook/widgetfactory';

import {
  NotebookPanel
} from '../notebook/panel';

import {
  IInspector
} from '../../inspector';

import {
  DefaultNotebookWidgetFactory
} from './factory';

/**
 * The provider for a default notebook factory.
 */
export
const notebookFactoryProvider: JupyterLabPlugin<NotebookWidgetFactory> = {
  id: 'jupyter.services.notebook.default.factory',
  requires: [
    IRenderMime,
    IClipboard,
    NotebookPanel.IRenderer,
    IInspector
  ],
  provides: NotebookWidgetFactory,
  activate: activateNotebookFactoryProvider
};

/**
 * Activate the extension.
 */
function activateNotebookFactoryProvider(app: JupyterLab, rendermime: IRenderMime, clipboard: IClipboard, renderer: NotebookPanel.IRenderer, inspector: IInspector): NotebookWidgetFactory {
  return new DefaultNotebookWidgetFactory(rendermime, clipboard, renderer, inspector);
}
