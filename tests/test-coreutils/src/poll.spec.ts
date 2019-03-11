// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Poll } from '@jupyterlab/coreutils/src';

import { sleep } from '@jupyterlab/testutils';

describe('Poll', () => {
  describe('#constructor()', () => {
    it('should create a poll', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#constructor()-1',
        interval: 1000,
        factory: () => Promise.resolve(),
        when: new Promise(() => undefined) // Never.
      });

      expect(poll).to.be.an.instanceof(Poll);
      poll.dispose();
    });

    it('should be `instantiated` and tick after `when` resolves', async () => {
      const promise = Promise.resolve();
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#constructor()-2',
        interval: 1000,
        factory: () => Promise.resolve(),
        when: promise
      });

      expect(poll.state.phase).to.equal('instantiated');
      await promise;
      expect(poll.state.phase).to.equal('instantiated-resolved');
      poll.dispose();
    });

    it('should be `instantiated` and tick after `when` rejects', async () => {
      const promise = Promise.reject();
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#constructor()-3',
        interval: 1000,
        factory: () => Promise.resolve(),
        when: promise
      });

      expect(poll.state.phase).to.equal('instantiated');
      await promise.catch(() => undefined);
      expect(poll.state.phase).to.equal('instantiated-rejected');
      poll.dispose();
    });
  });

  describe('#interval', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#interval-1',
        interval: 9000,
        factory: () => Promise.resolve()
      });

      expect(poll.interval).to.equal(9000);
      poll.dispose();
    });

    it('should default to `1000`', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#interval-2',
        factory: () => Promise.resolve()
      });

      expect(poll.interval).to.equal(1000);
      poll.dispose();
    });
  });

  describe('#max', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#max-1',
        max: 200000,
        factory: () => Promise.resolve()
      });

      expect(poll.max).to.equal(200000);
      poll.dispose();
    });

    it('should default to 10x the interval', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#max-2',
        interval: 500,
        factory: () => Promise.resolve()
      });

      expect(poll.max).to.equal(10 * 500);
      poll.dispose();
    });
  });

  describe('#min', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#min-1',
        min: 250,
        factory: () => Promise.resolve()
      });

      expect(poll.min).to.equal(250);
      poll.dispose();
    });

    it('should default to `100`', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#min-2',
        factory: () => Promise.resolve()
      });

      expect(poll.min).to.equal(100);
      poll.dispose();
    });
  });

  describe('#name', () => {
    it('should be set to value passed in during instantation', () => {
      const name = '@jupyterlab/test-coreutils:Poll#name-1';
      const poll = new Poll({ name, factory: () => Promise.resolve() });

      expect(poll.name).to.equal(name);
      poll.dispose();
    });

    it('should default to `unknown`', () => {
      const poll = new Poll({ factory: () => Promise.resolve() });

      expect(poll.name).to.equal('unknown');
      poll.dispose();
    });
  });

  describe('#variance', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#variance-1',
        variance: 0.5,
        factory: () => Promise.resolve()
      });

      expect(poll.variance).to.equal(0.5);
      poll.dispose();
    });

    it('should default to `0.2`', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#variance-2',
        factory: () => Promise.resolve()
      });

      expect(poll.variance).to.equal(0.2);
      poll.dispose();
    });
  });

  describe('#disposed', () => {
    it('should emit when the poll is disposed', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#disposed-1',
        factory: () => Promise.resolve()
      });
      let disposed = false;

      poll.disposed.connect(() => {
        disposed = true;
      });
      poll.dispose();
      expect(disposed).to.equal(true);
      poll.dispose();
    });
  });

  describe('#isDisposed', () => {
    it('should indicate whether the poll is disposed', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#isDisposed-1',
        factory: () => Promise.resolve()
      });

      expect(poll.isDisposed).to.equal(false);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
    });
  });

  describe('#tick', () => {
    it('should resolve after a tick', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#tick-1',
        interval: 400,
        factory: () => Promise.resolve(),
        variance: 0
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: Poll.Phase[] = [];
      const tock = (poll: Poll) => {
        ticker.push(poll.state.phase);
        poll.tick.then(tock).catch(() => undefined);
      };

      poll.tick.then(tock);
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
      poll.dispose();
    });
  });

  describe('#ticked', () => {
    it('should emit when the poll ticks after `when` resolves', async () => {
      const poll = new Poll<void, void>({
        name: '@jupyterlab/test-coreutils:Poll#ticked-1',
        interval: 400,
        factory: () => Promise.resolve(),
        variance: 0
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
      poll.dispose();
    });

    it('should emit when the poll ticks after `when` rejects', async () => {
      const promise = Promise.reject();
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#ticked-2',
        interval: 400,
        factory: () => Promise.resolve(),
        variance: 0,
        when: promise
      });
      const expected = 'instantiated-rejected resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await promise.catch(() => undefined);
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
      poll.dispose();
    });

    it('should emit a tick identical to the poll state', async () => {
      const poll = new Poll<void, void>({
        name: '@jupyterlab/test-coreutils:Poll#ticked-3',
        interval: 100,
        factory: () => Promise.resolve(),
        variance: 0
      });

      poll.ticked.connect((sender: Poll, tick: Poll.Tick<void, void>) => {
        expect(sender).to.equal(poll);
        expect(tick).to.equal(poll.state);
      });
      await sleep(250);
      poll.dispose();
    });
  });

  describe('#dispose()', () => {
    it('should dispose the poll and be safe to call repeatedly', () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#dispose()-1',
        factory: () => Promise.resolve()
      });

      expect(poll.isDisposed).to.equal(false);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
    });
  });
});
