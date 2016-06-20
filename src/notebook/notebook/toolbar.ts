// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

/**
 * The class name added to notebook toolbars.
 */
const NB_TOOLBAR = 'jp-NBToolbar';

/**
 * The class name added to notebook toolbar items.
 */
const TOOLBAR_ITEM = 'jp-NBToolbar-item';

/**
 * The class name added to notebook toolbar buttons.
 */
const TOOLBAR_BUTTON = 'jp-NBToolbar-button';

/**
 * The class name added to a pressed button.
 */
const TOOLBAR_PRESSED = 'jp-mod-pressed';


/**
 * A class which provides a notebook toolbar widget.
 */
export
class NotebookToolbar extends Widget {
  /**
   * Construct a new toolbar widget.
   */
  constructor() {
    super();
    this.addClass(NB_TOOLBAR);
    this.layout = new PanelLayout();
  }

  /**
   * Add an item to the toolbar.
   *
   * @param name - The name of the widget to add to the toolbar.
   *
   * @param widget - The widget to add to the toolbar.
   *
   * @param after - The optional name of the item to insert after.
   *
   * #### Notes
   * An error is thrown if a widget of the same name is already given.
   * If `after` is not given, or the named widget is not in the toolbar,
   * the widget will be added to the end of the toolbar.
   */
  add(name: string, widget: Widget, after?: string): void {
    let names = this.list();
    if (names.indexOf(name) !== -1) {
      throw new Error(`A button named "${name}" was already added`);
    }
    widget.addClass(TOOLBAR_ITEM);
    let layout = this.layout as PanelLayout;
    let index = names.indexOf(after);
    if (index === -1) {
      layout.addChild(widget);
    } else {
      layout.insertChild(index + 1, widget);
    }
    Private.nameProperty.set(widget, name);
  }

  /**
   * Get an ordered list the toolbar item names.
   *
   * @returns A new array of the current toolbar item names.
   */
  list(): string[] {
    let names: string[] = [];
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.childCount(); i++) {
      let widget = layout.childAt(i);
      names.push(Private.nameProperty.get(widget));
    }
    return names;
  }
}


/**
 * A widget which acts as a button in a toolbar.
 */
export
class ToolbarButton extends Widget {
  /**
   * Create the node for the toolbar button.
   */
  static createNode(): HTMLElement {
    return document.createElement('span');
  }

  /**
   * Construct a new toolbar button.
   */
  constructor(options: ToolbarButton.IOptions = {}) {
    super();
    options = options || {};
    this.addClass(TOOLBAR_BUTTON);
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
      let cb = this._onClick;
      if (cb) {
        cb();
      }
      break;
    case 'mousedown':
      this.addClass(TOOLBAR_PRESSED);
      break;
    case 'mouseup':
    case 'mouseout':
      this.removeClass(TOOLBAR_PRESSED);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
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
  const nameProperty = new Property<Widget, string>({
    name: 'name',
  });
}
