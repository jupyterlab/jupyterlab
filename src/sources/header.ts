// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/apputils';

import { PanelLayout, Widget } from '@lumino/widgets';

import { SourcesModel } from './model';

/**
 * The header for a Source Panel.
 */
export class SourcesHeader extends Widget {
  /**
   * Instantiate a new SourcesHeader.
   * @param model The model for the Sources.
   */
  constructor(model: SourcesModel) {
    super({ node: document.createElement('header') });

    const layout = new PanelLayout();
    this.layout = layout;

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = 'Source';

    const sourcePath = new Widget({ node: document.createElement('span') });
    model.currentSourceChanged.connect((_, source) => {
      const path = source?.path ?? '';
      sourcePath.node.textContent = path;
      sourcePath.node.title = path;
    });

    layout.addWidget(title);
    layout.addWidget(this.toolbar);
    layout.addWidget(sourcePath);

    this.addClass('jp-DebuggerSources-header');
  }

  /**
   * The toolbar for the sources header.
   */
  readonly toolbar = new Toolbar();
}
