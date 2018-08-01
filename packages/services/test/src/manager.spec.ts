// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

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
        expect(manager).to.be.an.instanceof(ServiceManager);
      });
    });

    describe('#sessions', () => {
      it('should be the sessions manager instance', () => {
        expect(manager.sessions).to.be.an.instanceof(SessionManager);
      });
    });

    describe('#settings', () => {
      it('should be the setting manager instance', () => {
        expect(manager.settings).to.be.an.instanceof(SettingManager);
      });
    });

    describe('#contents', () => {
      it('should be the content manager instance', () => {
        expect(manager.contents).to.be.an.instanceof(ContentsManager);
      });
    });

    describe('#terminals', () => {
      it('should be the terminal manager instance', () => {
        expect(manager.terminals).to.be.an.instanceof(TerminalManager);
      });
    });

    describe('#workspaces', () => {
      it('should be the workspace manager instance', () => {
        expect(manager.workspaces).to.be.an.instanceof(WorkspaceManager);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new ServiceManager();
        expect(manager.isReady).to.equal(false);
        await manager.ready;
        expect(manager.isReady).to.equal(true);
      });
    });
  });
});
