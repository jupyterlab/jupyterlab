// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StringExt } from '@lumino/algorithm';
import { JSONExt, ReadonlyPartialJSONArray } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { CompletionHandler } from './handler';
import { Completer } from './widget';

/**
 * Escape HTML by native means of the browser.
 */
function escapeHTML(text: string) {
  const node = document.createElement('span');
  node.textContent = text;
  return node.innerHTML;
}

/**
 * An implementation of a completer model.
 */
export class CompleterModel implements Completer.IModel {
  /**
   * A signal emitted when state of the completer menu changes.
   */
  get stateChanged(): ISignal<this, void> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when query string changes (at invocation, or as user types).
   */
  get queryChanged(): ISignal<this, Completer.IQueryChange> {
    return this._queryChanged;
  }

  /**
   * The original completion request details.
   */
  get original(): Completer.ITextState | null {
    return this._original;
  }
  set original(newValue: Completer.ITextState | null) {
    const unchanged =
      this._original === newValue ||
      (this._original &&
        newValue &&
        JSONExt.deepEqual(newValue, this._original));
    if (unchanged) {
      return;
    }

    this._reset();

    // Set both the current and original to the same value when original is set.
    this._current = this._original = newValue;

    this._stateChanged.emit(undefined);
  }

  /**
   * The current text change details.
   */
  get current(): Completer.ITextState | null {
    return this._current;
  }
  set current(newValue: Completer.ITextState | null) {
    const unchanged =
      this._current === newValue ||
      (this._current && newValue && JSONExt.deepEqual(newValue, this._current));

    if (unchanged) {
      return;
    }

    const original = this._original;

    // Original request must always be set before a text change. If it isn't
    // the model fails silently.
    if (!original) {
      return;
    }

    const cursor = this._cursor;

    // Cursor must always be set before a text change. This happens
    // automatically in the completer handler, but since `current` is a public
    // attribute, this defensive check is necessary.
    if (!cursor) {
      return;
    }

    const current = (this._current = newValue);

    if (!current) {
      this._stateChanged.emit(undefined);
      return;
    }

    const originalLine = original.text.split('\n')[original.line];
    const currentLine = current.text.split('\n')[current.line];

    // If the text change means that the original start point has been preceded,
    // then the completion is no longer valid and should be reset.
    if (!this._subsetMatch && currentLine.length < originalLine.length) {
      this.reset(true);
      return;
    }

    const { start, end } = cursor;
    // Clip the front of the current line.
    let query = current.text.substring(start);
    // Clip the back of the current line by calculating the end of the original.
    const ending = original.text.substring(end);
    query = query.substring(0, query.lastIndexOf(ending));
    this._query = query;
    this.processedItemsCache = null;
    this._processedToOriginalItem = null;
    this._queryChanged.emit({ newValue: this._query, origin: 'editorUpdate' });
    this._stateChanged.emit(undefined);
  }

  /**
   * The cursor details that the API has used to return matching options.
   */
  get cursor(): Completer.ICursorSpan | null {
    return this._cursor;
  }
  set cursor(newValue: Completer.ICursorSpan | null) {
    // Original request must always be set before a cursor change. If it isn't
    // the model fails silently.
    if (!this.original) {
      return;
    }
    this._cursor = newValue;
  }

  /**
   * The query against which items are filtered.
   */
  get query(): string {
    return this._query;
  }
  set query(newValue: string) {
    this._query = newValue;
    this.processedItemsCache = null;
    this._processedToOriginalItem = null;
    this._queryChanged.emit({ newValue: this._query, origin: 'setter' });
  }

