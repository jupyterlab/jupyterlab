// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module logconsole-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import {
  ILoggerRegistry,
  LogConsolePanel,
  LoggerRegistry,
  LogLevel
} from '@jupyterlab/logconsole';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  addIcon,
  clearIcon,
  CommandToolbarButton,
  HTMLSelect,
  listIcon,
  ReactWidget
} from '@jupyterlab/ui-components';
import { UUID } from '@lumino/coreutils';
import { DockLayout } from '@lumino/widgets';
import * as React from 'react';
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
  description: 'Provides the logger registry.',
  provides: ILoggerRegistry,
  requires: [IRenderMimeRegistry, ITranslator],
  optional: [
    ILabShell,
    ICommandPalette,
    ILayoutRestorer,
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
  rendermime: IRenderMimeRegistry,
  translator: ITranslator,
  labShell: ILabShell | null,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry | null,
  statusBar: IStatusBar | null
): ILoggerRegistry {
  const trans = translator.load('jupyterlab');
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
    },
    translator
  });

  const getCurrentWidgetPath = () => {
    const currentWidget = app.shell.currentWidget;
    if (labShell?.currentPath) {
      return labShell.currentPath;
    }
    // For other shells, set the source to the current widget path
    if (currentWidget && currentWidget instanceof DocumentWidget) {
      return currentWidget.context.path;
    }
    return null;
  };

  interface ILogConsoleOptions {
    source?: string;
    insertMode?: DockLayout.InsertMode;
    ref?: string;
  }

  const createLogConsoleWidget = (options: ILogConsoleOptions = {}) => {
    logConsolePanel = new LogConsolePanel(loggerRegistry, translator);

    logConsolePanel.source = options.source ?? getCurrentWidgetPath() ?? null;

    logConsoleWidget = new MainAreaWidget({ content: logConsolePanel });
    logConsoleWidget.addClass('jp-LogConsole');
    logConsoleWidget.title.closable = true;
    logConsoleWidget.title.icon = listIcon;
    logConsoleWidget.title.label = trans.__('Log Console');

    const addCheckpointButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.addCheckpoint
    });

    const clearButton = new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.clear
    });

    const notifyCommands = () => {
      app.commands.notifyCommandChanged(CommandIDs.addCheckpoint);
      app.commands.notifyCommandChanged(CommandIDs.clear);
      app.commands.notifyCommandChanged(CommandIDs.open);
      app.commands.notifyCommandChanged(CommandIDs.setLevel);
    };

    logConsoleWidget.toolbar.addItem(
      'lab-log-console-add-checkpoint',
      addCheckpointButton
    );
    logConsoleWidget.toolbar.addItem('lab-log-console-clear', clearButton);

    logConsoleWidget.toolbar.addItem(
      'level',
      new LogLevelSwitcher(logConsoleWidget.content, translator)
    );

    logConsolePanel.sourceChanged.connect(() => {
      notifyCommands();
    });

    logConsolePanel.sourceDisplayed.connect((panel, { source, version }) => {
      status.model.sourceDisplayed(source, version);
    });

    logConsoleWidget.disposed.connect(() => {
      logConsoleWidget = null;
      logConsolePanel = null;
      notifyCommands();
    });

    app.shell.add(logConsoleWidget, 'down', {
      ref: options.ref,
      mode: options.insertMode,
      type: 'Log Console'
    });
    void tracker.add(logConsoleWidget);
    app.shell.activateById(logConsoleWidget.id);

    logConsoleWidget.update();
    notifyCommands();
  };

  app.commands.addCommand(CommandIDs.open, {
    label: trans.__('Show Log Console'),
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
    label: trans.__('Add Checkpoint')
  });

  app.commands.addCommand(CommandIDs.clear, {
    execute: () => {
      logConsolePanel?.logger?.clear();
    },
    icon: clearIcon,
    isEnabled: () => !!logConsolePanel && logConsolePanel.source !== null,
    label: trans.__('Clear Log')
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
    label: args =>
      args['level']
        ? trans.__('Set Log Level to %1', toTitleCase(args.level as string))
        : trans.__('Set log level to `level`.')
  });

  if (palette) {
    palette.addItem({
      command: CommandIDs.open,
      category: trans.__('Main Area')
    });
  }
  if (statusBar) {
    statusBar.registerStatusItem('@jupyterlab/logconsole-extension:status', {
      item: status,
      align: 'left',
      isActive: () => status.model?.version > 0,
      activeStateChanged: status.model!.stateChanged
    });
  }

  function setSource(source: string | null) {
    if (logConsolePanel) {
      logConsolePanel.source = source;
    }
    status.model.source = source;
  }
  void app.restored.then(() => {
    // Set source only after app is restored in order to allow restorer to
    // restore previous source first, which may set the renderer
    if (labShell) {
      labShell.currentPathChanged.connect((_, { newValue }) =>
        setSource(newValue)
      );
      setSource(labShell.currentPath ?? null);
    } else {
      setSource(getCurrentWidgetPath());
    }
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
   * Construct a new log level switcher.
   */
  constructor(widget: LogConsolePanel, translator?: ITranslator) {
    super();
    this.translator = translator ?? nullTranslator;
    this._trans = this.translator.load('jupyterlab');
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

  render(): JSX.Element {
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
          {this._trans.__('Log Level:')}
        </label>
        <HTMLSelect
          id={this._id}
          className="jp-LogConsole-toolbarLogLevelDropdown"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          value={logger?.level}
          aria-label={this._trans.__('Log level')}
          disabled={logger === null}
          options={
            logger === null
              ? []
              : [
                  [this._trans.__('Critical'), 'Critical'],
                  [this._trans.__('Error'), 'Error'],
                  [this._trans.__('Warning'), 'Warning'],
                  [this._trans.__('Info'), 'Info'],
                  [this._trans.__('Debug'), 'Debug']
                ].map(data => ({
                  label: data[0],
                  value: data[1].toLowerCase()
                }))
          }
        />
      </>
    );
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _logConsole: LogConsolePanel;
  private _id = `level-${UUID.uuid4()}`;
}

export default logConsolePlugin;
