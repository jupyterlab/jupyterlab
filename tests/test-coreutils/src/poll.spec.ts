// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IPoll, Poll } from '@jupyterlab/coreutils/src';

import { sleep } from '@jupyterlab/testutils';

import { PromiseDelegate } from '@phosphor/coreutils';

class TestPoll<T = any, U = any> extends Poll<T, U> {
  protected schedule(
    tick: IPoll.Tick<T, U>,
    outstanding?: PromiseDelegate<this>
  ): void {
    super.schedule(tick, outstanding);
    this.scheduled.push(tick.phase);
  }

  scheduled: string[] = [];
}

describe('Poll', () => {
  describe('#constructor()', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should create a poll', () => {
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#constructor()-1',
        when: new Promise(() => undefined) // Never.
      });
      expect(poll).to.be.an.instanceof(Poll);
    });

    it('should be `instantiated` and tick after `when` resolves', async () => {
      const promise = Promise.resolve();
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#constructor()-2',
        when: promise
      });
      expect(poll.state.phase).to.equal('instantiated');
      await promise;
      expect(poll.state.phase).to.equal('instantiated-resolved');
    });

    it('should be `instantiated` and tick after `when` rejects', async () => {
      const promise = Promise.reject();
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#constructor()-3',
        when: promise
      });
      expect(poll.state.phase).to.equal('instantiated');
      await promise.catch(() => undefined);
      expect(poll.state.phase).to.equal('instantiated-rejected');
    });

    describe('#options.frequency', () => {
      let poll: Poll;

      afterEach(() => {
        poll.dispose();
      });

      it('should set frequency interval', () => {
        const interval = 9000;
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: { interval },
          name: '@jupyterlab/test-coreutils:Poll#frequency:interval-1'
        });
        expect(poll.frequency.interval).to.equal(interval);
      });

      it('should default frequency interval to `1000`', () => {
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: {},
          name: '@jupyterlab/test-coreutils:Poll#frequency:interval-2'
        });
        expect(poll.frequency.interval).to.equal(1000);
      });

      it('should set jitter', () => {
        const jitter = false;
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: { jitter },
          name: '@jupyterlab/test-coreutils:Poll#frequency:jitter-1'
        });
        expect(poll.frequency.jitter).to.equal(jitter);
      });

      it('should default jitter to `0`', () => {
        poll = new Poll({
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#frequency:jitter-2'
        });
        expect(poll.frequency.jitter).to.equal(0);
      });

      it('should set max value', () => {
        const max = 200000;
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: { max },
          name: '@jupyterlab/test-coreutils:Poll#max-1'
        });
        expect(poll.frequency.max).to.equal(200000);
      });

      it('should default max to 10x the interval', () => {
        const interval = 500;
        const max = 10 * interval;
        poll = new Poll({
          frequency: { interval },
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#frequency:max-2'
        });
        expect(poll.frequency.max).to.equal(max);
      });

      it('should set min', () => {
        const min = 250;
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: { min },
          name: '@jupyterlab/test-coreutils:Poll#min-1'
        });
        expect(poll.frequency.min).to.equal(min);
      });

      it('should default min to `100`', () => {
        const min = 100;
        poll = new Poll({
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#min-2'
        });
        expect(poll.frequency.min).to.equal(min);
        poll.dispose();
      });
    });
  });

  describe('#name', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should be set to value passed in during instantation', () => {
      const factory = () => Promise.resolve();
      const name = '@jupyterlab/test-coreutils:Poll#name-1';
      poll = new Poll({ factory, name });
      expect(poll.name).to.equal(name);
      poll.dispose();
    });

    it('should default to `unknown`', () => {
      poll = new Poll({ factory: () => Promise.resolve() });
      expect(poll.name).to.equal('unknown');
      poll.dispose();
    });
  });

  describe('#disposed', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should emit when the poll is disposed', () => {
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#disposed-1'
      });
      let disposed = false;
      poll.disposed.connect(() => {
        disposed = true;
      });
      poll.dispose();
      expect(disposed).to.equal(true);
    });
  });

  describe('#isDisposed', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should indicate whether the poll is disposed', () => {
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#isDisposed-1'
      });
      expect(poll.isDisposed).to.equal(false);
      poll.dispose();
      expect(poll.isDisposed).to.equal(true);
    });
  });

  describe('#tick', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should resolve after a tick', async () => {
      poll = new Poll({
        factory: () => Promise.resolve(),
        frequency: { interval: 400, jitter: 0 },
        name: '@jupyterlab/test-coreutils:Poll#tick-1'
      });
      const expected = 'instantiated-resolved resolved';
      const ticker: IPoll.Phase[] = [];
      const tock = (poll: IPoll) => {
        ticker.push(poll.state.phase);
        poll.tick.then(tock).catch(() => undefined);
      };
      void poll.tick.then(tock);
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
    });
  });

  describe('#ticked', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should emit when the poll ticks after `when` resolves', async () => {
      const expected = 'instantiated-resolved resolved';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll<void, void>({
        factory: () => Promise.resolve(),
        frequency: { interval: 400, jitter: 0 },
        name: '@jupyterlab/test-coreutils:Poll#ticked-1'
      });
      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
    });

    it('should emit when the poll ticks after `when` rejects', async () => {
      const expected = 'instantiated-rejected resolved';
      const ticker: IPoll.Phase[] = [];
      const promise = Promise.reject();
      poll = new Poll({
        factory: () => Promise.resolve(),
        frequency: { interval: 400, jitter: 0 },
        name: '@jupyterlab/test-coreutils:Poll#ticked-2',
        when: promise
      });
      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await promise.catch(() => undefined);
      await sleep(750);
      expect(ticker.join(' ')).to.eql(expected);
    });

    it('should emit a tick identical to the poll state', async () => {
      poll = new Poll<void, void>({
        factory: () => Promise.resolve(),
        frequency: { interval: 100, jitter: 0 },
        name: '@jupyterlab/test-coreutils:Poll#ticked-3'
      });
      poll.ticked.connect((_, tick) => {
        expect(tick).to.equal(poll.state);
      });
      await sleep(250);
    });
  });

  describe('#dispose()', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should dispose the poll and be safe to call repeatedly', async () => {
      let rejected = false;
      let tick: Promise<IPoll>;
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#dispose()-1',
        factory: () => Promise.resolve()
      });
      tick = poll.tick;
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
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should interrupt current tick and refresh the poll', async () => {
      const expected = 'instantiated-resolved refreshed resolved';
      const ticker: IPoll.Phase[] = [];
      let tick: Promise<IPoll>;
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      tick = poll.tick;
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.refresh();
      expect(tick).not.to.equal(poll.tick);
      await tick;
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should be safe to call multiple times', async () => {
      const expected = 'instantiated-resolved refreshed resolved';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
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
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should start the poll if it is stopped', async () => {
      const expected = 'instantiated-resolved stopped started resolved';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times', async () => {
      const expected = 'instantiated-resolved resolved';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
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
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should stop the poll if it is active', async () => {
      const expected = 'instantiated-resolved stopped started resolved';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times', async () => {
      const expected = 'instantiated-resolved stopped';
      const ticker: IPoll.Phase[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.stop();
      await poll.stop();
      await poll.stop();
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#schedule()', () => {
    let poll: TestPoll;

    afterEach(() => {
      poll.dispose();
    });

    it('should schedule a poll tick', async () => {
      const expected = 'instantiated-resolved stopped started resolved';
      poll = new TestPoll({
        name: '@jupyterlab/test-coreutils:Poll#schedule()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      await poll.stop();
      await poll.start();
      await poll.tick;
      expect(poll.scheduled.join(' ')).to.equal(expected);
    });
  });
});
