// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PromiseDelegate } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import {
  expectFailure,
  isFulfilled,
  testEmission
} from '@jupyterlab/testutils';

describe('test/utils', () => {
  describe('testEmission', () => {
    it('should resolve to the given value', async () => {
      const owner = {};
      const x = new Signal<{}, number>(owner);
      const emission = testEmission(x, {
        value: 'done'
      });
      x.emit(0);
      expect(await emission).to.equal('done');
    });

    it('should find the given emission', async () => {
      const owner = {};
      const x = new Signal<{}, number>(owner);
      const emission = testEmission(x, {
        find: (a, b) => b === 1,
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.equal(false);
      x.emit(1);
      expect(await emission).to.equal('done');
    });

    it('should reject if the test throws an error', async () => {
      const owner = {};
      const x = new Signal<{}, number>(owner);
      const emission = testEmission(x, {
        find: (a, b) => b === 1,
        test: (a, b) => {
          throw new Error('my error');
        },
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.equal(false);
      x.emit(1);
      await expectFailure(emission, 'my error');
    });

    it('should resolve if the test succeeds', async () => {
      const owner = {};
      const x = new Signal<{}, number>(owner);
      const emission = testEmission(x, {
        find: (a, b) => b === 1,
        test: (a, b) => {
          expect(b).to.equal(1);
        },
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.equal(false);
      x.emit(1);
      expect(await emission).to.equal('done');
    });
  });

  describe('isFulfilled', () => {
    it('should resolve to true only after a promise is fulfilled', async () => {
      const p = new PromiseDelegate<number>();
      expect(await isFulfilled(p.promise)).to.equal(false);
      p.resolve(10);
      expect(await isFulfilled(p.promise)).to.equal(true);
    });

    it('should resolve to true even if the promise is rejected', async () => {
      const p = new PromiseDelegate<number>();
      expect(await isFulfilled(p.promise)).to.equal(false);
      p.reject(new Error('my error'));
      expect(await isFulfilled(p.promise)).to.equal(true);
    });
  });
});
