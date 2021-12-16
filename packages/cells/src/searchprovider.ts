// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  IRenderMimeRegistry,
  MarkdownSearchEngine
} from '@jupyterlab/rendermime';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';

import { CodeCellModel, ICellModel } from './model';
import { Cell, CodeCell, MarkdownCell } from './widget';

const SELECTED_HIGHLIGHT_CLASS = 'jp-mod-selected';

export class CellSearchProvider implements IDisposable, IBaseSearchProvider {
  constructor(protected cell: Cell<ICellModel>) {
    this.currentIndex = null;
    this._changed = new Signal<IBaseSearchProvider, void>(this);
    this.cmHandler = new CodeMirrorSearchHighlighter(
      this.cell.editor as CodeMirrorEditor
    );
  }

  get changed(): Signal<IBaseSearchProvider, void> {
    return this._changed;
  }

  get currentMatchIndex(): number | null {
    return this.isActive ? this.currentIndex : null;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get matchesSize(): number {
    return this.isActive ? this.cmHandler.matches.length : 0;
  }

  clearSelection(): void {
    this.currentIndex = null;
    this.cmHandler.clearSelection();
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

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
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(query: RegExp, filters?: IFiltersType): Promise<void> {
    this.query = query;
    this.filters = filters;

    // Search input
    const content = this.cell.model.modelDB.get('value') as IObservableString;
    await this.onInputChanged(content);
    content.changed.connect(this.onInputChanged, this);
  }

  async endQuery(): Promise<void> {
    await this.cmHandler.endQuery();
    this.currentIndex = null;
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
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
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
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
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
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
      const match = this.getCurrentMatch();
      this.cmHandler.matches.splice(this.currentIndex, 1);
      this.currentIndex = null;
      this._highlightNextOnReplace = true;

      this.cell.model.value.text =
        this.cell.model.value.text.slice(0, match!.position) +
        newText +
        this.cell.model.value.text.slice(match!.position + match!.text.length);
      occurred = true;
    }

    if (!occurred) {
      this.highlightNext();
    }
    return Promise.resolve(occurred);
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
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
      // this.cmHandler.refresh();
    }
    return Promise.resolve(occurred);
  }

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

  protected isCurrentIndexHighlighted(): boolean {
    // No current match
    if (this.currentIndex === null) {
      return false;
    }

    // Current match is not in the input
    if (this.currentIndex >= this.cmHandler.matches.length) {
      return true;
    } else {
      return this.cmHandler.isCurrentIndexHighlighted();
    }
  }

  protected async onInputChanged(
    content: IObservableString,
    changes?: IObservableString.IChangedArgs
  ): Promise<void> {
    if (this.query !== null) {
      if (this.isActive) {
        this.cmHandler.matches = await TextSearchEngine.search(
          this.query,
          content.text
        );
        if (this._highlightNextOnReplace) {
          this.highlightNext();
        }
      } else {
        this.cmHandler.matches = [];
      }
    }
  }

  protected cmHandler: CodeMirrorSearchHighlighter;
  protected currentIndex: number | null = null;
  protected filters: IFiltersType | undefined;
  protected query: RegExp | null = null;
  private _changed: Signal<IBaseSearchProvider, void>;
  private _isActive = true;
  private _isDisposed = false;
  private _highlightNextOnReplace = false;
}

class CodeCellSearchProvider extends CellSearchProvider {
  constructor(
    cell: Cell<ICellModel>,
    protected rendermime?: IRenderMimeRegistry,
    protected searchRegistry?: ISearchProviderRegistry
  ) {
    super(cell);
  }

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

  clearSelection(): void {
    super.clearSelection();
    this.updateHighlightedOutput();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
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

    this.updateHighlightedOutput();

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
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

    this.updateHighlightedOutput();

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(query: RegExp, filters?: IFiltersType): Promise<void> {
    await super.startQuery(query, filters);

    // Search outputs
    if (
      filters?.output !== false &&
      this.cell.model.type === 'code' &&
      this.rendermime &&
      this.searchRegistry
    ) {
      const outputs = (this.cell.model as CodeCellModel).outputs;
      if (this.isActive) {
        const searchOutputs = new Array<Promise<void>>();
        for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
          const output = outputs.get(outputIdx);
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
              searchOutputs.push(
                searchEngine.search(query, output.data[mimeType]).then(hits => {
                  output.highlights = hits;
                })
              );
            }
          }
        }

        await Promise.all(searchOutputs);
      }
      outputs.changed.connect(this.onOutputsChanged, this);
      outputs.stateChanged.connect(this.onOutputChanged, this);
    }
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

  protected getCurrentMatch(): ISearchMatch | undefined {
    let match = super.getCurrentMatch();
    if (!match && this.currentMatchIndex !== null) {
      let index = this.currentMatchIndex - this.cmHandler.matches.length;
      const outputs = (this.cell.model as CodeCellModel).outputs;
      for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
        const output = outputs.get(outputIdx);
        if (index < (output.highlights?.length ?? 0)) {
          match = {
            ...output.highlights![index],
            index: this.currentMatchIndex
          };
          break;
        } else {
          index -= output.highlights?.length ?? 0;
        }
      }
    }
    return match;
  }

  private onOutputsChanged(
    output: IOutputAreaModel,
    changes: IOutputAreaModel.ChangedArgs
  ): void {
    // No-op
  }

  private onOutputChanged(
    output: IOutputAreaModel,
    changes?: [number, string]
  ): void {
    // No-op
  }

  private updateHighlightedOutput() {
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
}

class MarkdownCellSearchProvider extends CellSearchProvider {
  get matchesSize(): number {
    const cell = this.cell as MarkdownCell;
    return this.isActive
      ? cell.rendered
        ? cell.highlights.length
        : super.matchesSize
      : 0;
  }

  clearSelection(): void {
    super.clearSelection();
    this.updateRenderedSelection();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
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
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
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

  async endQuery(): Promise<void> {
    await super.endQuery();
    (this.cell as MarkdownCell).highlights = [];
  }

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
