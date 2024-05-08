// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils, showErrorMessage } from '@jupyterlab/apputils';
import { PageConfig, PathExt } from '@jupyterlab/coreutils';
import { renameFile } from '@jupyterlab/docmanager';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  ellipsesIcon,
  homeIcon as preferredIcon,
  folderIcon as rootIcon
} from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { JSONExt } from '@lumino/coreutils';
import { ElementExt } from '@lumino/domutils';
import { Drag } from '@lumino/dragdrop';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { FileBrowserModel } from './model';

/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_CLASS = 'jp-BreadCrumbs';

/**
 * The class name for the breadcrumbs home node
 */
const BREADCRUMB_ROOT_CLASS = 'jp-BreadCrumbs-home';

/**
 * The class name for the breadcrumbs preferred node
 */
const BREADCRUMB_PREFERRED_CLASS = 'jp-BreadCrumbs-preferred';

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
   * @param options Constructor options.
   */
  constructor(options: BreadCrumbs.IOptions) {
    super();
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._model = options.model;
    this._fullPath = options.fullPath || false;
    this.addClass(BREADCRUMB_CLASS);
    this._crumbs = Private.createCrumbs();
    this._crumbSeps = Private.createCrumbSeparators();
    const hasPreferred = PageConfig.getOption('preferredPath');
    this._hasPreferred = hasPreferred && hasPreferred !== '/' ? true : false;
    if (this._hasPreferred) {
      this.node.appendChild(this._crumbs[Private.Crumb.Preferred]);
    }
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
        this._evtDragEnter(event as Drag.Event);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as Drag.Event);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as Drag.Event);
        break;
      case 'lm-drop':
        this._evtDrop(event as Drag.Event);
        break;
      default:
        return;
    }
  }

  /**
   * Whether to show the full path in the breadcrumbs
   */
  get fullPath(): boolean {
    return this._fullPath;
  }

  set fullPath(value: boolean) {
    this._fullPath = value;
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
    const state = {
      path: localPath,
      hasPreferred: this._hasPreferred,
      fullPath: this._fullPath
    };
    if (this._previousState && JSONExt.deepEqual(state, this._previousState)) {
      return;
    }
    this._previousState = state;
    Private.updateCrumbs(this._crumbs, this._crumbSeps, state);
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
      if (node.classList.contains(BREADCRUMB_PREFERRED_CLASS)) {
        this._model
          .cd(PageConfig.getOption('preferredPath'))
          .catch(error =>
            showErrorMessage(this._trans.__('Open Error'), error)
          );

        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (
        node.classList.contains(BREADCRUMB_ITEM_CLASS) ||
        node.classList.contains(BREADCRUMB_ROOT_CLASS)
      ) {
        let index = ArrayExt.findFirstIndex(
          this._crumbs,
          value => value === node
        );
        let destination = BREAD_CRUMB_PATHS[index];
        if (
          this._fullPath &&
          index < 0 &&
          !node.classList.contains(BREADCRUMB_ROOT_CLASS)
        ) {
          destination = node.title;
        }
        this._model
          .cd(destination)
          .catch(error =>
            showErrorMessage(this._trans.__('Open Error'), error)
          );

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
  private _evtDragEnter(event: Drag.Event): void {
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
  private _evtDragLeave(event: Drag.Event): void {
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
  private _evtDragOver(event: Drag.Event): void {
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
  private _evtDrop(event: Drag.Event): void {
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
      return showErrorMessage(this._trans.__('Move Error'), err);
    });
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _model: FileBrowserModel;
  private _hasPreferred: boolean;
  private _crumbs: ReadonlyArray<HTMLElement>;
  private _crumbSeps: ReadonlyArray<HTMLElement>;
  private _fullPath: boolean;
  private _previousState: Private.ICrumbsState | null = null;
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

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * Show the full file browser path in breadcrumbs
     */
    fullPath?: boolean;
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
    Current,
    Preferred
  }

  /**
   * Breadcrumbs state.
   */
  export interface ICrumbsState {
    [key: string]: string | boolean;
    path: string;
    hasPreferred: boolean;
    fullPath: boolean;
  }

  /**
   * Populate the breadcrumb node.
   */
  export function updateCrumbs(
    breadcrumbs: ReadonlyArray<HTMLElement>,
    separators: ReadonlyArray<HTMLElement>,
    state: ICrumbsState
  ): void {
    const node = breadcrumbs[0].parentNode as HTMLElement;

    // Remove all but the home or preferred node.
    const firstChild = node.firstChild as HTMLElement;
    while (firstChild && firstChild.nextSibling) {
      node.removeChild(firstChild.nextSibling);
    }

    if (state.hasPreferred) {
      node.appendChild(breadcrumbs[Crumb.Home]);
      node.appendChild(separators[0]);
    } else {
      node.appendChild(separators[0]);
    }

    const parts = state.path.split('/');
    if (!state.fullPath && parts.length > 2) {
      node.appendChild(breadcrumbs[Crumb.Ellipsis]);
      const grandParent = parts.slice(0, parts.length - 2).join('/');
      breadcrumbs[Crumb.Ellipsis].title = grandParent;
      node.appendChild(separators[1]);
    }

    if (state.path) {
      if (!state.fullPath) {
        if (parts.length >= 2) {
          breadcrumbs[Crumb.Parent].textContent = parts[parts.length - 2];
          node.appendChild(breadcrumbs[Crumb.Parent]);
          const parent = parts.slice(0, parts.length - 1).join('/');
          breadcrumbs[Crumb.Parent].title = parent;
          node.appendChild(separators[2]);
        }
        breadcrumbs[Crumb.Current].textContent = parts[parts.length - 1];
        node.appendChild(breadcrumbs[Crumb.Current]);
        breadcrumbs[Crumb.Current].title = state.path;
        node.appendChild(separators[3]);
      } else {
        for (let i = 0; i < parts.length; i++) {
          const elem = document.createElement('span');
          elem.className = BREADCRUMB_ITEM_CLASS;
          elem.textContent = parts[i];
          const elemPath = `/${parts.slice(0, i + 1).join('/')}`;
          elem.title = elemPath;
          node.appendChild(elem);
          const separator = document.createElement('span');
          separator.textContent = '/';
          node.appendChild(separator);
        }
      }
    }
  }

  /**
   * Create the breadcrumb nodes.
   */
  export function createCrumbs(): ReadonlyArray<HTMLElement> {
    const home = rootIcon.element({
      className: BREADCRUMB_ROOT_CLASS,
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
    const preferred = preferredIcon.element({
      className: BREADCRUMB_PREFERRED_CLASS,
      tag: 'span',
      title: PageConfig.getOption('preferredPath') || 'Jupyter Preferred Path',
      stylesheet: 'breadCrumb'
    });
    return [home, ellipsis, parent, current, preferred];
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
