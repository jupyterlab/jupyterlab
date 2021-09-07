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

    this._iconAngle = 0;
    this._iconElement = caretDownEmptyIcon.element({
      container: this._expandIcon.node
    });
    this._iconElement.classList.add(PanelHeader.ICON_EXPANDING_CLASS);

    this._paddingDiv = new Widget({ node: document.createElement('div') });
    this._paddingDiv.node.style.flexGrow = '1';
    this._paddingDiv.node.style.height = '100%';

    this.layout = new PanelLayout();
    this.toolbar = new Toolbar();

    this.layout.addWidget(this._expandIcon);
    this.layout.addWidget(this.titleWidget);
    this.layout.addWidget(this.toolbar);
    this.layout.addWidget(this._paddingDiv);
  }

  /**
   *  Toggler for expanding/contracting icon of header
   *
   * @param angle - angle of rotation of icon
   */
  public toggleIcon(angle: 0 | -90): void {
    if (angle !== this._iconAngle) {
      this._iconElement.classList.remove(
        PanelHeader.ICON_EXPANDING_CLASS,
        PanelHeader.ICON_CONTRACTING_CLASS
      );
      if (angle === -90) {
        this._iconElement.classList.add(PanelHeader.ICON_CONTRACTING_CLASS);
      } else {
        this._iconElement.classList.add(PanelHeader.ICON_EXPANDING_CLASS);
      }
      this._iconAngle = angle;
    }
  }

  /**
   * Angle of expanding / contracting icon.
   */
  private _iconAngle: number;

  /**
   * HTML element which hold the `caretDownEmptyIcon` icon.
   */
  private _iconElement: HTMLElement;

  /**
   * Expanding / contracting icon widget.
   */
  private _expandIcon: Widget;

  /**
   * A widget that stretch all remaining width of header.
   * It is used to receive click event.
   */
  private _paddingDiv: Widget;

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