// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  CodeMirrorSearchHighlighter
} from '@jupyterlab/codemirror';
import {
  IBaseSearchProvider,
  IFiltersType,
  ISearchMatch,
  ISearchProviderRegistry,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { IObservableString } from '@jupyterlab/observables';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
import {
  HIGHLIGHT_CLASS_NAME,
  IOutputModel,
  IRenderMimeRegistry,
  MarkdownSearchEngine
} from '@jupyterlab/rendermime';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';

import { CodeCellModel, ICellModel } from './model';
import { Cell, CodeCell, MarkdownCell } from './widget';

/**
 * Class applied on highlighted search matches
 */
export const SELECTED_HIGHLIGHT_CLASS = 'jp-mod-selected';

/**
 * Search provider for cells.
 */
export class CellSearchProvider implements IDisposable, IBaseSearchProvider {
  /**
   * Constructor
   *
   * @param cell Cell widget
   */
  constructor(protected cell: Cell<ICellModel>) {
    this.currentIndex = null;
    this._changed = new Signal<IBaseSearchProvider, void>(this);
    this.cmHandler = new CodeMirrorSearchHighlighter(
      this.cell.editor as CodeMirrorEditor
    );
  }

  /**
   * Changed signal to be emitted when search matches change.
   */
  get changed(): Signal<IBaseSearchProvider, void> {
    return this._changed;
  }

  /**
   * Current match index
   */
  get currentMatchIndex(): number | null {
    return this.isActive ? this.currentIndex : null;
  }

  /**
   * Whether the cell search is active.
   *
   * This is used when applying search only on selected cells.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Whether the search provider is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Number of matches in the cell.
   */
  get matchesSize(): number {
    return this.isActive ? this.cmHandler.matches.length : 0;
  }

  /**
   * Clear currently highlighted match
   */
  clearSelection(): void {
    this.currentIndex = null;
    this.cmHandler.clearSelection();
  }

  /**
   * Dispose the search provider
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    if (this.isActive) {
      this.endQuery();
    }
  }

  /**
   * Set `isActive` status.
   *
   * #### Notes
   * It will start or end the search
   *
   * @param v New value
   */
  async setIsActive(v: boolean): Promise<void> {
    if (this._isActive !== v) {
      this._isActive = v;
    }
    if (this._isActive) {
      if (this.query !== null) {
        await this.startQuery(this.query, this.filters);
      }
    } else {
      await this.endQuery();
    }
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(
    query: RegExp | null,
    filters?: IFiltersType
  ): Promise<void> {
    this.query = query;
    this.filters = filters;

    // Search input
    const content = this.cell.model.modelDB.get('value') as IObservableString;
    await this._updateCodeMirror(content);
    content.changed.connect(this.onInputChanged, this);
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    await this.cmHandler.endQuery();
    this.currentIndex = null;
  }

  /**
   * Highlight the next match.
   *
   * @returns The next match if there is one.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      if (this._lastReplacementPosition) {
        this.cell.editor.setCursorPosition(this._lastReplacementPosition);
        this._lastReplacementPosition = null;
      }

      // This starts from the cursor position
      let match = await this.cmHandler.highlightNext();
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.currentIndex = null;
      }
      return match;
    }

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      // This starts from the cursor position
      let match = await this.cmHandler.highlightPrevious();
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.currentIndex = null;
      }
      return match;
    }

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Replace the currently selected match with the provided text.
   *
   * If no match is selected, it won't do anything.
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceCurrentMatch(newText: string): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    let occurred = false;

    if (
      this.currentIndex !== null &&
      this.currentIndex < this.cmHandler.matches.length
    ) {
      const editor = this.cell.editor as CodeMirrorEditor;
      const selection = editor.doc.getSelection();
      const match = this.getCurrentMatch();
      // If cursor is not on a selection, highlight the next match
      if (selection !== match?.text) {
        this.currentIndex = null;
        // The next will be highlighted as a consequence of this returning false
      } else {
        this.cmHandler.matches.splice(this.currentIndex, 1);
        this.currentIndex = null;
        // Store the current position to highlight properly the next search hit
        this._lastReplacementPosition = editor.getCursorPosition();
        this.cell.model.value.text =
          this.cell.model.value.text.slice(0, match!.position) +
          newText +
          this.cell.model.value.text.slice(
            match!.position + match!.text.length
          );
        occurred = true;
      }
    }

    return Promise.resolve(occurred);
  }

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceAllMatches(newText: string): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    let occurred = this.cmHandler.matches.length > 0;
    let src = this.cell.model.value.text;
    let lastEnd = 0;
    const finalSrc = this.cmHandler.matches.reduce((agg, match) => {
      const start = match.position as number;
      const end = start + match.text.length;
      const newStep = `${agg}${src.slice(lastEnd, start)}${newText}`;
      lastEnd = end;
      return newStep;
    }, '');

    if (occurred) {
      this.cmHandler.matches = [];
      this.currentIndex = null;
      this.cell.model.value.text = `${finalSrc}${src.slice(lastEnd)}`;
    }
    return Promise.resolve(occurred);
  }

  /**
   * Get the current match if it exists.
   *
   * @returns The current match
   */
  protected getCurrentMatch(): ISearchMatch | undefined {
    if (this.currentIndex === null) {
      return undefined;
    } else {
      let match: ISearchMatch | undefined = undefined;
      if (this.currentIndex < this.cmHandler.matches.length) {
        match = this.cmHandler.matches[this.currentIndex];
      }
      return match;
    }
  }

  /**
   * Callback on source change
   *
   * @param content Cell source
   * @param changes Source change
   */
  protected async onInputChanged(
    content: IObservableString,
    changes?: IObservableString.IChangedArgs
  ): Promise<void> {
    await this._updateCodeMirror(content);
    this._changed.emit();
  }

  private async _updateCodeMirror(content: IObservableString) {
    if (this.query !== null) {
      if (this.isActive) {
        this.cmHandler.matches = await TextSearchEngine.search(
          this.query,
          content.text
        );
      } else {
        this.cmHandler.matches = [];
      }
    }
  }

  /**
   * CodeMirror search highlighter
   */
  protected cmHandler: CodeMirrorSearchHighlighter;
  /**
   * Current match index
   */
  protected currentIndex: number | null = null;
  /**
   * Current search filters
   */
  protected filters: IFiltersType | undefined;
  /**
   * Current search query
   */
  protected query: RegExp | null = null;
  private _changed: Signal<IBaseSearchProvider, void>;
  private _isActive = true;
  private _isDisposed = false;
  private _lastReplacementPosition: CodeEditor.IPosition | null = null;
}

/**
 * Code cell search provider
 */
class CodeCellSearchProvider extends CellSearchProvider {
  /**
   * Constructor
   *
   * @param cell Cell widget
   * @param rendermime Notebook rendermime registry
   * @param searchRegistry Application search provider registry
   */
  constructor(
    cell: Cell<ICellModel>,
    protected rendermime?: IRenderMimeRegistry,
    protected searchRegistry?: ISearchProviderRegistry
  ) {
    super(cell);
  }

  /**
   * Number of matches in the cell.
   */
  get matchesSize(): number {
    if (!this.isActive) {
      return 0;
    }

    let outputsSize = 0;
    const outputs = (this.cell.model as CodeCellModel).outputs;
    for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
      const output = outputs.get(outputIdx);
      outputsSize += output.highlights?.length ?? 0;
    }

    return super.matchesSize + outputsSize;
  }

  /**
   * Clear currently highlighted match.
   */
  clearSelection(): void {
    super.clearSelection();
    this._updateHighlightedOutput();
  }

  /**
   * Highlight the next match.
   *
   * @returns The next match if there is one.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      if (
        this.currentIndex !== null &&
        this.currentIndex >= this.cmHandler.matches.length
      ) {
        this.currentIndex! += 1;
      } else {
        const match = await super.highlightNext();
        if (!match) {
          this.currentIndex = this.cmHandler.matches.length;
        }
      }

      if (this.currentIndex !== null && this.currentIndex >= this.matchesSize) {
        this.currentIndex = null;
      }
    }

    this._updateHighlightedOutput();

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      if (this.currentIndex === null) {
        this.currentIndex = this.matchesSize - 1;
      } else {
        this.currentIndex -= 1;
      }

      if (this.currentIndex < this.cmHandler.matches.length) {
        const match = await super.highlightPrevious();
        if (!match) {
          this.currentIndex = null;
        }
      }

      if (this.currentIndex !== null && this.currentIndex < 0) {
        this.currentIndex = null;
      }
    }

    this._updateHighlightedOutput();

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Initialize the search using the provided options. Should update the UI to highlight
   * all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(
    query: RegExp | null,
    filters?: IFiltersType
  ): Promise<void> {
    await super.startQuery(query, filters);

    // Search outputs
    const outputs = (this.cell.model as CodeCellModel).outputs;
    await this._onOutputChanged(outputs);
    outputs.changed.connect(this._onOutputsChanged, this);
    outputs.stateChanged.connect(this._onOutputChanged, this);
  }

  async endQuery(): Promise<void> {
    await super.endQuery();
    const outputs = (this.cell.model as CodeCellModel).outputs;
    for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
      const output = outputs.get(outputIdx);
      if ((output.highlights?.length ?? 0) > 0) {
        output.highlights = [];
      }
    }
  }

  /**
   * Get the current match if it exists.
   *
   * @returns The current match
   */
  protected getCurrentMatch(): ISearchMatch | undefined {
    let match = super.getCurrentMatch();
    if (!match && this.currentMatchIndex !== null) {
      let index = this.currentMatchIndex - this.cmHandler.matches.length;
      const outputs = (this.cell.model as CodeCellModel).outputs;
      for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
        const output = outputs.get(outputIdx);
        if (index < (output.highlights?.length ?? 0)) {
          match = {
            ...output.highlights![index]
          };
          break;
        } else {
          index -= output.highlights?.length ?? 0;
        }
      }
    }
    return match;
  }

  private async _onOutputsChanged(
    output: IOutputAreaModel,
    changes: IOutputAreaModel.ChangedArgs
  ): Promise<void> {
    switch (changes.type) {
      case 'add':
      case 'set':
        await Promise.all(
          changes.newValues.map(output => this._updateOutput(output))
        );
        break;
      case 'move':
      case 'remove':
        // Nothing to do
        break;
    }

    this.changed.emit();
  }

  private async _onOutputChanged(
    output: IOutputAreaModel,
    changes?: [number, string]
  ): Promise<void> {
    if (!this.isActive) {
      return Promise.resolve();
    }

    const model = this.cell.model as CodeCellModel;

    if (changes) {
      const [index, type] = changes;
      if (type === 'data') {
        await this._updateOutput(model.outputs.get(index));
      }
    } else {
      if (this.query && this.filters?.output !== false) {
        const outputs = model.outputs;
        const searchOutputs = new Array<Promise<void>>();
        for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
          const output = outputs.get(outputIdx);
          searchOutputs.push(this._updateOutput(output));
        }

        await Promise.all(searchOutputs);
      }
    }

    this.changed.emit();
  }

  private _updateHighlightedOutput() {
    // Clear any output selection
    const outputArea = (this.cell as CodeCell).outputArea;
    const oldHit = outputArea.node.querySelector(
      `span.${HIGHLIGHT_CLASS_NAME}.${SELECTED_HIGHLIGHT_CLASS}`
    );
    if (oldHit) {
      oldHit.classList.remove(SELECTED_HIGHLIGHT_CLASS);
    }

    const outputIndex =
      this.currentMatchIndex !== null
        ? this.currentMatchIndex - this.cmHandler.matches.length
        : -1;
    if (outputIndex >= 0) {
      const newHit = outputArea.node.querySelectorAll(
        `span.${HIGHLIGHT_CLASS_NAME}`
      )[outputIndex];
      newHit.classList.add(SELECTED_HIGHLIGHT_CLASS);
    }
  }

  private async _updateOutput(output: IOutputModel): Promise<void> {
    if (
      !this.query ||
      this.filters?.output === false ||
      !this.rendermime ||
      !this.searchRegistry
    ) {
      return Promise.resolve();
    }

    // Search for the display mimetype as in packages/outputarea/src/widget.ts
    const mimeType = this.rendermime.preferredMimeType(
      output.data,
      output.trusted ? 'any' : 'ensure'
    );
    if (mimeType) {
      const searchEngine = this.searchRegistry.getMimeTypeSearchEngine(
        mimeType
      );
      if (searchEngine && output.highlights) {
        const hits = await searchEngine.search(
          this.query!,
          output.data[mimeType]
        );
        output.highlights = hits;

        if (this.currentIndex !== null) {
          this.currentIndex = null;
        }
      }
    }

    return Promise.resolve();
  }
}

