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
import {
  IRunningSessionManagers,
  RunningSessionManagers,
  RunningSessions
} from '@jupyterlab/running';
import { IRecentsManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { runningIcon } from '@jupyterlab/ui-components';
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
  export const showPanel = 'running:show-panel';
}

/**
 * The default running sessions extension.
 */
const plugin: JupyterFrontEndPlugin<IRunningSessionManagers> = {
  activate,
  id: '@jupyterlab/running-extension:plugin',
  description: 'Provides the running session managers.',
  provides: IRunningSessionManagers,
  requires: [ITranslator],
  optional: [ILayoutRestorer, ILabShell],
  autoStart: true
};

/**
 * An optional adding recently closed tabs.
 */
const recentsPlugin: JupyterFrontEndPlugin<void> = {
  activate: activateRecents,
  id: '@jupyterlab/running-extension:recently-closed',
  description: 'Adds recently closed documents list.',
  requires: [IRunningSessionManagers, IRecentsManager, ITranslator],
  autoStart: true
};

/**
 * An optional plugin allowing to among running items.
 */
const searchPlugin: JupyterFrontEndPlugin<void> = {
  activate: activateSearch,
  id: '@jupyterlab/running-extension:search-tabs',
  description: 'Adds a widget to search open and closed tabs.',
  requires: [IRunningSessionManagers],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default [plugin, recentsPlugin, searchPlugin];

/**
 * Activate the running plugin.
 */
function activate(
  app: JupyterFrontEnd,
  translator: ITranslator,
  restorer: ILayoutRestorer | null,
  labShell: ILabShell | null
): IRunningSessionManagers {
  const trans = translator.load('jupyterlab');
  const runningSessionManagers = new RunningSessionManagers();
  const running = new RunningSessions(runningSessionManagers, translator);
  running.id = 'jp-running-sessions';
  running.title.caption = trans.__('Running Terminals and Kernels');
  running.title.icon = runningIcon;
  running.node.setAttribute('role', 'region');
  running.node.setAttribute('aria-label', trans.__('Running Sessions section'));

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  if (restorer) {
    restorer.add(running, 'running-sessions');
  }
  if (labShell) {
    addOpenTabsSessionManager(runningSessionManagers, translator, labShell);
  }
  void addKernelRunningSessionManager(runningSessionManagers, translator, app);
  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.add(running, 'left', { rank: 200, type: 'Sessions and Tabs' });

  app.commands.addCommand(CommandIDs.showPanel, {
    label: trans.__('Sessions and Tabs'),
    execute: () => {
      app.shell.activateById(running.id);
    }
  });

  return runningSessionManagers;
}

function activateSearch(
  app: JupyterFrontEnd,
  manager: IRunningSessionManagers
): void {
  console.log(app, manager);
}

function activateRecents(
  app: JupyterFrontEnd,
  manager: IRunningSessionManagers,
  recents: IRecentsManager,
  translator: ITranslator
): void {
  addRecentlyClosedSessionManager(
    manager,
    recents,
    app.commands,
    app.docRegistry,
    translator
  );
}
