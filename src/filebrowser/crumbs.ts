// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-domutils';

import {
  DropAction, IDragEvent
} from 'phosphor-dragdrop';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';


/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_CLASS = 'jp-BreadCrumbs';

/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_ITEM_CLASS = 'jp-BreadCrumbs-item';

/**
 * Bread crumb paths.
 */
const BREAD_CRUMB_PATHS = ['/', '../../', '../', ''];


/**
 * A class which hosts folder breadcrumbs.
 */
export
class BreadCrumbs extends Widget {

  /**
   * Construct a new file browser crumb widget.
   *
   * @param model - The file browser view model.
   */
  constructor(model: FileBrowserModel) {
    super();
    this._model = model;
    this.addClass(BREADCRUMB_CLASS);
    this._crumbs = Private.createCrumbs();
    this._crumbSeps = Private.createCrumbSeparators();
    this.node.appendChild(this._crumbs[Private.Crumb.Home]);
    this._model.refreshed.connect(this.update, this);
  }

  /**
   * Handle the DOM events for the bread crumbs.
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
    case 'click':
      this._evtClick(event as MouseEvent);
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
    node.addEventListener('click', this);
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('click', this);
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Update the breadcrumb list.
    Private.updateCrumbs(this._crumbs, this._crumbSeps, this._model.path);
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent) {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Find a valid click target.
    let node = event.target as HTMLElement;
    while (node && node !== this.node) {
      if (node.classList.contains(BREADCRUMB_ITEM_CLASS)) {
        let index = this._crumbs.indexOf(node);
        this._model.cd(BREAD_CRUMB_PATHS[index]).catch(error =>
          utils.showErrorMessage(this, 'Open Error', error)
        );

        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      node = node.parentElement;
    }
  }

  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(utils.CONTENTS_MIME)) {
      let index = utils.hitTestNodes(this._crumbs, event.clientX, event.clientY);
      if (index !== -1) {
        if (index !== Private.Crumb.Current) {
          this._crumbs[index].classList.add(utils.DROP_TARGET_CLASS);
          event.preventDefault();
          event.stopPropagation();
        }
      }
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
    let index = utils.hitTestNodes(this._crumbs, event.clientX, event.clientY);
    if (index !== -1) this._crumbs[index].classList.add(utils.DROP_TARGET_CLASS);
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
    let index = this._crumbs.indexOf(target);
    if (index == -1) return;
    var path = BREAD_CRUMB_PATHS[index];

    // Move all of the items.
    let promises: Promise<void>[] = [];
    let items = this._model.sortedItems;
    for (let item of items) {
      var name = item.name;
      if (!this._model.isSelected(name)) {
        continue;
      }
      var newPath = path + name;
      promises.push(this._model.rename(name, newPath).catch(error => {
        if (error.xhr) {
          error.message = `${error.xhr.status}: error.statusText`;
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
                return this._model.rename(name, newPath).then(() => {
                  return this._model.refresh();
                });
              });
            }
          });
        }
      }));
    }
    Promise.all(promises).then(
      () => this._model.refresh(),
      err => utils.showErrorMessage(this, 'Move Error', err)
    );
  }

  private _model: FileBrowserModel = null;
  private _crumbs: HTMLElement[] = [];
  private _crumbSeps: HTMLElement[] = [];
}


/**
 * The namespace for the crumbs private data.
 */
namespace Private {

  /**
   * Breadcrumb item list enum.
   */
  export
  enum Crumb {
    Home,
    Ellipsis,
    Parent,
    Current
  }

  /**
   * Populate the breadcrumb node.
   */
  export
  function updateCrumbs(breadcrumbs: HTMLElement[], separators: HTMLElement[], path: string) {
    let node = breadcrumbs[0].parentNode;

    // Remove all but the home node.
    while (node.firstChild.nextSibling) {
      node.removeChild(node.firstChild.nextSibling);
    }

    let parts = path.split('/');
    if (parts.length > 2) {
      node.appendChild(separators[0]);
      node.appendChild(breadcrumbs[Crumb.Ellipsis]);
      let grandParent = parts.slice(0, parts.length - 2).join('/');
      breadcrumbs[Crumb.Ellipsis].title = grandParent
    }

    if (path) {
      if (parts.length >= 2) {
        node.appendChild(separators[1]);
        breadcrumbs[Crumb.Parent].textContent = parts[parts.length - 2];
        node.appendChild(breadcrumbs[Crumb.Parent]);
        let parent = parts.slice(0, parts.length - 1).join('/');
        breadcrumbs[Crumb.Parent].title = parent;
      }
      node.appendChild(separators[2]);
      breadcrumbs[Crumb.Current].textContent = parts[parts.length - 1];
      node.appendChild(breadcrumbs[Crumb.Current]);
      breadcrumbs[Crumb.Current].title = path;
    }
  }

  /**
   * Create the breadcrumb nodes.
   */
  export
  function createCrumbs(): HTMLElement[] {
    let home = document.createElement('i');
    home.className = 'fa fa-home ' + BREADCRUMB_ITEM_CLASS;
    let ellipsis = document.createElement('i');
    ellipsis.className = 'fa fa-ellipsis-h ' + BREADCRUMB_ITEM_CLASS;
    let parent = document.createElement('span');
    parent.className = BREADCRUMB_ITEM_CLASS;
    let current = document.createElement('span');
    current.className = BREADCRUMB_ITEM_CLASS;
    return [home, ellipsis, parent, current];
  }

  /**
   * Create the breadcrumb separator nodes.
   */
  export
  function createCrumbSeparators(): HTMLElement[] {
    let items: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      let item = document.createElement('i');
      item.className = 'fa fa-angle-right';
      items.push(item);
    }
    return items;
  }
}
