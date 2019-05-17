// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IPoll, Poll } from '@jupyterlab/coreutils';

import { sleep } from '@jupyterlab/testutils';

class TestPoll<T = void, U = void, V extends string = 'standby'> extends Poll<
  T,
  U,
  V
> {
  async schedule(
    next: Partial<
      IPoll.State<T, U, V> & { cancel: (last: IPoll.State<T, U, V>) => boolean }
    > = {}
  ) {
    return super.schedule(next);
  }
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

    it('should be `when-resolved` after `when` resolves', async () => {
      const promise = Promise.resolve();
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#constructor()-2',
        when: promise
      });
      expect(poll.state.phase).to.equal('constructed');
      await promise;
      expect(poll.state.phase).to.equal('when-resolved');
    });

    it('should be `when-rejected` after `when` rejects', async () => {
      const promise = Promise.reject();
      poll = new Poll({
        factory: () => Promise.resolve(),
        name: '@jupyterlab/test-coreutils:Poll#constructor()-3',
        when: promise
      });
      expect(poll.state.phase).to.equal('constructed');
      await promise.catch(() => undefined);
      expect(poll.state.phase).to.equal('when-rejected');
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

      it('should set backoff', () => {
        const backoff = false;
        poll = new Poll({
          factory: () => Promise.resolve(),
          frequency: { backoff },
          name: '@jupyterlab/test-coreutils:Poll#frequency:backoff-1'
        });
        expect(poll.frequency.backoff).to.equal(backoff);
      });

      it('should default backoff to `true`', () => {
        poll = new Poll({
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#frequency:backoff-2'
        });
        expect(poll.frequency.backoff).to.equal(true);
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

      it('should default max to 30s', () => {
        const interval = 500;
        const max = 30 * 1000;
        poll = new Poll({
          frequency: { interval },
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#frequency:max-2'
        });
        expect(poll.frequency.max).to.equal(max);
      });
      it('should default max to 30s', () => {
        const interval = 500;
        const max = 30 * 1000;
        poll = new Poll({
          frequency: { interval },
          factory: () => Promise.resolve(),
          name: '@jupyterlab/test-coreutils:Poll#frequency:max-2'
        });
        expect(poll.frequency.max).to.equal(max);
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
        frequency: { interval: 2000, backoff: false },
        name: '@jupyterlab/test-coreutils:Poll#tick-1'
      });
      const expected = 'when-resolved resolved';
      const ticker: IPoll.Phase<any>[] = [];
      const tock = (poll: Poll) => {
        ticker.push(poll.state.phase);
        poll.tick.then(tock).catch(() => undefined);
      };
      void poll.tick.then(tock);
      await sleep(200); // Sleep for less than the interval.
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should resolve after `ticked` emits in lock step', async () => {
      poll = new Poll({
        factory: () =>
          Math.random() > 0.5 ? Promise.resolve() : Promise.reject(),
        frequency: { interval: 0, backoff: false },
        name: '@jupyterlab/test-coreutils:Poll#tick-2'
      });
      const ticker: IPoll.Phase<any>[] = [];
      const tocker: IPoll.Phase<any>[] = [];
      poll.ticked.connect(async (_, state) => {
        ticker.push(state.phase);
        expect(ticker.length).to.equal(tocker.length + 1);
      });
      const tock = async (poll: Poll) => {
        tocker.push(poll.state.phase);
        expect(ticker.join(' ')).to.equal(tocker.join(' '));
        poll.tick.then(tock).catch(() => undefined);
      };
      // Kick off the promise listener, but void its settlement to verify that
      // the poll's internal sync of the promise and the signal is correct.
      void poll.tick.then(tock);
      await poll.stop();
      await poll.start();
      await poll.tick;
      await poll.refresh();
      await poll.tick;
      await poll.refresh();
      await poll.tick;
      await poll.refresh();
      await poll.tick;
      await poll.stop();
      await poll.start();
      await poll.tick;
      await sleep(100);
      await poll.tick;
      expect(ticker.join(' ')).to.equal(tocker.join(' '));
    });
  });

  describe('#ticked', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should emit when the poll ticks after `when` resolves', async () => {
      const expected = 'when-resolved resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll<void, void>({
        factory: () => Promise.resolve(),
        frequency: { interval: 2000, backoff: false },
        name: '@jupyterlab/test-coreutils:Poll#ticked-1'
      });
      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await sleep(200); // Sleep for less than the interval.
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should emit when the poll ticks after `when` rejects', async () => {
      const expected = 'when-rejected resolved';
      const ticker: IPoll.Phase<any>[] = [];
      const promise = Promise.reject();
      poll = new Poll({
        factory: () => Promise.resolve(),
        frequency: { interval: 2000, backoff: false },
        name: '@jupyterlab/test-coreutils:Poll#ticked-2',
        when: promise
      });
      poll.ticked.connect(() => {
        ticker.push(poll.state.phase);
      });
      await promise.catch(() => undefined);
      await sleep(200); // Sleep for less than the interval.
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should emit a tick identical to the poll state', async () => {
      poll = new Poll<void, void>({
        factory: () => Promise.resolve(),
        frequency: { interval: 100, backoff: false },
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
      let tick: Promise<Poll>;
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

    it('should refresh the poll when the poll is ready', async () => {
      const expected = 'when-resolved refreshed resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.refresh();
      expect(poll.state.phase).to.equal('refreshed');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('should be safe to call multiple times', async () => {
      const expected = 'when-resolved refreshed resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#refresh()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.tick;
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.refresh();
      expect(poll.state.phase).to.equal('refreshed');
      await poll.refresh();
      expect(poll.state.phase).to.equal('refreshed');
      await poll.refresh();
      expect(poll.state.phase).to.equal('refreshed');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#start()', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should start the poll if it is stopped', async () => {
      const expected = 'when-resolved stopped started resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      await poll.tick;
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.start();
      expect(poll.state.phase).to.equal('started');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times and no-op if unnecessary', async () => {
      const expected = 'when-resolved resolved stopped started resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#start()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.start();
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.start();
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.start();
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.start();
      expect(poll.state.phase).to.equal('started');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#stop()', () => {
    let poll: Poll;

    afterEach(() => {
      poll.dispose();
    });

    it('should stop the poll if it is active', async () => {
      const expected = 'when-resolved stopped started resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-1',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.start();
      expect(poll.state.phase).to.equal('started');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });

    it('be safe to call multiple times', async () => {
      const expected = 'when-resolved stopped started resolved';
      const ticker: IPoll.Phase<any>[] = [];
      poll = new Poll({
        name: '@jupyterlab/test-coreutils:Poll#stop()-2',
        frequency: { interval: 100 },
        factory: () => Promise.resolve()
      });
      poll.ticked.connect((_, tick) => {
        ticker.push(tick.phase);
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.stop();
      expect(poll.state.phase).to.equal('stopped');
      await poll.start();
      expect(poll.state.phase).to.equal('started');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      expect(ticker.join(' ')).to.equal(expected);
    });
  });

  describe('#schedule()', () => {
    let poll: TestPoll;

    afterEach(() => {
      poll.dispose();
    });

    it('should schedule the next poll state', async () => {
      poll = new TestPoll({
        factory: () => Promise.resolve(),
        frequency: { interval: 100 },
        name: '@jupyterlab/test-coreutils:Poll#schedule()-1'
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.tick;
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      await poll.schedule({ phase: 'refreshed' });
      expect(poll.state.phase).to.equal('refreshed');
      return;
    });

    it('should default to standby state', async () => {
      poll = new TestPoll({
        factory: () => Promise.resolve(),
        frequency: { interval: 100 },
        name: '@jupyterlab/test-coreutils:Poll#schedule()-2'
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.tick;
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      await poll.schedule();
      expect(poll.state.phase).to.equal('standby');
      return;
    });

    it('should support phase transition cancellation', async () => {
      poll = new TestPoll({
        factory: () => Promise.resolve(),
        frequency: { interval: 100 },
        name: '@jupyterlab/test-coreutils:Poll#schedule()-3'
      });
      expect(poll.state.phase).to.equal('constructed');
      await poll.tick;
      expect(poll.state.phase).to.equal('when-resolved');
      await poll.tick;
      expect(poll.state.phase).to.equal('resolved');
      await poll.schedule();
      expect(poll.state.phase).to.equal('standby');
      await poll.schedule({
        cancel: last => last.phase === 'standby',
        phase: 'refreshed'
      });
      expect(poll.state.phase).to.equal('standby');
      return;
    });
  });
});
