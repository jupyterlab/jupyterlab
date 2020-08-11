// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/apputils';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * The header for a Callstack Panel.
 */
export class CallstackHeader extends Widget {
  /**
   * Instantiate a new CallstackHeader.
   */
  constructor(translator?: ITranslator) {
    super({ node: document.createElement('header') });
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = trans.__('Callstack');

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
