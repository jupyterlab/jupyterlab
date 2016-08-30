// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  ConsoleHistory
} from '../../../lib/console/history';


describe('console/history', () => {

  describe('ConsoleHistory', () => {

    describe('#constructor()', () => {

      it('should create a new console history object', () => {
        let history = new ConsoleHistory();
        expect(history).to.be.a(ConsoleHistory);
      });

      it('should accept an options argument', () => {
        let history = new ConsoleHistory({
          kernel: new MockKernel({ name: 'python' })
        });
        expect(history).to.be.a(ConsoleHistory);
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the object is disposed', () => {
        let history = new ConsoleHistory();
        expect(history.isDisposed).to.be(false);
        history.dispose();
        expect(history.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let history = new ConsoleHistory();
        expect(() => history.isDisposed = false).to.throwError();
      });

    });

    describe('#kernel', () => {

      it('should return the kernel that was passed in', () => {
        let kernel = new MockKernel({ name: 'python' });
        let history = new ConsoleHistory({ kernel });
        expect(history.kernel).to.be(kernel);
      });

      it('should be settable', () => {
        let kernel = new MockKernel({ name: 'python' });
        let history = new ConsoleHistory();
        expect(history.kernel).to.be(null);
        history.kernel = kernel;
        expect(history.kernel).to.be(kernel);
      });

    });

  });

});
