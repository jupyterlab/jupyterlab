// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  MimeData as IClipboard
} from 'phosphor/lib/core/mimedata';

import {
  ABCWidgetFactory, DocumentRegistry
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
   * @param options - The options used to construct the factory.
   */
  constructor(options: NotebookWidgetFactory.IOptions) {
    super(options);
    this._rendermime = options.rendermime;
    this._clipboard = options.clipboard;
    this._renderer = options.renderer;
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
  protected createNewWidget(context: DocumentRegistry.IContext<INotebookModel>): NotebookPanel {
    let rendermime = this._rendermime.clone();
    let panel = new NotebookPanel({
      rendermime,
      clipboard: this._clipboard,
      renderer: this._renderer
    });
    panel.context = context;
    ToolbarItems.populateDefaults(panel);
    return panel;
  }

  private _rendermime: RenderMime = null;
  private _clipboard: IClipboard = null;
  private _renderer: NotebookPanel.IRenderer = null;
}


/**
 * The namespace for `NotebookWidgetFactory` statics.
 */
export
namespace NotebookWidgetFactory {
  /**
   * The options used to construct a `NotebookWidgetFactory`.
   */
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
     /*
      * A rendermime instance.
      */
    rendermime: RenderMime;

    /**
     * A clipboard instance.
     */
    clipboard: IClipboard;

    /**
     * A notebook panel renderer.
     */
    renderer: NotebookPanel.IRenderer;
  }
}
