// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
import { PathExt } from '@jupyterlab/coreutils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { IRunningSessionManagers, IRunningSessions } from '@jupyterlab/running';
import { Kernel, KernelSpec, Session } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import {
  closeIcon,
  consoleIcon,
  jupyterIcon,
  LabIcon,
  notebookIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Menu } from '@lumino/widgets';
import { Throttler } from '@lumino/polling';
import { Signal } from '@lumino/signaling';
import { CommandIDs } from '.';

const ITEM_CLASS = 'jp-mod-kernel';

/**
 * Add the running kernel manager (notebooks & consoles) to the running panel.
 */
export async function addKernelRunningSessionManager(
  managers: IRunningSessionManagers,
  translator: ITranslator,
  app: JupyterFrontEnd
): Promise<void> {
  const { commands, contextMenu, serviceManager } = app;
  const { kernels, kernelspecs, sessions } = serviceManager;
  const { runningChanged, RunningKernel } = Private;
  const throttler = new Throttler(() => runningChanged.emit(undefined), 100);
  const trans = translator.load('jupyterlab');

  // Throttle signal emissions from the kernel and session managers.
  kernels.runningChanged.connect(() => void throttler.invoke());
  sessions.runningChanged.connect(() => void throttler.invoke());

  // Wait until the relevant services are ready.
  await Promise.all([kernels.ready, kernelspecs.ready, sessions.ready]);

  // Add the kernels pane to the running sidebar.
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
    shutdownAll: () => kernels.shutdownAll(),
    refreshRunning: () =>
      Promise.all([kernels.refreshRunning(), sessions.refreshRunning()]),
    runningChanged,
    shutdownLabel: trans.__('Shut Down Kernel'),
    shutdownAllLabel: trans.__('Shut Down All'),
    shutdownAllConfirmationText: trans.__(
      'Are you sure you want to permanently shut down all running kernels?'
    )
  });

  // Add running kernels commands to the registry.
  const test = (node: HTMLElement) => node.classList.contains(ITEM_CLASS);
  commands.addCommand(CommandIDs.kernelNewConsole, {
    icon: consoleIcon,
    label: trans.__('New Console for Kernel'),
    execute: args => {
      const node = app.contextMenuHitTest(test);
      const id = (args.id as string) ?? node?.dataset['context'];
      if (id) {
        return commands.execute('console:create', { kernelPreference: { id } });
      }
    }
  });
  commands.addCommand(CommandIDs.kernelNewNotebook, {
    icon: notebookIcon,
    label: trans.__('New Notebook for Kernel'),
    execute: args => {
      const node = app.contextMenuHitTest(test);
      const id = (args.id as string) ?? node?.dataset['context'];
      if (id) {
        return commands.execute('notebook:create-new', { kernelId: id });
      }
    }
  });
  commands.addCommand(CommandIDs.kernelOpenSession, {
    icon: args =>
      args.type === 'console'
        ? consoleIcon
        : args.type === 'notebook'
        ? notebookIcon
        : undefined,
    label: ({ name, path }) =>
      (name as string) || PathExt.basename((path as string) || ''),
    execute: ({ path, type }) => {
      if (!type || path === undefined) {
        return;
      }
      const command = type === 'console' ? 'console:open' : 'docmanager:open';
      return commands.execute(command, { path });
    }
  });
  commands.addCommand(CommandIDs.kernelShutDown, {
    icon: closeIcon,
    label: trans.__('Shut Down Kernel'),
    execute: args => {
      const node = app.contextMenuHitTest(test);
      const id = (args.id as string) ?? node?.dataset['context'];
      if (id) {
        return kernels.shutdown(id);
      }
    }
  });

  // Add "new" options to the running kernels context menu.
  let rank = 0;
  contextMenu.addItem({
    command: CommandIDs.kernelNewConsole,
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`
  });
  contextMenu.addItem({
    command: CommandIDs.kernelNewNotebook,
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`
  });
  contextMenu.addItem({
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`,
    type: 'separator'
  });

  // Create and populate connected sessions submenu when context menu is opened.
  const submenu = new Menu({ commands: app.commands });
  submenu.title.label = trans.__('Connected Sessions…');
  contextMenu.addItem({
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`,
    type: 'submenu',
    submenu
  });
  contextMenu.opened.connect(async () => {
    const node = app.contextMenuHitTest(test);
    const id = node?.dataset['context'];
    if (!id) {
      return;
    }

    // Empty the connected sessions submenu.
    while (submenu.items.length) {
      submenu.removeItemAt(0);
    }

    // Populate the submenu with sessions connected to this kernel.
    const command = CommandIDs.kernelOpenSession;
    for (const session of sessions.running()) {
      if (id === session.kernel?.id) {
        const { name, path, type } = session;
        submenu.addItem({ command, args: { name, path, type } });
      }
    }
  });

  // Add shut down option at the bottom.
  contextMenu.addItem({
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`,
    type: 'separator'
  });
  contextMenu.addItem({
    command: CommandIDs.kernelShutDown,
    rank: rank++,
    selector: `.jp-RunningSessions-item.${ITEM_CLASS}`
  });
}

namespace Private {
  export class RunningKernel implements IRunningSessions.IRunningItem {
    constructor(options: RunningKernel.IOptions) {
      this.className = ITEM_CLASS;
      this.commands = options.commands;
      this.kernel = options.kernel;
      this.context = this.kernel.id;
      this.kernels = options.kernels;
      this.sessions = options.sessions;
      this.spec = options.spec || null;
      this.trans = options.trans;
      this._icon = options.icon || jupyterIcon;
    }

    readonly className: string;

    readonly context: string;

    readonly commands: CommandRegistry;

    readonly kernel: Kernel.IModel;

    readonly kernels: Kernel.IManager;

    readonly sessions: Session.IManager;

    readonly spec: KernelSpec.ISpecModel | null;

    readonly trans: IRenderMime.TranslationBundle;

    get children(): IRunningSessions.IRunningItem[] {
      const children: IRunningSessions.IRunningItem[] = [];
      const open = CommandIDs.kernelOpenSession;
      const { commands } = this;
      for (const session of this.sessions.running()) {
        if (this.kernel.id === session.kernel?.id) {
          const { name, path, type } = session;
          children.push({
            className: ITEM_CLASS,
            context: this.kernel.id,
            open: () => void commands.execute(open, { name, path, type }),
            icon: () =>
              type === 'console'
                ? consoleIcon
                : type === 'notebook'
                ? notebookIcon
                : jupyterIcon,
            label: () => name,
            labelTitle: () => path
          });
        }
      }
      return children;
    }

    open() {
      /* no-op */
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
      return spec?.display_name || kernel.name;
    }

    labelTitle() {
      const { trans } = this;
      const { id } = this.kernel;
      const title = [`${this.label()}: ${id}`];
      for (const session of this.sessions.running()) {
        if (this.kernel.id === session.kernel?.id) {
          const { path, type } = session;
          title.push(trans.__(`%1\nPath: %2`, type, path));
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
