// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import { ContentsManager } from '../../lib/contents';

import { ServiceManager } from '../../lib/manager';

import { SessionManager } from '../../lib/session';

import { SettingManager } from '../../lib/setting';

import { TerminalManager } from '../../lib/terminal';

import { WorkspaceManager } from '../../lib/workspace';

describe('manager', () => {
  describe('ServiceManager', () => {
    let manager: ServiceManager.IManager;

    beforeEach(() => {
      manager = new ServiceManager();
      return manager.ready;
    });

    afterEach(() => {
      manager.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new service manager', () => {
        expect(manager).to.be.a(ServiceManager);
      });
    });

    describe('#sessions', () => {
      it('should be the sessions manager instance', () => {
        expect(manager.sessions).to.be.a(SessionManager);
      });
    });

    describe('#settings', () => {
      it('should be the setting manager instance', () => {
        expect(manager.settings).to.be.a(SettingManager);
      });
    });

    describe('#contents', () => {
      it('should be the content manager instance', () => {
        expect(manager.contents).to.be.a(ContentsManager);
      });
    });

    describe('#terminals', () => {
      it('should be the terminal manager instance', () => {
        expect(manager.terminals).to.be.a(TerminalManager);
      });
    });

    describe('#workspaces', () => {
      it('should be the workspace manager instance', () => {
        expect(manager.workspaces).to.be.a(WorkspaceManager);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', () => {
        manager.dispose();
        manager = new ServiceManager();
        expect(manager.isReady).to.be(false);
        return manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
        });
      });
    });
  });
});
