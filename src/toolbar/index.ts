// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterator, map
} from '@phosphor/algorithm';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  Message
} from '@phosphor/messaging';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';


/**
 * The class name added to toolbars.
 */
const TOOLBAR_CLASS = 'jp-Toolbar';

/**
 * The class name added to toolbar items.
 */
const TOOLBAR_ITEM_CLASS = 'jp-Toolbar-item';

/**
 * The class name added to toolbar buttons.
 */
const TOOLBAR_BUTTON_CLASS = 'jp-Toolbar-button';

/**
 * The class name added to a pressed button.
 */
const TOOLBAR_PRESSED_CLASS = 'jp-mod-pressed';


/**
 * A class which provides a toolbar widget.
 */
export
class Toolbar<T extends Widget> extends Widget {
  /**
   * Construct a new toolbar widget.
   */
  constructor() {
    super();
    this.addClass(TOOLBAR_CLASS);
    this.layout = new PanelLayout();
  }

  /**
   * Get an iterator over the ordered toolbar item names.
   *
   * @returns An iterator over the toolbar item names.
   */
  names(): IIterator<string> {
    let layout = this.layout as PanelLayout;
    return map(layout.widgets, widget => {
      return Private.nameProperty.get(widget);
    });
  }

  /**
   * Add an item to the end of the toolbar.
   *
   * @param name - The name of the widget to add to the toolbar.
   *
   * @param widget - The widget to add to the toolbar.
   *
   * @param index - The optional name of the item to insert after.
   *
   * @returns Whether the item was added to toolbar.  Returns false if
   *   an item of the same name is already in the toolbar.
   */
  addItem(name: string, widget: T): boolean {
    let layout = this.layout as PanelLayout;
    return this.insertItem(layout.widgets.length, name, widget);
  }

  /**
   * Insert an item into the toolbar at the specified index.
   *
   * @param index - The index at which to insert the item.
   *
   * @param name - The name of the item.
   *
   * @param widget - The widget to add.
   *
   * @returns Whether the item was added to the toolbar. Returns false if
   *   an item of the same name is already in the toolbar.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   */
  insertItem(index: number, name: string, widget: T): boolean {
    let existing = find(this.names(), value => value === name);
    if (existing) {
      return false;
    }
    widget.addClass(TOOLBAR_ITEM_CLASS);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
    Private.nameProperty.set(widget, name);
    return true;
  }

  /**
   * Remove an item in the toolbar by value.
   *
   *  @param name - The name of the widget to remove from the toolbar.
   */
  removeItem(widget: T): void {
    let layout = this.layout as PanelLayout;
    layout.removeWidget(widget);
  }
}


/**
 * A widget which acts as a button in a toolbar.
 */
export
class ToolbarButton extends Widget {
  /**
   * Construct a new toolbar button.
   */
  constructor(options: ToolbarButton.IOptions = {}) {
    super({ node: document.createElement('span') });
    options = options || {};
    this.addClass(TOOLBAR_BUTTON_CLASS);
    this._onClick = options.onClick;
    if (options.className) {
      this.addClass(options.className);
    }
    this.node.title = options.tooltip || '';
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._onClick = null;
    super.dispose();
  }

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
    case 'click':
      if (this._onClick) {
        this._onClick();
      }
      break;
    case 'mousedown':
      this.addClass(TOOLBAR_PRESSED_CLASS);
      break;
    case 'mouseup':
    case 'mouseout':
      this.removeClass(TOOLBAR_PRESSED_CLASS);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('mouseout', this);
  }

  private _onClick: () => void;
}


/**
 * A namespace for `ToolbarButton` statics.
 */
export
namespace ToolbarButton {
  /**
   * The options used to construct a toolbar button.
   */
  export
  interface IOptions {
    /**
     * The callback for a click event.
     */
    onClick?: () => void;

    /**
     * The class name added to the button.
     */
    className?: string;

    /**
     * The tooltip added to the button node.
     */
    tooltip?: string;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for the name of a toolbar item.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name',
    create: () => ''
  });
}
