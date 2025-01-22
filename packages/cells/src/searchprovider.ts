// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  EditorSearchProvider,
  IHighlightAdjacentMatchOptions
} from '@jupyterlab/codemirror';
import { signalToPromise } from '@jupyterlab/coreutils';
import {
  GenericSearchProvider,
  IBaseSearchProvider,
  IFilters,
  IReplaceOptions,
  ISearchMatch
} from '@jupyterlab/documentsearch';
import { OutputArea } from '@jupyterlab/outputarea';
import { ICellModel } from './model';
import { Cell, CodeCell, MarkdownCell } from './widget';

/**
 * Class applied on highlighted search matches
 */
export const SELECTED_HIGHLIGHT_CLASS = 'jp-mod-selected';

/**
 * Search provider for cells.
 */
export class CellSearchProvider
  extends EditorSearchProvider<ICellModel>
  implements IBaseSearchProvider
{
  constructor(protected cell: Cell<ICellModel>) {
    super();
    if (!this.cell.inViewport && !this.cell.editor) {
      void signalToPromise(cell.inViewportChanged).then(([, inViewport]) => {
        if (inViewport) {
          this.cmHandler.setEditor(this.editor as CodeMirrorEditor);
        }
      });
    }
  }

  /**
   * Text editor
   */
  protected get editor(): CodeEditor.IEditor | null {
    return this.cell.editor;
  }

  /**
   * Editor content model
   */
  protected get model() {
    return this.cell.model;
  }
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
  get matchesCount(): number {
    if (!this.isActive) {
      return 0;
    }

    return (
      super.matchesCount +
      this.outputsProvider.reduce(
        (sum, provider) => sum + (provider.matchesCount ?? 0),
        0
      )
    );
  }

  /**
   * Clear currently highlighted match.
   */
  async clearHighlight(): Promise<void> {
    await super.clearHighlight();
    await Promise.all(
      this.outputsProvider.map(provider => provider.clearHighlight())
    );
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
  async highlightNext(
    loop?: boolean,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    // If we're scanning from the previous match, test whether we're
    // at the end of the matches list.
    const from = options?.from ?? '';
    if (
      this.matchesCount === 0 ||
      (from === 'previous-match' &&
        this.currentIndex !== null &&
        this.currentIndex + 1 >= this.cmHandler.matches.length) ||
      !this.isActive
    ) {
      this.currentIndex = null;
    } else {
      if (this.currentProviderIndex === -1) {
        const match = await super.highlightNext(loop, options);
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
            super.matchesCount +
            this.outputsProvider
              .slice(0, this.currentProviderIndex)
              .reduce(
                (sum, provider) => (sum += provider.matchesCount ?? 0),
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
    if (this.matchesCount === 0 || !this.isActive) {
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
            super.matchesCount +
            this.outputsProvider
              .slice(0, this.currentProviderIndex)
              .reduce(
                (sum, provider) => (sum += provider.matchesCount ?? 0),
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
  async startQuery(query: RegExp | null, filters?: IFilters): Promise<void> {
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

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.model.getMetadata('editable') === false)
      return Promise.resolve(false);

    const result = await super.replaceAllMatches(newText, options);
    return result;
  }

  /**
   * Replace the currently selected match with the provided text.
   * If no match is selected, it won't do anything.
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  async replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.model.getMetadata('editable') === false)
      return Promise.resolve(false);

    const result = await super.replaceCurrentMatch(newText, loop, options);
    return result;
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
          void provider.startQuery(this.query);
        })
      ]);
    }

    this._stateChanged.emit();
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
  async clearHighlight(): Promise<void> {
    await super.clearHighlight();
    await this.renderedProvider.clearHighlight();
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
  async highlightNext(
    loop = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    let match: ISearchMatch | undefined = undefined;
    if (!this.isActive) {
      return match;
    }

    const cell = this.cell as MarkdownCell;
    if (cell.rendered && this.matchesCount > 0) {
      // Unrender the cell
      this._unrenderedByHighlight = true;
      const waitForRendered = signalToPromise(cell.renderedChanged);
      cell.rendered = false;
      await waitForRendered;
    }

    match = await super.highlightNext(loop, options);

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
    if (cell.rendered && this.matchesCount > 0) {
      // Unrender the cell if there are matches within the cell
      this._unrenderedByHighlight = true;
      const waitForRendered = signalToPromise(cell.renderedChanged);
      cell.rendered = false;
      await waitForRendered;
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
  async startQuery(query: RegExp | null, filters?: IFilters): Promise<void> {
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
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.model.getMetadata('editable') === false)
      return Promise.resolve(false);

    const result = await super.replaceAllMatches(newText, options);
    // if the cell is rendered force update
    if ((this.cell as MarkdownCell).rendered) {
      this.cell.update();
    }
    return result;
  }

  /**
   * Replace the currently selected match with the provided text.
   * If no match is selected, it won't do anything.
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  async replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.model.getMetadata('editable') === false)
      return Promise.resolve(false);

    const result = await super.replaceCurrentMatch(newText, loop, options);
    return result;
  }

  /**
   * Callback on rendered state change
   *
   * @param cell Cell that emitted the change
   * @param rendered New rendered value
   */
  protected onRenderedChanged(cell: MarkdownCell, rendered: boolean): void {
    if (!this._unrenderedByHighlight) {
      this.currentIndex = null;
    }
    this._unrenderedByHighlight = false;
    if (this.isActive) {
      if (rendered) {
        void this.renderedProvider.startQuery(this.query);
      } else {
        // Force cursor position to ensure reverse search is working as expected
        cell.editor?.setCursorPosition({ column: 0, line: 0 });
        void this.renderedProvider.endQuery();
      }
    }
  }

  protected renderedProvider: GenericSearchProvider;
  private _unrenderedByHighlight = false;
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
