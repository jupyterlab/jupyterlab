// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt, each, chain } from '@phosphor/algorithm';

import { JSONObject, JSONValue, Token } from '@phosphor/coreutils';

import { ConflatableMessage, Message, MessageLoop } from '@phosphor/messaging';

import { h, VirtualDOM, VirtualNode } from '@phosphor/virtualdom';

import { PanelLayout, Widget } from '@phosphor/widgets';

import { Styling } from '@jupyterlab/apputils';

import { Cell, ICellModel } from '@jupyterlab/cells';

import {
  CodeEditor,
  CodeEditorWrapper,
  JSONEditor
} from '@jupyterlab/codeeditor';

import { nbformat } from '@jupyterlab/coreutils';

import { IObservableMap, ObservableJSON } from '@jupyterlab/observables';

import { INotebookTracker } from './';
import { NotebookPanel } from './panel';
import { Collapse } from '@jupyterlab/apputils/src/collapse';

/* tslint:disable */
/**
 * The main menu token.
 */
export const INotebookTools = new Token<INotebookTools>(
  '@jupyterlab/notebook:INotebookTools'
);
/* tslint:enable */

/**
 * The interface for notebook metadata tools.
 */
export interface INotebookTools extends Widget {
  notebookPanel: NotebookPanel | null;
  activeCell: Cell | null;
  selectedCells: Cell[];
  addItem(options: NotebookTools.IAddOptions): void;
}

class RankedPanel<T extends Widget = Widget> extends Widget {
  constructor() {
    super();
    this.layout = new PanelLayout();
  }

  addWidget(widget: Widget, rank: number): void {
    const rankItem = { widget, rank };
    const index = ArrayExt.upperBound(this._items, rankItem, Private.itemCmp);
    ArrayExt.insert(this._items, index, rankItem);

    const layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
  }

  /**
   * Handle the removal of a child
   *
   */
  protected onChildRemoved(msg: Widget.ChildMessage): void {
    let index = ArrayExt.findFirstIndex(
      this._items,
      item => item.widget === msg.child
    );
    if (index !== -1) {
      ArrayExt.removeAt(this._items, index);
    }
  }

  private _items: Private.IRankItem<T>[] = [];
}

/**
 * A widget that provides cell metadata tools.
 */
export class NotebookTools extends Widget implements INotebookTools {
  /**
   * Construct a new NotebookTools object.
   */
  constructor(options: NotebookTools.IOptions) {
    super();
    this.addClass('jp-NotebookTools');

    this._cellTools = new RankedPanel<NotebookTools.Tool>();
    this._cellTools.title.label = 'Cell Tools';
    this._notebookTools = new RankedPanel<NotebookTools.Tool>();
    this._notebookTools.title.label = 'Notebook Tools';

    const layout = (this.layout = new PanelLayout());
    layout.addWidget(new Collapse({ widget: this._cellTools }));
    layout.addWidget(new Collapse({ widget: this._notebookTools }));

    this._tracker = options.tracker;
    this._tracker.currentChanged.connect(
      this._onNotebookPanelChanged,
      this
    );
    this._onNotebookPanelChanged();
  }

  /**
   * The active cell widget.
   */
  get activeCell(): Cell | null {
    const panel = this._tracker.currentWidget;
    if (!panel) {
      return null;
    }
    return panel.content.activeCell || null;
  }

  /**
   * The currently selected cells.
   */
  get selectedCells(): Cell[] {
    const panel = this._tracker.currentWidget;
    if (!panel) {
      return [];
    }
    const notebook = panel.content;
    return notebook.widgets.filter(cell => notebook.isSelectedOrActive(cell));
  }

  /**
   * The current notebook.
   */
  get notebookPanel(): NotebookPanel | null {
    return this._tracker.currentWidget;
  }

