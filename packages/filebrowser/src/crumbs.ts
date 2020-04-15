// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import { ElementExt } from '@lumino/domutils';

import { IDragEvent } from '@lumino/dragdrop';

import { Widget } from '@lumino/widgets';

import { DOMUtils, showErrorMessage } from '@jupyterlab/apputils';

import { PageConfig, PathExt } from '@jupyterlab/coreutils';

import { renameFile } from '@jupyterlab/docmanager';

import { ellipsesIcon, folderIcon } from '@jupyterlab/ui-components';

import { FileBrowserModel } from './model';

/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_CLASS = 'jp-BreadCrumbs';

/**
 * The class name for the breadcrumbs home node
 */
const BREADCRUMB_HOME_CLASS = 'jp-BreadCrumbs-home';

/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_ITEM_CLASS = 'jp-BreadCrumbs-item';

/**
 * Bread crumb paths.
 */
const BREAD_CRUMB_PATHS = ['/', '../../', '../', ''];

/**
 * The mime type for a contents drag object.
 */
const CONTENTS_MIME = 'application/x-jupyter-icontents';

/**
 * The class name added to drop targets.
 */
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * A class which hosts folder breadcrumbs.
 */
export class BreadCrumbs extends Widget {
  /**
   * Construct a new file browser crumb widget.
   *
   * @param model - The file browser view model.
   */
  constructor(options: BreadCrumbs.IOptions) {
    super();
    this._model = options.model;
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
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
      default:
        return;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.update();
    const node = this.node;
    node.addEventListener('click', this);
    node.addEventListener('lm-dragenter', this);
    node.addEventListener('lm-dragleave', this);
    node.addEventListener('lm-dragover', this);
    node.addEventListener('lm-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    const node = this.node;
    node.removeEventListener('click', this);
    node.removeEventListener('lm-dragenter', this);
    node.removeEventListener('lm-dragleave', this);
    node.removeEventListener('lm-dragover', this);
    node.removeEventListener('lm-drop', this);
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Update the breadcrumb list.
    const contents = this._model.manager.services.contents;
    const localPath = contents.localPath(this._model.path);
    Private.updateCrumbs(this._crumbs, this._crumbSeps, localPath);
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Find a valid click target.
    let node = event.target as HTMLElement;
    while (node && node !== this.node) {
      if (
        node.classList.contains(BREADCRUMB_ITEM_CLASS) ||
        node.classList.contains(BREADCRUMB_HOME_CLASS)
      ) {
        const index = ArrayExt.findFirstIndex(
          this._crumbs,
          value => value === node
        );
        this._model
          .cd(BREAD_CRUMB_PATHS[index])
          .catch(error => showErrorMessage('Open Error', error));

        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      node = node.parentElement as HTMLElement;
    }
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (event.mimeData.hasData(CONTENTS_MIME)) {
      const index = ArrayExt.findFirstIndex(this._crumbs, node =>
        ElementExt.hitTest(node, event.clientX, event.clientY)
      );
      if (index !== -1) {
        if (index !== Private.Crumb.Current) {
          this._crumbs[index].classList.add(DROP_TARGET_CLASS);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
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
  private _evtDragOver(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    const dropTarget = DOMUtils.findElement(this.node, DROP_TARGET_CLASS);
    if (dropTarget) {
      dropTarget.classList.remove(DROP_TARGET_CLASS);
    }
    const index = ArrayExt.findFirstIndex(this._crumbs, node =>
      ElementExt.hitTest(node, event.clientX, event.clientY)
    );
    if (index !== -1) {
      this._crumbs[index].classList.add(DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    if (!event.mimeData.hasData(CONTENTS_MIME)) {
      return;
    }
    event.dropAction = event.proposedAction;

    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(DROP_TARGET_CLASS)) {
        target.classList.remove(DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }

    // Get the path based on the target node.
    const index = ArrayExt.findFirstIndex(
      this._crumbs,
      node => node === target
    );
    if (index === -1) {
      return;
    }

    const model = this._model;
    const path = PathExt.resolve(model.path, BREAD_CRUMB_PATHS[index]);
    const manager = model.manager;

    // Move all of the items.
    const promises: Promise<any>[] = [];
    const oldPaths = event.mimeData.getData(CONTENTS_MIME) as string[];
    for (const oldPath of oldPaths) {
      const localOldPath = manager.services.contents.localPath(oldPath);
      const name = PathExt.basename(localOldPath);
      const newPath = PathExt.join(path, name);
      promises.push(renameFile(manager, oldPath, newPath));
    }
    void Promise.all(promises).catch(err => {
      return showErrorMessage('Move Error', err);
    });
  }

  private _model: FileBrowserModel;
  private _crumbs: ReadonlyArray<HTMLElement>;
  private _crumbSeps: ReadonlyArray<HTMLElement>;
}

/**
 * The namespace for the `BreadCrumbs` class statics.
 */
export namespace BreadCrumbs {
  /**
   * An options object for initializing a bread crumb widget.
   */
  export interface IOptions {
    /**
     * A file browser model instance.
     */
    model: FileBrowserModel;
  }
}

/**
 * The namespace for the crumbs private data.
 */
namespace Private {
  /**
   * Breadcrumb item list enum.
   */
  export enum Crumb {
    Home,
    Ellipsis,
    Parent,
    Current
  }

  /**
   * Populate the breadcrumb node.
   */
  export function updateCrumbs(
    breadcrumbs: ReadonlyArray<HTMLElement>,
    separators: ReadonlyArray<HTMLElement>,
    path: string
  ) {
    const node = breadcrumbs[0].parentNode as HTMLElement;

    // Remove all but the home node.
    const firstChild = node.firstChild as HTMLElement;
    while (firstChild && firstChild.nextSibling) {
      node.removeChild(firstChild.nextSibling);
    }
    node.appendChild(separators[0]);

    const parts = path.split('/');
    if (parts.length > 2) {
      node.appendChild(breadcrumbs[Crumb.Ellipsis]);
      const grandParent = parts.slice(0, parts.length - 2).join('/');
      breadcrumbs[Crumb.Ellipsis].title = grandParent;
      node.appendChild(separators[1]);
    }

    if (path) {
      if (parts.length >= 2) {
        breadcrumbs[Crumb.Parent].textContent = parts[parts.length - 2];
        node.appendChild(breadcrumbs[Crumb.Parent]);
        const parent = parts.slice(0, parts.length - 1).join('/');
        breadcrumbs[Crumb.Parent].title = parent;
        node.appendChild(separators[2]);
      }
      breadcrumbs[Crumb.Current].textContent = parts[parts.length - 1];
      node.appendChild(breadcrumbs[Crumb.Current]);
      breadcrumbs[Crumb.Current].title = path;
      node.appendChild(separators[3]);
    }
  }

  /**
   * Create the breadcrumb nodes.
   */
  export function createCrumbs(): ReadonlyArray<HTMLElement> {
    const home = folderIcon.element({
      className: BREADCRUMB_HOME_CLASS,
      tag: 'span',
      title: PageConfig.getOption('serverRoot') || 'Jupyter Server Root',
      stylesheet: 'breadCrumb'
    });
    const ellipsis = ellipsesIcon.element({
      className: BREADCRUMB_ITEM_CLASS,
      tag: 'span',
      stylesheet: 'breadCrumb'
    });
    const parent = document.createElement('span');
    parent.className = BREADCRUMB_ITEM_CLASS;
    const current = document.createElement('span');
    current.className = BREADCRUMB_ITEM_CLASS;
    return [home, ellipsis, parent, current];
  }

  /**
   * Create the breadcrumb separator nodes.
   */
  export function createCrumbSeparators(): ReadonlyArray<HTMLElement> {
    const items: HTMLElement[] = [];
    // The maximum number of directories that will be shown in the crumbs
    const MAX_DIRECTORIES = 2;

    // Make separators for after each directory, one at the beginning, and one
    // after a possible ellipsis.
    for (let i = 0; i < MAX_DIRECTORIES + 2; i++) {
      const item = document.createElement('span');
      item.textContent = '/';
      items.push(item);
    }
    return items;
  }
}
