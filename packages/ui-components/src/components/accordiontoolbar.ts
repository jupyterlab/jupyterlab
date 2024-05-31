// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Message, MessageLoop } from '@lumino/messaging';
import {
  AccordionLayout,
  AccordionPanel,
  Title,
  Widget
} from '@lumino/widgets';
import { caretDownIcon } from '../icon';
import { Toolbar } from './toolbar';

/**
 * Accordion panel layout that adds a toolbar in widget title if present.
 */
class AccordionToolbarLayout extends AccordionLayout {
  /**
   * Insert a widget into the layout at the specified index.
   *
   * @param index - The index at which to insert the widget.
   *
   * @param widget - The widget to insert into the layout.
   *
   * #### Notes
   * The index will be clamped to the bounds of the widgets.
   *
   * If the widget is already added to the layout, it will be moved.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insertWidget(index: number, widget: Toolbar.IWidgetToolbar): void {
    if (widget.toolbar) {
      this._toolbars.set(widget, widget.toolbar);
      widget.toolbar.addClass('jp-AccordionPanel-toolbar');
    }
    super.insertWidget(index, widget);
  }

  /**
   * Remove the widget at a given index from the layout.
   *
   * @param index - The index of the widget to remove.
   *
   * #### Notes
   * A widget is automatically removed from the layout when its `parent`
   * is set to `null`. This method should only be invoked directly when
   * removing a widget from a layout which has yet to be installed on a
   * parent widget.
   *
   * This method does *not* modify the widget's `parent`.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  removeWidgetAt(index: number): void {
    const widget = this.widgets[index];
    super.removeWidgetAt(index);
    // Remove the toolbar after the widget has `removeWidgetAt` will call `detachWidget`
    if (widget && this._toolbars.has(widget)) {
      this._toolbars.delete(widget);
    }
  }

  /**
   * Called when a title attribute has changed, to attach again the toolbar node.
   */
  updateTitle(index: number, widget: Widget): void {
    super.updateTitle(index, widget);
    this._addToolbar(index, widget);
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param index - The current index of the widget in the layout.
   *
   * @param widget - The widget to attach to the parent.
   */
  protected attachWidget(index: number, widget: Widget): void {
    super.attachWidget(index, widget);
    this._addToolbar(index, widget);
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param index - The previous index of the widget in the layout.
   *
   * @param widget - The widget to detach from the parent.
   */
  protected detachWidget(index: number, widget: Widget): void {
    const toolbar = this._toolbars.get(widget);
    if (toolbar) {
      // Send a `'before-detach'` message if the parent is attached.
      if (this.parent!.isAttached) {
        MessageLoop.sendMessage(toolbar, Widget.Msg.BeforeDetach);
      }

      // Remove the toolbar in the title node.
      this.titles[index].removeChild(toolbar.node);

      // Send an `'after-detach'` message if the parent is attached.
      if (this.parent!.isAttached) {
        MessageLoop.sendMessage(toolbar, Widget.Msg.AfterDetach);
      }
    }

    super.detachWidget(index, widget);
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onBeforeAttach(msg: Message): void {
    this.notifyToolbars(msg);
    super.onBeforeAttach(msg);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.notifyToolbars(msg);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onBeforeDetach(msg: Message): void {
    this.notifyToolbars(msg);
    super.onBeforeDetach(msg);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onAfterDetach(msg: Message): void {
    super.onAfterDetach(msg);
    this.notifyToolbars(msg);
  }

  /**
   * Add the toolbar to the title widget.
   */
  private _addToolbar(index: number, widget: Widget): void {
    const toolbar = this._toolbars.get(widget);
    if (toolbar) {
      // Send a `'before-attach'` message if the parent is attached.
      if (this.parent!.isAttached) {
        MessageLoop.sendMessage(toolbar, Widget.Msg.BeforeAttach);
      }

      // Insert the toolbar in the title node.
      this.titles[index].appendChild(toolbar.node);

      // Send an `'after-attach'` message if the parent is attached.
      if (this.parent!.isAttached) {
        MessageLoop.sendMessage(toolbar, Widget.Msg.AfterAttach);
      }
    }
  }

  private notifyToolbars(msg: Message): void {
    this.widgets.forEach(widget => {
      const toolbar = this._toolbars.get(widget);
      if (toolbar) {
        toolbar.processMessage(msg);
      }
    });
  }

  protected _toolbars = new WeakMap<Widget, Toolbar>();
}

export namespace AccordionToolbar {
  /**
   * Custom renderer for the SidePanel
   */
  export class Renderer extends AccordionPanel.Renderer {
    /**
     * Render the collapse indicator for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the collapse indicator.
     */
    createCollapseIcon(data: Title<Widget>): HTMLElement {
      const iconDiv = document.createElement('div');
      caretDownIcon.element({
        container: iconDiv
      });
      return iconDiv;
    }

    /**
     * Render the element for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the section title.
     */
    createSectionTitle(data: Title<Widget>): HTMLElement {
      const handle = super.createSectionTitle(data);
      handle.classList.add('jp-AccordionPanel-title');
      return handle;
    }
  }

  export const defaultRenderer = new Renderer();

  /**
   * Create an accordion layout for accordion panel with toolbar in the title.
   *
   * @param options Panel options
   * @returns Panel layout
   *
   * #### Note
   *
   * Default titleSpace is 32 px (default var(--jp-private-toolbar-height) - but not styled)
   */
  export function createLayout(
    options: AccordionPanel.IOptions
  ): AccordionLayout {
    return (
      options.layout ||
      new AccordionToolbarLayout({
        renderer: options.renderer || defaultRenderer,
        orientation: options.orientation,
        alignment: options.alignment,
        spacing: options.spacing,
        titleSpace: options.titleSpace ?? 32
      })
    );
  }
}
