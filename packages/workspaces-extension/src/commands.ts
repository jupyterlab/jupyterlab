// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  InputDialog,
  IWindowResolver,
  showDialog
} from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { FileDialog, IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { Contents, Workspace } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IWorkspaceCommands, IWorkspacesModel } from '@jupyterlab/workspaces';

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
   * Delete a workspace.
   */
  export const deleteWorkspace = 'workspace-ui:delete';
  /**
   * Clone a given workspace.
   */
  export const clone = 'workspace-ui:clone';
  /**
   * Rename a workspace.
   */
  export const rename = 'workspace-ui:rename';
  /**
   * Reset a workspace.
   */
  export const reset = 'workspace-ui:reset';
  /**
   * Import a workspace.
   */
  export const importWorkspace = 'workspace-ui:import';
  /**
   * Export a workspace.
   */
  export const exportWorkspace = 'workspace-ui:export';
}

const WORKSPACE_NAME = 'jupyterlab-workspace';
const WORKSPACE_EXT = '.' + WORKSPACE_NAME;
const LAST_SAVE_ID = 'workspace-ui:lastSave';

export const WORKSPACE_ITEM_CLASS = 'jp-mod-workspace';

/**
 * The workspace commands
 */
export const commandsPlugin: JupyterFrontEndPlugin<IWorkspaceCommands> = {
  id: '@jupyterlab/workspaces-extension:commands',
  description: 'Add workspace commands.',
  autoStart: true,
  requires: [
    IWorkspacesModel,
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
    model: IWorkspacesModel,
    fileBrowser: IDefaultFileBrowser,
    resolver: IWindowResolver,
    state: IStateDB,
    translator: ITranslator,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter | null,
    palette: ICommandPalette | null
  ): IWorkspaceCommands => {
    const trans = translator.load('jupyterlab');

    const namingHintLabel = trans.__(
      'Naming the workspace will create a unique URL. The name may contain letters, numbers, hyphens (-), and underscores (_).'
    );
    const workspacesBase = URLExt.join(paths.urls.app, 'workspaces');
    const resourcePrefix = workspacesBase + '/';
    // `-` needs double backslashes to be escaped in `v` mode used for patterns
    const namePattern = '[a-zA-Z0-9\\-_]+';

    const getNameForWorkspace = async (
      options: Omit<InputDialog.ITextOptions, 'prefix' | 'pattern' | 'label'>
    ) => {
      return InputDialog.getText({
        label: namingHintLabel,
        prefix: resourcePrefix,
        pattern: namePattern,
        required: true,
        placeholder: trans.__('workspace-name'),
        ...options
      });
    };

    const test = (node: HTMLElement) =>
      node.classList.contains(WORKSPACE_ITEM_CLASS);

    app.commands.addCommand(CommandIDs.open, {
      label: args => {
        const workspaceId = args.workspace as string | undefined;
        return workspaceId
          ? trans.__('Open Workspace')
          : trans.__('Open Workspace…');
      },
      execute: async args => {
        let workspaceId = args.workspace as string | undefined;

        if (!workspaceId) {
          const result = await InputDialog.getItem({
            title: trans.__('Choose Workspace To Open'),
            label: trans.__('Choose an existing workspace to open.'),
            items: model.identifiers,
            okLabel: trans.__('Choose'),
            prefix: resourcePrefix
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        if (!workspaceId || !model.identifiers.includes(workspaceId)) {
          return;
        }

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
      label: trans.__('Delete Workspace…'),
      execute: async args => {
        const node = app.contextMenuHitTest(test);
        let workspaceId =
          (args.workspace as string | undefined) ?? node?.dataset['context'];

        if (!workspaceId) {
          const result = await InputDialog.getItem({
            title: trans.__('Choose Workspace To Delete'),
            label: trans.__('Choose an existing workspace to delete.'),
            items: model.identifiers,
            okLabel: trans.__('Choose')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        if (!workspaceId) {
          return;
        }
        const result = await showDialog({
          title: trans.__('Delete workspace'),
          body: trans.__(
            'Deleting workspace "%1" will also delete its URL. A deleted workspace cannot be recovered.',
            workspaceId
          ),
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: trans.__('Delete') })
          ],
          defaultButton: 0
        });

        if (result.button.accept) {
          await model.remove(workspaceId);
        }
      }
    });

    app.commands.addCommand(CommandIDs.createNew, {
      label: trans.__('Create New Workspace…'),
      execute: async args => {
        let workspaceId = args.workspace as string | undefined;

        if (!workspaceId) {
          const result = await getNameForWorkspace({
            title: trans.__('Create New Workspace'),
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
        await model.create(workspaceId);
      }
    });

    app.commands.addCommand(CommandIDs.clone, {
      label: trans.__('Clone Workspace…'),
      execute: async args => {
        const node = app.contextMenuHitTest(test);
        let workspaceId =
          (args.workspace as string | undefined) ?? node?.dataset['context'];
        if (!workspaceId) {
          const result = await InputDialog.getItem({
            title: trans.__('Choose Workspace To Clone'),
            label: trans.__('Choose an existing workspace to clone.'),
            items: model.identifiers,
            okLabel: trans.__('Choose')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        const result = await getNameForWorkspace({
          title: trans.__('Clone Workspace'),
          text: trans.__('%1-clone', workspaceId),
          okLabel: trans.__('Clone')
        });

        if (!result.button.accept || !result.value) {
          return;
        }

        let newName = result.value;

        await model.saveAs(workspaceId, newName);

        if (workspaceId === resolver.name) {
          // If the current workspace was cloned, open the cloned copy
          return app.commands.execute(CommandIDs.open, { workspace: newName });
        }
      }
    });

    app.commands.addCommand(CommandIDs.rename, {
      label: trans.__('Rename Workspace…'),
      execute: async args => {
        const node = app.contextMenuHitTest(test);
        const workspaceId =
          (args.workspace as string | undefined) ??
          node?.dataset['context'] ??
          resolver.name;

        const oldName = workspaceId;
        const result = await getNameForWorkspace({
          title: trans.__('Rename Workspace'),
          text: oldName,
          okLabel: trans.__('Rename')
        });

        if (!result.button.accept || !result.value) {
          return;
        }

        let newName = result.value;

        await model.rename(workspaceId, newName);

        if (workspaceId === resolver.name) {
          // If the current workspace was renamed, reopen it to ensure consistent state
          return app.commands.execute(CommandIDs.open, { workspace: newName });
        }
      }
    });

    app.commands.addCommand(CommandIDs.reset, {
      label: trans.__('Reset Workspace…'),
      execute: async args => {
        const node = app.contextMenuHitTest(test);
        const workspaceId =
          (args.workspace as string | undefined) ??
          node?.dataset['context'] ??
          resolver.name;

        const workspace =
          await app.serviceManager.workspaces.fetch(workspaceId);
        const tabs = (workspace.data['layout-restorer:data'] as any)?.main?.dock
          ?.widgets?.length;

        const result = await showDialog({
          title: trans.__('Reset Workspace'),
          body: trans._n(
            'Resetting workspace %2 will close its %1 tab and return to default layout.',
            'Resetting workspace %2 will close its %1 tabs and return to default layout.',
            tabs,
            workspaceId
          ),
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: trans.__('Reset') })
          ],
          defaultButton: 0
        });

        if (!result.button.accept) {
          return;
        }

        await model.reset(workspaceId);

        if (workspaceId === resolver.name) {
          // If the current workspace was reset, refresh it to take effect
          return app.commands.execute(CommandIDs.open, {
            workspace: workspaceId
          });
        } else {
          await model.refresh();
        }
      }
    });

    /**
     * Commands persisting (or reading from) Jupyter file system
     */

    app.commands.addCommand(CommandIDs.importWorkspace, {
      label: trans.__('Import Workspace…'),
      execute: async () => {
        const { contents } = app.serviceManager;
        const result = await FileDialog.getOpenFiles({
          manager: fileBrowser.model.manager,
          title: trans.__('Select Workspace Files to Import'),
          filter: (model: Contents.IModel) =>
            model.type === 'directory' || model.path.endsWith(WORKSPACE_EXT)
              ? {}
              : null,
          label: trans.__(
            'Choose one or more workspace files to import. A Jupyter workspace file has the extension "%1".',
            WORKSPACE_EXT
          ),
          translator
        });
        if (result.button.accept && result.value && result.value.length >= 1) {
          for (const fileModel of result.value) {
            // Get the file contents too
            const fullFile = await contents.get(fileModel.path, {
              content: true
            });
            const workspace = JSON.parse(
              fullFile.content
            ) as unknown as Workspace.IWorkspace;
            await app.serviceManager.workspaces.save(
              workspace.metadata.id,
              workspace
            );
          }
          await model.refresh();
        }
      }
    });

    app.commands.addCommand(CommandIDs.exportWorkspace, {
      label: trans.__('Export Workspace…'),
      execute: async args => {
        const { contents } = app.serviceManager;

        const node = app.contextMenuHitTest(test);
        let workspaceId =
          (args.workspace as string | undefined) ??
          node?.dataset['context'] ??
          resolver.name;

        if (!workspaceId) {
          // When invoked from main menu or command palette we need to ask which workspace to export
          const result = await InputDialog.getItem({
            title: trans.__('Choose Workspace To Export'),
            label: trans.__('Choose an existing workspace to export.'),
            items: model.identifiers,
            okLabel: trans.__('Choose')
          });
          if (!result.value || !result.button.accept) {
            return;
          }
          workspaceId = result.value;
        }

        const data = app.serviceManager.workspaces.fetch(workspaceId);

        const result = await FileDialog.getExistingDirectory({
          title: trans.__('Choose Workspace Export Directory'),
          defaultPath: fileBrowser.model.path,
          manager: fileBrowser.model.manager,
          label: trans.__(
            'The "%1" workspace will be saved in the chosen directory as "%1%2".',
            workspaceId,
            WORKSPACE_EXT
          ),
          translator
        });
        if (
          !result.button.accept ||
          !result.value ||
          result.value.length === 0
        ) {
          return;
        }
        if (result.value.length > 1) {
          console.warn(
            'More than one directory was selected; the workspace will be exported to the first directory only'
          );
        }
        const exportPath =
          result.value[0].path + '/' + workspaceId + WORKSPACE_EXT;

        if (exportPath) {
          await Private.save(exportPath, contents, data, state, false);
        }
      }
    });

    app.commands.addCommand(CommandIDs.saveAs, {
      label: trans.__('Save Current Workspace As…'),
      execute: async () => {
        const { contents } = app.serviceManager;
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        await Private.saveAs(fileBrowser, contents, data, state, translator);
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
        CommandIDs.createNew,
        CommandIDs.rename,
        CommandIDs.clone,
        CommandIDs.exportWorkspace,
        CommandIDs.importWorkspace,
        CommandIDs.reset,
        CommandIDs.deleteWorkspace
      ];
      for (const command of commands) {
        palette.addItem({
          command,
          category
        });
      }
    }

    return {
      open: CommandIDs.open,
      deleteWorkspace: CommandIDs.deleteWorkspace
    };
  }
};

namespace Private {
  export function createNameFromPath(path: string): string {
    let name = path.split('/').pop();
    if (name === undefined) {
      return 'unnamed-workspace';
    }
    // Remove the workspace suffix if present
    if (name.endsWith(WORKSPACE_EXT)) {
      name = name.slice(0, -WORKSPACE_EXT.length);
    }
    return name;
  }

  /**
   * Save workspace to a user provided location
   */
  export async function save(
    userPath: string,
    contents: Contents.IManager,
    data: Promise<Workspace.IWorkspace>,
    state: IStateDB,
    rememberAsLastSave = true
  ): Promise<void> {
    const name = createNameFromPath(userPath);

    // Add extension if not provided
    if (!userPath.endsWith(WORKSPACE_EXT)) {
      userPath = userPath + WORKSPACE_EXT;
    }

    if (rememberAsLastSave) {
      // Save last save location, for save button to work
      await state.save(LAST_SAVE_ID, userPath);
    }

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
