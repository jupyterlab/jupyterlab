// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*
  Parts of the implementation of the search in this file were derived from
  CodeMirror's search at:
  https://github.com/codemirror/CodeMirror/blob/c2676685866c571a1c9c82cb25018cc08b4d42b2/addon/search/search.js
  which is licensed with the following license:

  MIT License

  Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

import { ISearchMatch } from '@jupyterlab/documentsearch';
import { CodeMirrorEditor } from './editor';
import {
  EditorSelection,
  Extension,
  StateEffect,
  StateEffectType,
  StateField
} from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  GenericSearchProvider,
  IBaseSearchProvider,
  IFilters,
  IReplaceOptions,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { ISignal, Signal } from '@lumino/signaling';
import { ISharedText, SourceChange } from '@jupyter/ydoc';

/**
 * Defines from which position the search should be executed.
 * - `'selection'` - search from selection head/anchor (depending on search direction)
 * - `'previous-match'` - search from previous match
 * - `'auto'` - search from selection if editor is focused or previous match otherwise
 * - `'selection-start'` - search from selection head/anchor whichever is smaller
 * - `'start'` - from start of the editor
 */
export type SearchStartAnchor =
  | 'auto'
  | 'selection'
  | 'selection-start'
  | 'previous-match'
  | 'start';

interface IHighlightMatchOptions {
  /**
   * Whether the highlighted match should be scrolled into view.
   * Defaults to `true`.
   */
  scroll?: boolean;
  /**
   * Whether the user cursor should be moved to select the match.
   * `protectSelection` flag takes precedence over this option.
   * Defaults to `true`.
   */
  select?: boolean;
}

export interface IHighlightAdjacentMatchOptions extends IHighlightMatchOptions {
  /**
   * What should be used as an anchor when searching for adjacent match.
   * Defaults to `'auto'`.
   */
  from?: SearchStartAnchor;
}

/**
 * Search provider for editors.
 */
export abstract class EditorSearchProvider<
  T extends CodeEditor.IModel = CodeEditor.IModel
