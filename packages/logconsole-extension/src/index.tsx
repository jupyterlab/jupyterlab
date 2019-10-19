// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  MainAreaWidget,
  WidgetTracker,
  CommandToolbarButton
} from '@jupyterlab/apputils';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import {
  ILoggerRegistry,
  LoggerRegistry,
  LogConsolePanel,
  ScrollingWidget
} from '@jupyterlab/logconsole';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IStatusBar } from '@jupyterlab/statusbar';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { DockLayout, Widget } from '@phosphor/widgets';
import { MessageLoop } from '@phosphor/messaging';

import { LogConsoleStatus } from './status';

const LOG_CONSOLE_PLUGIN_ID = '@jupyterlab/logconsole-extension:plugin';

/**
 * The command IDs used by the plugin.
 */
namespace CommandIDs {
  export const open = 'logconsole:open';

  export const addTimestamp = 'logconsole:add-timestamp';

  export const clear = 'logconsole:clear';
}

/**
 * The Log Console extension.
 */
const logConsolePlugin: JupyterFrontEndPlugin<ILoggerRegistry> = {
  activate: activateLogConsole,
  id: LOG_CONSOLE_PLUGIN_ID,
  provides: ILoggerRegistry,
  requires: [ILabShell, IRenderMimeRegistry, INotebookTracker],
  optional: [
    IMainMenu,
    ICommandPalette,
    IStatusBar,
    ILayoutRestorer,
    ISettingRegistry
  ],
  autoStart: true
};

/**
 * Activate the Log Console extension.
 */
