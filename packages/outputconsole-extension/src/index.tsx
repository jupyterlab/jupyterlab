/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  VDomModel,
  VDomRenderer,
  ToolbarButtonComponent,
  ICommandPalette
} from '@jupyterlab/apputils';

import React from 'react';

import {
  SessionManager,
  Kernel,
  KernelMessage,
  Session
} from '@jupyterlab/services';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { IDisposable, DisposableDelegate } from '@phosphor/disposable';

import {
  IOutputConsole,
  IOutputLogPayload,
  IOutputLogFilter,
  OutputConsoleWidget
} from '@jupyterlab/outputconsole';

/**
 * The Output Console extension.
 */
const outputConsolePlugin: JupyterFrontEndPlugin<IOutputConsole> = {
  activate: activateOutputConsole,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputConsole,
  requires: [IMainMenu, ICommandPalette, IRenderMimeRegistry],
  autoStart: true
};

/**
 * A VDomRenderer widget for displaying the status of Output Console logs on Notebook toolbar.
 */
export class OutputStatusToolbarWidget extends VDomRenderer<VDomModel> {
  /**
   * Construct the output console status toolbar widget.
   */
  constructor(opts: OutputStatusToolbarWidget.IOptions) {
    super();

    this._toolbarButtonProps = opts.toolbarButtonProps;
    this._outputConsoleWidget = opts.outputConsoleWidget;
    this._filter = opts.filter;
    this.model = new VDomModel();
    this.addClass('outputconsole-toolbar-status');

    this._outputConsoleWidget.madeVisible.connect(
      this._onOutputConsoleMadeVisible,
      this
    );
    this.model.stateChanged.connect(this._onModelStateChanged, this);
  }

  /**
   * Render the output console status toolbar widget.
   */
  render() {
    return <ToolbarButtonComponent {...this._toolbarButtonProps} />;
  }

  /**
   * Dispose of the resources used by the toolbar widget.
   */
  dispose() {
    clearTimeout(this._timerId);
    this._outputConsoleWidget.madeVisible.disconnect(
      this._onOutputConsoleMadeVisible,
      this
    );

    super.dispose();
  }

  /**
   * Handle Output Console's mode visibile event.
   */
  private _onOutputConsoleMadeVisible(
    sender: OutputConsoleWidget,
    args: void
  ): void {
    this.removeClass('hilite');
  }

  /**
   * Handle changes to toolbar widget model state.
   */
  private _onModelStateChanged(sender: VDomModel, args: void): void {
    const logCount = this._outputConsoleWidget.outputConsole.logCount(
      this._filter
    );
    const flash = !this._outputConsoleWidget.isAttached && logCount > 0;

    this._toolbarButtonProps.label = `${logCount} Messages`;
    this._toolbarButtonProps.tooltip = `${logCount} Messages in Output Console`;

    const wasHilited = this.hasClass('hilite');

    if (wasHilited) {
      this.removeClass('hilite');
      // cancel previous request
      clearTimeout(this._timerId);
      this._timerId = null;
      if (flash) {
        this._timerId = setTimeout(() => {
          this.addClass('hilite');
        }, 100);
      }
    } else if (flash) {
      this.addClass('hilite');
    }
  }

  private _toolbarButtonProps: ToolbarButtonComponent.IProps;
  private _outputConsoleWidget: OutputConsoleWidget;
  private _filter?: IOutputLogFilter;
  private _timerId: number = null;
}

/**
 * A namespace for Output Console log status toolbar widget.
 */
export namespace OutputStatusToolbarWidget {
  /**
   * Options for creating a new OutputStatusToolbarWidget
   */
  export interface IOptions {
    /**
     * Properties to use when creating underlying
     * ToolbarButtonComponent widget
     */
    toolbarButtonProps: ToolbarButtonComponent.IProps;

    /**
     * Output Console widget which provides
     * Output Console interface and access to log info
     */
    outputConsoleWidget: OutputConsoleWidget;

    /**
     * Filter to apply to console logs
     * when accessing the log count
     */
    filter?: IOutputLogFilter;
  }
}

const NOTEBOOK_ICON_CLASS = 'jp-NotebookIcon';
const CONSOLE_ICON_CLASS = 'jp-CodeConsoleIcon';

/**
 * Activate the Output Console extension.
 */
