import { expect } from 'chai';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { createClientSession } from '@jupyterlab/testutils';

import { Breakpoints } from '../../lib/breakpoints';

import { Debugger } from '../../lib/debugger';

import { DebugService } from '../../lib/service';

import { DebugSession } from '../../lib/session';

import { IDebugger } from '../../lib/tokens';

describe('DebugService', () => {
  let client: IClientSession;
  let model: Debugger.Model;
  let session: IDebugger.ISession;
  let service: IDebugger;

  beforeEach(async () => {
    client = await createClientSession({
      kernelPreference: {
        name: 'xpython'
      }
    });
    await (client as ClientSession).initialize();
    await client.kernel.ready;
    session = new DebugSession({ client });
    model = new Debugger.Model({});
    service = new DebugService();
  });

  afterEach(async () => {
    await client.shutdown();
    session.dispose();
    service.dispose();
  });

  describe('#constructor()', () => {
    it('should create a new instance', () => {
      expect(service).to.be.an.instanceOf(DebugService);
    });
  });

  describe('#start()', () => {
    it('should start the service if the session is set', async () => {
      service.session = session;
      await service.start();
      expect(service.isStarted()).to.equal(true);
    });

    it('should throw an error if the session is not set', async () => {
      try {
        await service.start();
      } catch (err) {
        expect(err.message).to.contain("Cannot read property 'start' of null");
      }
    });
  });

  describe('#stop()', () => {
    it('should stop the service if the session is set', async () => {
      service.session = session;
      await service.start();
      await service.stop();
      expect(service.isStarted()).to.equal(false);
    });
  });

  describe('#session', () => {
    it('should emit the sessionChanged signal when setting the session', () => {
      let sessionChangedEvents: IDebugger.ISession[] = [];
      service.sessionChanged.connect((_, newSession) => {
        sessionChangedEvents.push(newSession);
      });
      service.session = session;
      expect(sessionChangedEvents.length).to.equal(1);
      expect(sessionChangedEvents[0]).to.eq(session);
    });
  });

  describe('#model', () => {
    it('should emit the modelChanged signal when setting the model', () => {
      let modelChangedEvents: Debugger.Model[] = [];
      service.modelChanged.connect((_, newModel) => {
        modelChangedEvents.push(newModel);
      });
      service.model = model;
      expect(modelChangedEvents.length).to.equal(1);
      expect(modelChangedEvents[0]).to.eq(model);
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

    let breakpoints: Breakpoints.IBreakpoint[];
    let source_id: string;

    beforeEach(async () => {
      service.session = session;
      service.model = model;
      await service.restoreState(true);
      const breakpoint_lines: number[] = [3, 5];
      source_id = service.getCellId(code);
      breakpoints = breakpoint_lines.map((l: number, index: number) => {
        return {
          id: index,
          line: l,
          active: true,
          verified: true,
          source: {
            path: source_id
          }
        };
      });
      await service.updateBreakpoints(code, breakpoints);
    });

    describe('#updateBreakpoints', () => {
      it('should update the breakpoints', () => {
        const bp_list = model.breakpointsModel.getBreakpoints(source_id);
        expect(bp_list).to.deep.eq(breakpoints);
      });
    });

    describe('#restoreState', () => {
      it('should restore the breakpoints', async () => {
        model.breakpointsModel.restoreBreakpoints(
          new Map<string, Breakpoints.IBreakpoint[]>()
        );
        const bp_list1 = model.breakpointsModel.getBreakpoints(source_id);
        expect(bp_list1.length).to.equal(0);
        await service.restoreState(true);
        const bp_list2 = model.breakpointsModel.getBreakpoints(source_id);
        expect(bp_list2).to.deep.eq(breakpoints);
      });
    });
  });
});
