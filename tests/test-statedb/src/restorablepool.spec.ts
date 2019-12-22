// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { RestorablePool } from '@jupyterlab/statedb';

import { signalToPromise } from '@jupyterlab/testutils';

import { IObservableDisposable } from '@lumino/disposable';

import { ISignal, Signal } from '@lumino/signaling';

const namespace = 'restorable-pool-test';

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
  describe('RestorablePool', () => {
    let pool: RestorablePool<ObservableDisposable>;

    beforeEach(() => {
      pool = new RestorablePool({ namespace });
    });

    afterEach(() => {
      pool.dispose();
    });

    describe('#constructor()', () => {
      it('should create a RestorablePool', () => {
        expect(pool).to.be.an.instanceof(RestorablePool);
      });
    });

    describe('#added', () => {
      it('should emit when an instance has been added', async () => {
        const instance = new ObservableDisposable();
        const promise = signalToPromise(pool.added);
        await pool.add(instance);
        const [sender, args] = await promise;
        expect(sender).to.equal(pool);
        expect(args).to.equal(instance);
        instance.dispose();
      });
    });
    describe('#current', () => {
      it('should default to null', () => {
        expect(pool.current).to.be.null;
      });

      it('should be settable by client code', async () => {
        const instance = new ObservableDisposable();
        void pool.add(instance);
        expect(pool.current).to.equal(null);
        pool.current = instance;
        expect(pool.current).to.equal(instance);
        instance.dispose();
      });

      it('should be a no-op if set to an untracked instance', async () => {
        const instance = new ObservableDisposable();
        expect(pool.current).to.equal(null);
        pool.current = instance;
        expect(pool.current).to.equal(null);
        instance.dispose();
      });
    });

    describe('#currentChanged', () => {
      it('should emit when the current object has been updated', async () => {
        const instance = new ObservableDisposable();
        const promise = signalToPromise(pool.currentChanged);
        void pool.add(instance);
        pool.current = instance;
        await promise;
        instance.dispose();
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the pool is disposed', () => {
        expect(pool.isDisposed).to.equal(false);
        pool.dispose();
        expect(pool.isDisposed).to.equal(true);
      });
    });

    describe('#add()', () => {
      it('should add an instance to the pool', async () => {
        const instance = new ObservableDisposable();
        expect(pool.has(instance)).to.equal(false);
        await pool.add(instance);
        expect(pool.has(instance)).to.equal(true);
      });

      it('should reject an instance that already exists', async () => {
        const instance = new ObservableDisposable();
        let failed = false;
        expect(pool.has(instance)).to.equal(false);
        await pool.add(instance);
        expect(pool.has(instance)).to.equal(true);
        try {
          await pool.add(instance);
        } catch (error) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });

      it('should reject an instance that is disposed', async () => {
        const instance = new ObservableDisposable();
        let failed = false;
        expect(pool.has(instance)).to.equal(false);
        instance.dispose();
        try {
          await pool.add(instance);
        } catch (error) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });

      it('should remove an added instance if it is disposed', async () => {
        const instance = new ObservableDisposable();
        await pool.add(instance);
        expect(pool.has(instance)).to.equal(true);
        instance.dispose();
        expect(pool.has(instance)).to.equal(false);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the pool', () => {
        expect(pool.isDisposed).to.equal(false);
        pool.dispose();
        expect(pool.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        expect(pool.isDisposed).to.equal(false);
        pool.dispose();
        pool.dispose();
        expect(pool.isDisposed).to.equal(true);
      });
    });

    describe('#find()', () => {
      it('should find a tracked item that matches a filter function', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        void pool.add(instanceA);
        void pool.add(instanceB);
        void pool.add(instanceC);
        expect(pool.find(obj => obj.id === 'B')).to.equal(instanceB);
        instanceA.dispose();
        instanceB.dispose();
        instanceC.dispose();
      });

      it('should return a void if no item is found', () => {
        const instanceA = new ObservableDisposable('A');
        const instanceB = new ObservableDisposable('B');
        const instanceC = new ObservableDisposable('C');
        void pool.add(instanceA);
        void pool.add(instanceB);
        void pool.add(instanceC);
        expect(pool.find(widget => widget.id === 'D')).to.not.be.ok;
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
        void pool.add(instanceA);
        void pool.add(instanceB);
        void pool.add(instanceC);
        const list = pool.filter(obj => obj.id.indexOf('include') !== -1);
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
        void pool.add(instanceA);
        void pool.add(instanceB);
        void pool.add(instanceC);
        expect(pool.filter(widget => widget.id === 'D').length).to.equal(0);
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
        void pool.add(instanceA);
        void pool.add(instanceB);
        void pool.add(instanceC);
        pool.forEach(obj => {
          visited += obj.id;
        });
        expect(visited).to.equal('ABC');
      });
    });

    describe('#has()', () => {
      it('should return `true` if an item exists in the pool', () => {
        const instance = new ObservableDisposable();
        expect(pool.has(instance)).to.equal(false);
        void pool.add(instance);
        expect(pool.has(instance)).to.equal(true);
      });
    });
  });
});
