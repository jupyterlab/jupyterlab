// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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
   * @param widget - The widget to add to the toolbar.
   *
   * @param name - The name of the widget to add to the toolbar.
   *
   * @param after - The optional name of the item to insert after.
   *
   * #### Notes
   * An error is thrown if a widget of the same name is already given.
   * If `after` is not given, or the named widget is not in the toolbar,
   * the widget will be added to the end of the toolbar.
   */
  add(widget: Widget, name: string, after?: string): void {
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
      layout.insertChild(index, widget);
    }
  }

  /**
   * List the names of the toolbar items.
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
