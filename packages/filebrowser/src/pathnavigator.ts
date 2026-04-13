// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import type {
  FileBrowserModel,
  TogglableHiddenFileBrowserModel
} from './model';
import { PathAutocompleteBase } from './pathautocomplete';

const PATHNAVIGATOR_CLASS = 'jp-PathNavigator';
const PATHNAVIGATOR_SUGGESTIONS_CLASS = 'jp-PathNavigator-suggestions';

/**
 * A path-autocomplete widget used inside the file browser breadcrumbs.
 *
 * Enter navigates to the typed path via `model.cd()`, Escape and blur
 * close the input, and the `closed` signal fires when the input is
 * dismissed.
 */
export class PathNavigator extends PathAutocompleteBase {
  constructor(options: PathNavigator.IOptions) {
    const model = options.model;
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    super({
      contentsGetter: model.manager.services.contents,
      itemFilter: item => item.type === 'directory',
      includeHidden:
        'includeHiddenFiles' in model
          ? (model as TogglableHiddenFileBrowserModel).includeHiddenFiles
          : false,
      placeholder: trans.__('Type a path…'),
      suggestionsClass: PATHNAVIGATOR_SUGGESTIONS_CLASS,
      node: document.createElement('span')
    });
    this.addClass(PATHNAVIGATOR_CLASS);

    this._model = model;
    this._trans = trans;

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
    this._inputNode.focus();
    this._inputNode.setSelectionRange(prefill.length, prefill.length);
    void this._updateSuggestions(prefill);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._inputNode.addEventListener('blur', this);
  }

  protected onBeforeDetach(msg: Message): void {
    this._inputNode.removeEventListener('blur', this);
    super.onBeforeDetach(msg);
  }

  handleEvent(event: Event): void {
    if (event.type === 'blur') {
      this._close();
      return;
    }
    super.handleEvent(event);
  }

  protected _evtKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this._commitNavigation(this._inputNode.value);
        return;
      case 'Escape':
        this._close();
        return;
      // `/` should be use to commit navigation to a new folder while the user
      // types. It just happens for current implementation to not need anything.
      // case '/'
      //   break
      default:
        break;
    }
    super._evtKeydown(event);
  }

  protected _evtSuggestionMousedown(event: MouseEvent): void {
    event.preventDefault();
    const path = this._pathFromMouseEvent(event);
    if (path) {
      this._commitNavigation(path);
    }
  }

  protected async _updateSuggestions(inputValue: string): Promise<void> {
    if (!this._isOpen) {
      return;
    }
    // Dynamically update hidden file inclusion.
    const lastSlash = inputValue.lastIndexOf('/');
    const searchPart =
      lastSlash >= 0 ? inputValue.slice(lastSlash + 1) : inputValue;
    this._engine.includeHidden =
      searchPart.startsWith('.') ||
      ('includeHiddenFiles' in this._model &&
        (this._model as TogglableHiddenFileBrowserModel).includeHiddenFiles);

    await super._updateSuggestions(inputValue);

    // Guard again after the async gap — the input may have closed.
    if (!this._isOpen) {
      this._suggestionsNode.style.display = 'none';
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
   * Handle the model's `refreshed` signal.
   * Invalidate the suggestion cache so the next lookup fetches fresh data.
   * If the input is currently open, proactively re-fetch suggestions.
   */
  private _onModelRefreshed(): void {
    this._engine.invalidateCache();
    if (this._isOpen) {
      void this._updateSuggestions(this._inputNode.value);
    }
  }

  private _model: FileBrowserModel;
  private _trans: TranslationBundle;
  private _closed = new Signal<this, void>(this);
  private _isOpen = false;
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
