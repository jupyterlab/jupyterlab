// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { IClientSession } from '@jupyterlab/apputils';

import { Cell, CodeCell } from '@jupyterlab/cells';

import {
  CodeConsole,
  ConsolePanel,
  IConsoleTracker
} from '@jupyterlab/console';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import {
  INotebookTracker,
  Notebook,
  NotebookPanel
} from '@jupyterlab/notebook';

import {
  IStatusBar,
  KernelStatus,
  LineCol,
  MemoryUsage,
  RunningSessions,
  StatusBar
} from '@jupyterlab/statusbar';

import { Title, Widget } from '@phosphor/widgets';

export const STATUSBAR_PLUGIN_ID = '@jupyterlab/statusbar-extension:plugin';

/**
 * Initialization data for the statusbar extension.
 */
const statusBar: JupyterLabPlugin<IStatusBar> = {
  id: STATUSBAR_PLUGIN_ID,
  provides: IStatusBar,
  autoStart: true,
  activate: (app: JupyterLab) => {
    const statusBar = new StatusBar();
    statusBar.id = 'jp-main-statusbar';
    app.shell.addToBottomArea(statusBar);
    // Trigger a refresh of active status items if
    // the application layout is modified.
    app.shell.layoutModified.connect(() => {
      statusBar.update();
    });
    return statusBar;
  }
};

/**
 * A plugin that provides a kernel status item to the status bar.
 */
export const kernelStatus: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar-extension:kernel-status',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker, IConsoleTracker],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    notebookTracker: INotebookTracker,
    consoleTracker: IConsoleTracker
  ) => {
    // When the status item is clicked, launch the kernel
    // selection dialog for the current session.
    let currentSession: IClientSession | null = null;
    const changeKernel = () => {
      if (!currentSession) {
        return;
      }
      currentSession.selectKernel();
    };

    // Create the status item.
    const item = new KernelStatus({
      onClick: changeKernel
    });

    // When the title of the active widget changes, update the label
    // of the hover text.
    const onTitleChanged = (title: Title<Widget>) => {
      item.model!.activityName = title.label;
    };

    // Keep the session object on the status item up-to-date.
    app.shell.currentChanged.connect((shell, change) => {
      const { oldValue, newValue } = change;

      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        oldValue.title.changed.disconnect(onTitleChanged);
      }
      if (newValue) {
        newValue.title.changed.connect(onTitleChanged);
      }

      // Grab the session off of the current widget, if it exists.
      if (newValue && consoleTracker.has(newValue)) {
        currentSession = (newValue as ConsolePanel).session;
      } else if (newValue && notebookTracker.has(newValue)) {
        currentSession = (newValue as NotebookPanel).session;
      } else {
        currentSession = null;
      }
      item.model!.session = currentSession;
    });

    statusBar.registerStatusItem(
      '@jupyterlab/statusbar-extension:kernel-status',
      {
        item,
        align: 'left',
        rank: 1,
        isActive: () => {
          const current = app.shell.currentWidget;
          return (
            current &&
            (notebookTracker.has(current) || consoleTracker.has(current))
          );
        }
      }
    );
  }
};

/**
 * A plugin providing a line/column status item to the application.
 */
export const lineColItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar-extension:line-col-status',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker, IEditorTracker, IConsoleTracker],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker,
    consoleTracker: IConsoleTracker
  ) => {
    const item = new LineCol();

    const onActiveCellChanged = (notebook: Notebook, cell: Cell) => {
      item.model!.editor = cell && cell.editor;
    };

    const onPromptCreated = (console: CodeConsole, prompt: CodeCell) => {
      item.model!.editor = prompt && prompt.editor;
    };

    app.shell.currentChanged.connect((shell, change) => {
      const { oldValue, newValue } = change;

      // Check if we need to disconnect the console listener
      // or the notebook active cell listener
      if (oldValue && consoleTracker.has(oldValue)) {
        (oldValue as ConsolePanel).console.promptCellCreated.disconnect(
          onPromptCreated
        );
      } else if (oldValue && notebookTracker.has(oldValue)) {
        (oldValue as NotebookPanel).content.activeCellChanged.disconnect(
          onActiveCellChanged
        );
      }

      // Wire up the new editor to the model if it exists
      if (newValue && consoleTracker.has(newValue)) {
        (newValue as ConsolePanel).console.promptCellCreated.connect(
          onPromptCreated
        );
        const prompt = (newValue as ConsolePanel).console.promptCell;
        item.model!.editor = prompt && prompt.editor;
      } else if (newValue && notebookTracker.has(newValue)) {
        (newValue as NotebookPanel).content.activeCellChanged.connect(
          onActiveCellChanged
        );
        const cell = (newValue as NotebookPanel).content.activeCell;
        item.model!.editor = cell && cell.editor;
      } else if (newValue && editorTracker.has(newValue)) {
        item.model!.editor = (newValue as IDocumentWidget<
          FileEditor
        >).content.editor;
      } else {
        item.model!.editor = null;
      }
    });

    // Add the status item to the status bar.
    statusBar.registerStatusItem(
      '@jupyterlab/statusbar-extension:line-col-status',
      {
        item,
        align: 'right',
        rank: 2,
        isActive: () => {
          const current = app.shell.currentWidget;
          return (
            current &&
            (notebookTracker.has(current) ||
              editorTracker.has(current) ||
              consoleTracker.has(current))
          );
        }
      }
    );
  }
};

/**
 * A plugin providing memory usage statistics to the application.
 *
 * #### Notes
 * This plugin will not work unless the memory usage server extension
 * is installed.
 */
export const memoryUsageItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar-extension:memory-usage-status',
  autoStart: true,
  requires: [IStatusBar],
  activate: (app: JupyterLab, statusBar: IStatusBar) => {
    let item = new MemoryUsage();

    statusBar.registerStatusItem(
      '@jupyterlab/statusbar-extension:memory-usage-status',
      {
        item,
        align: 'left',
        rank: 2,
        isActive: () => item.model!.metricsAvailable,
        activeStateChanged: item.model!.stateChanged
      }
    );
  }
};

/*
 * A plugin providing running terminals and sessions information
 * to the status bar.
 */
export const runningSessionsItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar-extension:running-sessions-status',
  autoStart: true,
  requires: [IStatusBar],
  activate: (app: JupyterLab, statusBar: IStatusBar) => {
    const item = new RunningSessions({
      onClick: () => app.shell.activateById('jp-running-sessions'),
      serviceManager: app.serviceManager
    });

    statusBar.registerStatusItem(
      '@jupyterlab/statusbar-extension:running-sessions-status',
      {
        item,
        align: 'left',
        rank: 0
      }
    );
  }
};

const plugins: JupyterLabPlugin<any>[] = [
  statusBar,
  lineColItem,
  kernelStatus,
  runningSessionsItem,
  memoryUsageItem
];

export default plugins;
