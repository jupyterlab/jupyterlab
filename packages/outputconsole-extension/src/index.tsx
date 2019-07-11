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

  app.started.then(() => {
    app.serviceManager.unhandledSessionIOPubMessage.connect(
      (sender: SessionManager, msg: KernelMessage.IIOPubMessage) => {
        sender
          .findById((msg.header as any).sourceSession)
          .then((session: Session.IModel) => {
            console.log('SESSION', session.name);
            if (!outputConsoleWidget.isAttached) {
              addWidgetToMainArea();
            }

            outputConsoleWidget.outputConsole.logMessage(session.name, msg);
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
