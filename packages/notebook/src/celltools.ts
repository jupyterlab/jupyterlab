// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each
} from '@phosphor/algorithm';

import {
  JSONObject, JSONValue, Token
} from '@phosphor/coreutils';

import {
  ConflatableMessage, Message, MessageLoop
} from '@phosphor/messaging';

import {
  h, VirtualDOM, VirtualNode
} from '@phosphor/virtualdom';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  Styling
} from '@jupyterlab/apputils';

import {
  Cell, ICellModel
} from '@jupyterlab/cells';

import {
  CodeEditor, CodeEditorWrapper, JSONEditor
} from '@jupyterlab/codeeditor';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  IObservableMap, ObservableJSON
} from '@jupyterlab/observables';

import {
  INotebookTracker
} from './';


/**
 * The class name added to a CellTools instance.
 */
const CELLTOOLS_CLASS = 'jp-CellTools';

/**
 * The class name added to a CellTools tool.
 */
const CHILD_CLASS = 'jp-CellTools-tool';

/**
 * The class name added to a CellTools active cell.
 */
const ACTIVE_CELL_CLASS = 'jp-ActiveCellTool';

/**
 * The class name added to an Editor instance.
 */
const EDITOR_CLASS = 'jp-MetadataEditorTool';

/**
 * The class name added to a KeySelector instance.
 */
const KEYSELECTOR_CLASS = 'jp-KeySelector';


/* tslint:disable */
/**
 * The main menu token.
 */
export
const ICellTools = new Token<ICellTools>('@jupyterlab/notebook:ICellTools');
/* tslint:enable */


/**
 * The interface for cell metadata tools.
 */
export
interface ICellTools extends CellTools {}


/**
 * A widget that provides cell metadata tools.
 */
export
class CellTools extends Widget {
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
   * The active cell widget.
   */
  get activeCell(): Cell | null {
    return this._tracker.activeCell;
  }

  /**
   * The currently selected cells.
   */
  get selectedCells(): Cell[] {
    let selected: Cell[] = [];
    let panel = this._tracker.currentWidget;
    if (!panel) {
      return selected;
    }
    each(panel.content.widgets, widget => {
      if (panel.content.isSelectedOrActive(widget)) {
        selected.push(widget);
      }
    });
    return selected;
  }

  /**
   * Add a cell tool item.
   */
  addItem(options: CellTools.IAddOptions): void {
    let tool = options.tool;
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { tool, rank };
    let index = ArrayExt.upperBound(this._items, rankItem, Private.itemCmp);

    tool.addClass(CHILD_CLASS);

    // Add the tool.
    ArrayExt.insert(this._items, index, rankItem);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, tool);

