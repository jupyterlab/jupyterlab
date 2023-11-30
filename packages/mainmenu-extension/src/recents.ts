/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PathExt } from '@jupyterlab/coreutils';
import { showErrorMessage } from '@jupyterlab/apputils';
import { IRecentsManager, RecentDocument } from '@jupyterlab/docmanager';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IFileBrowserCommands } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';

const PLUGIN_ID = '@jupyterlab/mainmenu-extension:recents';

/**
 * A namespace for command IDs.
 */
namespace CommandIDs {
  /**
   * Open a recent document or directory
   */
  export const openRecent = 'recentmenu:open-recent';
  /**
   * Clear recent documents and directories (implemented in docmanager)
   */
  export const clearRecents = 'docmanager:clear-recents';
}

/**
 * Recents submenu
 *
 * It will trigger validation onBeforeAttach.
 */
class RecentsMenu extends Menu {
  constructor(
    options: Menu.IOptions & {
      manager: IRecentsManager;
      showDirectories: boolean;
    }
  ) {
    super(options);
    this._manager = options.manager;
    this._showDirectories = options.showDirectories;
    this._manager.changed.connect(this.updateItems, this);
  }

  private async _validateRecentlyOpened(): Promise<void> {
    return void Promise.all(
      this._manager.recentlyOpened.map(recent => this._manager.validate(recent))
    );
  }

  protected onBeforeAttach(msg: Message): void {
    const timeout = new PromiseDelegate<void>();
    setTimeout(() => {
      timeout.reject('Recents validation timed out.');
    }, 550);
    Promise.race([timeout.promise, this._validateRecentlyOpened()])
      .then(() => {
        this.update();
      })
      .catch(() => {
        // no-op
      });
    super.onBeforeAttach(msg);
  }

  protected updateItems(): void {
    // We cannot edit the item list on the fly because it will close
    // the menu - so we use `isEnabled` in the command and trigger a
    // UI update to emulate that; while `isVisible` would work too,
    // that could cause the user to mis-clicks when items move around
    // because another item was hidden.
    this.clearItems();
    let addSeparator = true;
    this._manager.recentlyOpened
      .sort((a: RecentDocument, b: RecentDocument) => {
        if (a.contentType === b.contentType) {
          return 0;
        } else {
          return a.contentType !== 'directory' ? 1 : -1;
        }
      })
      .forEach((recent: RecentDocument) => {
        const isDirectory = recent.contentType === 'directory';
        if (isDirectory && !this._showDirectories) {
          return;
        }
        if (addSeparator && !isDirectory) {
          addSeparator = false;
          this.addItem({ type: 'separator' });
        }
        this.addItem({
          command: CommandIDs.openRecent,
          args: { recent }
        });
      });
    this.addItem({ type: 'separator' });
    this.addItem({
      command: CommandIDs.clearRecents
    });
  }

  private _manager: IRecentsManager;
  private _showDirectories: boolean;
}

/**
 * Add recent files and directories to sub-menu.
 */
export const recentsMenuPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [IRecentsManager, IMainMenu],
  optional: [ISettingRegistry, IFileBrowserCommands, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    recentsManager: IRecentsManager,
    mainMenu: IMainMenu,
    fileBrowserCommands: IFileBrowserCommands | null,
    translator: ITranslator | null
  ): void => {
    const { commands } = app;
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    // Do not show directories if the file browser is not present
    const showDirectories = fileBrowserCommands !== null;

    // Commands
    commands.addCommand(CommandIDs.openRecent, {
      execute: async args => {
        const recent = args.recent as RecentDocument;
        const path = recent.path === '' ? '/' : recent.path;
        const isValid = await recentsManager.validate(recent);
        if (!isValid) {
          return showErrorMessage(
            trans.__('Could Not Open Recent'),
            trans.__(
              '%1 is no longer valid and will be removed from the list',
              recent.path
            )
          );
        }
        if (fileBrowserCommands) {
          // Note: prefer file browser (if available) to allow opening directories
          await commands.execute(fileBrowserCommands.openPath, { path });
        } else {
          await commands.execute('docmanager:open', { path });
        }
        // If path not found, validating will remove it after an error message
      },
      label: args => {
        const recent = args.recent as RecentDocument;
        return PathExt.joinWithLeadingSlash(recent.root, recent.path);
      },
      isEnabled: args =>
        recentsManager.recentlyOpened.includes(args.recent as RecentDocument)
    });
    const submenu = new RecentsMenu({
      commands,
      manager: recentsManager,
      showDirectories
    });
    submenu.title.label = trans.__('Open Recent');
    mainMenu.fileMenu.addGroup(
      [
        {
          type: 'submenu' as Menu.ItemType,
          submenu
        }
      ],
      1
    );
  }
};
