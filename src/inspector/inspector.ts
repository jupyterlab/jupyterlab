// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  TabPanel
} from 'phosphor/lib/ui/tabpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Toolbar, ToolbarButton
} from '../toolbar';


/**
 * The class name added to inspector panels.
 */
const PANEL_CLASS = 'jp-Inspector';

/**
 * The class name added to inspector child item widgets.
 */
const ITEM_CLASS = 'jp-InspectorItem';

/**
 * The class name added to inspector child item widgets' content.
 */
const CONTENT_CLASS = 'jp-InspectorItem-content';

/**
 * The history clear button class name.
 */
const CLEAR_CLASS = 'jp-InspectorItem-clear';

/**
 * The back button class name.
 */
const BACK_CLASS = 'jp-InspectorItem-back';

/**
 * The forward button class name.
 */
const FORWARD_CLASS = 'jp-InspectorItem-forward';

/**
 * The orientation toggle bottom button class name.
 */
const BOTTOM_TOGGLE_CLASS = 'jp-InspectorItem-bottom';

/**
 * The orientation toggle right button class name.
 */
const RIGHT_TOGGLE_CLASS = 'jp-InspectorItem-right';


/* tslint:disable */
/**
 * The inspector panel token.
 */
export
const IInspector = new Token<IInspector>('jupyter.services.inspector');
/* tslint:enable */


/**
 * An interface for an inspector panel.
 */
export
interface IInspector {
  /**
   * The orientation of the inspector panel.
   */
  orientation: Inspector.Orientation;

  /**
   * The source of events the inspector panel listens for.
   */
  source: Inspector.IInspectable;
}


/**
 * A panel which contains a set of inspectors.
 */
export
class Inspector extends TabPanel implements IInspector {
  /**
   * Construct an inspector.
   */
  constructor(options: Inspector.IOptions) {
    super();
    this.addClass(PANEL_CLASS);

    // Create inspector child items and add them to the inspectors panel.
    (options.items || []).forEach(value => {
      let widget = value.widget || new InspectorItem();
      widget.orientation = this._orientation as Inspector.Orientation;
      widget.orientationToggled.connect(() => {
        this.orientation = 'vertical' ? 'horizontal' : 'vertical';
      });
      widget.rank = value.rank;
      widget.remembers = !!value.remembers;
      widget.title.closable = false;
      widget.title.label = value.name;
      if (value.className) {
        widget.addClass(value.className);
      }
      this._items[value.type] = widget;
      this.addWidget(widget);
    });
  }