    // Trigger the tool to update its active cell.
    MessageLoop.sendMessage(tool, CellTools.ActiveCellMessage);
  }

  /**
   * Handle the removal of a child
   */
  protected onChildRemoved(msg: Widget.ChildMessage): void {
    let index = ArrayExt.findFirstIndex(this._items, item => item.tool === msg.child);
    if (index !== -1) {
      ArrayExt.removeAt(this._items, index);
    }
  }

  /**
   * Handle a change to the active cell.
   */
  private _onActiveCellChanged(): void {
    if (this._prevActive && !this._prevActive.isDisposed) {
      this._prevActive.metadata.changed.disconnect(this._onMetadataChanged, this);
    }
    let activeCell = this._tracker.activeCell;
    this._prevActive = activeCell ? activeCell.model : null;
    if (activeCell) {
      activeCell.model.metadata.changed.connect(this._onMetadataChanged, this);
    }
    each(this.children(), widget => {
      MessageLoop.sendMessage(widget, CellTools.ActiveCellMessage);
    });
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    each(this.children(), widget => {
      MessageLoop.sendMessage(widget, CellTools.SelectionMessage);
    });
  }

  /**
   * Handle a change in the metadata.
   */
  private _onMetadataChanged(sender: IObservableMap<JSONValue>, args: IObservableMap.IChangedArgs<JSONValue>): void {
    let message = new ObservableJSON.ChangeMessage(args);
    each(this.children(), widget => {
      MessageLoop.sendMessage(widget, message);
    });
  }

  private _items: Private.IRankItem[] = [];
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
     * The tool to add to the cell tools area.
     */
    tool: Tool;

    /**
     * The rank order of the widget among its siblings.
     */
    rank?: number;
  }

  /**
   * A singleton conflatable `'activecell-changed'` message.
   */
  export
  // tslint:disable-next-line
  const ActiveCellMessage = new ConflatableMessage('activecell-changed');

  /**
   * A singleton conflatable `'selection-changed'` message.
   */
  export
  // tslint:disable-next-line
  const SelectionMessage = new ConflatableMessage('selection-changed');

  /**
   * The base cell tool, meant to be subclassed.
   */
  export
  class Tool extends Widget {
    /**
     * The cell tools object.
     */
    readonly parent: ICellTools;

    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     */
    processMessage(msg: Message): void {
      super.processMessage(msg);
      switch (msg.type) {
      case 'activecell-changed':
        this.onActiveCellChanged(msg);
        break;
      case 'selection-changed':
        this.onSelectionChanged(msg);
        break;
      case 'jsonvalue-changed':
        this.onMetadataChanged(msg as ObservableJSON.ChangeMessage);
        break;
      default:
        break;
      }
    }

    /**
     * Handle a change to the active cell.
     *
     * #### Notes
     * The default implemenatation is a no-op.
     */
    protected onActiveCellChanged(msg: Message): void { /* no-op */ }

    /**
     * Handle a change to the selection.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onSelectionChanged(msg: Message): void { /* no-op */ }

    /**
     * Handle a change to the metadata of the active cell.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
     protected onMetadataChanged(msg: ObservableJSON.ChangeMessage): void { /* no-op */ }
  }

  /**
   * A cell tool displaying the active cell contents.
   */
  export
  class ActiveCellTool extends Tool {
    /**
     * Construct a new active cell tool.
     */
    constructor() {
      super();
      this.addClass(ACTIVE_CELL_CLASS);
      this.addClass('jp-InputArea');
      this.layout = new PanelLayout();
    }

    /**
     * Dispose of the resources used by the tool.
     */
    dispose() {
      if (this._model === null) {
        return;
      }
      this._model.dispose();
      this._model = null;
      super.dispose();
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(): void {
      let activeCell = this.parent.activeCell;
      let layout = this.layout as PanelLayout;
      let count = layout.widgets.length;
      for (let i = 0; i < count; i++) {
        layout.widgets[0].dispose();
      }
      if (this._cellModel && !this._cellModel.isDisposed) {
        this._cellModel.value.changed.disconnect(this._onValueChanged, this);
        this._cellModel.mimeTypeChanged.disconnect(this._onMimeTypeChanged, this);
      }
      if (!activeCell) {
        let cell = new Widget();
        cell.addClass('jp-InputArea-editor');
        cell.addClass('jp-InputArea-editor');
        layout.addWidget(cell);
        this._cellModel = null;
        return;
      }
      let promptNode = activeCell.promptNode ? activeCell.promptNode.cloneNode(true) as HTMLElement : null;
      let prompt = new Widget({ node: promptNode });
      let factory = activeCell.contentFactory.editorFactory;

      let cellModel = this._cellModel = activeCell.model;
      cellModel.value.changed.connect(this._onValueChanged, this);
      cellModel.mimeTypeChanged.connect(this._onMimeTypeChanged, this);
      this._model.value.text = cellModel.value.text.split('\n')[0];
      this._model.mimeType = cellModel.mimeType;

      let model = this._model;
      let editorWidget = new CodeEditorWrapper({ model, factory });
      editorWidget.addClass('jp-InputArea-editor');
      editorWidget.addClass('jp-InputArea-editor');
      editorWidget.editor.setOption('readOnly', true);
      layout.addWidget(prompt);
      layout.addWidget(editorWidget);
    }

    /**
     * Handle a change to the current editor value.
     */
    private _onValueChanged(): void {
      this._model.value.text = this._cellModel.value.text.split('\n')[0];
    }

    /**
     * Handle a change to the current editor mimetype.
     */
    private _onMimeTypeChanged(): void {
      this._model.mimeType = this._cellModel.mimeType;
    }

    private _model = new CodeEditor.Model();
    private _cellModel: CodeEditor.IModel;
  }

  /**
   * A raw metadata editor.
   */
  export
  class MetadataEditorTool extends Tool {
    /**
     * Construct a new raw metadata tool.
     */
    constructor(options: MetadataEditorTool.IOptions) {
      super();
      let editorFactory = options.editorFactory;
      this.addClass(EDITOR_CLASS);
      let layout = this.layout = new PanelLayout();
      this.editor = new JSONEditor({
        editorFactory,
        title: 'Edit Metadata',
        collapsible: true
      });
      layout.addWidget(this.editor);
    }

    /**
     * The editor used by the tool.
     */
    readonly editor: JSONEditor;

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      let cell = this.parent.activeCell;
      this.editor.source = cell ? cell.model.metadata : null;
    }
  }

  /**
   * The namespace for `MetadataEditorTool` static data.
   */
  export
  namespace MetadataEditorTool {
    /**
     * The options used to initialize a metadata editor tool.
     */
    export
    interface IOptions {
      /**
       * The editor factory used by the tool.
       */
      editorFactory: CodeEditor.Factory;
    }
  }

  /**
   * A cell tool that provides a selection for a given metadata key.
   */
  export
  class KeySelector extends Tool {
    /**
     * Construct a new KeySelector.
     */
    constructor(options: KeySelector.IOptions) {
      super({ node: Private.createSelectorNode(options) });
      this.addClass(KEYSELECTOR_CLASS);
      this.key = options.key;
      this._validCellTypes = options.validCellTypes || [];
      this._getter = options.getter || this._getValue;
      this._setter = options.setter || this._setValue;
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
      switch (event.type) {
        case 'change':
          this.onValueChanged();
          break;
        default:
          break;
      }
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(msg: Message): void {
      let node = this.selectNode;
      node.addEventListener('change', this);
    }

    /**
     * Handle `before-detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      let node = this.selectNode;
      node.removeEventListener('change', this);
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      let select = this.selectNode;
      let activeCell = this.parent.activeCell;
      if (!activeCell) {
        select.disabled = true;
        select.value = '';
        return;
      }
      let cellType = activeCell.model.type;
      if (this._validCellTypes.length &&
          this._validCellTypes.indexOf(cellType) === -1) {
        select.disabled = true;
        return;
      }
      select.disabled = false;
      this._changeGuard = true;
      let getter = this._getter;
      select.value = JSON.stringify(getter(activeCell));
      this._changeGuard = false;
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(msg: ObservableJSON.ChangeMessage) {
      if (this._changeGuard) {
        return;
      }
      let select = this.selectNode;
      let cell = this.parent.activeCell;
      if (msg.args.key === this.key && cell) {
        this._changeGuard = true;
        let getter = this._getter;
        select.value = JSON.stringify(getter(cell));
        this._changeGuard = false;
      }
    }

    /**
     * Handle a change to the value.
     */
    protected onValueChanged(): void {
      let activeCell = this.parent.activeCell;
      if (!activeCell || this._changeGuard) {
        return;
      }
      this._changeGuard = true;
      let select = this.selectNode;
      let setter = this._setter;
      setter(activeCell, JSON.parse(select.value));
      this._changeGuard = false;
    }

    /**
     * Get the value for the data.
     */
    private _getValue = (cell: Cell) => {
      return cell.model.metadata.get(this.key);
    }

    /**
     * Set the value for the data.
     */
    private _setValue = (cell: Cell, value: JSONValue) => {
      cell.model.metadata.set(this.key, value);
    }

    private _changeGuard = false;
    private _validCellTypes: string[];
    private _getter: (cell: Cell) => JSONValue;
    private _setter: (cell: Cell, value: JSONValue) => void;
  }

  /**
   * The namespace for `KeySelector` static data.
   */
  export
  namespace KeySelector {
    /**
     * The options used to initialize a keyselector.
     */
    export
    interface IOptions {
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

      /**
       * An optional value getter for the selector.
       *
       * @param cell - The currently active cell.
       *
       * @returns The appropriate value for the selector.
       */
      getter?: (cell: Cell) => JSONValue;

      /**
       * An optional value setter for the selector.
       *
       * @param cell - The currently active cell.
       *
       * @param value - The value of the selector.
       *
       * #### Notes
       * The setter should set the appropriate metadata value
       * given the value of the selector.
       */
      setter?: (cell: Cell, value: JSONValue) => void;
    }
  }

  /**
   * Create a slideshow selector.
   */
  export
  function createSlideShowSelector(): KeySelector {
    let options: KeySelector.IOptions = {
      key: 'slideshow',
      title: 'Slide Type',
      optionsMap: {
        '-': '-',
        'Slide': 'slide',
        'Sub-Slide': 'subslide',
        'Fragment': 'fragment',
        'Skip': 'skip',
        'Notes': 'notes'
      },
      getter: cell => {
        let value = cell.model.metadata.get('slideshow');
        return value && (value as JSONObject)['slide_type'];
      },
      setter: (cell, value) => {
        let data = cell.model.metadata.get('slideshow') || Object.create(null);
        data = { ...data, 'slide_type': value };
        cell.model.metadata.set('slideshow', data);
      }
    };
    return new KeySelector(options);
  }

  /**
   * Create an nbcovert selector.
   */
  export
  function createNBConvertSelector(): KeySelector {
    return new KeySelector({
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
    });
  }

}


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
    tool: CellTools.Tool;

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
  function createSelectorNode(options: CellTools.KeySelector.IOptions): HTMLElement {
    let name = options.key;
    let title = (
      options.title || name[0].toLocaleUpperCase() + name.slice(1)
    );
    let optionNodes: VirtualNode[] = [];
    for (let label in options.optionsMap) {
      let value = JSON.stringify(options.optionsMap[label]);
      optionNodes.push(h.option({ value }, label));
    }
    let node = VirtualDOM.realize(
      h.div({},
        h.label(title),
        h.select({}, optionNodes))
    );
    Styling.styleNode(node);
    return node;
  }
}
