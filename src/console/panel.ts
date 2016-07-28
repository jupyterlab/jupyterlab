// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Panel
} from 'phosphor-panel';

import {
  showDialog
} from '../dialog';

import {
  RenderMime
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
      rendermime: options.rendermime
    });
    this.addChild(this._console);
  }

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
    rendermime: RenderMime;

    /**
     * The session for the console panel.
     */
    session: ISession;
  }
}
