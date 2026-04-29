// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { Dialog } from '@jupyterlab/apputils';
import type { Contents } from '@jupyterlab/services';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

const SUGGESTION_CACHE_TTL_MS = 5000;

/**
 * Narrow interface for the contents service.
 * Only the `get` method is required.
 */
export interface IContentsGetter {
  get(path: string, options?: Contents.IFetchOptions): Promise<Contents.IModel>;
}

/**
 * A single suggestion returned by the autocomplete engine.
 */
export interface ISuggestionItem {
  /**
   * Full path relative to the server root (e.g. `"some/dir/name"`).
   */
  path: string;

  /**
   * Whether this item is a directory.
   */
  isDirectory: boolean;
}

// ---------------------------------------------------------------------------
// Engine (pure logic, no DOM)
// ---------------------------------------------------------------------------

/**
 * A non-widget engine that fetches, caches, filters, and sorts
 * path suggestions from a Jupyter contents service.
 */
export class PathAutocompleteEngine {
  constructor(options: PathAutocompleteEngine.IOptions) {
    this._contentsGetter = options.contentsGetter;
    this._itemFilter =
      options.itemFilter ?? (item => item.type === 'directory');
    this._includeHidden = options.includeHidden ?? false;
    this._cacheTtlMs = options.cacheTtlMs ?? SUGGESTION_CACHE_TTL_MS;
  }

  /**
   * Whether to include hidden (dot-prefixed) items in results.
   */
  get includeHidden(): boolean {
    return this._includeHidden;
  }
  set includeHidden(value: boolean) {
    this._includeHidden = value;
  }

  /**
   * Invalidate the suggestion cache so the next call re-fetches.
   */
  invalidateCache(): void {
    this._fetchTime = 0;
  }

