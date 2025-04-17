// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog,
  DOMUtils,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { PageConfig, PathExt, Time } from '@jupyterlab/coreutils';
import {
  IDocumentManager,
  isValidFileName,
  renameFile
} from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  caretDownIcon,
  caretUpIcon,
  classes,
  LabIcon
} from '@jupyterlab/ui-components';
import { ArrayExt, filter, StringExt } from '@lumino/algorithm';
import {
  MimeData,
  PromiseDelegate,
  ReadonlyJSONObject
} from '@lumino/coreutils';
import { ElementExt } from '@lumino/domutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Drag } from '@lumino/dragdrop';
import { Message, MessageLoop } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { h, VirtualDOM } from '@lumino/virtualdom';
import { Widget } from '@lumino/widgets';
import { FilterFileBrowserModel } from './model';

/**
 * The class name added to DirListing widget.
 */
const DIR_LISTING_CLASS = 'jp-DirListing';

/**
 * The class name added to a dir listing header node.
 */
const HEADER_CLASS = 'jp-DirListing-header';

/**
 * The class name added to a dir listing list header cell.
 */
const HEADER_ITEM_CLASS = 'jp-DirListing-headerItem';

/**
 * The class name added to a header cell text node.
 */
const HEADER_ITEM_TEXT_CLASS = 'jp-DirListing-headerItemText';

/**
 * The class name added to a header cell icon node.
 */
const HEADER_ITEM_ICON_CLASS = 'jp-DirListing-headerItemIcon';

/**
 * The class name added to the dir listing content node.
 */
const CONTENT_CLASS = 'jp-DirListing-content';

/**
 * The class name added to dir listing content item.
 */
const ITEM_CLASS = 'jp-DirListing-item';

/**
 * The class name added to the listing item text cell.
 */
const ITEM_TEXT_CLASS = 'jp-DirListing-itemText';

/**
 * The class name added to the listing item text cell.
 */
const ITEM_NAME_COLUMN_CLASS = 'jp-DirListing-itemName';

/**
 * The class name added to the listing item icon cell.
 */
const ITEM_ICON_CLASS = 'jp-DirListing-itemIcon';

/**
 * The class name added to the listing item modified cell.
 */
const ITEM_MODIFIED_CLASS = 'jp-DirListing-itemModified';

/**
 * The class name added to the listing item file size cell.
 */
const ITEM_FILE_SIZE_CLASS = 'jp-DirListing-itemFileSize';

/**
 * The class name added to the label element that wraps each item's checkbox and
 * the header's check-all checkbox.
 */
const CHECKBOX_WRAPPER_CLASS = 'jp-DirListing-checkboxWrapper';

/**
 * The class name added to the dir listing editor node.
 */
const EDITOR_CLASS = 'jp-DirListing-editor';

/**
 * The class name added to the name column header cell.
 */
const NAME_ID_CLASS = 'jp-id-name';

/**
 * The class name added to the modified column header cell.
 */
const MODIFIED_ID_CLASS = 'jp-id-modified';

/**
 * The class name added to the file size column header cell.
 */
const FILE_SIZE_ID_CLASS = 'jp-id-filesize';

/**
 * The mime type for a contents drag object.
 */
const CONTENTS_MIME = 'application/x-jupyter-icontents';

/**
 * The mime type for a rich contents drag object.
 */
const CONTENTS_MIME_RICH = 'application/x-jupyter-icontentsrich';

/**
 * The class name added to drop targets.
 */
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * The class name added to selected rows.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The class name added to drag state icons to add space between the icon and the file name
 */
const DRAG_ICON_CLASS = 'jp-DragIcon';

/**
 * The class name added to column resize handle.
 */
const RESIZE_HANDLE_CLASS = 'jp-DirListing-resizeHandle';

/**
 * The class name added to the widget when there are items on the clipboard.
 */
const CLIPBOARD_CLASS = 'jp-mod-clipboard';

/**
 * The class name added to cut rows.
 */
const CUT_CLASS = 'jp-mod-cut';

/**
 * The class name added when there are more than one selected rows.
 */
const MULTI_SELECTED_CLASS = 'jp-mod-multiSelected';

/**
 * The class name added to indicate running notebook.
 */
const RUNNING_CLASS = 'jp-mod-running';

/**
 * The class name added to indicate the active element.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added for a descending sort.
 */
const DESCENDING_CLASS = 'jp-mod-descending';

/**
 * The maximum duration between two key presses when selecting files by prefix.
 */
const PREFIX_APPEND_DURATION = 1000;

/**
 * The default width of the resize handle.
 */
const DEFAULT_HANDLE_WIDTH = 5;

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * A boolean indicating whether the platform is Mac.
 */
const IS_MAC = !!navigator.platform.match(/Mac/i);

/**
 * The factory MIME type supported by lumino dock panels.
 */
const FACTORY_MIME = 'application/vnd.lumino.widget-factory';

/**
 * A widget which hosts a file list area.
 */
export class DirListing extends Widget {
  /**
   * Construct a new file browser directory listing widget.
   *
   * @param options The constructor options
   */
  constructor(options: DirListing.IOptions) {
    super({
      node: (options.renderer || DirListing.defaultRenderer).createNode()
    });
    this.addClass(DIR_LISTING_CLASS);
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._model = options.model;
    this._model.fileChanged.connect(this._onFileChanged, this);
    this._model.refreshed.connect(this._onModelRefreshed, this);
    this._model.pathChanged.connect(this._onPathChanged, this);
    this._editNode = document.createElement('input');
    this._editNode.className = EDITOR_CLASS;
    this._manager = this._model.manager;
    this._renderer = options.renderer || DirListing.defaultRenderer;
    this._state = options.state || null;

    // Get the width of the "modified" column
    this._updateModifiedSize(this.node);

    const headerNode = DOMUtils.findElement(this.node, HEADER_CLASS);
    // hide the file size column by default
    this._hiddenColumns.add('file_size');
    this._renderer.populateHeaderNode(
      headerNode,
      this.translator,
      this._hiddenColumns,
      this._columnSizes
    );
    this._manager.activateRequested.connect(this._onActivateRequested, this);
  }

  /**
   * Dispose of the resources held by the directory listing.
   */
  dispose(): void {
    this._items.length = 0;
    this._sortedItems.length = 0;
    this._clipboard.length = 0;
    super.dispose();
  }

  /**
   * Get the model used by the listing.
   */
  get model(): FilterFileBrowserModel {
    return this._model;
  }

  /**
   * Get the dir listing header node.
   *
   * #### Notes
   * This is the node which holds the header cells.
   *
   * Modifying this node directly can lead to undefined behavior.
   */
  get headerNode(): HTMLElement {
    return DOMUtils.findElement(this.node, HEADER_CLASS);
  }

  /**
   * Get the dir listing content node.
   *
   * #### Notes
   * This is the node which holds the item nodes.
   *
   * Modifying this node directly can lead to undefined behavior.
   */
  get contentNode(): HTMLElement {
    return DOMUtils.findElement(this.node, CONTENT_CLASS);
  }

  /**
   * The renderer instance used by the directory listing.
   */
  get renderer(): DirListing.IRenderer {
    return this._renderer;
  }

  /**
   * The current sort state.
   */
  get sortState(): DirListing.ISortState {
    return this._sortState;
  }

  /**
   * A signal fired when an item is opened.
   */
  get onItemOpened(): ISignal<DirListing, Contents.IModel> {
    return this._onItemOpened;
  }

  /**
   * Create an iterator over the listing's selected items.
   *
   * @returns A new iterator over the listing's selected items.
   */
  selectedItems(): IterableIterator<Contents.IModel> {
    const items = this._sortedItems;
    return filter(items, item => this.selection[item.path]);
  }

  /**
   * Create an iterator over the listing's sorted items.
   *
   * @returns A new iterator over the listing's sorted items.
   */
  sortedItems(): IterableIterator<Contents.IModel> {
    return this._sortedItems[Symbol.iterator]();
  }

  /**
   * Sort the items using a sort condition.
   */
  sort(state: DirListing.ISortState): void {
    this._sortedItems = Private.sort(
      this.model.items(),
      state,
      this._sortNotebooksFirst,
      this.translator
    );
    this._sortState = state;
    this.update();
  }

  /**
   * Rename the first currently selected item.
   *
   * @returns A promise that resolves with the new name of the item.
   */
  rename(): Promise<string> {
    return this._doRename();
  }

  /**
   * Cut the selected items.
   */
  cut(): void {
    this._isCut = true;
    this._copy();
    this.update();
  }

  /**
   * Copy the selected items.
   */
  copy(): void {
    this._copy();
  }

  /**
   * Paste the items from the clipboard.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  paste(): Promise<void> {
    if (!this._clipboard.length) {
      this._isCut = false;
      return Promise.resolve(undefined);
    }

    const basePath = this._model.path;
    const promises: Promise<Contents.IModel>[] = [];

    for (const path of this._clipboard) {
      if (this._isCut) {
        const localPath = this._manager.services.contents.localPath(path);
        const parts = localPath.split('/');
        const name = parts[parts.length - 1];
        const newPath = PathExt.join(basePath, name);
        promises.push(this._model.manager.rename(path, newPath));
      } else {
        promises.push(this._model.manager.copy(path, basePath));
      }
    }

    // Remove any cut modifiers.
    for (const item of this._items) {
      item.classList.remove(CUT_CLASS);
    }

    this._clipboard.length = 0;
    this._isCut = false;
    this.removeClass(CLIPBOARD_CLASS);
    return Promise.all(promises)
      .then(() => {
        return undefined;
      })
      .catch(error => {
        void showErrorMessage(
          this._trans._p('showErrorMessage', 'Paste Error'),
          error
        );
      });
  }

  /**
   * Delete the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  async delete(): Promise<void> {
    const deleteToTrash = PageConfig.getOption('delete_to_trash') === 'true';
    const items = this._sortedItems.filter(item => this.selection[item.path]);

    if (!items.length) {
      return;
    }
    const moveToTrashActionMessage = this._trans.__(
      'Are you sure you want to move to trash: %1?',
      items[0].name
    );
    const deleteActionMessage = this._trans.__(
      'Are you sure you want to permanently delete: %1?',
      items[0].name
    );
    const moveToTrashItemsActionMessage = this._trans._n(
      'Are you sure you want to move to trash the %1 selected item?',
      'Are you sure you want to move to trash the %1 selected items?',
      items.length
    );
    const deleteActionItemsMessage = this._trans._n(
      'Are you sure you want to permanently delete the %1 selected item?',
      'Are you sure you want to permanently delete the %1 selected items?',
      items.length
    );

    const actionMessage = deleteToTrash
      ? moveToTrashActionMessage
      : deleteActionMessage;
    const itemsActionMessage = deleteToTrash
      ? moveToTrashItemsActionMessage
      : deleteActionItemsMessage;
    const actionName = deleteToTrash
      ? this._trans.__('Move to Trash')
      : this._trans.__('Delete');
    const message = items.length === 1 ? actionMessage : itemsActionMessage;
    const result = await showDialog({
      title: actionName,
      body: message,
      buttons: [
        Dialog.cancelButton({ label: this._trans.__('Cancel') }),
        Dialog.warnButton({ label: actionName })
      ],
      // By default focus on "Cancel" to protect from accidental deletion
      // ("delete" and "Enter" are next to each other on many keyboards).
      defaultButton: 0
    });

    if (!this.isDisposed && result.button.accept) {
      await this._delete(items.map(item => item.path));
    }

    // Re-focus
    let focusIndex = this._focusIndex;
    const lastIndexAfterDelete = this._sortedItems.length - items.length - 1;
    if (focusIndex > lastIndexAfterDelete) {
      // If the focus index after deleting items is out of bounds, set it to the
      // last item.
      focusIndex = Math.max(0, lastIndexAfterDelete);
    }
    this._focusItem(focusIndex);
  }

  /**
   * Duplicate the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  duplicate(): Promise<void> {
    const basePath = this._model.path;
    const promises: Promise<Contents.IModel>[] = [];

    for (const item of this.selectedItems()) {
      if (item.type !== 'directory') {
        promises.push(this._model.manager.copy(item.path, basePath));
      }
    }
    return Promise.all(promises)
      .then(() => {
        return undefined;
      })
      .catch(error => {
        void showErrorMessage(
          this._trans._p('showErrorMessage', 'Duplicate file'),
          error
        );
      });
  }

  /**
   * Download the currently selected item(s).
   */
  async download(): Promise<void> {
    await Promise.all(
      Array.from(this.selectedItems())
        .filter(item => item.type !== 'directory')
        .map(item => this._model.download(item.path))
    );
  }

