// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

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
  ConsoleWidget
} from './widget';


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

    // Create console widget.
    this._console = options.console || new ConsoleWidget({
      session: options.session,
      rendermime: options.rendermime,
      renderer: options.renderer
    });
    this.addWidget(this._console);
  }

  /**
   * A signal emitted when the console panel has been activated.
   */
  activated: ISignal<ConsolePanel, void>;

  /**
   * The console widget used by the panel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get content(): ConsoleWidget {
    return this._console;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose console widget.
    this._console.dispose();
    this._console = null;

    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.content.activate();
    this.activated.emit(void 0);
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    let session = this.content.session;
    if (!session.kernel) {
      this.dispose();
    }
    session.kernel.getKernelSpec().then(spec => {
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

  private _console: ConsoleWidget = null;
}


// Define the signals for the `ConsolePanel` class.
defineSignal(ConsolePanel.prototype, 'activated');


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
     * The optional console widget instance to display in the console panel.
     *
     * #### Notes
     * If a console widget is passed in, its MIME renderer and session must
     * match the values in the console panel options argument or it will result
     * in undefined behavior.
     */
    console?: ConsoleWidget;

    /**
     * The mime renderer for the console panel.
     */
    rendermime: IRenderMime;

    /**
     * The renderer for a console widget.
     */
    renderer: ConsoleWidget.IRenderer;

    /**
     * The session for the console panel.
     */
    session: ISession;
  }
}
