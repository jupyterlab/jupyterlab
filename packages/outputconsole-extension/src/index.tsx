/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import React from 'react';

import { SessionManager, KernelMessage, Session } from '@jupyterlab/services';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IMainMenu } from '@jupyterlab/mainmenu';

import {
  IStatusBar,
  GroupItem,
  IconItem,
  TextItem,
  interactiveItem
} from '@jupyterlab/statusbar';

import {
  IOutputConsole,
  IOutputLogPayload,
  OutputConsoleWidget
} from '@jupyterlab/outputconsole';

const outputConsolePlugin: JupyterFrontEndPlugin<IOutputConsole> = {
  activate: activateOutputConsole,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputConsole,
  requires: [IMainMenu, IRenderMimeRegistry, IStatusBar],
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
      <IconItem source={'jp-StatusItem-output-console fa fa-list'} />
      <GroupItem spacing={2}>
        <TextItem source={props.logCount} />
        <TextItem source={'Messages'} />
      </GroupItem>
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
    this.model = new OutputStatus.Model(opts.outputConsoleWidget);
    this.addClass(interactiveItem);
    this.addClass('outputconsole-status-item');

    opts.outputConsoleWidget.madeVisible.connect(() => {
      this.removeClass('hilite');
    });

    let timer: number = null;

    this.model.stateChanged.connect(() => {
      if (opts.outputConsoleWidget.isAttached) {
        return;
      }

      const wasHilited = this.hasClass('hilite');
      if (wasHilited) {
        this.removeClass('hilite');
        // cancel previous request
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.addClass('hilite');
        }, 100);
      } else {
        this.addClass('hilite');
      }
    });
  }

  /**
   * Render the output console status item.
   */
  render() {
    const onClick = (): void => {
      this._handleClick();
    };

    if (this.model === null) {
      return null;
    } else {
      return (
        <OutputStatusComponent
          handleClick={onClick}
          logCount={this.model.logCount}
        />
      );
    }
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
    constructor(outputConsoleWidget: OutputConsoleWidget) {
      super();

      this._outputConsoleWidget = outputConsoleWidget;

      this._outputConsoleWidget.outputConsole.onLogMessage.connect(
        (sender: IOutputConsole, payload: IOutputLogPayload) => {
          this.stateChanged.emit(void 0);
        }
      );

      this._outputConsoleWidget.logsCleared.connect(() => {
        this.stateChanged.emit(void 0);
      });
    }

    get logCount(): number {
      return this._outputConsoleWidget.outputConsole.logCount;
    }

    private _outputConsoleWidget: OutputConsoleWidget;
  }

  /**
   * Options for creating a new OutputStatus item
   */
  export interface IOptions {
    /**
     * Output Console widget which provides
     * Output Console interface and access to log info
     */
    outputConsoleWidget: OutputConsoleWidget;

    /**
     * A click handler for the item. By default
     * Output Console panel is launched.
     */
    handleClick: () => void;
  }
}

const NOTEBOOK_ICON_CLASS = 'jp-NotebookIcon';
const CONSOLE_ICON_CLASS = 'jp-CodeConsoleIcon';

function activateOutputConsole(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu,
  rendermime: IRenderMimeRegistry,
  statusBar: IStatusBar
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

  let lastKernelSession = '';
  let lastMsg: KernelMessage.IIOPubMessage = null;

  const messageCanBeRendered = (msg: KernelMessage.IMessage) => {
    return (
      msg.channel === 'iopub' &&
      [
        'execute_result',
        'display_data',
        'stream',
        'error',
        'update_display_data'
      ].includes(msg.header.msg_type)
    );
  };

  const isSameMessage = (msg: KernelMessage.IMessage) => {
    return (
      lastMsg &&
      msg.header.msg_type === lastMsg.header.msg_type &&
      msg.header.msg_id === lastMsg.header.msg_id &&
      lastKernelSession === msg.header.session
    );
  };

  app.started.then(() => {
    app.serviceManager.unhandledSessionIOPubMessage.connect(
      (sessionManager: SessionManager, msg: KernelMessage.IIOPubMessage) => {
        if (!messageCanBeRendered(msg) || isSameMessage(msg)) {
          return;
        }

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
              msg: msg
            });
          });
      }
    );
  });

  const command: string = 'log:jlab-output-console';

  app.commands.addCommand(command, {
    label: 'Output Console',
    execute: (args: any) => {
      if (outputConsoleWidget.isAttached) {
        outputConsoleWidget.close();
      } else {
        addWidgetToMainArea();
      }
    },
    isToggled: (): boolean => {
      return outputConsoleWidget.isAttached;
    }
  });

  mainMenu.viewMenu.addGroup([{ command }]);

  const status = new OutputStatus({
    outputConsoleWidget: outputConsoleWidget,
    handleClick: () => {
      if (!outputConsoleWidget.isAttached) {
        addWidgetToMainArea();
      }
    }
  });

  statusBar.registerStatusItem('@jupyterlab/outputconsole-extension:status', {
    item: status,
    align: 'left',
    isActive: () => true,
    activeStateChanged: status.model!.stateChanged
  });

  return outputConsoleWidget.outputConsole;
}

export default outputConsolePlugin;
