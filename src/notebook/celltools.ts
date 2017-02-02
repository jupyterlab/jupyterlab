// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

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
  Message
} from 'phosphor/lib/core/messaging';

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
  h, realize, VNode
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
const METADATA_CLASS = 'jp-MetadataEditor';

/**
 * The class name added to a KeySelector instance.
 */
const KEYSELECTOR_CLASS = 'jp-KeySelector';

/**
 * The class name added to a select wrapper.
 */
const SELECT_WRAPPER_CLASS = 'jp-KeySelector-selectWrapper';

/**
 * The class name added to a wrapper that has focus.
 */
const FOCUS_CLASS = 'jp-mod-focused';

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
   * The base cell tool, meant to be subclassed.
   */
  export
  class BaseCellTool extends Widget {
    /**
     * Construct a new cell tool.
     */
    constructor(options: IToolOptions, node: HTMLElement = null) {
      super({ node });
      this.celltools = options.celltools;
      this.celltools.activeCellChanged.connect(this.onActiveCellChanged, this);
      this.celltools.selectionChanged.connect(this.onSelectionChanged, this);
      this.celltools.metadataChanged.connect(this.onMetadataChanged, this);
    }

    /**
     * The cell tools object.
     */
    readonly celltools: ICellTools;

    /**
     * Handle an after-attach message.
     */
    protected onAfterAttach(message: Message): void {
      this.onActiveCellChanged(this.celltools, this.celltools.activeCell);
    }

    /**
     * Handle a change to the active cell.
     *
     * #### Notes
     * The default implemenatation is a no-op.
     */
    protected onActiveCellChanged(sender: ICellTools, args: BaseCellWidget): void { /* no-op */ }

    /**
     * Handle a change to the selection.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onSelectionChanged(sender: ICellTools): void { /* no-op */ }

    /**
     * Handle a change to the metadata of the active cell.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
     protected onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>): void { /* no-op */ }
  }

  /**
   * A cell tool displaying the active cell contents.
   */
  export
  class ActiveCellTool extends BaseCellTool {
    /**
     * Construct a new active cell tool.
     */
    constructor(options: IToolOptions) {
      super(options);
      this.addClass(ACTIVE_CELL_CLASS);
      this.addClass('jp-InputArea');
      this.layout = new PanelLayout();
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(): void {
      let activeCell = this.celltools.activeCell;
      let layout = this.layout as PanelLayout;
      let count = layout.widgets.length;
      for (let i = 0; i < count; i++) {
        layout.widgets.at(0).dispose();
      }
      if (!activeCell) {
        let cell = new Widget();
        cell.addClass('jp-CellEditor');
        cell.addClass('jp-InputArea-editor');
        layout.addWidget(cell);
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
      editorWidget.addClass('jp-InputArea-editor');
      editorWidget.editor.readOnly = true;
      layout.addWidget(prompt);
      layout.addWidget(editorWidget);
    }
  }

  /**
   * A raw metadata editor.
   */
  export
  class MetadataEditor extends BaseCellTool {
    /**
     * Construct a new raw metadata tool.
     */
    constructor(options: IToolOptions) {
      let vnode = h.div({ className: METADATA_CLASS },
                    h.label({}, 'Cell Metadata'),
                    h.textarea()
                  );
      super(options, realize(vnode));
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
    protected onActiveCellChanged(sender: ICellTools, activeCell: BaseCellWidget): void {
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
      this.textarea.value = JSON.stringify(content, null, 2);
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>) {
      this.onActiveCellChanged(sender, sender.activeCell);
    }
  }

  /**
   * A cell tool that provides a selection for a given metadata key.
   */
  export
  class KeySelector extends BaseCellTool {
    /**
     * Construct a new KeySelector.
     */
    constructor(options: IKeySelectorOptions) {
      super(options, Private.createSelector(options));
      this.addClass(KEYSELECTOR_CLASS);
      this.key = options.key;
      this._validCellTypes = options.validCellTypes || [];
    }

    /**
     * The metadata key used by the selector.
     */
    readonly key: string;

    /**
     * The select node for the widget.
     */
    get selectNode(): HTMLSelectElement {
      return this.node.getElementsByTagName('select')[0] as HTMLSelectElement;
    }

    /**
     * Handle the DOM events for the widget.
     *
     * @param event - The DOM event sent to the widget.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the notebook panel's node. It should
     * not be called directly by user code.
     */
    handleEvent(event: Event): void {
      let wrapper = this.node.getElementsByClassName(SELECT_WRAPPER_CLASS)[0];
      switch (event.type) {
        case 'change':
          this.onValueChanged();
          break;
        case 'focus':
          wrapper.classList.add(FOCUS_CLASS);
          break;
        case 'blur':
          wrapper.classList.remove(FOCUS_CLASS);
          break;
        default:
          break;
      }
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(message: Message): void {
      super.onAfterAttach(message);
      this.selectNode.addEventListener('change', this);
      this.selectNode.addEventListener('focus', this);
      this.selectNode.addEventListener('blur', this);
    }

    /**
     * Handle `before_detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      this.selectNode.removeEventListener('change', this);
      this.selectNode.removeEventListener('focus', this);
      this.selectNode.removeEventListener('blur', this);
    }

    /**
     * Handle a change to the value.
     */
    protected onValueChanged(): void {
      let activeCell = this.celltools.activeCell;
      if (!activeCell || this._changeGuard) {
        return;
      }
      this._changeGuard = true;
      let select = this.selectNode;
      let cursor = activeCell.model.getMetadata(this.key);
      cursor.setValue(JSON.parse(select.value));
      this._changeGuard = false;
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(sender: ICellTools, activeCell: BaseCellWidget): void {
      let select = this.selectNode;
      if (!activeCell) {
        select.disabled = true;
        return;
      }
      let cellType = activeCell.model.type;
      if (this._validCellTypes.length &&
          this._validCellTypes.indexOf(cellType) === -1) {
        select.disabled = true;
        return;
      }
      select.disabled = false;
      let cursor = activeCell.model.getMetadata(this.key);
      select.value = JSON.stringify(cursor.getValue());
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>) {
      if (this._changeGuard) {
        return;
      }
      let select = this.selectNode;
      if (args.name === this.key) {
        this._changeGuard = true;
        select.value = JSON.stringify(args.newValue);
        this._changeGuard = false;
      }
    }

    private _changeGuard = true;
    private _validCellTypes: string[];
  }


  /**
   * The options used to initialize a keyselector.
   */
  export
  interface IKeySelectorOptions {
    /**
     * The cell tools object.
     */
    celltools: ICellTools;

    /**
     * The metadata key of interest.
     */
    key: string;

    /**
     * The map of options to values.
     */
    optionsMap: { [key: string]: JSONValue };

    /**
     * The optional title of the selector - defaults to capitalized `key`.
     */
    title?: string;

    /**
     * The optional valid cell types - defaults to all valid types.
     */
    validCellTypes?: nbformat.CellType[];
  }

  /**
   * Create a slideshow selector.
   */
  export
  function createSlideShowSelector(options: IToolOptions): KeySelector {
    let selectorOptions = {
      celltools: options.celltools,
      key: 'slideshow',
      title: 'Slide Type',
      optionsMap: {
        '-': '-',
        'Slide': 'slide',
        'Sub-Slide': 'subslide',
        'Fragment': 'fragment',
        'Skip': 'skip',
        'Notes': 'notes'
      }
    };
    return new KeySelector(selectorOptions);
  }

  /**
   * Create an nbcovert selector.
   */
  export
  function createNBConvertSelector(options: IToolOptions): KeySelector {
    let selectorOptions: IKeySelectorOptions = {
      celltools: options.celltools,
      key: 'raw_mimetype',
      title: 'Raw NBConvert Format',
      optionsMap: {
        'None': '-',
        'LaTeX': 'text/latex',
        'reST': 'text/restructuredtext',
        'HTML': 'text/html',
        'Markdown': 'text/markdown',
        'Python': 'text/x-python'
      },
      validCellTypes: ['raw']
    };
    return new KeySelector(selectorOptions);
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

  /**
   * Create the node for a KeySelector.
   */
  export
  function createSelector(options: CellTools.IKeySelectorOptions): HTMLElement {
    let name = options.key;
    let title = (
      options.title || name[0].toLocaleUpperCase() + name.slice(1)
    );
    let optionNodes: VNode[] = [];
    for (let label in options.optionsMap) {
      let value = JSON.stringify(options.optionsMap[label]);
      optionNodes.push(h.option({ label, value }));
    }
    return realize(
      h.div({},
        h.label(title),
        h.div({ className: SELECT_WRAPPER_CLASS },
          h.select({},
            optionNodes)))
    );
  }
}
