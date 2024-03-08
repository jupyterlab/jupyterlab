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
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  workspacesModel,
  commandsPlugin,
  workspacesSidebar,
  workspacesMenu
];
export default plugins;
