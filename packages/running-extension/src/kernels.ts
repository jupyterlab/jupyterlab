// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
// import { PathExt } from '@jupyterlab/coreutils';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Kernel, Session } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import {
  // consoleIcon,
  jupyterIcon
  // notebookIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Debouncer } from '@lumino/polling';
import { Signal } from '@lumino/signaling';

/**
 * Add the running kernel manager (notebooks & consoles) to the running panel.
 */
export function addKernelRunningSessionManager(
  managers: IRunningSessionManagers,
  translator: ITranslator,
  app: JupyterFrontEnd
): void {
  const { commands } = app;
  const trans = translator.load('jupyterlab');

  // Debounce signal emissions from the kernel and session managers.
  const { kernels, sessions } = app.serviceManager;
  const { runningChanged } = Private;
  const emission = new Debouncer(() => runningChanged.emit(undefined), 50);
  kernels.runningChanged.connect(() => void emission.invoke());
  sessions.runningChanged.connect(() => void emission.invoke());

  managers.add({
    name: trans.__('Kernels'),
    running: () =>
      Array.from(kernels.running()).map(
        kernel =>
          new Private.RunningKernel({
            commands,
            kernel,
            sessions,
            trans
          })
      ),
    shutdownAll: () => sessions.shutdownAll(),
    refreshRunning: () => kernels.refreshRunning(),
    runningChanged: Private.runningChanged,
    shutdownLabel: trans.__('Shut Down'),
    shutdownAllLabel: trans.__('Shut Down All'),
    shutdownAllConfirmationText: trans.__(
      'Are you sure you want to permanently shut down all running kernels?'
    )
  });
}

namespace Private {
  export class RunningKernel implements IRunningSessions.IRunningItem {
    constructor(options: RunningKernel.IOptions) {
      this.model = options.kernel;
      this.sessions = options.sessions;
      this.trans = options.trans;
    }

    readonly model: Kernel.IModel;

    readonly sessions: Session.IManager;

    readonly trans: IRenderMime.TranslationBundle;

    open() {
      console.log(`open() is not implemented`);
      // const { path, type } = this._model;
      // if (type.toLowerCase() === 'console') {
      //   void app.commands.execute('console:open', { path });
      // } else {
      //   void app.commands.execute('docmanager:open', { path });
      // }
    }

    shutdown() {
      console.log(`shutdown() is not implemented`);
      // return sessions.shutdown(this._model.id);
    }

    icon() {
      console.log(`icon() is not implemented`);
      // const { name, path, type } = this._model;
      // if ((name || PathExt.basename(path)).indexOf('.ipynb') !== -1) {
      //   return notebookIcon;
      // } else if (type.toLowerCase() === 'console') {
      //   return consoleIcon;
      // }
      return jupyterIcon;
    }

    label() {
      console.log(`label() is not implemented`);
      return 'unimplemented label';
      // return this._model.name || PathExt.basename(this._model.path);
    }

    labelTitle() {
      console.log(`labelTitle() is not implemented`);
      // const { kernel, path } = this._model;
      // let kernelName = kernel?.name;
      // if (kernelName && kernelspecs.specs) {
      //   const spec = kernelspecs.specs.kernelspecs[kernelName];
      //   kernelName = spec ? spec.display_name : 'unknown';
      // }
      // return trans.__('Path: %1\nKernel: %2', path, kernelName);
      return 'unimplemented label title';
    }
  }

  export namespace RunningKernel {
    export interface IOptions {
      commands: CommandRegistry;
      kernel: Kernel.IModel;
      sessions: Session.IManager;
      trans: IRenderMime.TranslationBundle;
    }
  }

  export const runningChanged = new Signal<unknown, unknown>({});
}
