// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    Toolbar, MainAreaWidget
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
class DocumentWidget extends MainAreaWidget implements IDocumentWidget {
  constructor(options: IDocumentWidget.IOptions) {
    super(options);
    this.context = options.context;
  }

  readonly context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
}
