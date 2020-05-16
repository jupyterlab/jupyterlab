import { Session } from '@jupyterlab/services';

import { createSession, signalToPromise } from '@jupyterlab/testutils';

import { UUID } from '@lumino/coreutils';

import { DebuggerModel } from '../../lib/model';

import { DebuggerService } from '../../lib/service';

import { DebugSession } from '../../lib/session';

import { IDebugger } from '../../lib/tokens';

describe('Debugging support', () => {
  const service = new DebuggerService();
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
  });

  afterAll(async () => {
    await Promise.all([xpython.shutdown(), ipykernel.shutdown()]);
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
  let connection: Session.ISessionConnection;
  let model: DebuggerModel;
  let session: IDebugger.ISession;
  let service: IDebugger;

  beforeEach(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'xpython' });
    session = new DebugSession({ connection });
    model = new DebuggerModel();
    service = new DebuggerService();
  });

  afterEach(async () => {
    await connection.shutdown();
    connection.dispose();
    session.dispose();
    (service as DebuggerService).dispose();
  });

  describe('#constructor()', () => {
    it('should create a new instance', () => {
      expect(service).toBeInstanceOf(DebuggerService);
    });
  });

  describe('#start()', () => {
    it('should start the service if the session is set', async () => {
      service.session = session;
      await service.start();
      expect(service.isStarted).toEqual(true);
    });

    it('should throw an error if the session is not set', async () => {
      await expect(service.start()).rejects.toThrow(
        "Cannot read property 'start' of null"
      );
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
      const sessionChangedEvents: IDebugger.ISession[] = [];
      service.sessionChanged.connect((_, newSession) => {
        sessionChangedEvents.push(newSession);
      });
      service.session = session;
      expect(sessionChangedEvents.length).toEqual(1);
      expect(sessionChangedEvents[0]).toEqual(session);
    });
  });

  describe('#model', () => {
    it('should emit the modelChanged signal when setting the model', () => {
      const modelChangedEvents: DebuggerModel[] = [];
      service.modelChanged.connect((_, newModel) => {
        modelChangedEvents.push(newModel as DebuggerModel);
      });
      service.model = model;
      expect(modelChangedEvents.length).toEqual(1);
      expect(modelChangedEvents[0]).toEqual(model);
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
      service.model = model;
      await service.restoreState(true);
      const breakpointLines: number[] = [3, 5];
      sourceId = service.getCodeId(code);
      breakpoints = breakpointLines.map((l: number, index: number) => {
        return {
          id: index,
          line: l,
          active: true,
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
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList).toEqual(breakpoints);
      });
    });

    describe('#restoreState', () => {
      it('should restore the breakpoints', async () => {
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
        service.model = null;
        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).toBe(false);
      });

      it('should return true when the execution has stopped', async () => {
        const variablesChanged = signalToPromise(model.variables.changed);

        // trigger a manual execute request
        connection.kernel.requestExecute({ code });

        // wait for the first stopped event and variables changed
        await variablesChanged;

        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).toBe(true);
        await service.restart();
      });
    });
  });
});
