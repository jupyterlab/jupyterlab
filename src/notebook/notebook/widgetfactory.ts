// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  ABCWidgetFactory, IDocumentContext, findKernel
} from '../../docregistry';

import {
  RenderMime
} from '../../rendermime';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  Widget
} from 'phosphor-widget';

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
   */
  constructor(rendermime: RenderMime<Widget>, clipboard: IClipboard) {
    super();
    this._rendermime = rendermime;
    this._clipboard = clipboard;
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
    let model = context.model;
    if (kernel) {
      context.changeKernel(kernel);
    } else {
      let name = findKernel(model.defaultKernelName, model.defaultKernelLanguage, context.kernelspecs);
      context.changeKernel({ name });
    }
    let panel = new NotebookPanel({ rendermime, clipboard: this._clipboard });
    panel.context = context;
    ToolbarItems.populateDefaults(panel);
    this.widgetCreated.emit(panel);
    return panel;
  }

  private _rendermime: RenderMime<Widget> = null;
  private _clipboard: IClipboard = null;
}
