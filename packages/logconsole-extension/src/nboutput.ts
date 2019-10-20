// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { nbformat } from '@jupyterlab/coreutils';

import { ILoggerRegistry } from '@jupyterlab/logconsole';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { KernelMessage } from '@jupyterlab/services';

/**
 * The Log Console extension.
 */
export const logNotebookOutput: JupyterFrontEndPlugin<void> = {
  activate: activateNBOutput,
  id: 'logconsole:nboutput',
  requires: [ILoggerRegistry, INotebookTracker],
  autoStart: true
};

function activateNBOutput(
  app: JupyterFrontEnd,
  loggerRegistry: ILoggerRegistry,
  nbtracker: INotebookTracker
) {
  function registerNB(nb: NotebookPanel) {
    nb.context.session.iopubMessage.connect(
      (_, msg: KernelMessage.IIOPubMessage) => {
        if (
          KernelMessage.isDisplayDataMsg(msg) ||
          KernelMessage.isStreamMsg(msg) ||
          KernelMessage.isErrorMsg(msg) ||
          KernelMessage.isExecuteResultMsg(msg)
        ) {
          const logger = loggerRegistry.getLogger(nb.context.path);
          logger.rendermime = nb.content.rendermime;
          const data: nbformat.IOutput = {
            ...msg.content,
            output_type: msg.header.msg_type
          };
          logger.log({ type: 'output', data });
        }
      }
    );
  }
  nbtracker.forEach(nb => registerNB(nb));
  nbtracker.widgetAdded.connect((_, nb) => registerNB(nb));
}
