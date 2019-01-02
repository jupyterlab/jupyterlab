// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AsyncIteratorSignal } from '@jupyterlab/coreutils/src';
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
});
