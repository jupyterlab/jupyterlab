// Copyright (c) Jupyter Development Team.

import 'jest';

import { JSONExt } from '@lumino/coreutils';

import { KernelSpecManager, KernelSpec } from '../../src';

import {
  PYTHON_SPEC,
  KERNELSPECS,
  handleRequest,
  makeSettings
} from '../utils';
import { JupyterServer } from '@jupyterlab/testutils';

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

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('kernel/manager', () => {
  let manager: KernelSpecManager;

  beforeEach(() => {
    manager = new KernelSpecManager({ standby: 'never' });
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
        expect(manager instanceof KernelSpecManager).toBe(true);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', () => {
        manager.dispose();
        const serverSettings = makeSettings();
        const standby = 'never';
        const token = serverSettings.token;
        manager = new KernelSpecManager({ serverSettings, standby });
        expect(manager.serverSettings.token).toBe(token);
      });
    });

    describe('#specs', () => {
      it('should get the kernel specs', async () => {
        await manager.ready;
        expect(manager.specs!.default).toBeTruthy();
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
        expect(manager.specs!.default).toBe('echo');
        specs.default = 'shell';
        manager.intercept = specs;
        await manager.refreshSpecs();
        expect(manager.specs!.default).toBe('shell');
        expect(called).toBe(true);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new KernelSpecManager({ standby: 'never' });
        expect(manager.isReady).toBe(false);
        await manager.ready;
        expect(manager.isReady).toBe(true);
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
        expect(manager.specs!.default).not.toBe('shell');
        await manager.refreshSpecs();
        expect(manager.specs!.default).toBe('shell');
      });
    });
  });
});
