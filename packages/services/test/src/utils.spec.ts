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
  expectFailure, isFulfilled, testEmission, testResolveOrder
} from './utils';

describe.only('test/utils', () => {

  context('testResolveOrder', () => {

    it('should test the resolution order', async () => {
      let p1 = new PromiseDelegate<number>();
      let p2 = new PromiseDelegate<number>();
      let p3 = new PromiseDelegate<number>();
      let p4 = new PromiseDelegate<number>();
      let p5 = new PromiseDelegate<number>();
      let p6 = new PromiseDelegate<number>();
      let p7 = new PromiseDelegate<number>();
      let order = testResolveOrder([p1.promise, p2.promise, p3.promise, p4.promise, p5.promise, p6.promise, p7.promise], [1, 2, 3, 4, 5, 6, 7]);
      [p1, p2, p3, p4, p5, p6, p7].forEach( (p, i) => { p.resolve(i + 1); });
      await order;
    });

    it('should fail if resolution is in a different order', async () => {
      let p1 = new PromiseDelegate<number>();
      let p2 = new PromiseDelegate<number>();
      let order = testResolveOrder([p1.promise, p2.promise], [1, 2]);
      p2.resolve(2);
      p1.resolve(1);
      await expectFailure(order);
    });

  });

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
