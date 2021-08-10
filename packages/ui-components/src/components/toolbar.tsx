// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { find, IIterator, map, some } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { AttachedProperty } from '@lumino/properties';
import { PanelLayout, Widget } from '@lumino/widgets';
import * as React from 'react';
import { Button } from '../blueprint';
import { ellipsesIcon, LabIcon } from '../icon';
import { classes } from '../utils';
import { ReactWidget, UseSignal } from './vdom';

/**
 * The class name added to toolbars.
 */
const TOOLBAR_CLASS = 'jp-Toolbar';

/**
 * The class name added to toolbar items.
 */
const TOOLBAR_ITEM_CLASS = 'jp-Toolbar-item';

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
  constructor() {
    super();
    this.addClass(TOOLBAR_CLASS);
    this.addClass('jp-scrollbar-tiny');
    this.layout = new ToolbarLayout();
    this.insertItem(
      0,
      'toolbar-popup-opener',
      (this.popupOpener as unknown) as T
    );
    this.popupOpener.hide();
  }

  /**
   * Get an iterator over the ordered toolbar item names.
   *
   * @returns An iterator over the toolbar item names.
   */
  names(): IIterator<string> {
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
   * @param index - The optional name of the item to insert after.
   *
   * @returns Whether the item was added to toolbar.  Returns false if
   *   an item of the same name is already in the toolbar.
   *
   * #### Notes
   * The item can be removed from the toolbar by setting its parent to `null`.
   */
  addItem(name: string, widget: T): boolean {
    const layout = this.layout as ToolbarLayout;
    return this.insertItem(layout.widgets.length - 1, name, widget);
  }

  /**
   * Dispose of the widget and its descendant widgets.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
    }

    super.dispose();
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
    if (widget instanceof ToolbarPopupOpener) {
      layout.insertWidget(index, widget);
    } else {
      const j = Math.max(0, Math.min(index, layout.widgets.length - 1));
      layout.insertWidget(j, widget);
    }
    Private.nameProperty.set(widget, name);
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
    return this._insertRelative(at, 1, name, widget);
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
    return this._insertRelative(at, 0, name, widget);
  }

  private _insertRelative(
    at: string,
    offset: number,
    name: string,
    widget: T
  ): boolean {
    const nameWithIndex = map(this.names(), (name, i) => {
      return { name: name, index: i };
    });
    const target = find(nameWithIndex, x => x.name === at);
    if (target && !(target instanceof ToolbarPopupOpener)) {
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

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    if (msg.width > 0) {
      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer);
      }

      this._resizeTimer = window.setTimeout(() => {
        this._onResize(msg);
      }, 250);
    }
  }

  private _onResize(msg: Widget.ResizeMessage) {
    if (this.parent && this.parent.isAttached) {
      const toolbarWidth = this.node.clientWidth;
      const opener = this.popupOpener;
      const openerWidth = 30;
      const toolbarPadding = 2;
      const layout = this.layout as ToolbarLayout;

      let width = opener.isHidden
        ? toolbarPadding
        : toolbarPadding + openerWidth;
      let index = 0;
      const widgetsToRemove = [];
      const toIndex = layout.widgets.length - 1;

      while (index < toIndex) {
        const widget = layout.widgets[index];
        this._saveWidgetWidth(widget as T);
        width += this._getWidgetWidth(widget as T);
        if (
          widgetsToRemove.length === 0 &&
          opener.isHidden &&
          width + openerWidth > toolbarWidth
        ) {
          width += openerWidth;
        }
        if (width > toolbarWidth) {
          widgetsToRemove.push(widget);
        }
        index++;
      }

      while (widgetsToRemove.length > 0) {
        const widget = widgetsToRemove.pop() as Widget;
        width -= this._getWidgetWidth(widget as T);
        opener.addWidget(widget);
      }

      if (opener.widgetCount() > 0) {
        const widgetsToAdd = [];
        let index = 0;
        let widget = opener.widgetAt(index);
        const widgetCount = opener.widgetCount();

        width += this._getWidgetWidth(widget as T);

        if (widgetCount === 1 && width - openerWidth <= toolbarWidth) {
          width -= openerWidth;
        }

        while (width < toolbarWidth && index < widgetCount) {
          widgetsToAdd.push(widget);
          index++;
          widget = opener.widgetAt(index);
          if (widget) {
            width += this._getWidgetWidth(widget as T);
          } else {
            break;
          }
        }

        while (widgetsToAdd.length > 0) {
          const widget = widgetsToAdd.shift() as T;
          this.addItem(Private.nameProperty.get(widget), widget);
        }
      }

      if (opener.widgetCount() > 0) {
        opener.updatePopup();
        opener.show();
      } else {
        opener.hide();
      }
    }
  }

  private _saveWidgetWidth(widget: T) {
    const widgetName = Private.nameProperty.get(widget);
    this._widgetWidths![widgetName] = widget.hasClass(TOOLBAR_SPACER_CLASS)
      ? 2
      : widget.node.clientWidth;
  }

  private _getWidgetWidth(widget: T): number {
    const widgetName = Private.nameProperty.get(widget);
    return this._widgetWidths![widgetName];
  }

  readonly popupOpener: ToolbarPopupOpener = new ToolbarPopupOpener();
  private readonly _widgetWidths: { [key: string]: number } = {};
  private _resizeTimer?: number;
}

/**
 * The namespace for Toolbar class statics.
 */
export namespace Toolbar {
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
    label?: string;
    icon?: LabIcon.IMaybeResolvable;
    iconClass?: string;
    iconLabel?: string;
    tooltip?: string;
    onClick?: () => void;
    enabled?: boolean;

    /**
     * Trigger the button on the actual onClick event rather than onMouseDown.
     *
     * See note in ToolbarButtonComponent below as to why the default is to
     * trigger on onMouseDown.
     */
    actualOnClick?: boolean;

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
  // We avoid a click event by calling preventDefault in mousedown, and
  // we bind the button action to `mousedown`.
  const handleMouseDown = (event: React.MouseEvent) => {
    // Fire action only when left button is pressed.
    if (event.button === 0) {
      event.preventDefault();
      props.onClick?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key } = event;
    if (key === 'Enter' || key === ' ') {
      props.onClick?.();
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    if (event.button === 0) {
      props.onClick?.();
    }
  };

  return (
    <Button
      className={
        props.className
          ? props.className + ' jp-ToolbarButtonComponent'
          : 'jp-ToolbarButtonComponent'
      }
      disabled={props.enabled === false}
      onClick={props.actualOnClick ?? false ? handleClick : undefined}
      onMouseDown={
        !(props.actualOnClick ?? false) ? handleMouseDown : undefined
      }
      onKeyDown={handleKeyDown}
      title={props.tooltip || props.iconLabel}
      minimal
    >
      {(props.icon || props.iconClass) && (
        <LabIcon.resolveReact
          icon={props.icon}
          iconClass={
            // add some extra classes for proper support of icons-as-css-background
            classes(props.iconClass, 'jp-Icon')
          }
          className="jp-ToolbarButtonComponent-icon"
          tag="span"
          stylesheet="toolbarButton"
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
export function addToolbarButtonClass(w: Widget): Widget {
  w.addClass('jp-ToolbarButton');
  return w;
}

/**
 * Phosphor Widget version of static ToolbarButtonComponent.
 */
export class ToolbarButton extends ReactWidget {
  /**
   * Creates a toolbar button
   * @param props props for underlying `ToolbarButton` component
   */
  constructor(private props: ToolbarButtonComponent.IProps = {}) {
    super();
    addToolbarButtonClass(this);
  }
  render(): JSX.Element {
    return <ToolbarButtonComponent {...this.props} />;
  }
}

/**
 * Namespace for CommandToolbarButtonComponent.
 */
export namespace CommandToolbarButtonComponent {
  /**
   * Interface for CommandToolbarButtonComponent props.
   */
  export interface IProps {
    commands: CommandRegistry;
    id: string;
    args?: ReadonlyJSONObject;
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
      {() => <ToolbarButtonComponent {...Private.propsFromCommand(props)} />}
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
 * Phosphor Widget version of CommandToolbarButtonComponent.
 */
export class CommandToolbarButton extends ReactWidget {
  /**
   * Creates a command toolbar button
   * @param props props for underlying `CommandToolbarButtonComponent` component
   */
  constructor(private props: CommandToolbarButtonComponent.IProps) {
    super();
    addCommandToolbarButtonClass(this);
  }
  render(): JSX.Element {
    return <CommandToolbarButtonComponent {...this.props} />;
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
    super();
    this.addClass('jp-Toolbar-responsive-popup');
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
    (this.layout as PanelLayout).insertWidget(0, widget);
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
  readonly _popup: ToolbarPopup;

  /**
   *  Create a new popup opener
   */
  constructor() {
    super({
      icon: ellipsesIcon,
      onClick: () => {
        this.handleClick();
      }
    });
    this.addClass('jp-Toolbar-responsive-opener');
    this._popup = new ToolbarPopup();
  }

  protected handleClick() {
    const popup = this._popup;
    popup.updateWidth(this.parent!.node.clientWidth);
    popup.alignTo(this.parent!);
    popup.setHidden(!popup.isHidden);
  }

  /**
   *  Updates width and position of the popup
   *  to align with the toolbar
   */
  updatePopup() {
    this._popup.updateWidth(this.parent!.node.clientWidth);
    this._popup.alignTo(this.parent!);
  }

  /**
   * Add widget to the popup, prepends widgets
   * @param widget the widget to add
   */
  addWidget(widget: Widget) {
    this._popup.insertWidget(0, widget);
  }

  /**
   *  Returns total no of widgets in the popup
   */
  widgetCount() {
    return this._popup.widgetCount();
  }

  /**
   * Returns widget at index in the popup
   * @param index
   */
  widgetAt(index: number) {
    return this._popup.widgetAt(index);
  }

  /**
   *  Hides the opener and the popup
   */
  hide() {
    super.hide();
    this._popup.hide();
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  export function propsFromCommand(
    options: CommandToolbarButtonComponent.IProps
  ): ToolbarButtonComponent.IProps {
    const { commands, id, args } = options;

    const iconClass = commands.iconClass(id, args);
    const iconLabel = commands.iconLabel(id, args);
    // DEPRECATED: remove _icon when lumino 2.0 is adopted
    // if icon is aliasing iconClass, don't use it
    const _icon = commands.icon(id, args);
    const icon = _icon === iconClass ? undefined : _icon;

    const label = commands.label(id, args);
    let className = commands.className(id, args);
    // Add the boolean state classes.
    if (commands.isToggled(id, args)) {
      className += ' lm-mod-toggled';
    }
    if (!commands.isVisible(id, args)) {
      className += ' lm-mod-hidden';
    }
    let tooltip = commands.caption(id, args) || label || iconLabel;
    // Shows hot keys in tooltips
    const binding = commands.keyBindings.find(b => b.command === id);
    if (binding) {
      const ks = CommandRegistry.formatKeystroke(binding.keys.join(' '));
      tooltip = `${tooltip} (${ks})`;
    }
    const onClick = () => {
      void commands.execute(id, args);
    };
    const enabled = commands.isEnabled(id, args);

    return { className, icon, iconClass, tooltip, onClick, enabled, label };
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
