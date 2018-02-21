// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookModel
} from '@jupyterlab/notebook';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

export
class NotebookTableOfContents extends Widget {
  /**
   * Create a new extension object.
   */
  constructor(model: INotebookModel) {
    super();

    this.addClass('jp-NotebookTableOfContents');

    this.layout = new PanelLayout();
    this.node.textContent = 'Hello, world';
  }
}
