// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Toolbar, ToolbarButton
} from '@jupyterlab/apputils';

import {
  Token
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  ISignal
} from '@phosphor/signaling';

import {
  PanelLayout, TabPanel, Widget
} from '@phosphor/widgets';


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


/* tslint:disable */
/**
 * The inspector panel token.
 */
export
const IInspector = new Token<IInspector>('@jupyterlab/inspector:IInspector');
/* tslint:enable */


/**
 * An interface for an inspector.
 */
export
interface IInspector {
  /**
   * Create an inspector child item and return a disposable to remove it.
   *
   * @param item - The inspector child item being added to the inspector.
   *
   * @returns A disposable that removes the child item from the inspector.
   */
  add(item: IInspector.IInspectorItem): IDisposable;

  /**
   * The source of events the inspector listens for.
   */
  source: IInspector.IInspectable | null;
}


/**
 * A namespace for inspector interfaces.
 */
export
namespace IInspector {
  /**
   * The definition of an inspectable source.
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

    /**
     * Indicates whether the inspectable source emits signals.
     *
     * #### Notes
     * The use case for this attribute is to limit the API traffic when no
     * inspector is visible.
     */
    standby: boolean;
  }

  /**
   * The definition of a child item of an inspector.
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
  }

  /**
   * An update value for code inspectors.
   */
  export
  interface IInspectorUpdate {
    /**
     * The content being sent to the inspector for display.
     */
    content: Widget | null;

    /**
     * The type of the inspector being updated.
     */
    type: string;
  }
}


/**
 * A panel which contains a set of inspectors.
 */
export
class InspectorPanel extends TabPanel implements IInspector {
  /**
   * Construct an inspector.
   */
  constructor() {
    super();
    this.addClass(PANEL_CLASS);
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): IInspector.IInspectable | null {
    return this._source;
  }
  set source(source: IInspector.IInspectable | null) {
    if (this._source === source) {
      return;
    }

    // Disconnect old signal handler.
    if (this._source) {
      this._source.standby = true;
      this._source.inspected.disconnect(this.onInspectorUpdate, this);
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }

    // Clear the inspector child items (but maintain history) if necessary.
    Object.keys(this._items).forEach(i => { this._items[i].content = null; });

    this._source = source;

    // Connect new signal handler.
    if (this._source) {
      this._source.standby = false;
      this._source.inspected.connect(this.onInspectorUpdate, this);
      this._source.disposed.connect(this.onSourceDisposed, this);
    }
  }

  /**
   * Create an inspector child item and return a disposable to remove it.
   *
   * @param item - The inspector child item being added to the inspector.
   *
   * @returns A disposable that removes the child item from the inspector.
   */
  add(item: IInspector.IInspectorItem): IDisposable {
    const widget = new InspectorItem();

    widget.rank = item.rank;
    widget.remembers = !!item.remembers;
    widget.title.closable = false;
    widget.title.label = item.name;
    if (item.className) {
      widget.addClass(item.className);
    }
    this._items[item.type] = widget;
    this.addWidget(widget);

    if ((Object.keys(this._items)).length < 2) {
      this.tabBar.hide();
    } else {
      this.tabBar.show();
    }

    return new DisposableDelegate(() => {
      if (widget.isDisposed || this.isDisposed) {
        return;
      }

      widget.dispose();
      delete this._items[item.type];

      if ((Object.keys(this._items)).length < 2) {
        this.tabBar.hide();
      } else {
        this.tabBar.show();
      }
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.source = null;
    let items = this._items;

    // Dispose the inspector child items.
    Object.keys(items).forEach(i => { items[i].dispose(); });
    super.dispose();
  }

  /**
   * Handle inspector update signals.
   */
  protected onInspectorUpdate(sender: any, args: IInspector.IInspectorUpdate): void {
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
    let newWidget: Widget | null = null;
    for (let type in items) {
      let inspector = this._items[type];
      if (inspector.rank < lowest && inspector.content) {
        lowest = inspector.rank;
        newWidget = inspector;
      }
    }
    if (newWidget) {
      this.currentWidget = newWidget;
    }
  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
  }

  private _items: { [type: string]: InspectorItem } = Object.create(null);
  private _source: IInspector.IInspectable | null = null;
}


/**
 * A code inspector child widget.
 */
class InspectorItem extends Widget {
  /**
   * Construct an inspector widget.
   */
  constructor() {
    super();
    this.layout = new PanelLayout();
    this.addClass(ITEM_CLASS);
    this._toolbar = this._createToolbar();
    (this.layout as PanelLayout).addWidget(this._toolbar);
  }

  /**
   * The text of the inspector.
   */
  get content(): Widget | null {
    return this._content;
  }
  set content(newValue: Widget | null) {
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
    if (newValue) {
      newValue.addClass(CONTENT_CLASS);
      (this.layout as PanelLayout).addWidget(newValue);
      if (this.remembers) {
        this._history.push(newValue);
        this._index++;
      }
    }
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
    this._remembers = newValue;
    if (!newValue) {
      this._clear();
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
    this._history.forEach(widget => widget.dispose());
    this._toolbar.dispose();
    super.dispose();
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
    this._history.forEach(widget => widget.dispose());
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
  private _createToolbar(): Toolbar<Widget> {
    let toolbar = new Toolbar();

    if (!this._remembers) {
      return toolbar;
    }

    let clear = new ToolbarButton({
      className: CLEAR_CLASS,
      onClick: () => { this._clear(); },
      tooltip: 'Clear history.'
    });
    toolbar.addItem('clear', clear);

    let back = new ToolbarButton({
      className: BACK_CLASS,
      onClick: () => { this._back(); },
      tooltip: 'Navigate back in history.'
    });
    toolbar.addItem('back', back);

    let forward = new ToolbarButton({
      className: FORWARD_CLASS,
      onClick: () => { this._forward(); },
      tooltip: 'Navigate forward in history.'
    });
    toolbar.addItem('forward', forward);

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

  private _content: Widget | null = null;
  private _history: Widget[] = [];
  private _index: number = -1;
  private _rank: number = Infinity;
  private _remembers: boolean = false;
  private _toolbar: Toolbar<Widget>;
}
