// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData as IClipboard
} from '@phosphor/coreutils';

import {
  IEditorMimeTypeService
} from '../codeeditor';

import {
  ABCWidgetFactory, DocumentRegistry
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';

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
    this.rendermime = options.rendermime;
    this.clipboard = options.clipboard;
    this.contentFactory = options.contentFactory;
    this.mimeTypeService = options.mimeTypeService;
  }

  /*
   * The rendermime instance.
   */
  readonly rendermime: RenderMime;

  /**
   * The content factory used by the widget factory.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * A clipboard instance.
   */
  readonly clipboard: IClipboard;

  /**
   * The service used to look up mime types.
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  /**
   * Create a new widget.
   *
   * #### Notes
   * The factory will start the appropriate kernel and populate
   * the default toolbar items using `ToolbarItems.populateDefaults`.
   */
  protected createNewWidget(context: DocumentRegistry.IContext<INotebookModel>): NotebookPanel {
    let rendermime = this.rendermime.clone();
    let panel = new NotebookPanel({
      rendermime,
      clipboard: this.clipboard,
      contentFactory: this.contentFactory,
      mimeTypeService: this.mimeTypeService
    });
    panel.context = context;
    ToolbarItems.populateDefaults(panel);
    return panel;
  }
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
     * A notebook panel content factory.
     */
    contentFactory: NotebookPanel.IContentFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }
}