  /**
   * A flag that is true when the model value was modified by a subset match.
   */
  get subsetMatch(): boolean {
    return this._subsetMatch;
  }
  set subsetMatch(newValue: boolean) {
    this._subsetMatch = newValue;
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * The list of visible items in the completer menu.
   *
   * #### Notes
   * This is a read-only property.
   * When overriding it is recommended to cache results in `processedItemsCache`
   * property which will be automatically nullified when needed.
   */
  completionItems(): CompletionHandler.ICompletionItems {
    if (!this.processedItemsCache) {
      let query = this._query;
      if (query) {
        const markedItems = this._markup(query);
        this.processedItemsCache = markedItems.map(it => it.processedItem);
        this._processedToOriginalItem = new WeakMap(
          markedItems.map(it => [it.processedItem, it.originalItem])
        );
      } else {
        this.processedItemsCache = this._completionItems.map(item => {
          return this._escapeItemLabel(item);
        });
        this._processedToOriginalItem = null;
      }
    }
    return this.processedItemsCache;
  }

  /**
   * Set the list of visible items in the completer menu, and append any
   * new types to KNOWN_TYPES.
   */
  setCompletionItems(newValue: CompletionHandler.ICompletionItems): void {
    if (
      JSONExt.deepEqual(
        newValue as unknown as ReadonlyPartialJSONArray,
        this._completionItems as unknown as ReadonlyPartialJSONArray
      )
    ) {
      return;
    }
    this._completionItems = newValue;
    this._orderedTypes = Private.findOrderedCompletionItemTypes(
      this._completionItems
    );
    this.processedItemsCache = null;
    this._processedToOriginalItem = null;
    this._stateChanged.emit(undefined);
  }

  /**
   * The map from identifiers (a.b) to types (function, module, class, instance,
   * etc.).
   *
   * #### Notes
   * A type map is currently only provided by the latest IPython kernel using
   * the completer reply metadata field `_jupyter_types_experimental`. The
   * values are completely up to the kernel.
   *
   */
  typeMap(): Completer.TypeMap {
    return this._typeMap;
  }

  /**
   * An ordered list of all the known types in the typeMap.
   *
   * #### Notes
   * To visually encode the types of the completer matches, we assemble an
   * ordered list. This list begins with:
   * ```
   * ['function', 'instance', 'class', 'module', 'keyword']
   * ```
   * and then has any remaining types listed alphabetically. This will give
   * reliable visual encoding for these known types, but allow kernels to
   * provide new types.
   */
  orderedTypes(): string[] {
    return this._orderedTypes;
  }

  /**
   * Handle a cursor change.
   */
  handleCursorChange(change: Completer.ITextState): void {
    // If there is no active completion, return.
    if (!this._original) {
      return;
    }

    const { column, line } = change;
    const { current, original } = this;

    if (!original) {
      return;
    }

    // If a cursor change results in a the cursor being on a different line
    // than the original request, cancel.
    if (line !== original.line) {
      this.reset(true);
      return;
    }

    // If a cursor change results in the cursor being set to a position that
    // precedes the original column, cancel.
    if (column < original.column) {
      this.reset(true);
      return;
    }

    const { cursor } = this;

    if (!cursor || !current) {
      return;
    }

    // If a cursor change results in the cursor being set to a position beyond
    // the end of the area that would be affected by completion, cancel.
    const cursorDelta = cursor.end - cursor.start;
    const originalLine = original.text.split('\n')[original.line];
    const currentLine = current.text.split('\n')[current.line];
    const inputDelta = currentLine.length - originalLine.length;

    if (column > original.column + cursorDelta + inputDelta) {
      this.reset(true);
      return;
    }
  }

  /**
   * Handle a text change.
   */
  handleTextChange(change: Completer.ITextState): void {
    const original = this._original;
    // If there is no active completion, return.
    if (!original) {
      return;
    }

    const { text, column, line } = change;
    const last = text.split('\n')[line][column - 1];

    // If last character entered is not whitespace or if the change column is
    // greater than or equal to the original column, update completion.
    if ((last && last.match(/\S/)) || change.column >= original.column) {
      this.current = change;
      return;
    }

    // If final character is whitespace, reset completion.
    this.reset(false);
  }

  /**
   * Create a resolved patch between the original state and a patch string.
   *
   * @param patch - The patch string to apply to the original value.
   *
   * @returns A patched text change or undefined if original value did not exist.
   */
  createPatch(patch: string): Completer.IPatch | undefined {
    const original = this._original;
    const cursor = this._cursor;
    const current = this._current;
    if (!original || !cursor || !current) {
      return undefined;
    }

    let { start, end } = cursor;
    // Also include any filtering/additional-typing that has occurred
    // since the completion request in the patched length.
    end = end + (current.text.length - original.text.length);

    return { start, end, value: patch };
  }

  /**
   * Reset the state of the model and emit a state change signal.
   *
   * @param hard - Reset even if a subset match is in progress.
   */
  reset(hard = false): void {
    // When the completer detects a common subset prefix for all options,
    // it updates the model and sets the model source to that value, triggering
    // a reset. Unless explicitly a hard reset, this should be ignored.
    if (!hard && this._subsetMatch) {
      return;
    }
    this._reset();
    this._stateChanged.emit(undefined);
  }

  /**
   * Check if CompletionItem matches against query.
   * Highlight matching prefix by adding <mark> tags.
   */
  private _markup(query: string): {
    processedItem: CompletionHandler.ICompletionItem;
    originalItem: CompletionHandler.ICompletionItem;
  }[] {
    const items = this._completionItems;
    let results: Private.ICompletionMatch[] = [];
    for (const originalItem of items) {
      // See if label matches query string
      // With ICompletionItems, the label may include parameters,
      // so we exclude them from the matcher.
      // e.g. Given label `foo(b, a, r)` and query `bar`,
      // don't count parameters, `b`, `a`, and `r` as matches.
      const index = originalItem.label.indexOf('(');
      const text =
        index > -1
          ? originalItem.label.substring(0, index)
          : originalItem.label;
      const match = StringExt.matchSumOfSquares(escapeHTML(text), query);
      // Filter non-matching items.
      if (match) {
        // Highlight label text if there's a match
        let marked = StringExt.highlight(
          escapeHTML(originalItem.label),
          match.indices,
          Private.mark
        );
        // Use `Object.assign` to evaluate getters.
        const highlightedItem = Object.assign({}, originalItem);
        highlightedItem.label = marked.join('');
        highlightedItem.insertText =
          originalItem.insertText ?? originalItem.label;
        results.push({
          item: highlightedItem,
          score: match.score,
          originalItem
        });
      }
    }
    results.sort(Private.scoreCmp);

    // Extract only the item (dropping the extra score attribute to not leak
    // implementation details to JavaScript callers.
    return results.map(match => ({
      processedItem: match.item,
      originalItem: match.originalItem
    }));
  }

  /**
   * Lazy load missing data of an item.
   * @param indexOrValue - the item or its index
   * @remarks
   * Resolving item by index will be deprecated in
   * the JupyterLab 5.0 and removed in JupyterLab 6.0.
   *
   * @return Return `undefined` if the completion item with `activeIndex` index can not be found.
   *  Return a promise of `null` if another `resolveItem` is called. Otherwise return the
   * promise of resolved completion item.
   */
  resolveItem(
    indexOrValue: number | CompletionHandler.ICompletionItem
  ): Promise<CompletionHandler.ICompletionItem | null> | undefined {
    let processedItem: CompletionHandler.ICompletionItem | undefined;

    if (typeof indexOrValue === 'number') {
      const completionItems = this.completionItems();
      if (!completionItems || !completionItems[indexOrValue]) {
        return undefined;
      }
      processedItem = completionItems[indexOrValue];
    } else {
      processedItem = indexOrValue;
    }
    if (!processedItem) {
      return undefined;
    }

    let originalItem: CompletionHandler.ICompletionItem | undefined;
    if (this._processedToOriginalItem) {
      originalItem = this._processedToOriginalItem.get(processedItem);
    } else {
      originalItem = processedItem;
    }
    if (!originalItem) {
      return undefined;
    }
    return this._resolveItemByValue(originalItem);
  }

  /**
   * Lazy load missing data of a completion item.
   *
   * @param  completionItem - the item to be resolved
   * @return See `resolveItem` method
   */
  private _resolveItemByValue(
    completionItem: CompletionHandler.ICompletionItem
  ): Promise<CompletionHandler.ICompletionItem | null> {
    const current = ++this._resolvingItem;
    let resolvedItem: Promise<CompletionHandler.ICompletionItem>;
    if (completionItem.resolve) {
      let patch: Completer.IPatch | undefined;
      if (completionItem.insertText) {
        patch = this.createPatch(completionItem.insertText);
      }
      resolvedItem = completionItem.resolve(patch);
    } else {
      resolvedItem = Promise.resolve(completionItem);
    }
    return resolvedItem
      .then(activeItem => {
        // Escape the label it in place
        this._escapeItemLabel(activeItem, true);
        (
          Object.keys(activeItem) as Array<
            keyof CompletionHandler.ICompletionItem
          >
        ).forEach(
          <Key extends keyof CompletionHandler.ICompletionItem>(key: Key) => {
            completionItem[key] = activeItem[key];
          }
        );
        completionItem.resolve = undefined;
        if (current !== this._resolvingItem) {
          return Promise.resolve(null);
        }
        return activeItem;
      })
      .catch(e => {
        console.error(e);
        // Failed to resolve missing data, return the original item.
        return Promise.resolve(completionItem);
      });
  }

  /**
   * Escape item label, storing the original label and adding `insertText` if needed.
   * If escaping changes label creates a new item unless `inplace` is true.
   */
  private _escapeItemLabel(
    item: CompletionHandler.ICompletionItem,
    inplace: boolean = false
  ): CompletionHandler.ICompletionItem {
    const escapedLabel = escapeHTML(item.label);
    // If there was no insert text, use the original (unescaped) label.
    if (escapedLabel !== item.label) {
      const newItem = inplace ? item : Object.assign({}, item);
      newItem.insertText = item.insertText ?? item.label;
      newItem.label = escapedLabel;
      return newItem;
    }
    return item;
  }

  /**
   * Reset the state of the model.
   */
  private _reset(): void {
    const hadQuery = this._query;
    this._current = null;
    this._cursor = null;
    this._completionItems = [];
    this._original = null;
    this._query = '';
    this.processedItemsCache = null;
    this._processedToOriginalItem = null;
    this._subsetMatch = false;
    this._typeMap = {};
    this._orderedTypes = [];
    if (hadQuery) {
      this._queryChanged.emit({ newValue: this._query, origin: 'reset' });
    }
  }

  protected processedItemsCache: CompletionHandler.ICompletionItems | null =
    null;
  private _current: Completer.ITextState | null = null;
  private _cursor: Completer.ICursorSpan | null = null;
  private _isDisposed = false;
  private _completionItems: CompletionHandler.ICompletionItems = [];
  private _original: Completer.ITextState | null = null;
  private _query = '';
  private _subsetMatch = false;
  private _typeMap: Completer.TypeMap = {};
  private _orderedTypes: string[] = [];
  private _stateChanged = new Signal<this, void>(this);
  private _queryChanged = new Signal<this, Completer.IQueryChange>(this);

  /**
   * The weak map between a processed completion item with the original item.
   * It's used to keep track of original completion item in case of displaying
   * the completer with query.
   */
  private _processedToOriginalItem: WeakMap<
    CompletionHandler.ICompletionItem,
    CompletionHandler.ICompletionItem
  > | null = null;

  /**
   * A counter to cancel ongoing `resolveItem` call.
   */
  private _resolvingItem = 0;
}

/**
 * A namespace for completer model private data.
 */
namespace Private {
  /**
   * The list of known type annotations of completer matches.
   */
  const KNOWN_TYPES = ['function', 'instance', 'class', 'module', 'keyword'];

