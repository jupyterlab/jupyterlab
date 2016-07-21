// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  showDialog
} from '../dialog';

import {
  RenderMime
} from '../rendermime';

import {
  ConsoleTooltip
} from './tooltip';

import {
  ConsoleWidget
} from './widget';


/**
 * The class name added to console panels.
 */
const CONSOLE_PANEL = 'jp-Console-panel';


/**
 * A panel which contains a toolbar and a console.
 */
export
class ConsolePanel extends SplitPanel {
  /**
   * Construct a console panel.
   */
  constructor(options: ConsolePanel.IOptions) {
    super();
    this.addClass(CONSOLE_PANEL);

    // Create console widget.
    this._console = new ConsoleWidget({
      session: options.session,
      rendermime: options.rendermime
    });

    // Create console tooltip widget.
    this._tooltip = options.tooltip || new ConsoleTooltip();
    this._tooltip.reference = this._console;

    this._tabs = new TabPanel();
    this._tabs.node.style.background = 'red';

    let isVertical = options.orientation && options.orientation === 'vertical';
    this.orientation = isVertical ? SplitPanel.Vertical : SplitPanel.Horizontal;

    this.addChild(this._console);
    this.addChild(this._tabs);
    this.setSizes([7, 2]);
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

    // Dispose console tooltip widget.
    this._tooltip.dispose();
    this._tooltip = null;

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
  private _tooltip: ConsoleTooltip = null;
  private _tabs: TabPanel = null;
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
     * The orientation of the console panel.
     */
    orientation?: 'horizontal' | 'vertical';

    /**
     * The session for the console panel.
     */
    session: ISession;

    /**
     * The mime renderer for the console panel.
     */
    rendermime: RenderMime<Widget>;


    /**
     * The tooltip widget for a console panel.
     */
    tooltip?: ConsoleTooltip;
  }
}
