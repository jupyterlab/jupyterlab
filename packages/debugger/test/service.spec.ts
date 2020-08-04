// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Session, KernelSpecManager, KernelSpec } from '@jupyterlab/services';

import {
  createSession,
  signalToPromise,
  JupyterServer
} from '@jupyterlab/testutils';

import { UUID, JSONExt } from '@lumino/coreutils';

import { Debugger } from '../src/debugger';

import { IDebugger } from '../src/tokens';

import { KERNELSPECS, handleRequest } from './utils';

/**
 * A Test class to mock a KernelSpecManager
 */
class TestKernelSpecManager extends KernelSpecManager {
  intercept: KernelSpec.ISpecModels | null = null;

  /**
   * Request the kernel specs
   */
  protected async requestSpecs(): Promise<void> {
    if (this.intercept) {
      handleRequest(this, 200, this.intercept);
    }
    return super.requestSpecs();
  }
}

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('Debugging support', () => {
  const specs = JSONExt.deepCopy(KERNELSPECS) as KernelSpec.ISpecModels;

  let specsManager: TestKernelSpecManager;
  let service: Debugger.Service;
  let config: IDebugger.IConfig;
  let xpython: Session.ISessionConnection;
  let ipykernel: Session.ISessionConnection;

  beforeAll(async () => {
    xpython = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await xpython.changeKernel({ name: 'xpython' });

    ipykernel = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await ipykernel.changeKernel({ name: 'python3' });

    specsManager = new TestKernelSpecManager({ standby: 'never' });
    specsManager.intercept = specs;
    await specsManager.refreshSpecs();
    config = new Debugger.Config();
    service = new Debugger.Service({ specsManager, config });
  });

  afterAll(async () => {
    await Promise.all([xpython.shutdown(), ipykernel.shutdown()]);
    service.dispose();
    specsManager.dispose();
  });

  describe('#isAvailable', () => {
    it('should return true for kernels that have support for debugging', async () => {
      const enabled = await service.isAvailable(xpython);
      expect(enabled).toBe(true);
    });

    it('should return false for kernels that do not have support for debugging', async () => {
      const enabled = await service.isAvailable(ipykernel);
      expect(enabled).toBe(false);
    });
  });
});

describe('DebuggerService', () => {
  const specsManager = new KernelSpecManager();
  let connection: Session.ISessionConnection;
  let config: IDebugger.IConfig;
  let session: IDebugger.ISession;
  let service: IDebugger;

  beforeEach(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'xpython' });
    session = new Debugger.Session({ connection });
    config = new Debugger.Config();
    service = new Debugger.Service({ specsManager, config });
  });

  afterEach(async () => {
    await connection.shutdown();
    connection.dispose();
    session.dispose();
    (service as Debugger.Service).dispose();
  });

  describe('#constructor()', () => {
    it('should create a new instance', () => {
      expect(service).toBeInstanceOf(Debugger.Service);
    });
  });

  describe('#start()', () => {
    it('should start the service if the session is set', async () => {
      service.session = session;
      await service.start();
      expect(service.isStarted).toEqual(true);
    });
  });

  describe('#stop()', () => {
    it('should stop the service if the session is set', async () => {
      service.session = session;
      await service.start();
      await service.stop();
      expect(service.isStarted).toEqual(false);
    });
  });

  describe('#session', () => {
    it('should emit the sessionChanged signal when setting the session', () => {
      const sessionChangedEvents: (IDebugger.ISession | null)[] = [];
      service.sessionChanged.connect((_, newSession) => {
        sessionChangedEvents.push(newSession);
      });
      service.session = session;
      expect(sessionChangedEvents.length).toEqual(1);
      expect(sessionChangedEvents[0]).toEqual(session);
    });
  });

  describe('protocol', () => {
    const code = [
      'i = 0',
      'i += 1',
      'i += 1',
      'j = i**2',
      'j += 1',
      'print(i, j)'
    ].join('\n');

    let breakpoints: IDebugger.IBreakpoint[];
    let sourceId: string;

    beforeEach(async () => {
      service.session = session;
      await service.restoreState(true);
      const breakpointLines: number[] = [3, 5];
      sourceId = service.getCodeId(code);
      breakpoints = breakpointLines.map((l: number, index: number) => {
        return {
          id: index,
          line: l,
          verified: true,
          source: {
            path: sourceId
          }
        };
      });
      await service.updateBreakpoints(code, breakpoints);
    });

    describe('#updateBreakpoints', () => {
      it('should update the breakpoints', () => {
        const { model } = service;
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList).toEqual(breakpoints);
      });
    });

    describe('#restoreState', () => {
      it('should restore the breakpoints', async () => {
        const { model } = service;
        model.breakpoints.restoreBreakpoints(
          new Map<string, IDebugger.IBreakpoint[]>()
        );
        const bpList1 = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList1.length).toEqual(0);
        await service.restoreState(true);
        const bpList2 = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList2).toEqual(breakpoints);
      });
    });

    describe('#restart', () => {
      it('should restart the debugger and send the breakpoints again', async () => {
        await service.restart();
        const { model } = service;
        model.breakpoints.restoreBreakpoints(
          new Map<string, IDebugger.IBreakpoint[]>()
        );
        await service.restoreState(true);
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        breakpoints[0].id = 2;
        breakpoints[1].id = 3;
        expect(bpList).toEqual(breakpoints);
      });
    });

    describe('#hasStoppedThreads', () => {
      it('should return false if the model is null', () => {
        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).toBe(false);
      });

      it('should return true when the execution has stopped', async () => {
        const { model } = service;
        const variablesChanged = signalToPromise(model.variables.changed);

        // trigger a manual execute request
        connection!.kernel!.requestExecute({ code });

        // wait for the first stopped event and variables changed
        await variablesChanged;

        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).toBe(true);
        await service.restart();
      });
    });
  });
});
