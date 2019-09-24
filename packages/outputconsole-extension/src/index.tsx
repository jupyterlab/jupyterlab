/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  MainAreaWidget,
  WidgetTracker,
  ToolbarButton
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
} from '@jupyterlab/outputconsole';

import { KernelMessage } from '@jupyterlab/services';

import { nbformat } from '@jupyterlab/coreutils';

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

const LOG_CONSOLE_PLUGIN_ID = '@jupyterlab/logconsole-extension:plugin';

/**
 * The Output Log extension.
 */
const logConsolePlugin: JupyterFrontEndPlugin<ILoggerRegistry> = {
  activate: activateLogConsole,
  id: LOG_CONSOLE_PLUGIN_ID,
  provides: ILoggerRegistry,
  requires: [
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
 * A namespace for OutputStatusComponent.
 */
namespace LogConsoleStatusComponent {
  /**
   * The props for the OutputStatusComponent.
   */
  export interface IProps {
    /**
     * A click handler for the item. By default
     * Output Console panel is launched.
     */
    handleClick: () => void;

    /**
     * Number of logs.
     */
    logCount: number;
  }
}

/**
 * A pure functional component for a Output Console status item.
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for rendering the Output Console logs.
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
      <IconItem
        source={'jp-StatusItem-output-console lab-output-console-icon'}
      />
      <TextItem source={props.logCount} />
    </GroupItem>
  );
}

/**
 * A VDomRenderer widget for displaying the status of Output Console logs.
 */
export class LogConsoleStatus extends VDomRenderer<LogConsoleStatus.Model> {
  /**
   * Construct the output console status widget.
   */
  constructor(opts: LogConsoleStatus.IOptions) {
    super();
    this._handleClick = opts.handleClick;
    this.model = new LogConsoleStatus.Model(opts.loggerRegistry);
    this.addClass(interactiveItem);
    this.addClass('outputconsole-status-item');

    let timer: number = null;

    this.model.stateChanged.connect(() => {
      if (!this.model.highlightingEnabled || this.model.logCount === 0) {
        this._clearHighlight();
        this.model.activeSourceChanged = false;
        return;
      }

      if (this.model.activeSourceChanged) {
        if (
          !this.model.activeSource ||
          this.model.isSourceLogsRead(this.model.activeSource)
        ) {
          this._clearHighlight();
        } else {
          this._showHighlighted();
        }

        this.model.activeSourceChanged = false;
        return;
      }

      // new message arrived
      const wasHilited = this.hasClass('hilite') || this.hasClass('hilited');
      if (wasHilited) {
        this._clearHighlight();
        // cancel previous request
        clearTimeout(timer);
        timer = setTimeout(() => {
          this._flashHighlight();
        }, 100);
      } else {
        this._flashHighlight();
      }
    });
  }

  /**
   * Render the output console status item.
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
 * A namespace for Output Console log status.
 */
export namespace LogConsoleStatus {
  /**
   * A VDomModel for the OutputStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new OutputStatus model.
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
              (sender: ILogger, args: ILoggerChange) => {
                if (sender.source === this._activeSource) {
                  this.stateChanged.emit(void 0);
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

    get logCount(): number {
      if (this._activeSource) {
        const logger = this._loggerRegistry.getLogger(this._activeSource);
        return Math.min(logger.length, this._entryLimit);
      }

      return 0;
    }

    get activeSource(): string {
      return this._activeSource;
    }

    set activeSource(name: string) {
      this._activeSource = name;
      this.activeSourceChanged = true;

      // refresh rendering
      this.stateChanged.emit(void 0);
    }

    /**
     * Sets message entry limit.
     */
    set entryLimit(limit: number) {
      if (limit > 0) {
        this._entryLimit = limit;

        // refresh rendering
        this.stateChanged.emit(void 0);
      }
    }

    markSourceLogsRead(name: string) {
      this._loggersWatched.set(name, true);
    }

    isSourceLogsRead(name: string): boolean {
      return (
        !this._loggersWatched.has(name) ||
        this._loggersWatched.get(name) === true
      );
    }

    public highlightingEnabled: boolean = true;
    public activeSourceChanged: boolean = false;
    private _loggerRegistry: ILoggerRegistry;
    private _activeSource: string = null;
    private _entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
    private _loggersWatched: Map<string, boolean> = new Map();
  }

  /**
   * Options for creating a new OutputStatus item
   */
  export interface IOptions {
    /**
     * Output Console widget which provides
     * Output Console interface and access to log info
     */
    loggerRegistry: ILoggerRegistry;

    /**
     * A click handler for the item. By default
     * Output Console panel is launched.
     */
    handleClick: () => void;
  }
}

/**
 * Activate the Output Log extension.
 */
function activateLogConsole(
  app: JupyterFrontEnd,
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
  let highlightingEnabled: boolean = true;

  const loggerRegistry = new LoggerRegistry(rendermime);
  const command = 'logconsole:open';
  const category: string = 'Main Area';

  const tracker = new WidgetTracker<MainAreaWidget<LogConsolePanel>>({
    namespace: 'logconsole'
  });

  if (restorer) {
    void restorer.restore(tracker, {
      command,
      args: obj => ({
        fromRestorer: true,
        activeSource: obj.content.activeSource
      }),
      name: () => 'logconsole'
    });
  }

  const status = new LogConsoleStatus({
    loggerRegistry: loggerRegistry,
    handleClick: () => {
      if (!logConsoleWidget) {
        createLogConsoleWidget();
      } else {
        logConsoleWidget.activate();
      }

      // TODO, repeat in command?
      status.model.entryLimit = entryLimit;
      status.model.markSourceLogsRead(status.model.activeSource);
      status.model.highlightingEnabled = false;
      status.model.stateChanged.emit(void 0);
    }
  });

  const createLogConsoleWidget = () => {
    let activeSource: string = nbtracker.currentWidget
      ? nbtracker.currentWidget.context.path
      : null;

    const logConsolePanel = new LogConsolePanel(loggerRegistry);
    logConsoleWidget = new MainAreaWidget({ content: logConsolePanel });
    logConsoleWidget.addClass('lab-output-console');
    logConsoleWidget.title.closable = true;
    logConsoleWidget.title.label = 'Log Console';
    logConsoleWidget.title.iconClass = 'lab-output-console-icon';
    logConsolePanel.entryLimit = entryLimit;

    app.shell.add(logConsoleWidget, 'main', {
      ref: '',
      mode: 'split-bottom'
    });

    logConsoleWidget.update();

    app.shell.activateById(logConsoleWidget.id);
    status.model.highlightingEnabled = false;

    if (activeSource) {
      logConsolePanel.activeSource = activeSource;
    }

    const addTimestampButton = new ToolbarButton({
      onClick: (): void => {
        if (!logConsolePanel.activeSource) {
          return;
        }

        const logger = loggerRegistry.getLogger(logConsolePanel.activeSource);
        logger.log({
          data: {
            'text/html': '<hr>'
          },
          output_type: 'display_data'
        });
      },
      iconClassName: 'jp-AddIcon',
      tooltip: 'Add Timestamp',
      label: 'Add Timestamp'
    });

    const clearButton = new ToolbarButton({
      onClick: (): void => {
        const logger = loggerRegistry.getLogger(logConsolePanel.activeSource);
        logger.clear();
      },
      iconClassName: 'fa fa-ban clear-icon',
      tooltip: 'Clear Logs',
      label: 'Clear Logs'
    });

    logConsoleWidget.toolbar.addItem(
      'lab-output-console-add-timestamp',
      addTimestampButton
    );
    logConsoleWidget.toolbar.addItem('lab-output-console-clear', clearButton);

    void tracker.add(logConsoleWidget);

    logConsoleWidget.disposed.connect(() => {
      logConsoleWidget = null;
      status.model.highlightingEnabled = highlightingEnabled;
    });
  };

  app.commands.addCommand(command, {
    label: 'Show Log Console',
    execute: (args: any) => {
      if (!logConsoleWidget) {
        createLogConsoleWidget();

        if (args && args.activeSource) {
          logConsoleWidget.content.activeSource = args.activeSource;
        }
      } else if (!(args && args.fromRestorer)) {
        logConsoleWidget.dispose();
      }
    },
    isToggled: () => {
      return logConsoleWidget !== null;
    }
  });

  mainMenu.viewMenu.addGroup([{ command }]);
  palette.addItem({ command, category });
  app.contextMenu.addItem({
    command: command,
    selector: '.jp-Notebook'
  });

  let appRestored = false;

  app.restored.then(() => {
    appRestored = true;
  });

  statusBar.registerStatusItem('@jupyterlab/logconsole-extension:status', {
    item: status,
    align: 'left',
    isActive: () => true,
    activeStateChanged: status.model!.stateChanged
  });

  nbtracker.widgetAdded.connect(
    (sender: INotebookTracker, nb: NotebookPanel) => {
      //// TEST ////
      nb.context.session.iopubMessage.connect(
        (_, msg: KernelMessage.IIOPubMessage) => {
          if (
            KernelMessage.isDisplayDataMsg(msg) ||
            KernelMessage.isStreamMsg(msg) ||
            KernelMessage.isErrorMsg(msg)
          ) {
            const logger = loggerRegistry.getLogger(nb.context.path);
            logger.rendermime = nb.content.rendermime;
            const output: nbformat.IOutput = {
              ...msg.content,
              output_type: msg.header.msg_type
            };
            logger.log(output);
          }
        }
      );
      //// TEST ////

      nb.activated.connect((nb: NotebookPanel, args: void) => {
        // set activeSource only after app is restored
        // in order to allow restorer to restore previous activeSource
        if (!appRestored) {
          return;
        }

        const sourceName = nb.context.path;
        if (logConsoleWidget) {
          logConsoleWidget.content.activeSource = sourceName;
          void tracker.save(logConsoleWidget);
        }
        status.model.activeSource = sourceName;
      });

      nb.disposed.connect((nb: NotebookPanel, args: void) => {
        const sourceName = nb.context.path;
        if (
          logConsoleWidget &&
          logConsoleWidget.content.activeSource === sourceName
        ) {
          logConsoleWidget.content.activeSource = null;
          void tracker.save(logConsoleWidget);
        }
        if (status.model.activeSource === sourceName) {
          status.model.activeSource = null;
        }
      });
    }
  );

  if (settingRegistry) {
    const updateSettings = (settings: ISettingRegistry.ISettings): void => {
      const maxLogEntries = settings.get('maxLogEntries').composite as number;
      entryLimit = maxLogEntries;

      if (logConsoleWidget) {
        logConsoleWidget.content.entryLimit = entryLimit;
      }
      status.model.entryLimit = entryLimit;

      highlightingEnabled = settings.get('flash').composite as boolean;
      status.model.highlightingEnabled =
        !logConsoleWidget && highlightingEnabled;
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