  /**
   * Add a cell tool item.
   */
  addItem(options: NotebookTools.IAddOptions): void {
    let tool = options.tool;
    let rank = 'rank' in options ? options.rank : 100;

    let section: RankedPanel<NotebookTools.Tool>;
    if (options.section === 'notebook') {
      section = this._notebookTools;
    } else if (options.section === 'cell') {
      section = this._cellTools;
    }

    tool.addClass('jp-NotebookTools-tool');
    section.addWidget(tool, rank);
    // TODO: perhaps the necessary notebookTools functionality should be
    // consolidated into a single object, rather than a broad reference to this.
    tool.notebookTools = this;

    // Trigger the tool to update its active cell.
    MessageLoop.sendMessage(tool, NotebookTools.ActiveCellMessage);
  }

  /**
   * Handle a change to the notebook panel.
   */
  private _onNotebookPanelChanged(): void {
    if (this._prevPanel && !this._prevPanel.isDisposed) {
      this._prevPanel.content.activeCellChanged.disconnect(
        this._onActiveCellChanged,
        this
      );
      this._prevPanel.content.selectionChanged.disconnect(
        this._onSelectionChanged,
        this
      );
    }
    const panel = this.notebookPanel;
    this._prevPanel = panel;
    if (panel) {
      panel.content.activeCellChanged.connect(
        this._onActiveCellChanged,
        this
      );
      panel.content.selectionChanged.connect(
        this._onSelectionChanged,
        this
      );
    }
    each(this._toolChildren(), widget => {
      MessageLoop.sendMessage(widget, NotebookTools.NotebookPanelMessage);
    });
    this._onActiveCellChanged();
    this._onSelectionChanged();
  }

  /**
   * Handle a change to the active cell.
   */
  private _onActiveCellChanged(): void {
    if (this._prevActive && !this._prevActive.isDisposed) {
      this._prevActive.metadata.changed.disconnect(
        this._onMetadataChanged,
        this
      );
    }
    let activeCell = this.activeCell ? this.activeCell.model : null;
    this._prevActive = activeCell;
    if (activeCell) {
      activeCell.metadata.changed.connect(
        this._onMetadataChanged,
        this
      );
    }
    each(this._toolChildren(), widget => {
      MessageLoop.sendMessage(widget, NotebookTools.ActiveCellMessage);
    });
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    each(this._toolChildren(), widget => {
      MessageLoop.sendMessage(widget, NotebookTools.SelectionMessage);
    });
  }

  /**
   * Handle a change in the metadata.
   */
  private _onMetadataChanged(
    sender: IObservableMap<JSONValue>,
    args: IObservableMap.IChangedArgs<JSONValue>
  ): void {
    let message = new ObservableJSON.ChangeMessage(
      'cell-metadata-changed',
      args
    );
    each(this._toolChildren(), widget => {
      MessageLoop.sendMessage(widget, message);
    });
  }

  private _toolChildren() {
    return chain(this._notebookTools.children(), this._cellTools.children());
  }

  private _cellTools: RankedPanel<NotebookTools.Tool>;
  private _notebookTools: RankedPanel<NotebookTools.Tool>;
  private _tracker: INotebookTracker;
  private _prevPanel: NotebookPanel | null;
  private _prevActive: ICellModel | null;
}

/**
 * The namespace for NotebookTools class statics.
 */
export namespace NotebookTools {
  /**
   * The options used to create a NotebookTools object.
   */
  export interface IOptions {
    /**
     * The notebook tracker used by the notebook tools.
     */
    tracker: INotebookTracker;
  }

  /**
   * The options used to add an item to the notebook tools.
   */
  export interface IAddOptions {
    /**
     * The tool to add to the notebook tools area.
     */
    tool: Tool;

    /**
     * The section to which the tool should be added.
     */
    section: 'notebook' | 'cell';

    /**
     * The rank order of the widget among its siblings.
     */
    rank?: number;
  }

  /**
   * A singleton conflatable `'notebookpanel-changed'` message.
   */
  export const NotebookPanelMessage = new ConflatableMessage(
    'notebookpanel-changed'
  );

  /**
   * A singleton conflatable `'activecell-changed'` message.
   */
  export const ActiveCellMessage = new ConflatableMessage('activecell-changed');

  /**
   * A singleton conflatable `'selection-changed'` message.
   */
  export const SelectionMessage = new ConflatableMessage('selection-changed');

  /**
   * The base notebook tool, meant to be subclassed.
   */
  export class Tool extends Widget {
    /**
     * The notebook tools object.
     */
    notebookTools: INotebookTools;

