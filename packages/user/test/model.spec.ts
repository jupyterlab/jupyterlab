// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { signalToPromise } from '@jupyterlab/testutils';
import { StateDB } from '@jupyterlab/statedb';

import { User } from './../src/model';

describe('user/model', () => {
  describe('User', () => {
    const stateDB = new StateDB();
    let user: User;

    it('Should emit user ready', async () => {
      user = new User(stateDB);
      const promise = signalToPromise(user.ready);
      const [sender, isReady] = await promise;

      expect(sender).toBe(user);
      expect(isReady).toBe(true);
      expect(user.isReady).toBe(true);
    });

    it('Should create and anonymous user', () => {
      expect(user.anonymous).toBe(true);
    });

    it('Should load the previous user', async () => {
      const user2 = new User(stateDB);
      const promise = signalToPromise(user2.ready);
      const [sender, isReady] = await promise;

      expect(sender).toBe(user2);
      expect(isReady).toBe(true);
      expect(user.username).toBe(user2.username);
    });

    it('Should emit user changed', async () => {
      const promise = signalToPromise(user.changed);
      const newName = 'jovyan';
      user.fromJSON({
        ...user.toJSON(),
        name: newName
      });

      const [sender] = await promise;
      expect(sender).toBe(user);
      expect(user.name).toBe(newName);
    });

    it('Should change the name', async () => {
      const promise = signalToPromise(user.changed);
      const newName = 'jovyan';
      user.fromJSON({
        id: user.id,
        name: newName,
        username: newName,
        color: user.color,
        anonymous: user.anonymous,
        role: user.role
      });
      const [sender] = await promise;
      expect(sender).toBe(user);
      expect(user.name).toBe(newName);
    });
  });
});
