// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/apputils';

import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * The header for a Callstack Panel.
 */
export class CallstackHeader extends Widget {
  /**
   * Instantiate a new CallstackHeader.
   */
  constructor() {
    super({ node: document.createElement('header') });

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = 'Callstack';

    const layout = new PanelLayout();
    layout.addWidget(title);
    layout.addWidget(this.toolbar);
    this.layout = layout;
  }

  /**
   * The toolbar for the callstack header.
   */
  readonly toolbar = new Toolbar();
}