function activateLogConsole(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  rendermime: IRenderMimeRegistry,
  nbtracker: INotebookTracker,
  mainMenu: IMainMenu | null,
  palette: ICommandPalette | null,
  statusBar: IStatusBar | null,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry | null
): ILoggerRegistry {
  let logConsoleWidget: MainAreaWidget = null;
  let logConsolePanel: LogConsolePanel = null;
  let flashEnabled: boolean = true;

  const loggerRegistry = new LoggerRegistry({
    defaultRendermime: rendermime,
    // The maxLength is reset below from settings
    maxLength: 1000
  });

  const tracker = new WidgetTracker<MainAreaWidget>({
    namespace: 'logconsole'
  });

  if (restorer) {
    void restorer.restore(tracker, {
      command: CommandIDs.open,
      name: () => 'logconsole'
    });
  }

  const status = new LogConsoleStatus({
    loggerRegistry: loggerRegistry,
    handleClick: () => {
      if (!logConsoleWidget) {
        createLogConsoleWidget({
          insertMode: 'split-bottom',
          ref: app.shell.currentWidget.id
        });
      } else {
        app.shell.activateById(logConsoleWidget.id);
      }
    }
  });

  interface ILogConsoleOptions {
    source?: string;
    insertMode?: DockLayout.InsertMode;
    ref?: string;
  }

  const createLogConsoleWidget = (options: ILogConsoleOptions = {}) => {
    logConsolePanel = new LogConsolePanel(loggerRegistry);

    logConsolePanel.source =
      options.source !== undefined
        ? options.source
        : nbtracker.currentWidget
        ? nbtracker.currentWidget.context.path
        : null;

    const scrolling = new ScrollingWidget({
      viewport: () => logConsoleWidget.node,
      content: logConsolePanel
    });
    // scrolling.addWidget(logConsolePanel);
    logConsoleWidget = new MainAreaWidget({ content: scrolling });
    logConsoleWidget.addClass('jp-LogConsole');
    logConsoleWidget.title.closable = true;
    logConsoleWidget.title.label = 'Log Console';
    logConsoleWidget.title.iconClass = 'jp-LogConsoleIcon';

    const addTimestampButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.addTimestamp
    });

    const clearButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.clear
    });

    logConsoleWidget.toolbar.addItem(
      'lab-output-console-add-timestamp',
      addTimestampButton
    );
    logConsoleWidget.toolbar.addItem('lab-output-console-clear', clearButton);

    void tracker.add(logConsoleWidget);

    MessageLoop.installMessageHook(logConsolePanel, (_, msg) => {
      switch (msg.type) {
        case 'after-show':
        case 'after-attach':
          // Because we are running in a message hook,
          // logConsolePanel.isVisible hasn't been updated yet, so we figure
          // out visibility based on the parent logConsoleWidget's visibility.
          if (logConsoleWidget.isVisible) {
            status.model.markSourceLogsViewed(logConsolePanel.source);
            status.model.flashEnabled = false;
          }
          break;
        case 'after-hide':
        case 'after-detach':
          status.model.flashEnabled = flashEnabled;
          break;
        default:
          break;
      }
      return true;
    });

    logConsolePanel.sourceChanged.connect(panel => {
      if (panel.isVisible && panel.source) {
        status.model.markSourceLogsViewed(panel.source);
      }
      app.commands.notifyCommandChanged();
    });

    logConsoleWidget.disposed.connect(() => {
      logConsoleWidget = null;
      logConsolePanel = null;
      app.commands.notifyCommandChanged();
    });

    app.shell.add(logConsoleWidget, 'main', {
      ref: options.ref,
      mode: options.insertMode
    });

    logConsoleWidget.update();
    app.commands.notifyCommandChanged();
  };

  app.commands.addCommand(CommandIDs.open, {
    label: 'Show Log Console',
    execute: (options: ILogConsoleOptions = {}) => {
      // Toggle the display
      if (logConsoleWidget) {
        logConsoleWidget.dispose();
      } else {
        createLogConsoleWidget(options);
      }
    },
    isToggled: () => {
      return logConsoleWidget !== null;
    }
  });

  app.commands.addCommand(CommandIDs.addTimestamp, {
    label: 'Add Timestamp',
    execute: () => {
      const logger = loggerRegistry.getLogger(logConsolePanel.source);
      logger.log({ type: 'html', data: '<hr>' });
    },
    isEnabled: () =>
      logConsolePanel && logConsolePanel.source !== null,
    iconClass: 'jp-AddIcon'
  });

  app.commands.addCommand(CommandIDs.clear, {
    label: 'Clear Log',
    execute: () => {
      const logger = loggerRegistry.getLogger(logConsolePanel.source);
      logger.clear();
    },
    isEnabled: () =>
      logConsolePanel && logConsolePanel.source !== null,
    iconClass: 'fa fa-ban clear-icon'
  });

  app.contextMenu.addItem({
    command: CommandIDs.open,
    selector: '.jp-Notebook'
  });
  if (mainMenu) {
    mainMenu.viewMenu.addGroup([{ command: CommandIDs.open }]);
  }
  if (palette) {
    palette.addItem({ command: CommandIDs.open, category: 'Main Area' });
  }
  if (statusBar) {
    statusBar.registerStatusItem('@jupyterlab/logconsole-extension:status', {
      item: status,
      align: 'left',
      isActive: () => true,
      activeStateChanged: status.model!.stateChanged
    });
  }

  function setSource(newValue: Widget) {
    if (logConsoleWidget && newValue === logConsoleWidget) {
      // Do not change anything if we are just focusing on ourself
      return;
    }

    let source: string | null;
    if (newValue && nbtracker.has(newValue)) {
      source = (newValue as NotebookPanel).context.path;
    } else {
      source = null;
    }

    status.model.source = source;
    if (logConsolePanel) {
      logConsolePanel.source = source;
      if (logConsolePanel.isVisible) {
        status.model.markSourceLogsViewed(source);
      }
    }
  }
  void app.restored.then(() => {
    // Set source only after app is restored in order to allow restorer to
    // restore previous source first, which may set the renderer
    setSource(labShell.currentWidget);
    labShell.currentChanged.connect((_, { newValue }) => setSource(newValue));
  });

  if (settingRegistry) {
    const updateSettings = (settings: ISettingRegistry.ISettings): void => {
      loggerRegistry.maxLength = settings.get('maxLogEntries')
        .composite as number;
      flashEnabled = settings.get('flash').composite as boolean;
      status.model.flashEnabled = !logConsoleWidget && flashEnabled;
    };

    Promise.all([settingRegistry.load(LOG_CONSOLE_PLUGIN_ID), app.restored])
      .then(([settings]) => {
        updateSettings(settings);
        settings.changed.connect(settings => {
          updateSettings(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  return loggerRegistry;
  // The notebook can call this command.
  // When is the output model disposed?
}

import { logNotebookOutput } from './nboutput';
export default [logConsolePlugin, logNotebookOutput];
