// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Button } from '@jupyter/react-components';
import {
  addJupyterLabThemeChangeListener,
  jpButton,
  jpToolbar,
  provideJupyterDesignSystem
} from '@jupyter/web-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { find, map, some } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { AttachedProperty } from '@lumino/properties';
import { Layout, PanelLayout, Widget } from '@lumino/widgets';
import { Throttler } from '@lumino/polling';
import * as React from 'react';
import { ellipsesIcon, LabIcon } from '../icon';
import { classes } from '../utils';
import { ReactWidget, UseSignal } from './vdom';

provideJupyterDesignSystem().register([jpButton(), jpToolbar()]);
addJupyterLabThemeChangeListener();

/**
 * The class name added to toolbars.
 */
const TOOLBAR_CLASS = 'jp-Toolbar';

/**
 * The class name added to toolbar items.
 */
const TOOLBAR_ITEM_CLASS = 'jp-Toolbar-item';

/**
 * Toolbar pop-up opener button name
 */
const TOOLBAR_OPENER_NAME = 'toolbar-popup-opener';

/**
 * The class name added to toolbar spacer.
 */
const TOOLBAR_SPACER_CLASS = 'jp-Toolbar-spacer';

/**
 * A layout for toolbars.
 *
 * #### Notes
 * This layout automatically collapses its height if there are no visible
 * toolbar widgets, and expands to the standard toolbar height if there are
 * visible toolbar widgets.
 */
