// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, ICellModel } from '@jupyterlab/cells';
import { CodeEditor, JSONEditor } from '@jupyterlab/codeeditor';
import { ObservableJSON } from '@jupyterlab/observables';
import { IMapChange } from '@jupyter/ydoc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Collapser } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { ReadonlyPartialJSONValue } from '@lumino/coreutils';
import { ConflatableMessage, Message, MessageLoop } from '@lumino/messaging';
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

    this._tools = [];

    this.layout = new PanelLayout();

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
    const extendedTool = this._tools.find(
      extendedTool => extendedTool.section === options.section
    );
    if (extendedTool) section = extendedTool.panel;
    else {
      throw new Error(`The section ${options.section} does not exist`);
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

    this._tools.push({
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
    for (let tool of this._tools) {
      yield* tool.panel.children();
    }
  }

  translator: ITranslator;
  private _tools: Array<NotebookTools.IToolPanel>;
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
  export interface IToolPanel {
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
    section: string;

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
