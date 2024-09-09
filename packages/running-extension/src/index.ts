// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, ICommandPalette } from '@jupyterlab/apputils';
import {
  IRunningSessionManagers,
  IRunningSessionSidebar,
  RunningSessionManagers,
  RunningSessions,
  SearchableSessions
} from '@jupyterlab/running';
import { IRecentsManager } from '@jupyterlab/docmanager';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  launcherIcon,
  runningIcon
} from '@jupyterlab/ui-components';
import { addKernelRunningSessionManager } from './kernels';
import { addOpenTabsSessionManager } from './opentabs';
import { addRecentlyClosedSessionManager } from './recents';

/**
 * The command IDs used by the running plugin.
 */
export namespace CommandIDs {
  export const kernelNewConsole = 'running:kernel-new-console';
  export const kernelNewNotebook = 'running:kernel-new-notebook';
  export const kernelOpenSession = 'running:kernel-open-session';
  export const kernelShutDown = 'running:kernel-shut-down';
  export const kernelShutDownUnused = 'running:kernel-shut-down-unused';
  export const showPanel = 'running:show-panel';
  export const showModal = 'running:show-modal';
}

/**
 * The default running sessions extension.
 */
const plugin: JupyterFrontEndPlugin<IRunningSessionManagers> = {
  id: '@jupyterlab/running-extension:plugin',
  description: 'Provides the running session managers.',
  provides: IRunningSessionManagers,
  requires: [ITranslator],
  optional: [ILabShell],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    labShell: ILabShell | null
  ): IRunningSessionManagers => {
    const runningSessionManagers = new RunningSessionManagers();

    if (labShell) {
      addOpenTabsSessionManager(runningSessionManagers, translator, labShell);
    }
    void addKernelRunningSessionManager(
      runningSessionManagers,
      translator,
      app
    );

    return runningSessionManagers;
  }
};

/**
 * The plugin enabling the running sidebar.
 */
const sidebarPlugin: JupyterFrontEndPlugin<IRunningSessionSidebar> = {
  id: '@jupyterlab/running-extension:sidebar',
  description: 'Provides the running session sidebar.',
  provides: IRunningSessionSidebar,
  requires: [IRunningSessionManagers, ITranslator],
  optional: [ILayoutRestorer, IStateDB],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IRunningSessionManagers,
    translator: ITranslator,
    restorer: ILayoutRestorer | null,
    state: IStateDB | null
  ): IRunningSessionSidebar => {
    const trans = translator.load('jupyterlab');
    const running = new RunningSessions(manager, translator, state);
    running.id = 'jp-running-sessions';
    running.title.caption = trans.__('Running Terminals and Kernels');
    running.title.icon = runningIcon;
    running.node.setAttribute('role', 'region');
    running.node.setAttribute(
      'aria-label',
      trans.__('Running Sessions section')
    );

    // Let the application restorer track the running panel for restoration of
    // application state (e.g. setting the running panel as the current side bar
    // widget).
    if (restorer) {
      restorer.add(running, 'running-sessions');
    }
    // Rank has been chosen somewhat arbitrarily to give priority to the running
    // sessions widget in the sidebar.
    app.shell.add(running, 'left', { rank: 200, type: 'Sessions and Tabs' });

    app.commands.addCommand(CommandIDs.showPanel, {
      label: trans.__('Sessions and Tabs'),
      execute: () => {
        app.shell.activateById(running.id);
      }
    });

    return running;
  }
};

/**
 * An optional adding recently closed tabs.
 */
const recentsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/running-extension:recently-closed',
  description: 'Adds recently closed documents list.',
  requires: [IRunningSessionManagers, IRecentsManager, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IRunningSessionManagers,
    recents: IRecentsManager,
    translator: ITranslator
  ): void => {
    addRecentlyClosedSessionManager(
      manager,
      recents,
      app.commands,
      app.docRegistry,
      translator
    );
  }
};

/**
 * An optional plugin allowing to among running items.
 */
const searchPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/running-extension:search-tabs',
  description: 'Adds a widget to search open and closed tabs.',
  requires: [IRunningSessionManagers, ITranslator],
  optional: [ICommandPalette, IRunningSessionSidebar],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IRunningSessionManagers,
    translator: ITranslator,
    palette: ICommandPalette | null,
    sidebar: IRunningSessionSidebar | null
  ): void => {
    const trans = translator.load('jupyterlab');

    app.commands.addCommand(CommandIDs.showModal, {
      execute: () => {
        const running = new SearchableSessions(manager, translator);
        const dialog = new Dialog({
          title: trans.__('Tabs and Running Sessions'),
          body: running,
          buttons: [Dialog.okButton({})],
          hasClose: true
        });
        dialog.addClass('jp-SearchableSessions-modal');
        return dialog.launch();
      },
      label: trans.__('Search Tabs and Running Sessions')
    });
    if (palette) {
      palette.addItem({
        command: CommandIDs.showModal,
        category: trans.__('Running')
      });
    }
    if (sidebar) {
      const button = new CommandToolbarButton({
        commands: app.commands,
        id: CommandIDs.showModal,
        icon: launcherIcon,
        label: ''
      });
      sidebar.toolbar.addItem('open-as-modal', button);
    }
  }
};

/**
 * Export the plugins.
 */
export default [plugin, sidebarPlugin, recentsPlugin, searchPlugin];
