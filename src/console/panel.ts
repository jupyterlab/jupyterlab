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
  ConsoleInspector
} from './inspector';

import {
  ConsoleWidget
} from './widget';


/**
 * The class name added to console panels.
 */
const PANEL_CLASS = 'jp-ConsolePanel';

/**
 * The class name added to console panel detail inspectors.
 */
const DETAILS_CLASS = 'jp-ConsolePanel-details';

/**
 * The class name added to console panel hint inspectors.
 */
const HINTS_CLASS = 'jp-ConsolePanel-hints';

/**
 * The default size ratio between the console widget and inspectors.
 */
const DEFAULT_SIZES = [2, 1];


/**
 * A panel which contains a side bar and a console.
 */
export
class ConsolePanel extends SplitPanel {
  /**
   * Construct a console panel.
   */
  constructor(options: ConsolePanel.IOptions) {
    super();
    this.addClass(PANEL_CLASS);

    // Create the tab panel.
    this._inspectors = new TabPanel();

    // Create console widget.
    this._console = new ConsoleWidget({
      session: options.session,
      rendermime: options.rendermime
    });

    // Create console hints widget and add it to the tab panel.
    this._hints = options.hints || new ConsoleInspector();
    this._hints.title.closable = false;
    this._hints.title.text = 'Hints';
    this._hints.addClass(HINTS_CLASS);
    this._inspectors.addChild(this._hints);

    // Create console details widget and add it to the tab panel.
    this._details = options.details || new ConsoleInspector();
    this._details.title.closable = false;
    this._details.title.text = 'Details';
    this._hints.addClass(DETAILS_CLASS);
    this._inspectors.addChild(this._details);

    // Connect the console hints signal.
    this._console.hintChanged.connect((sender: any, content: Widget) => {
      this._hints.content = content;
      // If content exists and there are no visible details, show hints.
      if (content && this._details.content === null) {
        this._inspectors.currentWidget = this._hints;
      }
    }, this);

    // Connect the console details signal.
    this._console.detailsChanged.connect((sender: any, content: Widget) => {
      this._details.content = content;
      // If content exists, then user requested details always supersede
      // automatically generated hints.
      if (content) {
        this._inspectors.currentWidget = this._details;
      }
    }, this);

    // Add the panel contents.
    this._orientation = options.orientation || this._orientation;
    this.orientation = this._orientation === 'vertical' ? SplitPanel.Vertical
      : SplitPanel.Horizontal;
    this.addChild(this._console);
    this.addChild(this._inspectors);
    this.setSizes(DEFAULT_SIZES);
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
   * The inspectors tabs used by the panel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get inspectors(): TabPanel {
    return this._inspectors;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose console details widget.
    this._details.dispose();
    this._details = null;

    // Dispose console hints widget.
    this._hints.dispose();
    this._hints = null;

    // Dispose the inspector tabs.
    this._inspectors.dispose();
    this._inspectors = null;

    // Dispose console widget.
    this._console.dispose();
    this._console = null;

    super.dispose();
  }

  /**
   * Change the orientation of the console widget and inspectors.
   *
   * #### Notes
   * This method will become unnecessary once the phosphor mono-repo version of
   * `SplitPanel` is used because its `orientation` accessor uses 'vertical' and
   * 'horizontal' as its values instead of an enum.
   */
  reorient(orientation: 'horizontal' | 'vertical'): void {
    if (this._orientation === orientation) {
      return;
    }

    this._orientation = orientation;
    this._cachedSizes = null;

    let isVertical = this._orientation === 'vertical';
    this.orientation = isVertical ? SplitPanel.Vertical : SplitPanel.Horizontal;
    this.setSizes(DEFAULT_SIZES);
  }

  /**
   * Toggle the inspectors open and closed.
   */
  toggleInspectors(): void {
    if (this._inspectors.isHidden) {
      this._inspectors.show();
      this.setSizes(this._cachedSizes);
      this._cachedSizes = null;
    } else {
      this._inspectors.hide();
      this._cachedSizes = this.sizes();
    }
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

  private _cachedSizes: number[] = null;
  private _console: ConsoleWidget = null;
  private _details: ConsoleInspector = null;
  private _hints: ConsoleInspector = null;
  private _inspectors: TabPanel = null;
  private _orientation: 'horizontal' | 'vertical' = 'horizontal';
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
     * The details (pager) widget for a console panel.
     */
    details?: ConsoleInspector;

    /**
     * The hints widget for a console panel.
     */
    hints?: ConsoleInspector;

    /**
     * The orientation of the console panel.
     */
    orientation?: 'horizontal' | 'vertical';

    /**
     * The mime renderer for the console panel.
     */
    rendermime: RenderMime<Widget>;

    /**
     * The session for the console panel.
     */
    session: ISession;
  }
}
