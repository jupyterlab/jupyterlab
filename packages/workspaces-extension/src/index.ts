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
import { ITranslator } from '@jupyterlab/translation';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

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

//Plugin id for workspaces indicator plugin
const WORKSPACE_INDICATOR_PLUGIN_ID =
  '@jupyterlab/workspaces-extension:indicator';
//Command id for toggling workspace indicator
const WORKSPACE_INDICATOR_COMMAND_ID = 'workspace-indicator:toggle';

/**
 * The extension providing workspace indicator at topbar
 */
const workspacesIndicator: JupyterFrontEndPlugin<void> = {
  id: WORKSPACE_INDICATOR_PLUGIN_ID,
  description: 'Adds a workspace indicator element at topbar',
  requires: [
    IWorkspacesModel,
    IWorkspaceCommands,
    IWindowResolver,
    ITranslator,
    ISettingRegistry
  ],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    model: IWorkspacesModel,
    commands: IWorkspaceCommands,
    resolver: IWindowResolver,
    translator: ITranslator,
    registry: ISettingRegistry
  ) => {
    const trans = translator.load('jupyterlab');
    const openWorkspace = async (workspace: string) => {
      await app.commands.execute(commands.open, { workspace: workspace });
    };
    const workspaceSelector = new WorkspaceSelectorWidget({
      currentWorkspace: resolver.name,
      identifiers: model.identifiers,
      openWorkspace: openWorkspace,
      model: model,
      translator: translator
    });
    const isToggled = await registry.get(
      WORKSPACE_INDICATOR_PLUGIN_ID,
      'toggled'
    );
    workspaceSelector.setHidden(!isToggled.composite as boolean);
    app.shell.add(workspaceSelector, 'top', { rank: 1000 });
    app.commands.addCommand(WORKSPACE_INDICATOR_COMMAND_ID, {
      label: trans.__('Show Workspace Indicator'),
      isToggled: () => workspaceSelector.isVisible,
      execute: () => {
        workspaceSelector.setHidden(workspaceSelector.isVisible);
        if (registry) {
          void registry.set(
            WORKSPACE_INDICATOR_PLUGIN_ID,
            'toggled',
            workspaceSelector.isVisible
          );
        }
      }
    });
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
