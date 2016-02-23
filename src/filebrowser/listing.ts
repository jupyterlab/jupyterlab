// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  showDialog
} from 'jupyter-js-domutils';

import {
  IContentsModel
} from 'jupyter-js-services';

import * as moment
  from 'moment';

import * as arrays
  from 'phosphor-arrays';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  Drag, DropAction, DropActions, IDragEvent, MimeData
} from 'phosphor-dragdrop';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';

import {
  SELECTED_CLASS
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
const FILE_TYPE_CLASS = 'jp-type-file';

/**
 * The class name added to a folder type content item.
 */
const FOLDER_TYPE_CLASS = 'jp-type-folder';

/**
 * The class name added to a notebook type content item.
 */
const NOTEBOOK_TYPE_CLASS = 'jp-type-notebook';

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
const RENAME_DURATION = 500;

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * The factory MIME type supported by phosphor dock panels.
 */
const FACTORY_MIME = 'application/x-phosphor-widget-factory';


/**
 * A widget which hosts a file list area.
 */
export
class DirListing extends Widget {
  /**
   * Create the DOM node for a dir listing.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let content = document.createElement('ul');
    let header = this.createHeaderNode();
    content.className = CONTENT_CLASS;
    node.appendChild(header);
    node.appendChild(content);
    node.tabIndex = 1;
    return node;
  }

  /**
   * Create the header node for a dir listing.
   *
   * @returns A new DOM node to use as the dir listing header.
   *
   * #### Notes
   * This method may be reimplemented to create custom headers.
   */
  static createHeaderNode(): HTMLElement {
    let node = document.createElement('div');
    let name = createItemNode('Name');
    let modified = createItemNode('Last Modified');
    node.className = HEADER_CLASS;
    name.classList.add(NAME_ID_CLASS);
    name.classList.add(SELECTED_CLASS);
    modified.classList.add(MODIFIED_ID_CLASS);
    node.appendChild(name);
    node.appendChild(modified);
    return node;

    function createItemNode(label: string): HTMLElement {
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
   * Create a new item node for a dir listing.
   *
   * @returns A new DOM node to use as a content item.
   *
   * #### Notes
   * This method may be reimplemented to create custom items.
   */
  static createItemNode(): HTMLElement {
    let node = document.createElement('li');
    let icon = document.createElement('span');
    let text = document.createElement('span');
    let modified = document.createElement('span');
    node.className = ITEM_CLASS;
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
   * @param node - A node created by a call to [[createItemNode]].
   *
   * @param model - The model object to use for the item state.
   *
   * #### Notes
   * This is called automatically when the item should be updated.
   *
   * If the [[createItemNode]] method is reimplemented, this method
   * should also be reimplemented so that the item state is properly
   * updated.
   */
  static updateItemNode(node: HTMLElement, model: IContentsModel) {
    let icon = node.firstChild as HTMLElement;
    let text = icon.nextSibling as HTMLElement;
    let modified = text.nextSibling as HTMLElement;

    let type: string;
    switch (model.type) {
    case 'directory':
      type = FOLDER_TYPE_CLASS;
      break;
    case 'notebook':
      type = NOTEBOOK_TYPE_CLASS;
      break;
    default:
      type = FILE_TYPE_CLASS;
      break;
    }

    let modText = '';
    let modTitle = '';
    if (model.last_modified) {
      let time = moment(model.last_modified).fromNow();
      modText = time === 'a few seconds ago' ? 'seconds ago' : time;
      modTitle = moment(model.last_modified).format("YYYY-MM-DD HH:mm");
    }

    node.className = `${ITEM_CLASS} ${type}`;
    text.textContent = model.name;
    modified.textContent = modText;
    modified.title = modTitle;
  }

  /**
   * Construct a new file browser directory listing widget.
   *
   * @param model - The file browser view model.
   */
  constructor(model: FileBrowserModel) {
    super();
    this.addClass(DIR_LISTING_CLASS);
    this._model = model;
    this._model.refreshed.connect(this._onModelRefreshed, this);
    this._model.selectionChanged.connect(this._onSelectionChanged, this);
    this._editNode = document.createElement('input');
    this._editNode.className = EDITOR_CLASS;
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
    super.dispose();
  }

  /**
   * Get the widget factory for the widget.
   */
  get widgetFactory(): (model: IContentsModel) => Widget {
    return this._widgetFactory;
  }

  /**
   * Set the widget factory for the widget.
   */
  set widgetFactory(factory: (model: IContentsModel) => Widget) {
    this._widgetFactory = factory;
  }

  /**
   * Get the dir listing header node.
   *
   * #### Notes
   * This is the node which holds the header cells.
   *
   * Modifying this node directly can lead to undefined behavior.
   *
   * This is a read-only property.
   */
  get headerNode(): HTMLElement {
    return utils.findElement(this.node, HEADER_CLASS);
  }

  /**
   * Get the dir listing content node.
   *
   * #### Notes
   * This is the node which holds the item nodes.
   *
   * Modifying this node directly can lead to undefined behavior.
   *
   * This is a read-only property.
   */
  get contentNode(): HTMLElement {
    return utils.findElement(this.node, CONTENT_CLASS);
  }

  /**
   * Rename the first currently selected item.
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
   */
  paste(): Promise<void> {
    if (!this._clipboard.length) {
      return;
    }
    let promises: Promise<IContentsModel>[] = [];
    for (let path of this._clipboard) {
      if (this._isCut) {
        let parts = path.split('/');
        let name = parts[parts.length - 1];
        promises.push(this._model.rename(path, name));
      } else {
        promises.push(this._model.copy(path, '.'));
      }
    }
    // Remove any cut modifiers.
    for (let item of this._items) {
      item.classList.remove(CUT_CLASS);
    }

    this._clipboard = [];
    this._isCut = false;
    this.removeClass(CLIPBOARD_CLASS);
    return Promise.all(promises).then(
      () => this._model.refresh(),
      error => utils.showErrorMessage(this, 'Paste Error', error)
    );
  }

  /**
   * Delete the currently selected item(s).
   */
  delete(): Promise<void> {
    let promises: Promise<void>[] = [];
    let items = this._model.sortedItems;
    if (this._softSelection) {
      promises.push(this._model.delete(this._softSelection));
    } else {
      for (let item of items) {
        if (this._model.isSelected(item.name)) {
          promises.push(this._model.delete(item.name));
        }
      }
    }

    return Promise.all(promises).then(
      () => this._model.refresh(),
      error => utils.showErrorMessage(this, 'Delete file', error)
    );
  }

  /**
   * Duplicate the currently selected item(s).
   */
  duplicate(): Promise<void> {
    let promises: Promise<IContentsModel>[] = [];
    for (let item of this._getSelectedItems()) {
      if (item.type !== 'directory') {
        promises.push(this._model.copy(item.path, this._model.path));
      }
    }
    return Promise.all(promises).then(
      () => this._model.refresh(),
      error => utils.showErrorMessage(this, 'Duplicate file', error)
    );
  }

  /**
   * Download the currently selected item(s).
   */
  download(): Promise<void> {
    for (let item of this._getSelectedItems()) {
      if (item.type !== 'directory') {
        return this._model.download(item.path).catch(error =>
          utils.showErrorMessage(this, 'Download file', error)
        );
      }
    }
  }

  /**
   * Shut down kernels on the applicable currently selected items.
   */
  shutdownKernels(): Promise<void> {
    let promises: Promise<void>[] = [];
    let items = this._model.sortedItems;
    let paths = items.map(item => item.path);
    for (let sessionId of this._model.sessionIds) {
      let index = paths.indexOf(sessionId.notebook.path);
      if (!this._softSelection && this._model.isSelected(items[index].name)) {
        promises.push(this._model.shutdown(sessionId));
      } else if (this._softSelection === items[index].name) {
        promises.push(this._model.shutdown(sessionId));
      }
    }
    return Promise.all(promises).then(
      () => this._model.refresh(),
      error => utils.showErrorMessage(this, 'Shutdown kernel', error)
    );
  }

  /**
   * Select next item.
   *
   * @param keepExisting - Whether to keep the current selection and add to it.
   */
  selectNext(keepExisting = false): void {
    let index = -1;
    let selected = this._model.getSelected();
    let items = this._model.sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the next item.
      let name = selected[selected.length - 1];
      index = arrays.findIndex(items, (value, index) => value.name === name);
      index += 1;
      if (index === this._items.length) index = 0;
    } else if (selected.length === 0) {
      // Select the first item.
      index = 0;
    } else {
      // Select the last selected item.
      let name = selected[selected.length - 1];
      index = arrays.findIndex(items, (value, index) => value.name === name);
    }
    if (index !== -1) this._selectItem(index, keepExisting);
  }

  /**
   * Select previous item.
   *
   * @param keepExisting - Whether to keep the current selection and add to it.
   */
  selectPrevious(keepExisting = false): void {
    let index = -1;
    let selected = this._model.getSelected();
    let items = this._model.sortedItems;
    if (selected.length === 1 || keepExisting) {
      // Select the previous item.
      let name = selected[0];
      index = arrays.findIndex(items, (value, index) => value.name === name);
      index -= 1;
      if (index === -1) index = this._items.length - 1;
    } else if (selected.length === 0) {
      // Select the last item.
      index = this._items.length - 1;
    } else {
      // Select the first selected item.
      let name = selected[0];
      index = arrays.findIndex(items, (value, index) => value.name === name);
    }
    if (index !== -1) this._selectItem(index, keepExisting);
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
      break
    case 'dblclick':
      this._evtDblClick(event as MouseEvent);
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
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    let content = utils.findElement(node, CONTENT_CLASS);
    node.addEventListener('mousedown', this);
    node.addEventListener('keydown', this);
    node.addEventListener('click', this);
    node.addEventListener('dblclick', this);
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
    let content = utils.findElement(node, CONTENT_CLASS);
    node.removeEventListener('mousedown', this);
    node.removeEventListener('keydown', this);
    node.removeEventListener('click', this);
    node.removeEventListener('dblclick', this);
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
    let items = this._model.sortedItems;
    let nodes = this._items;
    let content = utils.findElement(this.node, CONTENT_CLASS);
    let subtype = this.constructor as typeof DirListing;

    this.removeClass(MULTI_SELECTED_CLASS);
    this.removeClass(SELECTED_CLASS);

    // Remove any excess item nodes.
    while (nodes.length > items.length) {
      let node = nodes.pop();
      content.removeChild(node);
    }

    // Add any missing item nodes.
    while (nodes.length < items.length) {
      let node = subtype.createItemNode();
      nodes.push(node);
      content.appendChild(node);
    }

    // Update the node states to match the model contents.
    for (let i = 0, n = items.length; i < n; ++i) {
      subtype.updateItemNode(nodes[i], items[i]);
      if (this._model.isSelected(items[i].name)) {
        nodes[i].classList.add(SELECTED_CLASS);
        if (this._isCut && this._model.path === this._prevPath) {
          nodes[i].classList.add(CUT_CLASS);
        }
      }
    }

    // Handle the selectors on the widget node.
    let selectedNames = this._model.getSelected();
    if (selectedNames.length > 1) {
      this.addClass(MULTI_SELECTED_CLASS);
    }
    if (selectedNames.length) {
      this.addClass(SELECTED_CLASS);
    }

    // Handle notebook session statuses.
    let paths = items.map(item => item.path);
    for (let sessionId of this._model.sessionIds) {
      let index = paths.indexOf(sessionId.notebook.path);
      let node = this._items[index];
      node.classList.add(RUNNING_CLASS);
      node.title = sessionId.kernel.name;
    }

    this._prevPath = this._model.path;
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent) {
    this._softSelection = '';
    let target = event.target as HTMLElement;

    let header = this.headerNode;
    if (header.contains(target)) {

      let children = header.getElementsByClassName(HEADER_ITEM_CLASS);
      let name = children[0] as HTMLElement;
      let modified = children[1] as HTMLElement;

      if (name.contains(target)) {
        if (this._model.sortKey === 'name') {
          let flag = !this._model.sortAscending;
          this._model.sortAscending = flag;
          if (flag) name.classList.remove(DESCENDING_CLASS);
          else name.classList.add(DESCENDING_CLASS);
        } else {
          this._model.sortKey = 'name';
          this._model.sortAscending = true;
          name.classList.remove(DESCENDING_CLASS);
        }
        name.classList.add(SELECTED_CLASS);
        modified.classList.remove(SELECTED_CLASS);
        modified.classList.remove(DESCENDING_CLASS);
      } else if (modified.contains(target)) {
        if (this._model.sortKey === 'last_modified') {
          let flag = !this._model.sortAscending;
          this._model.sortAscending = flag;
          if (flag) modified.classList.remove(DESCENDING_CLASS);
          else modified.classList.add(DESCENDING_CLASS);
        } else {
          this._model.sortKey = 'last_modified';
          this._model.sortAscending = true;
          modified.classList.remove(DESCENDING_CLASS);
        }
        modified.classList.add(SELECTED_CLASS);
        name.classList.remove(SELECTED_CLASS);
        name.classList.remove(DESCENDING_CLASS);
      }
      this.update();
      return;
    }

    let content = this.contentNode;
    if (content.contains(target)) {
      this._handleFileSelect(event);
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

    let index = utils.hitTestNodes(this._items, event.clientX, event.clientY);
    if (index == -1) {
      return;
    }
    this._softSelection = '';
    let items = this._model.sortedItems;
    let selected = this._model.getSelected();
    if (selected.indexOf(items[index].name) == -1) {
      this._softSelection = items[index].name;
    }

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
    this._noSelectTimer = setTimeout(() => {
      this._noSelectTimer = -1;
    }, RENAME_DURATION);

    this._editNode.blur();

    // Find a valid double click target.
    let target = event.target as HTMLElement;
    let i = arrays.findIndex(this._items, node => node.contains(target));
    if (i === -1) {
      return;
    }

    let item = this._model.sortedItems[i];
    this._model.open(item.name).catch(error =>
        utils.showErrorMessage(this, 'File Open Error', error)
    );
  }


  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(utils.CONTENTS_MIME)) {
      let index = utils.hitTestNodes(this._items, event.clientX, event.clientY);
      if (index === -1) {
        return;
      }
      let target = this._items[index];
      if (!target.classList.contains(FOLDER_TYPE_CLASS)) {
        return;
      }
      if (target.classList.contains(SELECTED_CLASS)) {
        return;
      }
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
    let dropTarget = utils.findElement(this.node, utils.DROP_TARGET_CLASS);
    if (dropTarget) dropTarget.classList.remove(utils.DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    let dropTarget = utils.findElement(this.node, utils.DROP_TARGET_CLASS);
    if (dropTarget) dropTarget.classList.remove(utils.DROP_TARGET_CLASS);
    let index = utils.hitTestNodes(this._items, event.clientX, event.clientY);
    this._items[index].classList.add(utils.DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === DropAction.None) {
      event.dropAction = DropAction.None;
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
    let index = this._items.indexOf(target);
    let items = this._model.sortedItems;
    var path = items[index].name + '/';

    // Move all of the items.
    let promises: Promise<IContentsModel>[] = [];
    for (let item of items) {
      if (!this._softSelection && !this._model.isSelected(item.name)) {
        continue;
      }
      if (this._softSelection !== item.name) {
        continue;
      }
      var name = item.name;
      var newPath = path + name;
      promises.push(this._model.rename(name, newPath).catch(error => {
        if (error.xhr) {
          error.message = `${error.xhr.statusText} ${error.xhr.status}`;
        }
        if (error.message.indexOf('409') !== -1) {
          let options = {
            title: 'Overwrite file?',
            host: this.parent.node,
            body: `"${newPath}" already exists, overwrite?`
          }
          return showDialog(options).then(button => {
            if (button.text === 'OK') {
              return this._model.delete(newPath).then(() => {
                return this._model.rename(name, newPath);
              });
            }
          });
        }
      }));
    }
    Promise.all(promises).then(
      () => this._model.refresh(),
      error => utils.showErrorMessage(this, 'Move Error', error)
    );
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let selectedNames = this._model.getSelected();
    let source = this._items[index];
    let items = this._model.sortedItems;
    let item: IContentsModel = null;

    // If the source node is not selected, use just that node.
    if (!source.classList.contains(SELECTED_CLASS)) {
      item = items[index];
      selectedNames = [item.name];
    } else if (selectedNames.length === 1) {
      let name = selectedNames[0];
      item = arrays.find(items, (value, index) => value.name === name);
    }

    // Create the drag image.
    var dragImage = source.cloneNode(true) as HTMLElement;
    dragImage.removeChild(dragImage.lastChild);
    if (selectedNames.length > 1) {
      let text = utils.findElement(dragImage, ITEM_TEXT_CLASS);
      text.textContent = '(' + selectedNames.length + ')'
    }

    // Set up the drag event.
    this._drag = new Drag({
      dragImage: dragImage,
      mimeData: new MimeData(),
      supportedActions: DropActions.Move,
      proposedAction: DropAction.Move
    });
    this._drag.mimeData.setData(utils.CONTENTS_MIME, null);
    if (this._widgetFactory && item && item.type !== 'directory') {
      this._drag.mimeData.setData(FACTORY_MIME, () => {
        return this._widgetFactory(item);
      });
    }

    // Start the drag and remove the mousemove listener.
    this._drag.start(clientX, clientY).then(action => {
      console.log('action', action);
      this._drag = null;
    });
    document.removeEventListener('mousemove', this, true);
  }

  /**
   * Handle selection on a file node.
   */
  private _handleFileSelect(event: MouseEvent): void {
    // Fetch common variables.
    let items = this._model.sortedItems;
    let nodes = this._items;
    let index = utils.hitTestNodes(this._items, event.clientX, event.clientY);

    clearTimeout(this._selectTimer);

    let name = items[index].name;
    let selected = this._model.getSelected();

    // Handle toggling.
    if (event.metaKey || event.ctrlKey) {
      if (this._model.isSelected(name)) {
        this._model.deselect(name);
      } else {
        this._model.select(name);
      }

    // Handle multiple select.
    } else if (event.shiftKey) {
      this._handleMultiSelect(selected, index);

    // Default to selecting the only the item.
    } else {
      // Handle a rename.
      if (selected.length === 1 && selected[0] === name) {
        this._selectTimer = setTimeout(() => {
          if (this._noSelectTimer === -1) {
            this._doRename();
          }
        }, RENAME_DURATION);
      }
      this._model.clearSelected();
      this._model.select(name);
    }
    this._isCut = false;
    this.update();
  }

  /**
   * Handle a multiple select on a file item node.
   */
  private _handleMultiSelect(selected: string[], index: number): void {
    // Find the "nearest selected".
    let items = this._model.sortedItems;
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
        this._model.select(items[i].name);
      }
    }
  }

  /**
   * Get the currently selected items.
   */
  private _getSelectedItems(): IContentsModel[] {
    let items = this._model.sortedItems;
    if (!this._softSelection) {
      return items.filter(item => this._model.isSelected(item.name));
    }
    return items.filter(item => item.name === this._softSelection);
  }

  /**
   * Copy the selected items, and optionally cut as well.
   */
  private _copy(): void {
    this._clipboard = []
    for (var item of this._getSelectedItems()) {
      let row = arrays.find(this._items, row => {
        let text = utils.findElement(row, ITEM_TEXT_CLASS);
        return text.textContent === item.name;
      });
      if (item.type !== 'directory') {
        // Store the absolute path of the item.
        this._clipboard.push('/' + item.path)
      }
    }
    this.update();
  }

  /**
   * Allow the user to rename item on a given row.
   */
  private _doRename(): Promise<string> {
    let listing = utils.findElement(this.node, CONTENT_CLASS);
    let items = this._model.sortedItems;
    let name = this._model.getSelected()[0];
    let index = arrays.findIndex(items, (value, index) => value.name === name);
    let row = this._items[index];
    let fileCell = utils.findElement(row, FILE_TYPE_CLASS);
    let text = utils.findElement(row, ITEM_TEXT_CLASS);
    let original = text.textContent;

    if (!fileCell) {
      return;
    }

    return Private.doRename(fileCell as HTMLElement, text, this._editNode).then(changed => {
      if (!changed) {
        return original;
      }
      let newPath = text.textContent;
      return this._model.rename(original, newPath).catch(error => {
        if (error.xhr) {
          error.message = `${error.xhr.status}: error.statusText`;
        }
        if (error.message.indexOf('409') !== -1 ||
            error.message.indexOf('already exists') !== -1) {
          let options = {
            title: 'Overwrite file?',
            host: this.parent.node,
            body: `"${newPath}" already exists, overwrite?`
          }
          return showDialog(options).then(button => {
            if (button.text === 'OK') {
              return this._model.delete(newPath).then(() => {
                return this._model.rename(original, newPath).then(() => {
                  this._model.refresh();
                });
              });
            } else {
              text.textContent = original;
            }
          });
        }
      }).catch(error => {
        utils.showErrorMessage(this, 'Rename Error', error);
        return original;
      }).then(() => {
        this._model.refresh();
        return text.textContent;
      });
    });
  }

  /**
   * Select a given item.
   */
  private _selectItem(index: number, keepExisting: boolean) {
    // Selected the given row(s)
    let items = this._model.sortedItems;
    if (!keepExisting) {
      this._model.clearSelected();
    }
    let name = items[index].name;
    this._model.select(name);
    Private.scrollIfNeeded(this.contentNode, this._items[index]);
    this._isCut = false;
  }

  /**
   * Handle the `refreshed` signal from the model.
   */
  private _onModelRefreshed(): void {
    this.update();
  }

  /**
   * Handle the `selectionChanged` signal from the model.
   */
  private _onSelectionChanged(): void {
    this.update();
  }

  private _model: FileBrowserModel = null;
  private _editNode: HTMLInputElement = null;
  private _items: HTMLElement[] = [];
  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number, index: number } = null;
  private _selectTimer = -1;
  private _noSelectTimer = -1;
  private _isCut = false;
  private _prevPath = '';
  private _clipboard: string[] = [];
  private _widgetFactory: (model: IContentsModel) => Widget = null;
  private _softSelection = '';
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
  function doRename(parent: HTMLElement, text: HTMLElement, edit: HTMLInputElement): Promise<boolean> {
    let changed = true;
    parent.replaceChild(edit, text);
    edit.value = text.textContent;
    edit.focus();
    let index = edit.value.lastIndexOf('.');
    if (index === -1) {
      edit.setSelectionRange(0, edit.value.length);
    } else {
      edit.setSelectionRange(0, index);
    }

    return new Promise<boolean>((resolve, reject) => {
      edit.onblur = () => {
        parent.replaceChild(text, edit);
        if (text.textContent === edit.value) {
          changed = false;
        }
        if (changed) text.textContent = edit.value;
        resolve(changed);
      }
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
        }
      }
    });
  }

  /**
   * Scroll an element into view if needed.
   *
   * @param area - The scroll area element.
   *
   * @param elem - The element of interest.
   */
  export
  function scrollIfNeeded(area: HTMLElement, elem: HTMLElement): void {
    let ar = area.getBoundingClientRect();
    let er = elem.getBoundingClientRect();
    if (er.top < ar.top) {
      area.scrollTop -= ar.top - er.top;
    } else if (er.bottom > ar.bottom) {
      area.scrollTop += er.bottom - ar.bottom;
    }
  }
}
