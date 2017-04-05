// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  ArrayExt, ArrayIterator, IIterator, each, filter, find, map, toArray
} from '@phosphor/algorithm';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  MimeData
} from '@phosphor/coreutils';

import {
  Drag, IDragEvent
} from '@phosphor/dragdrop';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  Dialog, DOMUtils, showDialog
} from '@jupyterlab/apputils';

import {
  PathExt, Time
} from '@jupyterlab/coreutils';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  renameFile
} from './dialogs';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';

import {
  SELECTED_CLASS, showErrorMessage
} from './utils';


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
 * The class name added to the listing item icon cell.
 */
const ITEM_ICON_CLASS = 'jp-DirListing-itemIcon';

/**
 * The class name added to the listing item modified cell.
 */
const ITEM_MODIFIED_CLASS = 'jp-DirListing-itemModified';

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
 * The class name added to a file type content item.
 */
const FILE_TYPE_CLASS = 'jp-FileIcon';

/**
 * The class name added to a material icon content item.
 */
const FOLDER_MATERIAL_ICON_CLASS = 'jp-OpenFolderIcon';
const NOTEBOOK_MATERIAL_ICON_CLASS = 'jp-NotebookIcon';
const MATERIAL_ICON_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to drag state icons to add space between the icon and the file name
 */
const DRAG_ICON_CLASS = 'jp-DragIcon';

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
 * The class name added for a decending sort.
 */
const DESCENDING_CLASS = 'jp-mod-descending';

/**
 * The minimum duration for a rename select in ms.
 */
const RENAME_DURATION = 1000;

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * A boolean indicating whether the platform is Mac.
 */
const IS_MAC = !!navigator.platform.match(/Mac/i);

/**
 * The factory MIME type supported by phosphor dock panels.
 */
const FACTORY_MIME = 'application/vnd.phosphor.widget-factory';


/**
 * A widget which hosts a file list area.
 */
export
class DirListing extends Widget {
  /**
   * Construct a new file browser directory listing widget.
   *
   * @param model - The file browser view model.
   */
  constructor(options: DirListing.IOptions) {
    super({
      node: (options.renderer || DirListing.defaultRenderer).createNode()
    });
    this.addClass(DIR_LISTING_CLASS);
    this._model = options.model;
    this._model.fileChanged.connect(this._onFileChanged, this);
    this._model.refreshed.connect(this._onModelRefreshed, this);
    this._model.pathChanged.connect(this._onPathChanged, this);
    this._editNode = document.createElement('input');
    this._editNode.className = EDITOR_CLASS;
    this._manager = options.manager;
    this._renderer = options.renderer || DirListing.defaultRenderer;
    let headerNode = DOMUtils.findElement(this.node, HEADER_CLASS);
    this._renderer.populateHeaderNode(headerNode);
    this._manager.activateRequested.connect(this._onActivateRequested, this);
  }

  /**
   * Dispose of the resources held by the directory listing.
   */
  dispose(): void {
    this._model = null;
    this._items = null;
    this._editNode = null;
    this._drag = null;
    this._dragData = null;
    this._manager = null;
    super.dispose();
  }

  /**
   * Get the model used by the listing.
   */
  get model(): FileBrowserModel {
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
   * Create an iterator over the listing's sorted items.
   *
   * @returns A new iterator over the listing's sorted items.
   */
  sortedItems(): IIterator<Contents.IModel> {
    return new ArrayIterator(this._sortedItems);
  }

  /**
   * Sort the items using a sort condition.
   */
  sort(state: DirListing.ISortState): void {
    this._sortedItems = Private.sort(this.model.items(), state);
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
      return;
    }
    let promises: Promise<Contents.IModel>[] = [];
    each(this._clipboard, path => {
      if (this._isCut) {
        let parts = path.split('/');
        let name = parts[parts.length - 1];
        promises.push(this._model.rename(path, name));
      } else {
        promises.push(this._model.copy(path, '.'));
      }
    });

    // Remove any cut modifiers.
    each(this._items, item => {
      item.classList.remove(CUT_CLASS);
    });

    this._clipboard.length = 0;
    this._isCut = false;
    this.removeClass(CLIPBOARD_CLASS);
    return Promise.all(promises).catch(error => {
      utils.showErrorMessage('Paste Error', error);
    });
  }

