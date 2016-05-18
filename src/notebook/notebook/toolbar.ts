// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

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
 * A class which provides a notebook toolbar widget.
 */
export
class NotebookToolbar extends Widget {
  /**
   * Construct a new toolbar widget
   */
  constructor() {
    super();
    this.addClass(NB_TOOLBAR);
    this.layout = new PanelLayout();
  }

  /**
   * Add an item to the toolbar.
   *
   * @param widget - The widget to add to the toolbar.
   *
   * @param name - The name of the widget to add to the toolbar.
   *
   * @param after - The optional name of the item to insert after.
   *
   * @returns A disposable which can be used to remove the item from
   *   the toolbar.
   *
   * #### Notes
   * An error is thrown if a widget of the same name is already given.
   * If not `after` is given, or the named widget is not in the toolbar,
   * the widget will be added to the end of the toolbar.
   */
  add(widget: Widget, name: string, after?: string): IDisposable {
    if (this._names.indexOf(name) !== -1) {
      throw new Error(`A button named "${name}" was already added`);
    }
    widget.addClass(TOOLBAR_ITEM);
    let layout = this.layout as PanelLayout;
    let index = this._names.indexOf(after);
    if (index === -1) {
      this._names.push(name);
      layout.addChild(widget);
    } else {
      this._names.splice(index, 0, name);
      layout.insertChild(index, widget);
    }
    return new DisposableDelegate(() => {
      index = this._names.indexOf(name);
      this._names.splice(index, 1);
      layout.removeChild(widget);
    });
  }

  /**
   * List the names of the toolbar items.
   *
   * @returns A new array of the current toolbar items.
   */
  list(): string[] {
    return this._names.slice();
  }

  private _names: string[] = [];
}