> implements IBaseSearchProvider
{
  /**
   * Constructor
   */
  constructor() {
    this.currentIndex = null;
    this._stateChanged = new Signal<IBaseSearchProvider, void>(this);
  }

  /**
   * CodeMirror search highlighter
   */
  protected get cmHandler(): CodeMirrorSearchHighlighter {
    if (!this._cmHandler) {
      this._cmHandler = new CodeMirrorSearchHighlighter(
        this.editor as CodeMirrorEditor
      );
    }
    return this._cmHandler;
  }

  /**
   * Text editor
   */
  protected abstract get editor(): CodeEditor.IEditor | null;
  /**
   * Editor content model
   */
  protected abstract get model(): T;

  /**
   * Changed signal to be emitted when search matches change.
   */
  get stateChanged(): ISignal<IBaseSearchProvider, void> {
    return this._stateChanged;
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
  get matchesCount(): number {
    return this.isActive ? this.cmHandler.matches.length : 0;
  }

  /**
   * Clear currently highlighted match
   */
  clearHighlight(): Promise<void> {
    this.currentIndex = null;
    this.cmHandler.clearHighlight();

    return Promise.resolve();
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
    if (this._isActive === v) {
      return;
    }
    this._isActive = v;
    if (this._isActive) {
      if (this.query !== null) {
        await this.startQuery(this.query, this.filters);
      }
    } else {
      await this.endQuery();
    }
  }

  /**
   * Set whether search should be limited to specified text selection.
   */
  async setSearchSelection(selection: CodeEditor.IRange | null): Promise<void> {
    if (this._inSelection === selection) {
      return;
    }
    this._inSelection = selection;
    await this.updateCodeMirror(this.model.sharedModel.getSource());
    this._stateChanged.emit();
  }

  /**
   * Set whether user selection should be protected from modifications.
   *
   * If disabled, the selection will be updated on search and on editor focus
   * to cover the current match. We need to protect selection from modifications
   * for both: search in text and search in cells; since `setSearchSelection`
   * is only telling us about search in text, we need to have an additional
   * way to signal that either search in text or in cells is active, or for
   * any other reason selection range should be protected.
   */
  setProtectSelection(v: boolean) {
    this.cmHandler.protectSelection = v;
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(query: RegExp | null, filters?: IFilters): Promise<void> {
    this.query = query;
    this.filters = filters;

    // Search input
    const content = this.model.sharedModel.getSource();
    await this.updateCodeMirror(content);
    this.model.sharedModel.changed.connect(this.onSharedModelChanged, this);
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    await this.clearHighlight();
    await this.cmHandler.endQuery();
    this.currentIndex = null;
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
    if (this.matchesCount === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      let match = await this.cmHandler.highlightNext(options);
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        // Note: the loop logic is only used in single-editor (e.g. file editor)
        // provider sub-classes, notebook has its own loop logic and ignores
        // `currentIndex` as set here.
        this.currentIndex = loop ? 0 : null;
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
  async highlightPrevious(
    loop = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    if (this.matchesCount === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      let match = await this.cmHandler.highlightPrevious(options);
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.currentIndex = loop ? this.matchesCount - 1 : null;
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
   * The caller of this method is expected to call `highlightNext` if after
   * calling `replaceCurrentMatch()` attribute `this.currentIndex` is null.
   * It is necessary to let the caller handle highlighting because this
   * method is used in composition pattern (search engine of notebook cells)
   * and highlighting on the composer (notebook) level needs to switch to next
   * engine (cell) with matches.
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    if (
      this.currentIndex !== null &&
      this.currentIndex < this.cmHandler.matches.length
    ) {
      const match = this.getCurrentMatch();
      if (!match) {
        this.currentIndex = null;
      } else {
        const substitutedText = options?.regularExpression
          ? match!.text.replace(this.query!, newText)
          : newText;
        const insertText = options?.preserveCase
          ? GenericSearchProvider.preserveCase(match.text, substitutedText)
          : substitutedText;

        this.model.sharedModel.updateSource(
          match!.position,
          match!.position + match!.text.length,
          insertText
        );

        // Regenerate the match list, then iterate through it.
        return new Promise((resolve, reject) => {
          this.updateCodeMirror(this.model.sharedModel.getSource())
            .then(() => {
              const allMatches = this.cmHandler.matches;
              const positionAfterReplacement =
                match!.position + insertText.length;
              let nextMatchFound = false;
              for (
                let matchIdx = this.currentIndex || 0;
                matchIdx < allMatches.length;
                matchIdx++
              ) {
                if (allMatches[matchIdx].position >= positionAfterReplacement) {
                  this.currentIndex = matchIdx;
                  nextMatchFound = true;
                  break;
                }

                // Move the highlight forward from the previous match, not looping.
                void this.highlightNext(false, { from: 'previous-match' });
              }
              if (!nextMatchFound) {
                this.currentIndex = null; // No more matches in this string
              }
              resolve(true);
            })
            .catch(err => {
              const errorMessage = `Failed to regenerate match list: ${err}`;
              console.error(errorMessage);
              reject(errorMessage);
            });
        });
      }
    }

    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    let occurred = this.cmHandler.matches.length > 0;
    let src = this.model.sharedModel.getSource();
    let lastEnd = 0;
    const finalSrc = this.cmHandler.matches.reduce((agg, match) => {
      const start = match.position as number;
      const end = start + match.text.length;
      const substitutedText = options?.regularExpression
        ? match!.text.replace(this.query!, newText)
        : newText;
      const insertText = options?.preserveCase
        ? GenericSearchProvider.preserveCase(match.text, substitutedText)
        : substitutedText;
      const newStep = `${agg}${src.slice(lastEnd, start)}${insertText}`;
      lastEnd = end;
      return newStep;
    }, '');

    if (occurred) {
      this.cmHandler.matches = [];
      this.currentIndex = null;
      this.model.sharedModel.setSource(`${finalSrc}${src.slice(lastEnd)}`);
    }
    return Promise.resolve(occurred);
  }

  /**
   * Get the current match if it exists.
   *
   * @returns The current match
   */
  getCurrentMatch(): ISearchMatch | undefined {
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
   * @param emitter Source of the change
   * @param changes Source change
   */
  protected async onSharedModelChanged(
    emitter: ISharedText,
    changes: SourceChange
  ): Promise<void> {
    if (changes.sourceChange) {
      await this.updateCodeMirror(emitter.getSource());
      this._stateChanged.emit();
    }
  }

  /**
   * Update matches
   */
  protected async updateCodeMirror(content: string) {
    if (this.query !== null && this.isActive) {
      const allMatches = await TextSearchEngine.search(this.query, content);
      if (this._inSelection) {
        const editor = this.editor!;
        const start = editor.getOffsetAt(this._inSelection.start);
        const end = editor.getOffsetAt(this._inSelection.end);
        this.cmHandler.matches = allMatches.filter(
          match => match.position >= start && match.position <= end
        );
        // A special case to always have a current match when in line selection mode.
        if (
          this.cmHandler.currentIndex === null &&
          this.cmHandler.matches.length > 0
        ) {
          await this.cmHandler.highlightNext({
            from: 'selection',
            select: false,
            scroll: false
          });
        }
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.cmHandler.matches = allMatches;
      }
    } else {
      this.cmHandler.matches = [];
    }
  }

  /**
   * Current match index
   */
  protected currentIndex: number | null = null;
  /**
   * Current search filters
   */
  protected filters: IFilters | undefined;
  /**
   * Current search query
   */
  protected query: RegExp | null = null;
  // Needs to be protected so subclass can emit the signal too.
  protected _stateChanged: Signal<IBaseSearchProvider, void>;
  private _isActive = true;
  private _inSelection: CodeEditor.IRange | null = null;
  private _isDisposed = false;
  private _cmHandler: CodeMirrorSearchHighlighter | null = null;
}

/**
 * Matches to be highlighted.
 */
interface IEffectValue {
  matches: ISearchMatch[];
  currentMatch: ISearchMatch | null;
}

/**
 * Helper class to highlight texts in a code mirror editor.
 *
 * Highlighted texts (aka `matches`) must be provided through
 * the `matches` attributes.
 *
 * **NOTES:**
 * - to retain the selection visibility `drawSelection` extension is needed.
 * - highlighting starts from the cursor (if editor is focused and `from` is set
 *   to `'auto'`, cursor moved, or `from` argument is set to `'selection'` or
 *   `'selection-start'`), or from last "current" match otherwise.
 * - `currentIndex` is the (readonly) source of truth for the current match.
 */
export class CodeMirrorSearchHighlighter {
  /**
   * Constructor
   *
   * @param editor The CodeMirror editor
   */
  constructor(editor: CodeMirrorEditor | null) {
    this._cm = editor;
    this._matches = new Array<ISearchMatch>();
    this._currentIndex = null;

    this._highlightEffect = StateEffect.define<IEffectValue>({
      map: (value, mapping) => {
        const transform = (v: ISearchMatch) => ({
          text: v.text,
          position: mapping.mapPos(v.position)
        });
        return {
          matches: value.matches.map(transform),
          currentMatch: value.currentMatch
            ? transform(value.currentMatch)
            : null
        };
      }
    });
    this._highlightMark = Decoration.mark({ class: 'cm-searching' });
    this._currentMark = Decoration.mark({ class: 'jp-current-match' });

    this._highlightField = StateField.define<DecorationSet>({
      create: () => {
        return Decoration.none;
      },
      update: (highlights, transaction) => {
        highlights = highlights.map(transaction.changes);
        for (let ef of transaction.effects) {
          if (ef.is(this._highlightEffect)) {
            const e = ef as StateEffect<IEffectValue>;
            if (e.value.matches.length) {
              // Note: nesting will vary; sometimes `.cm-searching` will be
              // inside `.jp-current-match`, sometime the other way round.
              highlights = highlights.update({
                add: e.value.matches.map(m =>
                  this._highlightMark.range(
                    m.position,
                    m.position + m.text.length
                  )
                ),
                // filter out old marks
                filter: () => false
              });
              highlights = highlights.update({
                add: e.value.currentMatch
                  ? [
                      this._currentMark.range(
                        e.value.currentMatch.position,
                        e.value.currentMatch.position +
                          e.value.currentMatch.text.length
                      )
                    ]
                  : []
              });
            } else {
              highlights = Decoration.none;
            }
          }
        }
        return highlights;
      },
      provide: f => EditorView.decorations.from(f)
    });

    this._domEventHandlers = EditorView.domEventHandlers({
      focus: () => {
        // Set cursor on active match when editor gets focused.
        this._selectCurrentMatch();
      }
    });
  }

  /**
   * The current index of the selected match.
   */
  get currentIndex(): number | null {
    return this._currentIndex;
  }

  /**
   * The list of matches
   */
  get matches(): ISearchMatch[] {
    return this._matches;
  }
  set matches(v: ISearchMatch[]) {
    this._matches = v;
    if (
      this._currentIndex !== null &&
      this._currentIndex > this._matches.length
    ) {
      this._currentIndex = this._matches.length > 0 ? 0 : null;
    }
    this._highlightCurrentMatch({ select: false });
  }

  private _current: ISearchMatch | null = null;

  /**
   * Whether the cursor/selection should not be modified.
   */
  get protectSelection(): boolean {
    return this._protectSelection;
  }
  set protectSelection(v: boolean) {
    this._protectSelection = v;
  }
  private _protectSelection: boolean;

  /**
   * Clear all highlighted matches
   */
  clearHighlight(): void {
    this._currentIndex = null;
    this._highlightCurrentMatch();
  }

  /**
   * Clear the highlighted matches.
   */
  endQuery(): Promise<void> {
    this._currentIndex = null;
    this._matches = [];

    if (this._cm) {
      this._cm.editor.dispatch({
        effects: this._highlightEffect.of({ matches: [], currentMatch: null })
      });
    }

    return Promise.resolve();
  }

  /**
   * Highlight the next match
   *
   * @returns The next match if available
   */
  highlightNext(
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    this._currentIndex = this._findNext(false, options?.from ?? 'auto');
    this._highlightCurrentMatch(options);
    return Promise.resolve(
      this._currentIndex !== null
        ? this._matches[this._currentIndex]
        : undefined
    );
  }

  /**
   * Highlight the previous match
   *
   * @returns The previous match if available
   */
  highlightPrevious(
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    this._currentIndex = this._findNext(true, options?.from ?? 'auto');
    this._highlightCurrentMatch(options);
    return Promise.resolve(
      this._currentIndex !== null
        ? this._matches[this._currentIndex]
        : undefined
    );
  }

  /**
   * Set the editor
   *
   * @param editor Editor
   */
  setEditor(editor: CodeMirrorEditor): void {
    if (this._cm) {
      throw new Error('CodeMirrorEditor already set.');
    } else {
      this._cm = editor;
      if (this._currentIndex !== null) {
        this._highlightCurrentMatch();
      }
      this._cm.editor.dispatch({
        effects: StateEffect.appendConfig.of(this._domEventHandlers)
      });
      this._refresh();
    }
  }

  private _selectCurrentMatch(scroll = true): void {
    // This method has two responsibilities:
    // 1) Scroll the current match into the view - useful for long lines,
    //    and file editors with more lines that fit on the screen
    // 2) When user has focus on the editor (not search box) and presses
    //    ctrl + g/ctrl + shift + g to jump to next match they want their
    //    cursor to jump too.
    // We execute (1) and (2) together as CodeMirror has a special code path
    // to handle both in a single dispatch.
    // The (2) case is inapplicable to search in selection mode, as it would
    // invalidate the query selection, so in that case we only execute (1).
    const match = this._current;
    if (!match) {
      return;
    }
    if (!this._cm) {
      return;
    }
    const cursor = {
      anchor: match.position,
      head: match.position + match.text.length
    };
    const selection = this._cm.editor.state.selection.main;
    if (
      (selection.from === match.position &&
        selection.to === match.position + match.text.length) ||
      this._protectSelection
    ) {
      // Correct selection is already set or search is restricted to selection:
      // scroll without changing the selection.
      if (scroll) {
        this._cm.editor.dispatch({
          effects: EditorView.scrollIntoView(
            EditorSelection.range(cursor.anchor, cursor.head)
          )
        });
        return;
      }
    } else {
      this._cm.editor.dispatch({
        selection: cursor,
        scrollIntoView: scroll
      });
    }
  }

  private _highlightCurrentMatch(options?: IHighlightMatchOptions): void {
    if (!this._cm) {
      // no-op
      return;
    }

    // Highlight the current index
    if (this._currentIndex !== null) {
      const match = this.matches[this._currentIndex];
      this._current = match;
      // We do not change selection nor scroll if:
      // - user is selecting text,
      // - document was modified
      if (options?.select ?? true) {
        if (this._cm.hasFocus()) {
          // If editor is focused we actually set the cursor on the match.
          this._selectCurrentMatch(options?.scroll ?? true);
        } else if (options?.scroll ?? true) {
          // otherwise we just scroll to preserve the selection.
          this._cm.editor.dispatch({
            effects: EditorView.scrollIntoView(match.position)
          });
        }
      }
    } else {
      this._current = null;
    }
    this._refresh();
  }

  private _refresh(): void {
    if (!this._cm) {
      // no-op
      return;
    }
    let effects: StateEffect<unknown>[] = [
      this._highlightEffect.of({
        matches: this.matches,
        currentMatch: this._current
      })
    ];

    if (!this._cm!.state.field(this._highlightField, false)) {
      effects.push(StateEffect.appendConfig.of([this._highlightField]));
    }
    this._cm!.editor.dispatch({ effects });
  }

  private _findNext(
    reverse: boolean,
    from: SearchStartAnchor = 'auto'
  ): number | null {
    if (this._matches.length === 0) {
      // No-op
      return null;
    }

    // If the editor has not be instantiated yet (e.g. a cell that has not yet be seen in the viewport),
    // force the behavior
    if (!this._cm && !['previous-match', 'start'].includes(from)) {
      from = 'previous-match';
    }

    let lastPosition = 0;
    if (
      (from === 'auto' && (this._cm?.hasFocus() ?? false)) ||
      from === 'selection'
    ) {
      const cursor = this._cm!.state.selection.main;
      lastPosition = reverse ? cursor.anchor : cursor.head;
    } else if (from === 'selection-start') {
      const cursor = this._cm!.state.selection.main;
      lastPosition = Math.min(cursor.anchor, cursor.head);
    } else if (from === 'start') {
      lastPosition = 0;
    } else if (this._current) {
      lastPosition = reverse
        ? this._current.position
        : this._current.position + this._current.text.length;
    }
    if (lastPosition === 0 && reverse && this.currentIndex === null) {
      // The default position is (0, 0) but we want to start from the end in that case
      // Fallback to the end of the latest match if the editor is not instantiated
      lastPosition =
        this._cm?.doc.length ??
        endLastMatch(this._matches[this._matches.length - 1]);
    }

    const position = lastPosition;

    let found = Utils.findNext(
      this._matches,
      position,
      0,
      this._matches.length - 1
    );

    if (found === null) {
      // Don't loop
      return reverse ? this._matches.length - 1 : null;
    }

    if (reverse) {
      found -= 1;
      if (found < 0) {
        // Don't loop
        return null;
      }
    }

    return found;

    function endLastMatch(lastMatch?: ISearchMatch): number {
      return lastMatch ? lastMatch.position + lastMatch.text.length : 0;
    }
  }

  private _cm: CodeMirrorEditor | null;
  private _currentIndex: number | null;
  private _matches: ISearchMatch[];
  private _highlightEffect: StateEffectType<IEffectValue>;
  private _highlightMark: Decoration;
  private _currentMark: Decoration;
  private _highlightField: StateField<DecorationSet>;
  private _domEventHandlers: Extension;
}

/**
 * Helpers namespace
 */
namespace Utils {
  /**
   * Find the closest match at `position` just after it.
   *
   * #### Notes
   * Search is done using a binary search algorithm
   *
   * @param matches List of matches
   * @param position Searched position
   * @param lowerBound Lower range index
   * @param higherBound High range index
   * @returns The next match or null if none exists
   */
  export function findNext(
    matches: ISearchMatch[],
    position: number,
    lowerBound = 0,
    higherBound = Infinity
  ): number | null {
    higherBound = Math.min(matches.length - 1, higherBound);

    while (lowerBound <= higherBound) {
      let middle = Math.floor(0.5 * (lowerBound + higherBound));
      const currentPosition = matches[middle].position;

      if (currentPosition < position) {
        lowerBound = middle + 1;
        if (
          lowerBound < matches.length &&
          matches[lowerBound].position > position
        ) {
          return lowerBound;
        }
      } else if (currentPosition > position) {
        higherBound = middle - 1;
        if (higherBound > 0 && matches[higherBound].position < position) {
          return middle;
        }
      } else {
        return middle;
      }
    }

    // Next could be the first item
    const first = lowerBound > 0 ? lowerBound - 1 : 0;
    const match = matches[first];
    return match.position >= position ? first : null;
  }
}
