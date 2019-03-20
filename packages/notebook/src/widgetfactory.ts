// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';

import { RenderMimeRegistry } from '@jupyterlab/rendermime';

import { ToolbarItems } from './default-toolbar';

import { INotebookModel } from './model';

import { NotebookPanel } from './panel';

import { StaticNotebook } from './widget';

/**
 * A widget factory for notebook panels.
 */
export class NotebookWidgetFactory extends ABCWidgetFactory<
  NotebookPanel,
  INotebookModel
> {
  /**
   * Construct a new notebook widget factory.
   *
   * @param options - The options used to construct the factory.
   */
  constructor(options: NotebookWidgetFactory.IOptions<NotebookPanel>) {
    super(options);
    this.rendermime = options.rendermime;
    this.contentFactory =
      options.contentFactory || NotebookPanel.defaultContentFactory;
    this.mimeTypeService = options.mimeTypeService;
    this._editorConfig =
      options.editorConfig || StaticNotebook.defaultEditorConfig;
    this._notebookConfig =
      options.notebookConfig || StaticNotebook.defaultNotebookConfig;
  }

  /*
   * The rendermime instance.
   */
  readonly rendermime: RenderMimeRegistry;

  /**
   * The content factory used by the widget factory.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * The service used to look up mime types.
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  /**
   * A configuration object for cell editor settings.
   */
  get editorConfig(): StaticNotebook.IEditorConfig {
    return this._editorConfig;
  }
  set editorConfig(value: StaticNotebook.IEditorConfig) {
    this._editorConfig = value;
  }

  /**
   * A configuration object for notebook settings.
   */
  get notebookConfig(): StaticNotebook.INotebookConfig {
    return this._notebookConfig;
  }
  set notebookConfig(value: StaticNotebook.INotebookConfig) {
    this._notebookConfig = value;
  }

  /**
   * Create a new widget.
   *
   * #### Notes
   * The factory will start the appropriate kernel.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<INotebookModel>
  ): NotebookPanel {
    let rendermime = this.rendermime.clone({ resolver: context.urlResolver });

    let nbOptions = {
      rendermime,
      contentFactory: this.contentFactory,
      mimeTypeService: this.mimeTypeService,
      editorConfig: this._editorConfig,
      notebookConfig: this._notebookConfig
    };
    let content = this.contentFactory.createNotebook(nbOptions);

    return new NotebookPanel({ context, content });
  }

  /**
   * Default factory for toolbar items to be added after the widget is created.
   */
  protected defaultToolbarFactory(
    widget: NotebookPanel
  ): DocumentRegistry.IToolbarItem[] {
    return ToolbarItems.getDefaultItems(widget);
  }

  private _editorConfig: StaticNotebook.IEditorConfig;
  private _notebookConfig: StaticNotebook.INotebookConfig;
}

/**
 * The namespace for `NotebookWidgetFactory` statics.
 */
export namespace NotebookWidgetFactory {
  /**
   * The options used to construct a `NotebookWidgetFactory`.
   */
  export interface IOptions<T extends NotebookPanel>
    extends DocumentRegistry.IWidgetFactoryOptions<T> {
    /*
      * A rendermime instance.
      */
    rendermime: RenderMimeRegistry;

    /**
     * A notebook panel content factory.
     */
    contentFactory: NotebookPanel.IContentFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The notebook cell editor configuration.
     */
    editorConfig?: StaticNotebook.IEditorConfig;

    /**
     * The notebook configuration.
     */
    notebookConfig?: StaticNotebook.INotebookConfig;
  }
}
