// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterator, IterableOrArrayLike, toArray
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  HoverBox
} from '@jupyterlab/apputils';


/**
 * The class name added to completer menu widgets.
 */
const COMPLETER_CLASS = 'jp-Completer';

/**
 * The class name added to completer menu items.
 */
const ITEM_CLASS = 'jp-Completer-item';

/**
 * The class name added to an active completer menu item.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The minimum height of a completer widget.
 */
const MIN_HEIGHT = 20;

/**
 * The maximum height of a completer widget.
 */
const MAX_HEIGHT = 200;

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;


/**
 * A widget that enables text completion.
 */
export
class CompleterWidget extends Widget {
  /**
   * Construct a text completer menu widget.
   */
  constructor(options: CompleterWidget.IOptions) {
    super({ node: document.createElement('ul') });
    this._renderer = options.renderer || CompleterWidget.defaultRenderer;
    this.model = options.model;
    this._editor = options.editor;
    this.addClass(COMPLETER_CLASS);
  }

  /**
   * The editor used by the completion widget.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor) {
    this._editor = newValue;
  }

  /**
   * A signal emitted when a selection is made from the completer menu.
   */
  get selected(): ISignal<this, string> {
    return this._selected;
  }

  /**
   * A signal emitted when the completer widget's visibility changes.
   *
   * #### Notes
   * This signal is useful when there are multiple floating widgets that may
   * contend with the same space and ought to be mutually exclusive.
   */
  get visibilityChanged(): ISignal<this, void> {
    return this._visibilityChanged;
  }

  /**
   * The model used by the completer widget.
   */
  get model(): CompleterWidget.IModel {
    return this._model;
  }
  set model(model: CompleterWidget.IModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
    this._model = model;
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }

  /**
   * Dispose of the resources held by the completer widget.
   */
  dispose() {
    this._model = null;
    super.dispose();
  }

