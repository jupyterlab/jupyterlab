// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  findIndex, upperBound
} from 'phosphor/lib/algorithm/searching';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  BaseCellWidget
} from '../cells';

import {
  INotebookTracker
} from './';


/* tslint:disable */
/**
 * The main menu token.
 */
export
const ICellTools = new Token<ICellTools>('jupyter.services.cell-tools');
/* tslint:enable */


/**
 * The interface for cell metadata tools.
 */
export
interface ICellTools extends CellTools {};


/**
 * A widget that provides cell metadata tools.
 */
export
class CellTools extends Widget implements ICellTools {
  /**
   * Construct a new CellTools object.
   */
  constructor(options: CellTools.IOptions) {
    super();
    this._tracker = options.tracker;
    this.layout = new PanelLayout();
    this._tracker.activeCellChanged.connect(this._onActiveCellChanged, this);
    this._tracker.selectionChanged.connect(this._onSelectionChanged, this);
  }

  /**
   * A signal emitted when the current active cell changes.
   */
  readonly activeCellChanged: ISignal<this, BaseCellWidget>;

  /**
   * A signal emitted when the selection state changes.
   */
  readonly selectionChanged: ISignal<this, void>;

  /**
   * The active cell widget.
   */
  get activeCell(): BaseCellWidget | null {
    return this._tracker.activeCell;
  }

  /**
   * The currently selected cells.
   */
  get selectedCells(): BaseCellWidget[] {
    let selected: BaseCellWidget[] = [];
    let panel = this._tracker.currentWidget;
    if (!panel) {
      return selected;
    }
    each(panel.notebook.widgets, widget => {
      if (panel.notebook.isSelected(widget)) {
        selected.push(widget);
      }
    });
    return selected;
  }

  /**
   * Add a cell tool item.
   */
  addItem(options: CellTools.IAddOptions): void {
    let widget = options.widget;
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { widget, rank };
    let index = upperBound(this._items, rankItem, Private.itemCmp);

    // Upon disposal, remove the widget and its rank reference.
    widget.disposed.connect(this._onWidgetDisposed, this);

    this._items.insert(index, rankItem);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
  }

  /**
   * Handle the disposal of an item.
   */
  private _onWidgetDisposed(widget: Widget): void {
    let index = findIndex(this._items, item => item.widget === widget);
    if (index !== -1) {
      this._items.removeAt(index);
    }
  }

  /**
   * Handle a change to the active cell.
   */
  private _onActiveCellChanged(): void {
    this.activeCellChanged.emit(this._tracker.activeCell);
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    this.selectionChanged.emit(void 0);
  }

  private _items = new Vector<Private.IRankItem>();
  private _tracker: INotebookTracker;
}


/**
 * The namespace for CellTools class statics.
 */
export
namespace CellTools {
  /**
   * The options used to create a CellTools object.
   */
  export
  interface IOptions {
    /**
     * The notebook tracker used by the cell tools.
     */
    tracker: INotebookTracker;
  }

  /**
   * The options used to add an item to the cell tools.
   */
  export
  interface IAddOptions {
    /**
     * The widget to add to the cell tools area.
     */
    widget: Widget;

    /**
     * The rank order of the widget among its siblings.
     */
    rank?: number;
  }
}



// Define the signals for the `CellTools` class.
defineSignal(CellTools.prototype, 'activeCellChanged');
defineSignal(CellTools.prototype, 'selectionChanged');



/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An object which holds a widget and its sort rank.
   */
  export
  interface IRankItem {
    /**
     * The widget for the item.
     */
    widget: Widget;

    /**
     * The sort rank of the menu.
     */
    rank: number;
  }

  /**
   * A comparator function for widget rank items.
   */
  export
  function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }
}
