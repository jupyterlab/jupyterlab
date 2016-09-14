// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDragEvent
} from 'phosphor/lib/dom/dragdrop';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  DropWidget, findChild
} from '../common/dragpanel';

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
class BreadCrumbs extends DropWidget {

  /**
   * Construct a new file browser crumb widget.
   *
   * @param model - The file browser view model.
   */
  constructor(options: BreadCrumbs.IOptions) {
    super({
      acceptDropsFromExternalSource: true
    });
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
    default:
      super.handleEvent(event);
      return;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('click', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('click', this);
  }

  /**
   * Find a drop target from a given drag event target.
   *
   * Returns the crumb that is being dropped on, if not the
   * current crumb, otherwise returns null.
   *
   * Overrides method from `DropPanel`.
   */
  protected findDropTarget(input: HTMLElement, mimeData: MimeData): HTMLElement {
    if (mimeData.hasData(utils.CONTENTS_MIME)) {
      let child = findChild(this._crumbs, input);
      let index = this._crumbs.indexOf(child);
      if (index !== -1 && index !== Private.Crumb.Current) {
        return child;
      }
    }
    return null;
  }

  /**
   * Processes a drop event.
   *
   * This function is called after checking:
   *  - That the `dropTarget` is a valid drop target
   *  - The value of `event.source` if `acceptDropsFromExternalSource` is true
   *
   * Overrides method from `DropPanel`.
   */
  protected processDrop(dropTarget: HTMLElement, event: IDragEvent): void {
    // Get the path based on the target node.
    let index = this._crumbs.indexOf(dropTarget);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!DropWidget.isValidAction(event.supportedActions, 'move') ||
        event.proposedAction === 'none') {
      // The default implementation only handles move action
      // OR Accept proposed none action, and perform no-op
      event.dropAction = 'none';
      return;
    }
    event.dropAction = 'move';
    let path = BREAD_CRUMB_PATHS[index];

    // Move all of the items.
    let names = event.mimeData.getData(utils.CONTENTS_MIME) as string[];
    let promises = utils.moveConditionalOverwrite(
      path, names, this._model
    );
    Promise.all(promises).then(
      () => this._model.refresh(),
      err => utils.showErrorMessage(this, 'Move Error', err)
    );
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

  private _model: FileBrowserModel = null;
  private _crumbs: HTMLElement[] = [];
  private _crumbSeps: HTMLElement[] = [];
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
