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

    // Create the inspectors tab panel.
    this._tabs = new TabPanel();

    // Create console widget.
    this._console = options.console || new ConsoleWidget({
      session: options.session,
      rendermime: options.rendermime
    });


    // Create console inspector widgets and add them to the inspectors panel.
    (options.inspectors || ConsolePanel.defaultInspectors).forEach(value => {
      let inspector = value.widget || new ConsoleInspector();
      inspector.orientation = this._orientation as ConsoleInspector.Orientation;
      inspector.orientationToggled.connect(() => {
        let orientation = this.reorient(
          this._orientation === 'vertical' ? 'horizontal' : 'vertical'
        );
        Object.keys(this._inspectors).forEach(i => {
          this._inspectors[i].orientation = orientation;
        });
      });
      inspector.rank = value.rank;
      inspector.remember = !!value.remember;
      inspector.title.closable = false;
      inspector.title.text = value.name;
      if (value.className) {
        inspector.addClass(value.className);
      }
      this._inspectors[value.type] = inspector;
      this._tabs.addChild(inspector);
    });

    // Connect the code inspected signal.
    this._console.inspected.connect(this.onInspectorUpdate, this);

    // Add the panel contents.
    this._orientation = options.orientation || this._orientation;
    this.orientation = this._orientation === 'vertical' ? SplitPanel.Vertical
      : SplitPanel.Horizontal;
    this.addChild(this._console);
    this.addChild(this._tabs);
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
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose console inspectors.
    Object.keys(this._inspectors).forEach(i => this._inspectors[i].dispose());
    this._inspectors = null;

    // Dispose the inspector tabs.
    this._tabs.dispose();
    this._tabs = null;

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
  reorient(orientation: ConsolePanel.Orientation): ConsolePanel.Orientation {
    if (this._orientation === orientation) {
      return orientation;
    }

    this._orientation = orientation;
    this._cachedSizes = null;

    let isVertical = this._orientation === 'vertical';
    this.orientation = isVertical ? SplitPanel.Vertical : SplitPanel.Horizontal;
    this.setSizes(DEFAULT_SIZES);
    return orientation;
  }

  /**
   * Toggle the inspectors open and closed.
   */
  toggleInspectors(): void {
    if (this._tabs.isHidden) {
      this._tabs.show();
      this.setSizes(this._cachedSizes);
      this._cachedSizes = null;
    } else {
      this._tabs.hide();
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

  /**
   * Handle inspector update signals.
   */
  protected onInspectorUpdate(sender: any, args: ConsoleWidget.IInspectorUpdate): void {
    let widget = this._inspectors[args.type];
    if (!widget) {
      return;
    }

    // Update the content of the inspector widget.
    widget.content = args.content;

    let inspectors = this._inspectors;

    // If any inspector with a higher rank has content, do not change focus.
    if (args.content) {
      for (let type in inspectors) {
        let inspector = this._inspectors[type];
        if (inspector.rank < widget.rank && inspector.content) {
          return;
        }
      }
      this._tabs.currentWidget = widget;
      return;
    }

    // If the inspector was emptied, show the next best ranked inspector.
    let lowest = Infinity;
    widget = null;
    for (let type in inspectors) {
      let inspector = this._inspectors[type];
      if (inspector.rank < lowest && inspector.content) {
        lowest = inspector.rank;
        widget = inspector;
      }
    }
    if (widget) {
      this._tabs.currentWidget = widget;
    }
  }

  private _cachedSizes: number[] = null;
  private _console: ConsoleWidget = null;
  private _inspectors: { [id: string]: ConsoleInspector } = Object.create(null);
  private _tabs: TabPanel = null;
  private _orientation: ConsolePanel.Orientation = 'horizontal';
}


/**
 * A namespace for ConsolePanel statics.
 */
export
namespace ConsolePanel {
  /**
   * The orientation options of a console panel.
   */
  export
  type Orientation = 'horizontal' | 'vertical';

  /**
   * The definition of a console inspector.
   */
  export
  interface IInspector {
    /**
     * The optional class name added to the inspector widget.
     */
    className?: string;

    /**
     * The display name of the inspector.
     */
    name: string;

    /**
     * The rank order of display priority for inspector updates. A lower rank
     * denotes a higher display priority.
     */
    rank: number;

    /**
     * A flag that indicates whether the inspector remembers history.
     */
    remember?: boolean;

    /**
     * The type of the inspector.
     */
    type: string;

    /**
     * The optional console inspector widget instance.
     */
    widget?: ConsoleInspector;
  }

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
     * The list of available console inspectors for code introspection.
     *
     * #### Notes
     * The order of items in the inspectors array is the order in which they
     * will be rendered in the inspects tab panel.
     */
    inspectors?: IInspector[];

    /**
     * The orientation of the console panel.
     */
    orientation?: Orientation;

    /**
     * The mime renderer for the console panel.
     */
    rendermime: RenderMime<Widget>;

    /**
     * The session for the console panel.
     */
    session: ISession;
  }

  export
  const defaultInspectors: IInspector[] = [
    {
      className: HINTS_CLASS,
      name: 'Hints',
      rank: 2,
      type: 'hints'
    },
    {
      className: DETAILS_CLASS,
      name: 'Details',
      rank: 1,
      remember: true,
      type: 'details'
    }
  ];
}