  /**
   * The map of known type annotations of completer matches.
   */
  const KNOWN_MAP = KNOWN_TYPES.reduce((acc, type) => {
    acc[type] = null;
    return acc;
  }, {} as Completer.TypeMap);

  /**
   * A filtered completion menu matching result.
   */
  export interface IMatch {
    /**
     * The raw text of a completion match.
     */
    raw: string;

    /**
     * A score which indicates the strength of the match.
     *
     * A lower score is better. Zero is the best possible score.
     */
    score: number;

    /**
     * The highlighted text of a completion match.
     */
    text: string;
  }

  /**
   * Mark a highlighted chunk of text.
   */
  export function mark(value: string): string {
    return `<mark>${value}</mark>`;
  }

  /**
   * A filtered completion matching result.
   */
  export interface ICompletionMatch {
    /**
     * The completion item data.
     */
    item: CompletionHandler.ICompletionItem;
    /**
     * A score which indicates the strength of the match.
     *
     * A lower score is better. Zero is the best possible score.
     */
    score: number;

    /**
     * The original completion item data.
     */
    originalItem: CompletionHandler.ICompletionItem;
  }

  /**
   * A sort comparison function for item match scores.
   *
   * #### Notes
   * This orders the items first based on score (lower is better), then
   * by locale order of the item text.
   */
  export function scoreCmp(a: ICompletionMatch, b: ICompletionMatch): number {
    const delta = a.score - b.score;
    if (delta !== 0) {
      return delta;
    }
    return a.item.insertText?.localeCompare(b.item.insertText ?? '') ?? 0;
  }

