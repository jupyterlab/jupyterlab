// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Panel, PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ISignal, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  Drag, IDragEvent, DropAction, SupportedActions
} from 'phosphor/lib/dom/dragdrop';

/**
 * The class name added to the DragPanel
 */
const PANEL_CLASS = 'jp-DragPanel';

/**
 * The class name added to something which can be used to drag a box
 */
const DRAG_HANDLE = 'jp-mod-dragHandle';

/**
 * The class name of the default drag handle
 */
const DEFAULT_DRAG_HANDLE_CLASS = 'jp-DragPanel-dragHandle';


/**
 * The class name added to a drop target.
 */
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * MIME type representing drag data by index
 */
const MIME_INDEX = 'application/vnd.jupyter.dragindex';

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;



/**
 * A panel which allows the user to rearrange elements by drag and drop.
 *
 * Any descendant element with the drag handle class `'jp-mod-dragHandle'`
 * will serve as a handle that can be used for dragging. If DragPanels are
 * nested, handles will only belong to the closest parent DragPanel. For
 * convenience, the functions `makeHandle`, `unmakeHandle` and
 * `createDefaultHandle` can be used to indicate which elements should be
 * made handles. `createDefaultHandle` will create a new element as a handle
 * with a default styling class applied. Optionally, `childrenAreDragHandles`
 * can be set to indicate that all direct children are themselve drag handles.
 *
 * The functionallity of the class can be extended by overriding the following
 * functions:
 *  - move(): Override to add custom processing of move command, for example
 *    by performing the move in a model instead of on widgets. A possible
 *    alternative to overriding `move` is to connect to the `moved` signal.
 *  - addMimeData: Override to add other drag data to the mime bundle.
 *    This is often a necessary step for allowing dragging to external
 *    drop targets.
 *  - processDrop: Override if you need to handle other mime data than the
 *    default. For allowing drops from external sources, the field
 *    `acceptDropsFromExternalSource` should be set as well.
 *  - getDragImage: Override to change the drag image (the default is a
 *    copy of the element being dragged).
 *
 * To drag and drop other things than all direct children, the following functions
 * should be overriden: `findDragTarget`, `findDropTarget` and possibly
 * `getIndexOfChildNode` and `move` to allow for custom to/from keys.
 *
 * For maximum control, `_startDrag` and `_evtDrop` can be overriden.
 */
export
class DragPanel extends Panel {

  /**
   * Construct a drag panel.
   */
  constructor(options: DragPanel.IOptions={}) {
    super(options);
    this.childrenAreDragHandles = options.childrenAreDragHandles === true;
    this.acceptDropsFromExternalSource = options.acceptDropsFromExternalSource === true;
    this.addClass(PANEL_CLASS);
  }

  /**
   * Signal that is emitted after a widget has been moved internally in the list.
   *
   * The first argument is the panel in which the move occurred.
   * The second argument is the old and the new keys of the widget.
   *
   * In the default implementation the keys are indices to the widget positions
   */
  moved: ISignal<DragPanel, {from: any, to: any}>;


  /**
   * Whether all direct children of the list are handles, or only those widgets
   * designated as handles. Defaults to false.
   */
  childrenAreDragHandles: boolean;

