// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import type {
  FileBrowserModel,
  TogglableHiddenFileBrowserModel
} from './model';

/**
 * We cache per directory; in case the filesystem changes below us, we refresh
 * every 5000 ms just in case; Note that on model update it should refresh as
 * well; so this is extra precautions.
 */
const SUGGESTION_CACHE_TTL_MS = 5000;

const PATHNAVIGATOR_CLASS = 'jp-PathNavigator';
const PATHNAVIGATOR_SUGGESTIONS_CLASS = 'jp-PathNavigator-suggestions';

/**
 * A widget that renders a path text input with directory autocomplete.
 * It owns only the input field and the suggestions dropdown.
 * The trigger button and edit-mode state are managed by the parent widget.
 */
export class PathNavigator extends Widget {
  constructor(options: PathNavigator.IOptions) {
    super({ node: document.createElement('span') });
    this.addClass(PATHNAVIGATOR_CLASS);

    this._model = options.model;
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');

    this._inputNode = document.createElement('input');
    this._inputNode.type = 'text';
    this._inputNode.placeholder = this._trans.__('Type a path…');

    this._suggestionsNode = document.createElement('ul');
    this._suggestionsNode.className = PATHNAVIGATOR_SUGGESTIONS_CLASS;
    this._suggestionsNode.style.display = 'none';

    this.node.appendChild(this._inputNode);
    this.node.appendChild(this._suggestionsNode);

    this._model.refreshed.connect(this._onModelRefreshed, this);
  }

  /**
   * A signal emitted when the navigator closes (Escape, blur, or after
   * navigation is committed).  The parent widget should use this to exit
   * edit mode.
   */
  get closed(): ISignal<this, void> {
    return this._closed;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._model.refreshed.disconnect(this._onModelRefreshed, this);
    Signal.clearData(this);
    super.dispose();
  }

