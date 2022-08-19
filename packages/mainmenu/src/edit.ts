// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for an Edit menu.
 */
export interface IEditMenu extends IRankedMenu {
  /**
   * Semantic commands IUndoers for the Edit menu.
   */
  readonly undoers: IEditMenu.IUndoer;

  /**
   * Semantic commands IClearers for the Edit menu.
   */
  readonly clearers: IEditMenu.IClearer;

  /**
   * Semantic commands IGoToLiners for the Edit menu.
   */
  readonly goToLiners: SemanticCommand;
}

/**
 * An extensible Edit menu for the application.
 */
export class EditMenu extends RankedMenu implements IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);

    this.undoers = {
      redo: new SemanticCommand(),
      undo: new SemanticCommand()
    };

    this.clearers = {
      clearAll: new SemanticCommand(),
      clearCurrent: new SemanticCommand()
    };

    this.goToLiners = new SemanticCommand();
  }

  /**
   * Semantic commands IUndoers for the Edit menu.
   */
  readonly undoers: IEditMenu.IUndoer;

  /**
   * Semantic commands IClearers for the Edit menu.
   */
  readonly clearers: IEditMenu.IClearer;

  /**
   * Semantic commands IGoToLiners for the Edit menu.
   */
  readonly goToLiners: SemanticCommand;
}

/**
 * Namespace for IEditMenu
 */
export namespace IEditMenu {
  /**
   * Interface for an activity that uses Undo/Redo.
   */
  export interface IUndoer {
    /**
     * A semantic command to execute an undo command for the activity.
     */
    undo: SemanticCommand;

    /**
     * A semantic command to execute a redo command for the activity.
     */
    redo: SemanticCommand;
  }

  /**
   * Interface for an activity that wants to register a 'Clear...' menu item
   */
  export interface IClearer {
    /**
     * A semantic command to clear the currently portion of activity.
     */
    clearCurrent: SemanticCommand;

    /**
     * A semantic command to clear all of an activity.
     */
    clearAll: SemanticCommand;
  }
}
