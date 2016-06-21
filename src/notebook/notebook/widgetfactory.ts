// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernelId
} from 'jupyter-js-services';

import {
  IWidgetFactory, IDocumentContext, findKernel
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
class NotebookWidgetFactory implements IWidgetFactory<NotebookPanel, INotebookModel> {
  /**
   * Construct a new notebook widget factory.
   *
   * @param rendermime - The rendermime instance.
   *
   * @param clipboard - The application clipboard.
   */
  constructor(rendermime: RenderMime<Widget>, clipboard: IClipboard) {
    this._rendermime = rendermime;
    this._clipboard = clipboard;
  }

  /**
   * Get whether the factory has been disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._rendermime === null;
  }

  /**
   * Dispose of the resources used by the factory.
   */
  dispose(): void {
    this._rendermime = null;
    this._clipboard = null;
  }

  /**
   * Create a new widget.
   *
   * #### Notes
   * The factory will start the appropriate kernel and populate
   * the default toolbar items using `ToolbarItems.populateDefaults`.
   */
  createNew(context: IDocumentContext<INotebookModel>, kernel?: IKernelId): NotebookPanel {
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
    return panel;
  }

  /**
   * Take an action on a widget before closing it.
   *
   * @returns A promise that resolves to true if the document should close
   *   and false otherwise.
   *
   * ### The default implementation is a no-op.
   */
  beforeClose(widget: NotebookPanel, context: IDocumentContext<INotebookModel>): Promise<boolean> {
    // No special action required.
    return Promise.resolve(true);
  }

  private _rendermime: RenderMime<Widget> = null;
  private _clipboard: IClipboard = null;
}
