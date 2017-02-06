// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  findIndex, upperBound
} from 'phosphor/lib/algorithm/searching';

import {
  ConflatableMessage, Message, sendMessage
} from 'phosphor/lib/core/messaging';

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
  ChildMessage, Widget
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
  MetadataCursor
} from '../common/metadata';

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
    let tool = options.tool;
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { tool, rank };
    let index = upperBound(this._items, rankItem, Private.itemCmp);

    tool.addClass(CHILD_CLASS);

    // Add the tool.
    this._items.insert(index, rankItem);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, tool);

    // Trigger the tool to update its active cell.
    sendMessage(tool, CellTools.ActiveCellMessage);
  }

  /**
   * Handle the removal of a child
   */
  protected onChildRemoved(msg: ChildMessage): void {
    let index = findIndex(this._items, item => item.tool === msg.child);
    if (index !== -1) {
      this._items.removeAt(index);
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
    each(this.children(), widget => {
      sendMessage(widget, CellTools.ActiveCellMessage);
    });
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    each(this.children(), widget => {
      sendMessage(widget, CellTools.SelectionMessage);
    });
  }

  /**
   * Handle a change in the metadata.
   */
  private _onMetadataChanged(sender: ICellModel, args: IChangedArgs<JSONValue>): void {
    let message = new MetadataCursor.ChangeMessage(args);
    each(this.children(), widget => {
      sendMessage(widget, message);
    });
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
  const ActiveCellMessage = new ConflatableMessage('activecell-changed');

  /**
   * A singleton conflatable `'selection-changed'` message.
   */
  export
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
      case 'metadata-changed':
        this.onMetadataChanged(msg as MetadataCursor.ChangeMessage);
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
     protected onMetadataChanged(msg: MetadataCursor.ChangeMessage): void { /* no-op */ }
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
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(): void {
      let activeCell = this.parent.activeCell;
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
  class MetadataEditor extends Tool {
    /**
     * Construct a new raw metadata tool.
     */
    constructor() {
      super();
      let layout = this.layout = new PanelLayout();
      layout.addWidget(this._editor);
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      let cell = this.parent.activeCell;
      this._editor.owner = cell ? cell.model : null;
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(msg: MetadataCursor.ChangeMessage) {
      sendMessage(this._editor, msg);
    }

    private _editor: MetadataCursor.Editor = new MetadataCursor.Editor();
  }

  /**
   * A cell tool that provides a selection for a given metadata key.
   */
  export
  class KeySelector extends Tool {
    /**
     * Construct a new KeySelector.
     */
    constructor(options: IKeySelectorOptions) {
      super({ node: Private.createSelectorNode(options) });
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
    protected onAfterAttach(msg: Message): void {
      let node = this.selectNode;
      node.addEventListener('change', this);
      node.addEventListener('focus', this);
      node.addEventListener('blur', this);
    }

    /**
     * Handle `before_detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      let node = this.selectNode;
      node.removeEventListener('change', this);
      node.removeEventListener('focus', this);
      node.removeEventListener('blur', this);
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
      let cursor = activeCell.model.getMetadata(this.key);
      select.value = JSON.stringify(cursor.getValue());
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(msg: MetadataCursor.ChangeMessage) {
      if (this._changeGuard) {
        return;
      }
      let select = this.selectNode;
      if (msg.args.name === this.key) {
        this._changeGuard = true;
        select.value = JSON.stringify(msg.args.newValue);
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
      let cursor = activeCell.model.getMetadata(this.key);
      cursor.setValue(JSON.parse(select.value));
      this._changeGuard = false;
    }

    private _changeGuard = false;
    private _validCellTypes: string[];
  }


  /**
   * The options used to initialize a keyselector.
   */
  export
  interface IKeySelectorOptions {
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
  function createSlideShowSelector(): KeySelector {
    let options = {
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
  function createSelectorNode(options: CellTools.IKeySelectorOptions): HTMLElement {
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