  /**
   * Reset the widget.
   */
  reset(): void {
    this._reset();
    if (this._model) {
      this._model.reset(true);
    }
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (this.isHidden || !this._editor) {
      return;
    }
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Emit the selected signal for the current active item and reset.
   */
  selectActive(): void {
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    if (!active) {
      this.reset();
      return;
    }
    this._selected.emit(active.getAttribute('data-value'));
    this.reset();
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('mousedown', this, USE_CAPTURE);
    document.addEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('mousedown', this, USE_CAPTURE);
    document.removeEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle model state changes.
   */
  protected onModelStateChanged(): void {
    if (this.isAttached) {
      this.update();
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let model = this._model;
    if (!model) {
      return;
    }

    let items = toArray(model.items());

    // If there are no items, reset and bail.
    if (!items || !items.length) {
      this._reset();
      if (!this.isHidden) {
        this.hide();
        this._visibilityChanged.emit(void 0);
      }
      return;
    }

    // If there is only one item, signal and bail.
    if (items.length === 1) {
      this._selected.emit(items[0].raw);
      this.reset();
      return;
    }

    // Clear the node.
    let node = this.node;
    node.textContent = '';

    // Populate the completer items.
    for (let item of items) {
      let li = this._renderer.createItemNode(item);
      // Set the raw, un-marked up value as a data attribute.
      li.setAttribute('data-value', item.raw);
      node.appendChild(li);
    }

    let active = node.querySelectorAll(`.${ITEM_CLASS}`)[this._activeIndex];
    active.classList.add(ACTIVE_CLASS);

    if (this.isHidden) {
      this.show();
      this._visibilityChanged.emit(void 0);
    }
    this._setGeometry();

    // If this is the first time the current completer session has loaded,
    // populate any initial subset match.
    if (this._model.subsetMatch) {
      let populated = this._populateSubset();
      this.model.subsetMatch = false;
      if (populated) {
        this.update();
        return;
      }
    }
  }

  /**
   * Cycle through the available completer items.
   */
  private _cycle(direction: 'up' | 'down'): void {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let index = this._activeIndex;
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    active.classList.remove(ACTIVE_CLASS);
    if (direction === 'up') {
      this._activeIndex = index === 0 ? items.length - 1 : index - 1;
    } else {
      this._activeIndex = index < items.length - 1 ? index + 1 : 0;
    }
    active = items[this._activeIndex] as HTMLElement;
    active.classList.add(ACTIVE_CLASS);
    ElementExt.scrollIntoViewIfNeeded(this.node, active);
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }
    if (!this._editor.host.contains(event.target as HTMLElement)) {
      this.reset();
      return;
    }
    switch (event.keyCode) {
      case 9:  // Tab key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this._model.subsetMatch = true;
        let populated = this._populateSubset();
        this.model.subsetMatch = false;
        if (populated) {
          return;
        }
        this.selectActive();
        return;
      case 27: // Esc key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.reset();
        return;
      case 38: // Up arrow key
      case 40: // Down arrow key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this._cycle(event.keyCode === 38 ? 'up' : 'down');
        return;
      default:
        return;
    }
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }
    if (Private.nonstandardClick(event)) {
      this.reset();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {

      // If the user has made a selection, emit its value and reset the widget.
      if (target.classList.contains(ITEM_CLASS)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this._selected.emit(target.getAttribute('data-value'));
        this.reset();
        return;
      }

      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      target = target.parentElement;
    }
    this.reset();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }

    // All scrolls except scrolls in the actual hover box node may cause the
    // referent editor that anchors the node to move, so the only scroll events
    // that can safely be ignored are ones that happen inside the hovering node.
    if (this.node.contains(event.target as HTMLElement)) {
      return;
    }

    this._setGeometry();
  }

  /**
   * Populate the completer up to the longest initial subset of items.
   *
   * @returns `true` if a subset match was found and populated.
   */
  private _populateSubset(): boolean {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let subset = Private.commonSubset(Private.itemValues(items));
    let query = this.model.query;
    if (subset && subset !== query && subset.indexOf(query) === 0) {
      this.model.query = subset;
      this._selected.emit(subset);
      return true;
    }
    return false;
  }

  /**
   * Reset the internal flags to defaults.
   */
  private _reset(): void {
    this._activeIndex = 0;
  }

  /**
   * Set the visible dimensions of the widget.
   */
  private _setGeometry(): void {
    const model = this._model;

    // This is an overly defensive test: `cursor` will always exist if
    // `original` exists, except in contrived tests. But since it is possible
    // to generate a runtime error, the check occurs here.
    if (!model || !model.original || !model.cursor) {
      return;
    }

    const editor = this._editor;
    const position = editor.getPositionAt(model.cursor.start);
    const anchor = editor.getCoordinateForPosition(position) as ClientRect;
    const style = window.getComputedStyle(this.node);
    const borderLeft = parseInt(style.borderLeftWidth, 10) || 0;
    const paddingLeft = parseInt(style.paddingLeft, 10) || 0;

    // Calculate the geometry of the completer.
    HoverBox.setGeometry({
      anchor,
      host: editor.host,
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT,
      node: this.node,
      offset: { horizontal: borderLeft + paddingLeft },
      privilege: 'below'
    });
  }

  private _activeIndex = 0;
  private _editor: CodeEditor.IEditor | null = null;
  private _model: CompleterWidget.IModel | null = null;
  private _renderer: CompleterWidget.IRenderer | null = null;
  private _selected = new Signal<this, string>(this);
  private _visibilityChanged = new Signal<this, void>(this);
}


export
namespace CompleterWidget {
  /**
   * The initialization options for a completer widget.
   */
  export
  interface IOptions {
    /**
     * The semantic parent of the completer widget, its referent editor.
     */
    editor: CodeEditor.IEditor;

    /**
     * The model for the completer widget.
     */
    model?: IModel;

    /**
     * The renderer for the completer widget nodes.
     */
    renderer?: IRenderer;
  }


  /**
   * An interface for a completion request reflecting the state of the editor.
   */
  export
  interface ITextState extends JSONObject {
    /**
     * The current value of the editor.
     */
    readonly text: string;

