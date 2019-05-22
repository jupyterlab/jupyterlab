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
    it('should rate limit invocations', async () => {
      const limit = 500;
      const wanted = [1, 1, 1, 1, 1, 1];
      let called = 0;

      debouncer = new Debouncer(async () => ++called, limit);

      const one = debouncer.invoke();
      const two = debouncer.invoke();
      const three = debouncer.invoke();
      const four = debouncer.invoke();
      const five = debouncer.invoke();
      const six = debouncer.invoke();

      expect(await one).to.equal(wanted[0]);
      expect(await two).to.equal(wanted[1]);
      expect(await three).to.equal(wanted[2]);
      expect(await four).to.equal(wanted[3]);
      expect(await five).to.equal(wanted[4]);
      expect(await six).to.equal(wanted[5]);
    });

    it('should debounce invocations within an interval', async () => {
      const limit = 500;
      const sleeps = [200, 200, 200, 200, 600];
      const wanted = [1, 1, 1, 1, 1, 2];
      let called = 0;

      debouncer = new Debouncer(async () => ++called, limit);

      const one = debouncer.invoke();
      await sleep(sleeps[0]);
      const two = debouncer.invoke();
      await sleep(sleeps[1]);
      const three = debouncer.invoke();
      await sleep(sleeps[2]);
      const four = debouncer.invoke();
      await sleep(sleeps[3]);
      const five = debouncer.invoke();
      await sleep(sleeps[4]);
      const six = debouncer.invoke();

      expect(await one).to.equal(wanted[0]);
      expect(await two).to.equal(wanted[1]);
      expect(await three).to.equal(wanted[2]);
      expect(await four).to.equal(wanted[3]);
      expect(await five).to.equal(wanted[4]);
      expect(await six).to.equal(wanted[5]);
    });
  });
});

describe('Throttler', () => {
  let throttler: Throttler;

  afterEach(() => {
    throttler.dispose();
  });

  describe('#invoke()', () => {
    it('should rate limit invocations', async () => {
      const limit = 500;
      const wanted = [1, 1, 1, 1, 1, 1];
      let called = 0;

      throttler = new Debouncer(async () => ++called, limit);

      const one = throttler.invoke();
      const two = throttler.invoke();
      const three = throttler.invoke();
      const four = throttler.invoke();
      const five = throttler.invoke();
      const six = throttler.invoke();

      expect(await one).to.equal(wanted[0]);
      expect(await two).to.equal(wanted[1]);
      expect(await three).to.equal(wanted[2]);
      expect(await four).to.equal(wanted[3]);
      expect(await five).to.equal(wanted[4]);
      expect(await six).to.equal(wanted[5]);
    });

    it('should throttle invocations within an interval', async () => {
      const limit = 500;
      const sleeps = [200, 200, 200, 200, 600];
      const wanted = [1, 1, 1, 2, 2, 3];
      let called = 0;

      throttler = new Throttler(async () => ++called, limit);

      const one = throttler.invoke();
      await sleep(sleeps[0]);
      const two = throttler.invoke();
      await sleep(sleeps[1]);
      const three = throttler.invoke();
      await sleep(sleeps[2]);
      const four = throttler.invoke();
      await sleep(sleeps[3]);
      const five = throttler.invoke();
      await sleep(sleeps[4]);
      const six = throttler.invoke();

      expect(await one).to.equal(wanted[0]);
      expect(await two).to.equal(wanted[1]);
      expect(await three).to.equal(wanted[2]);
      expect(await four).to.equal(wanted[3]);
      expect(await five).to.equal(wanted[4]);
      expect(await six).to.equal(wanted[5]);
    });
  });
});
