// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Debouncer, Throttler } from '@jupyterlab/coreutils';

import { sleep } from '@jupyterlab/testutils';

describe('Debouncer', () => {
  let debouncer: Debouncer;

  afterEach(() => {
    debouncer.dispose();
  });

  describe('#invoke()', () => {
    it('should debounce a function', async () => {
      let called = 0;
      const limit = 500;

      debouncer = new Debouncer(async () => ++called, limit);

      let one = debouncer.invoke();
      let two = debouncer.invoke();
      let three = debouncer.invoke();
      let four = debouncer.invoke();
      let five = debouncer.invoke();
      let six = debouncer.invoke();

      expect(await one).to.equal(1);
      expect(await two).to.equal(1);
      expect(await three).to.equal(1);
      expect(await four).to.equal(1);
      expect(await five).to.equal(1);
      expect(await six).to.equal(1);

      one = debouncer.invoke();
      await sleep(300);
      two = debouncer.invoke();
      await sleep(300);
      three = debouncer.invoke();
      await sleep(300);
      four = debouncer.invoke();
      await sleep(300);
      five = debouncer.invoke();
      await sleep(300);
      six = debouncer.invoke();

      expect(await one).to.equal(2);
      expect(await two).to.equal(2);
      expect(await three).to.equal(2);
      expect(await four).to.equal(2);
      expect(await five).to.equal(2);
      expect(await six).to.equal(2);
    });
  });
});

describe('Throttler', () => {
  let throttler: Throttler;

  afterEach(() => {
    throttler.dispose();
  });

  describe('#invoke()', () => {
    it('should throttle a function', async () => {
      let called = 0;
      const limit = 500;

      throttler = new Throttler(async () => ++called, limit);

      let one = throttler.invoke();
      let two = throttler.invoke();
      let three = throttler.invoke();
      let four = throttler.invoke();
      let five = throttler.invoke();
      let six = throttler.invoke();

      expect(await one).to.equal(1);
      expect(await two).to.equal(1);
      expect(await three).to.equal(1);
      expect(await four).to.equal(1);
      expect(await five).to.equal(1);
      expect(await six).to.equal(1);

      one = throttler.invoke();
      await sleep(300);
      two = throttler.invoke();
      await sleep(300);
      three = throttler.invoke();
      await sleep(300);
      four = throttler.invoke();
      await sleep(300);
      five = throttler.invoke();
      await sleep(300);
      six = throttler.invoke();

      expect(await one).to.equal(2);
      expect(await two).to.equal(2);
      expect(await three).to.equal(3);
      expect(await four).to.equal(3);
      expect(await five).to.equal(4);
      expect(await six).to.equal(4);
    });
  });
});
