// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import * as nbformat from '@jupyterlab/nbformat';

import { ILoggerRegistry, LogLevel } from '@jupyterlab/logconsole';

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
    function logOutput(
      msg: KernelMessage.IIOPubMessage,
      levelNormal: LogLevel,
      levelError: LogLevel
    ) {
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
        let level: LogLevel = levelNormal;
        if (
          KernelMessage.isErrorMsg(msg) ||
          (KernelMessage.isStreamMsg(msg) && msg.content.name === 'stderr')
        ) {
          level = levelError;
        }
        logger.log({ type: 'output', data, level });
      }
    }

    // There is overlap here since unhandled messages are also emitted in the
    // iopubMessage signal. However, unhandled messages warrant a higher log
    // severity, so we'll accept that they are logged twice.
    nb.context.sessionContext.iopubMessage.connect(
      (_, msg: KernelMessage.IIOPubMessage) => logOutput(msg, 'info', 'info')
    );
    nb.context.sessionContext.unhandledMessage.connect(
      (_, msg: KernelMessage.IIOPubMessage) =>
        logOutput(msg, 'warning', 'error')
    );
  }
  nbtracker.forEach(nb => registerNB(nb));
  nbtracker.widgetAdded.connect((_, nb) => registerNB(nb));
}
