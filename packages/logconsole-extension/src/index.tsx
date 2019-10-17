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
  ILogger,
  ILoggerChange,
  ILoggerRegistryChange,
  DEFAULT_LOG_ENTRY_LIMIT
} from '@jupyterlab/logconsole';

import { ICommandPalette, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IMainMenu } from '@jupyterlab/mainmenu';

import React from 'react';

import {
  IStatusBar,
  GroupItem,
  IconItem,
  TextItem,
  interactiveItem
} from '@jupyterlab/statusbar';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { Signal } from '@phosphor/signaling';

import { DockLayout, Widget } from '@phosphor/widgets';
import { MessageLoop } from '@phosphor/messaging';

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
  requires: [
    ILabShell,
    IMainMenu,
    ICommandPalette,
    INotebookTracker,
    IStatusBar,
    IRenderMimeRegistry
  ],
  optional: [ILayoutRestorer, ISettingRegistry],
  autoStart: true
};

/*
 * A namespace for LogConsoleStatusComponent.
 */
namespace LogConsoleStatusComponent {
  /**
   * The props for the LogConsoleStatusComponent.
   */
  export interface IProps {
    /**
     * A click handler for the item. By default
     * Log Console panel is launched.
     */
    handleClick: () => void;

    /**
     * Number of logs.
     */
    logCount: number;
  }
}

/**
 * A pure functional component for a Log Console status item.
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for rendering the Log Console status.
 */
function LogConsoleStatusComponent(
  props: LogConsoleStatusComponent.IProps
): React.ReactElement<LogConsoleStatusComponent.IProps> {
  return (
    <GroupItem
      spacing={0}
      onClick={props.handleClick}
      title={`${props.logCount} logs in Log Console`}
    >
      <IconItem source={'jp-LogConsoleIcon'} />
      <TextItem source={props.logCount} />
    </GroupItem>
  );
}

/**
 * A VDomRenderer widget for displaying the status of Log Console logs.
 */
export class LogConsoleStatus extends VDomRenderer<LogConsoleStatus.Model> {
  /**
   * Construct the log console status widget.
   *
   * @param options - The status widget initialization options.
   */
  constructor(options: LogConsoleStatus.IOptions) {
    super();
    this._handleClick = options.handleClick;
    this.model = new LogConsoleStatus.Model(options.loggerRegistry);
    this.addClass(interactiveItem);
    this.addClass('jp-LogConsoleStatusItem');

    let flashRequestTimer: number = null;

    this.model.sourceChanged.connect(() => {
      if (
        this.model.source &&
        this.model.flashEnabled &&
        !this.model.isSourceLogsViewed(this.model.source) &&
        this.model.logCount > 0
      ) {
        this._showHighlighted();
      } else {
        this._clearHighlight();
      }
    });

    this.model.flashEnabledChanged.connect(() => {
      if (!this.model.flashEnabled) {
        this._clearHighlight();
      }
    });

    this.model.logChanged.connect(() => {
      if (!this.model.flashEnabled || this.model.logCount === 0) {
        // cancel existing request
        clearTimeout(flashRequestTimer);
        flashRequestTimer = null;
        this._clearHighlight();
        return;
      }

      const wasFlashed = this.hasClass('hilite') || this.hasClass('hilited');
      if (wasFlashed) {
        this._clearHighlight();
        // cancel previous request
        clearTimeout(flashRequestTimer);
        flashRequestTimer = setTimeout(() => {
          this._flashHighlight();
        }, 100);
      } else {
        this._flashHighlight();
      }
    });
  }

  /**
   * Render the log console status item.
   */
  render() {
    if (this.model === null) {
      return null;
    } else {
      return (
        <LogConsoleStatusComponent
          handleClick={this._handleClick}
          logCount={this.model.logCount}
        />
      );
    }
  }

  private _flashHighlight() {
    this.addClass('hilite');
  }

  private _showHighlighted() {
    this.addClass('hilited');
  }

  private _clearHighlight() {
    this.removeClass('hilite');
    this.removeClass('hilited');
  }

  private _handleClick: () => void;
}

/**
 * A namespace for Log Console log status.
 */
export namespace LogConsoleStatus {
  /**
   * A VDomModel for the LogConsoleStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new LogConsoleStatus model.
     *
     * @param loggerRegistry - The logger registry providing the logs.
     */
    constructor(loggerRegistry: ILoggerRegistry) {
      super();

      this._loggerRegistry = loggerRegistry;

      this._loggerRegistry.registryChanged.connect(
        (sender: ILoggerRegistry, args: ILoggerRegistryChange) => {
          const loggers = this._loggerRegistry.getLoggers();
          for (let logger of loggers) {
            if (this._loggersWatched.has(logger.source)) {
              continue;
            }

            logger.logChanged.connect(
              (sender: ILogger, change: ILoggerChange) => {
                if (sender.source === this._source) {
                  this.stateChanged.emit();
                  this.logChanged.emit();
                }

                // mark logger as dirty
                this._loggersWatched.set(sender.source, false);
              }
            );

            // mark logger as viewed
            this._loggersWatched.set(logger.source, true);
          }
        }
      );
    }

    /**
     * Number of logs.
     */
    get logCount(): number {
      if (this._source) {
        const logger = this._loggerRegistry.getLogger(this._source);
        return Math.min(logger.length, this._entryLimit);
      }

      return 0;
    }

    /**
     * The name of the active log source
     */
    get source(): string {
      return this._source;
    }

    set source(name: string) {
      if (this._source === name) {
        return;
      }

      this._source = name;
      this.sourceChanged.emit();

      // refresh rendering
      this.stateChanged.emit();
    }

    /**
     * Flag to toggle flashing when new logs added.
     */
    get flashEnabled(): boolean {
      return this._flashEnabled;
    }

