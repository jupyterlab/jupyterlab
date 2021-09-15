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
export class PanelWithToolbar extends Panel {
  /**
   * Instantiate a new Panel.
   *
   * @param options The instantiation options for a Debugger Panel.
   */
  constructor(options: PanelWithToolbar.IOptions) {
    super(options);
    const translator = options.translator || nullTranslator;
    this.trans = translator.load('jupyterlab');

    this._toolbar = new Toolbar();
    this._toolbar.addClass('jp-stack-panel-header');
    // Add toolbar as widget to get notified by the lumino widget
    this.addWidget(this._toolbar);
  }

  /**
   * Handler to notify `AccordionPanel` title that its child widget is expanded.
   * We can not rely on `lm-mod-expanded` class of Lumino to detect this event
   * since this class is added to the target of `onClick` event, which is not
   * always the title of `AccordionPanel`.
   *
   * @param {Message} msg
   *
   * TODO remove when @lumino/widgets 1.26.3 is released
   */
  protected onAfterShow(msg: Message): void {
    this.toolbar.node.parentElement?.classList.add('jp-DebuggerPanel-expanded');
  }

  /**
   * Handler to notify `AccordionPanel`'s title that its child widget is closed.
   * @param {Message} msg
   *
   * TODO remove when @lumino/widgets 1.26.3 is released
   */
  protected onAfterHide(msg: Message): void {
    this.toolbar.node.parentElement?.classList.remove(
      'jp-DebuggerPanel-expanded'
    );
  }

  /**
   * Widget toolbar
   */
  get toolbar(): Toolbar {
    return this._toolbar;
  }

  /**
   * The toolbar widget, it is not attached to current widget
   * but is rendered by the sidebar panel.
   */
  private _toolbar: Toolbar;

  protected trans: TranslationBundle;
}

/**
 * A namespace for PanelWidget `statics`.
 */
export namespace PanelWithToolbar {
  /**
   * Instantiation options for `PanelWidget`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
