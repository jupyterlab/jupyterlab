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
import { GenericSearchProvider } from '@jupyterlab/documentsearch';
import type { OutputArea } from '@jupyterlab/outputarea';
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
  }

  /**
   * Clear currently highlighted match
   */
  async clearHighlight(): Promise<void> {
    this._currentMatchInRendered = false;
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
      return super.highlightNext(loop, options);
    }

    return this._showCurrentMatch(
      await super.highlightNext(loop, options),
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
      return super.highlightPrevious(loop, options);
    }

    return this._showCurrentMatch(
      await super.highlightPrevious(loop, options),
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
    // If the cell was manually un-rendered while a rendered match was
    // current, keep the search on that source match instead of dropping
    // it: the editor opens with the same match highlighted. The
    // highlight is re-applied asynchronously so a replace un-rendering
    // the cell first can run before the editor is repositioned.
    const renderedIndex = this._currentMatchInRendered
      ? this.currentIndex
      : null;
    if (!rendered && renderedIndex !== null && this.isActive) {
      const sourceMatch = this.cmHandler.matches[renderedIndex];
      if (sourceMatch) {
        void this._highlightEditorMatch(renderedIndex, sourceMatch);
      }
    } else if (!this._unrenderedByHighlight) {
      this.currentIndex = null;
    }
    this._unrenderedByHighlight = false;
    // The rendered matches are rebuilt when the cell renders again, so a
    // match marked in the rendered text is no longer current.
    this._currentMatchInRendered = false;
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

    const renderedIndex = this._pairMatches().get(this.currentIndex);
    if (renderedIndex === undefined) {
      // The rendered text does not show this match: show the editor.
      this._currentMatchInRendered = false;
      await this.renderedProvider.clearHighlight();
      if (cell.rendered && this._canUnrender()) {
        this._unrenderedByHighlight = true;
        const waitForRendered = signalToPromise(cell.renderedChanged);
        cell.rendered = false;
        await waitForRendered;
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
   * Mark the rendered match at the given index as the current match.
   *
   * @param index - Index of the rendered match to mark.
   * @param scroll - Whether to scroll the match into view.
   * @returns The marked match, if any.
   */
  private async _highlightRenderedMatch(
    index: number,
    scroll: boolean
  ): Promise<IHTMLSearchMatch | undefined> {
    const provider = this.renderedProvider;
    // Without a marked match, the first step forward marks the first match
    let steps = index - (provider.currentMatchIndex ?? -1);
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
   * Re-highlight in the editor the source match that was current in the
   * rendered text. The editor highlighter has no direct "highlight match
   * at index" API, so the steps start from the beginning of the source
   * and walk forward to the preserved index.
   *
   * @param index Index of the preserved source match.
   * @param match The preserved source match.
   */
  private async _highlightEditorMatch(
    index: number,
    match: ISearchMatch
  ): Promise<void> {
    // Wait a turn so a replace un-rendering the cell first can update
    // the source: the notebook un-renders the cell before replacing the
    // current match, and the replace must own the current match then.
    await Promise.resolve();
    if (!this.isActive || (this.cell as MarkdownCell).rendered) {
      return;
    }
    // Abort if the source changed under the preserved match (a replace
    // ran): the match is gone and the replace already positioned the
    // search on the next match.
    const source = this.model.sharedModel.getSource();
    if (
      source.slice(match.position, match.position + match.text.length) !==
      match.text
    ) {
      return;
    }
    await this.highlightNext(false, { from: 'start' });
    while (this.currentIndex !== null && this.currentIndex < index) {
      await this.highlightNext(false, { from: 'previous-match' });
    }
  }

  /**
   * Pair each match in the rendered text with the source match it shows.
   * Returns a map from source match index to rendered match index.
   *
   * The rendered text does not keep source positions, so the matches are
   * paired in order, after the source matches in Markdown syntax which the
   * rendered text does not show, such as a link destination, are left out.
   * The map is empty unless the two lists then hold the same texts: a
   * difference comes from a source match in syntax which is not listed in
   * `_hiddenSourceRanges()`, such as an HTML attribute, and pairing around it
   * would mark another occurrence than the one Replace changes.
   *
   * @returns Map from source match index to rendered match index.
   */
  private _pairMatches(): Map<number, number> {
    const rendered = this.renderedProvider.matches;
    const source = this.cmHandler.matches;
    const hidden = this._hiddenSourceRanges();
    const shown: number[] = [];
    source.forEach(({ position }, index) => {
      if (
        !hidden.some(range => position >= range.start && position < range.end)
      ) {
        shown.push(index);
      }
    });
    const paired = new Map<number, number>();
    if (
      shown.length === rendered.length &&
      shown.every((index, i) => source[index].text === rendered[i].text)
    ) {
      shown.forEach((index, i) => paired.set(index, i));
    }
    return paired;
  }

  /**
   * Ranges of the cell source that the rendered text does not show: link
   * and image destinations, reference definitions, reference labels and
   * HTML comments. A match starting in one of these ranges is not visible
   * in the rendered text.
   *
   * @returns Source ranges the rendered text does not show.
   */
  private _hiddenSourceRanges(): Array<{ start: number; end: number }> {
    const source = this.model.sharedModel.getSource();
    const ranges: Array<{ start: number; end: number }> = [];
    // Link and image destinations: [text](destination) and ![alt](destination).
    // For an image the alt text is not rendered either.
    for (const match of source.matchAll(/(!?)\[[^\]]*\]\(([^)]*)\)/g)) {
      const destination = match[2] ?? '';
      const openParen = (match.index ?? 0) + match[0].lastIndexOf('(');
      ranges.push({
        start: match[1] === '!' ? (match.index ?? 0) : openParen,
        end: openParen + destination.length + 2
      });
    }
    // Reference definitions: the whole [label]: destination line.
    for (const match of source.matchAll(
      /^[ \t]{0,3}\[[^\]]+\]:[ \t]*\S.*$/gm
    )) {
      ranges.push({
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length
      });
    }
    // Reference labels: the second [...] in [text][label] and [text][].
    for (const match of source.matchAll(/\[[^\]]*\]\[([^\]]*)\]/g)) {
      const label = match[1] ?? '';
      const openBracket = (match.index ?? 0) + match[0].lastIndexOf('[');
      ranges.push({
        start: openBracket,
        end: openBracket + label.length + 2
      });
    }
    // HTML comments.
    for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) {
      ranges.push({
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length
      });
    }
    return ranges;
  }

  protected renderedProvider: GenericSearchProvider;
  private _unrenderedByHighlight = false;
  private _currentMatchInRendered = false;
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
