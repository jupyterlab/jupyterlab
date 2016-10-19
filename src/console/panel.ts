// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  showDialog
} from '../dialog';

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

    // Create console content widget.
    this._content = options.content || new ConsoleContent({
      session: options.session,
      rendermime: options.rendermime,
      renderer: options.renderer
    });
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
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the console panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('mousedown', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.content.activate();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    let session = this.content.session;
    if (!session.kernel) {
      super.onCloseRequest(msg);
      this.dispose();
      return;
    }
    session.kernel.getSpec().then(spec => {
      let name = spec.display_name;
      return showDialog({
        title: 'Shut down kernel?',
        body: `Shut down ${name}?`
      });
    }).then(value => {
      if (value && value.text === 'OK') {
        return session.shutdown();
      }
    }).then(() => {
      super.onCloseRequest(msg);
      this.dispose();
    });
  }

  private _evtMouseDown(event: MouseEvent): void {
    this.activate();
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
     * The optional console content instance to display in the console panel.
     *
     * #### Notes
     * If a console content widget is passed in, its MIME renderer and session
     * must match the values in the console panel options argument or it will
     * result in undefined behavior.
     */
    content?: ConsoleContent;

    /**
     * The mime renderer for the console panel.
     */
    rendermime: IRenderMime;

    /**
     * The renderer for a console widget.
     */
    renderer: ConsoleContent.IRenderer;

    /**
     * The session for the console panel.
     */
    session: ISession;
  }
}
