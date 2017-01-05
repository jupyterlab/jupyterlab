// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Session
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  IRenderMime
} from '../rendermime';

import {
  ConsoleContent
} from './content';


/**
 * The class name added to console panels.
 */
const PANEL_CLASS = 'jp-ConsolePanel';


/**
 * A panel which contains a console and the ability to add other children.
 */
export
class ConsolePanel extends Panel {
  /**
   * Construct a console panel.
   */
  constructor(options: ConsolePanel.IOptions) {
    super();
    this.addClass(PANEL_CLASS);
    this._content = options.content;

    this.addWidget(this._content);
  }

  /**
   * The console widget used by the panel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get content(): ConsoleContent {
    return this._content;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose console widget.
    this._content.dispose();
    this._content = null;

    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.content.prompt.editor.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  private _content: ConsoleContent = null;
}


/**
 * A namespace for ConsolePanel statics.
 */
export
namespace ConsolePanel {
  /**
   * The initialization options for a console panel.
   */
  export
  interface IOptions {
    /**
     * The console content instance to display in the console panel.
     */
    content: ConsoleContent;
  }
  /**
   * The console panel renderer.
   */
  export
  interface IRenderer {
    /**
     * Create a new console panel.
     */
    createConsole(rendermime: IRenderMime, session: Session.ISession): ConsolePanel;
  }
  /**
   * Default implementation of `IRenderer`.
   */
  export
  class Renderer implements IRenderer {

    /**
     * The console content renderer.
     */
    readonly contentRenderer: ConsoleContent.IRenderer;

    /**
     * Create a new renderer.
     */
    constructor(options: ConsoleContent.Renderer.IOptions) {
      this.contentRenderer = new ConsoleContent.Renderer(options);
    }

    /**
     * Create a new console panel.
     */
    createConsole(rendermime: IRenderMime, session: Session.ISession): ConsolePanel {
      const content = new ConsoleContent({
        rendermime, session,
        renderer: this.contentRenderer
      });
      return new ConsolePanel({content});
    }

  }
  /* tslint:disable */
  /**
   * The console renderer token.
   */
  export
  const IRenderer = new Token<IRenderer>('jupyter.services.console.renderer');
  /* tslint:enable */
}