    set flashEnabled(enabled: boolean) {
      if (this._flashEnabled === enabled) {
        return;
      }

      this._flashEnabled = enabled;
      this.flashEnabledChanged.emit();

      // refresh rendering
      this.stateChanged.emit();
    }

    /**
     * Log output entry limit.
     */
    set entryLimit(limit: number) {
      if (limit > 0) {
        this._entryLimit = limit;

        // refresh rendering
        this.stateChanged.emit();
      }
    }

    /**
     * Mark logs from the source as viewed.
     *
     * @param source - The name of the log source.
     */
    markSourceLogsViewed(source: string) {
      this._loggersWatched.set(source, true);
    }

    /**
     * Check if logs from the source are viewed.
     *
     * @param source - The name of the log source.
     *
     * @returns True if logs from source are viewer.
     */
    isSourceLogsViewed(source: string): boolean {
      return (
        !this._loggersWatched.has(source) ||
        this._loggersWatched.get(source) === true
      );
    }

    /**
     * A signal emitted when the log model changes.
     */
    public logChanged = new Signal<this, void>(this);
    /**
     * A signal emitted when the active log source changes.
     */
    public sourceChanged = new Signal<this, void>(this);
    /**
     * A signal emitted when the flash enablement changes.
     */
    public flashEnabledChanged = new Signal<this, void>(this);
    private _flashEnabled: boolean = true;
    private _loggerRegistry: ILoggerRegistry;
    private _source: string = null;
    private _entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
    // A map storing keys as source names of the loggers watched
    // and values as whether logs from the source are viewed
    private _loggersWatched: Map<string, boolean> = new Map();
  }

  /**
   * Options for creating a new LogConsoleStatus item
   */
  export interface IOptions {
    /**
     * The logger registry providing the logs.
     */
    loggerRegistry: ILoggerRegistry;

    /**
     * A click handler for the item. By default
     * Log Console panel is launched.
     */
    handleClick: () => void;
  }
}

/**
 * Activate the Log Console extension.
 */
function activateLogConsole(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  mainMenu: IMainMenu,
  palette: ICommandPalette,
  nbtracker: INotebookTracker,
  statusBar: IStatusBar,
  rendermime: IRenderMimeRegistry,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry | null
): ILoggerRegistry {
  let logConsoleWidget: MainAreaWidget<LogConsolePanel> = null;
  let entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
  let flashEnabled: boolean = true;

  const loggerRegistry = new LoggerRegistry(rendermime);

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
          ref: app.shell.currentWidget.id
        });
      } else {
        logConsoleWidget.activate();
      }
    }
  });

  interface ILogConsoleOptions {
    source?: string;
    insertMode?: DockLayout.InsertMode;
    ref?: string;
  }

  const createLogConsoleWidget = (options: ILogConsoleOptions = {}) => {
    const logConsolePanel = new LogConsolePanel(loggerRegistry);

    logConsolePanel.source =
      options.source !== undefined
        ? options.source
        : nbtracker.currentWidget
        ? nbtracker.currentWidget.context.path
        : null;

    logConsoleWidget = new MainAreaWidget({ content: logConsolePanel });
    logConsoleWidget.addClass('jp-LogConsole');
    logConsoleWidget.title.closable = true;
    logConsoleWidget.title.label = 'Log Console';
    logConsoleWidget.title.iconClass = 'jp-LogConsoleIcon';
    logConsolePanel.entryLimit = entryLimit;

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
          status.model.markSourceLogsViewed(status.model.source);
          status.model.flashEnabled = false;
          break;
        case 'after-hide':
          status.model.flashEnabled = flashEnabled;
          break;
        default:
          break;
      }
      return true;
    });

    logConsolePanel.sourceChanged.connect(() => {
      app.commands.notifyCommandChanged();
    });

    logConsoleWidget.disposed.connect(() => {
      logConsoleWidget = null;
      app.commands.notifyCommandChanged();
      status.model.flashEnabled = flashEnabled;
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
      const logger = loggerRegistry.getLogger(logConsoleWidget.content.source);
      logger.log({ type: 'html', data: '<hr>' });
    },
    isEnabled: () =>
      logConsoleWidget && logConsoleWidget.content.source !== null,
    iconClass: 'jp-AddIcon'
  });

  app.commands.addCommand(CommandIDs.clear, {
    label: 'Clear Log',
    execute: () => {
      const logger = loggerRegistry.getLogger(logConsoleWidget.content.source);
      logger.clear();
    },
    isEnabled: () =>
      logConsoleWidget && logConsoleWidget.content.source !== null,
    iconClass: 'fa fa-ban clear-icon'
  });

  mainMenu.viewMenu.addGroup([{ command: CommandIDs.open }]);
  palette.addItem({ command: CommandIDs.open, category: 'Main Area' });
  app.contextMenu.addItem({
    command: CommandIDs.open,
    selector: '.jp-Notebook'
  });
  statusBar.registerStatusItem('@jupyterlab/logconsole-extension:status', {
    item: status,
    align: 'left',
    isActive: () => true,
    activeStateChanged: status.model!.stateChanged
  });

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
    if (logConsoleWidget) {
      logConsoleWidget.content.source = source;
      // We don't need to save the source, since when we restore we just pick
      // up whatever source is currently active.
      // void tracker.save(logConsoleWidget);
      if (logConsoleWidget.isVisible) {
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
      const maxLogEntries = settings.get('maxLogEntries').composite as number;
      entryLimit = maxLogEntries;

      if (logConsoleWidget) {
        logConsoleWidget.content.entryLimit = entryLimit;
      }
      status.model.entryLimit = entryLimit;

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

export default [logConsolePlugin];