  /**
   * Compute a reliably ordered list of types for ICompletionItems.
   *
   * #### Notes
   * The resulting list always begins with the known types:
   * ```
   * ['function', 'instance', 'class', 'module', 'keyword']
   * ```
   * followed by other types in alphabetical order.
   *
   */
  export function findOrderedCompletionItemTypes(
    items: CompletionHandler.ICompletionItems
  ): string[] {
    const newTypeSet = new Set<string>();
    items.forEach(item => {
      if (
        item.type &&
        !KNOWN_TYPES.includes(item.type) &&
        !newTypeSet.has(item.type!)
      ) {
        newTypeSet.add(item.type!);
      }
    });
    const newTypes = Array.from(newTypeSet);
    newTypes.sort((a, b) => a.localeCompare(b));
    return KNOWN_TYPES.concat(newTypes);
  }

  /**
   * Compute a reliably ordered list of types.
   *
   * #### Notes
   * The resulting list always begins with the known types:
   * ```
   * ['function', 'instance', 'class', 'module', 'keyword']
   * ```
   * followed by other types in alphabetical order.
   */
  export function findOrderedTypes(typeMap: Completer.TypeMap): string[] {
    const filtered = Object.keys(typeMap)
      .map(key => typeMap[key])
      .filter(
        (value: string | null): value is string =>
          !!value && !(value in KNOWN_MAP)
      )
      .sort((a, b) => a.localeCompare(b));

    return KNOWN_TYPES.concat(filtered);
  }
}