  /**
   * Whether the list should accept drops from an external source.
   * Defaults to false.
   *
   * This option only makes sense to set for subclasses that accept drops from
   * external sources.
   */
  acceptDropsFromExternalSource: boolean;


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
      this.evtDrop(event as IDragEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Called when a widget should be moved as a consequence of an internal drag event.
   *
   * The default implementation assumes the keys `from` and `to` are numbers
   * indexing the drag panels direct children. It then moves the direct child as
   * specified by these keys, then emits the `moved` signal.
   */
  protected move(from: any, to: any): void {
    if (to !== from) {
      // Adjust for the shifting of elements once 'from' is removed
      if (to > from) {
        to -= 1;
      }
      this.insertWidget(to, this.widgets.at(from));
      this.moved.emit({from: from, to: to});
    }
  }

  /**
   * Adds mime data represeting the drag data to the drag event's MimeData bundle.
   *
   * The default implementation adds mime data indicating the index of the direct
   * child being dragged (as indicated by findDragTarget).
   *
   * Override this method if you have data that cannot be communicated well by an
   * index, for example if the data should be able to be dropped on an external
   * target that only understands direct mime data.
   *
   * As the method simply adds mime data for a specific key, overriders can call
   * this method before/after adding their own mime data to still support default
   * dragging behavior.
   */
  protected addMimeData(handle: HTMLElement, mimeData: MimeData): void {
    let target = this.findDragTarget(handle);
    let key = this.getIndexOfChildNode(this, target);

    if (key !== null) {
      mimeData.setData(MIME_INDEX, key);
    }
  }

  /**
   * Processes a drop event.
   *
   * This function is called after checking:
   *  - That the `dropTarget` is a valid drop target
   *  - The value of `event.source` if `acceptDropsFromExternalSource` is true
   *
   * The default implementation assumes calling `getIndexOfChildNode` with
   * `dropTarget` will be valid. It will call `move` with that index as `to`,
   * and the index stored in the mime data as `from`.
   *
   * Override this if you need to handle other mime data than the default.
   */
  protected processDrop(dropTarget: HTMLElement, event: IDragEvent): void {
    if (!DragPanel.isValidAction(event.supportedActions, 'move') ||
        event.proposedAction === 'none') {
      // The default implementation only handles move action
      // OR Accept proposed none action, and perform no-op
      event.dropAction = 'none';
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.source !== this) {
      // Source indicates external drop, incorrect use in subclass
    }
    let sourceKey = event.mimeData.getData(MIME_INDEX);
    let targetKey = this.getIndexOfChildNode(this, dropTarget);
    if (targetKey === null) {
      // Invalid target somehow
      return;
    }

    // We have an acceptable drop, handle:
    this.move(sourceKey, targetKey);
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'link';
  }

  /**
   * Finds the drag target (the widget to move) from a drag handle.
   *
   * Returns null if no valid drag target was found.
   *
   * The default implementation returns the direct child that is the ancestor of
   * (or equal to) the handle.
   */
  protected findDragTarget(handle: HTMLElement): HTMLElement {
    return this.findChild(this.node, handle);
  }

  /**
   * Find a drop target from a given drag event target.
   *
   * Returns null if no valid drop target was found.
   *
   * The default implementation returns the direct child that is the parent of
   * `node`, or `node` if it is itself a direct child. It also checks that the
   * needed mime type is included
   */
  protected findDropTarget(input: HTMLElement, mimeData: MimeData): HTMLElement {
    if (!mimeData.hasData(MIME_INDEX)) {
      return null;
    }
    return this.findChild(this.node, input);
  }

  /**
   * Returns the drag image to use when dragging using the given handle.
   *
   * The default implementation returns a deepcopy of the drag target.
   */
  protected getDragImage(handle: HTMLElement): HTMLElement {
    return this.findDragTarget(handle).cloneNode(true) as HTMLElement;
  }

  /**
   * Determine whether node is equal to or a decendant of our panel, and that is does
   * not belong to a nested drag panel.
   */
  protected belongsToUs(node: HTMLElement): boolean {
    // Traverse DOM until drag panel encountered:
    while (node && !node.classList.contains(PANEL_CLASS)) {
      node = node.parentElement;
    }
    return node && node === this.node;
  }

  /**
   * Returns the index of node in `layout.widgets`.
   *
   * Returns null if not found.
   */
  protected getIndexOfChildNode(parent: Widget, node: HTMLElement): any {
    let layout = parent.layout as PanelLayout;
    for (let i = 0; i < layout.widgets.length; i++) {
      if (layout.widgets.at(i).node === node) {
        return i;
      }
    }
    return null;
  }


  /**
   * Find the direct child node of `parent`, which has `node` as a descendant.
   *
   * Returns null if not found.
   */
  protected findChild(parent: HTMLElement, node: HTMLElement): HTMLElement {
    // Work our way up the DOM to an element which has this node as parent
    let child: HTMLElement = null;
    while (node && node !== parent) {
      if (node.parentElement === parent) {
        child = node;
        break;
      }
      node = node.parentElement;
    }
    return child;
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let node = this.node;
    node.addEventListener('click', this);
    node.addEventListener('dblclick', this);
    node.addEventListener('mousedown', this);
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
   }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('click', this);
    node.removeEventListener('dblclick', this);
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
  }

