// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  AsyncIteratorSignal,
  AsyncIterableSignal
} from '@jupyterlab/coreutils/src';
import { Signal } from '@phosphor/signaling';

describe('@jupyterlab/coreutils', () => {
  describe('AsyncIteratorSignal', () => {
    describe('next()', () => {
      it('should wait for signal emmission', async () => {
        expect.assertions(3);
        const sender = {};
        const signal = new Signal<{}, number>(sender);
        const asyncIterator = new AsyncIteratorSignal(signal);

        const first = asyncIterator.next();
        const second = asyncIterator.next();
        const third = asyncIterator.next();

        signal.emit(10);
        signal.emit(11);
        signal.emit(12);

        expect(await first).toEqual({ done: false, value: [sender, 10] });
        expect(await second).toEqual({ done: false, value: [sender, 11] });
        expect(await third).toEqual({ done: false, value: [sender, 12] });
      });
      it('should grab last signal emission', async () => {
        expect.assertions(3);
        const sender = {};
        const signal = new Signal<{}, number>(sender);
        const asyncIterator = new AsyncIteratorSignal(signal);

        signal.emit(10);
        signal.emit(11);
        signal.emit(12);

        const first = asyncIterator.next();
        const second = asyncIterator.next();
        const third = asyncIterator.next();

        expect(await first).toEqual({ done: false, value: [sender, 10] });
        expect(await second).toEqual({ done: false, value: [sender, 11] });
        expect(await third).toEqual({ done: false, value: [sender, 12] });
      });
    });
    describe('return()', () => {
      it('should stop getting values after done', async () => {
        expect.assertions(3);
        const sender = {};
        const signal = new Signal<{}, number>(sender);
        const asyncIterator = new AsyncIteratorSignal(signal);

        signal.emit(10);
        signal.emit(11);

        const first = asyncIterator.next();
        const returnValue = asyncIterator.return();
        const second = asyncIterator.next();

        expect(await first).toEqual({ done: false, value: [sender, 10] });
        expect(await returnValue).toEqual({ done: true });
        expect(await second).toEqual({ done: true });
      });
      it('Should still get first values after done', async () => {
        expect.assertions(3);
        const sender = {};
        const signal = new Signal<{}, number>(sender);
        const asyncIterator = new AsyncIteratorSignal(signal);

        const first = asyncIterator.next();
        const returnValue = asyncIterator.return();
        const second = asyncIterator.next();
        signal.emit(10);
        signal.emit(11);

        expect(await first).toEqual({ done: false, value: [sender, 10] });
        expect(await returnValue).toEqual({ done: true });
        expect(await second).toEqual({ done: true });
      });
    });
  });
  describe('AsyncIterableSignal', () => {
    describe('async iteration', () => {
      it('should get first value', async () => {
        expect.assertions(1);
        const sender = {};
        const signal = new Signal<{}, number>(sender);
        const asyncIterable = new AsyncIterableSignal(signal);

        // NOTE: we have to have the signal emission happen
        // after the iterator is generated from the iterable
        // I am not sure how to do this deterministically,
        // but this seems to work for now.
        (async () => {
          for await (const [sender, args] of asyncIterable) {
            expect(args).toEqual(1);
          }
        })();
        signal.emit(1);
      });
    });
    //   it('should stop on break', async () => {
    //     expect.assertions(1);
    //     const sender = {};
    //     const signal = new Signal<{}, number>(sender);
    //     const asyncIterable = new AsyncIterableSignal(signal);

    //     // NOTE: we have to have the signal emission happen
    //     // after the iterator is generated from the iterable
    //     // I am not sure how to do this deterministically,
    //     // but this seems to work for now.
    //     const gen = (async *() => {
    //       for await (const [sender, args] of asyncIterable) {
    //         expect(args).toEqual(1);
    //         yield;
    //       }
    //     })();
    //     signal.emit(1);
    //   });
    // });
  });
});
