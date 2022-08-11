// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { signalToPromise } from '@jupyterlab/testutils';
import { CommandRegistry } from '@lumino/commands';

import { UserMenu } from './../src/menu';
import { User } from './../src/model';

describe('user/menu', () => {
  describe('Menu', () => {
    it('Should change the title', async () => {
      const commands = new CommandRegistry();
      const user = new User();
      const menu = new UserMenu({
        user,
        commands
      });

      const promiseUserChanged = signalToPromise(user.changed);
      const promiseTitleChanged = signalToPromise(menu.title.changed);

      const name = 'jovyan';
      user.fromJSON({ ...user.toJSON(), name, displayName: name });

      const [senderUserChanged] = await promiseUserChanged;
      const [senderTitleChanged] = await promiseTitleChanged;

      expect(senderUserChanged).toBe(user);
      expect(senderTitleChanged).toBe(menu.title);
      expect(menu.title.label).toBe(name);
    });
  });
});