class ToolbarLayout extends PanelLayout {
  /**
   * A message handler invoked on a `'fit-request'` message.
   *
   * If any child widget is visible, expand the toolbar height to the normal
   * toolbar height.
   */
  protected onFitRequest(msg: Message): void {
    super.onFitRequest(msg);
    if (this.parent!.isAttached) {
      // If there are any widgets not explicitly hidden, expand the toolbar to
      // accommodate them.
      if (some(this.widgets, w => !w.isHidden)) {
        this.parent!.node.style.minHeight = 'var(--jp-private-toolbar-height)';
        this.parent!.removeClass('jp-Toolbar-micro');
      } else {
        this.parent!.node.style.minHeight = '';
        this.parent!.addClass('jp-Toolbar-micro');
      }
    }

    // Set the dirty flag to ensure only a single update occurs.
    this._dirty = true;

    // Notify the ancestor that it should fit immediately. This may
    // cause a resize of the parent, fulfilling the required update.
    if (this.parent!.parent) {
      MessageLoop.sendMessage(this.parent!.parent!, Widget.Msg.FitRequest);
    }

    // If the dirty flag is still set, the parent was not resized.
    // Trigger the required update on the parent widget immediately.
    if (this._dirty) {
      MessageLoop.sendMessage(this.parent!, Widget.Msg.UpdateRequest);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    if (this.parent!.isVisible) {
      this._dirty = false;
    }
  }

  /**
   * A message handler invoked on a `'child-shown'` message.
   */
  protected onChildShown(msg: Widget.ChildMessage): void {
    super.onChildShown(msg);

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: Widget.ChildMessage): void {
    super.onChildHidden(msg);

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    super.onBeforeAttach(msg);

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param index - The current index of the widget in the layout.
   *
   * @param widget - The widget to attach to the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected attachWidget(index: number, widget: Widget): void {
    super.attachWidget(index, widget);

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param index - The previous index of the widget in the layout.
   *
   * @param widget - The widget to detach from the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected detachWidget(index: number, widget: Widget): void {
    super.detachWidget(index, widget);

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  private _dirty = false;
}

/**
 * A class which provides a toolbar widget.
 */
export class Toolbar<T extends Widget = Widget> extends Widget {
  /**
   * Construct a new toolbar widget.
   */
  constructor(options: Toolbar.IOptions = {}) {
    super({ node: document.createElement('jp-toolbar') });
    this.addClass(TOOLBAR_CLASS);
    this.layout = options.layout ?? new ToolbarLayout();
    this.noFocusOnClick = options.noFocusOnClick ?? false;
  }

  /**
   * Get an iterator over the ordered toolbar item names.
   *
   * @returns An iterator over the toolbar item names.
   */
  names(): IterableIterator<string> {
    const layout = this.layout as ToolbarLayout;
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
   * @returns Whether the item was added to toolbar. Returns false if
   *   an item of the same name is already in the toolbar.
   *
   * #### Notes
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  addItem(name: string, widget: T): boolean {
    const layout = this.layout as ToolbarLayout;
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
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  insertItem(index: number, name: string, widget: T): boolean {
    const existing = find(this.names(), value => value === name);
    if (existing) {
      return false;
    }
    widget.addClass(TOOLBAR_ITEM_CLASS);
    const layout = this.layout as ToolbarLayout;

    const j = Math.max(0, Math.min(index, layout.widgets.length));
    layout.insertWidget(j, widget);

    Private.nameProperty.set(widget, name);
    widget.node.dataset['jpItemName'] = name;
    if (this.noFocusOnClick) {
      widget.node.dataset['noFocusOnClick'] = 'true';
    }
    return true;
  }

  /**
   * Insert an item into the toolbar at the after a target item.
   *
   * @param at - The target item to insert after.
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
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  insertAfter(at: string, name: string, widget: T): boolean {
    return this.insertRelative(at, 1, name, widget);
  }

  /**
   * Insert an item into the toolbar at the before a target item.
   *
   * @param at - The target item to insert before.
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
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  insertBefore(at: string, name: string, widget: T): boolean {
    return this.insertRelative(at, 0, name, widget);
  }

  /**
   * Insert an item relatively to an other item.
   */
  protected insertRelative(
    at: string,
    offset: number,
    name: string,
    widget: T
  ): boolean {
    const nameWithIndex = map(this.names(), (name, i) => {
      return { name: name, index: i };
    });
    const target = find(nameWithIndex, x => x.name === at);
    if (target) {
      return this.insertItem(target.index + offset, name, widget);
    }
    return false;
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
        this.handleClick(event);
        break;
      default:
        break;
    }
  }

  /**
   * Handle a DOM click event.
   */
  protected handleClick(event: Event): void {
    // Stop propagating the click outside the toolbar
    event.stopPropagation();

    // Clicking a label focuses the corresponding control
    // that is linked with `for` attribute, so let it be.
    if (event.target instanceof HTMLLabelElement) {
      const forId = event.target.getAttribute('for');
      if (forId && this.node.querySelector(`#${forId}`)) {
        return;
      }
    }

    // If this click already focused a control, let it be.
    if (this.node.contains(document.activeElement)) {
      return;
    }

    // Otherwise, activate the parent widget, which may take focus if desired.
    if (this.parent) {
      this.parent.activate();
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }

  noFocusOnClick: boolean;
}

/**
 * A class which provides a toolbar widget.
 */
export class ReactiveToolbar extends Toolbar<Widget> {
  /**
   * Construct a new toolbar widget.
   */
  constructor(options: Toolbar.IOptions = {}) {
    super(options);
    this.insertItem(0, TOOLBAR_OPENER_NAME, this.popupOpener);
    this.popupOpener.hide();
    this._resizer = new Throttler(async (callTwice = false) => {
      await this._onResize(callTwice);
    }, 500);
  }

  /**
   * Dispose of the widget and its descendant widgets.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._resizer) {
      this._resizer.dispose();
    }

    super.dispose();
  }

  /**
   * Insert an item into the toolbar at the after a target item.
   *
   * @param at - The target item to insert after.
   *
   * @param name - The name of the item.
   *
   * @param widget - The widget to add.
   *
   * @returns Whether the item was added to the toolbar. Returns false if
   *   an item of the same name is already in the toolbar or if the target
   *   is the toolbar pop-up opener.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  insertAfter(at: string, name: string, widget: Widget): boolean {
    if (at === TOOLBAR_OPENER_NAME) {
      return false;
    }
    return super.insertAfter(at, name, widget);
  }

  /**
   * Insert an item relatively to an other item.
   */
  protected insertRelative(
    at: string,
    offset: number,
    name: string,
    widget: Widget
  ): boolean {
    const targetPosition = this._widgetPositions.get(at);
    const position = (targetPosition ?? 0) + offset;
    return this.insertItem(position, name, widget);
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
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  insertItem(index: number, name: string, widget: Widget): boolean {
    let status: boolean;
    if (widget instanceof ToolbarPopupOpener) {
      status = super.insertItem(index, name, widget);
    } else {
      // Insert the widget in the toolbar at expected index if possible, otherwise
      // before the popup opener. This position may change when invoking the resizer
      // at the end of this function.
      const j = Math.max(
        0,
        Math.min(index, (this.layout as ToolbarLayout).widgets.length - 1)
      );
      status = super.insertItem(j, name, widget);

      if (j !== index) {
        // This happens if the widget has been inserted at a wrong position:
        // - not enough widgets in the toolbar to insert it at the expected index
        // - the widget at the expected index should be in the popup
        // In the first situation, the stored index should be changed to match a
        // realistic index.
        index = Math.max(0, Math.min(index, this._widgetPositions.size));
      }
    }

    // Save the widgets position when a widget is inserted or moved.
    if (
      name !== TOOLBAR_OPENER_NAME &&
      this._widgetPositions.get(name) !== index
    ) {
      // If the widget is inserted, set its current position as last.
      const currentPosition =
        this._widgetPositions.get(name) ?? this._widgetPositions.size;

      // Change the position of moved widgets.
      this._widgetPositions.forEach((value, key) => {
        if (key !== TOOLBAR_OPENER_NAME) {
          if (value >= index && value < currentPosition) {
            this._widgetPositions.set(key, value + 1);
          } else if (value <= index && value > currentPosition) {
            this._widgetPositions.set(key, value - 1);
          }
        }
      });

      // Save the new position of the widget.
      this._widgetPositions.set(name, index);

      // Invokes resizing to ensure correct display of items after an addition, only
      // if the toolbar is rendered.
      if (this.isVisible) {
        void this._resizer.invoke();
      }
    }
    return status;
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   *
   * Invokes resizing to ensure correct display of items.
   */
  onAfterShow(msg: Message): void {
    void this._resizer.invoke(true);
  }

  /**
   * A message handler invoked on a `'before-hide'` message.
   *
   * It will hide the pop-up panel
   */
  onBeforeHide(msg: Message): void {
    this.popupOpener.hidePopup();
    super.onBeforeHide(msg);
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);

    // Check if the resize event is due to a zoom change.
    const zoom = Math.round((window.outerWidth / window.innerWidth) * 100);
    if (zoom !== this._zoom) {
      this._zoomChanged = true;
      this._zoom = zoom;
    }
    if (msg.width > 0 && this._resizer) {
      void this._resizer.invoke();
    }
  }

  /**
   * Move the toolbar items between the reactive toolbar and the popup toolbar,
   * depending on the width of the toolbar and the width of each item.
   *
   * @param callTwice - whether to call the function twice.
   *
   * **NOTES**
   * The `callTwice` parameter is useful when the toolbar is displayed the first time,
   * because the size of the items is unknown before their first rendering. The first
   * call will usually add all the items in the main toolbar, and the second call will
   * reorganize the items between the main toolbar and the popup toolbar.
   */
  private async _onResize(callTwice = false) {
    if (!(this.parent && this.parent.isAttached)) {
      return;
    }
    const toolbarWidth = this.node.clientWidth;
    const opener = this.popupOpener;
    const openerWidth = 32;
    // left and right padding.
    const toolbarPadding = 2 + 5;
    let width = opener.isHidden ? toolbarPadding : toolbarPadding + openerWidth;

    return this._getWidgetsToRemove(width, toolbarWidth, openerWidth)
      .then(async values => {
        let { width, widgetsToRemove } = values;
        while (widgetsToRemove.length > 0) {
          // Insert the widget at the right position in the opener popup, relatively
          // to the saved position of the first item of the popup toolbar.

          // Get the saved position of the widget to insert.
          const widget = widgetsToRemove.pop() as Widget;
          const name = Private.nameProperty.get(widget);
          width -= this._widgetWidths.get(name) || 0;
          const position = this._widgetPositions.get(name) ?? 0;

          // Get the saved position of the first item in the popup toolbar.
          // If there is no widget, set the value at last item.
          let openerFirstIndex = this._widgetPositions.size;
          const openerFirst = opener.widgetAt(0);
          if (openerFirst) {
            const openerFirstName = Private.nameProperty.get(openerFirst);
            openerFirstIndex =
              this._widgetPositions.get(openerFirstName) ?? openerFirstIndex;
          }

          // Insert the widget in the popup toolbar.
          const index = position - openerFirstIndex;
          opener.insertWidget(index, widget);
        }
        if (opener.widgetCount() > 0) {
          const widgetsToAdd = [];
          let index = 0;
          const widgetCount = opener.widgetCount();

          while (index < widgetCount) {
            let widget = opener.widgetAt(index);
            if (widget) {
              width += this._getWidgetWidth(widget);
              if (widgetCount - widgetsToAdd.length === 1) {
                width -= openerWidth;
              }
            } else {
              break;
            }
            if (width < toolbarWidth) {
              widgetsToAdd.push(widget);
            } else {
              break;
            }
            index++;
          }
          while (widgetsToAdd.length > 0) {
            // Insert the widget in the right position in the toolbar.
            const widget = widgetsToAdd.shift()!;
            const name = Private.nameProperty.get(widget);
            if (this._widgetPositions.has(name)) {
              this.insertItem(this._widgetPositions.get(name)!, name, widget);
            } else {
              this.addItem(name, widget);
            }
          }
        }
        if (opener.widgetCount() > 0) {
          opener.updatePopup();
          opener.show();
        } else {
          opener.hide();
        }
        if (callTwice) {
          await this._onResize();
        }
      })
      .catch(msg => {
        console.error('Error while computing the ReactiveToolbar', msg);
      });
  }

  private async _getWidgetsToRemove(
    width: number,
    toolbarWidth: number,
    openerWidth: number
  ) {
    const opener = this.popupOpener;
    const widgets = [...(this.layout as ToolbarLayout).widgets];
    const toIndex = widgets.length - 1;

    const widgetsToRemove = [];

    let index = 0;
    while (index < toIndex) {
      const widget = widgets[index];
      const name = Private.nameProperty.get(widget);
      // Compute the widget size only if
      // - the zoom has changed.
      // - the widget size has not been computed yet.
      let widgetWidth: number;
      if (this._zoomChanged) {
        widgetWidth = await this._saveWidgetWidth(name, widget);
      } else {
        // The widget widths can be 0px if it has been added to the toolbar but
        // not rendered, this is why we must use '||' instead of '??'.
        widgetWidth =
          this._getWidgetWidth(widget) ||
          (await this._saveWidgetWidth(name, widget));
      }
      width += widgetWidth;
      if (
        widgetsToRemove.length === 0 &&
        opener.isHidden &&
        width + openerWidth > toolbarWidth
      ) {
        width += openerWidth;
      }
      // Remove the widget if it is out of the toolbar or incorrectly positioned.
      // Incorrect positioning can occur when the widget is added after the toolbar
      // has been rendered and should be in the popup. E.g. debugger icon with a
      // narrow notebook toolbar.
      if (
        width > toolbarWidth ||
        (this._widgetPositions.get(name) ?? 0) > index
      ) {
        widgetsToRemove.push(widget);
      }
      index++;
    }
    this._zoomChanged = false;
    return {
      width: width,
      widgetsToRemove: widgetsToRemove
    };
  }

  private async _saveWidgetWidth(
    name: string,
    widget: Widget
  ): Promise<number> {
    if (widget instanceof ReactWidget) {
      await widget.renderPromise;
    }
    const widgetWidth = widget.hasClass(TOOLBAR_SPACER_CLASS)
      ? 2
      : widget.node.clientWidth;
    this._widgetWidths.set(name, widgetWidth);
    return widgetWidth;
  }

  private _getWidgetWidth(widget: Widget): number {
    const widgetName = Private.nameProperty.get(widget);
    return this._widgetWidths.get(widgetName) || 0;
  }

  protected readonly popupOpener: ToolbarPopupOpener = new ToolbarPopupOpener();
  private readonly _resizer: Throttler;
  private readonly _widgetWidths = new Map<string, number>();
  private _widgetPositions = new Map<string, number>();
  // The zoom property is not the real browser zoom, but a value proportional to
  // the zoom, which is modified when the zoom changes.
  private _zoom: number;
  private _zoomChanged = true;
}

/**
 * The namespace for Toolbar class statics.
 */
export namespace Toolbar {
  /**
   * The options used to create a toolbar.
   */
  export interface IOptions {
    /**
     * Toolbar widget layout.
     */
    layout?: Layout;
    /**
     * Do not give the focus to the button on click.
     */
    noFocusOnClick?: boolean;
  }

  /**
   * Widget with associated toolbar
   */
  export interface IWidgetToolbar extends Widget {
    /**
     * Toolbar of actions on the widget
     */
    toolbar?: Toolbar;
  }

  /**
   * Create a toolbar spacer item.
   *
   * #### Notes
   * It is a flex spacer that separates the left toolbar items
   * from the right toolbar items.
   */
  export function createSpacerItem(): Widget {
    return new Private.Spacer();
  }
}

/**
 * Namespace for ToolbarButtonComponent.
 */
export namespace ToolbarButtonComponent {
  /**
   * Interface for ToolbarButtonComponent props.
   */
  export interface IProps {
    className?: string;
    /**
     * Data set of the button
     */
    dataset?: DOMStringMap;
    label?: string;
    icon?: LabIcon.IMaybeResolvable;
    iconClass?: string;
    iconLabel?: string;
    tooltip?: string;
    onClick?: () => void;
    enabled?: boolean;
    pressed?: boolean;
    pressedIcon?: LabIcon.IMaybeResolvable;
    pressedTooltip?: string;
    disabledTooltip?: string;

    /**
     * Trigger the button on onMouseDown event rather than onClick, to avoid giving
     * the focus on the button.
     */
    noFocusOnClick?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * React component for a toolbar button.
 *
 * @param props - The props for ToolbarButtonComponent.
 */
export function ToolbarButtonComponent(
  props: ToolbarButtonComponent.IProps
): JSX.Element {
  // In some browsers, a button click event moves the focus from the main
  // content to the button (see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Clicking_and_focus).
  const handleClick =
    props.noFocusOnClick ?? false
      ? undefined
      : (event: React.MouseEvent) => {
          if (event.button === 0) {
            props.onClick?.();
            // In safari, the focus do not move to the button on click (see
            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Clicking_and_focus).
            (event.target as HTMLElement).focus();
          }
        };

  // To avoid focusing the button, we avoid a click event by calling preventDefault in
  // mousedown, and we bind the button action to `mousedown`.
  // Currently this is mostly useful for the notebook panel, to retrieve the focused
  // cell before the click event.
  const handleMouseDown =
    props.noFocusOnClick ?? false
      ? (event: React.MouseEvent) => {
          // Fire action only when left button is pressed.
          if (event.button === 0) {
            event.preventDefault();
            props.onClick?.();
          }
        }
      : undefined;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key } = event;
    if (key === 'Enter' || key === ' ') {
      props.onClick?.();
    }
  };

  const getTooltip = () => {
    if (props.enabled === false && props.disabledTooltip) {
      return props.disabledTooltip;
    } else if (props.pressed && props.pressedTooltip) {
      return props.pressedTooltip;
    } else {
      return props.tooltip || props.iconLabel;
    }
  };

  const title = getTooltip();
  const disabled = props.enabled === false;

  return (
    <Button
      appearance="stealth"
      className={
        props.className
          ? props.className + ' jp-ToolbarButtonComponent'
          : 'jp-ToolbarButtonComponent'
      }
      aria-disabled={disabled}
      aria-label={props.label || title}
      aria-pressed={props.pressed}
      {...Private.normalizeDataset(props.dataset)}
      disabled={disabled}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      title={title}
    >
      {(props.icon || props.iconClass) && (
        <LabIcon.resolveReact
          icon={props.pressed ? props.pressedIcon ?? props.icon : props.icon}
          iconClass={
            // add some extra classes for proper support of icons-as-css-background
            classes(props.iconClass, 'jp-Icon')
          }
          tag={null}
        />
      )}
      {props.label && (
        <span className="jp-ToolbarButtonComponent-label">{props.label}</span>
      )}
    </Button>
  );
}

/**
 * Adds the toolbar button class to the toolbar widget.
 * @param w Toolbar button widget.
 */
export function addToolbarButtonClass<T extends Widget = Widget>(w: T): T {
  w.addClass('jp-ToolbarButton');
  return w;
}

/**
 * Lumino Widget version of static ToolbarButtonComponent.
 */
export class ToolbarButton extends ReactWidget {
  /**
   * Creates a toolbar button
   * @param props props for underlying `ToolbarButton` component
   */
  constructor(private props: ToolbarButtonComponent.IProps = {}) {
    super();
    addToolbarButtonClass(this);
    this._enabled = props.enabled ?? true;
    this._pressed = this._enabled! && (props.pressed ?? false);
    this._onClick = props.onClick!;
  }

  /**
   * Sets the pressed state for the button
   * @param value true if button is pressed, false otherwise
   */
  set pressed(value: boolean) {
    if (this.enabled && value !== this._pressed) {
      this._pressed = value;
      this.update();
    }
  }

  /**
   * Returns true if button is pressed, false otherwise
   */
  get pressed(): boolean {
    return this._pressed!;
  }

  /**
   * Sets the enabled state for the button
   * @param value true to enable the button, false otherwise
   */
  set enabled(value: boolean) {
    if (value != this._enabled) {
      this._enabled = value;
      if (!this._enabled) {
        this._pressed = false;
      }
      this.update();
    }
  }

  /**
   * Returns true if button is enabled, false otherwise
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Sets the click handler for the button
   * @param value click handler
   */
  set onClick(value: () => void) {
    if (value !== this._onClick) {
      this._onClick = value;
      this.update();
    }
  }

  /**
   * Returns the click handler for the button
   */
  get onClick(): () => void {
    return this._onClick!;
  }

  render(): JSX.Element {
    return (
      <ToolbarButtonComponent
        {...this.props}
        noFocusOnClick={this.props.noFocusOnClick}
        pressed={this.pressed}
        enabled={this.enabled}
        onClick={this.onClick}
      />
    );
  }

  private _pressed: boolean;
  private _enabled: boolean;
  private _onClick: () => void;
}

/**
 * Namespace for CommandToolbarButtonComponent.
 */
export namespace CommandToolbarButtonComponent {
  /**
   * Interface for CommandToolbarButtonComponent props.
   */
  export interface IProps {
    /**
     * Application commands registry
     */
    commands: CommandRegistry;
    /**
     * Command unique id
     */
    id: string;
    /**
     * Command arguments
     */
    args?: ReadonlyJSONObject;
    /**
     * Overrides command icon
     */
    icon?: LabIcon;
    /**
     * Overrides command label
     */
    label?: string | CommandRegistry.CommandFunc<string>;
    /**
     * Overrides command caption
     */
    caption?: string;
    /**
     * Trigger the button on onMouseDown event rather than onClick, to avoid giving
     * the focus on the button.
     */
    noFocusOnClick?: boolean;
  }
}

/**
 * React component for a toolbar button that wraps a command.
 *
 * This wraps the ToolbarButtonComponent and watches the command registry
 * for changes to the command.
 */
export function CommandToolbarButtonComponent(
  props: CommandToolbarButtonComponent.IProps
): JSX.Element {
  return (
    <UseSignal
      signal={props.commands.commandChanged}
      shouldUpdate={(sender, args) =>
        (args.id === props.id && args.type === 'changed') ||
        args.type === 'many-changed'
      }
    >
      {() =>
        props.commands.listCommands().includes(props.id) ? (
          <ToolbarButtonComponent {...Private.propsFromCommand(props)} />
        ) : null
      }
    </UseSignal>
  );
}

/*
 * Adds the command toolbar button class to the command toolbar widget.
 * @param w Command toolbar button widget.
 */
export function addCommandToolbarButtonClass(w: Widget): Widget {
  w.addClass('jp-CommandToolbarButton');
  return w;
}

/**
 * Lumino widget version of CommandToolbarButtonComponent.
 */
export class CommandToolbarButton extends ReactWidget {
  /**
   * Creates a command toolbar button
   * @param props props for underlying `CommandToolbarButtonComponent` component
   */
  constructor(private props: CommandToolbarButtonComponent.IProps) {
    super();
    const { commands, id, args } = props;
    addCommandToolbarButtonClass(this);
    this.setCommandAttributes(commands, id, args);
    commands.commandChanged.connect((_, change) => {
      if (change.id === props.id) {
        this.setCommandAttributes(commands, id, args);
      }
    }, this);
  }
  protected setCommandAttributes(
    commands: CommandRegistry,
    id: string,
    args: ReadonlyJSONObject | undefined
  ): void {
    if (commands.isToggled(id, args)) {
      this.addClass('lm-mod-toggled');
    } else {
      this.removeClass('lm-mod-toggled');
    }
    if (commands.isVisible(id, args)) {
      this.removeClass('lm-mod-hidden');
    } else {
      this.addClass('lm-mod-hidden');
    }
    if (commands.isEnabled(id, args)) {
      if ('disabled' in this.node) {
        this.node.disabled = false;
      }
    } else {
      if ('disabled' in this.node) {
        this.node.disabled = true;
      }
    }
  }
  render(): JSX.Element {
    return <CommandToolbarButtonComponent {...this.props} />;
  }
  /**
   * Identifier of the underlying command.
   */
  get commandId(): string {
    return this.props.id;
  }
}

/**
 *  A class which provides a toolbar popup
 *  used to store widgets that don't fit
 *  in the toolbar when it is resized
 */
class ToolbarPopup extends Widget {
  width: number = 0;

  /**
   *  Construct a new ToolbarPopup
   */
  constructor() {
    super({ node: document.createElement('jp-toolbar') });
    this.node.setAttribute('aria-label', 'Responsive popup toolbar');
    this.addClass('jp-Toolbar');
    this.addClass('jp-Toolbar-responsive-popup');
    this.addClass('jp-ThemedContainer');
    this.layout = new PanelLayout();
    Widget.attach(this, document.body);
    this.hide();
  }

  /**
   * Updates the width of the popup, this
   * should match with the toolbar width
   *
   * @param width - The width to resize to
   * @protected
   */
  updateWidth(width: number) {
    if (width > 0) {
      this.width = width;
      this.node.style.width = `${width}px`;
    }
  }

  /**
   * Aligns the popup to left bottom of widget
   *
   * @param widget the widget to align to
   * @private
   */
  alignTo(widget: Widget) {
    const {
      height: widgetHeight,
      width: widgetWidth,
      x: widgetX,
      y: widgetY
    } = widget.node.getBoundingClientRect();
    const width = this.width;
    this.node.style.left = `${widgetX + widgetWidth - width + 1}px`;
    this.node.style.top = `${widgetY + widgetHeight + 1}px`;
  }

  /**
   * Inserts the widget at specified index
   * @param index the index
   * @param widget widget to add
   */
  insertWidget(index: number, widget: Widget) {
    (this.layout as PanelLayout).insertWidget(index, widget);
  }

  /**
   *  Total number of widgets in the popup
   */
  widgetCount() {
    return (this.layout as PanelLayout).widgets.length;
  }

  /**
   * Returns the widget at index
   * @param index the index
   */
  widgetAt(index: number) {
    return (this.layout as PanelLayout).widgets[index];
  }
}

/**
 *  A class that provides a ToolbarPopupOpener,
 *  which is a button added to toolbar when
 *  the toolbar items overflow toolbar width
 */
class ToolbarPopupOpener extends ToolbarButton {
  /**
   *  Create a new popup opener
   */
  constructor(props: ToolbarButtonComponent.IProps = {}) {
    const trans = (props.translator || nullTranslator).load('jupyterlab');
    super({
      icon: ellipsesIcon,
      onClick: () => {
        this.handleClick();
      },
      tooltip: trans.__('More commands')
    });
    this.addClass('jp-Toolbar-responsive-opener');

    this.popup = new ToolbarPopup();
  }

  /**
   * Add widget to the popup, prepends widgets
   * @param widget the widget to add
   */
  addWidget(widget: Widget) {
    this.popup.insertWidget(0, widget);
  }

  /**
   * Insert widget to the popup.
   * @param widget the widget to add
   */
  insertWidget(index: number, widget: Widget) {
    this.popup.insertWidget(index, widget);
  }

  /**
   * Dispose of the widget and its descendant widgets.
   *
   * #### Notes
   * It is unsafe to use the widget after it has been disposed.
   *
   * All calls made to this method after the first are a no-op.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.popup.dispose();
    super.dispose();
  }

  /**
   * Hides the opener and the popup
   */
  hide(): void {
    super.hide();
    this.hidePopup();
  }

  /**
   * Hides the popup
   */
  hidePopup(): void {
    this.popup.hide();
  }

  /**
   *  Updates width and position of the popup
   *  to align with the toolbar
   */
  updatePopup(): void {
    this.popup.updateWidth(this.parent!.node.clientWidth);
    this.popup.alignTo(this.parent!);
  }

  /**
   * Returns widget at index in the popup
   * @param index
   */
  widgetAt(index: number) {
    return this.popup.widgetAt(index);
  }

  /**
   * Returns total number of widgets in the popup
   *
   * @returns Number of widgets
   */
  widgetCount(): number {
    return this.popup.widgetCount();
  }

  protected handleClick() {
    this.updatePopup();
    this.popup.setHidden(!this.popup.isHidden);
  }

  protected popup: ToolbarPopup;
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Ensures all dataset keys have the 'data-' prefix.
   * @param dataset object
   */
  export function normalizeDataset(
    dataset?: DOMStringMap
  ): DOMStringMap | undefined {
    if (!dataset) {
      return undefined;
    }

    const normalized: DOMStringMap = {};
    for (const [key, value] of Object.entries(dataset)) {
      const normalizedKey = key.startsWith('data-') ? key : `data-${key}`;
      normalized[normalizedKey] = value;
    }
    return normalized;
  }

  export function propsFromCommand(
    options: CommandToolbarButtonComponent.IProps
  ): ToolbarButtonComponent.IProps {
    const { commands, id, args } = options;

    const iconClass = commands.iconClass(id, args);
    const iconLabel = commands.iconLabel(id, args);
    const icon = options.icon ?? commands.icon(id, args);

    const label = commands.label(id, args);
    let className = commands.className(id, args);
    // Add the boolean state classes and aria attributes.
    let pressed;
    if (commands.isToggleable(id, args)) {
      pressed = commands.isToggled(id, args);
      if (pressed) {
        className += ' lm-mod-toggled';
      }
    }
    if (!commands.isVisible(id, args)) {
      className += ' lm-mod-hidden';
    }
    const labelOverride =
      typeof options.label === 'function'
        ? options.label(args ?? {})
        : options.label;

    let tooltip =
      commands.caption(id, args) || labelOverride || label || iconLabel;
    // Shows hot keys in tooltips
    const binding = commands.keyBindings.find(b => b.command === id);
    if (binding) {
      const ks = binding.keys.map(CommandRegistry.formatKeystroke).join(', ');
      tooltip = `${tooltip} (${ks})`;
    }
    const onClick = () => {
      void commands.execute(id, args);
    };
    const enabled = commands.isEnabled(id, args);

    return {
      className,
      dataset: { 'data-command': options.id },
      noFocusOnClick: options.noFocusOnClick,
      icon,
      iconClass,
      tooltip: options.caption ?? tooltip,
      onClick,
      enabled,
      label: labelOverride ?? label,
      pressed
    };
  }

  /**
   * An attached property for the name of a toolbar item.
   */
  export const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name',
    create: () => ''
  });

  /**
   * A spacer widget.
   */
  export class Spacer extends Widget {
    /**
     * Construct a new spacer widget.
     */
    constructor() {
      super();
      this.addClass(TOOLBAR_SPACER_CLASS);
    }
  }
}
