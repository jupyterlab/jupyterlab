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
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { CodeCellModel, ICellModel } from './model';
import { Cell } from './widget';

export class CellSearchProvider implements IDisposable, IBaseSearchProvider {
  constructor(protected cell: Cell<ICellModel>) {
    this._currentIndex = null;
    this._changed = new Signal<IBaseSearchProvider, void>(this);
    this.cmHandler = new CodeMirrorSearchHighlighter(
      this.cell.editor as CodeMirrorEditor
    );
  }

  get changed(): Signal<IBaseSearchProvider, void> {
    return this._changed;
  }

  get currentMatchIndex(): number | null {
    return this._currentIndex;
  }

  get matchesSize(): number {
    return this.cmHandler.matches.length;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
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

    // Search input
    const content = this.cell.model.modelDB.get('value') as IObservableString;
    await this.onInputChanged(content);
    content.changed.connect(this.onInputChanged, this);
  }

  async endQuery(): Promise<void> {
    this.query = null;
    await this.cmHandler.endQuery();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(
    loop = false,
    isEdited = false
  ): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0) {
      this._currentIndex = null;
    } else {
      // If no match is selected or the cell is being edited => search from cursor
      if (this._currentIndex === null || isEdited) {
        // This starts from the cursor position
        const match = await this.cmHandler.highlightNext();
        if (match) {
          this._currentIndex = this.cmHandler.currentIndex;
          return match;
        } else {
          // The index will be incremented
          this._currentIndex = this.cmHandler.matches.length - 1;
        }
      }

      this._currentIndex += 1;

      if (loop) {
        this._currentIndex =
          (this._currentIndex + this.matchesSize) % this.matchesSize;
      } else {
        if (this._currentIndex > this.matchesSize) {
          this._currentIndex = null;
        }
      }
    }

    // It will be set to null if greater than the number of matches
    this.cmHandler.currentIndex = this._currentIndex;

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(
    loop = false,
    isEdited = false
  ): Promise<ISearchMatch | undefined> {
    if (this.matchesSize === 0) {
      this._currentIndex = null;
    } else {
      if (
        (this._currentIndex !== null &&
          this._currentIndex <= this.cmHandler.matches.length) ||
        isEdited
      ) {
        const match = await this.cmHandler.highlightPrevious();
        if (match) {
          this._currentIndex = this.cmHandler.currentIndex;
          return match;
        } else {
          // No hit in the current editor => will be decremented just after
          this._currentIndex = 0;
        }
      }

      this._currentIndex =
        this._currentIndex === null
          ? this.matchesSize - 1
          : this._currentIndex - 1;

      if (loop) {
        this._currentIndex =
          (this._currentIndex + this.matchesSize) % this.matchesSize;
      } else {
        if (this._currentIndex < 0) {
          this._currentIndex = null;
        }
      }
    }

    // It will be set to null if greater than the number of matches
    this.cmHandler.currentIndex = this._currentIndex;

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceCurrentMatch(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceAllMatches(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  protected getCurrentMatch(): ISearchMatch | undefined {
    if (this._currentIndex === null) {
      return undefined;
    } else {
      let match: ISearchMatch | undefined = undefined;
      if (this._currentIndex < this.cmHandler.matches.length) {
        match = this.cmHandler.matches[this._currentIndex];
      }
      return match;
    }
  }

  protected isCurrentIndexHighlighted(): boolean {
    // No current match
    if (this._currentIndex === null) {
      return false;
    }

    // Current match is not in the input
    if (this._currentIndex >= this.cmHandler.matches.length) {
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
      this.cmHandler.matches = await TextSearchEngine.search(
        this.query,
        content.text
      );
    }
  }

  protected cmHandler: CodeMirrorSearchHighlighter;
  protected isActive = false;
  protected query: RegExp | null = null;
  private _changed: Signal<IBaseSearchProvider, void>;
  private _isDisposed = false;
  private _currentIndex: number | null = null;
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
    let outputsSize = 0;
    const outputs = (this.cell.model as CodeCellModel).outputs;
    for (let outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
      const output = outputs.get(outputIdx);
      outputsSize += output.highlights?.length ?? 0;
    }

    return super.matchesSize + outputsSize;
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

  protected onOutputsChanged(
    output: IOutputAreaModel,
    changes: IOutputAreaModel.ChangedArgs
  ): void {
    // No-op
  }

  protected onOutputChanged(
    output: IOutputAreaModel,
    changes?: [number, string]
  ): void {
    // No-op
  }
}

class MarkdownCellSearchProvider extends CellSearchProvider {}

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
