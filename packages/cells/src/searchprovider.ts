// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  IBaseSearchProvider,
  IFiltersType,
  ISearchMatch,
  ISearchProviderRegistry,
  ITextSearchMatch,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { IObservableString } from '@jupyterlab/observables';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { CodeCellModel } from '.';
import { ICellModel } from './model';

export class CellSearchProvider implements IDisposable, IBaseSearchProvider {
  constructor(
    protected model: ICellModel,
    protected rendermime?: IRenderMimeRegistry,
    protected searchRegistry?: ISearchProviderRegistry
  ) {
    this._changed = new Signal<IBaseSearchProvider, void>(this);
    this.editor = null;
  }

  get changed(): Signal<IBaseSearchProvider, void> {
    return this._changed;
  }

  get currentMatchIndex(): number {
    // TODO
    return 0;
  }

  get matchesSize(): number {
    return (
      this.inputMatches.length +
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

  setEditor(v: CodeMirrorEditor | null): void {
    this.editor = v;
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
    // Search input
    const content = this.model.modelDB.get('value') as IObservableString;
    this.inputMatches = await TextSearchEngine.search(query, content.text);
    content.changed.connect(this.onInputChanged, this);

    // Search outputs
    this.outputMatches.length = 0;
    if (
      filters?.output !== false &&
      this.model.type === 'code' &&
      this.rendermime &&
      this.searchRegistry
    ) {
      const outputs = (this.model as CodeCellModel).outputs;
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
    return Promise.resolve();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(loop: boolean = false): Promise<ISearchMatch | undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(loop: boolean = false): Promise<ISearchMatch | undefined> {
    return Promise.resolve(undefined);
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

  protected onInputChanged(
    content: IObservableString,
    changes: IObservableString.IChangedArgs
  ): void {
    // No-op
    // TODO this should handle codemirror highlights
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

  protected editor: CodeMirrorEditor | null;
  protected isActive = false;
  protected inputMatches = new Array<ITextSearchMatch>();
  protected outputMatches = new Array<ISearchMatch[]>();
  private _changed: Signal<IBaseSearchProvider, void>;
  private _isDisposed = false;
}
