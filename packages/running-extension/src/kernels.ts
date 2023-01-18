// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
// import { PathExt } from '@jupyterlab/coreutils';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Kernel, KernelSpec, Session } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import {
  // consoleIcon,
  jupyterIcon,
  LabIcon
  // notebookIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Debouncer } from '@lumino/polling';
import { Signal } from '@lumino/signaling';

/**
 * Add the running kernel manager (notebooks & consoles) to the running panel.
 */
export async function addKernelRunningSessionManager(
  managers: IRunningSessionManagers,
  translator: ITranslator,
  app: JupyterFrontEnd
): Promise<void> {
  const { commands } = app;
  const trans = translator.load('jupyterlab');
  const { kernels, kernelspecs, sessions } = app.serviceManager;
  const { runningChanged } = Private;
  const emitter = new Debouncer(() => runningChanged.emit(undefined), 50);

  // Debounce signal emissions from the kernel and session managers.
  kernels.runningChanged.connect(() => void emitter.invoke());
  sessions.runningChanged.connect(() => void emitter.invoke());

  await kernelspecs.ready;

  managers.add({
    name: trans.__('Kernels'),
    running: () =>
      Array.from(kernels.running()).map(
        kernel =>
          new Private.RunningKernel({
            commands,
            icon: jupyterIcon,
            kernel,
            kernels,
            sessions,
            spec: kernelspecs.specs?.kernelspecs[kernel.name],
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
      this.kernel = options.kernel;
      this.kernels = options.kernels;
      this.sessions = options.sessions;
      this.spec = options.spec || null;
      this.trans = options.trans;
      this._icon = options.icon || jupyterIcon;
    }

    readonly kernel: Kernel.IModel;

    readonly kernels: Kernel.IManager;

    readonly sessions: Session.IManager;

    readonly spec: KernelSpec.ISpecModel | null;

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
      return this.kernels.shutdown(this.kernel.id);
    }

    icon() {
      // TODO: Use the icons in this.spec instead.
      return this._icon;
    }

    label() {
      return this.spec?.display_name || this.kernel.name;
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
      return this.kernel.id;
    }

    private _icon: LabIcon;
  }

  export namespace RunningKernel {
    export interface IOptions {
      commands: CommandRegistry;
      icon?: LabIcon;
      kernel: Kernel.IModel;
      kernels: Kernel.IManager;
      sessions: Session.IManager;
      spec?: KernelSpec.ISpecModel;
      trans: IRenderMime.TranslationBundle;
    }
  }

  export const runningChanged = new Signal<unknown, unknown>({});
}