  /**
   * Open the path input: prefill with the model's current path, focus,
   * and load suggestions.
   */
  open(): void {
    this._isOpen = true;
    const contents = this._model.manager.services.contents;
    const currentPath = contents.localPath(this._model.path);
    const prefill = currentPath ? currentPath + '/' : '';
    this._inputNode.value = prefill;
    // Defer focus so that callers (e.g. command palette) can finish their
    // own focus cleanup before we grab focus.  Without this, the palette's
    // closing logic can steal focus back, triggering the blur→close handler
    // and immediately exiting edit mode.
    requestAnimationFrame(() => {
      if (!this._isOpen || this.isDisposed) {
        return;
      }
      this._inputNode.focus();
      this._inputNode.setSelectionRange(prefill.length, prefill.length);
    });
    void this._updateSuggestions(prefill);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._inputNode.addEventListener('input', this);
    this._inputNode.addEventListener('keydown', this);
    this._inputNode.addEventListener('blur', this);
    // Use mousedown (not click) so we can preventDefault() before blur fires.
    this._suggestionsNode.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this._inputNode.removeEventListener('input', this);
    this._inputNode.removeEventListener('keydown', this);
    this._inputNode.removeEventListener('blur', this);
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
      case 'blur':
        this._close();
        break;
      case 'mousedown':
        this._evtSuggestionMousedown(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Close the input and notify the parent via the `closed` signal.
   */
  private _close(): void {
    if (!this._isOpen || this.isDisposed) {
      return;
    }
    this._isOpen = false;
    this._suggestionsNode.style.display = 'none';
    this._closed.emit();
  }

  /**
   * Navigate to the given path, then close the input.
   */
  private _commitNavigation(path: string): void {
    // Strip trailing slash (except bare root), then ensure a leading slash so
    // model.cd() → resolvePath() treats this as absolute rather than relative
    // to the current directory.
    let normalized =
      path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    // Collapse any double slashes that may result from the above transforms.
    normalized = normalized.replace(/\/\/+/g, '/');
    // Hide suggestions immediately so the input looks committed.
    this._suggestionsNode.style.display = 'none';
    this._model
      .cd(normalized || '/')
      .then(() => this._close())
      .catch(error => {
        void showErrorMessage(this._trans.__('Open Error'), error);
        this._close();
      });
  }

  /**
   * Fetch and display directory suggestions for the given input value.
   */
  private async _updateSuggestions(inputValue: string): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    const lastSlash = inputValue.lastIndexOf('/');
    const rawDirPart = lastSlash >= 0 ? inputValue.slice(0, lastSlash) : '';
    // Normalize to a path relative to the Jupyter server root by stripping
    // any leading slash.
    const dirPart = rawDirPart.startsWith('/')
      ? rawDirPart.slice(1)
      : rawDirPart;
    const searchPart =
      lastSlash >= 0 ? inputValue.slice(lastSlash + 1) : inputValue;

    // Re-fetch when the directory changes or the cache has gone stale.
    const cacheStale =
      Date.now() - this._suggestionFetchTime > SUGGESTION_CACHE_TTL_MS;
    if (dirPart !== this._suggestionDirPath || cacheStale) {
      const fetchId = ++this._fetchId;
      try {
        const contents = this._model.manager.services.contents;
        const result = await contents.get(dirPart || '', { content: true });
        // Discard result if a newer fetch has started or the widget was closed.
        if (fetchId !== this._fetchId || !this._isOpen) {
          return;
        }
        this._suggestionDirPath = dirPart;
        this._suggestionFetchTime = Date.now();
        const items =
          result.type === 'directory'
            ? (result.content as Array<{ name: string; type: string }>)
            : [];
        this._suggestions = items
          .filter(item => item.type === 'directory')
          .map(item => (dirPart ? `${dirPart}/${item.name}` : item.name));
      } catch {
        this._suggestionDirPath = dirPart;
        this._suggestionFetchTime = Date.now();
        this._suggestions = [];
      }
    }

    const lower = searchPart.toLowerCase();
    const showHidden =
      searchPart.startsWith('.') ||
      ('includeHiddenFiles' in this._model &&
        (this._model as TogglableHiddenFileBrowserModel).includeHiddenFiles);
    const filtered = this._suggestions.filter(s => {
      const base = s.slice(s.lastIndexOf('/') + 1);
      if (!showHidden && base.startsWith('.')) {
        return false;
      }
      return base.toLowerCase().startsWith(lower);
    });

    this._activeSuggestionIndex = -1;
    this._renderSuggestions(
      filtered.slice().sort((a, b) => {
        const nameA = a.slice(a.lastIndexOf('/') + 1);
        const nameB = b.slice(b.lastIndexOf('/') + 1);
        return nameA.localeCompare(nameB);
      })
    );
  }

  /**
   * Re-render the suggestions list from the given paths.
   */
  private _renderSuggestions(suggestions: string[]): void {
    this._suggestionsNode.replaceChildren();
    this._currentFilteredSuggestions = suggestions;
    if (suggestions.length === 0) {
      this._suggestionsNode.style.display = 'none';
      return;
    }
    for (const path of suggestions) {
      const li = document.createElement('li');
      const name = path.slice(path.lastIndexOf('/') + 1);
      li.textContent = name;
      li.dataset.path = path;
      if (name.startsWith('.')) {
        li.dataset.isDot = '';
      }
      this._suggestionsNode.appendChild(li);
    }
    this._suggestionsNode.style.display = '';
  }

  /**
   * Handle keyboard navigation and confirmation inside the input.
   */
  private _evtKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this._commitNavigation(this._inputNode.value);
        break;
      case 'Escape':
        this._close();
        break;
      case 'Tab':
        // Only prevent default Tab behavior when there is a suggestion to accept.
        if (this._currentFilteredSuggestions?.length) {
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
      // `/` should be use to commit navigation to a new folder while the user
      // types. It just happens for current implementation to not need anything.
      // case '/'
      //   break
      default:
        break;
    }
  }

  /**
   * Handle mousedown on a suggestion item.
   *
   * Using mousedown (before blur) and calling preventDefault() keeps focus on
   * the input, so we can navigate without the blur handler firing first.
   */
  private _evtSuggestionMousedown(event: MouseEvent): void {
    // Prevent the input from losing focus before we process the selection.
    event.preventDefault();
    let target = event.target as HTMLElement;
    while (target && target !== this._suggestionsNode) {
      if (target.tagName === 'LI') {
        const path = target.dataset.path;
        if (path) {
          this._commitNavigation(path);
        }
        return;
      }
      target = target.parentElement as HTMLElement;
    }
  }

