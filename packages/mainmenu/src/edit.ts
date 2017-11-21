// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu
} from './labmenu';


/**
 * An interface for an Edit menu.
 */
export
interface IEditMenu extends IJupyterLabMenu {
  /**
   * A map storing IClearers for the Edit menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly clearers: Map<string, IEditMenu.IClearer<Widget>>;
}

/**
 * An extensible Edit menu for the application.
 */
export
class EditMenu extends JupyterLabMenu implements IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Edit';

    this.clearers =
      new Map<string, IEditMenu.IClearer<Widget>>();
  }

  /**
   * A map storing IClearers for the Edit menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly clearers: Map<string, IEditMenu.IClearer<Widget>>;
}

/**
 * Namespace for IEditMenu
 */
export
namespace IEditMenu {
  /**
   * Interface for an activity that wants to register a 'Clear...' menu item
   */
  export
  interface IClearer<T extends Widget> extends IMenuExtender<T> {
    /**
     * A label for the thing to be cleared.
     */
    noun: string;

    /**
     * A function to clear an activity.
     */
    clear: (widget: T) => void;
  }
}
