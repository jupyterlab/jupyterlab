// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    Toolbar
} from '@jupyterlab/apputils';

import {
    IDocumentWidget, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
    Widget
} from '@phosphor/widgets';

/**
 * A document widget implementation.
 */
export
class DocumentWidget<T extends Widget, U extends DocumentRegistry.IModel> extends Widget implements IDocumentWidget<Widget, DocumentRegistry.IModel> {
  constructor(options: IDocumentWidget.IOptions<Widget, DocumentRegistry.IModel>) {
    super({node: options.node});
    this.content = options.content;
    this.contentReady = options.contentReady;
    this.context = options.context;
    this.toolbar = options.toolbar;

    // Set layout to boxpanel with appropriate sizing for toolbar
  }

  readonly content: Widget;
  readonly contentReady: Promise<void>;
  readonly context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  readonly toolbar: Toolbar<Widget>;
}
