// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { InstanceTracker } from '@jupyterlab/coreutils';

import { signalToPromise } from '@jupyterlab/testutils';

import { IObservableDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

const namespace = 'instance-tracker-test';

class ObservableDisposable implements IObservableDisposable {
  constructor(public id: string = '') {
    // no-op
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit(undefined);
    Signal.clearData(this);
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
}

describe('@jupyterlab/coreutils', () => {
  describe('InstanceTracker', () => {
    let tracker: InstanceTracker<ObservableDisposable>;

    beforeEach(() => {
      tracker = new InstanceTracker({ namespace });
    });

    afterEach(() => {
      tracker.dispose();
    });

    describe('#constructor()', () => {
      it('should create an InstanceTracker', () => {
        expect(tracker).to.be.an.instanceof(InstanceTracker);
      });
    });

    describe('#added', () => {
      it('should emit when an instance has been added', async () => {
        const instance = new ObservableDisposable();
        const promise = signalToPromise(tracker.added);
        await tracker.add(instance);
        const [sender, args] = await promise;
        expect(sender).to.equal(tracker);
        expect(args).to.equal(instance);
        instance.dispose();
      });
    });
    describe('#current', () => {
      it('should default to null', () => {
        expect(tracker.current).to.be.null;
      });

      it('should be settable by client code', async () => {
        const instance = new ObservableDisposable();
        void tracker.add(instance);
        expect(tracker.current).to.equal(null);
        tracker.current = instance;
        expect(tracker.current).to.equal(instance);
        instance.dispose();
      });

      it('should be a no-op if set to an untracked instance', async () => {
        const instance = new ObservableDisposable();
        expect(tracker.current).to.equal(null);
        tracker.current = instance;
        expect(tracker.current).to.equal(null);
        instance.dispose();
      });
    });

    describe('#currentChanged', () => {
      it('should emit when the current object has been updated', async () => {
        const instance = new ObservableDisposable();
        const promise = signalToPromise(tracker.currentChanged);
        void tracker.add(instance);
        tracker.current = instance;
        await promise;
        instance.dispose();
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the tracker is disposed', () => {
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });
    });

    describe('#add()', () => {
      it('should add an instance to the tracker', async () => {
        const instance = new ObservableDisposable();
        expect(tracker.has(instance)).to.equal(false);
        await tracker.add(instance);
        expect(tracker.has(instance)).to.equal(true);
      });

      it('should reject an instance that already exists', async () => {
        const instance = new ObservableDisposable();
        let failed = false;
        expect(tracker.has(instance)).to.equal(false);
        await tracker.add(instance);
        expect(tracker.has(instance)).to.equal(true);
        try {
          await tracker.add(instance);
        } catch (error) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });

      it('should reject an instance that is disposed', async () => {
        const instance = new ObservableDisposable();
        let failed = false;
        expect(tracker.has(instance)).to.equal(false);
        instance.dispose();
        try {
          await tracker.add(instance);
        } catch (error) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });

      it('should remove an added instance if it is disposed', async () => {
        const instance = new ObservableDisposable();
        await tracker.add(instance);
        expect(tracker.has(instance)).to.equal(true);
        instance.dispose();
        expect(tracker.has(instance)).to.equal(false);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the tracker', () => {
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        expect(tracker.isDisposed).to.equal(false);
        tracker.dispose();
        tracker.dispose();
        expect(tracker.isDisposed).to.equal(true);
      });
    });

    describe('#find()', () => {
      it('should find a tracked item that matches a filter function', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        void tracker.add(instanceA);
        void tracker.add(instanceB);
        void tracker.add(instanceC);
        expect(tracker.find(obj => obj.id === 'B')).to.equal(instanceB);
        instanceA.dispose();
        instanceB.dispose();
        instanceC.dispose();
      });

      it('should return a void if no item is found', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        void tracker.add(instanceA);
        void tracker.add(instanceB);
        void tracker.add(instanceC);
        expect(tracker.find(widget => widget.id === 'D')).to.not.be.ok;
        instanceA.dispose();
        instanceB.dispose();
        instanceC.dispose();
      });
    });

    describe('#filter()', () => {
      it('should filter according to a predicate function', () => {
        const instanceA = new ObservableDisposable('include-A');
        const instanceB = new ObservableDisposable('include-B');
        const instanceC = new ObservableDisposable('exclude-C');
        void tracker.add(instanceA);
        void tracker.add(instanceB);
        void tracker.add(instanceC);
        const list = tracker.filter(obj => obj.id.indexOf('include') !== -1);
        expect(list.length).to.equal(2);
        expect(list[0]).to.equal(instanceA);
        expect(list[1]).to.equal(instanceB);
        instanceA.dispose();
        instanceB.dispose();
        instanceC.dispose();
      });

      it('should return an empty array if no item is found', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        void tracker.add(instanceA);
        void tracker.add(instanceB);
        void tracker.add(instanceC);
        expect(tracker.filter(widget => widget.id === 'D').length).to.equal(0);
        instanceA.dispose();
        instanceB.dispose();
        instanceC.dispose();
      });
    });

    describe('#forEach()', () => {
      it('should iterate through all the tracked items', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        let visited = '';
        void tracker.add(instanceA);
        void tracker.add(instanceB);
        void tracker.add(instanceC);
        tracker.forEach(obj => {
          visited += obj.id;
        });
        expect(visited).to.equal('ABC');
      });
    });

    describe('#has()', () => {
      it('should return `true` if an item exists in the tracker', () => {
        const instance = new ObservableDisposable();
        expect(tracker.has(instance)).to.equal(false);
        void tracker.add(instance);
        expect(tracker.has(instance)).to.equal(true);
      });
    });
  });
});