function activateOutputConsole(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu,
  palette: ICommandPalette,
  rendermime: IRenderMimeRegistry
): IOutputConsole {
  const outputConsoleWidget = new OutputConsoleWidget(rendermime);

  const addWidgetToMainArea = () => {
    app.shell.add(outputConsoleWidget, 'main', {
      ref: '',
      mode: 'split-bottom'
    });
    outputConsoleWidget.update();
    app.shell.activateById(outputConsoleWidget.id);
  };

  const showMessagesByFilter = (filter?: IOutputLogFilter) => {
    outputConsoleWidget.applyFilter(filter);
  };

  let lastKernelSession = '';
  let lastMsg: KernelMessage.IMessage = null;

  const messageCanBeRendered = (msgInfo: Kernel.IAnyMessageArgs): boolean => {
    return (
      msgInfo.direction === 'recv' &&
      msgInfo.msg.channel === 'iopub' &&
      [
        'execute_result',
        'display_data',
        'stream',
        'error',
        'update_display_data'
      ].includes(msgInfo.msg.header.msg_type)
    );
  };

  const sameAsLastMessage = (msgInfo: Kernel.IAnyMessageArgs): boolean => {
    const msg = msgInfo.msg;
    return (
      lastMsg &&
      msg.header.msg_type === lastMsg.header.msg_type &&
      msg.header.msg_id === lastMsg.header.msg_id &&
      lastKernelSession === msg.header.session
    );
  };

  app.serviceManager.anyMessage.connect(
    (sessionManager: SessionManager, msgInfo: Kernel.IAnyMessageArgs) => {
      if (!messageCanBeRendered(msgInfo) || sameAsLastMessage(msgInfo)) {
        return;
      }

      const msg = msgInfo.msg;
      lastMsg = msg;
      lastKernelSession = msg.header.session;

      sessionManager
        .findByKernelClientId(
          (msg.parent_header as KernelMessage.IHeader).session
        )
        .then((session: Session.IModel) => {
          const sourceIconClassName =
            session.type === 'notebook'
              ? NOTEBOOK_ICON_CLASS
              : session.type === 'console'
              ? CONSOLE_ICON_CLASS
              : undefined;

          outputConsoleWidget.outputConsole.logMessage({
            sourceName: session.name,
            sourceIconClassName: sourceIconClassName,
            msg: msg as KernelMessage.IIOPubMessage
          });
        });
    }
  );

  const category: string = 'Main Area';
  const command: string = 'log:jlab-output-console';

  app.commands.addCommand(command, {
    label: 'Output Console',
    execute: (args: any) => {
      if (outputConsoleWidget.isAttached) {
        outputConsoleWidget.close();
      } else {
        addWidgetToMainArea();
        showMessagesByFilter();
      }
    },
    isToggled: (): boolean => {
      return outputConsoleWidget.isAttached;
    }
  });

  mainMenu.viewMenu.addGroup([{ command }]);
  palette.addItem({ command, category });

  /**
   * A Notebook Toolbar button extension to display the status of Output Console logs.
   */
  class NotebookToolbarButtonExtension
    implements
      DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
    /**
     * Create a new extension for Notebook Panel.
     */
    createNew(
      panel: NotebookPanel,
      context: DocumentRegistry.IContext<INotebookModel>
    ): IDisposable {
      panel.session.ready.then(() => {
        const logFilter = { session: panel.session.kernel.clientId };
        this._logFilter = logFilter;
        this._toolbarWidget = new OutputStatusToolbarWidget({
          toolbarButtonProps: {
            label: '',
            tooltip: '',
            iconClassName: 'fa fa-list',
            onClick: () => {
              if (!outputConsoleWidget.isAttached) {
                addWidgetToMainArea();
              }
              showMessagesByFilter(logFilter);
            }
          },
          outputConsoleWidget: outputConsoleWidget,
          filter: this._logFilter
        });

        outputConsoleWidget.outputConsole
          .onLogMessage(this._logFilter)
          .connect(this._onLogMessage(), this);

        outputConsoleWidget.logsCleared.connect(this._onLogsCleared(), this);

        panel.toolbar.insertBefore(
          'kernelName',
          'outputConsole',
          this._toolbarWidget
        );

        this._toolbarWidget.model.stateChanged.emit(void 0);

        panel.activated.connect((sender: NotebookPanel) => {
          if (outputConsoleWidget.isAttached) {
            showMessagesByFilter(logFilter);
          }
        });
      });

      return new DisposableDelegate(() => {
        if (this._toolbarWidget) {
          outputConsoleWidget.outputConsole
            .onLogMessage(this._logFilter)
            .disconnect(this._onLogMessage(), this);
          outputConsoleWidget.logsCleared.disconnect(this._onLogsCleared, this);

          this._toolbarWidget.dispose();
        }
      });
    }

    /**
     * Handle Output Console log cleared event.
     */
    private _onLogsCleared() {
      const toolbarWidget = this._toolbarWidget;

      return (sender: OutputConsoleWidget, args: void): void => {
        toolbarWidget.model.stateChanged.emit(void 0);
      };
    }

    /**
     * Handle Output Console new message log event.
     */
    private _onLogMessage() {
      const toolbarWidget = this._toolbarWidget;
      const logFilter = this._logFilter;

      return (sender: IOutputConsole, args: IOutputLogPayload): void => {
        toolbarWidget.model.stateChanged.emit(void 0);
        if (outputConsoleWidget.isAttached) {
          showMessagesByFilter(logFilter);
        }
      };
    }

    private _toolbarWidget: OutputStatusToolbarWidget = null;
    private _logFilter: IOutputLogFilter;
  }

  app.docRegistry.addWidgetExtension(
    'Notebook',
    new NotebookToolbarButtonExtension()
  );

  return outputConsoleWidget.outputConsole;
}

export default outputConsolePlugin;
