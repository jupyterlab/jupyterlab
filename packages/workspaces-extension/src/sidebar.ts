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
      labelTitle(): string {
        // Compatibility: some Workspace objects expose layout under metadata,
        // others under data, and sometimes that payload can be a JSON string.
        const rawMeta = (this._workspace?.metadata ?? this._workspace?.data ?? {}) as
          | Record<string, unknown>
          | string;

        // Helper: safely extract a field from rawMeta (supports string or object).
        const tryGet = (obj: Record<string, unknown> | string, key: string) => {
          if (typeof obj === 'string') {
            return undefined;
          }
          return (obj as Record<string, unknown>)[key];
        };

        // Candidate can be an object, or a JSON string containing layout info.
        const candidate =
          tryGet(rawMeta, 'layout-restorer:data') ??
          tryGet(rawMeta, 'layout-restorer') ??
          tryGet(rawMeta, 'layout') ??
          rawMeta;

        type LayoutShape = { main?: { dock?: { widgets?: unknown[] } } } | undefined;

        let layoutData: LayoutShape;

        if (candidate == null) {
          layoutData = undefined;
        } else if (typeof candidate === 'string') {
          // Try to parse string safely; if parsing fails, ignore.
          try {
            const parsed = JSON.parse(candidate) as Record<string, unknown> | null;
            layoutData =
              (parsed && (parsed['layout-restorer:data'] ?? parsed)) as LayoutShape;
          } catch {
            layoutData = undefined;
          }
        } else {
          layoutData = candidate as LayoutShape;
        }

        const widgets = Array.isArray(layoutData?.main?.dock?.widgets)
          ? layoutData!.main!.dock!.widgets!
          : [];

        const tabsCount = widgets.length;

        // workspace id / last_modified could be in metadata or data (stringify safely)
        const workspaceId =
          typeof rawMeta === 'string'
            ? rawMeta
            : String((rawMeta as Record<string, unknown>).id ?? (rawMeta as Record<
                string,
                unknown
              >).name ?? '');

        const lastModifiedRaw =
          typeof rawMeta === 'string'
            ? undefined
            : (rawMeta as Record<string, unknown>)['last_modified'];

        const lastModified =
          lastModifiedRaw && String(lastModifiedRaw).trim() !== ''
            ? String(lastModifiedRaw)
            : trans.__('unknown');

        return trans.__(
          '%1 workspace with %2 tab(s), last modified on %3',
          workspaceId,
          String(tabsCount),
          lastModified
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
