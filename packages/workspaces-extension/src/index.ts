/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module workspaces-extension
 */
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IWorkspaceCommands,
  IWorkspacesModel,
  WorkspacesModel
} from '@jupyterlab/workspaces';
import { commandsPlugin } from './commands';
import { workspacesSidebar } from './sidebar';
import { WorkspaceSelectorWidget } from './top_indicator';
import { IWindowResolver } from '@jupyterlab/apputils';

/**
 * The extension populating sidebar with workspaces list.
 */
const workspacesModel: JupyterFrontEndPlugin<IWorkspacesModel> = {
  id: '@jupyterlab/workspaces-extension:model',
  description: 'Provides a model for available workspaces.',
  provides: IWorkspacesModel,
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    return new WorkspacesModel({
      manager: app.serviceManager.workspaces
    });
  }
};

/**
 * The extension providing workspace sub-menu in the "File" main menu.
 */
const workspacesMenu: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/workspaces-extension:menu',
  description: 'Populates "File" main menu with Workspaces submenu.',
  requires: [IWorkspaceCommands],
  autoStart: true,
  activate: () => {
    // no-op - the menu items come from schema matching the name of the plugin
  }
};

/**
 * The extension providing workspace indicator at topbar
 */
const workspacesIndicator: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/workspaces-extension:indicator',
  description: 'Adds a worspace indicator and selector element at top',
  requires: [IWorkspacesModel, IWorkspaceCommands, IWindowResolver],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    model: IWorkspacesModel,
    commands: IWorkspaceCommands,
    resolver: IWindowResolver
  ) => {
    const openWorkspace = (workspace: string) => {
      app.commands.execute(commands.open, { workspace: workspace });
    };
    const widget = new WorkspaceSelectorWidget({
      currentWorkspace: resolver.name,
      identifiers: model.identifiers,
      openWorkspace: openWorkspace,
      model: model
    });
    app.shell.add(widget, 'top', { rank: 1000 });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  workspacesModel,
  commandsPlugin,
  workspacesSidebar,
  workspacesMenu,
  workspacesIndicator
];
export default plugins;