/**
 * Markdown cell search provider
 */
class MarkdownCellSearchProvider extends CellSearchProvider {
  /**
   * Number of matches in the cell.
   */
  get matchesSize(): number {
    const cell = this.cell as MarkdownCell;
    return this.isActive
      ? cell.rendered
        ? cell.highlights.length
        : super.matchesSize
      : 0;
  }

  /**
   * Clear currently highlighted match
   */
  clearSelection(): void {
    super.clearSelection();
    this.updateRenderedSelection();
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    await super.endQuery();
    (this.cell as MarkdownCell).highlights = [];
  }

  /**
   * Highlight the next match.
   *
   * @returns The next match if there is one.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    let match: ISearchMatch | undefined = undefined;
    if (!this.isActive) {
      return match;
    }

    const cell = this.cell as MarkdownCell;
    if (cell.rendered) {
      this.currentIndex =
        this.currentIndex === null ? 0 : this.currentIndex + 1;
      if (this.currentIndex >= cell.highlights.length) {
        this.currentIndex = null;
      } else {
        match = cell.highlights[this.currentIndex] as ISearchMatch;
      }
    } else {
      match = await super.highlightNext();
    }

    this.updateRenderedSelection();

    return match;
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    let match: ISearchMatch | undefined = undefined;
    const cell = this.cell as MarkdownCell;
    if (cell.rendered) {
      this.currentIndex =
        this.currentIndex === null
          ? cell.highlights.length - 1
          : this.currentIndex - 1;
      if (this.currentIndex < 0) {
        this.currentIndex = null;
      } else {
        match = cell.highlights[this.currentIndex] as ISearchMatch;
      }
    } else {
      match = await super.highlightPrevious();
    }

    this.updateRenderedSelection();

    return match;
  }

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    const occurred = await super.replaceAllMatches(newText);

    if (occurred) {
      (this.cell as MarkdownCell).highlights = [];
    }
    return occurred;
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(
    query: RegExp | null,
    filters?: IFiltersType
  ): Promise<void> {
    await super.startQuery(query, filters);
    await this.onInputChanged(this.cell.model.value);
    (this.cell as MarkdownCell).renderedChanged.connect(
      this.onRenderedChanged,
      this
    );
  }

  /**
   * Callback on source change
   *
   * @param content Cell source
   * @param changes Source change
   */
  protected async onInputChanged(
    content: IObservableString,
    changes?: IObservableString.IChangedArgs
  ): Promise<void> {
    await super.onInputChanged(content, changes);
    if (this.query !== null && this.isActive) {
      (this
        .cell as MarkdownCell).highlights = await MarkdownSearchEngine.search(
        this.query,
        content.text
      );
    }
  }

