// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor/lib/core/mimedata';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ABCWidgetFactory, IDocumentContext
} from '../../docregistry';

import {
  RenderMime
} from '../../rendermime';

import {
  ToolbarItems
} from './default-toolbar';

import {
  INotebookModel
} from './model';

import {
  NotebookPanel
} from './panel';


/**
 * A widget factory for notebook panels.
 */
export
class NotebookWidgetFactory extends ABCWidgetFactory<NotebookPanel, INotebookModel> {
  /**
   * Construct a new notebook widget factory.
   *
   * @param rendermime - The rendermime instance.
   *
   * @param clipboard - The application clipboard.
   * 
   * @param renderer - The notebook panel renderer.
   */
  constructor(rendermime: RenderMime, clipboard: IClipboard, renderer: NotebookPanel.IRenderer) {
    super();
    this._rendermime = rendermime;
    this._clipboard = clipboard;
    this._renderer = renderer;
  }

  /**
   * Dispose of the resources used by the factory.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._rendermime = null;
    this._clipboard = null;
    super.dispose();
  }

  /**
   * Create a new widget.
   *
   * #### Notes
   * The factory will start the appropriate kernel and populate
   * the default toolbar items using `ToolbarItems.populateDefaults`.
   */
  createNew(context: IDocumentContext<INotebookModel>, kernel?: IKernel.IModel): NotebookPanel {
    let rendermime = this._rendermime.clone();
    if (kernel) {
      context.changeKernel(kernel);
    }
    let panel = new NotebookPanel({ 
      rendermime, 
      clipboard: this._clipboard,
      renderer: this._renderer
    });
    panel.context = context;
    ToolbarItems.populateDefaults(panel);
    this.widgetCreated.emit(panel);
    return panel;
  }

  private _rendermime: RenderMime = null;
  private _clipboard: IClipboard = null;
  private _renderer: NotebookPanel.IRenderer = null;
}
