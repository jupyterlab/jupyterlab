// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject, JSONValue
} from 'phosphor/lib/algorithm/json';

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
  h, realize
} from 'phosphor/lib/ui/vdom';

import {
  BaseCellWidget, ICellModel
} from '../cells';

import {
  CodeEditor, CodeEditorWidget
} from '../codeeditor';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  INotebookTracker
} from './';


/**
 * The class name added to a CellTools instance.
 */
const CELLTOOLS_CLASS = 'jp-CellTools';

/**
 * The class name added to a CellTools child.
 */
const CHILD_CLASS = 'jp-CellTools-child';

/**
 * The class name added to a CellTools active cell.
 */
const ACTIVE_CELL_CLASS = 'jp-ActiveCellTool';

/**
 * The class name added to a MetadataEditor instance.
 */
const METADATA_CLASS = 'jp-MetaDataEditor';

/**
 * The class name added to the slide type editor.
 */
const SLIDETYPE_CLASS = 'jp-SlideType';

/**
 * The class name added to a separator widget.
 */
const SEPARATOR_CLASS = 'jp-CellTools-separator';


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
    this.addClass(CELLTOOLS_CLASS);
    this.layout = new PanelLayout();
    this._tracker = options.tracker;
    this._tracker.activeCellChanged.connect(this._onActiveCellChanged, this);
    this._tracker.selectionChanged.connect(this._onSelectionChanged, this);
    this._onActiveCellChanged();
    this._onSelectionChanged();
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
   * A signal emitted when a metadata field changes on the active cell.
   */
  readonly metadataChanged: ISignal<this, IChangedArgs<JSONValue>>;

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

    widget.addClass(CHILD_CLASS);

    // Upon disposal, remove the widget and its rank reference.
    widget.disposed.connect(this._onWidgetDisposed, this);

    this._items.insert(index, rankItem);
    let layout = this.layout as PanelLayout;
    if (this._items.length > 1) {
      let separator = new Widget();
      separator.addClass(SEPARATOR_CLASS);
      layout.insertWidget(index * 2 - 1, separator);
    }
    layout.insertWidget(index * 2, widget);
  }

  /**
   * Handle the disposal of an item.
   */
  private _onWidgetDisposed(widget: Widget): void {
    let index = findIndex(this._items, item => item.widget === widget);
    if (index !== -1) {
      this._items.removeAt(index);
    }
    let layout = this.layout as PanelLayout;
    // Remove the separator.
    if (index === 0 && layout.widgets.length) {
      layout.widgets.at(0).dispose;
    } else {
      layout.widgets.at(index * 2 - 1).dispose();
    }
  }

  /**
   * Handle a change to the active cell.
   */
  private _onActiveCellChanged(): void {
    if (this._prevActive) {
      this._prevActive.metadataChanged.disconnect(this._onMetadataChanged, this);
    }
    let activeCell = this._tracker.activeCell;
    this._prevActive = activeCell ? activeCell.model : null;
    if (activeCell) {
      activeCell.model.metadataChanged.connect(this._onMetadataChanged, this);
    }
    this.activeCellChanged.emit(activeCell);
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    this.selectionChanged.emit(void 0);
  }

  /**
   * Handle a change in the metadata.
   */
  private _onMetadataChanged(sender: ICellModel, args: IChangedArgs<JSONValue>): void {
    this.metadataChanged.emit(args);
  }

  private _items = new Vector<Private.IRankItem>();
  private _tracker: INotebookTracker;
  private _prevActive: ICellModel | null;
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

  /**
   * The options used to create a cell tool.
   */
  export
  interface IToolOptions {
    /**
     * The cell tools object.
     */
    celltools: ICellTools;
  }

  /**
   * A cell tool displaying the active cell contents.
   */
  export
  class ActiveCellTool extends Widget {
    /**
     * Construct a new active cell tool.
     */
    constructor(options: IToolOptions) {
      super();
      this.addClass(ACTIVE_CELL_CLASS);
      this.addClass('jp-InputArea');
      this.layout = new PanelLayout();
      this._celltools = options.celltools;
      this._celltools.activeCellChanged.connect(this._onActiveCellChanged, this);
      this._onActiveCellChanged();
    }

    /**
     * Handle a change to the active cell.
     */
    private _onActiveCellChanged(): void {
      let activeCell = this._celltools.activeCell;
      let layout = this.layout as PanelLayout;
      let count = layout.widgets.length;
      for (let i = 0; i < count; i++) {
        layout.widgets.at(0).dispose();
      }
      if (!activeCell) {
        // TODO: Use dummy content.
        return;
      }
      let promptNode = activeCell.promptNode.cloneNode(true) as HTMLElement;
      let prompt = new Widget({ node: promptNode });
      let factory = activeCell.contentFactory.editorFactory;
      let model = new CodeEditor.Model();
      model.value.text = activeCell.model.value.text.split('\n')[0];
      model.mimeType = activeCell.model.mimeType;
      let editorWidget = new CodeEditorWidget({ model, factory });
      editorWidget.addClass('jp-CellEditor');
      editorWidget.addClass('.jp-InputArea-editor');
      editorWidget.editor.readOnly = true;
      layout.addWidget(prompt);
      layout.addWidget(editorWidget);
    }

    private _celltools: ICellTools;
  }

  /**
   * A raw metadata editor.
   */
  export
  class MetadataEditor extends Widget {
    /**
     * Construct a new raw metadata tool.
     */
    constructor(options: IToolOptions) {
      let vnode = h.div({ className: METADATA_CLASS },
                    h.label({}, 'Cell Metadata'),
                    h.textarea()
                  );
      super({ node: realize(vnode) });
      this._celltools = options.celltools;
      this._celltools.activeCellChanged.connect(this._onActiveCellChanged, this);
      this._onActiveCellChanged();
    }

    /**
     * Get the text area used by the metadata editor.
     */
    get textarea(): HTMLTextAreaElement {
      return this.node.getElementsByTagName('textarea')[0];
    }

    /**
     * Handle a change to the active cell.
     */
    private _onActiveCellChanged(): void {
      let activeCell = this._celltools.activeCell;
      let content: JSONObject = {};
      if (activeCell) {
        each(activeCell.model.listMetadata(), key => {
          // Do not show the trusted metadata.
          if (key === 'trusted') {
            return;
          }
          content[key] = activeCell.model.getMetadata(key).getValue();
        });
      }
      this.textarea.textContent = JSON.stringify(content);
    }

    private _celltools: ICellTools;
  }

  /**
   * A slidetype selector.
   */
  export
  class SlideType extends Widget {

    /**
     * Construct a new active cell tool.
     */
    constructor(options: IToolOptions) {
      super();
      this.addClass(SLIDETYPE_CLASS);
      this.layout = new PanelLayout();
      this._celltools = options.celltools;
      this._celltools.activeCellChanged.connect(this._onActiveCellChanged, this);
      this._celltools.metadataChanged.connect(this._onMetadataChanged, this);
      this._onActiveCellChanged();
    }

    /**
     * Handle a change to the active cell.
     */
    private _onActiveCellChanged(): void {

    }

    /**
     * Handle a change in the metadata.
     */
    private _onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>): void {

    }

    private _celltools: ICellTools;
  }

}



// Define the signals for the `CellTools` class.
defineSignal(CellTools.prototype, 'activeCellChanged');
defineSignal(CellTools.prototype, 'selectionChanged');
defineSignal(CellTools.prototype, 'metadataChanged');


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