  /**
   * Callback on rendered state change
   *
   * @param cell Cell that emitted the change
   * @param rendered New rendered value
   */
  protected onRenderedChanged(cell: MarkdownCell, rendered: boolean): void {
    this.currentIndex = null;
    this.onInputChanged(this.cell.model.value).catch(reason => {
      console.error(
        `Fail to update markdown cell search highlight on rendered change:\n${reason}`
      );
    });
  }

  private updateRenderedSelection() {
    const cell = this.cell as MarkdownCell;
    const cellRenderer = cell.renderer;

    if (cellRenderer) {
      const oldHit = cellRenderer.node.querySelector(
        `span.${HIGHLIGHT_CLASS_NAME}.${SELECTED_HIGHLIGHT_CLASS}`
      );
      if (oldHit) {
        oldHit.classList.remove(SELECTED_HIGHLIGHT_CLASS);
      }

      if (cell.rendered && this.currentMatchIndex !== null) {
        const newHit = cellRenderer.node.querySelectorAll(
          `span.${HIGHLIGHT_CLASS_NAME}`
        )[this.currentMatchIndex];
        newHit?.classList.add(SELECTED_HIGHLIGHT_CLASS);
      }
    }
  }
}

/**
 * Factory to create a cell search provider
 *
 * @param cell Cell widget
 * @param rendermime Notebook rendermime registry
 * @param searchRegistry Application search provider registry
 * @returns Cell search provider
 */
export function createCellSearchProvider(
  cell: Cell<ICellModel>,
  rendermime?: IRenderMimeRegistry,
  searchRegistry?: ISearchProviderRegistry
): CellSearchProvider {
  switch (cell.model.type) {
    case 'code':
      return new CodeCellSearchProvider(cell, rendermime, searchRegistry);
    case 'markdown':
      return new MarkdownCellSearchProvider(cell);
    default:
      return new CellSearchProvider(cell);
  }
}
