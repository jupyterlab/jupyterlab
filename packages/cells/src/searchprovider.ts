// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { CodeEditor } from '@jupyterlab/codeeditor';
import type {
  CodeMirrorEditor,
  IHighlightAdjacentMatchOptions
} from '@jupyterlab/codemirror';
import { EditorSearchProvider } from '@jupyterlab/codemirror';
import { signalToPromise } from '@jupyterlab/coreutils';
import type {
  IBaseSearchProvider,
  IFilters,
  IHTMLSearchMatch,
  IReplaceOptions,
  ISearchMatch
} from '@jupyterlab/documentsearch';
import {
  GenericSearchProvider,
  HTMLSearchEngine
} from '@jupyterlab/documentsearch';
import type { OutputArea } from '@jupyterlab/outputarea';
import type { IRenderMime } from '@jupyterlab/rendermime';
import {
  removeMath,
  RenderedCommon,
  replaceMath
} from '@jupyterlab/rendermime';
import { TableOfContentsUtils } from '@jupyterlab/toc';
import type { ICellModel } from './model';
import type { Cell, CodeCell, MarkdownCell } from './widget';

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

  /**
   * Adds the `readOnly` flag to the match based on cell editability.
   *
   * @param match - The search match.
   * @param fromHTML - True if match is from rendered HTML, else false.
   */
  protected _applyReadOnlyState(
    match: ISearchMatch | undefined,
    fromHTML: boolean
  ): ISearchMatch | undefined {
    if (!match) {
      return undefined;
    }
    if (fromHTML) {
      return { ...match, readOnly: true };
    }
    const isEditable = this.model.getMetadata('editable') !== false;
    return { ...match, readOnly: !isEditable };
  }

  /**
   * Whether the cell is read-only: its `editable` metadata is `false`.
   * No match in a read-only cell can be replaced.
   */
  public isReadOnlyProvider(): boolean {
    const isEditable = this.model.getMetadata('editable') !== false;
    return !isEditable;
  }

  /**
   * The number of matches in the cell source which can be replaced.
   */
  get replaceableMatchesCount(): number {
    return this.isReadOnlyProvider() ? 0 : super.matchesCount;
  }

  /**
   * Get the current match if it exists.
   */
  getCurrentMatch(): ISearchMatch | undefined {
    return this._applyReadOnlyState(super.getCurrentMatch(), false);
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
    const match = await super.highlightNext(loop, options);
    return this._applyReadOnlyState(match, false);
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(
    loop?: boolean,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const match = await super.highlightPrevious(loop, options);
    return this._applyReadOnlyState(match, false);
  }

  /**
   * Replace the currently selected match with the provided text, unless the
   * cell is read-only.
   *
   * @returns Whether a replace occurred.
   */
  async replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.isReadOnlyProvider()) {
      return false;
    }
    return super.replaceCurrentMatch(newText, loop, options);
  }

  /**
   * Replace all matches in the cell source with the provided text, unless
   * the cell is read-only.
   *
   * @returns Whether a replace occurred.
   */
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.isReadOnlyProvider()) {
      return false;
    }
    return super.replaceAllMatches(newText, options);
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
   * Returns the current active search match.
   */
  getCurrentMatch(): ISearchMatch | undefined {
    if (this.currentProviderIndex === -1) {
      return super.getCurrentMatch();
    } else if (this.currentProviderIndex < this.outputsProvider.length) {
      const provider = this.outputsProvider[this.currentProviderIndex];
      const match = provider.currentMatch ?? undefined;
      return this._applyReadOnlyState(match, true);
    }

    return undefined;
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

      if (options?.skipReadOnly) {
        // Output matches cannot be replaced, skip all of them
        await this.outputsProvider[this.currentProviderIndex]?.clearHighlight();
        this.currentProviderIndex = this.outputsProvider.length;
      }

      while (this.currentProviderIndex < this.outputsProvider.length) {
        const provider = this.outputsProvider[this.currentProviderIndex];
        const match = await provider.highlightNext(false, options);
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
          // Cell output is always read-only
          return this._applyReadOnlyState(match, true);
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
  async highlightPrevious(
    loop?: boolean,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    if (this.matchesCount === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      if (this.currentIndex === null) {
        this.currentProviderIndex = this.outputsProvider.length - 1;
      }

      if (options?.skipReadOnly) {
        // Output matches cannot be replaced, skip all of them
        await this.outputsProvider[this.currentProviderIndex]?.clearHighlight();
        this.currentProviderIndex = -1;
      }

      while (this.currentProviderIndex >= 0) {
        const provider = this.outputsProvider[this.currentProviderIndex];

        const match = await provider.highlightPrevious(false, options);
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
          // Cell output is always read-only
          return this._applyReadOnlyState(match, true);
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
    this.renderedProvider.stateChanged.connect(
      this._onRenderedTextSearched,
      this
    );
  }

  /**
   * Clear currently highlighted match
   */
  async clearHighlight(): Promise<void> {
    this._currentMatchInRendered = false;
    this._hideReadOnlyEditor();
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
    this._currentMatchInRendered = false;
    this._placement = null;
    this._renderedMatches = null;
    await super.endQuery();
    await this.renderedProvider.endQuery();
  }

  /**
   * Get the currently selected match.
   *
   * @returns The currently selected match, if any.
   */
  getCurrentMatch(): ISearchMatch | undefined {
    if (this._currentMatchInRendered) {
      // A rendered Markdown match is replaceable when the cell is
      // editable: the notebook un-renders the cell before replacing.
      return this._applyReadOnlyState(
        this.renderedProvider.currentMatch ?? undefined,
        false
      );
    }
    return super.getCurrentMatch();
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
    if (!this.isActive) {
      return undefined;
    }

    const cell = this.cell as MarkdownCell;
    if (!cell.rendered) {
      this._currentMatchInRendered = false;
      const match = await super.highlightNext(loop, options);
      if (!match) {
        // The current match moves to another cell
        this._hideReadOnlyEditor();
      }
      return match;
    }

    return this._showCurrentMatch(
      await super.highlightNext(loop, this._hiddenEditorOptions(options)),
      options
    );
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(
    loop = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    if (!this.isActive) {
      return undefined;
    }

    const cell = this.cell as MarkdownCell;
    if (!cell.rendered) {
      this._currentMatchInRendered = false;
      const match = await super.highlightPrevious(loop, options);
      if (!match) {
        // The current match moves to another cell
        this._hideReadOnlyEditor();
      }
      return match;
    }

    return this._showCurrentMatch(
      await super.highlightPrevious(loop, this._hiddenEditorOptions(options)),
      options
    );
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(query: RegExp | null, filters?: IFilters): Promise<void> {
    this._currentMatchInRendered = false;
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
    if (result) {
      // The match marked in the rendered text is replaced too
      this._currentMatchInRendered = false;
      await this.renderedProvider.clearHighlight();
    }
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

    if (this._currentMatchInRendered) {
      // The position of a rendered match counts from the start of its text
      // node: replace the source match, in the editor if the cell shows it.
      if (this._canUnrender()) {
        const cell = this.cell as MarkdownCell;
        const waitForRendered = signalToPromise(cell.renderedChanged);
        cell.rendered = false;
        await waitForRendered;
      }
      this._currentMatchInRendered = false;
    }

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
    // A match marked in the rendered text stays current when the cell shows
    // its editor: the editor already has it as its current match.
    const sourceMatch =
      !rendered && this._currentMatchInRendered && this.isActive
        ? super.getCurrentMatch()
        : undefined;
    if (!sourceMatch && !this._unrenderedByHighlight) {
      this.currentIndex = null;
    }
    this._unrenderedByHighlight = false;
    // The rendered matches are rebuilt when the cell renders again, so a
    // match marked in the rendered text is no longer current.
    this._currentMatchInRendered = false;
    if (this.isActive) {
      this._renderedMatches = null;
      if (rendered) {
        void this.renderedProvider.startQuery(this.query).then(() => {
          // Group the matches of the new search
          this._renderedMatches = null;
        });
      } else {
        // Force cursor position to ensure reverse search is working as
        // expected, without a scroll: a restarted search keeps the scroll
        // position, and a new query scrolls to the match itself
        cell.editor?.setCursorPosition(
          { column: 0, line: 0 },
          { scroll: false }
        );
        if (sourceMatch && cell.editor) {
          const position = cell.editor.getPositionAt(sourceMatch.position);
          if (position) {
            cell.editor.revealPosition(position);
          }
        }
        void this.renderedProvider.endQuery();
      }
    }
  }

  /**
   * Mark the current match again after the rendered text changed, as when a
   * diagram is drawn again: the rendered text was searched again, and the new
   * search has no current match.
   */
  private async _onRenderedTextSearched(): Promise<void> {
    this._renderedMatches = null;
    // The text can change while the match is being marked, before
    // `_currentMatchInRendered` is set, as when the table of contents numbers
    // the heading of a cell which rendered again.
    const sourceIndex = this.currentIndex;
    if (
      !this.isActive ||
      !(this.cell as MarkdownCell).rendered ||
      sourceIndex === null
    ) {
      return;
    }
    const index = await this._renderedMatchIndex(sourceIndex);
    if (
      this.currentIndex !== sourceIndex ||
      !(this.cell as MarkdownCell).rendered
    ) {
      // The current match moved while the source was rendered again
      return;
    }
    if (index === undefined || !this._isRenderedMatchVisible(index)) {
      this._currentMatchInRendered = false;
      return;
    }
    this._currentMatchInRendered = !!(await this._highlightRenderedMatch(
      index,
      false
    ));
  }

  /**
   * Whether setting `rendered` to `false` shows the cell editor. A read-only
   * cell stays rendered when its editor is hidden, and does not emit
   * `renderedChanged`.
   */
  private _canUnrender(): boolean {
    const cell = this.cell as MarkdownCell;
    return !cell.readOnly || cell.showEditorForReadOnly;
  }

  /**
   * Render a read-only cell again after the search showed its editor for a
   * match which the rendered text does not show.
   */
  private _hideReadOnlyEditor(): void {
    if (this._showsReadOnlyEditor) {
      this._showsReadOnlyEditor = false;
      // This renders the cell again
      (this.cell as MarkdownCell).showEditorForReadOnly = false;
    }
  }

  /**
   * Options to step the editor of a rendered cell, which is hidden. The user
   * does not see its cursor, so a search from the selection starts from the
   * start of the cell instead. A hidden editor keeps a scroll request until
   * the cell shows it again, and then scrolls the notebook: do not send one.
   *
   * @param options - Options of the step.
   * @returns Options to step the hidden editor.
   */
  private _hiddenEditorOptions(
    options?: IHighlightAdjacentMatchOptions
  ): IHighlightAdjacentMatchOptions {
    const from = options?.from;
    return {
      ...options,
      from: from === 'selection' || from === 'selection-start' ? 'start' : from,
      scroll: false
    };
  }

  /**
   * Report the match the editor just advanced to: mark it in the rendered
   * text when the rendered text shows it, and show the editor otherwise.
   *
   * @param match - Match the editor advanced to, if any.
   * @param options - Options of the step which advanced the editor.
   * @returns The match to report to the caller.
   */
  private async _showCurrentMatch(
    match: ISearchMatch | undefined,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const cell = this.cell as MarkdownCell;
    if (!match || this.currentIndex === null) {
      this._currentMatchInRendered = false;
      await this.renderedProvider.clearHighlight();
      return undefined;
    }

    const sourceIndex = this.currentIndex;
    const renderedIndex = await this._renderedMatchIndex(sourceIndex);
    if (this.currentIndex !== sourceIndex || !cell.rendered) {
      // Another step moved the current match, or the cell shows its editor,
      // while the source was rendered again
      return match;
    }
    if (
      renderedIndex === undefined ||
      !this._isRenderedMatchVisible(renderedIndex)
    ) {
      // The rendered text does not show this match: show the editor.
      this._currentMatchInRendered = false;
      await this.renderedProvider.clearHighlight();
      if (cell.rendered) {
        if (!this._canUnrender()) {
          // A read-only cell shows its editor until the current match moves
          // to another cell
          this._showsReadOnlyEditor = true;
          cell.showEditorForReadOnly = true;
        }
        this._unrenderedByHighlight = true;
        const waitForRendered = signalToPromise(cell.renderedChanged);
        cell.rendered = false;
        await waitForRendered;
      }
      // The editor got no scroll request while it was hidden
      if ((options?.scroll ?? true) && !cell.rendered && cell.editor) {
        const position = cell.editor.getPositionAt(match.position);
        if (position) {
          cell.editor.revealPosition(position);
        }
      }
      return match;
    }

    const renderedMatch = await this._highlightRenderedMatch(
      renderedIndex,
      options?.scroll ?? true
    );
    if (!renderedMatch) {
      this._currentMatchInRendered = false;
      return match;
    }
    this._currentMatchInRendered = true;
    // A rendered Markdown match is replaceable when the cell is editable.
    return this._applyReadOnlyState(renderedMatch, false);
  }

  /**
   * Whether the user can see the rendered match at the given index. A closed
   * `<details>` element hides its content, a text area shows its text without
   * the mark of the match, the caption of a Mermaid diagram is only for screen
   * readers, and a style can hide rendered text, as it hides the source of a
   * Mermaid diagram.
   */
  private _isRenderedMatchVisible(index: number): boolean {
    const element =
      this._groupRenderedMatches().matches[index]?.node.parentElement;
    if (
      !element ||
      element.matches('details:not([open])') ||
      element.closest('details:not([open]) > :not(summary)') ||
      element.closest('textarea, .jp-sr-only')
    ) {
      return false;
    }
    // The style of the match is not known for a cell outside the document,
    // nor for a hidden cell, as in a background tab
    if (!element.isConnected || !(this.cell.node.checkVisibility?.() ?? true)) {
      return true;
    }
    // `visibility: hidden` keeps the box of the text, and hides its mark too
    return element.checkVisibility?.({ visibilityProperty: true }) ?? true;
  }

  /**
   * Mark the rendered match at the given index as the current match, after
   * the marking in progress: a step and a new search of the changed rendered
   * text can both mark a match, and stepping at the same time overshoots.
   *
   * @param index - Index of the rendered match to mark.
   * @param scroll - Whether to scroll the match into view.
   * @returns The marked match, if any.
   */
  private _highlightRenderedMatch(
    index: number,
    scroll: boolean
  ): Promise<IHTMLSearchMatch | undefined> {
    const marked = this._marking.then(() =>
      this._stepToRenderedMatch(index, scroll)
    );
    this._marking = marked.catch(() => undefined);
    return marked;
  }

  /**
   * Step the rendered provider to the match at the given index.
   *
   * @param index - Index of the rendered match to mark.
   * @param scroll - Whether to scroll the match into view.
   * @returns The marked match, if any.
   */
  private async _stepToRenderedMatch(
    index: number,
    scroll: boolean
  ): Promise<IHTMLSearchMatch | undefined> {
    const provider = this.renderedProvider;
    const current = provider.currentMatchIndex;
    const count = provider.matchesCount ?? 0;
    // Without a marked match, the first step forward marks the first match
    // and the first step back marks the last one: take the shorter way
    let steps =
      current !== null
        ? index - current
        : index < count - index
          ? index + 1
          : index - count;
    while (steps !== 0) {
      // Scroll only to the match itself, not to the matches on the way
      const options = { scroll: scroll && Math.abs(steps) === 1 };
      if (steps > 0) {
        await provider.highlightNext(false, options);
        steps--;
      } else {
        await provider.highlightPrevious(false, options);
        steps++;
      }
    }
    return provider.currentMatchIndex === index
      ? (provider.currentMatch ?? undefined)
      : undefined;
  }

  /**
   * The index of the rendered match which shows a source match, if the
   * rendered text shows it.
   *
   * The rendered text does not keep source positions, so `Private.Placement`
   * renders the source again offscreen, with markers in each match. The
   * matches found here in the rendered text must be the ones found in the
   * offscreen rendering, apart from those in the number which the table of
   * contents adds to a heading and in the anchor link of a heading.
   *
   * @param sourceIndex - Index of the source match.
   * @returns Index of the rendered match, if any.
   */
  private async _renderedMatchIndex(
    sourceIndex: number
  ): Promise<number | undefined> {
    const renderer = (this.cell as MarkdownCell).renderer;
    const query = this.query;
    const source = this.model.sharedModel.getSource();
    const matches = this.cmHandler.matches;
    if (
      !query ||
      !matches[sourceIndex] ||
      !(renderer instanceof RenderedCommon) ||
      !renderer.markdownParser
    ) {
      return undefined;
    }
    const key = `${query.source}/${query.flags}/${source}`;
    if (this._placement?.key !== key) {
      this._placement = {
        key,
        placement: new Private.Placement(source, matches, query, renderer)
      };
    }
    const place = await this._placement.placement.place(sourceIndex);
    if (!place || this.cmHandler.matches !== matches) {
      return undefined;
    }

    const {
      matches: rendered,
      inText,
      inFormula
    } = this._groupRenderedMatches();
    if (place.kind === 'text') {
      return inText.length === place.count ? inText[place.index] : undefined;
    }
    const candidates = inFormula[place.formula];
    if (
      inFormula.length !== place.formulas ||
      candidates?.length !== place.count
    ) {
      return undefined;
    }
    const index = candidates[place.index];
    // MathJax draws letters as mathematical symbols
    return Private.typedText(rendered[index].text) ===
      Private.typedText(matches[sourceIndex].text)
      ? index
      : undefined;
  }

  /**
   * The matches of the search in the rendered text, grouped by where they
   * are. Grouping looks up the ancestors of every match, so the groups are
   * kept until the rendered text is searched again.
   */
  private _groupRenderedMatches(): Private.IRenderedMatches {
    if (!this._renderedMatches) {
      this._renderedMatches = Private.groupRenderedMatches(
        this.renderedProvider.matches,
        (this.cell as MarkdownCell).renderer.node
      );
    }
    return this._renderedMatches;
  }

  protected renderedProvider: GenericSearchProvider;
  private _unrenderedByHighlight = false;
  private _currentMatchInRendered = false;
  private _showsReadOnlyEditor = false;
  private _placement: { key: string; placement: Private.Placement } | null =
    null;
  private _renderedMatches: Private.IRenderedMatches | null = null;
  private _marking: Promise<unknown> = Promise.resolve();
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

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * The text of a match in the form typed in a query. MathJax draws formulas
   * with mathematical symbols, such as 𝑥 for x and − for -, which the search
   * in rendered text turns into the typed form in the same way.
   */
  export function typedText(text: string): string {
    return text
      .normalize('NFKC')
      .replace(/\u2212/g, '-')
      .replace(/\u2217/g, '*')
      .replace(/\u2032/g, "'")
      .replace(/\u2061(?=[\p{L}\p{N}])/gu, ' ')
      .replace(/\u2061/g, '');
  }

  /**
   * The matches of a search in the rendered text, grouped by where they are.
   */
  export interface IRenderedMatches {
    /**
     * The matches, in the order of the text.
     */
    matches: IHTMLSearchMatch[];
    /**
     * The indices of the matches outside formulas, without those in the text
     * which the table of contents and the anchor links of headings add.
     */
    inText: number[];
    /**
     * The indices of the matches in each formula.
     */
    inFormula: number[][];
  }

  /**
   * Group the rendered matches into those outside formulas and those in each
   * formula, without those in the text which the table of contents and the
   * anchor links of headings add after rendering.
   */
  export function groupRenderedMatches(
    rendered: IHTMLSearchMatch[],
    root: HTMLElement
  ): IRenderedMatches {
    const containers = Array.from(root.querySelectorAll('mjx-container'));
    const added = `.${TableOfContentsUtils.NUMBERING_CLASS}, .jp-InternalAnchorLink`;
    const inText: number[] = [];
    const inFormula: number[][] = containers.map(() => []);
    rendered.forEach(({ node }, index) => {
      const element = node.parentElement;
      const container = element?.closest('mjx-container');
      if (container) {
        inFormula[containers.indexOf(container)]?.push(index);
      } else if (!element?.closest(added)) {
        inText.push(index);
      }
    });
    return { matches: rendered, inText, inFormula };
  }

  /**
   * The parts of the renderer of a Markdown cell which render a source as the
   * cell does.
   */
  export interface IMarkdownRenderer {
    readonly markdownParser: IRenderMime.IMarkdownParser | null;
    readonly sanitizer: IRenderMime.ISanitizer;
    readonly latexTypesetter: IRenderMime.ILatexTypesetter | null;
  }

  /**
   * The place of a source match in the rendered text, or `null` when the
   * rendered text does not show the match or its place is not known.
   */
  export type Place =
    | {
        kind: 'text';
        /**
         * Index among the rendered matches outside formulas.
         */
        index: number;
        /**
         * Number of rendered matches outside formulas.
         */
        count: number;
      }
    | {
        kind: 'formula';
        /**
         * Index of the formula among the formulas of the rendered text.
         */
        formula: number;
        /**
         * Number of formulas in the rendered text.
         */
        formulas: number;
        /**
         * Index among the source matches in the formula.
         */
        index: number;
        /**
         * Number of source matches in the formula.
         */
        count: number;
      }
    | null;

  /**
   * Finds where the rendered text shows the matches of a query in a Markdown
   * source, by rendering the source again offscreen and without typesetting,
   * with a private-use character before each match and another after its
   * first character. A marker in the text gives the place of its match. A
   * missing marker, or two markers at the same place, shows that the rendered
   * text hides the match, as it hides the bracket of the link in `[[1]](url)`
   * while it shows the bracket after it. When the markers change the text, as
   * one in a reference label or a character reference does, each match is
   * placed with its own markers only. A match in a formula is placed by its
   * order in the formula, as the markers do not reach the typeset formula.
   */
  export class Placement {
    constructor(
      source: string,
      matches: ReadonlyArray<ISearchMatch>,
      query: RegExp,
      renderer: IMarkdownRenderer
    ) {
      this._source = source;
      this._matches = matches;
      this._query = query;
      this._renderer = renderer;
      this._original = renderSource(source, renderer);
      this._members = findMembers(source, matches, renderer);
    }

    /**
     * The place of the source match at the given index.
     */
    async place(index: number): Promise<Place> {
      const original = await this._original;
      if (!original || this._matches.length > MARKERS) {
        return null;
      }
      const members = this._members;
      const math = members?.findIndex(inMath => inMath.includes(index)) ?? -1;
      if (members && math >= 0) {
        // A formula outside the text, as in a link destination, is hidden
        const formula = original.formulas.indexOf(math);
        return formula < 0
          ? null
          : {
              kind: 'formula',
              formula,
              formulas: original.formulas.length,
              index: members[math].indexOf(index),
              count: members[math].length
            };
      }
      if (!this._all) {
        this._all = this._placeInText(this._matches.map((_, i) => i));
      }
      const places = await this._all;
      if (places) {
        return places.get(index) ?? null;
      }
      let single = this._single.get(index);
      if (!single) {
        single = this._placeInText([index]).then(
          found => found?.get(index) ?? null
        );
        this._single.set(index, single);
      }
      return single;
    }

    /**
     * Render the source with a marker before each of the given matches and
     * after its first character, and place those matches in the text.
     *
     * @returns The places of the matches, or `null` when the markers change
     * the text.
     */
    private async _placeInText(
      indices: number[]
    ): Promise<Map<number, Place> | null> {
      const original = await this._original;
      const marked = await render(
        addMarkers(this._source, this._matches, indices, true),
        this._renderer
      );
      if (!original || !marked) {
        return null;
      }
      const { text, offsets, afterFirst } = removeMarkers(marked.text);
      if (
        text !== original.text ||
        marked.formulas.join() !== original.formulas.join()
      ) {
        return null;
      }
      if (!this._starts) {
        this._starts = findStarts(original, this._query);
      }
      const starts = this._starts;
      const places = new Map<number, Place>();
      for (const index of indices) {
        const offset = offsets.get(index);
        const after = afterFirst.get(index);
        // The text shows the first character of the match between its markers
        const ordinal =
          offset === undefined || after === undefined || after <= offset
            ? undefined
            : starts.get(offset);
        places.set(
          index,
          ordinal === undefined
            ? null
            : { kind: 'text', index: ordinal, count: starts.size }
        );
      }
      return places;
    }

    private _source: string;
    private _matches: ReadonlyArray<ISearchMatch>;
    private _query: RegExp;
    private _renderer: IMarkdownRenderer;
    private _original: Promise<IRendered | null>;
    private _members: number[][] | null;
    private _starts: Map<number, number> | null = null;
    private _all: Promise<Map<number, Place> | null> | null = null;
    private _single = new Map<number, Promise<Place>>();
  }

  /**
   * A Markdown source rendered offscreen, without typesetting.
   */
  interface IRendered {
    /**
     * The text which the search reads, with `FORMULA` for each formula.
     */
    text: string;
    /**
     * The text of each text node, with its offset in `text`. A formula splits
     * the text node which holds it, as its typeset form does.
     */
    nodes: Array<{ data: string; start: number }>;
    /**
     * The index of each formula among the formulas of the source, in the
     * order of the text.
     */
    formulas: number[];
  }

  /**
   * The character which stands for a formula in `IRendered.text`.
   */
  const FORMULA = '\uFFFC';

  /**
   * The code point of the marker of the first match. Each match has its own
   * private-use character before it, and `MARKERS` code points further on,
   * another one after its first character.
   */
  const MARKER = 0xf0000;

  /**
   * The number of matches which can have markers: half of the 0xfffe
   * private-use code points from `MARKER` on.
   */
  const MARKERS = 0x7fff;

  /**
   * The last offscreen rendering of the source of each renderer. The search
   * starts again with new cell providers for each query, and the source
   * rarely changes in between.
   */
  const renderings = new WeakMap<
    IMarkdownRenderer,
    { source: string; rendered: Promise<IRendered | null> }
  >();

  /**
   * Render the source of a renderer offscreen, or reuse the last rendering
   * of the same source.
   */
  function renderSource(
    source: string,
    renderer: IMarkdownRenderer
  ): Promise<IRendered | null> {
    const last = renderings.get(renderer);
    if (last?.source === source) {
      return last.rendered;
    }
    const rendered = render(source, renderer);
    renderings.set(renderer, { source, rendered });
    return rendered;
  }

  /**
   * Render a Markdown source as a Markdown cell does, without typesetting its
   * formulas, in a document which neither loads images nor runs scripts.
   */
  async function render(
    source: string,
    renderer: IMarkdownRenderer
  ): Promise<IRendered | null> {
    const { markdownParser, sanitizer, latexTypesetter } = renderer;
    if (!markdownParser) {
      return null;
    }
    try {
      const parts = removeMath(source, latexTypesetter?.mathParseOptions);
      let html = await markdownParser.render(parts.text);
      if (!latexTypesetter) {
        // Without a typesetter, the cell shows formulas as they are written
        html = replaceMath(html, parts.math);
      }
      const root = document.implementation
        .createHTMLDocument('')
        .createElement('div');
      root.innerHTML = sanitizer.sanitize(html);
      return readText(root);
    } catch (reason) {
      console.warn('Failed to render Markdown for the search.', reason);
      return null;
    }
  }

  /**
   * The text of a rendering, read as `HTMLSearchEngine` reads it.
   */
  function readText(root: HTMLElement): IRendered {
    const rendered: IRendered = { text: '', nodes: [], formulas: [] };
    const walker = root.ownerDocument.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          for (
            let element = node.parentElement;
            element && element !== root;
            element = element.parentElement
          ) {
            if (element.nodeName in HTMLSearchEngine.UNSUPPORTED_ELEMENTS) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node: Node | null;
    while ((node = walker.nextNode()) !== null) {
      // The placeholder of a formula stands where the typeset formula splits
      // the text node
      for (const piece of (node as Text).data.split(/(@@\d+@@)/)) {
        const formula = /^@@(\d+)@@$/.exec(piece);
        if (formula) {
          rendered.formulas.push(Number(formula[1]));
          rendered.text += FORMULA;
        } else if (piece) {
          rendered.nodes.push({ data: piece, start: rendered.text.length });
          rendered.text += piece;
        }
      }
    }
    return rendered;
  }

  /**
   * The offset in the text of each match of a query in a rendering, with its
   * index in the order of the text. The search finds the matches in one text
   * node at a time.
   */
  function findStarts(rendered: IRendered, query: RegExp): Map<number, number> {
    const global = query.global
      ? new RegExp(query.source, query.flags)
      : new RegExp(query.source, query.flags + 'g');
    const starts = new Map<number, number>();
    for (const { data, start } of rendered.nodes) {
      global.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = global.exec(data)) !== null) {
        if (!match[0]) {
          // Step over an empty match, which would otherwise repeat forever
          global.lastIndex += 1;
          continue;
        }
        starts.set(start + match.index, starts.size);
      }
    }
    return starts;
  }

  /**
   * The source with a marker before each of the given matches, and with
   * `afterFirst`, another after the first character of each.
   */
  function addMarkers(
    source: string,
    matches: ReadonlyArray<ISearchMatch>,
    indices: number[],
    afterFirst = false
  ): string {
    let marked = '';
    let last = 0;
    for (const index of [...indices].sort((a, b) => a - b)) {
      const { position } = matches[index];
      marked +=
        source.slice(last, position) + String.fromCodePoint(MARKER + index);
      last = position;
      if (afterFirst) {
        const end =
          position + String.fromCodePoint(source.codePointAt(position)!).length;
        marked +=
          source.slice(last, end) +
          String.fromCodePoint(MARKER + MARKERS + index);
        last = end;
      }
    }
    return marked + source.slice(last);
  }

  /**
   * A text without its markers, the offset of the marker before each match,
   * and the offset of the marker after its first character.
   */
  function removeMarkers(marked: string): {
    text: string;
    offsets: Map<number, number>;
    afterFirst: Map<number, number>;
  } {
    let text = '';
    const offsets = new Map<number, number>();
    const afterFirst = new Map<number, number>();
    for (const character of marked) {
      const code = character.codePointAt(0)!;
      if (code >= MARKER && code < MARKER + MARKERS) {
        offsets.set(code - MARKER, text.length);
      } else if (code >= MARKER + MARKERS && code < MARKER + 2 * MARKERS) {
        afterFirst.set(code - MARKER - MARKERS, text.length);
      } else {
        text += character;
      }
    }
    return { text, offsets, afterFirst };
  }

  /**
   * The source matches in each formula of a source, in order, or `null` when
   * the markers change the formulas.
   */
  function findMembers(
    source: string,
    matches: ReadonlyArray<ISearchMatch>,
    renderer: IMarkdownRenderer
  ): number[][] | null {
    if (!renderer.latexTypesetter) {
      // The cell shows formulas as they are written, in its text
      return [];
    }
    if (matches.length > MARKERS) {
      return null;
    }
    const options = renderer.latexTypesetter.mathParseOptions;
    const math = removeMath(source, options).math;
    const marked = removeMath(
      addMarkers(
        source,
        matches,
        matches.map((_, i) => i)
      ),
      options
    ).math;
    if (marked.length !== math.length) {
      return null;
    }
    const members: number[][] = [];
    for (let i = 0; i < math.length; i++) {
      const { text, offsets } = removeMarkers(marked[i]);
      if (text !== math[i]) {
        return null;
      }
      members.push([...offsets.keys()]);
    }
    return members;
  }
}
