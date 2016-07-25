// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from 'phosphor-signaling';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Inspector
} from './inspector';


/**
 * The class name added to inspector panels.
 */
const PANEL_CLASS = 'jp-InspectorPanel';

/**
 * The class name added to detail inspectors.
 */
const DETAILS_CLASS = 'jp-InspectorPanel-details';

/**
 * The class name added to hint inspectors.
 */
const HINTS_CLASS = 'jp-InspectorPanel-hints';


/**
 * A panel which contains a set of inspectors.
 */
export
class InspectorPanel extends TabPanel {
  /**
   * Construct a console panel.
   */
  constructor(options: InspectorPanel.IOptions) {
    super();
    this.addClass(PANEL_CLASS);

    // Create console inspector widgets and add them to the inspectors panel.
    (options.inspectors || InspectorPanel.defaultInspectors).forEach(value => {
      let inspector = value.widget || new Inspector();
      inspector.orientation = this._orientation as Inspector.Orientation;
      inspector.orientationToggled.connect(() => {
        this.orientation = 'vertical' ? 'horizontal' : 'vertical';
      });
      inspector.rank = value.rank;
      inspector.remember = !!value.remember;
      inspector.title.closable = false;
      inspector.title.text = value.name;
      if (value.className) {
        inspector.addClass(value.className);
      }
      this._inspectors[value.type] = inspector;
      this.addChild(inspector);
    });
  }

  /**
   * Set the orientation of the inspector panel.
   */
  get orientation(): InspectorPanel.Orientation {
    return this._orientation;
  }
  set orientation(orientation: InspectorPanel.Orientation) {
    if (this._orientation === orientation) {
      return;
    }

    this._orientation = orientation;
    Object.keys(this._inspectors).forEach(i => {
      this._inspectors[i].orientation = orientation;
    });
  }

  /**
   * Set the reference to the semantic parent of the inspector panel.
   */
  get reference(): InspectorPanel.IInspectable {
    return this._reference;
  }
  set reference(reference: InspectorPanel.IInspectable) {
    if (this._reference === reference) {
      return;
    }

    // Disconnect old signal handler.
    if (this.reference) {
      this._reference.inspected.disconnect(this.onInspectorUpdate, this);
    }

    this._reference = reference;

    // Connect new signal handler.
    if (this.reference) {
      this._reference.inspected.connect(this.onInspectorUpdate, this);
    }
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

    // Disconnect from reference.
    this.reference = null;

    super.dispose();
  }

  /**
   * Handle inspector update signals.
   */
  protected onInspectorUpdate(sender: any, args: Inspector.IInspectorUpdate): void {
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
      this.currentWidget = widget;
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
      this.currentWidget = widget;
    }
  }

  private _inspectors: { [type: string]: Inspector } = Object.create(null);
  private _orientation: InspectorPanel.Orientation = 'horizontal';
  private _reference: InspectorPanel.IInspectable = null;
}


/**
 * A namespace for InspectorPanel statics.
 */
export
namespace InspectorPanel {
  /**
   * The orientation options of an inspector panel.
   */
  export
  type Orientation = 'horizontal' | 'vertical';

  /**
   * The definition of an inspector.
   */
  export
  interface IInspectable {
    /**
     * A signal emitted when an inspector value is generated.
     */
    inspected: ISignal<any, Inspector.IInspectorUpdate>;
  }

  /**
   * The definition of an inspector.
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
     *
     * The default value is `false`.
     */
    remember?: boolean;

    /**
     * The type of the inspector.
     */
    type: string;

    /**
     * The optional console inspector widget instance.
     */
    widget?: Inspector;
  }

  /**
   * The initialization options for a console panel.
   */
  export
  interface IOptions {
    /**
     * The list of available inspectors for code introspection.
     *
     * #### Notes
     * The order of items in the inspectors array is the order in which they
     * will be rendered in the inspects tab panel.
     */
    inspectors?: IInspector[];

    /**
     * The orientation of the inspector panel.
     *
     * The default value is `'horizontal'`.
     */
    orientation?: Orientation;
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
