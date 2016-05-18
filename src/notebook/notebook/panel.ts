// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel
} from 'jupyter-js-services';

import {
  IDocumentContext
} from 'jupyter-js-ui/lib/docmanager';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Panel, PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  INotebookModel
} from './model';

import {
  NotebookToolbar
} from './toolbar';

import {
  ActiveNotebook
} from './widget';


/**
 * The class name added to notebook panels.
 */
const NB_PANEL = 'jp-Notebook-panel';

/**
 * The class name added to notebook container widgets.
 */
const NB_CONTAINER = 'jp-Notebook-container';


/**
 * A widget that hosts a notebook toolbar and content area.
 *
 * #### Notes
 * The widget keeps the document metadata in sync with the current
 * kernel on the context.
 */
export
class NotebookPanel extends Widget {
  /**
   * Create a new content area for the notebook.
   */
  static createContent(model: INotebookModel, rendermime: RenderMime<Widget>): ActiveNotebook {
    return new ActiveNotebook(model, rendermime);
  }

  /**
   * Create a new toolbar for the notebook.
   */
  static createToolbar(): NotebookToolbar {
    return new NotebookToolbar();
  }

  /**
   * Populate the toolbar on a panel with the default items.
   */
  static populateToolbar(panel: NotebookPanel): void {
    Private.populateToolbar(panel);
  }

  /**
   * Construct a new notebook panel.
   */
  constructor(model: INotebookModel, rendermime: RenderMime<Widget>, context: IDocumentContext) {
    super();
    this.addClass(NB_PANEL);
    this._model = model;
    this._rendermime = rendermime;
    this._context = context;
    this.layout = new PanelLayout();

    let ctor = this.constructor as typeof NotebookPanel;
    let toolbar = ctor.createToolbar();
    ctor.populateToolbar(this);
    this._content = ctor.createContent(model, rendermime);

    let container = new Panel();
    container.addClass(NB_CONTAINER);
    container.addChild(this._content);

    let layout = this.layout as PanelLayout;
    layout.addChild(toolbar);
    layout.addChild(container);

    context.kernelChanged.connect(() => {
      this.handleKernelChange(context.kernel);
    });
    if (context.kernel) {
      this.handleKernelChange(context.kernel);
    }
  }

  /**
   * Get the toolbar used by the widget.
   */
  get toolbar(): NotebookToolbar {
    let layout = this.layout as PanelLayout;
    return layout.childAt(0) as NotebookToolbar;
  }

  /**
   * Get the content area used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get content(): ActiveNotebook {
    return this._content;
  }

  /**
   * Get the rendermime instance used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendermime(): RenderMime<Widget> {
    return this._rendermime;
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._model;
  }

  /**
   * Get the document context for the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get context(): IDocumentContext {
    return this._context;
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null;
    this._rendermime = null;
    this._content = null;
    super.dispose();
  }

  /**
   * Handle a change in the kernel by updating the document metadata.
   */
  protected handleKernelChange(kernel: IKernel): void {
    kernel.kernelInfo().then(info => {
      let infoCursor = this.model.getMetadata('language_info');
      infoCursor.setValue(info.language_info);
      infoCursor.dispose();
    });
    kernel.getKernelSpec().then(spec => {
      let specCursor = this.model.getMetadata('kernelspec');
      specCursor.setValue({
        name: kernel.name,
        display_name: spec.display_name,
        language: spec.language
      });
      specCursor.dispose();
    });
  }

  private _rendermime: RenderMime<Widget> = null;
  private _context: IDocumentContext = null;
  private _model: INotebookModel = null;
  private _content: ActiveNotebook = null;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Populate the default items in the toolbar.
   */
  export
  function populateToolbar(panel: NotebookPanel): void {
    // TODO
  }
}
