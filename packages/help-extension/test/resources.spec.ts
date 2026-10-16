// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import plugins from '@jupyterlab/help-extension';
import type { IMainMenu } from '@jupyterlab/mainmenu';
import type { KernelMessage, Session } from '@jupyterlab/services';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';

type InfoReply = KernelMessage.IInfoReplyMsg['content'];

/**
 * A kernel info request that the test settles.
 */
class InfoRequest {
  constructor() {
    this.promise = new Promise<InfoReply>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  promise: Promise<InfoReply>;
  resolve: (reply: InfoReply) => void;
  reject: (reason: Error) => void;
}

const reply = {
  banner: 'Python banner',
  help_links: [{ text: 'Python Reference', url: 'https://docs.python.org' }]
} as InfoReply;

const model = (id: string, name: string): Session.IModel =>
  ({ id, kernel: { id: `kernel-${id}`, name } }) as Session.IModel;

describe('@jupyterlab/help-extension:resources', () => {
  const resources = plugins.find(
    plugin => plugin.id === '@jupyterlab/help-extension:resources'
  )!;

  let commands: CommandRegistry;
  let running: Session.IModel[];
  let runningChanged: Signal<unknown, Session.IModel[]>;
  let requests: InfoRequest[];
  let sessions: { kernel: { name: string }; dispose: jest.Mock }[];
  let connectTo: jest.Mock;

  const activate = () => {
    const app = {
      commands,
      serviceManager: {
        sessions: { running: () => running, runningChanged, connectTo },
        kernelspecs: {
          specs: {
            kernelspecs: {
              python3: { display_name: 'Python 3', resources: {} },
              julia: { display_name: 'Julia', resources: {} }
            }
          }
        }
      }
    } as unknown as JupyterFrontEnd;
    const mainMenu = {
      helpMenu: { addGroup: jest.fn() }
    } as unknown as IMainMenu;
    resources.activate(app, mainMenu, nullTranslator, null, null);
  };

  // Let promise callbacks run.
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    commands = new CommandRegistry();
    commands.addCommand('helpmenu:get-kernel', { execute: () => null });
    running = [];
    runningChanged = new Signal<unknown, Session.IModel[]>({});
    requests = [];
    sessions = [];
    connectTo = jest.fn(({ model }: { model: Session.IModel }) => {
      const request = new InfoRequest();
      requests.push(request);
      const session = {
        kernel: { name: model.kernel!.name, info: request.promise },
        dispose: jest.fn()
      };
      sessions.push(session);
      return session;
    });
  });

  it('should connect once to a kernel while its info is pending', async () => {
    running = [model('a', 'python3'), model('b', 'python3')];
    activate();
    runningChanged.emit([model('c', 'python3')]);
    expect(connectTo).toHaveBeenCalledTimes(1);

    requests[0].resolve(reply);
    await flush();
    expect(sessions[0].dispose).toHaveBeenCalled();
    expect(commands.hasCommand('help-menu-python3:banner')).toBe(true);
    expect(commands.hasCommand('help-menu-python3:Python Reference')).toBe(
      true
    );

    // Cached from now on.
    runningChanged.emit([model('d', 'python3')]);
    expect(connectTo).toHaveBeenCalledTimes(1);
  });

  it('should connect once to each kernel', () => {
    running = [model('a', 'python3'), model('b', 'julia')];
    activate();
    expect(connectTo).toHaveBeenCalledTimes(2);
  });

  it('should dispose of the connection and retry if the info fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    running = [model('a', 'python3')];
    activate();

    requests[0].reject(new Error('Kernel died'));
    await flush();
    expect(sessions[0].dispose).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(commands.hasCommand('help-menu-python3:banner')).toBe(false);

    runningChanged.emit([model('b', 'python3')]);
    expect(connectTo).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('should dispose of the connection and retry if the spec is unknown', async () => {
    running = [model('a', 'unknown')];
    activate();

    requests[0].resolve(reply);
    await flush();
    expect(sessions[0].dispose).toHaveBeenCalled();

    runningChanged.emit([model('b', 'unknown')]);
    expect(connectTo).toHaveBeenCalledTimes(2);
  });
});