  /**
   * Move the active suggestion up or down by `direction` steps.
   */
  private _navigateSuggestions(direction: 1 | -1): void {
    const items = Array.from(this._suggestionsNode.children) as HTMLElement[];
    if (items.length === 0) {
      return;
    }

    if (this._activeSuggestionIndex >= 0) {
      items[this._activeSuggestionIndex].classList.remove('jp-mod-active');
    }

    this._activeSuggestionIndex += direction;
    if (this._activeSuggestionIndex < 0) {
      this._activeSuggestionIndex = items.length - 1;
    } else if (this._activeSuggestionIndex >= items.length) {
      this._activeSuggestionIndex = 0;
    }

    const activeItem = items[this._activeSuggestionIndex];
    activeItem.classList.add('jp-mod-active');
    activeItem.scrollIntoView({ block: 'nearest' });

    const path = activeItem.dataset.path;
    if (path) {
      // It is tempting to append / here, though not appending it allows us to
      // use this key (`/`) as committing navigation in the pathnavigator and
      // keep typing, and showing completion while Enter/Return validate the
      // breadcrumb level. Appending / here feels awkward when used in
      // practice.
      // Note that (`/`) is not handled specifically in `_evtKeydown`, as the
      // codepath is the same as default;
      this._inputNode.value = path;
    }
  }

  /**
   * Accept the highlighted suggestion (Tab key).
   * If none is highlighted, complete to the sole match or longest common prefix.
   */
  private _acceptSuggestion(): void {
    const items = Array.from(this._suggestionsNode.children) as HTMLElement[];

    if (
      this._activeSuggestionIndex >= 0 &&
      items[this._activeSuggestionIndex]
    ) {
      const path = items[this._activeSuggestionIndex].dataset.path;
      if (path) {
        this._inputNode.value = path + '/';
        void this._updateSuggestions(this._inputNode.value);
      }
    } else if (this._currentFilteredSuggestions.length === 1) {
      this._inputNode.value = this._currentFilteredSuggestions[0] + '/';
      void this._updateSuggestions(this._inputNode.value);
    } else if (this._currentFilteredSuggestions.length > 1) {
      // Complete to the longest common prefix of all matching names.
      const names = this._currentFilteredSuggestions.map(s =>
        s.slice(s.lastIndexOf('/') + 1)
      );
      let prefix = names[0];
      for (const name of names.slice(1)) {
        let i = 0;
        while (i < prefix.length && i < name.length && prefix[i] === name[i]) {
          i++;
        }
        prefix = prefix.slice(0, i);
      }
      if (prefix) {
        const lastSlash = this._inputNode.value.lastIndexOf('/');
        const dirPart =
          lastSlash >= 0 ? this._inputNode.value.slice(0, lastSlash + 1) : '';
        this._inputNode.value = dirPart + prefix;
        void this._updateSuggestions(this._inputNode.value);
      }
    }
  }

  /**
   * Handle the model's `refreshed` signal.
   * Invalidate the suggestion cache so the next lookup fetches fresh data.
   * If the input is currently open, proactively re-fetch suggestions.
   */
  private _onModelRefreshed(): void {
    this._suggestionFetchTime = 0;
    if (this._isOpen) {
      void this._updateSuggestions(this._inputNode.value);
    }
  }

  private _model: FileBrowserModel;
  private _trans: TranslationBundle;
  private _inputNode: HTMLInputElement;
  private _suggestionsNode: HTMLElement;
  private _closed = new Signal<this, void>(this);
  private _isOpen = false;
  private _suggestions: string[] = [];
  private _currentFilteredSuggestions: string[] = [];
  private _activeSuggestionIndex = -1;
  private _suggestionDirPath = '';
  private _suggestionFetchTime = 0;
  private _fetchId = 0;
}

export namespace PathNavigator {
  export interface IOptions {
    /**
     * The file browser model.
     */
    model: FileBrowserModel;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
