// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/ui-components';

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { PanelLayout, Widget } from '@lumino/widgets';

import { caretDownEmptyIcon } from '@jupyterlab/ui-components';

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
    this.titleWidget = new Widget({ node: document.createElement('h2') });

    this._expandIcon = new Widget({ node: document.createElement('div') });

    this._iconElement = caretDownEmptyIcon.element({
      container: this._expandIcon.node
    });
    this._iconElement.classList.add(PanelHeader.ICON_EXPANDING_CLASS);

    this.layout = new PanelLayout();
    this.toolbar = new Toolbar();

    this.layout.addWidget(this._expandIcon);
    this.layout.addWidget(this.titleWidget);
    this.layout.addWidget(this.toolbar);
  }

  /**
   * HTML element which hold the `caretDownEmptyIcon` icon.
   */
  private _iconElement: HTMLElement;

  /**
   * Expanding / contracting icon widget.
   */
  private _expandIcon: Widget;

  /**
   * The translation service.
   */
  protected _trans: TranslationBundle;

  /**
   * Class name used to rotate `caretDownEmptyIcon` icon.
   */
  static readonly ICON_EXPANDING_CLASS =
    'jp-DebuggerSidebar-panel-header-IconExpanding';

  /**
   * Class name used to rotate `caretDownEmptyIcon` icon.
   */
  static readonly ICON_CONTRACTING_CLASS =
    'jp-DebuggerSidebar-panel-header-IconContracting';

  /**
   * The title of header.
   */
  readonly titleWidget: Widget;

  /**
   * The layout of header.
   */
  readonly layout: PanelLayout;

  /**
   * The toolbar for the header.
   */
  readonly toolbar: Toolbar;
}
