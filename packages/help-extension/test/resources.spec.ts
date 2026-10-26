// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import plugins from '@jupyterlab/help-extension';
import type { IMainMenu } from '@jupyterlab/mainmenu';
import type { KernelMessage } from '@jupyterlab/services';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';

type InfoReply = KernelMessage.IInfoReply;

/**
 * A fake kernel connection whose info reply the test settles.
 */
class FakeKernel {
  constructor(readonly name: string) {
    this.info = new Promise<InfoReply>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  info: Promise<InfoReply>;
  resolve: (reply: InfoReply) => void;
  reject: (reason: Error) => void;
}

const reply = {
  banner: 'Python banner',
  help_links: [{ text: 'Python Reference', url: 'https://docs.python.org' }]
} as InfoReply;

describe('@jupyterlab/help-extension:resources', () => {
  const resources = plugins.find(
    plugin => plugin.id === '@jupyterlab/help-extension:resources'
  )!;

  let commands: CommandRegistry;
  let current: FakeKernel | null;
  let currentChanged: Signal<unknown, unknown>;
  let currentWidget: {
    sessionContext: { kernelChanged: Signal<unknown, unknown> };
  } | null;
  let runningChanged: Signal<unknown, unknown>;
  let connectTo: jest.Mock;
  let kernelspecs: { specs: unknown; specsChanged: Signal<unknown, unknown> };

  const activate = () => {
    const app = {
      commands,
      shell: {
        currentChanged,
        get currentWidget() {
          return currentWidget;
        }
      },
      serviceManager: {
        sessions: { runningChanged, connectTo },
        kernelspecs
      }
    } as unknown as JupyterFrontEnd;
    const mainMenu = {
      helpMenu: { addGroup: jest.fn() }
    } as unknown as IMainMenu;
    resources.activate(app, mainMenu, nullTranslator, null, null);
  };

  // Let promise callbacks run.
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  const focus = async (kernel: FakeKernel | null) => {
    current = kernel;
    currentChanged.emit(undefined);
    await flush();
  };

  const banner = 'help-menu-python3:banner';

  beforeEach(() => {
    commands = new CommandRegistry();
    commands.addCommand('help:open', {
      label: args => args.text as string,
      execute: () => null
    });
    commands.addCommand('helpmenu:get-kernel', { execute: () => current });
    current = null;
    currentChanged = new Signal({});
    currentWidget = null;
    runningChanged = new Signal({});
    connectTo = jest.fn();
    kernelspecs = {
      specs: {
        kernelspecs: {
          python3: { display_name: 'Python 3', resources: {} },
          julia: { display_name: 'Julia', resources: {} }
        }
      },
      specsChanged: new Signal({})
    };
  });

  it('should reuse the kernel connection of the current widget', async () => {
    const python = new FakeKernel('python3');
    current = python;
    activate();
    runningChanged.emit(undefined);
    python.resolve(reply);
    await flush();

    expect(connectTo).not.toHaveBeenCalled();
  });

  it('should add the entries of the current kernel', async () => {
    const python = new FakeKernel('python3');
    current = python;
    activate();
    python.resolve(reply);
    await flush();

    expect(commands.isVisible(banner)).toBe(true);
    expect(commands.isVisible('help-menu-python3:Python Reference')).toBe(true);
  });

  it('should only show the entries of the current kernel', async () => {
    const python = new FakeKernel('python3');
    activate();
    await focus(python);
    python.resolve(reply);
    await flush();
    expect(commands.isVisible(banner)).toBe(true);

    // Menus re-check the entries when notified.
    const changed: (string | undefined)[] = [];
    commands.commandChanged.connect((_, args) => changed.push(args.id));
    await focus(new FakeKernel('julia'));
    expect(commands.isVisible(banner)).toBe(false);
    expect(changed).toContain(banner);

    await focus(null);
    expect(commands.isVisible(banner)).toBe(false);

    await focus(python);
    expect(commands.isVisible(banner)).toBe(true);
  });

  it('should add the entries once a kernel starts in the current widget', async () => {
    activate();
    await focus(null);

    const python = new FakeKernel('python3');
    current = python;
    runningChanged.emit(undefined);
    python.resolve(reply);
    await flush();

    expect(commands.isVisible(banner)).toBe(true);
  });

  it('should add the entries once the current widget gets its kernel', async () => {
    const kernelChanged = new Signal<unknown, unknown>({});
    currentWidget = { sessionContext: { kernelChanged } };
    activate();
    await focus(null);

    // The session connects without any change in the running sessions.
    const python = new FakeKernel('python3');
    current = python;
    kernelChanged.emit(undefined);
    python.resolve(reply);
    await flush();
    expect(commands.isVisible(banner)).toBe(true);

    // The previous widget is not followed anymore.
    currentWidget = null;
    await focus(null);
    current = python;
    kernelChanged.emit(undefined);
    await flush();
    expect(commands.isVisible(banner)).toBe(false);
  });

  it('should add the entries once for concurrent updates', async () => {
    const python = new FakeKernel('python3');
    current = python;
    activate();
    currentChanged.emit(undefined);
    runningChanged.emit(undefined);
    python.resolve(reply);
    await flush();

    expect(commands.hasCommand(banner)).toBe(true);
  });

  it('should not wait on a kernel that never replies', async () => {
    activate();
    await focus(new FakeKernel('python3'));

    const restarted = new FakeKernel('python3');
    await focus(restarted);
    restarted.resolve(reply);
    await flush();

    expect(commands.isVisible(banner)).toBe(true);
  });

  it('should not request the info of a kernel without spec', async () => {
    let requested = false;
    const unknown = {
      name: 'unknown',
      get info() {
        requested = true;
        return new Promise<InfoReply>(() => undefined);
      }
    } as unknown as FakeKernel;
    activate();
    await focus(unknown);

    expect(requested).toBe(false);
    expect(commands.hasCommand('help-menu-unknown:banner')).toBe(false);
  });

  it('should retry after a failed info request', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    activate();
    const failing = new FakeKernel('python3');
    await focus(failing);
    failing.reject(new Error('Kernel died'));
    await flush();
    expect(warn).toHaveBeenCalled();
    expect(commands.hasCommand(banner)).toBe(false);

    const python = new FakeKernel('python3');
    await focus(python);
    python.resolve(reply);
    await flush();
    expect(commands.isVisible(banner)).toBe(true);
    warn.mockRestore();
  });

  it('should keep the entries of a widget after its kernel is gone', async () => {
    const notebook = { sessionContext: { kernelChanged: new Signal({}) } };
    currentWidget = notebook;
    const python = new FakeKernel('python3');
    current = python;
    activate();
    python.resolve(reply);
    await flush();

    // The kernel dies or is shut down, and its session is removed.
    current = null;
    runningChanged.emit(undefined);
    await flush();
    expect(commands.isVisible(banner)).toBe(true);

    currentWidget = { sessionContext: { kernelChanged: new Signal({}) } };
    await focus(null);
    expect(commands.isVisible(banner)).toBe(false);

    currentWidget = notebook;
    await focus(null);
    expect(commands.isVisible(banner)).toBe(true);
  });

  it('should add the entries when the kernel specs arrive late', async () => {
    const specs = kernelspecs.specs;
    kernelspecs.specs = null;
    const python = new FakeKernel('python3');
    current = python;
    activate();
    python.resolve(reply);
    await flush();
    expect(commands.hasCommand(banner)).toBe(false);

    kernelspecs.specs = specs;
    kernelspecs.specsChanged.emit(specs);
    await flush();
    expect(commands.isVisible(banner)).toBe(true);
  });
});
