/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IKernelStatusModel,
  ISessionContext,
  ISessionContextDialogs,
  KernelStatus,
  RunningSessions,
  sessionContextDialogs
} from '@jupyterlab/apputils';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator } from '@jupyterlab/translation';
import { Title, Widget } from '@lumino/widgets';

/**
 * A plugin that provides a kernel status item to the status bar.
 */
export const kernelStatus: JupyterFrontEndPlugin<IKernelStatusModel> = {
  id: '@jupyterlab/apputils-extension:kernel-status',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  provides: IKernelStatusModel,
  optional: [ISessionContextDialogs, ILabShell],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator,
    sessionDialogs: ISessionContextDialogs | null,
    labShell: ILabShell | null
  ): IKernelStatusModel => {
    // When the status item is clicked, launch the kernel
    // selection dialog for the current session.
    let currentSession: ISessionContext | null = null;
    const changeKernel = async () => {
      if (!currentSession) {
        return;
      }
      await (sessionDialogs || sessionContextDialogs).selectKernel(
        currentSession,
        translator
      );
    };

    // Create the status item.
    const item = new KernelStatus({ onClick: changeKernel }, translator);

    // When the title of the active widget changes, update the label
    // of the hover text.
    const onTitleChanged = (title: Title<Widget>) => {
      item.model!.activityName = title.label;
    };

    // Keep the session object on the status item up-to-date.
    function setCurrentWidget(_: any, change: ILabShell.IChangedArgs): void {
      const { oldValue, newValue } = change;

      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        oldValue.title.changed.disconnect(onTitleChanged);
      }
      if (newValue) {
        newValue.title.changed.connect(onTitleChanged);
      }
    }
    if (labShell) {
      labShell.currentChanged.connect(setCurrentWidget);
    } else {
      setCurrentWidget(null, {
        oldValue: null,
        newValue: app.shell.currentWidget
      });
    }

    statusBar.registerStatusItem(kernelStatus.id, {
      item,
      align: 'left',
      rank: 1
      // isActive: () => !!item.model!.sessionContext
    });

    return item.model;
  }
};

/*
 * A plugin providing running terminals and sessions information
 * to the status bar.
 */
export const runningSessionsStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:running-sessions-status',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator
  ) => {
    const item = new RunningSessions({
      onClick: () => app.shell.activateById('jp-running-sessions'),
      serviceManager: app.serviceManager,
      translator
    });

    statusBar.registerStatusItem(runningSessionsStatus.id, {
      item,
      align: 'left',
      rank: 0
    });
  }
};
