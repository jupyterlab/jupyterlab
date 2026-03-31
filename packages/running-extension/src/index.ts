// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILabShell, ILayoutRestorer } from '@jupyterlab/application';
import { Dialog, ICommandPalette } from '@jupyterlab/apputils';
import {
  IRunningSessionManagers,
  IRunningSessionSidebar,
  RunningSessionManagers,
  RunningSessions,
  SearchableSessions
} from '@jupyterlab/running';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { IRecentsManager } from '@jupyterlab/docmanager';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  launcherIcon,
  PanelWithToolbar,
  runningIcon,
  ToolbarButton,
  undoIcon
} from '@jupyterlab/ui-components';
import type { ReadonlyPartialJSONValue } from '@lumino/coreutils';
import type { AccordionLayout, AccordionPanel } from '@lumino/widgets';
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
  export const moveSectionToFileBrowser = 'running:move-section-to-filebrowser';
  export const moveSectionBackFromFileBrowser =
    'running:move-section-back-from-filebrowser';
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
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
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
      label: trans.__('Search Tabs and Running Sessions'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
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
 * State DB key for persisting moved sections.
 */
const MOVE_STATE_KEY = 'running-sessions:moved-to-filebrowser';

/**
 * Shape of the persisted state for moved sections.
 */
interface IMovedSectionsState {
  movedManagerNames: string[];
  splitSizes?: number[];
}

/**
 * Plugin to allow moving running session sections to the file browser sidebar.
 */
const moveSectionsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/running-extension:move-sections',
  description:
    'Allows moving running session sections to the file browser sidebar.',
  requires: [IRunningSessionManagers, IRunningSessionSidebar, ITranslator],
  optional: [IDefaultFileBrowser, IStateDB],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    managers: IRunningSessionManagers,
    sidebar: IRunningSessionSidebar,
    translator: ITranslator,
    fileBrowser: IDefaultFileBrowser | null,
    stateDB: IStateDB | null
  ): void => {
    if (!fileBrowser) {
      return;
    }

    const trans = translator.load('jupyterlab');
    const running = sidebar as RunningSessions;

    // Track which manager name was right-clicked on
    let lastClickedManagerName: string | null = null;
    // Track which widget was right-clicked in the bottom panel
    let lastClickedBottomWidget: PanelWithToolbar | null = null;
    // Track moved section names for state persistence
    const movedSections = new Set<string>();
    // Map from widget to the "move back" toolbar button for cleanup
    const moveBackButtons = new Map<PanelWithToolbar, ToolbarButton>();

    // --- Helper: save state ---
    const saveState = async () => {
      if (!stateDB) {
        return;
      }
      const state: IMovedSectionsState = {
        movedManagerNames: [...movedSections]
      };
      if (fileBrowser.splitPanel) {
        state.splitSizes = fileBrowser.splitPanel.relativeSizes();
      }
      await stateDB.save(
        MOVE_STATE_KEY,
        state as unknown as ReadonlyPartialJSONValue
      );
    };

    // --- Helper: move a section to the file browser ---
    const moveToFileBrowser = (managerName: string) => {
      const widget = running.removeSection(managerName);
      if (!widget) {
        return;
      }
      movedSections.add(managerName);

      // Remember collapsed state before re-parenting clears it
      const wasHidden = widget.isHidden;

      // Add a "move back" toolbar button if the widget has a toolbar
      if (widget instanceof PanelWithToolbar) {
        const moveBackButton = new ToolbarButton({
          icon: undoIcon,
          tooltip: trans.__('Move back to Running Sessions'),
          onClick: () => {
            app.commands.execute(CommandIDs.moveSectionBackFromFileBrowser, {
              managerName
            });
          }
        });
        widget.toolbar.addItem('move-back', moveBackButton);
        moveBackButtons.set(widget, moveBackButton);
      }

      fileBrowser.addBottomWidget(widget);

      // The new accordion title is always created with lm-mod-expanded.
      // AccordionPanel.collapse() guards with isVisible, so it is a no-op
      // when the widget is already hidden.  Directly sync the title CSS.
      if (wasHidden && fileBrowser.bottomPanel) {
        const idx = Array.from(fileBrowser.bottomWidgets).indexOf(widget);
        if (idx >= 0) {
          const titleEl = fileBrowser.bottomPanel.titles[idx];
          titleEl.classList.remove('lm-mod-expanded');
          titleEl.setAttribute('aria-expanded', 'false');
        }
      }

      // Listen to split panel handle moves for state persistence
      if (fileBrowser.splitPanel) {
        fileBrowser.splitPanel.handleMoved.connect(saveState);
      }

      void saveState();
    };

    // --- Helper: move a section back to running sessions ---
    const moveBackToRunning = (managerName: string) => {
      // Find the widget in the bottom panel
      const widgets = fileBrowser.bottomWidgets;
      const widget = widgets.find(w => w.title.label === managerName);
      if (!widget) {
        return;
      }

      // Remove the "move back" toolbar button
      if (widget instanceof PanelWithToolbar) {
        const button = moveBackButtons.get(widget);
        if (button) {
          button.dispose();
          moveBackButtons.delete(widget);
        }
      }

      fileBrowser.removeBottomWidget(widget);
      running.reinsertSection(widget);
      movedSections.delete(managerName);
      void saveState();
    };

    // --- Identify right-clicked section in Running Sessions ---
    running.node.addEventListener('contextmenu', (event: MouseEvent) => {
      const titleEl = (event.target as HTMLElement).closest(
        '.jp-AccordionPanel-title'
      );
      if (!titleEl) {
        lastClickedManagerName = null;
        return;
      }
      const accordion = running.content as AccordionPanel;
      const layout = accordion.layout as AccordionLayout;
      const index = Array.from(layout.titles).indexOf(titleEl as HTMLElement);
      if (index >= 0) {
        lastClickedManagerName = accordion.widgets[index].title.label;
      } else {
        lastClickedManagerName = null;
      }
    });

    // --- Identify right-clicked section in FileBrowser bottom panel ---
    fileBrowser.node.addEventListener('contextmenu', (event: MouseEvent) => {
      const titleEl = (event.target as HTMLElement).closest(
        '.jp-FileBrowser-bottomPanel .jp-AccordionPanel-title'
      );
      if (!titleEl) {
        lastClickedBottomWidget = null;
        return;
      }
      // Find the AccordionPanel within the bottom panel
      const bottomPanel = fileBrowser.node.querySelector(
        '.jp-FileBrowser-bottomPanel'
      );
      if (!bottomPanel) {
        lastClickedBottomWidget = null;
        return;
      }
      // Find all title elements in the bottom panel's accordion
      const bottomWidgets = fileBrowser.bottomWidgets;
      // The bottom panel is an AccordionPanel; match by title index
      const accordion = fileBrowser.bottomPanel;
      if (!accordion) {
        lastClickedBottomWidget = null;
        return;
      }
      const accLayout = accordion.layout as AccordionLayout;
      const idx = Array.from(accLayout.titles).indexOf(titleEl as HTMLElement);
      if (idx >= 0 && idx < bottomWidgets.length) {
        const w = bottomWidgets[idx];
        lastClickedBottomWidget = w instanceof PanelWithToolbar ? w : null;
      } else {
        lastClickedBottomWidget = null;
      }
    });

    // --- Register commands ---
    app.commands.addCommand(CommandIDs.moveSectionToFileBrowser, {
      label: trans.__('Move to File Browser'),
      isVisible: () => lastClickedManagerName !== null,
      execute: () => {
        if (lastClickedManagerName) {
          moveToFileBrowser(lastClickedManagerName);
          lastClickedManagerName = null;
        }
      }
    });

    app.commands.addCommand(CommandIDs.moveSectionBackFromFileBrowser, {
      label: trans.__('Move back to Running Sessions'),
      isVisible: () => lastClickedBottomWidget !== null,
      execute: (args: any) => {
        const managerName =
          (args?.managerName as string) ?? lastClickedBottomWidget?.title.label;
        if (managerName) {
          moveBackToRunning(managerName);
          lastClickedBottomWidget = null;
        }
      }
    });

    // --- Register context menu items ---
    app.contextMenu.addItem({
      command: CommandIDs.moveSectionToFileBrowser,
      selector: '#jp-running-sessions .jp-AccordionPanel-title',
      rank: 10
    });

    app.contextMenu.addItem({
      command: CommandIDs.moveSectionBackFromFileBrowser,
      selector: '.jp-FileBrowser-bottomPanel .jp-AccordionPanel-title',
      rank: 10
    });

    // --- Restore state on startup ---
    if (stateDB) {
      const pendingMoves = new Set<string>();

      void stateDB.fetch(MOVE_STATE_KEY).then(value => {
        const state = value as IMovedSectionsState | undefined;
        if (!state?.movedManagerNames?.length) {
          return;
        }

        const splitSizes = state.splitSizes;

        // Try to move sections that are already registered
        for (const name of state.movedManagerNames) {
          const widget = running.removeSection(name);
          if (widget) {
            movedSections.add(name);
            if (widget instanceof PanelWithToolbar) {
              const moveBackButton = new ToolbarButton({
                icon: undoIcon,
                tooltip: trans.__('Move back to Running Sessions'),
                onClick: () => {
                  app.commands.execute(
                    CommandIDs.moveSectionBackFromFileBrowser,
                    { managerName: name }
                  );
                }
              });
              widget.toolbar.addItem('move-back', moveBackButton);
              moveBackButtons.set(widget, moveBackButton);
            }
            fileBrowser.addBottomWidget(widget);
          } else {
            // Manager not yet registered; wait for it
            pendingMoves.add(name);
          }
        }

        // Restore split sizes after all initial sections are moved
        if (splitSizes && fileBrowser.splitPanel) {
          fileBrowser.splitPanel.setRelativeSizes(splitSizes);
          fileBrowser.splitPanel.handleMoved.connect(saveState);
        }

        // Watch for late-arriving managers
        if (pendingMoves.size > 0) {
          const onManagerAdded = (_sender: unknown, manager: any) => {
            if (pendingMoves.has(manager.name)) {
              pendingMoves.delete(manager.name);
              // Delay slightly to let addSection complete
              setTimeout(() => {
                moveToFileBrowser(manager.name);
                if (splitSizes && fileBrowser.splitPanel) {
                  fileBrowser.splitPanel.setRelativeSizes(splitSizes);
                }
              }, 100);
              if (pendingMoves.size === 0) {
                managers.added.disconnect(onManagerAdded);
              }
            }
          };
          managers.added.connect(onManagerAdded);
        }
      });
    }
  }
};

/**
 * Export the plugins.
 */
export default [
  plugin,
  sidebarPlugin,
  recentsPlugin,
  searchPlugin,
  moveSectionsPlugin
];
