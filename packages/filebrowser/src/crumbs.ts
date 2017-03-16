// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  IDragEvent
} from '@phosphor/dragdrop';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  DOMUtils
} from '@jupyterlab/apputils';

import {
  FileBrowserModel
} from './model';

import * as utils
  from './utils';


/**
 * The class name added to material icons
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to the breadcrumb node.
 */
const BREADCRUMB_CLASS = 'jp-BreadCrumbs';

/**
 * The class name added to add the home icon for the breadcrumbs
 */
const BREADCRUMB_HOME = 'jp-HomeIcon';

/**
 * The class named associated to the ellipses icon
 */
const BREADCRUMB_ELLIPSES = 'jp-EllipsesIcon';

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
      return;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.update();
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
        let index = ArrayExt.findFirstIndex(this._crumbs, value => value === node);
        this._model.cd(BREAD_CRUMB_PATHS[index]).catch(error =>
          utils.showErrorMessage('Open Error', error)
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
      let index = ArrayExt.findFirstIndex(this._crumbs, node => ElementExt.hitTest(node, event.clientX, event.clientY));
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
    let index = ArrayExt.findFirstIndex(this._crumbs, node => ElementExt.hitTest(node, event.clientX, event.clientY));
    if (index !== -1) {
      this._crumbs[index].classList.add(utils.DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
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
    let index = ArrayExt.findFirstIndex(this._crumbs, node => node === target);
    if (index === -1) {
      return;
    }
    let path = BREAD_CRUMB_PATHS[index];
    let model = this._model;

    // Move all of the items.
    let promises: Promise<any>[] = [];
    let names = event.mimeData.getData(utils.CONTENTS_MIME) as string[];
    for (let name of names) {
      let newPath = path + name;
      promises.push(this._model.rename(name, newPath).catch(error => {
        if (error.xhr) {
          error.message = `${error.xhr.status}: error.statusText`;
        }
        if (error.message.ArrayExt.firstIndexOf('409') !== -1) {
          let overwrite = Dialog.warnButton({ label: 'OVERWRITE' });
          let options = {
            title: 'Overwrite file?',
            body: `"${newPath}" already exists, overwrite?`,
            buttons: [Dialog.cancelButton(), overwrite]
          };
          return showDialog(options).then(button => {
            if (!model.isDisposed && button.accept) {
              return model.deleteFile(newPath).then(() => {
                if (!model.isDisposed) {
                  return this._model.rename(name, newPath);
                }
              });
            }
          });
        }
      }));
    }
    Promise.all(promises).catch(err => {
      utils.showErrorMessage('Move Error', err);
    });
  }

  private _model: FileBrowserModel = null;
  private _crumbs: ReadonlyArray<HTMLElement> = null;
  private _crumbSeps: ReadonlyArray<HTMLElement> = null;
}



/**
 * The namespace for the `BreadCrumbs` class statics.
 */
export
namespace BreadCrumbs {
  /**
   * An options object for initializing a bread crumb widget.
   */
  export
  interface IOptions {
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
  function updateCrumbs(breadcrumbs: ReadonlyArray<HTMLElement>, separators: ReadonlyArray<HTMLElement>, path: string) {
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
      breadcrumbs[Crumb.Ellipsis].title = grandParent;
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
  function createCrumbs(): ReadonlyArray<HTMLElement> {
    let home = document.createElement('span');
    home.className = MATERIAL_CLASS + ' ' + BREADCRUMB_HOME + ' ' + BREADCRUMB_ITEM_CLASS;
    let ellipsis = document.createElement('span');
    ellipsis.className = MATERIAL_CLASS + ' ' + BREADCRUMB_ELLIPSES + ' ' + BREADCRUMB_ITEM_CLASS;
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
  function createCrumbSeparators(): ReadonlyArray<HTMLElement> {
    let items: HTMLElement[] = [];
    for (let i = 0; i < 3; i++) {
      let item = document.createElement('i');
      item.className = 'fa fa-angle-right';
      items.push(item);
    }
    return items;
  }
}
