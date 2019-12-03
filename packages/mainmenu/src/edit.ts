// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu, Widget } from '@lumino/widgets';

import { IJupyterLabMenu, IMenuExtender, JupyterLabMenu } from './labmenu';

/**
 * An interface for an Edit menu.
 */
export interface IEditMenu extends IJupyterLabMenu {
  /**
   * A set storing IUndoers for the Edit menu.
   */
  readonly undoers: Set<IEditMenu.IUndoer<Widget>>;

  /**
   * A set storing IClearers for the Edit menu.
   */
  readonly clearers: Set<IEditMenu.IClearer<Widget>>;

  /**
   * A set storing IGoToLiners for the Edit menu.
   */
  readonly goToLiners: Set<IEditMenu.IGoToLiner<Widget>>;
}

/**
 * An extensible Edit menu for the application.
 */
export class EditMenu extends JupyterLabMenu implements IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Edit';

    this.undoers = new Set<IEditMenu.IUndoer<Widget>>();

    this.clearers = new Set<IEditMenu.IClearer<Widget>>();

    this.goToLiners = new Set<IEditMenu.IGoToLiner<Widget>>();
  }

  /**
   * A set storing IUndoers for the Edit menu.
   */
  readonly undoers: Set<IEditMenu.IUndoer<Widget>>;

  /**
   * A set storing IClearers for the Edit menu.
   */
  readonly clearers: Set<IEditMenu.IClearer<Widget>>;

  /**
   * A set storing IGoToLiners for the Edit menu.
   */
  readonly goToLiners: Set<IEditMenu.IGoToLiner<Widget>>;

  /**
   * Dispose of the resources held by the edit menu.
   */
  dispose(): void {
    this.undoers.clear();
    this.clearers.clear();
    super.dispose();
  }
}

/**
 * Namespace for IEditMenu
 */
export namespace IEditMenu {
  /**
   * Interface for an activity that uses Undo/Redo.
   */
  export interface IUndoer<T extends Widget> extends IMenuExtender<T> {
    /**
     * Execute an undo command for the activity.
     */
    undo?: (widget: T) => void;

    /**
     * Execute a redo command for the activity.
     */
    redo?: (widget: T) => void;
  }

  /**
   * Interface for an activity that wants to register a 'Clear...' menu item
   */
  export interface IClearer<T extends Widget> extends IMenuExtender<T> {
    /**
     * A name for the thing to be cleared, used for labeling `clearCurrent`.
     */
    noun?: string;

    /**
     * A plural name for the thing to be cleared, used for labeling `clearAll`.
     */
    pluralNoun?: string;

    /**
     * A function to clear the currently portion of activity.
     */
    clearCurrent?: (widget: T) => void;

    /**
     * A function to clear all of an activity.
     */
    clearAll?: (widget: T) => void;
  }

  /**
   * Interface for an activity that uses Go to Line.
   */
  export interface IGoToLiner<T extends Widget> extends IMenuExtender<T> {
    /**
     * Execute a go to line command for the activity.
     */
    goToLine?: (widget: T) => void;
  }
}
