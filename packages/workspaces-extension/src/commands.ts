// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { InputDialog, IWindowResolver } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';

import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { Contents, Workspace } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IWorkspaceCommands } from '@jupyterlab/workspaces';

namespace CommandIDs {
  /**
   * Open a workspace by identifier. When no identifier is supplied, falls back to a simple choice dialog.
   */
  export const open = 'workspace-ui:open';
  /**
   * Save the current workspace.
   */
  export const save = 'workspace-ui:save';
  /**
   * Save the current workspace under a different path.
   */
  export const saveAs = 'workspace-ui:save-as';
  /**
   * Create a new workspace.
   */
  export const createNew = 'workspace-ui:create-new';
  /**
   * Delete a new workspace.
   */
  export const deleteWorkspace = 'workspace-ui:delete';
}

const WORKSPACE_NAME = 'jupyterlab-workspace';
const WORKSPACE_EXT = '.' + WORKSPACE_NAME;
const LAST_SAVE_ID = 'workspace-ui:lastSave';

/**
 * The workspace commands
 */
export const commandsPlugin: JupyterFrontEndPlugin<IWorkspaceCommands> = {
  id: '@jupyterlab/workspaces:commands',
  description: 'Add workspace commands.',
  autoStart: true,
  requires: [
    IDefaultFileBrowser,
    IWindowResolver,
    IStateDB,
    ITranslator,
    JupyterFrontEnd.IPaths
  ],
  provides: IWorkspaceCommands,
  optional: [IRouter, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    fileBrowser: IDefaultFileBrowser,
    resolver: IWindowResolver,
    state: IStateDB,
    translator: ITranslator,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter | null,
    palette: ICommandPalette | null
  ): IWorkspaceCommands => {
    const trans = translator.load('jupyterlab');

    app.commands.addCommand(CommandIDs.open, {
      label: trans.__('Open Workspace'),
      execute: async args => {
        let workspaceId = args.workspace as string | undefined;

        if (!workspaceId) {
          const result = await InputDialog.getItem({
            title: trans.__('Choose a workspace to open'),
            items: (await app.serviceManager.workspaces.list()).ids,
            okLabel: trans.__('Open')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        if (!workspaceId) {
          return;
        }

        const workspacesBase = URLExt.join(paths.urls.app, 'workspaces');
        const url = URLExt.join(workspacesBase, workspaceId);
        if (!url.startsWith(workspacesBase)) {
          throw new Error('Can only be used for workspaces');
        }
        if (router) {
          router.navigate(url, { hard: true });
        } else {
          document.location.href = url;
        }
      }
    });

    app.commands.addCommand(CommandIDs.deleteWorkspace, {
      label: trans.__('Delete Workspace'),
      execute: async args => {
        let workspaceId = args.workspace as string | undefined;

        if (!workspaceId) {
          const result = await InputDialog.getItem({
            title: trans.__('Choose a workspace to delete'),
            items: (await app.serviceManager.workspaces.list()).ids,
            okLabel: trans.__('Delete')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        if (!workspaceId) {
          return;
        }
        await app.serviceManager.workspaces.remove(workspaceId);
      }
    });

    app.commands.addCommand(CommandIDs.createNew, {
      label: trans.__('Create a new empty workspace'),
      execute: async args => {
        let workspaceId = args.workspace as string | undefined;

        if (!workspaceId) {
          const result = await InputDialog.getText({
            title: trans.__('New workspace identifier'),
            okLabel: trans.__('Create')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }
        if (!workspaceId) {
          return;
        }
        await app.serviceManager.workspaces.save(
          workspaceId,
          {} as Workspace.IWorkspace
        );
      }
    });

    app.commands.addCommand(CommandIDs.saveAs, {
      label: trans.__('Save Current Workspace As…'),
      execute: async () => {
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        await Private.saveAs(
          fileBrowser,
          app.serviceManager.contents,
          data,
          state,
          translator
        );
      }
    });

    app.commands.addCommand(CommandIDs.save, {
      label: trans.__('Save Current Workspace'),
      execute: async () => {
        const { contents } = app.serviceManager;
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        const lastSave = (await state.fetch(LAST_SAVE_ID)) as string;
        if (lastSave === undefined) {
          await Private.saveAs(fileBrowser, contents, data, state, translator);
        } else {
          await Private.save(lastSave, contents, data, state);
        }
      }
    });

    if (palette) {
      const category = trans.__('Workspaces');
      const commands = [
        CommandIDs.open,
        CommandIDs.save,
        CommandIDs.saveAs,
        CommandIDs.deleteWorkspace,
        CommandIDs.createNew
      ];
      for (const command of commands) {
        palette.addItem({
          command,
          category
        });
      }
    }

    return {
      open: CommandIDs.open
    };
  }
};

namespace Private {
  /**
   * Save workspace to a user provided location
   */
  export async function save(
    userPath: string,
    contents: Contents.IManager,
    data: Promise<Workspace.IWorkspace>,
    state: IStateDB
  ): Promise<void> {
    let name = userPath.split('/').pop();

    // Add extension if not provided or remove extension from name if it was.
    if (name !== undefined && name.includes('.')) {
      name = name.split('.')[0];
    } else {
      userPath = userPath + WORKSPACE_EXT;
    }

    // Save last save location, for save button to work
    await state.save(LAST_SAVE_ID, userPath);

    const resolvedData = await data;
    resolvedData.metadata.id = `${name}`;
    await contents.save(userPath, {
      type: 'file',
      format: 'text',
      content: JSON.stringify(resolvedData)
    });
  }

  /**
   * Ask user for location, and save workspace.
   * Default location is the current directory in the file browser
   */
  export async function saveAs(
    browser: IDefaultFileBrowser,
    contents: Contents.IManager,
    data: Promise<Workspace.IWorkspace>,
    state: IStateDB,
    translator?: ITranslator
  ): Promise<void> {
    translator = translator || nullTranslator;
    const lastSave = await state.fetch(LAST_SAVE_ID);

    let defaultName;
    if (lastSave === undefined) {
      defaultName = 'new-workspace';
    } else {
      defaultName = (lastSave as string).split('/').pop()?.split('.')[0];
    }

    const defaultPath = browser.model.path + '/' + defaultName + WORKSPACE_EXT;
    const userPath = await getSavePath(defaultPath, translator);

    if (userPath) {
      await save(userPath, contents, data, state);
    }
  }

  /**
   * Ask user for a path to save to.
   * @param defaultPath Path already present when the dialog is shown
   */
  async function getSavePath(
    defaultPath: string,
    translator?: ITranslator
  ): Promise<string | null> {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const result = await InputDialog.getText({
      title: trans.__('Save Current Workspace As…'),
      text: defaultPath,
      placeholder: trans.__('Path to save the workspace in'),
      okLabel: trans.__('Save'),
      // select the path without extension
      selectionRange: defaultPath.length - WORKSPACE_EXT.length
    });
    if (result.button.accept) {
      return result.value;
    } else {
      return null;
    }
  }
}
