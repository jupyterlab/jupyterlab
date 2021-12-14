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
  constructor(
    protected cell: Cell<ICellModel>,
    protected rendermime?: IRenderMimeRegistry,
    protected searchRegistry?: ISearchProviderRegistry
  ) {
    this._currentIndex = null;
    this._changed = new Signal<IBaseSearchProvider, void>(this);
    this.cmHandler = new CodeMirrorSearchHighlighter(this.editor);
  }

  get changed(): Signal<IBaseSearchProvider, void> {
    return this._changed;
  }

  get currentMatchIndex(): number | null {
    return this._currentIndex;
  }

  get editor(): CodeMirrorEditor {
    return this.cell.editor as CodeMirrorEditor;
  }

  get matchesSize(): number {
    return (
      this.cmHandler.matches.length +
      this.outputMatches.reduce((sum, matches) => (sum += matches.length), 0)
    );
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

    // Search outputs
    this.outputMatches.length = 0;
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
              searchEngine.search(query, output.data).then(hits => {
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

    return Promise.resolve();
  }

  endQuery(): Promise<void> {
    this.query = null;
    this.cmHandler.endQuery();
    return Promise.resolve();
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
      } else {
        let index = this._currentIndex - this.cmHandler.matches.length;
        for (const output of this.outputMatches) {
          if (index < output.length) {
            match = output[index];
            break;
          } else {
            index -= output.length;
          }
        }
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

  protected cmHandler: CodeMirrorSearchHighlighter;
  protected isActive = false;
  protected outputMatches = new Array<ISearchMatch[]>();
  protected query: RegExp | null = null;
  private _changed: Signal<IBaseSearchProvider, void>;
  private _isDisposed = false;
  private _currentIndex: number | null = null;
}