  /**
   * Start a drag event.
   *
   * Called when dragginging and DRAG_THRESHOLD is met.
   *
   * Should normally only be overriden if you cannot achive your goal by
   * other overrides.
   */
  protected startDrag(handle: HTMLElement, clientX: number, clientY: number): void {
    // Create the drag image.
    let dragImage = this.getDragImage(handle);

    // Set up the drag event.
    this.drag = new Drag({
      dragImage: dragImage,
      mimeData: new MimeData(),
      supportedActions: 'all',
      proposedAction: 'link',
      source: this
    });
    this.addMimeData(handle, this.drag.mimeData);

    // Start the drag and remove the mousemove listener.
    this.drag.start(clientX, clientY).then(action => {
      this.drag = null;
    });
    document.removeEventListener('mousemove', this, true);
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   *
   * Responsible for pre-processing event before calling `processDrop`.
   *
   * Should normally only be overriden if you cannot achive your goal by
   * other overrides.
   */
  protected evtDrop(event: IDragEvent): void {
    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(DROP_TARGET_CLASS)) {
        target.classList.remove(DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }
    if (!target || !this.belongsToUs(target)) {
      // Ignore event
      return;
    }

    // If configured to, only accept internal moves:
    if (!this.acceptDropsFromExternalSource && event.source !== this) {
      event.dropAction = 'none';
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.processDrop(target, event);
  }

  /**
   * Drag data stored in _startDrag
   */
  protected drag: Drag = null;

  /**
   * Check if node, or any of nodes ancestors are a drag handle
   *
   * If it is a drag handle, it returns the handle, if not returns null.
   */
  private _findDragHandle(node: HTMLElement): HTMLElement {
    let handle: HTMLElement = null;
    if (this.childrenAreDragHandles) {
      // Simple scenario, just look for node among children
      handle = node;
    } else {
      // Otherwise, traverse up DOM to check if click is on a drag handle
      while (node && node !== this.node) {
        if (node.classList.contains(DRAG_HANDLE)) {
          handle = node;
          break;
        }
        node = node.parentElement;
      }
      // Finally, check that handle does not belong to a nested drag panel
      if (handle !== null && !this.belongsToUs(handle)) {
        // Handle belongs to a nested drag panel:
        handle = null;
      }
    }
    return handle;
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   */
  private _evtMousedown(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    let handle = this._findDragHandle(target);
    if (handle === null) {
      return;
    }

    // Left mouse press for drag start.
    if (event.button === 0) {
      this._clickData = { pressX: event.clientX, pressY: event.clientY,
                         handle: handle };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }
  }


  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    if (event.button !== 0 || !this.drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      this.drag = null;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    // Bail if we are already dragging.
    if (this.drag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Check for a drag initialization.
    let data = this._clickData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this.startDrag(data.handle, event.clientX, event.clientY);
    this._clickData = null;
  }

  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (!this.acceptDropsFromExternalSource && event.source !== this) {
      return;
    }
    let target = this.findDropTarget(event.target as HTMLElement, event.mimeData);
    if (target === null) {
      return;
    }
    this._clearDropTarget();
    target.classList.add(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'p-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Clear drop target:
    let elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    if (!this.acceptDropsFromExternalSource && event.source !== this) {
      return;
    }
    let target = this.findDropTarget(event.target as HTMLElement, event.mimeData);
    if (target === null) {
      return;
    }
    this._clearDropTarget();
    target.classList.add(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
  }

  /**
   * Clear existing drop target from out children.
   *
   * #### Notes
   * This function assumes there are only one active drop target
   */
  private _clearDropTarget(): void {
    // Clear drop target:
    let elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
  }

  /**
   * Data stored on mouse down to determine if drag treshold has
   * been overcome, and to initialize drag once it has.
   */
  private _clickData: { pressX: number, pressY: number, handle: HTMLElement } = null;
}

defineSignal(DragPanel.prototype, 'moved');


/**
 * The namespace for the `DragPanel` class statics.
 */
export
namespace DragPanel {
  /**
   * An options object for initializing a drag panel widget.
   */
  export
  interface IOptions extends Panel.IOptions {
    /**
     * Whether all direct children of the list are handles, or only those widgets
     * designated as handles. Defaults to false.
     */
    childrenAreDragHandles?: boolean;

    /**
     * Whether the lsit should accept drops from an external source.
     * Defaults to false.
     *
     * This option only makes sense to set for subclasses that accept drops from
     * external sources.
     */
    acceptDropsFromExternalSource?: boolean;
  }

  export
  function isValidAction(supported: SupportedActions, action: DropAction): boolean {
    switch (supported) {
    case 'all':
      return true;
    case 'link-move':
      return action === 'move' || action === 'link';
    case 'copy-move':
      return action === 'move' || action === 'copy';
    case 'copy-link':
      return action === 'link' || action === 'copy';
    default:
      return action === supported;
    }
  }

  /**
   * Mark a widget as a drag handle.
   *
   * Using this, any child-widget can be a drag handle, as long as mouse events
   * are propagated from it to the DragPanel.
   */
  export
  function makeHandle(handle: Widget) {
    handle.addClass(DRAG_HANDLE);
  }

  /**
   * Unmark a widget as a drag handle
   */
  export
  function unmakeHandle(handle: Widget) {
    handle.removeClass(DRAG_HANDLE);
  }

  /**
   * Create a default handle widget for dragging (see styling in dragpanel.css).
   *
   * The handle will need to be styled to ensure a minimum size
   */
  export
  function createDefaultHandle(): Widget {
    let widget = new Widget();
    widget.addClass(DEFAULT_DRAG_HANDLE_CLASS);
    makeHandle(widget);
    return widget;
  }
}
