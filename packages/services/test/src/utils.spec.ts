// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect from 'expect.js';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  Signal
} from '@phosphor/signaling';

import {
  expectFailure, isFulfilled, testEmission
} from './utils';

describe('test/utils', () => {

  context('testEmission', () => {

    it('should resolve to the given value', async () => {
      let owner = {};
      let x = new Signal<{}, number>(owner);
      let emission = testEmission(x, {
        value: 'done'
      });
      x.emit(0);
      expect(await emission).to.be('done');
    });

    it('should find the given emission', async () => {
      let owner = {};
      let x = new Signal<{}, number>(owner);
      let emission = testEmission(x, {
        find: (a, b) => b === 1,
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.be(false);
      x.emit(1);
      expect(await emission).to.be('done');
    });

    it('should reject if the test throws an error', async () => {
      let owner = {};
      let x = new Signal<{}, number>(owner);
      let emission = testEmission(x, {
        find: (a, b) => b === 1,
        test: (a, b) => {
          throw new Error('my error');
        },
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.be(false);
      x.emit(1);
      await expectFailure(emission, null, 'my error');
    });

    it('should resolve if the test succeeds', async () => {
      let owner = {};
      let x = new Signal<{}, number>(owner);
      let emission = testEmission(x, {
        find: (a, b) => b === 1,
        test: (a, b) => {
          expect(b).to.be(1);
        },
        value: 'done'
      });
      x.emit(0);
      expect(await isFulfilled(emission)).to.be(false);
      x.emit(1);
      expect(await emission).to.be('done');
    });

  });

  context('isFulfilled', () => {

    it('should resolve to true only after a promise is fulfilled', async () => {
      let p = new PromiseDelegate<number>();
      expect(await isFulfilled(p.promise)).to.be(false);
      p.resolve(10);
      expect(await isFulfilled(p.promise)).to.be(true);
    });

    it('should resolve to true even if the promise is rejected', async () => {
      let p = new PromiseDelegate<number>();
      expect(await isFulfilled(p.promise)).to.be(false);
      p.reject(new Error('my error'));
      expect(await isFulfilled(p.promise)).to.be(true);
    });

  });

});
