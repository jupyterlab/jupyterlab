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

  /**
   * A map storing IClearers for the Edit menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly findReplacers: Map<string, IEditMenu.IFindReplacer<Widget>>;
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

    this.findReplacers =
      new Map<string, IEditMenu.IFindReplacer<Widget>>();
  }

  /**
   * A map storing IClearers for the Edit menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly clearers: Map<string, IEditMenu.IClearer<Widget>>;

  /**
   * A map storing IClearers for the Edit menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly findReplacers: Map<string, IEditMenu.IFindReplacer<Widget>>;
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

  /**
   * Interface for an activity that uses Find/Find+Replace.
   */
  export
  interface IFindReplacer<T extends Widget> extends IMenuExtender<T> {
    /**
     * Execute a find command for the activity.
     */
    find?: (widget: T) => void;

    /**
     * Execute a find/replace command for the activity.
     */
    findAndReplace?: (widget: T) => void;
  }
}
