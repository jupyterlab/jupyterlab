// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { FakeUserManager, JupyterServer } from '@jupyterlab/testutils';
import { ServerConnection } from '@jupyterlab/services';

import { signalToPromise } from '@jupyterlab/testutils';
import { CommandRegistry } from '@lumino/commands';

import { UserMenu } from './../src/menu';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('user/menu', () => {
  const name = 'jovyan';
  let manager: FakeUserManager;

  beforeAll(() => {
    manager = new FakeUserManager(
      { serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' }) },
      { display_name: name },
      {}
    );
  });

  describe('Menu', () => {
    it('Should change the title', async () => {
      const commands = new CommandRegistry();
      const menu = new UserMenu({
        user: manager,
        commands
      });

      const promiseUserChanged = signalToPromise(manager.userChanged);
      const promiseTitleChanged = signalToPromise(menu.title.changed);

      const [senderUserChanged] = await promiseUserChanged;
      const [senderTitleChanged] = await promiseTitleChanged;

      expect(senderUserChanged).toBe(manager);
      expect(senderTitleChanged).toBe(menu.title);
      expect(menu.title.label).toBe(name);
    });
  });
});