  /**
   * Delete the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  delete(): Promise<void> {
    let names: string[] = [];
    each(this._sortedItems, item => {
      if (this._selection[item.name]) {
        names.push(item.name);
      }
    });
    let message = `Permanently delete these ${names.length} files?`;
    if (names.length === 1) {
      message = `Permanently delete file "${names[0]}"?`;
    }
    if (names.length) {
      return showDialog({
        title: 'Delete file?',
        body: message,
        buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'DELETE'})]
      }).then(result => {
        if (!this.isDisposed && result.accept) {
          return this._delete(names);
        }
      });
    }
    return Promise.resolve(void 0);
  }

  /**
   * Duplicate the currently selected item(s).
   *
   * @returns A promise that resolves when the operation is complete.
   */
  duplicate(): Promise<void> {
    let promises: Promise<Contents.IModel>[] = [];
    for (let item of this._getSelectedItems()) {
      if (item.type !== 'directory') {
        promises.push(this._model.copy(item.name, '.'));
      }
    }
    return Promise.all(promises).catch(error => {
      if (error.throwError) {
        error.message = error.throwError;
      }
      utils.showErrorMessage('Duplicate file', error);
    });
  }

  /**
   * Download the currently selected item(s).
   */
  download(): void {
    for (let item of this._getSelectedItems()) {
      if (item.type !== 'directory') {
        this._model.download(item.path);
      }
    }
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdownKernels(): Promise<void> {
    let promises: Promise<void>[] = [];
    let items = this._sortedItems;
    let paths = toArray(map(items, item => item.path));
    each(this._model.sessions(), session => {
      let index = ArrayExt.firstIndexOf(paths, session.notebook.path);
      if (this._selection[items[index].name]) {
        promises.push(this._model.shutdown(session.id));
      }
    });
    return Promise.all(promises).catch(error => {
      utils.showErrorMessage('Shutdown kernel', error);
    });
  }

  /**
   * Select next item.
   *
   * @param keepExisting - Whether to keep the current selection and add to it.
   */
  selectNext(keepExisting = false): void {
    let index = -1;
    let selected = Object.keys(this._selection);
    let items = this._sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the next item.
      let name = selected[selected.length - 1];
      index = ArrayExt.findFirstIndex(items, value => value.name === name);
      index += 1;
      if (index === this._items.length) {
        index = 0;
      }
    } else if (selected.length === 0) {
      // Select the first item.
      index = 0;
    } else {
      // Select the last selected item.
      let name = selected[selected.length - 1];
      index = ArrayExt.findFirstIndex(items, value => value.name === name);
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
    let selected = Object.keys(this._selection);
    let items = this._sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the previous item.
      let name = selected[0];
      index = ArrayExt.findFirstIndex(items, value => value.name === name);
      index -= 1;
      if (index === -1) {
        index = this._items.length - 1;
      }
    } else if (selected.length === 0) {
      // Select the last item.
      index = this._items.length - 1;
    } else {
      // Select the first selected item.
      let name = selected[0];
      index = ArrayExt.findFirstIndex(items, value => value.name === name);
    }
    if (index !== -1) {
      this._selectItem(index, keepExisting);
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
    return this._selection[name] === true;
  }

  /**
   * Find a path given a click.
   *
   * @param event - The mouse event.
   *
   * @returns The path to the selected file.
   */
  pathForClick(event: MouseEvent): string {
    let items = this._sortedItems;
    let index = Private.hitTestNodes(this._items, event.clientX, event.clientY);
    if (index !== -1) {
      return items[index].path;
    }
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
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    case 'dblclick':
      this._evtDblClick(event as MouseEvent);
      break;
    case 'contextmenu':
      this._evtContextMenu(event as MouseEvent);
      break;
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    case 'p-dragenter':
      this._evtDragEnter(event as IDragEvent);
      break;
    case 'p-dragleave':
      this._evtDragLeave(event as IDragEvent);
      break;
    case 'p-dragover':
      this._evtDragOver(event as IDragEvent);
      break;
    case 'p-drop':
      this._evtDrop(event as IDragEvent);
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
    let node = this.node;
    let content = DOMUtils.findElement(node, CONTENT_CLASS);
    node.addEventListener('mousedown', this);
    node.addEventListener('keydown', this);
    node.addEventListener('click', this);
    node.addEventListener('dblclick', this);
    node.addEventListener('contextmenu', this);
    content.addEventListener('scroll', this);
    content.addEventListener('p-dragenter', this);
    content.addEventListener('p-dragleave', this);
    content.addEventListener('p-dragover', this);
    content.addEventListener('p-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    let content = DOMUtils.findElement(node, CONTENT_CLASS);
    node.removeEventListener('mousedown', this);
    node.removeEventListener('keydown', this);
    node.removeEventListener('click', this);
    node.removeEventListener('dblclick', this);
    node.removeEventListener('contextmenu', this);
    content.removeEventListener('scroll', this);
    content.removeEventListener('p-dragenter', this);
    content.removeEventListener('p-dragleave', this);
    content.removeEventListener('p-dragover', this);
    content.removeEventListener('p-drop', this);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Fetch common variables.
    let items = this._sortedItems;
    let nodes = this._items;
    let content = DOMUtils.findElement(this.node, CONTENT_CLASS);
    let renderer = this._renderer;

    this.removeClass(MULTI_SELECTED_CLASS);
    this.removeClass(SELECTED_CLASS);

    // Remove any excess item nodes.
    while (nodes.length > items.length) {
      let node = nodes.pop();
      content.removeChild(node);
    }

    // Add any missing item nodes.
    while (nodes.length < items.length) {
      let node = renderer.createItemNode();
      node.classList.add(ITEM_CLASS);
      nodes.push(node);
      content.appendChild(node);
    }

    // Remove extra classes from the nodes.
    each(nodes, item => {
      item.classList.remove(SELECTED_CLASS);
      item.classList.remove(RUNNING_CLASS);
      item.classList.remove(CUT_CLASS);
    });

    // Add extra classes to item nodes based on widget state.
    for (let i = 0, n = items.length; i < n; ++i) {
      let node = nodes[i];
      let item = items[i];
      renderer.updateItemNode(node, item);
      if (this._selection[item.name]) {
        node.classList.add(SELECTED_CLASS);
        if (this._isCut && this._model.path === this._prevPath) {
          node.classList.add(CUT_CLASS);
        }
      }
    }

    // Handle the selectors on the widget node.
    let selectedNames = Object.keys(this._selection);
    if (selectedNames.length > 1) {
      this.addClass(MULTI_SELECTED_CLASS);
    }
    if (selectedNames.length) {
      this.addClass(SELECTED_CLASS);
    }

    // Handle notebook session statuses.
    let paths = toArray(map(items, item => item.path));
    each(this._model.sessions(), session => {
      let index = ArrayExt.firstIndexOf(paths, session.notebook.path);
      let node = nodes[index];
      node.classList.add(RUNNING_CLASS);
      let name = session.kernel.name;
      let specs = this._model.specs;
      if (specs) {
        name = specs.kernelspecs[name].display_name;
      }
      node.title = name;
    });

    this._prevPath = this._model.path;
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent) {
    let target = event.target as HTMLElement;

    let header = this.headerNode;
    if (header.contains(target)) {
      let state = this.renderer.handleHeaderClick(header, event);
      if (state) {
        this.sort(state);
      }
      return;
    }
  }

  /**
   * Handle the `'scroll'` event for the widget.
   */
  private _evtScroll(event: MouseEvent): void {
    this.headerNode.scrollLeft = this.contentNode.scrollLeft;
  }

  /**
   * Handle the `'contextmenu'` event for the widget.
   */
  private _evtContextMenu(event: MouseEvent): void {
    this._inContext = true;
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
      if (this._editNode !== event.target as HTMLElement) {
        this._editNode.focus();
        this._editNode.blur();
        clearTimeout(this._selectTimer);
      } else {
        return;
      }
    }

    // Check for clearing a context menu.
    let newContext = (IS_MAC && event.ctrlKey) || (event.button === 2);
    if (this._inContext && !newContext) {
      this._inContext = false;
      return;
    }
    this._inContext = false;

    let index = Private.hitTestNodes(this._items, event.clientX, event.clientY);
    if (index === -1) {
      return;
    }
    this._handleFileSelect(event);

    // Left mouse press for drag start.
    if (event.button === 0) {
      this._dragData = { pressX: event.clientX, pressY: event.clientY,
                         index: index };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }

    if (event.button !== 0) {
      clearTimeout(this._selectTimer);
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    // Handle any soft selection from the previous mouse down.
    if (this._softSelection) {
      let altered = event.metaKey || event.shiftKey || event.ctrlKey;
      // See if we need to clear the other selection.
      if (!altered && event.button === 0) {
        this._selection = Object.create(null);
        this._selection[this._softSelection] = true;
        this.update();
      }
      this._softSelection = '';
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

    // Bail if we are the one dragging.
    if (this._drag) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(data.index, event.clientX, event.clientY);
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  private _evtKeydown(event: KeyboardEvent): void {
    switch (event.keyCode) {
    case 13: // Enter
      // Do nothing if any modifier keys are pressed.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      if (IS_MAC) {
        this._doRename();
        return;
      }

      let selected = Object.keys(this._selection);
      let name = selected[0];
      let items = this._sortedItems;
      let i = ArrayExt.findFirstIndex(items, value => value.name === name);
      if (i === -1) {
        return;
      }

      let model = this._model;
      let item = this._sortedItems[i];
      if (item.type === 'directory') {
        model.cd(item.name).catch(error =>
          showErrorMessage('Open directory', error)
        );
      } else {
        let path = item.path;
        this._manager.openOrReveal(path);
      }

      break;
    case 38: // Up arrow
      this.selectPrevious(event.shiftKey);
      event.stopPropagation();
      event.preventDefault();
      break;
    case 40: // Down arrow
      this.selectNext(event.shiftKey);
      event.stopPropagation();
      event.preventDefault();
      break;
    default:
      break;
    }
  }

  /**
   * Handle the `'dblclick'` event for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if any modifier keys are pressed.
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();

    clearTimeout(this._selectTimer);
    this._noSelectTimer = window.setTimeout(() => {
      this._noSelectTimer = -1;
    }, RENAME_DURATION);

    this._editNode.blur();

    // Find a valid double click target.
    let target = event.target as HTMLElement;
    let i = ArrayExt.findFirstIndex(this._items, node => node.contains(target));
    if (i === -1) {
      return;
    }

    let model = this._model;
    let item = this._sortedItems[i];
    if (item.type === 'directory') {
      model.cd(item.name).catch(error =>
        showErrorMessage('Open directory', error)
      );
    } else {
      let path = item.path;
      this._manager.openOrReveal(path);
    }
  }


  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(utils.CONTENTS_MIME)) {
      let index = Private.hitTestNodes(this._items, event.clientX, event.clientY);
      if (index === -1) {
        return;
      }
      let item = this._sortedItems[index];
      if (item.type !== 'directory' || this._selection[item.name]) {
        return;
      }
      let target = event.target as HTMLElement;
      target.classList.add(utils.DROP_TARGET_CLASS);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle the `'p-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    let dropTarget = DOMUtils.findElement(this.node, utils.DROP_TARGET_CLASS);
    if (dropTarget) {
      dropTarget.classList.remove(utils.DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    let dropTarget = DOMUtils.findElement(this.node, utils.DROP_TARGET_CLASS);
    if (dropTarget) {
      dropTarget.classList.remove(utils.DROP_TARGET_CLASS);
    }
    let index = Private.hitTestNodes(this._items, event.clientX, event.clientY);
    this._items[index].classList.add(utils.DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(this._selectTimer);
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    if (!event.mimeData.hasData(utils.CONTENTS_MIME)) {
      return;
    }
    event.dropAction = event.proposedAction;

    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(utils.DROP_TARGET_CLASS)) {
        target.classList.remove(utils.DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }

    // Get the path based on the target node.
    let index = ArrayExt.firstIndexOf(this._items, target);
    let items = this._sortedItems;
    let path = items[index].name + '/';

    // Move all of the items.
    let promises: Promise<Contents.IModel>[] = [];
    let names = event.mimeData.getData(utils.CONTENTS_MIME) as string[];
    for (let name of names) {
      let newPath = path + name;
      promises.push(renameFile(this._model, name, newPath));
    }
    Promise.all(promises).catch(error => {
      utils.showErrorMessage('Move Error', error);
    });
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let selectedNames = Object.keys(this._selection);
    let source = this._items[index];
    let items = this._sortedItems;
    let item: Contents.IModel = null;

    // If the source node is not selected, use just that node.
    if (!source.classList.contains(SELECTED_CLASS)) {
      item = items[index];
      selectedNames = [item.name];
    } else if (selectedNames.length === 1) {
      let name = selectedNames[0];
      item = find(items, value => value.name === name);
    }

    // Create the drag image.
    let dragImage = this.renderer.createDragImage(source, selectedNames.length, item);

    // Set up the drag event.
    this._drag = new Drag({
      dragImage,
      mimeData: new MimeData(),
      supportedActions: 'move',
      proposedAction: 'move'
    });
    this._drag.mimeData.setData(utils.CONTENTS_MIME, selectedNames);
    if (item && item.type !== 'directory') {
      this._drag.mimeData.setData(FACTORY_MIME, () => {
        let path = item.path;
        let widget = this._manager.findWidget(path);
        if (!widget) {
          widget = this._manager.open(item.path);
        }
        return widget;
      });
    }

    // Start the drag and remove the mousemove and mouseup listeners.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    clearTimeout(this._selectTimer);
    this._drag.start(clientX, clientY).then(action => {
      this._drag = null;
      clearTimeout(this._selectTimer);
    });
  }

  /**
   * Handle selection on a file node.
   */
  private _handleFileSelect(event: MouseEvent): void {
    // Fetch common variables.
    let items = this._sortedItems;
    let index = Private.hitTestNodes(this._items, event.clientX, event.clientY);
    let target = event.target as HTMLElement;
    let inText = target.classList.contains(ITEM_TEXT_CLASS);

    clearTimeout(this._selectTimer);

    if (index === -1) {
      return;
    }

    // Clear any existing soft selection.
    this._softSelection = '';

    let name = items[index].name;
    let selected = Object.keys(this._selection);

    // Handle toggling.
    if ((IS_MAC && event.metaKey) || (!IS_MAC && event.ctrlKey)) {
      if (this._selection[name]) {
        delete this._selection[name];
      } else {
        this._selection[name] = true;
      }

    // Handle multiple select.
    } else if (event.shiftKey) {
      this._handleMultiSelect(selected, index);

    // Handle a 'soft' selection
    } else if (name in this._selection && selected.length > 1) {
      this._softSelection = name;

    // Default to selecting the only the item.
    } else {
      // Handle a rename.
      if (inText && selected.length === 1 && selected[0] === name) {
        this._selectTimer = window.setTimeout(() => {
          if (this._noSelectTimer === -1) {
            this._doRename();
          }
        }, RENAME_DURATION);
      }
      // Select only the given item.
      this._selection = Object.create(null);
      this._selection[name] = true;
    }
    this._isCut = false;
    this.update();
  }

  /**
   * Select an item by name.
   *
   * @parem name - The name of the item to select.
   *
   * @returns A promise that resolves when the name is selected.
   */
  private _selectItemByName(name: string): Promise<void> {
    // Make sure the file is available.
    return this.model.refresh().then(() => {
      if (this.isDisposed) {
        return;
      }
      let items = this._sortedItems;
      let index = ArrayExt.findFirstIndex(items, value => value.name === name);
      if (index === -1) {
        return;
      }
      this._selectItem(index, false);
      MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
      ElementExt.scrollIntoViewIfNeeded(this.contentNode, this._items[index]);
    });
  }

  /**
   * Handle a multiple select on a file item node.
   */
  private _handleMultiSelect(selected: string[], index: number): void {
    // Find the "nearest selected".
    let items = this._sortedItems;
    let nearestIndex = -1;
    for (let i = 0; i < this._items.length; i++) {
      if (i === index) {
        continue;
      }
      let name = items[i].name;
      if (selected.indexOf(name) !== -1) {
        if (nearestIndex === -1) {
          nearestIndex = i;
        } else {
          if (Math.abs(index - i) < Math.abs(nearestIndex - i)) {
            nearestIndex = i;
          }
        }
      }
    }

    // Default to the first element (and fill down).
    if (nearestIndex === -1) {
      nearestIndex = 0;
    }

    // Select the rows between the current and the nearest selected.
    for (let i = 0; i < this._items.length; i++) {
      if (nearestIndex >= i && index <= i ||
          nearestIndex <= i && index >= i) {
        this._selection[items[i].name] = true;
      }
    }
  }

  /**
   * Get the currently selected items.
   */
  private _getSelectedItems(): Contents.IModel[] {
    let items = this._sortedItems;
    return toArray(filter(items, item => this._selection[item.name]));
  }

  /**
   * Copy the selected items, and optionally cut as well.
   */
  private _copy(): void {
    this._clipboard.length = 0;
    for (let item of this._getSelectedItems()) {
      if (item.type !== 'directory') {
        // Store the absolute path of the item.
        this._clipboard.push('/' + item.path);
      }
    }
    this.update();
  }

  /**
   * Delete the files with the given names.
   */
  private _delete(names: string[]): Promise<void> {
    let promises: Promise<void>[] = [];
    for (let name of names) {
      promises.push(this._model.deleteFile(name));
    }
    return Promise.all(promises).catch(error => {
      utils.showErrorMessage('Delete file', error);
    });
  }

  /**
   * Allow the user to rename item on a given row.
   */
  private _doRename(): Promise<string> {
    let items = this._sortedItems;
    let name = Object.keys(this._selection)[0];
    let index = ArrayExt.findFirstIndex(items, value => value.name === name);
    let row = this._items[index];
    let item = items[index];
    let nameNode = this.renderer.getNameNode(row);
    let original = item.name;
    this._editNode.value = original;
    this._selectItem(index, false);

    return Private.doRename(nameNode, this._editNode).then(newName => {
      if (newName === original) {
        return original;
      }
      if (this.isDisposed) {
        return;
      }
      return renameFile(this._model, original, newName).catch(error => {
        utils.showErrorMessage('Rename Error', error);
        return original;
      }).then(() => {
        if (this.isDisposed) {
          return;
        }
        this._selectItemByName(newName);
        return newName;
      });
    });
  }

  /**
   * Select a given item.
   */
  private _selectItem(index: number, keepExisting: boolean) {
    // Selected the given row(s)
    let items = this._sortedItems;
    if (!keepExisting) {
      this._selection = Object.create(null);
    }
    let name = items[index].name;
    this._selection[name] = true;
    this._isCut = false;
    this.update();
  }

  /**
   * Handle the `refreshed` signal from the model.
   */
  private _onModelRefreshed(): void {
    // Update the selection.
    let existing = Object.keys(this._selection);
    this._selection = Object.create(null);
    each(this._model.items(), item => {
      let name = item.name;
      if (existing.indexOf(name) !== -1) {
        this._selection[name] = true;
      }
    });
    // Update the sorted items.
    this.sort(this.sortState);
  }

  /**
   * Handle a `pathChanged` signal from the model.
   */
  private _onPathChanged(): void {
    // Reset the selection.
    this._selection = Object.create(null);
    // Update the sorted items.
    this.sort(this.sortState);
  }

  /**
   * Handle a `fileChanged` signal from the model.
   */
  private _onFileChanged(sender: FileBrowserModel, args: Contents.IChangedArgs) {
    if (args.type === 'new') {
      this._selectItemByName(args.newValue.name).then(() => {
        if (!this.isDisposed && args.newValue === 'directory') {
          this._doRename();
        }
      });
    }
  }

  /**
   * Handle an `activateRequested` signal from the manager.
   */
  private _onActivateRequested(sender: DocumentManager, args: string): void {
    let dirname = PathExt.dirname(args);
    if (dirname === '.') {
      dirname = '';
    }
    if (dirname !== this._model.path) {
      return;
    }
    let basename = PathExt.basename(args);
    this._selectItemByName(basename);
  }

  private _model: FileBrowserModel = null;
  private _editNode: HTMLInputElement = null;
  private _items: HTMLElement[] = [];
  private _sortedItems: Contents.IModel[] = [];
  private _sortState: DirListing.ISortState = { direction: 'ascending', key: 'name' };
  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number, index: number } = null;
  private _selectTimer = -1;
  private _noSelectTimer = -1;
  private _isCut = false;
  private _prevPath = '';
  private _clipboard: string[] = [];
  private _manager: DocumentManager = null;
  private _softSelection = '';
  private _inContext = false;
  private _selection: { [key: string]: boolean; } = Object.create(null);
  private _renderer: DirListing.IRenderer = null;
}


/**
 * The namespace for the `DirListing` class statics.
 */
export
namespace DirListing {
  /**
   * An options object for initializing a file browser directory listing.
   */
  export
  interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;

    /**
     * A document manager instance.
     */
    manager: DocumentManager;

    /**
     * A renderer for file items.
     *
     * The default is a shared `Renderer` instance.
     */
    renderer?: IRenderer;
  }

  /**
   * A sort state.
   */
  export
  interface ISortState {
    /**
     * The direction of sort.
     */
    direction: 'ascending' | 'descending';

    /**
     * The sort key.
     */
    key: 'name' | 'last_modified';
  }

  /**
   * The render interface for file browser listing options.
   */
  export
  interface IRenderer {
    /**
     * Create the DOM node for a dir listing.
     */
    createNode(): HTMLElement;

    /**
     * Populate and empty header node for a dir listing.
     *
     * @param node - The header node to populate.
     */
    populateHeaderNode(node: HTMLElement): void;

    /**
     * Handle a header click.
     *
     * @param node - A node populated by [[populateHeaderNode]].
     *
     * @param event - A click event on the node.
     *
     * @returns The sort state of the header after the click event.
     */
    handleHeaderClick(node: HTMLElement, event: MouseEvent): ISortState;

    /**
     * Create a new item node for a dir listing.
     *
     * @returns A new DOM node to use as a content item.
     */
    createItemNode(): HTMLElement;

    /**
     * Update an item node to reflect the current state of a model.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param model - The model object to use for the item state.
     */
    updateItemNode(node: HTMLElement, model: Contents.IModel): void;

    /**
     * Get the node containing the file name.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @returns The node containing the file name.
     */
    getNameNode(node: HTMLElement): HTMLElement;

    /**
     * Create an appropriate drag image for an item.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param count - The number of items being dragged.
     *
     * @returns An element to use as the drag image.
     */
    createDragImage(node: HTMLElement, count: number, model: Contents.IModel): HTMLElement;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create the DOM node for a dir listing.
     */
    createNode(): HTMLElement {
      let node = document.createElement('div');
      let header = document.createElement('div');
      let content = document.createElement('ul');
      content.className = CONTENT_CLASS;
      header.className = HEADER_CLASS;
      node.appendChild(header);
      node.appendChild(content);
      node.tabIndex = 1;
      return node;
    }

    /**
     * Populate and empty header node for a dir listing.
     *
     * @param node - The header node to populate.
     */
    populateHeaderNode(node: HTMLElement): void {
      let name = this._createHeaderItemNode('Name');
      let modified = this._createHeaderItemNode('Last Modified');
      name.classList.add(NAME_ID_CLASS);
      name.classList.add(SELECTED_CLASS);
      modified.classList.add(MODIFIED_ID_CLASS);
      node.appendChild(name);
      node.appendChild(modified);
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
    handleHeaderClick(node: HTMLElement, event: MouseEvent): ISortState {
      let name = DOMUtils.findElement(node, NAME_ID_CLASS);
      let modified = DOMUtils.findElement(node, MODIFIED_ID_CLASS);
      let state: ISortState = { direction: 'ascending', key: 'name' };
      let target = event.target as HTMLElement;
      if (name.contains(target)) {
        if (name.classList.contains(SELECTED_CLASS)) {
          if (!name.classList.contains(DESCENDING_CLASS)) {
            state.direction = 'descending';
            name.classList.add(DESCENDING_CLASS);
          } else {
            name.classList.remove(DESCENDING_CLASS);
          }
        } else {
          name.classList.remove(DESCENDING_CLASS);
        }
        name.classList.add(SELECTED_CLASS);
        modified.classList.remove(SELECTED_CLASS);
        modified.classList.remove(DESCENDING_CLASS);
        return state;
      }
      if (modified.contains(target)) {
        state.key = 'last_modified';
        if (modified.classList.contains(SELECTED_CLASS)) {
          if (!modified.classList.contains(DESCENDING_CLASS)) {
            state.direction = 'descending';
            modified.classList.add(DESCENDING_CLASS);
          } else {
            modified.classList.remove(DESCENDING_CLASS);
          }
        } else {
          modified.classList.remove(DESCENDING_CLASS);
        }
        modified.classList.add(SELECTED_CLASS);
        name.classList.remove(SELECTED_CLASS);
        name.classList.remove(DESCENDING_CLASS);
        return state;
      }
      return void 0;
    }

    /**
     * Create a new item node for a dir listing.
     *
     * @returns A new DOM node to use as a content item.
     */
    createItemNode(): HTMLElement {
      let node = document.createElement('li');
      let icon = document.createElement('span');
      let text = document.createElement('span');
      let modified = document.createElement('span');
      icon.className = ITEM_ICON_CLASS;
      text.className = ITEM_TEXT_CLASS;
      modified.className = ITEM_MODIFIED_CLASS;
      node.appendChild(icon);
      node.appendChild(text);
      node.appendChild(modified);
      return node;
    }

    /**
     * Update an item node to reflect the current state of a model.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param model - The model object to use for the item state.
     */
    updateItemNode(node: HTMLElement, model: Contents.IModel): void {
      let icon = DOMUtils.findElement(node, ITEM_ICON_CLASS);
      let text = DOMUtils.findElement(node, ITEM_TEXT_CLASS);
      let modified = DOMUtils.findElement(node, ITEM_MODIFIED_CLASS);

      icon.className = ITEM_ICON_CLASS + ' ' + MATERIAL_ICON_CLASS;
      switch (model.type) {
      case 'directory':
        icon.classList.add(FOLDER_MATERIAL_ICON_CLASS);
        break;
      case 'notebook':
        icon.classList.add(NOTEBOOK_MATERIAL_ICON_CLASS);
        break;
      default:
        icon.classList.add(MATERIAL_ICON_CLASS);
        icon.classList.add(FILE_TYPE_CLASS);
        break;
      }

      let modText = '';
      let modTitle = '';
      if (model.last_modified) {
        modText = Time.formatHuman(model.last_modified);
        modTitle = Time.format(model.last_modified);
      }

      // If an item is being edited currently, its text node is unavailable.
      if (text) {
        text.textContent = model.name;
      }

      modified.textContent = modText;
      modified.title = modTitle;
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
     * Create a drag image for an item.
     *
     * @param node - A node created by [[createItemNode]].
     *
     * @param count - The number of items being dragged.
     *
     * @returns An element to use as the drag image.
     */
    createDragImage(node: HTMLElement, count: number, model: Contents.IModel): HTMLElement {
      let dragImage = node.cloneNode(true) as HTMLElement;
      let modified = DOMUtils.findElement(dragImage, ITEM_MODIFIED_CLASS);
      let iconNode = DOMUtils.findElement(dragImage, ITEM_ICON_CLASS);
      dragImage.removeChild(modified as HTMLElement);
      if (model) {
        switch (model.type) {
          case 'directory':
            iconNode.className = `${MATERIAL_ICON_CLASS} ${FOLDER_MATERIAL_ICON_CLASS} ${DRAG_ICON_CLASS}`;
            break;
          case 'notebook':
            iconNode.className = `${MATERIAL_ICON_CLASS} ${NOTEBOOK_MATERIAL_ICON_CLASS} ${DRAG_ICON_CLASS}`;
            break;
          default:
            iconNode.className = `${MATERIAL_ICON_CLASS} ${FILE_TYPE_CLASS} ${DRAG_ICON_CLASS}`;
            break;
        }
      }
      if (count > 1) {
        let nameNode = DOMUtils.findElement(dragImage, ITEM_TEXT_CLASS);
        nameNode.textContent = count + ' Items';
      }
      return dragImage;
    }

    /**
     * Create a node for a header item.
     */
    private _createHeaderItemNode(label: string): HTMLElement {
      let node = document.createElement('div');
      let text = document.createElement('span');
      let icon = document.createElement('span');
      node.className = HEADER_ITEM_CLASS;
      text.className = HEADER_ITEM_TEXT_CLASS;
      icon.className = HEADER_ITEM_ICON_CLASS;
      text.textContent = label;
      node.appendChild(text);
      node.appendChild(icon);
      return node;
    }
  }

  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
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
  export
  function doRename(text: HTMLElement, edit: HTMLInputElement): Promise<string> {
    let changed = true;
    let parent = text.parentElement as HTMLElement;
    parent.replaceChild(edit, text);
    edit.focus();
    let index = edit.value.lastIndexOf('.');
    if (index === -1) {
      edit.setSelectionRange(0, edit.value.length);
    } else {
      edit.setSelectionRange(0, index);
    }

    return new Promise<string>((resolve, reject) => {
      edit.onblur = () => {
        parent.replaceChild(text, edit);
        resolve(edit.value);
      };
      edit.onkeydown = (event: KeyboardEvent) => {
        switch (event.keyCode) {
        case 13:  // Enter
          event.stopPropagation();
          event.preventDefault();
          edit.blur();
          break;
        case 27:  // Escape
          event.stopPropagation();
          event.preventDefault();
          changed = false;
          edit.blur();
          break;
        case 38:  // Up arrow
          event.stopPropagation();
          event.preventDefault();
          if (edit.selectionStart !== edit.selectionEnd) {
            edit.selectionStart = edit.selectionEnd = 0;
          }
          break;
        case 40:  // Down arrow
          event.stopPropagation();
          event.preventDefault();
          if (edit.selectionStart !== edit.selectionEnd) {
            edit.selectionStart = edit.selectionEnd = edit.value.length;
          }
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
  export
  function sort(items: IIterator<Contents.IModel>, state: DirListing.ISortState) : Contents.IModel[] {
    // Shortcut for unmodified.
    if (state.key !== 'last_modified' && state.direction === 'ascending') {
      return toArray(items);
    }

    let copy = toArray(items);

    if (state.key === 'last_modified') {
      copy.sort((a, b) => {
        let valA = new Date(a.last_modified).getTime();
        let valB = new Date(b.last_modified).getTime();
        return valB - valA;
      });
    }

    // Reverse the order if descending.
    if (state.direction === 'descending') {
      copy.reverse();
    }

    return copy;
  }

  /**
   * Get the index of the node at a client position, or `-1`.
   */
  export
  function hitTestNodes(nodes: HTMLElement[], x: number, y: number): number {
    return ArrayExt.findFirstIndex(nodes, node => ElementExt.hitTest(node, x, y));
  }
}
