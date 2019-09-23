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
  IOutputLogRegistry,
  OutputLoggerView,
  OutputLogRegistry,
  ILogger,
  ILoggerChange,
  ILogRegistryChange
} from '@jupyterlab/outputconsole';

import { KernelMessage } from '@jupyterlab/services';

import { nbformat } from '@jupyterlab/coreutils';

import { ICommandPalette, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

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

const OUTPUT_CONSOLE_PLUGIN_ID = '@jupyterlab/outputconsole-extension:plugin';

/**
 * The Output Log extension.
 */
const outputLogPlugin: JupyterFrontEndPlugin<IOutputLogRegistry> = {
  activate: activateOutputLog,
  id: OUTPUT_CONSOLE_PLUGIN_ID,
  provides: IOutputLogRegistry,
  requires: [IMainMenu, ICommandPalette, INotebookTracker, IStatusBar],
  optional: [ILayoutRestorer, ISettingRegistry],
  autoStart: true
};

/*
 * A namespace for OutputStatusComponent.
 */
namespace OutputStatusComponent {
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
function OutputStatusComponent(
  props: OutputStatusComponent.IProps
): React.ReactElement<OutputStatusComponent.IProps> {
  return (
    <GroupItem
      spacing={0}
      onClick={props.handleClick}
      title={`${props.logCount} messages in Output Console`}
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
export class OutputStatus extends VDomRenderer<OutputStatus.Model> {
  /**
   * Construct the output console status widget.
   */
  constructor(opts: OutputStatus.IOptions) {
    super();
    this._handleClick = opts.handleClick;
    this.model = new OutputStatus.Model(opts.outputLogRegistry);
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
          this.model.isSourceOutputRead(this.model.activeSource)
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
        <OutputStatusComponent
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
export namespace OutputStatus {
  /**
   * A VDomModel for the OutputStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new OutputStatus model.
     */
    constructor(outputLogRegistry: IOutputLogRegistry) {
      super();

      this._outputLogRegistry = outputLogRegistry;

      this._outputLogRegistry.registryChanged.connect(
        (sender: IOutputLogRegistry, args: ILogRegistryChange) => {
          const loggers = this._outputLogRegistry.getLoggers();
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
        const logger = this._outputLogRegistry.getLogger(this._activeSource);
        return Math.min(logger.length, this._messageLimit);
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
    set messageLimit(limit: number) {
      if (limit > 0) {
        this._messageLimit = limit;

        // refresh rendering
        this.stateChanged.emit(void 0);
      }
    }

    markSourceOutputRead(name: string) {
      this._loggersWatched.set(name, true);
    }

    isSourceOutputRead(name: string): boolean {
      return (
        !this._loggersWatched.has(name) ||
        this._loggersWatched.get(name) === true
      );
    }

    public highlightingEnabled: boolean = true;
    public activeSourceChanged: boolean = false;
    private _outputLogRegistry: IOutputLogRegistry;
    private _activeSource: string = null;
    private _messageLimit: number = 1000;
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
    outputLogRegistry: IOutputLogRegistry;

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
function activateOutputLog(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu,
  palette: ICommandPalette,
  nbtracker: INotebookTracker,
  statusBar: IStatusBar,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry | null
): IOutputLogRegistry {
  let loggerWidget: MainAreaWidget<OutputLoggerView> = null;
  let messageLimit: number = 1000;
  let highlightingEnabled: boolean = true;

  const logRegistry = new OutputLogRegistry();
  const command = 'outputconsole:open';
  const category: string = 'Main Area';

  let tracker = new WidgetTracker<MainAreaWidget<OutputLoggerView>>({
    namespace: 'outputlogger'
  });

  if (restorer) {
    void restorer.restore(tracker, {
      command,
      args: obj => ({
        fromRestorer: true,
        activeSource: obj.content.activeSource
      }),
      name: () => 'outputLogger'
    });
  }

  const status = new OutputStatus({
    outputLogRegistry: logRegistry,
    handleClick: () => {
      if (!loggerWidget) {
        createLoggerWidget();
      } else {
        loggerWidget.activate();
      }

      // TODO, repeat in command?
      status.model.messageLimit = messageLimit;
      status.model.markSourceOutputRead(status.model.activeSource);
      status.model.highlightingEnabled = false;
      status.model.stateChanged.emit(void 0);
    }
  });

  const createLoggerWidget = () => {
    let activeSource: string = nbtracker.currentWidget
      ? nbtracker.currentWidget.context.path
      : null;

    const loggerView = new OutputLoggerView(logRegistry);
    loggerWidget = new MainAreaWidget({ content: loggerView });
    loggerWidget.addClass('lab-output-console');
    loggerWidget.title.closable = true;
    loggerWidget.title.label = 'Output Console';
    loggerWidget.title.iconClass = 'lab-output-console-icon';
    loggerView.messageLimit = messageLimit;

    app.shell.add(loggerWidget, 'main', {
      ref: '',
      mode: 'split-bottom'
    });

    loggerWidget.update();

    app.shell.activateById(loggerWidget.id);
    status.model.highlightingEnabled = false;

    if (activeSource) {
      loggerView.activeSource = activeSource;
    }

    const addTimestampButton = new ToolbarButton({
      onClick: (): void => {
        const logger = logRegistry.getLogger(loggerView.activeSource);
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
        const logger = logRegistry.getLogger(loggerView.activeSource);
        logger.clear();
      },
      iconClassName: 'fa fa-ban clear-icon',
      tooltip: 'Clear Logs',
      label: 'Clear Logs'
    });

    loggerWidget.toolbar.addItem(
      'lab-output-console-add-timestamp',
      addTimestampButton
    );
    loggerWidget.toolbar.addItem('lab-output-console-clear', clearButton);

    void tracker.add(loggerWidget);

    loggerWidget.disposed.connect(() => {
      loggerWidget = null;
      status.model.highlightingEnabled = highlightingEnabled;
    });
  };

  app.commands.addCommand(command, {
    label: 'Show Log Console',
    execute: (args: any) => {
      if (!loggerWidget) {
        createLoggerWidget();

        if (args && args.activeSource) {
          loggerWidget.content.activeSource = args.activeSource;
        }
      } else if (!(args && args.fromRestorer)) {
        loggerWidget.dispose();
      }
    },
    isToggled: () => {
      return loggerWidget !== null;
    }
  });

  mainMenu.viewMenu.addGroup([{ command }]);
  palette.addItem({ command, category });

  let appRestored = false;

  app.restored.then(() => {
    appRestored = true;
  });

  statusBar.registerStatusItem('@jupyterlab/outputconsole-extension:status', {
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
            const logger = logRegistry.getLogger(nb.context.path);
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
        if (loggerWidget) {
          loggerWidget.content.activeSource = sourceName;
          void tracker.save(loggerWidget);
        }
        status.model.activeSource = sourceName;
      });

      nb.disposed.connect((nb: NotebookPanel, args: void) => {
        const sourceName = nb.context.path;
        if (loggerWidget && loggerWidget.content.activeSource === sourceName) {
          loggerWidget.content.activeSource = null;
          void tracker.save(loggerWidget);
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
      messageLimit = maxLogEntries;

      if (loggerWidget) {
        loggerWidget.content.messageLimit = messageLimit;
      }
      status.model.messageLimit = messageLimit;

      highlightingEnabled = settings.get('flash').composite as boolean;
      status.model.highlightingEnabled = !loggerWidget && highlightingEnabled;
    };

    Promise.all([settingRegistry.load(OUTPUT_CONSOLE_PLUGIN_ID), app.restored])
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

  return logRegistry;
  // The notebook can call this command.
  // When is the output model disposed?
}

export default [outputLogPlugin];
