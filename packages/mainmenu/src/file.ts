// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for a File menu.
 */
export interface IFileMenu extends IRankedMenu {
  /**
   * Option to add a `Quit` entry in the File menu
   */
  quitEntry: boolean;

  /**
   * A submenu for creating new files/launching new activities.
   */
  readonly newMenu: IRankedMenu;

  /**
   * The close and cleanup semantic command.
   */
  readonly closeAndCleaners: SemanticCommand;

  /**
   * The console creator semantic command.
   */
  readonly consoleCreators: SemanticCommand;
}

/**
 * An extensible FileMenu for the application.
 */
export class FileMenu extends RankedMenu implements IFileMenu {
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.quitEntry = false;

    this.closeAndCleaners = new SemanticCommand();
    this.consoleCreators = new SemanticCommand();
  }

  /**
   * The New submenu.
   */
  get newMenu(): RankedMenu {
    if (!this._newMenu) {
      this._newMenu =
        (find(this.items, menu => menu.submenu?.id === 'jp-mainmenu-file-new')
          ?.submenu as RankedMenu) ??
        new RankedMenu({
          commands: this.commands
        });
    }
    return this._newMenu;
  }

  /**
   * The close and cleanup semantic command.
   */
  readonly closeAndCleaners: SemanticCommand;

  /**
   * The console creator semantic command.
   */
  readonly consoleCreators: SemanticCommand;

  /**
   * Dispose of the resources held by the file menu.
   */
  dispose(): void {
    this._newMenu?.dispose();
    super.dispose();
  }

  /**
   * Option to add a `Quit` entry in File menu
   */
  public quitEntry: boolean;

  private _newMenu: RankedMenu;
}
