// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Cell,
  CodeCellModel,
  ICellModel,
  InputPrompt
} from '@jupyterlab/cells';
import { CodeEditor, JSONEditor } from '@jupyterlab/codeeditor';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { ObservableJSON } from '@jupyterlab/observables';
import { IMapChange, ISharedText } from '@jupyter/ydoc';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { Collapser } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { JSONObject, ReadonlyPartialJSONValue } from '@lumino/coreutils';
import { ConflatableMessage, Message, MessageLoop } from '@lumino/messaging';
import { Debouncer } from '@lumino/polling';
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
    this._advancedTools = new RankedPanel<NotebookTools.Tool>();
    this._advancedTools.id = 'advancedToolsSection';
    this._advancedTools.title.label = this._trans.__('Advanced Tools');

    this._extendedTools = [];

    const layout = (this.layout = new PanelLayout());
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
          if (w.widget.id === 'advancedToolsSection') {
            advancedToolsRank = i;
            break;
          }
        }
      }

      if (advancedToolsRank !== null)
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
    yield* this._advancedTools.children();
    for (let extendedTools of this._extendedTools) {
      yield* extendedTools.panel.children();
    }
  }

  translator: ITranslator;
  private _trans: TranslationBundle;
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
    section: 'advanced' | string;

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
    constructor(languages: IEditorLanguageRegistry) {
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
          await languages.highlight(
            this._cellModel.sharedModel.getSource().split('\n')[0],
            languages.findByMIME(this._cellModel.mimeType),
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

    protected _cellModel: ICellModel | null;
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
}