  /**
   * The orientation of the inspector panel.
   */
  get orientation(): Inspector.Orientation {
    return this._orientation;
  }
  set orientation(orientation: Inspector.Orientation) {
    if (this._orientation === orientation) {
      return;
    }

    this._orientation = orientation;
    Object.keys(this._items).forEach(i => {
      this._items[i].orientation = orientation;
    });
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): Inspector.IInspectable {
    return this._source;
  }
  set source(source: Inspector.IInspectable) {
    if (this._source === source) {
      return;
    }

    // Disconnect old signal handler.
    if (this.source) {
      this._source.inspected.disconnect(this.onInspectorUpdate, this);
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }

    // Clear the inspector child items (but maintain history).
    Object.keys(this._items).forEach(i => this._items[i].content = null);

    this._source = source;

    // Connect new signal handler.
    if (this.source) {
      this._source.inspected.connect(this.onInspectorUpdate, this);
      this._source.disposed.connect(this.onSourceDisposed, this);
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose the inspector child items.
    Object.keys(this._items).forEach(i => this._items[i].dispose());
    this._items = null;

    // Disconnect from source.
    this.source = null;

    super.dispose();
  }

  /**
   * Handle inspector update signals.
   */
  protected onInspectorUpdate(sender: any, args: Inspector.IInspectorUpdate): void {
    let widget = this._items[args.type];
    if (!widget) {
      return;
    }

    // Update the content of the inspector widget.
    widget.content = args.content;

    let items = this._items;

    // If any inspector with a higher rank has content, do not change focus.
    if (args.content) {
      for (let type in items) {
        let inspector = this._items[type];
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
    for (let type in items) {
      let inspector = this._items[type];
      if (inspector.rank < lowest && inspector.content) {
        lowest = inspector.rank;
        widget = inspector;
      }
    }
    if (widget) {
      this.currentWidget = widget;
    }
  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
  }

  private _items: { [type: string]: InspectorItem } = Object.create(null);
  private _orientation: Inspector.Orientation = 'horizontal';
  private _source: Inspector.IInspectable = null;
}


/**
 * A namespace for Inspector statics.
 */
export
namespace Inspector {
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
     * A signal emitted when the handler is disposed.
     */
    disposed: ISignal<any, void>;

    /**
     * A signal emitted when inspector should clear all items with no history.
     */
    ephemeralCleared: ISignal<any, void>;

    /**
     * A signal emitted when an inspector value is generated.
     */
    inspected: ISignal<any, IInspectorUpdate>;
  }

  /**
   * An update value for code inspectors.
   */
  export
  interface IInspectorUpdate {
    /**
     * The content being sent to the inspector for display.
     */
    content: Widget;

    /**
     * The type of the inspector being updated.
     */
    type: string;
  }

  /**
   * The definition of a child item of an inspector panel.
   */
  export
  interface IInspectorItem {
    /**
     * The optional class name added to the inspector child widget.
     */
    className?: string;

    /**
     * The display name of the inspector child.
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
    remembers?: boolean;

    /**
     * The type of the inspector.
     */
    type: string;

    /**
     * The optional inspector child item instance.
     */
    widget?: InspectorItem;
  }

  /**
   * The initialization options for an inspector panel.
   */
  export
  interface IOptions {
    /**
     * The list of available child inspectors items for code introspection.
     *
     * #### Notes
     * The order of items in the inspectors array is the order in which they
     * will be rendered in the inspectors tab panel.
     */
    items?: IInspectorItem[];

    /**
     * The orientation of the inspector panel.
     *
     * The default value is `'horizontal'`.
     */
    orientation?: Orientation;
  }
}


/**
 * A code inspector child widget.
 */
export
class InspectorItem extends Panel {
  /**
   * This flag is a temporary placeholder and will be removed when we switch to
   * the phosphor mono-repo and have support for multiple inspector locations.
   */
  toggleEnabled = false;

  /**
   * Construct an inspector widget.
   */
  constructor() {
    super();
    this.addClass(ITEM_CLASS);
    this.update();
  }

  /**
   * A signal emitted when an inspector widget's orientation is toggled.
   */
  orientationToggled: ISignal<InspectorItem, void>;

  /**
   * The text of the inspector.
   */
  get content(): Widget {
    return this._content;
  }
  set content(newValue: Widget) {
    if (newValue === this._content) {
      return;
    }
    if (this._content) {
      if (this._remembers) {
        this._content.hide();
      } else {
        this._content.dispose();
      }
    }
    this._content = newValue;
    if (this._content) {
      this._content.addClass(CONTENT_CLASS);
      this.addWidget(this._content);
      if (this.remembers) {
        this._history.push(newValue);
        this._index++;
      }
    }
  }

  /**
   * The display orientation of the inspector widget.
   */
  get orientation(): Inspector.Orientation {
    return this._orientation;
  }
  set orientation(newValue: Inspector.Orientation) {
    if (newValue === this._orientation) {
      return;
    }
    this._orientation = newValue;
    this.update();
  }

  /**
   * A flag that indicates whether the inspector remembers history.
   */
  get remembers(): boolean {
    return this._remembers;
  }
  set remembers(newValue: boolean) {
    if (newValue === this._remembers) {
      return;
    }
    this._clear();
    this._remembers = newValue;
    if (!this._remembers) {
      this._history = null;
    }
    this.update();
  }

  /**
   * The display rank of the inspector.
   */
  get rank(): number {
    return this._rank;
  }
  set rank(newValue: number) {
    this._rank = newValue;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    clearSignalData(this);

    if (this._history) {
      this._history.forEach(widget => widget.dispose());
      this._history = null;
    }

    if (this._toolbar) {
      this._toolbar.dispose();
    }

    super.dispose();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this._toolbar) {
      this._toolbar.dispose();
    }

    this._toolbar = this._createToolbar();
    this.insertWidget(0, this._toolbar);
  }

  /**
   * Navigate back in history.
   */
  private _back(): void {
    if (this._history.length) {
      this._navigateTo(Math.max(this._index - 1, 0));
    }
  }

  /**
   * Clear history.
   */
  private _clear(): void {
    if (this._history) {
      this._history.forEach(widget => widget.dispose());
    }
    this._history = [];
    this._index = -1;
  }

  /**
   * Navigate forward in history.
   */
  private _forward(): void {
    if (this._history.length) {
      this._navigateTo(Math.min(this._index + 1, this._history.length - 1));
    }
  }

  /**
   * Create a history toolbar.
   */
  private _createToolbar(): Toolbar {
    let toolbar = new Toolbar();

    if (this.toggleEnabled) {
      let toggle = new ToolbarButton({
        className: this.orientation === 'vertical' ? RIGHT_TOGGLE_CLASS
          : BOTTOM_TOGGLE_CLASS,
        onClick: () => { this.orientationToggled.emit(void 0); },
        tooltip: 'Toggle the inspector orientation.'
      });
      toolbar.add('toggle', toggle);
    }

    if (!this._remembers) {
      return toolbar;
    }

    let clear = new ToolbarButton({
      className: CLEAR_CLASS,
      onClick: () => { this._clear(); },
      tooltip: 'Clear history.'
    });
    toolbar.add('clear', clear);

    let back = new ToolbarButton({
      className: BACK_CLASS,
      onClick: () => { this._back(); },
      tooltip: 'Navigate back in history.'
    });
    toolbar.add('back', back);

    let forward = new ToolbarButton({
      className: FORWARD_CLASS,
      onClick: () => { this._forward(); },
      tooltip: 'Navigate forward in history.'
    });
    toolbar.add('forward', forward);

    return toolbar;
  }

  /**
   * Navigate to a known index in history.
   */
  private _navigateTo(index: number): void {
    if (this._content) {
      this._content.hide();
    }
    this._content = this._history[index];
    this._index = index;
    this._content.show();
  }

  private _content: Widget = null;
  private _history: Widget[] = null;
  private _index: number = -1;
  private _orientation: Inspector.Orientation = 'horizontal';
  private _rank: number = Infinity;
  private _remembers: boolean = false;
  private _toolbar: Toolbar = null;
}


// Define the signals for the `InspectorItem` class.
defineSignal(InspectorItem.prototype, 'orientationToggled');
