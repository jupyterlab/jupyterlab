// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Poll } from '@jupyterlab/coreutils/src';

import { sleep } from '@jupyterlab/testutils';

describe('Poll', () => {
  describe('#constructor()', () => {
    it('should create a poll', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        interval: 1000,
        name: '@jupyterlab/test-coreutils:Poll#constructor()-1',
        when: new Promise(() => undefined) // Never.
      });

      expect(poll).to.be.an.instanceof(Poll);
      poll.dispose();
    });

    it('should be `instantiated` and tick after `when` resolves', async () => {
      const promise = Promise.resolve();
      const poll = new Poll({
        factory: () => Promise.resolve(),
        interval: 1000,
        name: '@jupyterlab/test-coreutils:Poll#constructor()-2',
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
        factory: () => Promise.resolve(),
        interval: 1000,
        name: '@jupyterlab/test-coreutils:Poll#constructor()-3',
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
        factory: () => Promise.resolve(),
        interval: 9000,
        name: '@jupyterlab/test-coreutils:Poll#interval-1'
      });

      expect(poll.interval).to.equal(9000);
      poll.dispose();
    });

    it('should default to `1000`', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#interval-2'
      });

      expect(poll.interval).to.equal(1000);
      poll.dispose();
    });
  });

  describe('#jitter', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        jitter: 0.5,
        name: '@jupyterlab/test-coreutils:Poll#jitter-1'
      });

      expect(poll.jitter).to.equal(0.5);
      poll.dispose();
    });

    it('should default to `0`', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#jitter-2'
      });

      expect(poll.jitter).to.equal(0);
      poll.dispose();
    });

    it('should be settable to a number', () => {
      const jitter = 3;
      const poll = new Poll({
        factory: () => Promise.resolve(),
        jitter: jitter,
        name: '@jupyterlab/test-coreutils:Poll#jitter-3'
      });

      expect(poll.jitter).to.equal(jitter);
      poll.dispose();
    });

    it('should be settable to a boolean', () => {
      const jitter = false;
      const poll = new Poll({
        factory: () => Promise.resolve(),
        jitter: jitter,
        name: '@jupyterlab/test-coreutils:Poll#jitter-4'
      });

      expect(poll.jitter).to.equal(jitter);
      poll.dispose();
    });
  });

  describe('#max', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        max: 200000,
        name: '@jupyterlab/test-coreutils:Poll#max-1'
      });

      expect(poll.max).to.equal(200000);
      poll.dispose();
    });

    it('should default to 10x the interval', () => {
      const poll = new Poll({
        interval: 500,
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#max-2'
      });

      expect(poll.max).to.equal(10 * 500);
      poll.dispose();
    });
  });

  describe('#min', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        min: 250,
        name: '@jupyterlab/test-coreutils:Poll#min-1'
      });

      expect(poll.min).to.equal(250);
      poll.dispose();
    });

    it('should default to `100`', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#min-2'
      });

      expect(poll.min).to.equal(100);
      poll.dispose();
    });
  });

  describe('#name', () => {
    it('should be set to value passed in during instantation', () => {
      const factory = () => Promise.resolve();
      const name = '@jupyterlab/test-coreutils:Poll#name-1';
      const poll = new Poll({ factory, name });

      expect(poll.name).to.equal(name);
      poll.dispose();
    });

    it('should default to `unknown`', () => {
      const poll = new Poll({ factory: () => Promise.resolve() });

      expect(poll.name).to.equal('unknown');
      poll.dispose();
    });
  });

  describe('#readonly', () => {
    it('should be set to value passed in during instantation', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#readonly-1',
        readonly: true
      });

      expect(poll.readonly).to.equal(true);
      poll.dispose();
    });

    it('should default to `false`', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#readonly-2'
      });

      expect(poll.readonly).to.equal(false);
      poll.dispose();
    });

    it('should ignore changing poll frequency params if `true`', () => {
      const interval = 900;
      const jitter = 0.3;
      const max = interval * 20;
      const min = 200;
      const poll = new Poll({
        factory: () => Promise.resolve(),
        interval,
        jitter,
        max,
        min,
        name: '@jupyterlab/test-coreutils:Poll#readonly-3',
        readonly: true
      });

      poll.interval = interval * 2;
      poll.jitter = jitter * 2;
      poll.max = max * 2;
      poll.min = min * 2;

      expect(poll.interval).to.equal(interval);
      expect(poll.jitter).to.equal(jitter);
      expect(poll.max).to.equal(max);
      expect(poll.min).to.equal(min);
      poll.dispose();
    });

    it('should ignore refresh/start/stop if `true`', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#readonly-4',
        interval: 100,
        factory: () => Promise.resolve(),
        readonly: true
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.refresh();
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#disposed', () => {
    it('should emit when the poll is disposed', () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#disposed-1'
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
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#isDisposed-1'
      });

      expect(poll.isDisposed).to.equal(false);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
    });
  });

  describe('#tick', () => {
    it('should resolve after a tick', async () => {
      const poll = new Poll({
        factory: () => Promise.resolve(),
        interval: 400,
        jitter: 0,
        name: '@jupyterlab/test-coreutils:Poll#tick-1'
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: Poll.Phase[] = [];
      const tock = (poll: Poll) => {
        ticker.push(poll.state.phase);
        poll.tick.then(tock).catch(() => undefined);
      };

      void poll.tick.then(tock);
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
      poll.dispose();
    });
  });

  describe('#ticked', () => {
    it('should emit when the poll ticks after `when` resolves', async () => {
      const poll = new Poll<void, void>({
        factory: () => Promise.resolve(),
        interval: 400,
        jitter: 0,
        name: '@jupyterlab/test-coreutils:Poll#ticked-1'
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
        factory: () => Promise.resolve(),
        interval: 400,
        jitter: 0,
        name: '@jupyterlab/test-coreutils:Poll#ticked-2',
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
        factory: () => Promise.resolve(),
        interval: 100,
        jitter: 0,
        name: '@jupyterlab/test-coreutils:Poll#ticked-3'
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
    it('should dispose the poll and be safe to call repeatedly', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#dispose()-1',
        factory: () => Promise.resolve()
      });
      const tick = poll.tick;
      let rejected = false;

      expect(poll.isDisposed).to.equal(false);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
      try {
        await tick;
      } catch (error) {
        rejected = true;
      }
      poll.dispose();
      expect(rejected).to.equal(true);
    });
  });

  describe('#refresh()', () => {
    it('should interrupt current tick and refresh the poll', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-1',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved refreshed resolved';
      const ticker: Poll.Phase[] = [];
      const interrupted = poll.tick;

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.refresh();
      expect(interrupted).not.to.equal(poll.tick);
      await interrupted;
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should be safe to call multiple times', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-2',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved refreshed resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.refresh();
      await poll.refresh();
      await poll.refresh();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#start()', () => {
    it('should start the poll if it is stopped', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-1',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved stopped started resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-2',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.start();
      await poll.start();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#stop()', () => {
    it('should stop the poll if it is active', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-1',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved stopped started resolved';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times', async () => {
      const poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-2',
        interval: 100,
        factory: () => Promise.resolve()
      });
      const expected = 'instantiated-resolved stopped';
      const ticker: Poll.Phase[] = [];

      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.stop();
      await poll.stop();
      expect(ticker.join(' ')).to.equal(expected);
    });
  });
});
