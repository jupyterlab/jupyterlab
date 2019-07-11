/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { SessionManager, KernelMessage, Session } from '@jupyterlab/services';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IOutputConsole, OutputConsoleWidget } from '@jupyterlab/outputconsole';

const outputConsolePlugin: JupyterFrontEndPlugin<IOutputConsole> = {
  activate: activateOutputConsole,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputConsole,
  requires: [IMainMenu, IRenderMimeRegistry],
  autoStart: true
};

const NOTEBOOK_ICON_CLASS = 'jp-NotebookIcon';
const CONSOLE_ICON_CLASS = 'jp-CodeConsoleIcon';

function activateOutputConsole(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu,
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
            if (!outputConsoleWidget.isAttached) {
              addWidgetToMainArea();
            }

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

  return outputConsoleWidget.outputConsole;
}

export default outputConsolePlugin;