  /**
   * Given a raw input value (e.g. `"some/dir/pref"`), fetch the directory
   * listing for `"some/dir"` and return filtered suggestions matching
   * `"pref"`.  Results are sorted alphabetically by basename.
   */
  async fetchSuggestions(inputValue: string): Promise<ISuggestionItem[]> {
    const lastSlash = inputValue.lastIndexOf('/');
    const rawDirPart = lastSlash >= 0 ? inputValue.slice(0, lastSlash) : '';
    const dirPart = rawDirPart.startsWith('/')
      ? rawDirPart.slice(1)
      : rawDirPart;
    const searchPart =
      lastSlash >= 0 ? inputValue.slice(lastSlash + 1) : inputValue;

    const cacheStale = Date.now() - this._fetchTime > this._cacheTtlMs;
    if (dirPart !== this._dirPath || cacheStale) {
      const fetchId = ++this._fetchId;
      try {
        const result = await this._contentsGetter.get(dirPart || '', {
          content: true
        });
        if (fetchId !== this._fetchId) {
          return [];
        }
        this._dirPath = dirPart;
        this._fetchTime = Date.now();
        const rawItems =
          result.type === 'directory'
            ? (result.content as Array<{ name: string; type: string }>)
            : [];
        this._items = rawItems.filter(this._itemFilter).map(item => ({
          path: dirPart ? `${dirPart}/${item.name}` : item.name,
          isDirectory: item.type === 'directory'
        }));
      } catch {
        this._dirPath = dirPart;
        this._fetchTime = Date.now();
        this._items = [];
      }
    }

    const lower = searchPart.toLowerCase();
    const showHidden = searchPart.startsWith('.') || this._includeHidden;
    const filtered = this._items.filter(item => {
      const base = item.path.slice(item.path.lastIndexOf('/') + 1);
      if (!showHidden && base.startsWith('.')) {
        return false;
      }
      return base.toLowerCase().startsWith(lower);
    });

    return filtered.slice().sort((a, b) => {
      const nameA = a.path.slice(a.path.lastIndexOf('/') + 1);
      const nameB = b.path.slice(b.path.lastIndexOf('/') + 1);
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Compute the Tab-completion value for the given input and suggestion list.
   *
   * - If a single suggestion matches, returns it (with a trailing `/` for
   *   directories).
   * - If multiple suggestions match, returns the longest common prefix.
   * - Returns `null` when no completion is possible.
   */
  static completeFromSuggestions(
    suggestions: ISuggestionItem[],
    inputValue: string
  ): string | null {
    if (suggestions.length === 0) {
      return null;
    }
    if (suggestions.length === 1) {
      const item = suggestions[0];
      return item.isDirectory ? item.path + '/' : item.path;
    }
    const names = suggestions.map(s =>
      s.path.slice(s.path.lastIndexOf('/') + 1)
    );
    let prefix = names[0];
    for (const name of names.slice(1)) {
      let i = 0;
      while (i < prefix.length && i < name.length && prefix[i] === name[i]) {
        i++;
      }
      prefix = prefix.slice(0, i);
    }
    if (!prefix) {
      return null;
    }
    const lastSlash = inputValue.lastIndexOf('/');
    const dirPart = lastSlash >= 0 ? inputValue.slice(0, lastSlash + 1) : '';
    return dirPart + prefix;
  }

  private _contentsGetter: IContentsGetter;
  private _itemFilter: (item: { name: string; type: string }) => boolean;
  private _includeHidden: boolean;
  private _cacheTtlMs: number;
  private _items: ISuggestionItem[] = [];
  private _dirPath = '';
  private _fetchTime = 0;
  private _fetchId = 0;
}

export namespace PathAutocompleteEngine {
  export interface IOptions {
    /**
     * The contents service (or any object with a compatible `get` method).
     */
    contentsGetter: IContentsGetter;

    /**
     * Item-type filter.  Return `true` to include an item in suggestions.
     * Default: only directories.
     */
    itemFilter?: (item: { name: string; type: string }) => boolean;

    /**
     * Whether to include hidden (dot-prefixed) items even when the search
     * part does not start with `.`.  Default: `false`.
     */
    includeHidden?: boolean;

    /**
     * Cache TTL in milliseconds.  Default: 5 000.
     */
    cacheTtlMs?: number;
  }
}

// ---------------------------------------------------------------------------
// Base widget (shared input + suggestions + keyboard navigation)
// ---------------------------------------------------------------------------

/**
 * Abstract base class for widgets that pair a text input with a path-
 * autocomplete suggestions dropdown.
 *
 * Subclasses must:
 * - call `_initDOM()` at the end of their constructor to wire up elements
 * - override `_evtKeydown` if they need extra key handling (call `super`)
 * - override `_evtSuggestionMousedown` to decide what a click does
 */
export abstract class PathAutocompleteBase extends Widget {
  constructor(options: PathAutocompleteBase.IOptions) {
    super(options.node ? { node: options.node } : undefined);

    this._engine = new PathAutocompleteEngine({
      contentsGetter: options.contentsGetter,
      itemFilter: options.itemFilter,
      includeHidden: options.includeHidden
    });

    this._inputNode = document.createElement('input');
    this._inputNode.type = 'text';
    this._inputNode.placeholder = options.placeholder ?? '';

    this._suggestionsNode = document.createElement('ul');
    this._suggestionsNode.className = options.suggestionsClass ?? '';
    this._suggestionsNode.style.display = 'none';
  }

  /**
   * Return the current input value.
   */
  getValue(): string {
    return this._inputNode.value;
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._inputNode.addEventListener('input', this);
    this._inputNode.addEventListener('keydown', this);
    this._suggestionsNode.addEventListener('mousedown', this);
  }

  protected onBeforeDetach(msg: Message): void {
    this._inputNode.removeEventListener('input', this);
    this._inputNode.removeEventListener('keydown', this);
    this._suggestionsNode.removeEventListener('mousedown', this);
    super.onBeforeDetach(msg);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'input':
        void this._updateSuggestions(this._inputNode.value);
        break;
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
      case 'mousedown':
        this._evtSuggestionMousedown(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Fetch and display suggestions for the given input value.
   * Subclasses may call this directly (e.g. to trigger an initial fetch).
   */
  protected async _updateSuggestions(inputValue: string): Promise<void> {
    const fetchId = ++this._localFetchId;
    const filtered = await this._engine.fetchSuggestions(inputValue);
    if (fetchId !== this._localFetchId) {
      return;
    }
    this._currentFiltered = filtered;
    this._activeIndex = -1;
    this._renderSuggestions(filtered);
  }

  /**
   * Handle keyboard events.
   * Subclasses should override for extra keys (Enter, Escape, …) and call
   * `super._evtKeydown(event)` for Tab / Arrow handling.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Tab':
        if (this._currentFiltered.length) {
          event.preventDefault();
          this._acceptSuggestion();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._navigateSuggestions(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._navigateSuggestions(-1);
        break;
      default:
        break;
    }
  }

  /**
   * Handle mousedown on a suggestion `<li>`.
   * Subclasses must override to decide what a click does (fill input,
   * navigate, etc.).  Always call `event.preventDefault()` first to keep
   * focus on the input.
   */
  protected abstract _evtSuggestionMousedown(event: MouseEvent): void;

  /**
   * Walk from the event target up to the suggestions list, returning
   * the `data-path` of the first `<li>` found, or `null`.
   */
  protected _pathFromMouseEvent(event: MouseEvent): string | null {
    let target = event.target as HTMLElement;
    while (target && target !== this._suggestionsNode) {
      if (target.tagName === 'LI') {
        return target.dataset.path ?? null;
      }
      target = target.parentElement as HTMLElement;
    }
    return null;
  }

  // -- Private helpers (shared) -------------------------------------------

  private _renderSuggestions(suggestions: ISuggestionItem[]): void {
    this._suggestionsNode.replaceChildren();
    if (suggestions.length === 0) {
      this._suggestionsNode.style.display = 'none';
      return;
    }
    for (const item of suggestions) {
      const li = document.createElement('li');
      const name = item.path.slice(item.path.lastIndexOf('/') + 1);
      li.textContent = name;
      li.dataset.path = item.path;
      if (item.isDirectory) {
        li.dataset.isDir = '';
      }
      if (name.startsWith('.')) {
        li.dataset.isDot = '';
      }
      this._suggestionsNode.appendChild(li);
    }
    this._suggestionsNode.style.display = '';
  }

  private _navigateSuggestions(direction: 1 | -1): void {
    const items = Array.from(this._suggestionsNode.children) as HTMLElement[];
    if (items.length === 0) {
      return;
    }
    if (this._activeIndex >= 0) {
      items[this._activeIndex].classList.remove('jp-mod-active');
    }
    this._activeIndex += direction;
    if (this._activeIndex < 0) {
      this._activeIndex = items.length - 1;
    } else if (this._activeIndex >= items.length) {
      this._activeIndex = 0;
    }
    const activeItem = items[this._activeIndex];
    activeItem.classList.add('jp-mod-active');
    activeItem.scrollIntoView({ block: 'nearest' });

    const path = activeItem.dataset.path;
    if (path) {
      this._inputNode.value = path;
    }
  }

  private _acceptSuggestion(): void {
    const items = Array.from(this._suggestionsNode.children) as HTMLElement[];

    if (this._activeIndex >= 0 && items[this._activeIndex]) {
      const el = items[this._activeIndex];
      const path = el.dataset.path;
      if (path) {
        const isDir = 'isDir' in el.dataset;
        this._inputNode.value = isDir ? path + '/' : path;
        void this._updateSuggestions(this._inputNode.value);
      }
    } else {
      const completed = PathAutocompleteEngine.completeFromSuggestions(
        this._currentFiltered,
        this._inputNode.value
      );
      if (completed !== null) {
        this._inputNode.value = completed;
        void this._updateSuggestions(this._inputNode.value);
      }
    }
  }

  protected _engine: PathAutocompleteEngine;
  protected _inputNode: HTMLInputElement;
  protected _suggestionsNode: HTMLElement;
  private _currentFiltered: ISuggestionItem[] = [];
  private _activeIndex = -1;
  private _localFetchId = 0;
}

export namespace PathAutocompleteBase {
  export interface IOptions {
    /**
     * The contents service (or any object with a compatible `get` method).
     */
    contentsGetter: IContentsGetter;

    /**
     * Item-type filter.  Default: only directories.
     */
    itemFilter?: (item: { name: string; type: string }) => boolean;

    /**
     * Whether to include hidden (dot-prefixed) items.  Default: `false`.
     */
    includeHidden?: boolean;

    /**
     * Placeholder text for the input.
     */
    placeholder?: string;

    /**
     * CSS class for the suggestions `<ul>`.
     */
    suggestionsClass?: string;

    /**
     * Root DOM node to use for the widget.
     */
    node?: HTMLElement;
  }
}

// ---------------------------------------------------------------------------
// Dialog body widget (thin wrapper)
// ---------------------------------------------------------------------------

const DIALOG_INPUT_CLASS = 'jp-PathAutocompleteInput';
const DIALOG_SUGGESTIONS_CLASS = 'jp-PathAutocompleteSuggestions';

/**
 * A dialog body widget that provides a text input with path autocomplete.
 * Implements `Dialog.IBodyWidget<string>` so it works with `showDialog()`.
 *
 * Enter and Escape are handled by the Dialog; clicking a suggestion fills
 * the input value without dismissing the dialog.
 */
export class PathDialogInput
  extends PathAutocompleteBase
  implements Dialog.IBodyWidget<string>
{
  constructor(options: PathDialogInput.IOptions) {
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    super({
      contentsGetter: options.contentsGetter,
      itemFilter: options.itemFilter,
      includeHidden: options.includeHidden,
      placeholder: options.placeholder ?? trans.__('Type a path…'),
      suggestionsClass: DIALOG_SUGGESTIONS_CLASS
    });
    this.addClass(DIALOG_INPUT_CLASS);

    this._inputNode.classList.add('jp-mod-styled');
    this._inputNode.id = 'jp-dialog-input-id';

    if (options.initialPath) {
      this._inputNode.value = options.initialPath;
    }

    if (options.label) {
      const labelElement = document.createElement('label');
      labelElement.textContent = options.label;
      labelElement.htmlFor = this._inputNode.id;
      this.node.appendChild(labelElement);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'jp-PathAutocompleteInput-inputWrapper';
    wrapper.appendChild(this._inputNode);
    wrapper.appendChild(this._suggestionsNode);
    this.node.appendChild(wrapper);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    // Fetch suggestions immediately so items appear when the dialog opens.
    void this._updateSuggestions(this._inputNode.value);
  }

  protected _evtSuggestionMousedown(event: MouseEvent): void {
    event.preventDefault();
    const path = this._pathFromMouseEvent(event);
    if (path) {
      this._inputNode.value = path;
      void this._updateSuggestions(path);
    }
  }
}

export namespace PathDialogInput {
  export interface IOptions {
    /**
     * The contents service (or any object with a compatible `get` method).
     */
    contentsGetter: IContentsGetter;

    /**
     * Initial path to prefill.  Default: `''`.
     */
    initialPath?: string;

    /**
     * Label text displayed above the input.
     */
    label?: string;

    /**
     * Placeholder text.  Default: `'Type a path…'`.
     */
    placeholder?: string;

    /**
     * Item-type filter.  Return `true` to include an item.
     * Default: only directories.
     */
    itemFilter?: (item: { name: string; type: string }) => boolean;

    /**
     * Whether to include hidden (dot-prefixed) items.  Default: `false`.
     */
    includeHidden?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
