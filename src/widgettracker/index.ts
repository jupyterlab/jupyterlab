// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to the currently active widget's title.
 */
const SEMANTIC_FOCUS_CLASS = 'jp-mod-semanticFocus';


/**
 * An object that tracks the active widget in an application.
 */
export
class WidgetTracker<T extends Widget> implements IDisposable {
  /**
   * Construct a new widget tracker.
   */
  constructor() {
    // TODO: Replace this with message filters on semantic-focus
    // events when available.
    document.body.addEventListener('focus', this, true);
  }

  /**
   * A signal emitted when the active widget changes.
   */
  get activeWidgetChanged(): ISignal<WidgetTracker<T>, T> {
    return activeWidgetChangedSignal.bind(this);
  }

  /**
   * Test whether the widget tracker has been disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._widgets === null;
  }

  /**
   * The read-only list of tracked widgets.
   *
   * #### Notes
   * This is a read-only property.
   */
  get widgets(): T[] {
    return this._widgets.slice();
  }

  /**
   * The currently active widget.
   *
   * #### Notes
   * This is set automatically due to user events but can
   * also be set programatically.
   * The widget must be one of the current widgets.
   * The widget will be activated in the application shell.
   * The [[activeWidgetChanged]] signal will be emitted.
   */
  get activeWidget(): T {
    return this._activeWidget;
  }
  set activeWidget(widget: T) {
    if (this._activeWidget === widget) {
      return;
    }
    if (this._widgets.indexOf(widget) === -1) {
      return;
    }
    // Activate the widget in the dock panel.
    // TODO: Use an API for this for this when available.
    let stack = widget.parent;
    if (!stack) {
      return;
    }
    let tabs = stack.parent;
    if (tabs instanceof TabPanel) {
      tabs.currentWidget = widget;
    }
    // Toggle the active class in the widget titles.
    if (this._activeWidget) {
      let className =  this._activeWidget.title.className;
      className = className.replace(SEMANTIC_FOCUS_CLASS, '');
      this._activeWidget.title.className = className;
    }
    this._activeWidget = widget;
    if (widget) {
      widget.title.className += ` ${SEMANTIC_FOCUS_CLASS}`;
    }
    this.activeWidgetChanged.emit(widget);
  }

  /**
   * Dispose of the resources used by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._widgets = null;
    this._activeWidget = null;
    document.body.removeEventListener('focus', this, true);
  }

  /**
   * Add a widget to the widget tracker.
   *
   * @param widget - The widget to add to the tracker.
   *
   * @returns A disposable that can be used to remove the widget from
   *   the tracker.
   *
   * #### Notes
   * The new widget will be set as the active widget.
   */
  addWidget(widget: T): IDisposable {
    this._widgets.push(widget);
    this.activeWidget = widget;
    let disposal = () => {
      let index = this._widgets.indexOf(widget);
      this._widgets.splice(index, 1);
    };
    widget.disposed.connect(() => { disposal(); });
    return new DisposableDelegate(() => { disposal(); });
  }

  /**
   * Handle the DOM events for the widget tracker.
   *
   * @param event - The DOM event sent to the widget.
   */
  handleEvent(event: Event): void {
    if (event.type === 'focus') {
      for (let widget of this._widgets) {
        let target = event.target as HTMLElement;
        if (widget.isAttached && widget.isVisible) {
          if (widget.node.contains(target)) {
            this.activeWidget = widget;
            return;
          }
        }
      }
    }
  }

  private _widgets: T[] = [];
  private _activeWidget: T = null;
}


/**
 * A signal emitted when the active widget changes.
 */
 const activeWidgetChangedSignal = new Signal<WidgetTracker<Widget>, Widget>();
