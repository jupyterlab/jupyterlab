// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PanelLayout, Widget } from '@phosphor/widgets';

/**
 * The header for a Variables Panel.
 */
export class VariablesHeader extends Widget {
  /**
   * Instantiate a new VariablesHeader.
   */
  constructor() {
    super({ node: document.createElement('header') });

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = 'Variables';

    const layout = new PanelLayout();
    this.layout = layout;
    layout.addWidget(title);
  }
}
