/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IWindowResolver } from '@jupyterlab/apputils';
import { IWorkspaceCommands, IWorkspacesModel } from '@jupyterlab/workspaces';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Workspace } from '@jupyterlab/services';
import { WORKSPACE_ITEM_CLASS } from './commands';
import { blankIcon, checkIcon, deleteIcon } from '@jupyterlab/ui-components';

/**
 * The extension populating sidebar with workspaces list.
 */
export const workspacesSidebar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/workspaces-extension:sidebar',
  description: 'Populates running sidebar with workspaces.',
  requires: [
    IWorkspaceCommands,
    IWorkspacesModel,
    IRunningSessionManagers,
    IWindowResolver
  ],
  optional: [ITranslator],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    commands: IWorkspaceCommands,
    model: IWorkspacesModel,
    managers: IRunningSessionManagers,
    resolver: IWindowResolver,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    class WorkspaceItem implements IRunningSessions.IRunningItem {
      constructor(workspace: Workspace.IWorkspace) {
        this._workspace = workspace;
        this.context = workspace.metadata.id;
        this.className = WORKSPACE_ITEM_CLASS;
      }
      readonly className: string;
      readonly context: string;
      open() {
        return app.commands.execute(commands.open, {
          workspace: this._workspace.metadata.id
        });
      }
      async shutdown() {
        await app.commands.execute(commands.deleteWorkspace, {
          workspace: this._workspace.metadata.id
        });
        await model.refresh();
      }
      icon() {
        return resolver.name === this._workspace.metadata.id
          ? checkIcon
          : blankIcon;
      }
      label() {
        return this._workspace.metadata.id;
      }
      labelTitle() {
        return trans.__(
          '%1 workspace with %2 tabs, last modified on %3',
          this._workspace.metadata.id,
          (this._workspace.data['layout-restorer:data'] as any)?.main?.dock
            ?.widgets?.length,
          this._workspace.metadata['last_modified']
        );
      }

      private _workspace: Workspace.IWorkspace;
    }
    managers.add({
      name: trans.__('Workspaces'),
      supportsMultipleViews: false,
      running: () => {
        return model.workspaces.map((workspace: Workspace.IWorkspace) => {
          return new WorkspaceItem(workspace);
        });
      },
      shutdownAll: async () => {
        await Promise.all(
          model.workspaces.map(workspace => model.remove(workspace.metadata.id))
        );
        await model.refresh();
      },
      shutdownItemIcon: deleteIcon,
      refreshRunning: async () => {
        await model.refresh();
      },
      runningChanged: model.refreshed,
      shutdownLabel: (item: IRunningSessions.IRunningItem) =>
        trans.__('Delete %1', item.label() as string),
      shutdownAllLabel: trans.__('Delete All'),
      shutdownAllConfirmationText: trans.__(
        'Are you sure you want to delete all workspaces? Deleted workspaces cannot be recovered.'
      )
    });
  }
};
