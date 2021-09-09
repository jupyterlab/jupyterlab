// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/ui-components';

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * The base header for a debugger panels.
 */
export class PanelHeader extends Widget {
  /**
   * Instantiate a new PanelHeader.
   */
  constructor(translator?: ITranslator) {
    super({ node: document.createElement('div') });
    this.node.classList.add('jp-stack-panel-header');

    translator = translator || nullTranslator;
    this._trans = translator.load('jupyterlab');

    this.layout = new PanelLayout();
    this.toolbar = new Toolbar();

    this.layout.addWidget(this.toolbar);
  }

  /**
   * The translation service.
   */
  protected _trans: TranslationBundle;

  /**
   * The layout of header.
   */
  readonly layout: PanelLayout;

  /**
   * The toolbar for the header.
   */
  readonly toolbar: Toolbar;
}
