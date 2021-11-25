// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { signalToPromise } from '@jupyterlab/testutils';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';

import { UserMenu } from './../src/menu';
import { User } from './../src/model';

describe('user/menu', () => {
  describe('Menu', () => {
    it('Should change the title', async () => {
      const stateDB = new StateDB();
      const commands = new CommandRegistry();
      const user = new User(stateDB);
      const menu = new UserMenu({
        user,
        commands
      });

      const promiseIsReady = signalToPromise(user.ready);
      const [senderIsReady] = await promiseIsReady;
      expect(senderIsReady).toBe(user);

      const promiseUserChanged = signalToPromise(user.changed);
      const promiseTitleChanged = signalToPromise(menu.title.changed);

      const name = 'jovyan';
      user.fromJSON({ ...user.toJSON(), name });

      const [senderUserChanged] = await promiseUserChanged;
      const [senderTitleChanged] = await promiseTitleChanged;

      expect(senderUserChanged).toBe(user);
      expect(senderTitleChanged).toBe(menu.title);
      expect(menu.title.label).toBe(name);
    });
  });
});
