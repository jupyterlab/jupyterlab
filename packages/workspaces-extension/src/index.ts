/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module workspaces-extension
 */
import { ICommandPalette } from '@jupyterlab/apputils';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IWorkspaceCommands } from '@jupyterlab/workspaces';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { commandsPlugin } from './commands';

/**
 * The workspace switcher extension.
 */
const workspaceSwitcher: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/workspaces:switcher',
  description: 'Provides a workspace switcher widget.',
  requires: [ISettingRegistry, IWorkspaceCommands],
  optional: [ICommandPalette, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    commands: IWorkspaceCommands,
    translator: ITranslator | null
  ) => {
    console.log(commands, translator);
    console.log(app.serviceManager.workspaces.list());
  }
};

/**
 * The extension populating sidebar with workspaces list.
 */
const workspacesSidebar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/workspaces:sidebar',
  description: 'Populates running sidebar with workspaces.',
  requires: [ISettingRegistry, IWorkspaceCommands],
  optional: [ICommandPalette, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    commands: IWorkspaceCommands,
    translator: ITranslator | null
  ) => {
    console.log(commands, translator);
    console.log(app.serviceManager.workspaces.list());
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  commandsPlugin,
  workspaceSwitcher,
  workspacesSidebar
];
export default plugins;
