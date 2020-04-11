// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  CommandToolbarButton,
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  ReactWidget
} from '@jupyterlab/apputils';

import { IChangedArgs } from '@jupyterlab/coreutils';

import {
  ILoggerRegistry,
  LogConsolePanel,
  LoggerRegistry,
  LogLevel
} from '@jupyterlab/logconsole';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { IStatusBar } from '@jupyterlab/statusbar';

import {
  addIcon,
  clearIcon,
  HTMLSelect,
  listIcon
} from '@jupyterlab/ui-components';

import { UUID } from '@lumino/coreutils';

import { DockLayout, Widget } from '@lumino/widgets';

import * as React from 'react';

import { logNotebookOutput } from './nboutput';

import { LogConsoleStatus } from './status';

const LOG_CONSOLE_PLUGIN_ID = '@jupyterlab/logconsole-extension:plugin';

/**
 * The command IDs used by the plugin.
 */
namespace CommandIDs {
  export const addCheckpoint = 'logconsole:add-checkpoint';
  export const clear = 'logconsole:clear';
  export const open = 'logconsole:open';
  export const setLevel = 'logconsole:set-level';
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
    ICommandPalette,
    ILayoutRestorer,
    IMainMenu,
    ISettingRegistry,
    IStatusBar
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
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null,
  mainMenu: IMainMenu | null,
  settingRegistry: ISettingRegistry | null,
  statusBar: IStatusBar | null
): ILoggerRegistry {
  let logConsoleWidget: MainAreaWidget<LogConsolePanel> | null = null;
  let logConsolePanel: LogConsolePanel | null = null;

  const loggerRegistry = new LoggerRegistry({
    defaultRendermime: rendermime,
    // The maxLength is reset below from settings
    maxLength: 1000
  });

  const tracker = new WidgetTracker<MainAreaWidget<LogConsolePanel>>({
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
          ref: app.shell.currentWidget?.id
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

    logConsoleWidget = new MainAreaWidget({ content: logConsolePanel });
    logConsoleWidget.addClass('jp-LogConsole');
    logConsoleWidget.title.closable = true;
    logConsoleWidget.title.icon = listIcon;
    logConsoleWidget.title.label = 'Log Console';

    const addCheckpointButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.addCheckpoint
    });

    const clearButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.clear
    });

    logConsoleWidget.toolbar.addItem(
      'lab-log-console-add-checkpoint',
      addCheckpointButton
    );
    logConsoleWidget.toolbar.addItem('lab-log-console-clear', clearButton);

    logConsoleWidget.toolbar.addItem(
      'level',
      new LogLevelSwitcher(logConsoleWidget.content)
    );

    logConsolePanel.sourceChanged.connect(() => {
      app.commands.notifyCommandChanged();
    });

    logConsolePanel.sourceDisplayed.connect((panel, { source, version }) => {
      status.model.sourceDisplayed(source, version);
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
    void tracker.add(logConsoleWidget);

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

  app.commands.addCommand(CommandIDs.addCheckpoint, {
    execute: () => {
      logConsolePanel?.logger?.checkpoint();
    },
    icon: addIcon,
    isEnabled: () => !!logConsolePanel && logConsolePanel.source !== null,
    label: 'Add Checkpoint'
  });

  app.commands.addCommand(CommandIDs.clear, {
    execute: () => {
      logConsolePanel?.logger?.clear();
    },
    icon: clearIcon,
    isEnabled: () => !!logConsolePanel && logConsolePanel.source !== null,
    label: 'Clear Log'
  });

  function toTitleCase(value: string) {
    return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
  }

  app.commands.addCommand(CommandIDs.setLevel, {
    // TODO: find good icon class
    execute: (args: { level: LogLevel }) => {
      if (logConsolePanel?.logger) {
        logConsolePanel.logger.level = args.level;
      }
    },
    isEnabled: () => !!logConsolePanel && logConsolePanel.source !== null,
    label: args => `Set Log Level to ${toTitleCase(args.level as string)}`
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

  function setSource(newValue: Widget | null) {
    if (logConsoleWidget && newValue === logConsoleWidget) {
      // Do not change anything if we are just focusing on ourselves
      return;
    }

    let source: string | null;
    if (newValue && nbtracker.has(newValue)) {
      source = (newValue as NotebookPanel).context.path;
    } else {
      source = null;
    }
    if (logConsolePanel) {
      logConsolePanel.source = source;
    }
    status.model.source = source;
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
      status.model.flashEnabled = settings.get('flash').composite as boolean;
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
}

/**
 * A toolbar widget that switches log levels.
 */
export class LogLevelSwitcher extends ReactWidget {
  /**
   * Construct a new cell type switcher.
   */
  constructor(widget: LogConsolePanel) {
    super();
    this.addClass('jp-LogConsole-toolbarLogLevel');
    this._logConsole = widget;
    if (widget.source) {
      this.update();
    }
    widget.sourceChanged.connect(this._updateSource, this);
  }

  private _updateSource(
    sender: LogConsolePanel,
    { oldValue, newValue }: IChangedArgs<string | null>
  ) {
    // Transfer stateChanged handler to new source logger
    if (oldValue !== null) {
      const logger = sender.loggerRegistry.getLogger(oldValue);
      logger.stateChanged.disconnect(this.update, this);
    }
    if (newValue !== null) {
      const logger = sender.loggerRegistry.getLogger(newValue);
      logger.stateChanged.connect(this.update, this);
    }
    this.update();
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (this._logConsole.logger) {
      this._logConsole.logger.level = event.target.value as LogLevel;
    }
    this.update();
  };

  /**
   * Handle `keydown` events for the HTMLSelect component.
   */
  handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) {
      this._logConsole.activate();
    }
  };

  render() {
    const logger = this._logConsole.logger;
    return (
      <>
        <label
          htmlFor={this._id}
          className={
            logger === null
              ? 'jp-LogConsole-toolbarLogLevel-disabled'
              : undefined
          }
        >
          Log Level:
        </label>
        <HTMLSelect
          id={this._id}
          className="jp-LogConsole-toolbarLogLevelDropdown"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          value={logger?.level}
          aria-label="Log level"
          disabled={logger === null}
          options={
            logger === null
              ? []
              : [
                  'Critical',
                  'Error',
                  'Warning',
                  'Info',
                  'Debug'
                ].map(label => ({ label, value: label.toLowerCase() }))
          }
        />
      </>
    );
  }
  private _logConsole: LogConsolePanel;
  private _id = `level-${UUID.uuid4()}`;
}

export default [logConsolePlugin, logNotebookOutput];
