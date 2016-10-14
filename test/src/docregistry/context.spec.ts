// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, IServiceManager
} from 'jupyter-js-services';

import {
  Context, TextModelFactory
} from '../../../lib/docregistry/context';


describe('docregistry/context', () => {

  let manager: IServiceManager;
  let factory = new TextModelFactory();

  before((done) => {
    ServiceManager.create().then(m => {
      manager = m;
      done();
    });
  }

  describe('Context', () => {

    let context: Context;

    beforeEach(() => {
      let path = 'foo';
      context = new Context({ manager, factory, path });
    });

    describe('#constructor()', () => {

      it('should create a new context', () => {

      });

    });

    describe('#kernelChanged', () => {

    });

    describe('#pathChanged', () => {

    });

    describe('#fileChanged', () => {

    });

    describe('#populated', () => {

    });

    describe('#disposed', () => {

    });

    describe('#model', () => {

    });

    describe('#kernel', () => {

    });

    describe('#path', () => {

    });

    describe('#contentsModel', () => {

    });

    describe('#kernelspecs', () => {

    });

    describe('#isPopulated', () => {

    });

    describe('#factoryName', () => {

    });

    describe('#isDisposed', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#changeKernel()', () => {

    });

    describe('#save()', () => {

    });

    describe('#saveAs()', () => {

    });

    describe('#revert()', () => {

    });

    describe('#createCheckpoint()', () => {

    });

    describe('#deleteCheckpoint()', () => {

    });

    describe('#restoreCheckpoint()', () => {

    });

    describe('#listCheckpoints()', () => {

    });

    describe('#listSessions()', () => {

    });

    describe('#resolveUrl()', () => {

    });

    describe('#addSibling()', () => {

    });

  });

});
