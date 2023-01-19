// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Kernel, KernelSpec, Session } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import { jupyterIcon, LabIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Throttler } from '@lumino/polling';
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
  const { runningChanged, RunningKernel } = Private;
  const throttler = new Throttler(() => runningChanged.emit(undefined), 100);

  // Throttle signal emissions from the kernel and session managers.
  kernels.runningChanged.connect(() => void throttler.invoke());
  sessions.runningChanged.connect(() => void throttler.invoke());

  await Promise.all([kernelspecs.ready, kernels.ready]);

  managers.add({
    name: trans.__('Kernels'),
    running: () =>
      Array.from(kernels.running()).map(
        kernel =>
          new RunningKernel({
            commands,
            kernel,
            kernels,
            sessions,
            spec: kernelspecs.specs?.kernelspecs[kernel.name],
            trans
          })
      ),
    shutdownAll: () => sessions.shutdownAll(),
    refreshRunning: () =>
      Promise.all([kernels.refreshRunning(), sessions.refreshRunning()]),
    runningChanged,
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
      this.commands = options.commands;
      this.kernel = options.kernel;
      this.kernels = options.kernels;
      this.sessions = options.sessions;
      this.spec = options.spec || null;
      this.trans = options.trans;
      this._icon = options.icon || jupyterIcon;
    }

    readonly commands: CommandRegistry;

    readonly kernel: Kernel.IModel;

    readonly kernels: Kernel.IManager;

    readonly sessions: Session.IManager;

    readonly spec: KernelSpec.ISpecModel | null;

    readonly trans: IRenderMime.TranslationBundle;

    open() {
      for (const session of this.sessions.running()) {
        if (this.kernel.id !== session.kernel?.id) {
          continue;
        }
        const { path, type } = session;
        const command = type === 'console' ? 'console:open' : 'docmanager:open';
        void this.commands.execute(command, { path });
      }
    }

    shutdown() {
      return this.kernels.shutdown(this.kernel.id);
    }

    icon() {
      // TODO: Use the icon from `this.spec.resources` instead.
      return this._icon;
    }

    label() {
      const { kernel, spec } = this;
      const name = spec?.display_name || kernel.name;
      return `${name} {${kernel.connections ?? '-'}}`;
    }

    labelTitle() {
      const { trans } = this;
      const { id } = this.kernel;
      const title = [`${this.label()}: ${id}`];
      for (const session of this.sessions.running()) {
        if (this.kernel.id === session.kernel?.id) {
          const { path, type } = session;
          const kernel = `${this.kernel.name} (${this.kernel.id})`;
          title.push(trans.__(`%1\nPath: %2\nKernel: %3`, type, path, kernel));
        }
      }
      return title.join('\n\n');
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