  /**
   * Restore the state of the file browser listing.
   *
   * @param id - The unique ID that is used to construct a state database key.
   *
   */
  async restore(id: string): Promise<void> {
    const key = `file-browser-${id}:columns`;
    const state = this._state;
    this._stateColumnsKey = key;

    if (!state) {
      return;
    }

    try {
      const columns = await state.fetch(key);

      if (!columns) {
        return;
      }

      const sizes = (columns as ReadonlyJSONObject)['sizes'] as
        | Record<DirListing.IColumn['id'], number | null>
        | undefined;

      if (!sizes) {
        return;
      }
      for (const [key, size] of Object.entries(sizes)) {
        this._columnSizes[key as DirListing.IColumn['id']] = size;
      }
      this._updateColumnSizes();
    } catch (error) {
      await state.remove(key);
    }
  }
  private _stateColumnsKey: string;

  /**
   * Shut down kernels on the applicable currently selected items.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdownKernels(): Promise<void> {
    const model = this._model;
    const items = this._sortedItems;
    const paths = items.map(item => item.path);

    const promises = Array.from(this._model.sessions())
      .filter(session => {
        const index = ArrayExt.firstIndexOf(paths, session.path);
        return this.selection[items[index].path];
      })
      .map(session => model.manager.services.sessions.shutdown(session.id));

    return Promise.all(promises)
      .then(() => {
        return undefined;
      })
      .catch(error => {
        void showErrorMessage(
          this._trans._p('showErrorMessage', 'Shut down kernel'),
          error
        );
      });
  }

  /**
   * Select next item.
   *
   * @param keepExisting - Whether to keep the current selection and add to it.
   */
  selectNext(keepExisting = false): void {
    let index = -1;
    const selected = Object.keys(this.selection);
    const items = this._sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the next item.
      const path = selected[selected.length - 1];
      index = ArrayExt.findFirstIndex(items, value => value.path === path);
      index += 1;
      if (index === this._items.length) {
        index = 0;
      }
    } else if (selected.length === 0) {
      // Select the first item.
      index = 0;
    } else {
      // Select the last selected item.
      const path = selected[selected.length - 1];
      index = ArrayExt.findFirstIndex(items, value => value.path === path);
    }
    if (index !== -1) {
      this._selectItem(index, keepExisting);
      ElementExt.scrollIntoViewIfNeeded(this.contentNode, this._items[index]);
    }
  }

  /**
   * Select previous item.
   *
   * @param keepExisting - Whether to keep the current selection and add to it.
   */
  selectPrevious(keepExisting = false): void {
    let index = -1;
    const selected = Object.keys(this.selection);
    const items = this._sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the previous item.
      const path = selected[0];
      index = ArrayExt.findFirstIndex(items, value => value.path === path);
      index -= 1;
      if (index === -1) {
        index = this._items.length - 1;
      }
    } else if (selected.length === 0) {
      // Select the last item.
      index = this._items.length - 1;
    } else {
      // Select the first selected item.
      const path = selected[0];
      index = ArrayExt.findFirstIndex(items, value => value.path === path);
    }
    if (index !== -1) {
      this._selectItem(index, keepExisting);
      ElementExt.scrollIntoViewIfNeeded(this.contentNode, this._items[index]);
    }
  }

  /**
   * Select the first item that starts with prefix being typed.
   */
  selectByPrefix(): void {
    const prefix = this._searchPrefix.toLowerCase();
    const items = this._sortedItems;

    const index = ArrayExt.findFirstIndex(items, value => {
      return value.name.toLowerCase().substr(0, prefix.length) === prefix;
    });

    if (index !== -1) {
      this._selectItem(index, false);
      ElementExt.scrollIntoViewIfNeeded(this.contentNode, this._items[index]);
    }
  }

  /**
   * Get whether an item is selected by name.
   *
   * @param name - The name of of the item.
   *
   * @returns Whether the item is selected.
   */
  isSelected(name: string): boolean {
    const items = this._sortedItems;

    return (
      Array.from(
        filter(items, item => item.name === name && this.selection[item.path])
      ).length !== 0
    );
  }

  /**
   * Find a model given a click.
   *
   * @param event - The mouse event.
   *
   * @returns The model for the selected file.
   */
  modelForClick(event: MouseEvent): Contents.IModel | undefined {
    const items = this._sortedItems;
    const index = Private.hitTestNodes(this._items, event);
    if (index !== -1) {
      return items[index];
    }
    return undefined;
  }

  /**
   * Clear the selected items.
   */
  clearSelectedItems(): void {
    this.selection = Object.create(null);
  }

  /**
   * Select an item by name.
   *
   * @param name - The name of the item to select.
   * @param focus - Whether to move focus to the selected item.
   *
   * @returns A promise that resolves when the name is selected.
   */
  async selectItemByName(name: string, focus: boolean = false): Promise<void> {
    return this._selectItemByName(name, focus);
  }

  /**
   * Select an item by name.
   *
   * @param name - The name of the item to select.
   * @param focus - Whether to move focus to the selected item.
   * @param force - Whether to proceed with selection even if the file was already selected.
   *
   * @returns A promise that resolves when the name is selected.
   */
  private async _selectItemByName(
    name: string,
    focus: boolean = false,
    force: boolean = false
  ): Promise<void> {
    if (!force && this.isSelected(name)) {
      // Avoid API polling and DOM updates if already selected
      return;
    }

    // Make sure the file is available.
    await this.model.refresh();

    if (this.isDisposed) {
      throw new Error('File browser is disposed.');
    }
    const items = this._sortedItems;
    const index = ArrayExt.findFirstIndex(items, value => value.name === name);
    if (index === -1) {
      throw new Error('Item does not exist.');
    }
    this._selectItem(index, false, focus);
    MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
    ElementExt.scrollIntoViewIfNeeded(this.contentNode, this._items[index]);
  }
  /**
   * Handle the DOM events for the directory listing.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMousedown(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseup(event as MouseEvent);
        break;
      case 'mousemove':
        this._evtMousemove(event as MouseEvent);
        break;
      case 'keydown':
        this.evtKeydown(event as KeyboardEvent);
        break;
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      case 'dblclick':
        this.evtDblClick(event as MouseEvent);
        break;
      case 'dragenter':
      case 'dragover':
        this.addClass('jp-mod-native-drop');
        event.preventDefault();
        break;
      case 'dragleave':
      case 'dragend':
        this.removeClass('jp-mod-native-drop');
        break;
      case 'drop':
        this.removeClass('jp-mod-native-drop');
        this.evtNativeDrop(event as DragEvent);
        break;
      case 'scroll':
        this._evtScroll(event as MouseEvent);
        break;
      case 'lm-dragenter':
        this.evtDragEnter(event as Drag.Event);
        break;
      case 'lm-dragleave':
        this.evtDragLeave(event as Drag.Event);
        break;
      case 'lm-dragover':
        this.evtDragOver(event as Drag.Event);
        break;
      case 'lm-drop':
        this.evtDrop(event as Drag.Event);
        break;
      default:
        break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    const node = this.node;
    this._width = this._computeContentWidth();
    const content = DOMUtils.findElement(node, CONTENT_CLASS);
    node.addEventListener('mousedown', this);
    node.addEventListener('keydown', this);
    node.addEventListener('click', this);
    node.addEventListener('dblclick', this);
    this._contentSizeObserver.observe(content);
    content.addEventListener('dragenter', this);
    content.addEventListener('dragover', this);
    content.addEventListener('dragleave', this);
    content.addEventListener('dragend', this);
    content.addEventListener('drop', this);
    content.addEventListener('scroll', this);
    content.addEventListener('lm-dragenter', this);
    content.addEventListener('lm-dragleave', this);
    content.addEventListener('lm-dragover', this);
    content.addEventListener('lm-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    const node = this.node;
    const content = DOMUtils.findElement(node, CONTENT_CLASS);
    node.removeEventListener('mousedown', this);
    node.removeEventListener('keydown', this);
    node.removeEventListener('click', this);
    node.removeEventListener('dblclick', this);
    this._contentSizeObserver.disconnect();
    content.removeEventListener('scroll', this);
    content.removeEventListener('dragover', this);
    content.removeEventListener('dragover', this);
    content.removeEventListener('dragleave', this);
    content.removeEventListener('dragend', this);
    content.removeEventListener('drop', this);
    content.removeEventListener('lm-dragenter', this);
    content.removeEventListener('lm-dragleave', this);
    content.removeEventListener('lm-dragover', this);
    content.removeEventListener('lm-drop', this);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._isDirty) {
      // Update the sorted items.
      this.sort(this.sortState);
      this.update();
    }
  }

  private _onContentResize(): void {
    const content = DOMUtils.findElement(this.node, CONTENT_CLASS);
    const scrollbarWidth = content.offsetWidth - content.clientWidth;
    if (scrollbarWidth != this._contentScrollbarWidth) {
      this._contentScrollbarWidth = scrollbarWidth;
      this._width = this._computeContentWidth();
      this._updateColumnSizes();
    }
  }

  private _computeContentWidth(width: number | null = null) {
    if (!width) {
      width = this.node.getBoundingClientRect().width;
    }

    this._paddingWidth = parseFloat(
      window
        .getComputedStyle(this.node)
        .getPropertyValue('--jp-dirlisting-padding-width')
    );

    const handle = this.node.querySelector(`.${RESIZE_HANDLE_CLASS}`);

    this._handleWidth = handle
      ? handle.getBoundingClientRect().width
      : DEFAULT_HANDLE_WIDTH;
    return width - this._paddingWidth * 2 - this._contentScrollbarWidth;
  }

  /**
   * Update the modified column's size
   */
  private _updateModifiedSize(node: HTMLElement) {
    // Look for the modified column's header
    const modified = DOMUtils.findElement(node, MODIFIED_ID_CLASS);
    this._modifiedWidth =
      this._columnSizes['last_modified'] ??
      modified?.getBoundingClientRect().width ??
      83;
    this._modifiedStyle =
      this._modifiedWidth < 100
        ? 'narrow'
        : this._modifiedWidth > 120
        ? 'long'
        : 'short';
  }

  /**
   * Rerender item nodes' modified dates, if the modified style has changed.
   */
  private _updateModifiedStyleAndSize() {
    const oldModifiedStyle = this._modifiedStyle;
    // Update both size and style
    this._updateModifiedSize(this.node);
    if (oldModifiedStyle !== this._modifiedStyle) {
      this.updateModified(this._sortedItems, this._items);
    }
  }

  /**
   * Update only the modified dates.
   */
  protected updateModified(items: Contents.IModel[], nodes: HTMLElement[]) {
    items.forEach((item, i) => {
      const node = nodes[i];
      if (node && item.last_modified) {
        const modified = DOMUtils.findElement(node, ITEM_MODIFIED_CLASS);
        if (this.renderer.updateItemModified !== undefined) {
          this.renderer.updateItemModified(
            modified,
            item.last_modified,
            this._modifiedStyle
          );
        } else {
          DirListing.defaultRenderer.updateItemModified(
            modified,
            item.last_modified,
            this._modifiedStyle
          );
        }
      }
    });
  }

  // Update item nodes based on widget state.
  protected updateNodes(
    items: Contents.IModel[],
    nodes: HTMLElement[],
    sizeOnly = false
  ) {
    items.forEach((item, i) => {
      const node = nodes[i];
      if (sizeOnly && this.renderer.updateItemSize) {
        if (!node) {
          // short-circuit in case if node is not yet ready
          return;
        }
        return this.renderer.updateItemSize(
          node,
          item,
          this._modifiedStyle,
          this._columnSizes
        );
      }
      const ft = this._manager.registry.getFileTypeForModel(item);
      this.renderer.updateItemNode(
        node,
        item,
        ft,
        this.translator,
        this._hiddenColumns,
        this.selection[item.path],
        this._modifiedStyle,
        this._columnSizes
      );
      if (
        this.selection[item.path] &&
        this._isCut &&
        this._model.path === this._prevPath
      ) {
        node.classList.add(CUT_CLASS);
      }

      // add metadata to the node
      node.setAttribute(
        'data-isdir',
        item.type === 'directory' ? 'true' : 'false'
      );
    });

    // Handle the selectors on the widget node.
    const selected = Object.keys(this.selection).length;
    if (selected) {
      this.addClass(SELECTED_CLASS);
      if (selected > 1) {
        this.addClass(MULTI_SELECTED_CLASS);
      }
    }

    // Handle file session statuses.
    const paths = items.map(item => item.path);
    for (const session of this._model.sessions()) {
      const index = ArrayExt.firstIndexOf(paths, session.path);
      const node = nodes[index];
      // Node may have been filtered out.
      if (node) {
        let name = session.kernel?.name;
        const specs = this._model.specs;

        node.classList.add(RUNNING_CLASS);
        if (specs && name) {
          const spec = specs.kernelspecs[name];
          name = spec ? spec.display_name : this._trans.__('unknown');
        }

        // Update node title only if it has changed.
        const prevState = this._lastRenderedState.get(node);
        if (prevState !== node.title) {
          node.title = this._trans.__('%1\nKernel: %2', node.title, name);
          this._lastRenderedState.set(node, node.title);
        }
      }
    }
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    this._isDirty = false;

    // Fetch common variables.
    const items = this._sortedItems;
    const nodes = this._items;
    const content = DOMUtils.findElement(this.node, CONTENT_CLASS);
    const renderer = this._renderer;

    this.removeClass(MULTI_SELECTED_CLASS);
    this.removeClass(SELECTED_CLASS);

    // Remove any excess item nodes.
    while (nodes.length > items.length) {
      content.removeChild(nodes.pop()!);
    }

    // Add any missing item nodes.
    while (nodes.length < items.length) {
      const node = renderer.createItemNode(
        this._hiddenColumns,
        this._columnSizes
      );
      node.classList.add(ITEM_CLASS);
      nodes.push(node);
      content.appendChild(node);
    }

    nodes.forEach((node, i) => {
      // Remove extra classes from the nodes.
      node.classList.remove(SELECTED_CLASS);
      node.classList.remove(RUNNING_CLASS);
      node.classList.remove(CUT_CLASS);

      // Uncheck each file checkbox
      const checkbox = renderer.getCheckboxNode(node);
      if (checkbox) {
        checkbox.checked = false;
      }

      // Handle `tabIndex`
      const nameNode = renderer.getNameNode(node);
      if (nameNode) {
        // Must check if the name node is there because it gets replaced by the
        // edit node when editing the name of the file or directory.
        nameNode.tabIndex = i === this._focusIndex ? 0 : -1;
      }
    });

    // Put the check-all checkbox in the header into the correct state
    const checkAllCheckbox = renderer.getCheckboxNode(this.headerNode);
    if (checkAllCheckbox) {
      const totalSelected = Object.keys(this.selection).length;
      const allSelected = items.length > 0 && totalSelected === items.length;
      const someSelected = !allSelected && totalSelected > 0;
      checkAllCheckbox.checked = allSelected;
      checkAllCheckbox.indeterminate = someSelected;
      // Stash the state in data attributes so we can access them in the click
      // handler (because in the click handler, checkbox.checked and
      // checkbox.indeterminate do not hold the previous value; they hold the
      // next value).
      checkAllCheckbox.dataset.checked = String(allSelected);
      checkAllCheckbox.dataset.indeterminate = String(someSelected);

      const trans = this.translator.load('jupyterlab');
      checkAllCheckbox?.setAttribute(
        'aria-label',
        allSelected || someSelected
          ? trans.__('Deselect all files and directories')
          : trans.__('Select all files and directories')
      );
    }

    this.updateNodes(items, nodes);

    this._prevPath = this._model.path;
  }

  onResize(msg: Widget.ResizeMessage): void {
    const { width } =
      msg.width === -1 ? this.node.getBoundingClientRect() : msg;
    this._width = this._computeContentWidth(width);
    this._updateColumnSizes();
  }

  setColumnVisibility(
    name: DirListing.ToggleableColumn,
    visible: boolean
  ): void {
    if (visible) {
      this._hiddenColumns.delete(name);
    } else {
      this._hiddenColumns.add(name);
    }

    this.headerNode.innerHTML = '';
    this._renderer.populateHeaderNode(
      this.headerNode,
      this.translator,
      this._hiddenColumns,
      this._columnSizes
    );

    this._updateColumnSizes();
  }

  private _updateColumnSizes(
    doNotGrowBeforeInclusive: DirListing.IColumn['id'] | null = null
  ) {
    // Adjust column sizes so that they add up to the total width available, preserving ratios
    const visibleColumns = this._visibleColumns
      .map(column => ({
        ...column,
        element: DOMUtils.findElement(this.node, column.className)
      }))
      .filter(column => {
        // While all visible column will have an element, some extensions like jupyter-unfold
        // do not render columns even if user requests them to be visible; this filter exists
        // to ensure backward compatibility with such extensions and may be removed in the future.
        return column.element;
      });

    // read from DOM
    let total = 0;
    for (const column of visibleColumns) {
      let size = this._columnSizes[column.id];
      if (size === null) {
        size = column.element.getBoundingClientRect().width;
      }
      // restrict the minimum and maximum width
      size = Math.max(size, column.minWidth);
      if (this._width) {
        let reservedForOtherColumns = 0;
        for (const other of visibleColumns) {
          if (other.id === column.id) {
            continue;
          }
          reservedForOtherColumns += other.minWidth;
        }
        size = Math.min(size, this._width - reservedForOtherColumns);
      }
      this._columnSizes[column.id] = size;
      total += size;
    }

    // Ensure that total fits
    if (this._width) {
      // Distribute the excess/shortfall over the columns which should stretch.
      const excess = this._width - total;
      let growAllowed = doNotGrowBeforeInclusive === null;
      const growColumns = visibleColumns.filter(c => {
        if (growAllowed) {
          return true;
        }
        if (c.id === doNotGrowBeforeInclusive) {
          growAllowed = true;
        }
        return false;
      });
      const totalWeight = growColumns
        .map(c => c.grow)
        .reduce((a, b) => a + b, 0);
      for (const column of growColumns) {
        // The value of `growBy` will be negative when the down-sizing
        const growBy = (excess * column.grow) / totalWeight;
        this._columnSizes[column.id] = this._columnSizes[column.id]! + growBy;
      }
    }

    const resizeHandles = this.node.getElementsByClassName(RESIZE_HANDLE_CLASS);
    const resizableColumns = visibleColumns.map(column =>
      Private.isResizable(column)
    );

    // Write to DOM
    let i = 0;
    for (const column of visibleColumns) {
      let size = this._columnSizes[column.id];

      if (Private.isResizable(column) && size) {
        size -=
          (this._handleWidth * resizeHandles.length) / resizableColumns.length;
        // if this is first resizable or last resizable column
        if (i === 0 || i === resizableColumns.length - 1) {
          size += this._paddingWidth;
        }
        i += 1;
      }
      column.element.style.width = size === null ? '' : size + 'px';
    }
    this._updateModifiedStyleAndSize();

    // Refresh sizes on the per item widths
    if (this.isVisible) {
      const items = this._items;
      if (items.length !== 0) {
        this.updateNodes(this._sortedItems, this._items, true);
      }
    }

    if (this._state && this._stateColumnsKey) {
      void this._state.save(this._stateColumnsKey, {
        sizes: this._columnSizes
      });
    }
  }

  private get _visibleColumns() {
    return DirListing.columns.filter(
      column => column.id === 'name' || !this._hiddenColumns?.has(column.id)
    );
  }

  private _setColumnSize(
    name: DirListing.ResizableColumn,
    size: number | null
  ): void {
    const previousSize = this._columnSizes[name];
    if (previousSize && size && size > previousSize) {
      // check if we can resize up
      let total = 0;
      let before = true;
      for (const column of this._visibleColumns) {
        if (column.id === name) {
          // add proposed size for the current columns
          total += size;
          before = false;
          continue;
        }
        if (before) {
          // add size as-is for columns before
          const element = DOMUtils.findElement(this.node, column.className);
          total +=
            this._columnSizes[column.id] ??
            element.getBoundingClientRect().width;
        } else {
          // add minimum acceptable size for columns after
          total += column.minWidth;
        }
      }
      if (this._width && total > this._width) {
        // up sizing is no longer possible
        return;
      }
    }
    this._columnSizes[name] = size;
    this._updateColumnSizes(name);
  }

  /**
   * Update the setting to sort notebooks above files.
   * This sorts the items again if the internal value is modified.
   */
  setNotebooksFirstSorting(isEnabled: boolean) {
    let previousValue = this._sortNotebooksFirst;
    this._sortNotebooksFirst = isEnabled;
    if (this._sortNotebooksFirst !== previousValue) {
      this.sort(this._sortState);
    }
  }

  /**
   * Update the setting to allow single click navigation.
   * This enables opening files/directories with a single click.
   */
  setAllowSingleClickNavigation(isEnabled: boolean) {
    this._allowSingleClick = isEnabled;
  }

  /**
   * Would this click (or other event type) hit the checkbox by default?
   */
  protected isWithinCheckboxHitArea(event: Event): boolean {
    let element: HTMLElement | null = event.target as HTMLElement;
    while (element) {
      if (element.classList.contains(CHECKBOX_WRAPPER_CLASS)) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    const header = this.headerNode;
    const renderer = this._renderer;
    if (header.contains(target)) {
      const checkbox = renderer.getCheckboxNode(header);
      if (checkbox && this.isWithinCheckboxHitArea(event)) {
        const previouslyUnchecked =
          checkbox.dataset.indeterminate === 'false' &&
          checkbox.dataset.checked === 'false';
        // The only time a click on the check-all checkbox should check all is
        // when it was previously unchecked; otherwise, if the checkbox was
        // either checked (all selected) or indeterminate (some selected), the
        // click should clear all.
        if (previouslyUnchecked) {
          // Select all items
          this._sortedItems.forEach(
            (item: Contents.IModel) => (this.selection[item.path] = true)
          );
        } else {
          // Unselect all items
          this.clearSelectedItems();
        }
        this.update();
      } else {
        const state = this.renderer.handleHeaderClick(header, event);
        if (state) {
          this.sort(state);
        }
      }
      return;
    } else {
      // Focus the selected file on click to ensure a couple of things:
      // 1. If a user clicks on the item node, its name node will receive focus.
      // 2. If a user clicks on blank space in the directory listing, the
      //    previously focussed item will be focussed.
      this._focusItem(this._focusIndex);
    }

    if (this._allowSingleClick) {
      this.evtDblClick(event as MouseEvent);
    }
  }

  /**
   * Handle the `'scroll'` event for the widget.
   */
  private _evtScroll(event: MouseEvent): void {
    this.headerNode.scrollLeft = this.contentNode.scrollLeft;
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   */
  private _evtMousedown(event: MouseEvent): void {
    // Bail if clicking within the edit node
    if (event.target === this._editNode) {
      return;
    }

    // Blur the edit node if necessary.
    if (this._editNode.parentNode) {
      if (this._editNode !== (event.target as HTMLElement)) {
        this._editNode.focus();
        this._editNode.blur();
        clearTimeout(this._selectTimer);
      } else {
        return;
      }
    }

    let index = Private.hitTestNodes(this._items, event);

    if (index === -1) {
      // Left mouse press for drag or resize start.
      if (event.button === 0) {
        const resizeHandle = event.target;
        if (
          resizeHandle instanceof HTMLElement &&
          resizeHandle.classList.contains(RESIZE_HANDLE_CLASS)
        ) {
          const columnId = resizeHandle.dataset.column as
            | DirListing.ResizableColumn
            | undefined;
          if (!columnId) {
            throw Error(
              'Column resize handle is missing data-column attribute'
            );
          }
          const column = DirListing.columns.find(c => c.id === columnId);
          if (!column) {
            throw Error(`Column with identifier ${columnId} not found`);
          }
          const element = DOMUtils.findElement(this.node, column.className);
          resizeHandle.classList.add(ACTIVE_CLASS);
          const cursorOverride = Drag.overrideCursor('col-resize');

          this._resizeData = {
            pressX: event.clientX,
            column: columnId,
            initialSize: element.getBoundingClientRect().width,
            overrides: new DisposableDelegate(() => {
              cursorOverride.dispose();
              resizeHandle.classList.remove(ACTIVE_CLASS);
            })
          };
          document.addEventListener('mouseup', this, true);
          document.addEventListener('mousemove', this, true);
          return;
        }
      }
      return;
    }

    this.handleFileSelect(event);

    if (event.button !== 0) {
      clearTimeout(this._selectTimer);
    }

    // Check for clearing a context menu.
    const newContext = (IS_MAC && event.ctrlKey) || event.button === 2;
    if (newContext) {
      return;
    }

    // Left mouse press for drag or resize start.
    if (event.button === 0) {
      this._dragData = {
        pressX: event.clientX,
        pressY: event.clientY,
        index: index
      };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    // Handle any soft selection from the previous mouse down.
    if (this._softSelection) {
      const altered = event.metaKey || event.shiftKey || event.ctrlKey;
      // See if we need to clear the other selection.
      if (!altered && event.button === 0) {
        this.clearSelectedItems();
        this.selection[this._softSelection] = true;
        this.update();
      }
      this._softSelection = '';
    }
    // Re-focus. This is needed because nodes corresponding to files selected in
    // mousedown handler will not retain the focus as mousedown event is always
    // followed by a blur/focus event.
    if (event.button === 0) {
      this._focusItem(this._focusIndex);
    }

    // Remove the resize listeners if necessary.
    if (this._resizeData) {
      this._resizeData.overrides.dispose();
      this._resizeData = null;
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }

    // Remove the drag listeners if necessary.
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this._resizeData) {
      const { initialSize, column, pressX } = this._resizeData;
      this._setColumnSize(column, initialSize + event.clientX - pressX);
      return;
    }

    // Bail if we are the one dragging.
    if (this._drag || !this._dragData) {
      return;
    }

    // Check for a drag initialization.
    const data = this._dragData;
    const dx = Math.abs(event.clientX - data.pressX);
    const dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(data.index, event.clientX, event.clientY);
  }

  /**
   * Handle the opening of an item.
   */
  protected handleOpen(item: Contents.IModel): void {
    this._onItemOpened.emit(item);
    if (item.type === 'directory') {
      const localPath = this._manager.services.contents.localPath(item.path);
      this._model
        .cd(`/${localPath}`)
        .catch(error =>
          showErrorMessage(
            this._trans._p('showErrorMessage', 'Open directory'),
            error
          )
        );
    } else {
      const path = item.path;
      this._manager.openOrReveal(path);
    }
  }

  /**
   * Calculate the next focus index, given the current focus index and a
   * direction, keeping within the bounds of the directory listing.
   *
   * @param index Current focus index
   * @param direction -1 (up) or 1 (down)
   * @returns The next focus index, which could be the same as the current focus
   * index if at the boundary.
   */
  private _getNextFocusIndex(index: number, direction: number): number {
    const nextIndex = index + direction;
    if (nextIndex === -1 || nextIndex === this._items.length) {
      // keep focus index within bounds
      return index;
    } else {
      return nextIndex;
    }
  }

  /**
   * Handle the up or down arrow key.
   *
   * @param event The keyboard event
   * @param direction -1 (up) or 1 (down)
   */
  private _handleArrowY(event: KeyboardEvent, direction: number) {
    // We only handle the `ctrl` and `shift` modifiers. If other modifiers are
    // present, then do nothing.
    if (event.altKey || event.metaKey) {
      return;
    }

    // If folder is empty, there's nothing to do with the up/down key.
    if (!this._items.length) {
      return;
    }

    // Don't handle the arrow key press if it's not on directory item. This
    // avoids a confusing user experience that can result from when the user
    // moves the selection and focus index apart (via ctrl + up/down). The last
    // selected item remains highlighted but the last focussed item loses its
    // focus ring if it's not actively focussed.  This forces the user to
    // visibly reveal the last focussed item before moving the focus.
    if (!(event.target as HTMLElement).classList.contains(ITEM_TEXT_CLASS)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const focusIndex = this._focusIndex;
    let nextFocusIndex = this._getNextFocusIndex(focusIndex, direction);

    // The following if-block allows the first press of the down arrow to select
    // the first (rather than the second) file/directory in the list. This is
    // the situation when the page first loads or when a user changes directory.
    if (
      direction > 0 &&
      focusIndex === 0 &&
      !event.ctrlKey &&
      Object.keys(this.selection).length === 0
    ) {
      nextFocusIndex = 0;
    }

    // Shift key indicates multi-selection. Either the user is trying to grow
    // the selection, or shrink it.
    if (event.shiftKey) {
      this._handleMultiSelect(nextFocusIndex);
    } else if (!event.ctrlKey) {
      // If neither the shift nor ctrl keys were used with the up/down arrow,
      // then we treat it as a normal, unmodified key press and select the
      // next item.
      this._selectItem(
        nextFocusIndex,
        event.shiftKey,
        false /* focus = false because we call focus method directly following this */
      );
    }

    this._focusItem(nextFocusIndex);
    this.update();
  }

  /**
   * cd ..
   *
   * Go up one level in the directory tree.
   */
  async goUp() {
    const model = this.model;
    if (model.path === model.rootPath) {
      return;
    }
    try {
      await model.cd('..');
    } catch (reason) {
      console.warn(`Failed to go to parent directory of ${model.path}`, reason);
    }
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  protected evtKeydown(event: KeyboardEvent): void {
    // Do not handle any keydown events here if in the middle of a file rename.
    if (this._inRename) {
      return;
    }

    switch (event.keyCode) {
      case 13: {
        // Enter
        // Do nothing if any modifier keys are pressed.
        if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        for (const item of this.selectedItems()) {
          this.handleOpen(item);
        }
        return;
      }
      case 38:
        // Up arrow
        this._handleArrowY(event, -1);
        return;
      case 40:
        // Down arrow
        this._handleArrowY(event, 1);
        return;
      case 32: {
        // Space
        if (event.ctrlKey) {
          // Follow the Windows and Ubuntu convention: you must press `ctrl` +
          // `space` in order to toggle whether an item is selected.

          // However, do not handle if any other modifiers were pressed.
          if (event.metaKey || event.shiftKey || event.altKey) {
            return;
          }

          // Make sure the ctrl+space key stroke was on a valid, focussed target.
          const node = this._items[this._focusIndex];
          if (
            !(
              // Event must have occurred within a node whose item can be toggled.
              (
                node.contains(event.target as HTMLElement) &&
                // That node must also contain the currently focussed element.
                node.contains(document.activeElement)
              )
            )
          ) {
            return;
          }

          event.stopPropagation();
          // Prevent default, otherwise the container will scroll.
          event.preventDefault();

          // Toggle item selected
          const { path } = this._sortedItems[this._focusIndex];
          if (this.selection[path]) {
            delete this.selection[path];
          } else {
            this.selection[path] = true;
          }

          this.update();
          // Key was handled, so return.
          return;
        }
        break;
      }
    }

    // Detects printable characters typed by the user.
    // Not all browsers support .key, but it discharges us from reconstructing
    // characters from key codes.
    if (
      event.key !== undefined &&
      event.key.length === 1 &&
      // Don't gobble up the space key on the check-all checkbox (which the
      // browser treats as a click event).
      !(
        (event.key === ' ' || event.keyCode === 32) &&
        (event.target as HTMLInputElement).type === 'checkbox'
      )
    ) {
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
      }
      this._searchPrefix += event.key;

      clearTimeout(this._searchPrefixTimer);
      this._searchPrefixTimer = window.setTimeout(() => {
        this._searchPrefix = '';
      }, PREFIX_APPEND_DURATION);

      this.selectByPrefix();
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /**
   * Handle the `'dblclick'` event for the widget.
   */
  protected evtDblClick(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if any modifier keys are pressed.
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return;
    }

    // Do nothing if the double click is on a checkbox. (Otherwise a rapid
    // check-uncheck on the checkbox will cause the adjacent file/folder to
    // open, which is probably not what the user intended.)
    if (this.isWithinCheckboxHitArea(event)) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    clearTimeout(this._selectTimer);
    this._editNode.blur();

    // Find a valid double click target.
    const target = event.target as HTMLElement;
    const i = ArrayExt.findFirstIndex(this._items, node =>
      node.contains(target)
    );
    if (i === -1) {
      return;
    }

    const item = this._sortedItems[i];
    this.handleOpen(item);
  }

  /**
   * Handle the `drop` event for the widget.
   */
  protected evtNativeDrop(event: DragEvent): void {
    // Prevent navigation
    event.preventDefault();

    const items = event.dataTransfer?.items;
    if (!items) {
      // Fallback to simple upload of files (if any)
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) {
        return;
      }
      const promises = [];
      for (const file of files) {
        const promise = this._model.upload(file);
        promises.push(promise);
      }
      Promise.all(promises)
        .then(() => this._allUploaded.emit())
        .catch(err => {
          console.error('Error while uploading files: ', err);
        });
      return;
    }

    const uploadEntry = async (entry: FileSystemEntry, path: string) => {
      if (Private.isDirectoryEntry(entry)) {
        const dirPath = await Private.createDirectory(
          this._model.manager,
          path,
          entry.name
        );
        const directoryReader = entry.createReader();

        const allEntries = await Private.collectEntries(directoryReader);
        for (const childEntry of allEntries) {
          await uploadEntry(childEntry, dirPath);
        }
      } else if (Private.isFileEntry(entry)) {
        const file = await Private.readFile(entry);
        await this._model.upload(file, path);
      }
    };

    const promises = [];
    for (const item of items) {
      const entry = Private.defensiveGetAsEntry(item);

      if (!entry) {
        continue;
      }
      const promise = uploadEntry(entry, this._model.path ?? '/');
      promises.push(promise);
    }
    Promise.all(promises)
      .then(() => this._allUploaded.emit())
      .catch(err => {
        console.error('Error while uploading files: ', err);
      });
  }

  /**
   * Signal emitted on when all files were uploaded after native drag.
   */
  protected get allUploaded(): ISignal<DirListing, void> {
    return this._allUploaded;
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  protected evtDragEnter(event: Drag.Event): void {
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      const index = Private.hitTestNodes(this._items, event);
      if (index === -1) {
        return;
      }
      const item = this._sortedItems[index];
      if (item.type !== 'directory' || this.selection[item.path]) {
        return;
      }
      const target = event.target as HTMLElement;
      target.classList.add(DROP_TARGET_CLASS);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  protected evtDragLeave(event: Drag.Event): void {
    event.preventDefault();
    event.stopPropagation();
    const dropTarget = DOMUtils.findElement(this.node, DROP_TARGET_CLASS);
    if (dropTarget) {
      dropTarget.classList.remove(DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  protected evtDragOver(event: Drag.Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    const dropTarget = DOMUtils.findElement(this.node, DROP_TARGET_CLASS);
    if (dropTarget) {
      dropTarget.classList.remove(DROP_TARGET_CLASS);
    }
    const index = Private.hitTestNodes(this._items, event);
    this._items[index].classList.add(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  protected evtDrop(event: Drag.Event): void {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(this._selectTimer);
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    if (!event.mimeData.hasData(CONTENTS_MIME)) {
      return;
    }

    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(DROP_TARGET_CLASS)) {
        target.classList.remove(DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }

    // Get the path based on the target node.
    const index = ArrayExt.firstIndexOf(this._items, target);
    const items = this._sortedItems;
    let basePath = this._model.path;
    if (items[index].type === 'directory') {
      basePath = PathExt.join(basePath, items[index].name);
    }
    const manager = this._manager;

    // Handle the items.
    const promises: Promise<Contents.IModel | null>[] = [];
    const paths = event.mimeData.getData(CONTENTS_MIME) as string[];

    if (event.ctrlKey && event.proposedAction === 'move') {
      event.dropAction = 'copy';
    } else {
      event.dropAction = event.proposedAction;
    }
    for (const path of paths) {
      const localPath = manager.services.contents.localPath(path);
      const name = PathExt.basename(localPath);
      const newPath = PathExt.join(basePath, name);
      // Skip files that are not moving.
      if (newPath === path) {
        continue;
      }

      if (event.dropAction === 'copy') {
        promises.push(manager.copy(path, basePath));
      } else {
        promises.push(renameFile(manager, path, newPath));
      }
    }
    Promise.all(promises).catch(error => {
      void showErrorMessage(
        this._trans._p('showErrorMessage', 'Error while copying/moving files'),
        error
      );
    });
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let selectedPaths = Object.keys(this.selection);
    const source = this._items[index];
    const items = this._sortedItems;
    let selectedItems: Iterable<Contents.IModel>;
    let item: Contents.IModel | undefined;

    // If the source node is not selected, use just that node.
    if (!source.classList.contains(SELECTED_CLASS)) {
      item = items[index];
      selectedPaths = [item.path];
      selectedItems = [item];
    } else {
      const path = selectedPaths[0];
      item = items.find(value => value.path === path);
      selectedItems = this.selectedItems();
    }

    if (!item) {
      return;
    }

    // Create the drag image.
    const ft = this._manager.registry.getFileTypeForModel(item);
    const dragImage = this.renderer.createDragImage(
      source,
      selectedPaths.length,
      this._trans,
      ft
    );

    // Set up the drag event.
    this._drag = new Drag({
      dragImage,
      mimeData: new MimeData(),
      supportedActions: 'move',
      proposedAction: 'move'
    });

    this._drag.mimeData.setData(CONTENTS_MIME, selectedPaths);

    // Add thunks for getting mime data content.
    // We thunk the content so we don't try to make a network call
    // when it's not needed. E.g. just moving files around
    // in a filebrowser
    const services = this.model.manager.services;
    for (const item of selectedItems) {
      this._drag.mimeData.setData(CONTENTS_MIME_RICH, {
        model: item,
        withContent: async () => {
          return await services.contents.get(item.path);
        }
      } as DirListing.IContentsThunk);
    }

    if (item && item.type !== 'directory') {
      const otherPaths = selectedPaths.slice(1).reverse();
      this._drag.mimeData.setData(FACTORY_MIME, () => {
        if (!item) {
          return;
        }
        const path = item.path;
        let widget = this._manager.findWidget(path);
        if (!widget) {
          widget = this._manager.open(item.path);
        }
        if (otherPaths.length) {
          const firstWidgetPlaced = new PromiseDelegate<void>();
          void firstWidgetPlaced.promise.then(() => {
            let prevWidget = widget;
            otherPaths.forEach(path => {
              const options: DocumentRegistry.IOpenOptions = {
                ref: prevWidget?.id,
                mode: 'tab-after'
              };
              prevWidget = this._manager.openOrReveal(
                path,
                void 0,
                void 0,
                options
              );
              this._manager.openOrReveal(item!.path);
            });
          });
          firstWidgetPlaced.resolve(void 0);
        }
        return widget;
      });
    }

    // Start the drag and remove the mousemove and mouseup listeners.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    clearTimeout(this._selectTimer);
    void this._drag.start(clientX, clientY).then(action => {
      this._drag = null;
      clearTimeout(this._selectTimer);
    });
  }

  /**
   * Handle selection on a file node.
   */
  protected handleFileSelect(event: MouseEvent): void {
    // Fetch common variables.
    const items = this._sortedItems;
    const index = Private.hitTestNodes(this._items, event);

    clearTimeout(this._selectTimer);

    if (index === -1) {
      return;
    }

    // Clear any existing soft selection.
    this._softSelection = '';

    const path = items[index].path;
    const selected = Object.keys(this.selection);

    const isLeftClickOnCheckbox =
      event.button === 0 &&
      // On Mac, a left-click with the ctrlKey is treated as a right-click.
      !(IS_MAC && event.ctrlKey) &&
      this.isWithinCheckboxHitArea(event);

    // Handle toggling.
    if (
      (IS_MAC && event.metaKey) ||
      (!IS_MAC && event.ctrlKey) ||
      isLeftClickOnCheckbox
    ) {
      if (this.selection[path]) {
        delete this.selection[path];
      } else {
        this.selection[path] = true;
      }
      this._focusItem(index);
      // Handle multiple select.
    } else if (event.shiftKey) {
      this._handleMultiSelect(index);
      this._focusItem(index);
      // Handle a 'soft' selection
    } else if (path in this.selection && selected.length > 1) {
      this._softSelection = path;

      // Default to selecting the only the item.
    } else {
      // Select only the given item.
      return this._selectItem(index, false, true);
    }
    this.update();
  }

  /**
   * (Re-)focus an item in the directory listing.
   *
   * @param index The index of the item node to focus
   */
  private _focusItem(index: number): void {
    const items = this._items;
    if (items.length === 0) {
      // Focus the top node if the folder is empty and therefore there are no
      // items inside the folder to focus.
      this._focusIndex = 0;
      this.node.focus();
      return;
    }
    this._focusIndex = index;
    const node = items[index];
    const nameNode = this.renderer.getNameNode(node);
    if (nameNode) {
      // Make the filename text node focusable so that it receives keyboard
      // events; text node was specifically chosen to receive shortcuts because
      // it gets substituted with input element during file name edits which
      // conveniently deactivates irrelevant shortcuts.
      nameNode.tabIndex = 0;
      nameNode.focus();
    }
  }

  /**
   * Are all of the items between two provided indices selected?
   *
   * The items at the indices are not considered.
   *
   * @param j Index of one item.
   * @param k Index of another item. Note: may be less or greater than first
   *          index.
   * @returns True if and only if all items between the j and k are selected.
   *          Returns undefined if j and k are the same.
   */
  private _allSelectedBetween(j: number, k: number): boolean | void {
    if (j === k) {
      return;
    }
    const [start, end] = j < k ? [j + 1, k] : [k + 1, j];
    return this._sortedItems
      .slice(start, end)
      .reduce((result, item) => result && this.selection[item.path], true);
  }

  /**
   * Handle a multiple select on a file item node.
   */
  private _handleMultiSelect(index: number): void {
    const items = this._sortedItems;
    const fromIndex = this._focusIndex;
    const target = items[index];
    let shouldAdd = true;

    if (index === fromIndex) {
      // This follows the convention in Ubuntu and Windows, which is to allow
      // the focussed item to gain but not lose selected status on shift-click.
      // (MacOS is irrelevant here because MacOS Finder has no notion of a
      // focused-but-not-selected state.)
      this.selection[target.path] = true;
      return;
    }

    // If the target and all items in-between are selected, then we assume that
    // the user is trying to shrink rather than grow the group of selected
    // items.
    if (this.selection[target.path]) {
      // However, there is a special case when the distance between the from-
      // and to- index is just one (for example, when the user is pressing the
      // shift key plus arrow-up/down). If and only if the situation looks like
      // the following when going down (or reverse when going up) ...
      //
      // - [ante-anchor / previous item] unselected (or boundary)
      // - [anchor / currently focussed item / item at from-index] selected
      // - [target / next item / item at to-index] selected
      //
      // ... then we shrink the selection / unselect the currently focussed
      // item.
      if (Math.abs(index - fromIndex) === 1) {
        const anchor = items[fromIndex];
        const anteAnchor = items[fromIndex + (index < fromIndex ? 1 : -1)];
        if (
          // Currently focussed item is selected
          this.selection[anchor.path] &&
          // Item on other side of focussed item (away from target) is either a
          // boundary or unselected
          (!anteAnchor || !this.selection[anteAnchor.path])
        ) {
          delete this.selection[anchor.path];
        }
      } else if (this._allSelectedBetween(fromIndex, index)) {
        shouldAdd = false;
      }
    }

    // Select (or unselect) the rows between chosen index (target) and the last
    // focussed.
    const step = fromIndex < index ? 1 : -1;
    for (let i = fromIndex; i !== index + step; i += step) {
      if (shouldAdd) {
        if (i === fromIndex) {
          // Do not change the selection state of the starting (fromIndex) item.
          continue;
        }
        this.selection[items[i].path] = true;
      } else {
        if (i === index) {
          // Do not unselect the target item.
          continue;
        }
        delete this.selection[items[i].path];
      }
    }
  }

  /**
   * Copy the selected items, and optionally cut as well.
   */
  private _copy(): void {
    this._clipboard.length = 0;
    for (const item of this.selectedItems()) {
      this._clipboard.push(item.path);
    }
  }

  /**
   * Delete the files with the given paths.
   */
  private async _delete(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(path =>
        this._model.manager.deleteFile(path).catch(err => {
          void showErrorMessage(
            this._trans._p('showErrorMessage', 'Delete Failed'),
            err
          );
        })
      )
    );
  }

  /**
   * Allow the user to rename item on a given row.
   */
  private async _doRename(): Promise<string> {
    this._inRename = true;

    const selectedPaths = Object.keys(this.selection);

    // Bail out if nothing has been selected.
    if (selectedPaths.length === 0) {
      this._inRename = false;
      return Promise.resolve('');
    }

    // Figure out which selected path to use for the rename.
    const items = this._sortedItems;
    let { path } = items[this._focusIndex];
    if (!this.selection[path]) {
      // If the currently focused item is not selected, then choose the last
      // selected item.
      path = selectedPaths.slice(-1)[0];
    }

    // Get the corresponding model, nodes, and file name.
    const index = ArrayExt.findFirstIndex(items, value => value.path === path);
    const row = this._items[index];
    const item = items[index];
    const nameNode = this.renderer.getNameNode(row);
    const original = item.name;

    // Seed the text input with current file name, and select and focus it.
    this._editNode.value = original;
    this._selectItem(index, false, true);

    // Wait for user input
    const newName = await Private.userInputForRename(
      nameNode,
      this._editNode,
      original
    );

    // Check if the widget was disposed during the `await`.
    if (this.isDisposed) {
      this._inRename = false;
      throw new Error('File browser is disposed.');
    }

    let finalFilename = newName;

    if (!newName || newName === original) {
      finalFilename = original;
    } else if (!isValidFileName(newName)) {
      void showErrorMessage(
        this._trans.__('Rename Error'),
        Error(
          this._trans._p(
            'showErrorMessage',
            '"%1" is not a valid name for a file. Names must have nonzero length, and cannot include "/", "\\", or ":"',
            newName
          )
        )
      );
      finalFilename = original;
    } else {
      // Attempt rename at the file system level.

      const manager = this._manager;
      const oldPath = PathExt.join(this._model.path, original);
      const newPath = PathExt.join(this._model.path, newName);
      try {
        await renameFile(manager, oldPath, newPath);
      } catch (error) {
        if (error !== 'File not renamed') {
          void showErrorMessage(
            this._trans._p('showErrorMessage', 'Rename Error'),
            error
          );
        }
        finalFilename = original;
      }

      // Check if the widget was disposed during the `await`.
      if (this.isDisposed) {
        this._inRename = false;
        throw new Error('File browser is disposed.');
      }
    }

    // If nothing else has been selected, then select the renamed file. In
    // other words, don't select the renamed file if the user has clicked
    // away to some other file.
    if (
      !this.isDisposed &&
      Object.keys(this.selection).length === 1 &&
      // We haven't updated the instance yet to reflect the rename, so unless
      // the user or something else has updated the selection, the original file
      // path and not the new file path will be in `this.selection`.
      this.selection[item.path]
    ) {
      try {
        await this._selectItemByName(finalFilename, true, true);
      } catch {
        // do nothing
        console.warn('After rename, failed to select file', finalFilename);
      }
    }

    this._inRename = false;
    return finalFilename;
  }

  /**
   * Select a given item.
   */
  private _selectItem(
    index: number,
    keepExisting: boolean,
    focus: boolean = true
  ) {
    // Selected the given row(s)
    const items = this._sortedItems;
    if (!keepExisting) {
      this.clearSelectedItems();
    }
    const path = items[index].path;
    this.selection[path] = true;

    if (focus) {
      this._focusItem(index);
    }
    this.update();
  }

  /**
   * Handle the `refreshed` signal from the model.
   */
  private _onModelRefreshed(): void {
    // Update the selection.
    const existing = Object.keys(this.selection);
    this.clearSelectedItems();
    for (const item of this._model.items()) {
      const path = item.path;
      if (existing.indexOf(path) !== -1) {
        this.selection[path] = true;
      }
    }
    if (this.isVisible) {
      // Update the sorted items.
      this.sort(this.sortState);
    } else {
      this._isDirty = true;
    }
  }

  /**
   * Handle a `pathChanged` signal from the model.
   */
  private _onPathChanged(): void {
    // Reset the selection.
    this.clearSelectedItems();
    // Update the sorted items.
    this.sort(this.sortState);
    // Reset focus. But wait until the DOM has been updated (hence
    // `requestAnimationFrame`).
    requestAnimationFrame(() => {
      this._focusItem(0);
    });
  }

  /**
   * Handle a `fileChanged` signal from the model.
   */
  private _onFileChanged(
    sender: FilterFileBrowserModel,
    args: Contents.IChangedArgs
  ) {
    const newValue = args.newValue;
    if (!newValue) {
      return;
    }

    const name = newValue.name;
    if (args.type !== 'new' || !name) {
      return;
    }

    void this.selectItemByName(name).catch(() => {
      /* Ignore if file does not exist. */
    });
  }

  /**
   * Handle an `activateRequested` signal from the manager.
   */
  private _onActivateRequested(sender: IDocumentManager, args: string): void {
    const dirname = PathExt.dirname(args);
    if (dirname !== this._model.path) {
      return;
    }
    const basename = PathExt.basename(args);
    this.selectItemByName(basename).catch(() => {
      /* Ignore if file does not exist. */
    });
  }

  protected translator: ITranslator;
  protected _model: FilterFileBrowserModel;
  private _trans: TranslationBundle;
  private _editNode: HTMLInputElement;
  private _items: HTMLElement[] = [];
  private _sortedItems: Contents.IModel[] = [];
  private _sortState: DirListing.ISortState = {
    direction: 'ascending',
    key: 'name'
  };
  private _onItemOpened = new Signal<DirListing, Contents.IModel>(this);
  private _drag: Drag | null = null;
  private _dragData: {
    pressX: number;
    pressY: number;
    index: number;
  } | null = null;
  private _resizeData: {
    /**
     * Cursor position when the resize started.
     */
    pressX: number;
    /**
     * Identifier of the column being resized.
     */
    column: DirListing.ResizableColumn;
    /**
     * Size of the column when the cursor grabbed the resize handle.
     */
    initialSize: number;
    /**
     * The disposable to clear the cursor override and resize handle.
     */
    readonly overrides: IDisposable;
  } | null = null;
  private _selectTimer = -1;
  private _isCut = false;
  private _prevPath = '';
  private _clipboard: string[] = [];
  private _manager: IDocumentManager;
  private _softSelection = '';
  protected selection: { [key: string]: boolean } = Object.create(null);
  private _renderer: DirListing.IRenderer;
  private _searchPrefix: string = '';
  private _searchPrefixTimer = -1;
  private _inRename = false;
  private _isDirty = false;
  private _hiddenColumns = new Set<DirListing.ToggleableColumn>();
  private _columnSizes: Record<DirListing.IColumn['id'], number | null> = {
    name: null,
    file_size: null,
    is_selected: null,
    last_modified: null
  };
  private _sortNotebooksFirst = false;
  private _allowSingleClick = false;
  // _focusIndex should never be set outside the range [0, this._items.length - 1]
  private _focusIndex = 0;
  // Width of the "last modified" column for an individual file
  private _modifiedWidth: number;
  private _modifiedStyle: Time.HumanStyle;
  private _allUploaded = new Signal<DirListing, void>(this);
  private _width: number | null = null;
  private _state: IStateDB | null = null;
  private _contentScrollbarWidth: number = 0;
  private _contentSizeObserver = new ResizeObserver(
    this._onContentResize.bind(this)
  );
  private _paddingWidth: number = 0;
  private _handleWidth: number = DEFAULT_HANDLE_WIDTH;
  private _lastRenderedState = new WeakMap<HTMLElement, string>();
}

/**
 * The namespace for the `DirListing` class statics.
 */
export namespace DirListing {
  /**
   * An options object for initializing a file browser directory listing.
   */
  export interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FilterFileBrowserModel;

    /**
     * A renderer for file items.
     *
     * The default is a shared `Renderer` instance.
     */
    renderer?: IRenderer;

    /**
     * A language translator.
     */
    translator?: ITranslator;

    /**
     * An optional state database. If provided, the widget will restore
     * the columns sizes
     */
    state?: IStateDB;
  }

  /**
   * A sort state.
   */
  export interface ISortState {
    /**
     * The direction of sort.
     */
    direction: 'ascending' | 'descending';

    /**
     * The sort key.
     */
    key: SortableColumn;
  }

  /**
   * Toggleable columns.
   */
  export type ToggleableColumn = 'last_modified' | 'is_selected' | 'file_size';

  /**
   * Resizable columns.
   */
  export type ResizableColumn = 'name' | 'last_modified' | 'file_size';

  /**
   * Sortable columns.
   */
  export type SortableColumn = 'name' | 'last_modified' | 'file_size';

  /**
   * A file contents model thunk.
   *
   * Note: The content of the model will be empty.
   * To get the contents, call and await the `withContent`
   * method.
   */
  export interface IContentsThunk {
    /**
     * The contents model.
     */
    model: Contents.IModel;

    /**
     * Fetches the model with contents.
     */
    withContent: () => Promise<Contents.IModel>;
  }

  /**
   * The render interface for file browser listing options.
   */
  export interface IRenderer {
    /**
     * Create the DOM node for a dir listing.
     */
    createNode(): HTMLElement;

    /**
     * Populate and empty header node for a dir listing.
     *
     * @param node - The header node to populate.
     */
    populateHeaderNode(
      node: HTMLElement,
      translator?: ITranslator,
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      columnsSizes?: Record<IColumn['id'], number | null>
    ): void;

    /**
     * Handle a header click.
     *
     * @param node - A node populated by [[populateHeaderNode]].
     *
     * @param event - A click event on the node.
     *
     * @returns The sort state of the header after the click event.
     */
    handleHeaderClick(node: HTMLElement, event: MouseEvent): ISortState | null;

    /**
     * Create a new item node for a dir listing.
     *
     * @returns A new DOM node to use as a content item.
     */
    createItemNode(
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      columnsSizes?: Record<IColumn['id'], number | null>
    ): HTMLElement;

    /**
     * Update an item's last modified date.
     *
     * @param modified - Element containing the file's last modified date.
     *
     * @param modifiedDate - String representation of the last modified date.
     *
     * @param modifiedStyle - The date style for the modified column: narrow, short, or long
     */
    updateItemModified?(
      modified: HTMLElement,
      modifiedDate: string,
      modifiedStyle: Time.HumanStyle
    ): void;

    /**
     * Update an item node to reflect the current state of a model.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param model - The model object to use for the item state.
     *
     * @param modifiedStyle - The date style for the modified column: narrow, short, or long
     *
     * @param fileType - The file type of the item, if applicable.
     */
    updateItemNode(
      node: HTMLElement,
      model: Contents.IModel,
      fileType?: DocumentRegistry.IFileType,
      translator?: ITranslator,
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      selected?: boolean,
      modifiedStyle?: Time.HumanStyle,
      columnsSizes?: Record<IColumn['id'], number | null>
    ): void;

    /**
     * Update size of item nodes, assuming that model has not changed.
     */
    updateItemSize?(
      node: HTMLElement,
      model: Contents.IModel,
      modifiedStyle?: Time.HumanStyle,
      columnsSizes?: Record<IColumn['id'], number | null>
    ): void;

    /**
     * Get the node containing the file name.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @returns The node containing the file name.
     */
    getNameNode(node: HTMLElement): HTMLElement;

    /**
     * Get the checkbox input element node.
     *
     * Downstream interface implementations,such as jupyterlab-unfold, that
     * don't support checkboxes should simply always return null for this
     * function.
     *
     * @param node A node created by [[createItemNode]] or
     * [[createHeaderItemNode]]
     *
     * @returns The checkbox node.
     */
    getCheckboxNode: (node: HTMLElement) => HTMLInputElement | null;

    /**
     * Create an appropriate drag image for an item.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param count - The number of items being dragged.
     *
     * @param fileType - The file type of the item, if applicable.
     *
     * @returns An element to use as the drag image.
     */
    createDragImage(
      node: HTMLElement,
      count: number,
      trans: TranslationBundle,
      fileType?: DocumentRegistry.IFileType
    ): HTMLElement;
  }

  interface IBaseColumn {
    /**
     * Name of the header class, must be unique among other columns.
     */
    className: string;
    /**
     * Name of the item class, must be unique among other columns.
     */
    itemClassName: string;
    /**
     * Minimum size the column should occupy.
     */
    minWidth: number;
    /**
     * Unitless number representing the proportion by which the column
     * should grow when the listing is resized.
     */
    grow: number;
  }
  interface IFixedColumn extends IBaseColumn {
    id: 'is_selected';
    resizable: false;
    sortable: false;
    grow: 0;
  }
  /**
   * Sortable column.
   */
  export interface ISortableColumn extends IBaseColumn {
    id: SortableColumn;
    sortable: true;
    caretSide: 'left' | 'right';
  }
  /**
   * Resizable column.
   */
  export interface IResizableColumn extends IBaseColumn {
    id: ResizableColumn;
    resizable: true;
  }

  /**
   * Columns types supported by DirListing.
   */
  export type IColumn =
    | IFixedColumn
    | ISortableColumn
    | IResizableColumn
    | (ISortableColumn & IResizableColumn);

  /**
   * Column definitions.
   */
  export const columns: IColumn[] = [
    {
      id: 'is_selected' as const,
      className: CHECKBOX_WRAPPER_CLASS,
      itemClassName: CHECKBOX_WRAPPER_CLASS,
      minWidth: 18,
      resizable: false,
      sortable: false,
      grow: 0
    },
    {
      id: 'name' as const,
      className: NAME_ID_CLASS,
      itemClassName: ITEM_NAME_COLUMN_CLASS,
      minWidth: 60,
      resizable: true,
      sortable: true,
      caretSide: 'right',
      grow: 3
    },
    {
      id: 'last_modified' as const,
      className: MODIFIED_ID_CLASS,
      itemClassName: ITEM_MODIFIED_CLASS,
      minWidth: 60,
      resizable: true,
      sortable: true,
      caretSide: 'left',
      grow: 1
    },
    {
      id: 'file_size' as const,
      className: FILE_SIZE_ID_CLASS,
      itemClassName: ITEM_FILE_SIZE_CLASS,
      minWidth: 60,
      resizable: true,
      sortable: true,
      caretSide: 'left',
      grow: 0.5
    }
  ];

  /**
   * The default implementation of an `IRenderer`.
   */
  export class Renderer implements IRenderer {
    /**
     * Create the DOM node for a dir listing.
     */
    createNode(): HTMLElement {
      const node = document.createElement('div');
      const header = document.createElement('div');
      const content = document.createElement('ul');
      // Allow the node to scroll while dragging items.
      content.setAttribute('data-lm-dragscroll', 'true');
      content.className = CONTENT_CLASS;
      header.className = HEADER_CLASS;
      node.appendChild(header);
      node.appendChild(content);
      // Set to -1 to allow calling this.node.focus().
      node.tabIndex = -1;
      return node;
    }

    /**
     * Populate and empty header node for a dir listing.
     *
     * @param node - The header node to populate.
     */
    populateHeaderNode(
      node: HTMLElement,
      translator?: ITranslator,
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      columnsSizes?: Record<DirListing.IColumn['id'], number | null>
    ): void {
      translator = translator || nullTranslator;
      const trans = translator.load('jupyterlab');

      const elementCreators = {
        name: () => this.createHeaderItemNode(trans.__('Name')),
        last_modified: () =>
          this._createHeaderItemNodeWithSizes({
            small: trans.__('Modified'),
            large: trans.__('Last Modified')
          }),
        file_size: () =>
          this._createHeaderItemNodeWithSizes({
            small: trans.__('Size'),
            large: trans.__('File Size')
          }),
        is_selected: () =>
          this.createCheckboxWrapperNode({
            alwaysVisible: true,
            headerNode: true
          })
      };

      const visibleColumns = columns.filter(
        column => column.id === 'name' || !hiddenColumns?.has(column.id)
      );

      for (const column of visibleColumns) {
        const createElement = elementCreators[column.id];
        const element = createElement();
        element.classList.add(column.className);
        const isLastVisible =
          column.id === visibleColumns[visibleColumns.length - 1].id;

        if (columnsSizes) {
          const size = columnsSizes[column.id];
          if (!isLastVisible) {
            element.style.width = size + 'px';
          }
        }
        node.appendChild(element);

        if (Private.isResizable(column) && !isLastVisible) {
          const resizer = document.createElement('div');
          resizer.classList.add(RESIZE_HANDLE_CLASS);
          resizer.dataset.column = column.id;
          node.appendChild(resizer);
        }
      }

      const name = DOMUtils.findElement(node, NAME_ID_CLASS);
      name.classList.add(SELECTED_CLASS);

      // set the initial caret icon
      Private.updateCaret(
        DOMUtils.findElement(name, HEADER_ITEM_ICON_CLASS),
        'right',
        'up'
      );
    }

    /**
     * Handle a header click.
     *
     * @param node - A node populated by [[populateHeaderNode]].
     *
     * @param event - A click event on the node.
     *
     * @returns The sort state of the header after the click event.
     */
    handleHeaderClick(node: HTMLElement, event: MouseEvent): ISortState | null {
      const state: ISortState = { direction: 'ascending', key: 'name' };
      const target = event.target as HTMLElement;

      const sortableColumns = DirListing.columns.filter(Private.isSortable);

      for (const column of sortableColumns) {
        const header = node.querySelector(`.${column.className}`);
        if (!header) {
          // skip if the column is hidden
          continue;
        }
        if (header.contains(target)) {
          state.key = column.id;
          const headerIcon = DOMUtils.findElement(
            header as HTMLElement,
            HEADER_ITEM_ICON_CLASS
          );
          if (header.classList.contains(SELECTED_CLASS)) {
            if (!header.classList.contains(DESCENDING_CLASS)) {
              state.direction = 'descending';
              header.classList.add(DESCENDING_CLASS);
              Private.updateCaret(headerIcon, column.caretSide, 'down');
            } else {
              header.classList.remove(DESCENDING_CLASS);
              Private.updateCaret(headerIcon, column.caretSide, 'up');
            }
          } else {
            header.classList.remove(DESCENDING_CLASS);
            Private.updateCaret(headerIcon, column.caretSide, 'up');
          }
          header.classList.add(SELECTED_CLASS);
          for (const otherColumn of sortableColumns) {
            if (otherColumn.id === column.id) {
              continue;
            }
            const otherHeader = node.querySelector(`.${otherColumn.className}`);
            if (!otherHeader) {
              // skip if hidden
              continue;
            }
            otherHeader.classList.remove(SELECTED_CLASS);
            otherHeader.classList.remove(DESCENDING_CLASS);
            const otherHeaderIcon = DOMUtils.findElement(
              otherHeader as HTMLElement,
              HEADER_ITEM_ICON_CLASS
            );
            Private.updateCaret(otherHeaderIcon, otherColumn.caretSide);
          }
          return state;
        }
      }
      return state;
    }

    /**
     * Create a new item node for a dir listing.
     *
     * @returns A new DOM node to use as a content item.
     */
    createItemNode(
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      columnsSizes?: Record<DirListing.IColumn['id'], number | null>
    ): HTMLElement {
      const node = document.createElement('li');

      for (const column of columns) {
        if (column.id != 'name' && hiddenColumns?.has(column.id)) {
          continue;
        }
        const createElement = this.itemFactories[column.id];
        const element = createElement();
        node.appendChild(element);

        if (columnsSizes) {
          const size = columnsSizes[column.id];
          element.style.width = size + 'px';
        }
      }

      return node;
    }

    /**
     * Creates a node containing a checkbox.
     *
     * We wrap the checkbox in a label element in order to increase its hit
     * area. This is because the padding of the checkbox itself cannot be
     * increased via CSS, as the CSS/form compatibility table at the following
     * url from MDN shows:
     * https://developer.mozilla.org/en-US/docs/Learn/Forms/Property_compatibility_table_for_form_controls#check_boxes_and_radio_buttons
     *
     * @param [options]
     * @params options.alwaysVisible Should the checkbox be visible even when
     * not hovered?
     * @returns A new DOM node that contains a checkbox.
     */
    createCheckboxWrapperNode(options?: {
      alwaysVisible: boolean;
      headerNode?: boolean;
    }): HTMLElement {
      // Wrap the checkbox in a label element in order to increase its hit area.
      const labelWrapper = document.createElement('label');
      labelWrapper.classList.add(CHECKBOX_WRAPPER_CLASS);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      // Prevent the user from clicking (via mouse, keyboard, or touch) the
      // checkbox since other code handles the mouse and keyboard events and
      // controls the checked state of the checkbox.
      if (!options?.headerNode) {
        checkbox.addEventListener('click', event => {
          event.preventDefault();
        });
      }

      // The individual file checkboxes are visible on hover, but the header
      // check-all checkbox is always visible.
      if (options?.alwaysVisible) {
        labelWrapper.classList.add('jp-mod-visible');
      } else {
        // Disable tabbing to all other checkboxes.
        checkbox.tabIndex = -1;
      }

      labelWrapper.appendChild(checkbox);
      return labelWrapper;
    }

    /**
     * Update an item's last modified date.
     *
     * @param modified - Element containing the file's last modified date.
     *
     * @param modifiedDate - String representation of the last modified date.
     *
     * @param modifiedStyle - The date style for the modified column: narrow, short, or long
     */
    updateItemModified(
      modified: HTMLElement,
      modifiedDate: string,
      modifiedStyle: Time.HumanStyle
    ): void {
      // Formatting dates is expensive (0.1-0.2ms per call,
      // so over 150 files can easily already choke the renderer),
      // let's do the bare minimum check of comparing if an update
      // is needed using a last update cache:
      const previousUpdate = this._modifiedColumnLastUpdate.get(modified);
      if (
        previousUpdate?.date === modifiedDate &&
        previousUpdate?.style === modifiedStyle
      ) {
        return;
      }

      const parsedDate = new Date(modifiedDate);
      // Render the date in one of multiple formats, depending on the container's size
      const modText = Time.formatHuman(parsedDate, modifiedStyle);
      const modTitle = Time.format(parsedDate);

      modified.textContent = modText;
      modified.title = modTitle;
      this._modifiedColumnLastUpdate.set(modified, {
        date: modifiedDate,
        style: modifiedStyle
      });
    }

    /**
     * Update an item node to reflect the current state of a model.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param model - The model object to use for the item state.
     *
     * @param fileType - The file type of the item, if applicable.
     *
     */
    updateItemNode(
      node: HTMLElement,
      model: Contents.IModel,
      fileType?: DocumentRegistry.IFileType,
      translator?: ITranslator,
      hiddenColumns?: Set<DirListing.ToggleableColumn>,
      selected?: boolean,
      modifiedStyle?: Time.HumanStyle,
      columnsSizes?: Record<DirListing.IColumn['id'], number | null>
    ): void {
      if (selected) {
        node.classList.add(SELECTED_CLASS);
      }
      fileType =
        fileType || DocumentRegistry.getDefaultTextFileType(translator);
      const { icon, iconClass, name } = fileType;
      translator = translator || nullTranslator;
      const trans = translator.load('jupyterlab');

      const prevState = this._lastRenderedState.get(node);
      const newState = JSON.stringify({
        name: model.name,
        selected,
        lastModified: model.last_modified,
        modifiedStyle,
        hiddenColumns,
        columnsSizes,
        fileSize: model.size
      });

      const checkboxWrapper = DOMUtils.findElement(
        node,
        CHECKBOX_WRAPPER_CLASS
      );
      const checkbox = checkboxWrapper?.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement | undefined;

      if (checkbox) checkbox.checked = selected ?? false;

      if (prevState === newState) return;
      this._lastRenderedState.set(node, newState);

      const iconContainer = DOMUtils.findElement(node, ITEM_ICON_CLASS);
      const text = DOMUtils.findElement(node, ITEM_TEXT_CLASS);
      const nameColumn = DOMUtils.findElement(node, ITEM_NAME_COLUMN_CLASS);
      let modified = DOMUtils.findElement(node, ITEM_MODIFIED_CLASS) as
        | HTMLElement
        | undefined;
      let fileSize = DOMUtils.findElement(node, ITEM_FILE_SIZE_CLASS) as
        | HTMLElement
        | undefined;

      const showFileCheckboxes = !hiddenColumns?.has('is_selected');
      if (checkboxWrapper && !showFileCheckboxes) {
        node.removeChild(checkboxWrapper);
      } else if (showFileCheckboxes && !checkboxWrapper) {
        const checkboxWrapper = this.createCheckboxWrapperNode();
        nameColumn.insertAdjacentElement('beforebegin', checkboxWrapper);
      }

      const showModified = !hiddenColumns?.has('last_modified');
      if (modified && !showModified) {
        node.removeChild(modified);
      } else if (showModified && !modified) {
        modified = this.itemFactories.last_modified();
        nameColumn.insertAdjacentElement('afterend', modified);
      }

      const showFileSize = !hiddenColumns?.has('file_size');
      if (fileSize && !showFileSize) {
        node.removeChild(fileSize);
      } else if (showFileSize && !fileSize) {
        fileSize = this.itemFactories.file_size();
        (modified ?? nameColumn).insertAdjacentElement('afterend', fileSize);
      }

      // render the file item's icon
      requestAnimationFrame(() => {
        LabIcon.resolveElement({
          icon,
          iconClass: classes(iconClass, 'jp-Icon'),
          container: iconContainer,
          className: ITEM_ICON_CLASS,
          stylesheet: 'listing'
        });
      });

      let hoverText = trans.__('Name: %1', model.name);

      // add file size to pop up if its available
      if (model.size !== null && model.size !== undefined) {
        const fileSizeText = Private.formatFileSize(model.size, 1, 1024);
        if (fileSize) {
          fileSize.textContent = fileSizeText;
        }
        hoverText += trans.__(
          '\nSize: %1',
          Private.formatFileSize(model.size, 1, 1024)
        );
      } else if (fileSize) {
        fileSize.textContent = '';
      }
      if (model.path) {
        const dirname = PathExt.dirname(model.path);
        if (dirname) {
          hoverText += trans.__('\nPath: %1', dirname.substr(0, 50));
          if (dirname.length > 50) {
            hoverText += '...';
          }
        }
      }
      if (model.created) {
        hoverText += trans.__(
          '\nCreated: %1',
          Time.format(new Date(model.created))
        );
      }
      if (model.last_modified) {
        hoverText += trans.__(
          '\nModified: %1',
          Time.format(new Date(model.last_modified))
        );
      }
      hoverText += trans.__('\nWritable: %1', model.writable);

      node.title = hoverText;
      node.setAttribute('data-file-type', name);
      if (model.name.startsWith('.')) {
        node.setAttribute('data-is-dot', 'true');
      } else {
        node.removeAttribute('data-is-dot');
      }
      // If an item is being edited currently, its text node is unavailable.
      const indices = !model.indices ? [] : model.indices;
      let highlightedName = StringExt.highlight(model.name, indices, h.mark);
      if (text) {
        VirtualDOM.render(h.span(highlightedName), text);
      }

      // Adds an aria-label to the checkbox element.

      if (checkbox) {
        let ariaLabel: string;
        if (fileType.contentType === 'directory') {
          ariaLabel = selected
            ? trans.__('Deselect directory "%1"', highlightedName)
            : trans.__('Select directory "%1"', highlightedName);
        } else {
          ariaLabel = selected
            ? trans.__('Deselect file "%1"', highlightedName)
            : trans.__('Select file "%1"', highlightedName);
        }
        checkbox.setAttribute('aria-label', ariaLabel);
        checkbox.checked = selected ?? false;
      }

      this.updateItemSize(node, model, modifiedStyle, columnsSizes);
    }

    /**
     * Update size of item nodes, assuming that model has not changed.
     */
    updateItemSize(
      node: HTMLElement,
      model: Contents.IModel,
      modifiedStyle?: Time.HumanStyle,
      columnsSizes?: Record<DirListing.IColumn['id'], number | null>
    ): void {
      if (columnsSizes) {
        for (const column of columns) {
          const element = DOMUtils.findElement(node, column.itemClassName);
          if (!element) {
            continue;
          }
          const sizeSpec = columnsSizes[column.id];
          const newWidth = sizeSpec === null ? '' : sizeSpec + 'px';
          if (newWidth !== element.style.width) {
            element.style.width = newWidth;
          }
        }
      }
      let modified = DOMUtils.findElement(node, ITEM_MODIFIED_CLASS) as
        | HTMLElement
        | undefined;

      if (model.last_modified && modified) {
        this.updateItemModified(
          modified,
          model.last_modified,
          modifiedStyle ?? 'short'
        );
      }
    }

    /**
     * Get the node containing the file name.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @returns The node containing the file name.
     */
    getNameNode(node: HTMLElement): HTMLElement {
      return DOMUtils.findElement(node, ITEM_TEXT_CLASS);
    }

    /**
     * Get the checkbox input element node.
     *
     * @param node A node created by [[createItemNode]] or
     * [[createHeaderItemNode]]
     *
     * @returns The checkbox node.
     */
    getCheckboxNode(node: HTMLElement): HTMLInputElement | null {
      return node.querySelector(
        `.${CHECKBOX_WRAPPER_CLASS} input[type=checkbox]`
      );
    }

    /**
     * Create a drag image for an item.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param count - The number of items being dragged.
     *
     * @param fileType - The file type of the item, if applicable.
     *
     * @returns An element to use as the drag image.
     */
    createDragImage(
      node: HTMLElement,
      count: number,
      trans: TranslationBundle,
      fileType?: DocumentRegistry.IFileType
    ): HTMLElement {
      const dragImage = node.cloneNode(true) as HTMLElement;
      const icon = DOMUtils.findElement(dragImage, ITEM_ICON_CLASS);

      // Hide additional columns from the drag image to keep it unobtrusive.
      const extraColumns = DirListing.columns.filter(
        column => column.id !== 'name'
      );
      for (const extraColumn of extraColumns) {
        const columnElement = DOMUtils.findElement(
          dragImage,
          extraColumn.itemClassName
        );
        if (!columnElement) {
          // We can only remove columns which are rendered.
          continue;
        }
        dragImage.removeChild(columnElement);
      }

      if (!fileType) {
        icon.textContent = '';
        icon.className = '';
      } else {
        icon.textContent = fileType.iconLabel || '';
        icon.className = fileType.iconClass || '';
      }
      icon.classList.add(DRAG_ICON_CLASS);

      if (count > 1) {
        const nameNode = DOMUtils.findElement(dragImage, ITEM_TEXT_CLASS);
        nameNode.textContent = trans._n('%1 Item', '%1 Items', count);
      }
      return dragImage;
    }

    /**
     * Factories for individual parts of the item.
     */
    protected itemFactories = {
      name: () => {
        const name = document.createElement('span');
        const icon = document.createElement('span');
        const text = document.createElement('span');
        icon.className = ITEM_ICON_CLASS;
        text.className = ITEM_TEXT_CLASS;
        name.className = ITEM_NAME_COLUMN_CLASS;
        name.appendChild(icon);
        name.appendChild(text);
        return name;
      },
      last_modified: () => {
        const modified = document.createElement('span');
        modified.className = ITEM_MODIFIED_CLASS;
        return modified;
      },
      file_size: () => {
        const fileSize = document.createElement('span');
        fileSize.className = ITEM_FILE_SIZE_CLASS;
        return fileSize;
      },
      is_selected: () => this.createCheckboxWrapperNode()
    };

    /**
     * Create a node for a header item.
     */
    protected createHeaderItemNode(label: string): HTMLElement {
      const node = document.createElement('div');
      const text = document.createElement('span');
      const icon = document.createElement('span');
      node.className = HEADER_ITEM_CLASS;
      text.className = HEADER_ITEM_TEXT_CLASS;
      icon.className = HEADER_ITEM_ICON_CLASS;
      text.textContent = label;
      node.appendChild(text);
      node.appendChild(icon);
      return node;
    }

    /**
     * Create a node for a header item with multiple sizes.
     */
    private _createHeaderItemNodeWithSizes(labels: {
      [k: string]: string;
    }): HTMLElement {
      const node = document.createElement('div');
      node.className = HEADER_ITEM_CLASS;
      const icon = document.createElement('span');
      icon.className = HEADER_ITEM_ICON_CLASS;
      for (let k of Object.keys(labels)) {
        const text = document.createElement('span');
        text.classList.add(
          HEADER_ITEM_TEXT_CLASS,
          HEADER_ITEM_TEXT_CLASS + '-' + k
        );
        text.textContent = labels[k];
        node.appendChild(text);
      }
      node.appendChild(icon);
      return node;
    }

    /**
     * Register of most recent arguments for last modified column update.
     */
    private _modifiedColumnLastUpdate = new WeakMap<
      HTMLElement,
      { date: string; style: Time.HumanStyle }
    >();

    private _lastRenderedState = new WeakMap<HTMLElement, string>();
  }

  /**
   * The default `IRenderer` instance.
   */
  export const defaultRenderer = new Renderer();
}

/**
 * The namespace for the listing private data.
 */
namespace Private {
  /**
   * Handle editing text on a node.
   *
   * @returns Boolean indicating whether the name changed.
   */
  export function userInputForRename(
    text: HTMLElement,
    edit: HTMLInputElement,
    original: string
  ): Promise<string> {
    const parent = text.parentElement as HTMLElement;
    parent.replaceChild(edit, text);
    edit.focus();
    const index = edit.value.lastIndexOf('.');
    if (index === -1) {
      edit.setSelectionRange(0, edit.value.length);
    } else {
      edit.setSelectionRange(0, index);
    }

    return new Promise<string>(resolve => {
      edit.onblur = () => {
        parent.replaceChild(text, edit);
        resolve(edit.value);
      };
      edit.onkeydown = (event: KeyboardEvent) => {
        switch (event.keyCode) {
          case 13: // Enter
            event.stopPropagation();
            event.preventDefault();
            edit.blur();
            break;
          case 27: // Escape
            event.stopPropagation();
            event.preventDefault();
            edit.value = original;
            edit.blur();
            // Put focus back on the text node. That way the user can, for
            // example, press the keyboard shortcut to go back into edit mode,
            // and it will work.
            text.focus();
            break;
          default:
            break;
        }
      };
    });
  }

  /**
   * Sort a list of items by sort state as a new array.
   */
  export function sort(
    items: Iterable<Contents.IModel>,
    state: DirListing.ISortState,
    sortNotebooksFirst: boolean = false,
    translator: ITranslator
  ): Contents.IModel[] {
    const copy = Array.from(items);
    const reverse = state.direction === 'descending' ? 1 : -1;

    /**
     * Compares two items and returns whether they should have a fixed priority.
     * The fixed priority enables to always sort the directories above the other files. And to sort the notebook above other files if the `sortNotebooksFirst` is true.
     */
    function isPriorityOverridden(a: Contents.IModel, b: Contents.IModel) {
      if (sortNotebooksFirst) {
        return a.type !== b.type;
      }
      return (a.type === 'directory') !== (b.type === 'directory');
    }

    /**
     * Returns the priority of a file.
     */
    function getPriority(item: Contents.IModel): number {
      if (item.type === 'directory') {
        return 2;
      }
      if (item.type === 'notebook' && sortNotebooksFirst) {
        return 1;
      }
      return 0;
    }

    /**
     * Compare two items by their name using `translator.languageCode`, with fallback to `navigator.language`.
     */
    function compareByName(a: Contents.IModel, b: Contents.IModel) {
      // Wokaround for Chromium invalid language code on CI, see
      // https://github.com/jupyterlab/jupyterlab/issues/17079
      const navigatorLanguage = navigator.language.split('@')[0];
      const languageCode = (
        translator.languageCode ?? navigatorLanguage
      ).replace('_', '-');
      try {
        return a.name.localeCompare(b.name, languageCode, {
          numeric: true,
          sensitivity: 'base'
        });
      } catch (e) {
        console.warn(
          `localeCompare failed to compare ${a.name} and ${b.name} under languageCode: ${languageCode}`
        );
        return a.name.localeCompare(b.name, navigatorLanguage, {
          numeric: true,
          sensitivity: 'base'
        });
      }
    }

    function compare(
      compare: (a: Contents.IModel, b: Contents.IModel) => number
    ) {
      return (a: Contents.IModel, b: Contents.IModel) => {
        // Group directory first, then notebooks, then files
        if (isPriorityOverridden(a, b)) {
          return getPriority(b) - getPriority(a);
        }

        const compared = compare(a, b);

        if (compared !== 0) {
          return compared * reverse;
        }

        // Default sorting is alphabetical ascending
        return compareByName(a, b);
      };
    }

    if (state.key === 'last_modified') {
      // Sort by last modified
      copy.sort(
        compare((a: Contents.IModel, b: Contents.IModel) => {
          return (
            new Date(a.last_modified).getTime() -
            new Date(b.last_modified).getTime()
          );
        })
      );
    } else if (state.key === 'file_size') {
      // Sort by size
      copy.sort(
        compare((a: Contents.IModel, b: Contents.IModel) => {
          return (b.size ?? 0) - (a.size ?? 0);
        })
      );
    } else {
      // Sort by name
      copy.sort(
        compare((a: Contents.IModel, b: Contents.IModel) => {
          return compareByName(b, a);
        })
      );
    }
    return copy;
  }

  /**
   * Check if the column is resizable.
   */
  export const isResizable = (
    column: DirListing.IColumn
  ): column is DirListing.IResizableColumn => {
    return 'resizable' in column && column.resizable;
  };

  /**
   * Check if the column is sortable.
   */
  export const isSortable = (
    column: DirListing.IColumn
  ): column is DirListing.ISortableColumn => {
    return 'sortable' in column && column.sortable;
  };

  /**
   * Get the index of the node at a client position, or `-1`.
   */
  export function hitTestNodes(
    nodes: HTMLElement[],
    event: MouseEvent
  ): number {
    return ArrayExt.findFirstIndex(
      nodes,
      node =>
        ElementExt.hitTest(node, event.clientX, event.clientY) ||
        event.target === node
    );
  }

  /**
   * Format bytes to human readable string.
   */
  export function formatFileSize(
    bytes: number,
    decimalPoint: number,
    k: number
  ): string {
    // https://www.codexworld.com/how-to/convert-file-size-bytes-kb-mb-gb-javascript/
    if (bytes === 0) {
      return '0 B';
    }
    const dm = decimalPoint || 2;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i >= 0 && i < sizes.length) {
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    } else {
      return String(bytes);
    }
  }

  /**
   * Update an inline svg caret icon in a node.
   */
  export function updateCaret(
    container: HTMLElement,
    float: 'left' | 'right',
    state?: 'down' | 'up' | undefined
  ): void {
    if (state) {
      (state === 'down' ? caretDownIcon : caretUpIcon).element({
        container,
        tag: 'span',
        stylesheet: 'listingHeaderItem'
      });
      if (float === 'left') {
        container.style.order = '-1';
      } else {
        container.style.order = '';
      }
    } else {
      LabIcon.remove(container);
      container.className = HEADER_ITEM_ICON_CLASS;
    }
  }

  export async function createDirectory(
    manager: IDocumentManager,
    path: string,
    name: string
  ): Promise<string> {
    const model = await manager.newUntitled({
      path: path,
      type: 'directory'
    });
    const tmpDirPath = PathExt.join(path, model.name);
    const dirPath = PathExt.join(path, name);
    try {
      await manager.rename(tmpDirPath, dirPath);
    } catch (e) {
      // The `dirPath` already exists, remove the temporary new directory
      await manager.deleteFile(tmpDirPath);
    }
    return dirPath;
  }

  export function isDirectoryEntry(
    entry: FileSystemEntry
  ): entry is FileSystemDirectoryEntry {
    return entry.isDirectory;
  }
  export function isFileEntry(
    entry: FileSystemEntry
  ): entry is FileSystemFileEntry {
    return entry.isFile;
  }

  export function defensiveGetAsEntry(
    item: DataTransferItem
  ): FileSystemEntry | null {
    if (item.webkitGetAsEntry) {
      return item.webkitGetAsEntry();
    }
    if ('getAsEntry' in item) {
      // See https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
      return (item['getAsEntry'] as () => FileSystemEntry | null)();
    }
    return null;
  }

  function readEntries(reader: FileSystemDirectoryReader) {
    return new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
  }

  export function readFile(entry: FileSystemFileEntry) {
    return new Promise<File>((resolve, reject) => entry.file(resolve, reject));
  }

  export async function collectEntries(reader: FileSystemDirectoryReader) {
    // Spec requires calling `readEntries` until these are exhausted;
    // in practice this is only required in Chromium-based browsers for >100 files.
    // https://issues.chromium.org/issues/41110876
    const allEntries: FileSystemEntry[] = [];
    let done = false;
    while (!done) {
      const entries = await readEntries(reader);
      if (entries.length === 0) {
        done = true;
      } else {
        allEntries.push(...entries);
      }
    }
    return allEntries;
  }
}
