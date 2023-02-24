// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Cell,
  CodeCellModel,
  ICellModel,
  InputPrompt
} from '@jupyterlab/cells';
import { CodeEditor, JSONEditor } from '@jupyterlab/codeeditor';
import { Mode } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { ObservableJSON } from '@jupyterlab/observables';
import { IMapChange, ISharedText } from '@jupyter/ydoc';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { Collapser, Styling } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import {
  JSONObject,
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { ConflatableMessage, Message, MessageLoop } from '@lumino/messaging';
import { Debouncer } from '@lumino/polling';
import { h, VirtualDOM, VirtualNode } from '@lumino/virtualdom';
import { PanelLayout, Widget } from '@lumino/widgets';
import { INotebookModel } from './model';
import { NotebookPanel } from './panel';
import { INotebookTools, INotebookTracker } from './tokens';

class RankedPanel<T extends Widget = Widget> extends Widget {
  constructor() {
    super();
    this.layout = new PanelLayout();
    this.addClass('jp-RankedPanel');
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
    const index = ArrayExt.findFirstIndex(
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
 * A widget that provides metadata tools.
 */
export class NotebookTools extends Widget implements INotebookTools {
  /**
   * Construct a new NotebookTools object.
   */
  constructor(options: NotebookTools.IOptions) {
    super();
    this.addClass('jp-NotebookTools');

    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._commonTools = new RankedPanel<NotebookTools.Tool>();
    this._commonTools.title.label = this._trans.__('Common Tools');
    this._advancedTools = new RankedPanel<NotebookTools.Tool>();
    this._advancedTools.id = 'advancedToolsSection';
    this._advancedTools.title.label = this._trans.__('Advanced Tools');

    this._extendedTools = [];

    const layout = (this.layout = new PanelLayout());
    layout.addWidget(new Collapser({ widget: this._commonTools }));
    layout.addWidget(new Collapser({ widget: this._advancedTools }));

    this._tracker = options.tracker;
    this._tracker.currentChanged.connect(
      this._onActiveNotebookPanelChanged,
      this
    );
    this._tracker.activeCellChanged.connect(this._onActiveCellChanged, this);
    this._tracker.selectionChanged.connect(this._onSelectionChanged, this);
    this._onActiveNotebookPanelChanged();
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
  get activeNotebookPanel(): NotebookPanel | null {
    return this._tracker.currentWidget;
  }

  /**
   * Add a cell tool item.
   */
  addItem(options: NotebookTools.IAddOptions): void {
    const tool = options.tool;
    const rank = options.rank ?? 100;

    let section: RankedPanel<NotebookTools.Tool>;
    if (options.section === 'advanced') {
      section = this._advancedTools;
    } else if (options.section == null || options.section === 'common') {
      section = this._commonTools;
    } else {
      const extendedTool = this._extendedTools.find(
        extendedTool => extendedTool.section === options.section
      );
      if (extendedTool) section = extendedTool.panel;
      else {
        throw new Error(`The section ${options.section} does not exist`);
      }
    }

    tool.addClass('jp-NotebookTools-tool');
    section.addWidget(tool, rank);
    // TODO: perhaps the necessary notebookTools functionality should be
    // consolidated into a single object, rather than a broad reference to this.
    tool.notebookTools = this;

    // Trigger the tool to update its active notebook and cell.
    MessageLoop.sendMessage(tool, NotebookTools.ActiveNotebookPanelMessage);
    MessageLoop.sendMessage(tool, NotebookTools.ActiveCellMessage);
  }

  /*
   * Add a section to the notebook tool with its widget
   */
  addSection(options: NotebookTools.IAddSectionOptions): void {
    const sectionName = options.sectionName;
    const label = options.label || options.sectionName;
    const widget = options.tool;
    let rank = options.rank ?? null;

    const newSection = new RankedPanel<NotebookTools.Tool>();
    newSection.title.label = label;

    if (widget) newSection.addWidget(widget, 0);

    this._extendedTools.push({
      section: sectionName,
      panel: newSection,
      rank: rank
    });

    if (rank != null)
      (this.layout as PanelLayout).insertWidget(
        rank,
        new Collapser({ widget: newSection })
      );
    else {
      // If no rank is provided, try to add the new section before the AdvancedTools.
      let advancedToolsRank = null;
      const layout = this.layout as PanelLayout;
      for (let i = 0; i < layout.widgets.length; i++) {
        let w = layout.widgets[i];
        if (w instanceof Collapser) {
          if (w.widget.id == 'advancedToolsSection') {
            advancedToolsRank = i;
            break;
          }
        }
      }

      if (advancedToolsRank != null)
        (this.layout as PanelLayout).insertWidget(
          advancedToolsRank,
          new Collapser({ widget: newSection })
        );
      else
        (this.layout as PanelLayout).addWidget(
          new Collapser({ widget: newSection })
        );
    }
  }

  /**
   * Handle a change to the notebook panel.
   */
  private _onActiveNotebookPanelChanged(): void {
    if (
      this._prevActiveNotebookModel &&
      !this._prevActiveNotebookModel.isDisposed
    ) {
      this._prevActiveNotebookModel.metadataChanged.disconnect(
        this._onActiveNotebookPanelMetadataChanged,
        this
      );
    }
    const activeNBModel =
      this.activeNotebookPanel && this.activeNotebookPanel.content
        ? this.activeNotebookPanel.content.model
        : null;
    this._prevActiveNotebookModel = activeNBModel;
    if (activeNBModel) {
      activeNBModel.metadataChanged.connect(
        this._onActiveNotebookPanelMetadataChanged,
        this
      );
    }
    for (const widget of this._toolChildren()) {
      MessageLoop.sendMessage(widget, NotebookTools.ActiveNotebookPanelMessage);
    }
  }

  /**
   * Handle a change to the active cell.
   */
  private _onActiveCellChanged(): void {
    if (this._prevActiveCell && !this._prevActiveCell.isDisposed) {
      this._prevActiveCell.metadataChanged.disconnect(
        this._onActiveCellMetadataChanged,
        this
      );
    }
    const activeCell = this.activeCell ? this.activeCell.model : null;
    this._prevActiveCell = activeCell;
    if (activeCell) {
      activeCell.metadataChanged.connect(
        this._onActiveCellMetadataChanged,
        this
      );
    }
    for (const widget of this._toolChildren()) {
      MessageLoop.sendMessage(widget, NotebookTools.ActiveCellMessage);
    }
  }

  /**
   * Handle a change in the selection.
   */
  private _onSelectionChanged(): void {
    for (const widget of this._toolChildren()) {
      MessageLoop.sendMessage(widget, NotebookTools.SelectionMessage);
    }
  }

  /**
   * Handle a change in the active cell metadata.
   */
  private _onActiveNotebookPanelMetadataChanged(
    sender: INotebookModel,
    args: IMapChange
  ): void {
    const message = new ObservableJSON.ChangeMessage(
      'activenotebookpanel-metadata-changed',
      { oldValue: undefined, newValue: undefined, ...args }
    );
    for (const widget of this._toolChildren()) {
      MessageLoop.sendMessage(widget, message);
    }
  }

  /**
   * Handle a change in the notebook model metadata.
   */
  private _onActiveCellMetadataChanged(
    sender: ICellModel,
    args: IMapChange
  ): void {
    const message = new ObservableJSON.ChangeMessage(
      'activecell-metadata-changed',
      { newValue: undefined, oldValue: undefined, ...args }
    );
    for (const widget of this._toolChildren()) {
      MessageLoop.sendMessage(widget, message);
    }
  }

  private *_toolChildren() {
    yield* this._commonTools.children();
    yield* this._advancedTools.children();
    for (let extendedTools of this._extendedTools) {
      yield* extendedTools.panel.children();
    }
  }

  translator: ITranslator;
  private _trans: TranslationBundle;
  private _commonTools: RankedPanel<NotebookTools.Tool>;
  private _advancedTools: RankedPanel<NotebookTools.Tool>;
  private _extendedTools: Array<NotebookTools.IExtendedToolsPanel>;
  private _tracker: INotebookTracker;
  private _prevActiveCell: ICellModel | null;
  private _prevActiveNotebookModel: INotebookModel | null;
}

/**
 * The namespace for NotebookTools class statics.
 */
export namespace NotebookTools {
  /**
   * A type alias for a readonly partial JSON tuples `[option, value]`.
   * `option` should be localized.
   *
   * Note: Partial here means that JSON object attributes can be `undefined`.
   */
  export type ReadonlyPartialJSONOptionValueArray = [
    ReadonlyPartialJSONValue | undefined,
    ReadonlyPartialJSONValue
  ][];

  /**
   * Interface for an extended panel section.
   */
  export interface IExtendedToolsPanel {
    /**
     * The name of the section.
     */
    section: string;

    /**
     * The associated panel, only one for a section.
     */
    panel: RankedPanel<NotebookTools.Tool>;

    /**
     * The rank of the section on the notebooktools panel.
     */
    rank?: number | null;
  }

  /**
   * The options used to create a NotebookTools object.
   */
  export interface IOptions {
    /**
     * The notebook tracker used by the notebook tools.
     */
    tracker: INotebookTracker;

    /**
     * Language translator.
     */
    translator?: ITranslator;
  }

  /**
   * The options used to add an item to the notebook tools.
   */
  export interface IAddOptions {
    /**
     * The tool to add to the notebook tools area.
     */
    tool: INotebookTools.ITool;

    /**
     * The section to which the tool should be added.
     */
    section?: 'common' | 'advanced' | string;

    /**
     * The rank order of the widget among its siblings.
     */
    rank?: number;
  }

  /**
   * The options used to add a section to the notebook tools.
   */
  export interface IAddSectionOptions {
    /**
     * The name of the new section.
     */
    sectionName: string;

    /**
     * The tool to add to the notebook tools area.
     */
    tool?: INotebookTools.ITool;

    /**
     * The label of the new section.
     */
    label?: string;

    /**
     * The rank order of the section among its siblings.
     */
    rank?: number;
  }

  /**
   * A singleton conflatable `'activenotebookpanel-changed'` message.
   */
  export const ActiveNotebookPanelMessage = new ConflatableMessage(
    'activenotebookpanel-changed'
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
  export class Tool extends Widget implements INotebookTools.ITool {
    /**
     * The notebook tools object.
     */
    notebookTools: INotebookTools;

    dispose(): void {
      super.dispose();
      if (this.notebookTools) {
        this.notebookTools = null!;
      }
    }

    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     */
    processMessage(msg: Message): void {
      super.processMessage(msg);
      switch (msg.type) {
        case 'activenotebookpanel-changed':
          this.onActiveNotebookPanelChanged(msg);
          break;
        case 'activecell-changed':
          this.onActiveCellChanged(msg);
          break;
        case 'selection-changed':
          this.onSelectionChanged(msg);
          break;
        case 'activecell-metadata-changed':
          this.onActiveCellMetadataChanged(msg as ObservableJSON.ChangeMessage);
          break;
        case 'activenotebookpanel-metadata-changed':
          this.onActiveNotebookPanelMetadataChanged(
            msg as ObservableJSON.ChangeMessage
          );
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
    protected onActiveNotebookPanelChanged(msg: Message): void {
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
    protected onActiveCellMetadataChanged(
      msg: ObservableJSON.ChangeMessage
    ): void {
      /* no-op */
    }

    /**
     * Handle a change to the metadata of the active cell.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onActiveNotebookPanelMetadataChanged(
      msg: ObservableJSON.ChangeMessage
    ): void {
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
      this.layout = new PanelLayout();

      this._inputPrompt = new InputPrompt();
      (this.layout as PanelLayout).addWidget(this._inputPrompt);

      // First code line container
      const node = document.createElement('div');
      node.classList.add('jp-ActiveCell-Content');
      const container = node.appendChild(document.createElement('div'));
      const editor = container.appendChild(document.createElement('pre'));
      container.className = 'jp-Cell-Content';
      this._editorEl = editor;
      (this.layout as PanelLayout).addWidget(new Widget({ node }));

      const update = async () => {
        this._editorEl.innerHTML = '';
        if (this._cellModel?.type === 'code') {
          this._inputPrompt.executionCount = `${
            (this._cellModel as CodeCellModel).executionCount ?? ''
          }`;
          this._inputPrompt.show();
        } else {
          this._inputPrompt.executionCount = null;
          this._inputPrompt.hide();
        }

        if (this._cellModel) {
          const spec = await Mode.ensure(
            Mode.findByMIME(this._cellModel.mimeType) ?? 'text/plain'
          );
          Mode.run(
            this._cellModel.sharedModel.getSource().split('\n')[0],
            spec,
            this._editorEl
          );
        }
      };

      this._refreshDebouncer = new Debouncer(update, 150);
    }

    /**
     * Handle a change to the active cell.
     */
    protected async onActiveCellChanged(): Promise<void> {
      const activeCell = this.notebookTools.activeCell;

      if (this._cellModel && !this._cellModel.isDisposed) {
        this._cellModel.sharedModel.changed.disconnect(this.refresh, this);
        this._cellModel.mimeTypeChanged.disconnect(this.refresh, this);
      }
      if (!activeCell) {
        this._cellModel = null;
        return;
      }
      const cellModel = (this._cellModel = activeCell.model);
      (cellModel.sharedModel as ISharedText).changed.connect(
        this.refresh,
        this
      );
      cellModel.mimeTypeChanged.connect(this.refresh, this);
      await this.refresh();
    }

    /**
     * Handle a change to the notebook panel.
     *
     * #### Notes
     * The default implementation is a no-op.
     */
    protected onActiveNotebookPanelChanged(msg: Message): void {
      if (!this.notebookTools.activeNotebookPanel) {
        // Force cleaning up the signal
        void this.onActiveCellChanged();
      }
    }

    protected async refresh(): Promise<void> {
      await this._refreshDebouncer.invoke();
    }

    private _cellModel: ICellModel | null;
    private _editorEl: HTMLPreElement;
    private _inputPrompt: InputPrompt;
    private _refreshDebouncer: Debouncer<void, void, null[]>;
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
      const { editorFactory } = options;
      this.addClass('jp-MetadataEditorTool');
      const layout = (this.layout = new PanelLayout());

      this._editorFactory = editorFactory;
      this._editorLabel = options.label || 'Edit Metadata';
      this.createEditor();
      const titleNode = new Widget({ node: document.createElement('label') });
      titleNode.node.textContent = options.label || 'Edit Metadata';
      layout.addWidget(titleNode);
      layout.addWidget(this.editor);
    }

    /**
     * The editor used by the tool.
     */
    get editor(): JSONEditor {
      return this._editor;
    }

    /**
     * Handle a change to the notebook.
     */
    protected onActiveNotebookPanelChanged(msg: Message): void {
      this.editor.dispose();
      if (this.notebookTools.activeNotebookPanel) {
        this.createEditor();
      }
    }

    protected createEditor() {
      this._editor = new JSONEditor({
        editorFactory: this._editorFactory
      });
      this.editor.title.label = this._editorLabel;

      (this.layout as PanelLayout).addWidget(this.editor);
    }

    private _editor: JSONEditor;
    private _editorLabel: string;
    private _editorFactory: CodeEditor.Factory;
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

      /**
       * Initial collapse state, defaults to true.
       */
      collapsed?: boolean;

      /**
       * Language translator.
       */
      translator?: ITranslator;
    }
  }

  /**
   * A notebook metadata editor
   */
  export class NotebookMetadataEditorTool extends MetadataEditorTool {
    constructor(options: MetadataEditorTool.IOptions) {
      const translator = options.translator || nullTranslator;
      const trans = translator.load('jupyterlab');
      options.label = options.label || trans.__('Notebook Metadata');
      super(options);
    }

    /**
     * Handle a change to the notebook.
     */
    protected onActiveNotebookPanelChanged(msg: Message): void {
      super.onActiveNotebookPanelChanged(msg);
      if (this.notebookTools.activeNotebookPanel) {
        this._update();
      }
    }

    /**
     * Handle a change to the notebook metadata.
     */
    protected onActiveNotebookPanelMetadataChanged(msg: Message): void {
      this._update();
    }

    private _onSourceChanged() {
      if (this.editor.source) {
        this.notebookTools.activeNotebookPanel?.content.model?.sharedModel.setMetadata(
          this.editor.source.toJSON()
        );
      }
    }

    private _update() {
      if (this.editor.source) {
        this.editor.source.changed.disconnect(this._onSourceChanged, this);
      }
      const nb = this.notebookTools.activeNotebookPanel?.content;
      this.editor.source?.dispose();
      this.editor.source = nb?.model?.metadata
        ? new ObservableJSON({ values: nb.model.metadata as JSONObject })
        : null;

      if (this.editor.source) {
        this.editor.source.changed.connect(this._onSourceChanged, this);
      }
    }
  }

  /**
   * A cell metadata editor
   */
  export class CellMetadataEditorTool extends MetadataEditorTool {
    constructor(options: MetadataEditorTool.IOptions) {
      const translator = options.translator || nullTranslator;
      const trans = translator.load('jupyterlab');
      options.label = options.label || trans.__('Cell Metadata');
      super(options);
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      this.editor.dispose();
      if (this.notebookTools.activeCell) {
        this.createEditor();
        this._update();
      }
    }

    /**
     * Handle a change to the active cell metadata.
     */
    protected onActiveCellMetadataChanged(msg: Message): void {
      this._update();
    }

    private _onSourceChanged() {
      if (this.editor.source) {
        this.notebookTools.activeCell?.model?.sharedModel.setMetadata(
          this.editor.source.toJSON()
        );
      }
    }

    private _update() {
      if (this.editor.source) {
        this.editor.source.changed.disconnect(this._onSourceChanged, this);
      }
      const cell = this.notebookTools.activeCell;
      this.editor.source?.dispose();
      this.editor.source = cell
        ? new ObservableJSON({ values: cell.model.metadata as JSONObject })
        : null;
      if (this.editor.source) {
        this.editor.source.changed.connect(this._onSourceChanged, this);
      }
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
      const node = this.selectNode;
      node.addEventListener('change', this);
    }

    /**
     * Handle `before-detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      const node = this.selectNode;
      node.removeEventListener('change', this);
    }

    /**
     * Handle a change to the active cell.
     */
    protected onActiveCellChanged(msg: Message): void {
      const select = this.selectNode;
      const activeCell = this.notebookTools.activeCell;
      if (!activeCell) {
        select.disabled = true;
        select.value = '';
        return;
      }
      const cellType = activeCell.model.type;
      if (
        this._validCellTypes.length &&
        this._validCellTypes.indexOf(cellType) === -1
      ) {
        select.value = '';
        select.disabled = true;
        return;
      }
      select.disabled = false;
      this._changeGuard = true;
      const getter = this._getter;
      select.value = JSON.stringify(getter(activeCell));
      this._changeGuard = false;
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onActiveCellMetadataChanged(
      msg: ObservableJSON.ChangeMessage
    ): void {
      if (this._changeGuard) {
        return;
      }
      const select = this.selectNode;
      const cell = this.notebookTools.activeCell;
      if (msg.args.key === this.key && cell) {
        this._changeGuard = true;
        const getter = this._getter;
        select.value = JSON.stringify(getter(cell));
        this._changeGuard = false;
      }
    }

    /**
     * Handle a change to the value.
     */
    protected onValueChanged(): void {
      const activeCell = this.notebookTools.activeCell;
      if (!activeCell || this._changeGuard) {
        return;
      }
      this._changeGuard = true;
      const select = this.selectNode;
      const setter = this._setter;
      setter(activeCell, JSON.parse(select.value));
      this._changeGuard = false;
    }

    /**
     * Get the value for the data.
     */
    private _getValue = (cell: Cell) => {
      let value = cell.model.getMetadata(this.key);
      if (value === undefined) {
        value = this._default;
      }
      return value;
    };

    /**
     * Set the value for the data.
     */
    private _setValue = (
      cell: Cell,
      value: ReadonlyPartialJSONValue | undefined
    ) => {
      if (value === this._default) {
        cell.model.deleteMetadata(this.key);
      } else {
        cell.model.setMetadata(this.key, value);
      }
    };

    private _changeGuard = false;
    private _validCellTypes: string[];
    private _getter: (cell: Cell) => ReadonlyPartialJSONValue | undefined;
    private _setter: (
      cell: Cell,
      value: ReadonlyPartialJSONValue | undefined
    ) => void;
    private _default: ReadonlyPartialJSONValue | undefined;
  }

  /**
   * A notebook metadata number editor
   */
  export class NotebookMetadataNumberTool extends Tool {
    constructor(options: { key: string; label: string }) {
      super({
        node: Private.createInputNode({
          label: options.label,
          value: '1'
        })
      });
      this.addClass('jp-NumberSetter');
      this._key = options.key;
    }

    /**
     * The select node for the widget.
     */
    get inputNode(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
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
        case 'input':
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
      const node = this.inputNode;
      node.addEventListener('change', this);
      node.addEventListener('input', this);
    }

    /**
     * Handle `before-detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      const node = this.inputNode;
      node.removeEventListener('change', this);
      node.removeEventListener('input', this);
    }

    /**
     * Handle a change to the notebook.
     */
    protected onActiveNotebookPanelChanged(msg: Message): void {
      this._update();
    }

    /**
     * Handle a change to the notebook metadata.
     */
    protected onActiveNotebookPanelMetadataChanged(msg: Message): void {
      this._update();
    }

    /**
     * Handle a change to the value.
     */
    protected onValueChanged(): void {
      const nb =
        this.notebookTools.activeNotebookPanel &&
        this.notebookTools.activeNotebookPanel.content;
      const metadata = nb?.model?.metadata ?? null;
      if (metadata) {
        const keyPath = this._key.split('/');
        const value = { ...((metadata[keyPath[0]] ?? {}) as any) };
        let lastObj = value;
        for (let p = 1; p < keyPath.length - 1; p++) {
          if (lastObj[keyPath[p]] === undefined) {
            lastObj[keyPath[p]] = {};
          }
          lastObj = lastObj[keyPath[p]];
        }
        lastObj[keyPath[keyPath.length - 1]] =
          this.inputNode.valueAsNumber ?? 1;

        nb!.model!.setMetadata(keyPath[0], value);
      }
    }

    private _update() {
      const nb =
        this.notebookTools.activeNotebookPanel &&
        this.notebookTools.activeNotebookPanel.content;
      const metadata = nb?.model?.metadata ?? null;
      if (metadata) {
        const keyPath = this._key.split('/');
        let value = metadata[keyPath[0]] as any;
        for (let p = 1; p < keyPath.length; p++) {
          value = (value ?? {})[keyPath[p]];
        }

        if (value !== undefined) {
          this.inputNode.valueAsNumber = value;
        } else {
          this.inputNode.valueAsNumber = 1;
        }
      }
    }

    /**
     * Metadata key to set
     */
    private _key: string;
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
       * The map of values to options.
       *
       * Value corresponds to the unique identifier.
       * Option corresponds to the localizable value to display.
       *
       * See: `<option value="volvo">Volvo</option>`
       *
       * #### Notes
       * If a value equals the default, choosing it may erase the key from the
       * metadata.
       */
      optionValueArray: ReadonlyPartialJSONOptionValueArray;

      /**
       * The optional title of the selector - defaults to capitalized `key`.
       */
      title: string;

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
      getter?: (cell: Cell) => ReadonlyPartialJSONValue | undefined;

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
      setter?: (
        cell: Cell,
        value: ReadonlyPartialJSONValue | undefined
      ) => void;

      /**
       * Default value for default setters and getters if value is not found.
       */
      default?: ReadonlyPartialJSONValue;
    }
  }

  /**
   * Create a slideshow selector.
   */
  export function createSlideShowSelector(
    translator?: ITranslator
  ): KeySelector {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    trans.__('');
    const options: KeySelector.IOptions = {
      key: 'slideshow',
      title: trans.__('Slide Type'),
      optionValueArray: [
        ['-', null],
        [trans.__('Slide'), 'slide'],
        [trans.__('Sub-Slide'), 'subslide'],
        [trans.__('Fragment'), 'fragment'],
        [trans.__('Skip'), 'skip'],
        [trans.__('Notes'), 'notes']
      ],
      getter: cell => {
        const value = cell.model.getMetadata('slideshow') as
          | ReadonlyPartialJSONObject
          | undefined;
        return value && value['slide_type'];
      },
      setter: (cell, value) => {
        let data = cell.model.getMetadata('slideshow') || Object.create(null);
        if (value === null) {
          // Make a shallow copy so we aren't modifying the original metadata.
          data = { ...data };
          delete data.slide_type;
        } else {
          data = { ...data, slide_type: value };
        }
        if (Object.keys(data).length > 0) {
          cell.model.setMetadata('slideshow', data);
        } else {
          cell.model.deleteMetadata('slideshow');
        }
      }
    };
    return new KeySelector(options);
  }

  /**
   * Create an nbconvert selector.
   */
  export function createNBConvertSelector(
    optionValueArray: ReadonlyPartialJSONOptionValueArray,
    translator?: ITranslator
  ): KeySelector {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    return new KeySelector({
      key: 'raw_mimetype',
      title: trans.__('Raw NBConvert Format'),
      optionValueArray: optionValueArray,
      validCellTypes: ['raw']
    });
  }

  /**
   * Create read-only toggle.
   */
  export function createEditableToggle(translator?: ITranslator): KeySelector {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    return new KeySelector({
      key: 'editable',
      title: trans.__('Editable'),
      optionValueArray: [
        [trans.__('Editable'), true],
        [trans.__('Read-Only'), false]
      ],
      default: true
    });
  }

  /**
   * Create base table of content numbering
   */
  export function createToCBaseNumbering(translator?: ITranslator): Tool {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    return new NotebookMetadataNumberTool({
      key: 'toc/base_numbering',
      label: trans.__('Table of content - Base number')
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
    const name = options.key;
    const title = options.title || name[0].toLocaleUpperCase() + name.slice(1);
    const optionNodes: VirtualNode[] = [];
    let value: any;
    let option: any;
    for (const item of options.optionValueArray) {
      option = item[0];
      value = JSON.stringify(item[1]);
      const attrs =
        options.default == item[1]
          ? { value, selected: 'selected' }
          : { value };
      optionNodes.push(h.option(attrs, option));
    }
    const node = VirtualDOM.realize(
      h.div({}, h.label(title, h.select({}, optionNodes)))
    );
    Styling.styleNode(node);
    return node;
  }

  /**
   * Create the node for a number input.
   */
  export function createInputNode(options: {
    label: string;
    value: string;
  }): HTMLElement {
    const title = options.label;
    const node = VirtualDOM.realize(
      h.div(
        {},
        h.label(title, h.input({ value: options.value, type: 'number' }))
      )
    );
    Styling.styleNode(node);
    return node;
  }
}