    dispose() {
      super.dispose();
      this.notebookTools = null;
    }

    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     */
    processMessage(msg: Message): void {
      super.processMessage(msg);
      switch (msg.type) {
        case 'notebookpanel-changed':
          this.onNotebookPanelChanged(msg);
          break;
        case 'activecell-changed':
          this.onActiveCellChanged(msg);
          break;
        case 'selection-changed':
          this.onSelectionChanged(msg);
          break;
        case 'cell-metadata-changed':
          this.onCellMetadataChanged(msg as ObservableJSON.ChangeMessage);
          break;
        default:
          break;
      }
    }

    /**
     * Handle a change to the notebook panel.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onNotebookPanelChanged(msg: Message): void {
      /* no-op */
    }

    /**
     * Handle a change to the active cell.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onActiveCellChanged(msg: Message): void {
      /* no-op */
    }

    /**
     * Handle a change to the selection.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onSelectionChanged(msg: Message): void {
      /* no-op */
    }

    /**
     * Handle a change to the metadata of the active cell.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onCellMetadataChanged(msg: ObservableJSON.ChangeMessage): void {
      /* no-op */
    }
  }

  /**
   * A cell tool displaying the active cell contents.
   */
  export class ActiveCellTool extends Tool {
    /**
     * Construct a new active cell tool.
     */
    constructor() {
      super();
      this.addClass('jp-ActiveCellTool');
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
      let activeCell = this.notebookTools.activeCell;
      let layout = this.layout as PanelLayout;
      let count = layout.widgets.length;
      for (let i = 0; i < count; i++) {
        layout.widgets[0].dispose();
      }
      if (this._cellModel && !this._cellModel.isDisposed) {
        this._cellModel.value.changed.disconnect(this._onValueChanged, this);
        this._cellModel.mimeTypeChanged.disconnect(
          this._onMimeTypeChanged,
          this
        );
      }
      if (!activeCell) {
        let cell = new Widget();
        cell.addClass('jp-InputArea-editor');
        cell.addClass('jp-InputArea-editor');
        layout.addWidget(cell);
        this._cellModel = null;
        return;
      }
      let promptNode = activeCell.promptNode
        ? (activeCell.promptNode.cloneNode(true) as HTMLElement)
        : null;
      let prompt = new Widget({ node: promptNode });
      let factory = activeCell.contentFactory.editorFactory;

      let cellModel = (this._cellModel = activeCell.model);
      cellModel.value.changed.connect(
        this._onValueChanged,
        this
      );
      cellModel.mimeTypeChanged.connect(
        this._onMimeTypeChanged,
        this
      );
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
  export class MetadataEditorTool extends Tool {
    /**
     * Construct a new raw metadata tool.
     */
    constructor(options: MetadataEditorTool.IOptions) {
      super();
      let editorFactory = options.editorFactory;
      this.addClass('jp-MetadataEditorTool');
      let layout = (this.layout = new PanelLayout());
      this.editor = new JSONEditor({
        editorFactory,
        title: options.label || 'Edit Metadata',
        collapsible: true
      });
      layout.addWidget(this.editor);
    }

    /**
     * The editor used by the tool.
     */
    readonly editor: JSONEditor;
  }

  /**
   * The namespace for `MetadataEditorTool` static data.
   */
  export namespace MetadataEditorTool {
    /**
     * The options used to initialize a metadata editor tool.
     */
    export interface IOptions {
      /**
       * The editor factory used by the tool.
       */
      editorFactory: CodeEditor.Factory;

      /**
       * The label for the JSON editor
       */
      label?: string;
    }
  }

  /**
   * A notebook metadata editor
   */
  export class NotebookMetadataEditorTool extends MetadataEditorTool {
    constructor(options: MetadataEditorTool.IOptions) {
      options.label = options.label || 'Edit Notebook Metadata';
      super(options);
    }

    /**
     * Handle a change of the notebook.
     */
    protected onNotebookPanelChanged(msg: Message): void {
      const nb =
        this.notebookTools.notebookPanel &&
        this.notebookTools.notebookPanel.content;
      this.editor.source = nb ? nb.model.metadata : null;
    }
    /**
     * Handle a change to the notebook metadata.
     */
    protected onNotebookMetadataChanged(msg: Message): void {
      const nb =
        this.notebookTools.notebookPanel &&
        this.notebookTools.notebookPanel.content;
      this.editor.source = nb ? nb.model.metadata : null;
    }
  }

  /**
   * A cell metadata editor
   */
  export class CellMetadataEditorTool extends MetadataEditorTool {
    constructor(options: MetadataEditorTool.IOptions) {
      options.label = options.label || 'Edit Cell Metadata';
      super(options);
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      let cell = this.notebookTools.activeCell;
      this.editor.source = cell ? cell.model.metadata : null;
    }
    /**
     * Handle a change to the active cell metadata.
     */
    protected onCellMetadataChanged(msg: Message): void {
      let cell = this.notebookTools.activeCell;
      this.editor.source = cell ? cell.model.metadata : null;
    }
  }

  /**
   * A cell tool that provides a selection for a given metadata key.
   */
  export class KeySelector extends Tool {
    /**
     * Construct a new KeySelector.
     */
    constructor(options: KeySelector.IOptions) {
      // TODO: use react
      super({ node: Private.createSelectorNode(options) });
      this.addClass('jp-KeySelector');
      this.key = options.key;
      this._default = options.default;
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
      let activeCell = this.notebookTools.activeCell;
      if (!activeCell) {
        select.disabled = true;
        select.value = '';
        return;
      }
      let cellType = activeCell.model.type;
      if (
        this._validCellTypes.length &&
        this._validCellTypes.indexOf(cellType) === -1
      ) {
        select.value = undefined;
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
    protected onCellMetadataChanged(msg: ObservableJSON.ChangeMessage) {
      if (this._changeGuard) {
        return;
      }
      let select = this.selectNode;
      let cell = this.notebookTools.activeCell;
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
      let activeCell = this.notebookTools.activeCell;
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
      let value = cell.model.metadata.get(this.key);
      if (value === undefined) {
        value = this._default;
      }
      return value;
    };

    /**
     * Set the value for the data.
     */
    private _setValue = (cell: Cell, value: JSONValue) => {
      if (value === this._default) {
        cell.model.metadata.delete(this.key);
      } else {
        cell.model.metadata.set(this.key, value);
      }
    };

    private _changeGuard = false;
    private _validCellTypes: string[];
    private _getter: (cell: Cell) => JSONValue;
    private _setter: (cell: Cell, value: JSONValue) => void;
    private _default: JSONValue;
  }

  /**
   * The namespace for `KeySelector` static data.
   */
  export namespace KeySelector {
    /**
     * The options used to initialize a keyselector.
     */
    export interface IOptions {
      /**
       * The metadata key of interest.
       */
      key: string;

      /**
       * The map of options to values.
       *
       * #### Notes
       * If a value equals the default, choosing it may erase the key from the
       * metadata.
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
       * The setter should set the appropriate metadata value given the value of
       * the selector.
       */
      setter?: (cell: Cell, value: JSONValue) => void;

      /**
       * Default value for default setters and getters if value is not found.
       */
      default?: JSONValue;
    }
  }

  /**
   * Create a slideshow selector.
   */
  export function createSlideShowSelector(): KeySelector {
    let options: KeySelector.IOptions = {
      key: 'slideshow',
      title: 'Slide Type',
      optionsMap: {
        '-': null,
        Slide: 'slide',
        'Sub-Slide': 'subslide',
        Fragment: 'fragment',
        Skip: 'skip',
        Notes: 'notes'
      },
      getter: cell => {
        let value = cell.model.metadata.get('slideshow');
        return value && (value as JSONObject)['slide_type'];
      },
      setter: (cell, value) => {
        let data = cell.model.metadata.get('slideshow') || Object.create(null);
        if (value === null) {
          // Make a shallow copy so we aren't modifying the original metadata.
          data = { ...data };
          delete data.slide_type;
        } else {
          data = { ...data, slide_type: value };
        }
        if (Object.keys(data).length > 0) {
          cell.model.metadata.set('slideshow', data);
        } else {
          cell.model.metadata.delete('slideshow');
        }
      }
    };
    return new KeySelector(options);
  }

  /**
   * Create a scrolled cell state selector.
   *
   * TODO: we don't support 'auto'? See
   * https://nbformat.readthedocs.io/en/latest/format_description.html#cell-metadata
   */
  export function createScrolledSelector(): KeySelector {
    return new KeySelector({
      key: 'scrolled',
      title: 'Output scrolled initially',
      optionsMap: {
        True: true,
        False: false
      },
      default: false,
      validCellTypes: ['code']
    });
  }

  /**
   * Create a editable cell state selector.
   */
  export function createEditableSelector(): KeySelector {
    return new KeySelector({
      key: 'editable',
      title: 'Editable initially',
      optionsMap: {
        True: true,
        False: false
      },
      default: true
    });
  }

  /**
   * Create an input initial collapse state selector.
   */
  export function createInputHiddenSelector(): KeySelector {
    return new KeySelector({
      key: 'jupyter',
      title: 'Input collapsed initially',
      optionsMap: {
        True: true,
        False: false
      },
      getter: cell => {
        let value = cell.model.metadata.get('jupyter');
        return (value && (value as JSONObject)['source_hidden']) || false;
      },
      setter: (cell, value) => {
        let data = cell.model.metadata.get('jupyter') || Object.create(null);
        if (value === false) {
          // Make a shallow copy so we aren't modifying the original metadata.
          data = { ...data };
          delete data.source_hidden;
        } else {
          data = { ...data, source_hidden: value };
        }
        if (Object.keys(data).length > 0) {
          cell.model.metadata.set('jupyter', data);
        } else {
          cell.model.metadata.delete('jupyter');
        }
      }
    });
  }

  /**
   * Create an output initial collapse state selector.
   */
  export function createOutputCollapsedSelector(): KeySelector {
    return new KeySelector({
      key: 'collapsed',
      title: 'Output collapsed initially',
      optionsMap: {
        True: true,
        False: false
      },
      getter: cell => {
        return cell.model.metadata.get('collapsed') || false;
      },
      setter: (cell, value) => {
        // Set the 'collapsed' key
        if (value === false) {
          cell.model.metadata.delete('collapsed');
        } else {
          cell.model.metadata.set('collapsed', value);
        }

        // We don't distinguish between the jupyter.outputs_hidden metadata, and
        // the collapsed metadata. Set the jupyter.outputs_hidden as well.
        let data = cell.model.metadata.get('jupyter') || Object.create(null);
        if (value === false) {
          // Make a shallow copy so we aren't modifying the original metadata.
          data = { ...data };
          delete data.outputs_hidden;
        } else {
          data = { ...data, outputs_hidden: value };
        }
        if (Object.keys(data).length > 0) {
          cell.model.metadata.set('jupyter', data);
        } else {
          cell.model.metadata.delete('jupyter');
        }
      },
      validCellTypes: ['code']
    });
  }

  /**
   * Create an nbcovert selector.
   */
  export function createNBConvertSelector(optionsMap: {
    [key: string]: JSONValue;
  }): KeySelector {
    return new KeySelector({
      key: 'raw_mimetype',
      title: 'Raw NBConvert Format',
      optionsMap: optionsMap,
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
  export interface IRankItem<T extends Widget = Widget> {
    /**
     * The widget for the item.
     */
    widget: T;

    /**
     * The sort rank of the menu.
     */
    rank: number;
  }

  /**
   * A comparator function for widget rank items.
   */
  export function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }

  /**
   * Create the node for a KeySelector.
   */
  export function createSelectorNode(
    options: NotebookTools.KeySelector.IOptions
  ): HTMLElement {
    let name = options.key;
    let title = options.title || name[0].toLocaleUpperCase() + name.slice(1);
    let optionNodes: VirtualNode[] = [];
    for (let label in options.optionsMap) {
      let value = JSON.stringify(options.optionsMap[label]);
      optionNodes.push(h.option({ value }, label));
    }
    let node = VirtualDOM.realize(
      h.div({}, h.label(title, h.select({}, optionNodes)))
    );
    Styling.styleNode(node);
    return node;
  }
}
