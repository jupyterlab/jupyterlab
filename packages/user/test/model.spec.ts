// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { signalToPromise } from '@jupyterlab/testutils';

import { User } from './../src/model';

describe('user/model', () => {
  describe('User', () => {
    const user = new User();

    it('Should create and anonymous user', () => {
      expect(user.anonymous).toBe(true);
    });

    it('Should load the previous user', () => {
      const user2 = new User();
      expect(user.username).toBe(user2.username);
    });

    it('Should emit user changed', async () => {
      const promise = signalToPromise(user.changed);
      const newName = 'jovyan';
      user.fromJSON({
        ...user.toJSON(),
        givenName: newName
      });

      const [sender] = await promise;
      expect(sender).toBe(user);
      expect(user.givenName).toBe(newName);
    });

    it('Should change the name', async () => {
      const promise = signalToPromise(user.changed);
      const newName = 'jovyan';
      user.fromJSON({
        username: user.username,
        givenName: newName,
        familyName: user.familyName,
        initials: user.initials,
        color: user.color,
        anonymous: user.anonymous
      });
      const [sender] = await promise;
      expect(sender).toBe(user);
      expect(user.givenName).toBe(newName);
    });
  });
});
