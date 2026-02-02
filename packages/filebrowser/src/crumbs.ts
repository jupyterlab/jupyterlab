// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils, showErrorMessage } from '@jupyterlab/apputils';
import { PageConfig, PathExt } from '@jupyterlab/coreutils';
import { renameFile } from '@jupyterlab/docmanager';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import {
  ellipsesIcon,
  homeIcon as preferredIcon,
  folderIcon as rootIcon
} from '@jupyterlab/ui-components';
import { JSONExt } from '@lumino/coreutils';
import type { Drag } from '@lumino/dragdrop';
import type { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import type { FileBrowserModel } from './model';

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
 * The class name for the breadcrumbs ellipsis node
 */
const BREADCRUMB_ELLIPSIS_CLASS = 'jp-BreadCrumbs-ellipsis';

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
    this._minimumLeftItems = options.minimumLeftItems ?? 0;
    this._minimumRightItems = options.minimumRightItems ?? 2;
    this.addClass(BREADCRUMB_CLASS);
    this._crumbs = Private.createCrumbs();
    const hasPreferred = PageConfig.getOption('preferredPath');
    this._hasPreferred = hasPreferred && hasPreferred !== '/' ? true : false;
    if (this._hasPreferred) {
      this.node.appendChild(this._crumbs[Private.Crumb.Preferred]);
    }
    this.node.appendChild(this._crumbs[Private.Crumb.Home]);
    this._model.refreshed.connect(this.update, this);
    this._resizeObserver = new ResizeObserver(() => {
      this._onResize();
    });
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
   * Number of items to show on left of ellipsis
   */
  get minimumLeftItems(): number {
    return this._minimumLeftItems;
  }

  set minimumLeftItems(value: number) {
    this._minimumLeftItems = value;
  }

  /**
   * Number of items to show on right of ellipsis
   */
  get minimumRightItems(): number {
    return this._minimumRightItems;
  }

  set minimumRightItems(value: number) {
    this._minimumRightItems = value;
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
    this._resizeObserver.observe(node);
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
    this._resizeObserver.disconnect();
  }

  /**
   * A handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Update the breadcrumb list.
    const contents = this._model.manager.services.contents;
    const localPath = contents.localPath(this._model.path);

    // Calculate adaptive items based on available width
    const adaptiveItems = this._calculateAdaptiveItems(localPath);

    const state = {
      path: localPath,
      hasPreferred: this._hasPreferred,
      fullPath: this._fullPath,
      minimumLeftItems: adaptiveItems.left,
      minimumRightItems: adaptiveItems.right,
      containerWidth: this._lastContainerWidth
    };
    if (this._previousState && JSONExt.deepEqual(state, this._previousState)) {
      return;
    }
    this._previousState = state;
    Private.updateCrumbs(this._crumbs, state);
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
        const preferredPath = PageConfig.getOption('preferredPath');
        const path = preferredPath ? '/' + preferredPath : preferredPath;
        this._model
          .cd(path)
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
        let destination: string | undefined;
        if (node.classList.contains(BREADCRUMB_ROOT_CLASS)) {
          destination = '/';
        } else {
          destination = `/${node.dataset.path}`;
        }
        if (destination) {
          this._model
            .cd(destination)
            .catch(error =>
              showErrorMessage(this._trans.__('Open Error'), error)
            );
        }

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
      const breadcrumbElements = this._getBreadcrumbElements();
      let index = -1;
      let target = event.target as HTMLElement;
      while (target && target !== this.node) {
        index = breadcrumbElements.indexOf(target);
        if (index !== -1) {
          break;
        }
        target = target.parentElement as HTMLElement;
      }
      if (index !== -1) {
        const hitElement = breadcrumbElements[index];
        // Don't allow dropping on the current path
        const currentPath = this._model.manager.services.contents.localPath(
          this._model.path
        );
        if (hitElement.dataset.path !== currentPath) {
          hitElement.classList.add(DROP_TARGET_CLASS);
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
    const breadcrumbElements = this._getBreadcrumbElements();
    let index = -1;
    let target = event.target as HTMLElement;
    while (target && target !== this.node) {
      index = breadcrumbElements.indexOf(target);
      if (index !== -1) {
        break;
      }
      target = target.parentElement as HTMLElement;
    }
    if (index !== -1) {
      breadcrumbElements[index].classList.add(DROP_TARGET_CLASS);
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

    let destinationPath: string | null = null;
    if (target.classList.contains(BREADCRUMB_ROOT_CLASS)) {
      destinationPath = '/';
    } else if (target.classList.contains(BREADCRUMB_PREFERRED_CLASS)) {
      const preferredPath = PageConfig.getOption('preferredPath');
      destinationPath = preferredPath ? '/' + preferredPath : '/';
    } else if (target.dataset.path) {
      destinationPath = target.dataset.path;
    }

    if (!destinationPath) {
      return;
    }

    const model = this._model;
    const manager = model.manager;

    // Move all of the items.
    const promises: Promise<any>[] = [];
    const oldPaths = event.mimeData.getData(CONTENTS_MIME) as string[];
    for (const oldPath of oldPaths) {
      const name = PathExt.basename(oldPath);
      const newPath = PathExt.join(destinationPath, name);
      promises.push(renameFile(manager, oldPath, newPath));
    }
    void Promise.all(promises).catch(err => {
      return showErrorMessage(this._trans.__('Move Error'), err);
    });
  }

  /**
   * Get all breadcrumb elements that can be drop targets.
   */
  private _getBreadcrumbElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const children = this.node.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (
        (child.classList.contains(BREADCRUMB_ITEM_CLASS) ||
          child.classList.contains(BREADCRUMB_ROOT_CLASS) ||
          child.classList.contains(BREADCRUMB_PREFERRED_CLASS)) &&
        !child.classList.contains(BREADCRUMB_ELLIPSIS_CLASS)
      ) {
        elements.push(child);
      }
    }
    return elements;
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _model: FileBrowserModel;
  private _hasPreferred: boolean;
  private _crumbs: ReadonlyArray<HTMLElement>;
  private _fullPath: boolean;
  private _previousState: Private.ICrumbsState | null = null;
  private _minimumLeftItems: number;
  private _minimumRightItems: number;
  private _resizeObserver: ResizeObserver;
  private _lastContainerWidth: number = 0;
  private _resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Handle resize events with debouncing.
   */
  private _onResize(): void {
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
    }
    this._resizeTimeout = setTimeout(() => {
      const newWidth = this.node.clientWidth;
      if (newWidth !== this._lastContainerWidth) {
        this._lastContainerWidth = newWidth;
        // Force recalculation by clearing previous state
        this._previousState = null;
        this.update();
      }
    }, 100);
  }

  /**
   * Calculate adaptive left/right items based on available width.
   */
  private _calculateAdaptiveItems(path: string): {
    left: number;
    right: number;
  } {
    const parts = path.split('/').filter(part => part !== '');
    const totalParts = parts.length;

    // If fullPath is enabled or there are no parts, use minimum settings
    if (this._fullPath || totalParts === 0) {
      return { left: this._minimumLeftItems, right: this._minimumRightItems };
    }

    // If total parts fit within minimums, no adaptation needed
    const minTotal = this._minimumLeftItems + this._minimumRightItems;
    if (totalParts <= minTotal) {
      return { left: this._minimumLeftItems, right: this._minimumRightItems };
    }

    const containerWidth = this.node.clientWidth;
    if (containerWidth === 0) {
      return { left: this._minimumLeftItems, right: this._minimumRightItems };
    }

    const HOME_ICON_WIDTH = 22;
    const SEPARATOR_WIDTH = 4;
    const ELLIPSIS_WIDTH = 28;
    const ITEM_PADDING_MARGIN = 8;
    const AVG_TEXT_WIDTH = 80;
    const ITEM_WIDTH = ITEM_PADDING_MARGIN + AVG_TEXT_WIDTH;

    const fixedOverhead = HOME_ICON_WIDTH + SEPARATOR_WIDTH;
    const ellipsisOverhead = ELLIPSIS_WIDTH + SEPARATOR_WIDTH;

    // Available width for breadcrumb items
    const availableForItems = containerWidth - fixedOverhead;

    const widthPerItem = ITEM_WIDTH + SEPARATOR_WIDTH;
    const maxItemsWithoutEllipsis = Math.floor(
      availableForItems / widthPerItem
    );

    // If all parts can fit, show all (no ellipsis needed)
    if (maxItemsWithoutEllipsis >= totalParts) {
      return { left: totalParts, right: 0 };
    }

    // Calculate items that can fit with ellipsis
    const availableWithEllipsis = availableForItems - ellipsisOverhead;
    const maxItemsWithEllipsis = Math.max(
      0,
      Math.floor(availableWithEllipsis / widthPerItem)
    );

    // If we can't fit more than minimums, use minimums
    if (maxItemsWithEllipsis <= minTotal) {
      return { left: this._minimumLeftItems, right: this._minimumRightItems };
    }

    // Distribute items: prefer right side (most relevant for navigation)
    const extraItems = maxItemsWithEllipsis - minTotal;
    const maxExtraRight = totalParts - minTotal;
    const extraRight = Math.min(extraItems, maxExtraRight);

    return {
      left: this._minimumLeftItems,
      right: this._minimumRightItems + extraRight
    };
  }
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

    /**
     * Number of items to show on left of ellipsis
     */
    minimumLeftItems?: number;

    /**
     * Number of items to show on right of ellipsis
     */
    minimumRightItems?: number;
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
    Preferred
  }

  /**
   * Breadcrumbs state.
   */
  export interface ICrumbsState {
    [key: string]: string | boolean | number;
    path: string;
    hasPreferred: boolean;
    fullPath: boolean;
    minimumLeftItems: number;
    minimumRightItems: number;
    containerWidth: number;
  }

  /**
   * Populate the breadcrumb node.
   */
  export function updateCrumbs(
    breadcrumbs: ReadonlyArray<HTMLElement>,
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
      node.appendChild(createCrumbSeparator());
    } else {
      node.appendChild(createCrumbSeparator());
    }

    const parts = state.path.split('/').filter(part => part !== '');
    if (!state.fullPath && parts.length > 0) {
      const minimumLeftItems = state.minimumLeftItems;
      const minimumRightItems = state.minimumRightItems;

      // Check if we need ellipsis
      if (parts.length > minimumLeftItems + minimumRightItems) {
        // Add left items
        for (let i = 0; i < minimumLeftItems; i++) {
          const elemPath = parts.slice(0, i + 1).join('/');
          const elem = createBreadcrumbElement(parts[i], elemPath);
          node.appendChild(elem);
          node.appendChild(createCrumbSeparator());
        }

        // Add ellipsis
        node.appendChild(breadcrumbs[Crumb.Ellipsis]);
        const hiddenStartIndex = minimumLeftItems;
        const hiddenEndIndex = parts.length - minimumRightItems;
        const hiddenParts = parts.slice(hiddenStartIndex, hiddenEndIndex);
        const hiddenFolders = hiddenParts.join('/');
        const hiddenPath =
          hiddenParts.length > 0
            ? parts.slice(0, hiddenEndIndex).join('/')
            : parts.slice(0, minimumLeftItems).join('/');
        breadcrumbs[Crumb.Ellipsis].title = hiddenFolders;
        breadcrumbs[Crumb.Ellipsis].dataset.path = hiddenPath;
        node.appendChild(createCrumbSeparator());

        // Add right items
        const rightStartIndex = parts.length - minimumRightItems;
        for (let i = rightStartIndex; i < parts.length; i++) {
          const elemPath = parts.slice(0, i + 1).join('/');
          const elem = createBreadcrumbElement(parts[i], elemPath);
          node.appendChild(elem);
          node.appendChild(createCrumbSeparator());
        }
      } else {
        for (let i = 0; i < parts.length; i++) {
          const elemPath = parts.slice(0, i + 1).join('/');
          const elem = createBreadcrumbElement(parts[i], elemPath);
          node.appendChild(elem);
          node.appendChild(createCrumbSeparator());
        }
      }
    } else if (state.fullPath && parts.length > 0) {
      for (let i = 0; i < parts.length; i++) {
        const elemPath = parts.slice(0, i + 1).join('/');
        const elem = createBreadcrumbElement(parts[i], elemPath);
        node.appendChild(elem);
        const separator = document.createElement('span');
        separator.textContent = '/';
        node.appendChild(separator);
      }
    }
  }

  /**
   * Create a breadcrumb element for a path part.
   */
  function createBreadcrumbElement(
    pathPart: string,
    fullPath: string
  ): HTMLElement {
    const elem = document.createElement('span');
    elem.className = BREADCRUMB_ITEM_CLASS;
    elem.textContent = pathPart;
    elem.title = fullPath;
    elem.dataset.path = fullPath;
    return elem;
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
    home.dataset.path = '/';

    const ellipsis = ellipsesIcon.element({
      className: `${BREADCRUMB_ITEM_CLASS} ${BREADCRUMB_ELLIPSIS_CLASS}`,
      tag: 'span',
      stylesheet: 'breadCrumb'
    });

    const preferredPath = PageConfig.getOption('preferredPath');
    const path = preferredPath ? '/' + preferredPath : preferredPath;
    const preferred = preferredIcon.element({
      className: BREADCRUMB_PREFERRED_CLASS,
      tag: 'span',
      title: path || 'Jupyter Preferred Path',
      stylesheet: 'breadCrumb'
    });
    preferred.dataset.path = path || '/';

    return [home, ellipsis, preferred];
  }

  /**
   * Create the breadcrumb separator nodes.
   */
  export function createCrumbSeparator(): HTMLElement {
    const item = document.createElement('span');
    item.textContent = '/';
    return item;
  }
}
