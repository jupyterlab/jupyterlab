// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { Toolbar } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { Panel } from '@lumino/widgets';

/**
 * A base class for debugger panel element.
 */
export class PanelWidget extends Panel {
  /**
   * Instantiate a new Panel.
   *
   * @param options The instantiation options for a Debugger Panel.
   */
  constructor(options: PanelWidget.IOptions) {
    super();
    const translator = options.translator || nullTranslator;
    this.trans = translator.load('jupyterlab');

    this._header = new Toolbar();
    this._header.addClass('jp-stack-panel-header');
  }

  /**
   * Handler to notify `AccordionPanel` title that its child widget is expanded.
   * We can not rely on `lm-mod-expande` class of Lumino to detect this event
   * since this class is added to the target of `onClick` event, which is not
   * always the title of `AccordionPanel`.
   * @param {Message} msg
   */
  protected onAfterShow(msg: Message): void {
    this.header.node.parentElement?.classList.add('jp-DebuggerPanel-expanded');
  }

  /**
   * Handler to notify `AccordionPanel`'s title that its child widget is closed.
   * @param {Message} msg
   */
  protected onAfterHide(msg: Message): void {
    this.header.node.parentElement?.classList.remove(
      'jp-DebuggerPanel-expanded'
    );
  }

  get header(): Toolbar {
    return this._header;
  }

  /**
   * The toolbar widget, it is not attached to current widget
   * but is rendered by the sidebar panel.
   */
  private _header: Toolbar;

  protected trans: TranslationBundle;
}

/**
 * A namespace for PanelWidget `statics`.
 */
export namespace PanelWidget {
  /**
   * Instantiation options for `PanelWidget`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The application language translator..
     */
    translator?: ITranslator;
  }
}
