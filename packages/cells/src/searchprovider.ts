// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  CodeMirrorSearchHighlighter
} from '@jupyterlab/codemirror';
import {
  GenericSearchProvider,
  IBaseSearchProvider,
  IFiltersType,
  ISearchMatch,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { IObservableString } from '@jupyterlab/observables';
import { OutputArea } from '@jupyterlab/outputarea';
import { Signal } from '@lumino/signaling';
import { CodeCell } from '.';
import { ICellModel } from './model';
import { Cell, MarkdownCell } from './widget';

/**
 * Class applied on highlighted search matches
 */
export const SELECTED_HIGHLIGHT_CLASS = 'jp-mod-selected';

/**
 * Search provider for cells.
 */
export class CellSearchProvider implements IBaseSearchProvider {
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
  get stateChanged(): Signal<IBaseSearchProvider, void> {
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
  clearHighlight(): void {
    this.currentIndex = null;
    this.cmHandler.clearHighlight();
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
      this.endQuery().catch(reason => {
        console.error(`Failed to end search query on cells.`, reason);
      });
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
   */
  constructor(cell: Cell<ICellModel>) {
    super(cell);

    this.currentProviderIndex = -1;
    this.outputsProvider = [];

    const outputs = (this.cell as CodeCell).outputArea;
    this._onOutputsChanged(outputs, outputs.widgets.length).catch(reason => {
      console.error(`Failed to initialize search on cell outputs.`, reason);
    });
    outputs.outputLengthChanged.connect(this._onOutputsChanged, this);
    outputs.disposed.connect(() => {
      outputs.outputLengthChanged.disconnect(this._onOutputsChanged);
    }, this);
  }

  /**
   * Number of matches in the cell.
   */
  get matchesSize(): number {
    if (!this.isActive) {
      return 0;
    }

    return (
      super.matchesSize +
      this.outputsProvider.reduce(
        (sum, provider) => sum + (provider.matchesSize ?? 0),
        0
      )
    );
  }

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): void {
    super.clearHighlight();
    this.outputsProvider.forEach(provider => {
      provider.clearHighlight();
    });
  }

  /**
   * Dispose the search provider
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this.outputsProvider.map(provider => {
      provider.dispose();
    });
    this.outputsProvider.length = 0;
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
      if (this.currentProviderIndex === -1) {
        const match = await super.highlightNext();
        if (match) {
          this.currentIndex = this.cmHandler.currentIndex;
          return match;
        } else {
          this.currentProviderIndex = 0;
        }
      }

      while (this.currentProviderIndex < this.outputsProvider.length) {
        const provider = this.outputsProvider[this.currentProviderIndex];
        const match = await provider.highlightNext(false);
        if (match) {
          this.currentIndex =
            super.matchesSize +
            this.outputsProvider
              .slice(0, this.currentProviderIndex)
              .reduce(
                (sum, provider) => (sum += provider.matchesSize ?? 0),
                0
              ) +
            provider.currentMatchIndex!;
          return match;
        } else {
          this.currentProviderIndex += 1;
        }
      }

      this.currentProviderIndex = -1;
      this.currentIndex = null;
      return undefined;
    }
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
        this.currentProviderIndex = this.outputsProvider.length - 1;
      }

      while (this.currentProviderIndex >= 0) {
        const provider = this.outputsProvider[this.currentProviderIndex];

        const match = await provider.highlightPrevious(false);
        if (match) {
          this.currentIndex =
            super.matchesSize +
            this.outputsProvider
              .slice(0, this.currentProviderIndex)
              .reduce(
                (sum, provider) => (sum += provider.matchesSize ?? 0),
                0
              ) +
            provider.currentMatchIndex!;
          return match;
        } else {
          this.currentProviderIndex -= 1;
        }
      }

      const match = await super.highlightPrevious();
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
        return match;
      } else {
        this.currentIndex = null;
        return undefined;
      }
    }
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
    if (filters?.output !== false && this.isActive) {
      await Promise.all(
        this.outputsProvider.map(provider => provider.startQuery(query))
      );
    }
  }

  async endQuery(): Promise<void> {
    await super.endQuery();
    if (this.filters?.output !== false && this.isActive) {
      await Promise.all(
        this.outputsProvider.map(provider => provider.endQuery())
      );
    }
  }

  private async _onOutputsChanged(
    outputArea: OutputArea,
    changes: number
  ): Promise<void> {
    this.outputsProvider.forEach(provider => {
      provider.dispose();
    });
    this.outputsProvider.length = 0;

    this.currentProviderIndex = -1;
    this.outputsProvider = (this.cell as CodeCell).outputArea.widgets.map(
      output => new GenericSearchProvider(output)
    );

    if (this.isActive && this.query && this.filters?.output !== false) {
      await Promise.all([
        this.outputsProvider.map(provider => {
          provider.startQuery(this.query);
        })
      ]);
    }

    this.stateChanged.emit();
  }

  protected outputsProvider: GenericSearchProvider[];
  protected currentProviderIndex: number;
}

/**
 * Markdown cell search provider
 */
class MarkdownCellSearchProvider extends CellSearchProvider {
  /**
   * Constructor
   *
   * @param cell Cell widget
   */
  constructor(cell: Cell<ICellModel>) {
    super(cell);
    this.renderedProvider = new GenericSearchProvider(
      (cell as MarkdownCell).renderer
    );
  }

  /**
   * Clear currently highlighted match
   */
  clearHighlight(): void {
    super.clearHighlight();
    this.renderedProvider.clearHighlight();
  }

  /**
   * Dispose the search provider
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this.renderedProvider.dispose();
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    await super.endQuery();
    await this.renderedProvider.endQuery();
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
    if (cell.rendered && this.matchesSize > 0) {
      // Unrender the cell
      this._unrenderedByHighligh = true;
      cell.rendered = false;
    }

    match = await super.highlightNext();

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
    if (cell.rendered && this.matchesSize > 0) {
      // Unrender the cell if there are matches within the cell
      this._unrenderedByHighligh = true;
      cell.rendered = false;
    }

    match = await super.highlightPrevious();

    return match;
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
    const cell = this.cell as MarkdownCell;
    if (cell.rendered) {
      this.onRenderedChanged(cell, cell.rendered);
    }
    cell.renderedChanged.connect(this.onRenderedChanged, this);
  }

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    const result = await super.replaceAllMatches(newText);
    // if the cell is rendered force update
    if ((this.cell as MarkdownCell).rendered) {
      this.cell.update();
    }

    return result;
  }

  /**
   * Callback on rendered state change
   *
   * @param cell Cell that emitted the change
   * @param rendered New rendered value
   */
  protected onRenderedChanged(cell: MarkdownCell, rendered: boolean): void {
    if (!this._unrenderedByHighligh) {
      this.currentIndex = null;
    }
    this._unrenderedByHighligh = false;
    if (this.isActive) {
      if (rendered) {
        this.renderedProvider.startQuery(this.query);
      } else {
        // Force cursor position to ensure reverse search is working as expected
        cell.editor.setCursorPosition({ column: 0, line: 0 });
        this.renderedProvider.endQuery();
      }
    }
  }

  protected renderedProvider: GenericSearchProvider;
  private _unrenderedByHighligh = false;
}

/**
 * Factory to create a cell search provider
 *
 * @param cell Cell widget
 * @returns Cell search provider
 */
export function createCellSearchProvider(
  cell: Cell<ICellModel>
): CellSearchProvider {
  if (cell.isPlaceholder()) {
    return new CellSearchProvider(cell);
  }

  switch (cell.model.type) {
    case 'code':
      return new CodeCellSearchProvider(cell);
    case 'markdown':
      return new MarkdownCellSearchProvider(cell);
    default:
      return new CellSearchProvider(cell);
  }
}
