// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  ContentsManager
} from '../../lib/contents';

import {
  ServiceManager
} from '../../lib/manager';

import {
  SessionManager
} from '../../lib/session';

import {
  TerminalManager
} from '../../lib/terminal';

import {
  KernelTester
} from './utils';


describe('manager', () => {

  describe('SessionManager', () => {

    let manager: ServiceManager.IManager;
    let tester: KernelTester;

    beforeEach((done) => {
      tester = new KernelTester();
      manager = new ServiceManager();
      manager.ready.then(done, done);
    });

    afterEach(() => {
      manager.dispose();
      tester.dispose();
    });

    describe('#constructor()', () => {

      it('should create a new session manager', () => {
        expect(manager).to.be.a(ServiceManager);
      });

    });

    describe('#sessions', () => {

      it('should be the sessions manager instance', () => {
        expect(manager.sessions).to.be.a(SessionManager);
      });

    });

    describe('#contents', () => {

      it('should be the contents manager instance', () => {
        expect(manager.contents).to.be.a(ContentsManager);
      });

    });

    describe('#terminals', () => {

      it('should be the terminal manager instance', () => {
        expect(manager.terminals).to.be.a(TerminalManager);
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', (done) => {
        manager.dispose();
        manager = new ServiceManager();
        expect(manager.isReady).to.be(false);
        manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

  });

});
