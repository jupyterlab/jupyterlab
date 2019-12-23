// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { JSONExt } from '@lumino/coreutils';

import { KernelSpecManager, KernelSpec } from '@jupyterlab/services';

import {
  PYTHON_SPEC,
  KERNELSPECS,
  handleRequest,
  makeSettings
} from '../utils';

class TestManager extends KernelSpecManager {
  intercept: KernelSpec.ISpecModels | null = null;
  protected async requestSpecs(): Promise<void> {
    if (this.intercept) {
      handleRequest(this, 200, this.intercept);
    }
    return super.requestSpecs();
  }
}

const PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

describe('kernel/manager', () => {
  let manager: KernelSpecManager;

  beforeEach(() => {
    manager = new KernelSpecManager({ standby: 'never' });
    expect(manager.specs).to.be.null;
    return manager.ready;
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('KernelSpecManager', () => {
    describe('#constructor()', () => {
      it('should take the options as an argument', () => {
        manager.dispose();
        manager = new KernelSpecManager({
          serverSettings: makeSettings(),
          standby: 'never'
        });
        expect(manager instanceof KernelSpecManager).to.equal(true);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', () => {
        manager.dispose();
        const serverSettings = makeSettings();
        const standby = 'never';
        const token = serverSettings.token;
        manager = new KernelSpecManager({ serverSettings, standby });
        expect(manager.serverSettings.token).to.equal(token);
      });
    });

    describe('#specs', () => {
      it('should get the kernel specs', async () => {
        await manager.ready;
        expect(manager.specs!.default).to.be.ok;
      });
    });

    describe('#specsChanged', () => {
      it('should be emitted when the specs change', async () => {
        const manager = new TestManager({ standby: 'never' });
        const specs = JSONExt.deepCopy(KERNELSPECS) as KernelSpec.ISpecModels;
        let called = false;
        manager.specsChanged.connect(() => {
          called = true;
        });
        await manager.ready;
        expect(manager.specs!.default).to.equal('echo');
        specs.default = 'shell';
        manager.intercept = specs;
        await manager.refreshSpecs();
        expect(manager.specs!.default).to.equal('shell');
        expect(called).to.equal(true);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new KernelSpecManager({ standby: 'never' });
        expect(manager.isReady).to.equal(false);
        await manager.ready;
        expect(manager.isReady).to.equal(true);
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });
    });

    describe('#refreshSpecs()', () => {
      it('should update list of kernel specs', async () => {
        const manager = new TestManager({ standby: 'never' });
        const specs = JSONExt.deepCopy(KERNELSPECS) as KernelSpec.ISpecModels;
        await manager.ready;
        specs.default = 'shell';
        manager.intercept = specs;
        expect(manager.specs!.default).not.to.equal('shell');
        await manager.refreshSpecs();
        expect(manager.specs!.default).to.equal('shell');
      });
    });
  });
});