    /**
     * The height of a character in the editor.
     */
    readonly lineHeight: number;

    /**
     * The width of a character in the editor.
     */
    readonly charWidth: number;

    /**
     * The line number of the editor cursor.
     */
    readonly line: number;

    /**
     * The character number of the editor cursor within a line.
     */
    readonly column: number;
  }

  /**
   * The data model backing a code completer widget.
   */
  export
  interface IModel extends IDisposable {
    /**
     * A signal emitted when state of the completer menu changes.
     */
    readonly stateChanged: ISignal<IModel, void>;

    /**
     * The current text state details.
     */
    current: ITextState;

    /**
     * The cursor details that the API has used to return matching options.
     */
    cursor: ICursorSpan;

    /**
     * A flag that is true when the model value was modified by a subset match.
     */
    subsetMatch: boolean;

    /**
     * The original completer request details.
     */
    original: ITextState;

    /**
     * The query against which items are filtered.
     */
    query: string;

    /**
     * Get the of visible items in the completer menu.
     */
    items(): IIterator<IItem>;

    /**
     * Get the unfiltered options in a completer menu.
     */
    options(): IIterator<string>;

    /**
     * Set the avilable options in the completer menu.
     */
    setOptions(options: IterableOrArrayLike<string>): void;

    /**
     * Handle a completion request.
     */
    handleTextChange(change: CompleterWidget.ITextState): void;

    /**
     * Create a resolved patch between the original state and a patch string.
     */
    createPatch(patch: string): IPatch;

    /**
     * Reset the state of the model and emit a state change signal.
     *
     * @param hard - Reset even if a subset match is in progress.
     */
    reset(hard?: boolean): void;
  }

  /**
   * An object describing a completion option injection into text.
   */
  export
  interface IPatch {
    /**
     * The patched text.
     */
    text: string;

    /**
     * The offset of the cursor.
     */
    offset: number;
  }


  /**
   * A completer menu item.
   */
  export
  interface IItem {
    /**
     * The highlighted, marked up text of a visible completer item.
     */
    text: string;

    /**
     * The raw text of a visible completer item.
     */
    raw: string;
  }


  /**
   * A cursor span.
   */
  export
  interface ICursorSpan extends JSONObject {
    /**
     * The start position of the cursor.
     */
    start: number;

    /**
     * The end position of the cursor.
     */
    end: number;
  }

  /**
   * A renderer for completer widget nodes.
   */
  export
  interface IRenderer {
    /**
     * Create an item node (an `li` element) for a text completer menu.
     */
    createItemNode(item: IItem): HTMLLIElement;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create an item node for a text completer menu.
     */
    createItemNode(item: IItem): HTMLLIElement {
      let li = document.createElement('li');
      let code = document.createElement('code');

      // Use innerHTML because search results include <mark> tags.
      code.innerHTML = item.text;

      li.className = ITEM_CLASS;
      li.appendChild(code);
      return li;
    }
  }

  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A namespace for completer widget private data.
 */
namespace Private {
  /**
   * Returns the common subset string that a list of strings shares.
   */
  export
  function commonSubset(values: string[]): string {
    let len = values.length;
    let subset = '';
    if (len < 2) {
      return subset;
    }
    let strlen = values[0].length;
    for (let i = 0; i < strlen; i++) {
      let ch = values[0][i];
      for (let j = 1; j < len; j++) {
        if (values[j][i] !== ch) {
          return subset;
        }
      }
      subset += ch;
    }
    return subset;
  }

  /**
   * Returns the list of raw item values currently in the DOM.
   */
  export
  function itemValues(items: NodeList): string[] {
    let values: string[] = [];
    for (let i = 0, len = items.length; i < len; i++) {
      values.push((items[i] as HTMLElement).getAttribute('data-value'));
    }
    return values;
  }

  /**
   * Returns true for any modified click event (i.e., not a left-click).
   */
  export
  function nonstandardClick(event: MouseEvent): boolean {
    return event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.metaKey;
  }
}
