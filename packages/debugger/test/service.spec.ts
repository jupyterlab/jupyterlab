// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelManager,
  KernelSpec,
  KernelSpecManager,
  Session,
  SessionManager
} from '@jupyterlab/services';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import {
  acceptDialog,
  JupyterServer,
  signalToPromise,
  testEmission
} from '@jupyterlab/testing';

import { JSONExt, UUID } from '@lumino/coreutils';

import { Debugger } from '../src/debugger';

import { IDebugger } from '../src/tokens';

import { handleRequest, KERNELSPECS } from './utils';
import { DebuggerDisplayRegistry } from '../src';
import { SessionContext, SessionContextDialogs } from '@jupyterlab/apputils';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import { IYText } from '@jupyter/ydoc';

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
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('Debugging support', () => {
  const specs = JSONExt.deepCopy(KERNELSPECS) as KernelSpec.ISpecModels;

  let specsManager: TestKernelSpecManager;
  let service: Debugger.Service;
  let config: IDebugger.IConfig;
  let displayRegistry: DebuggerDisplayRegistry;

  beforeAll(async () => {
    specsManager = new TestKernelSpecManager({ standby: 'never' });
    specsManager.intercept = specs;
    await specsManager.refreshSpecs();
    config = new Debugger.Config();
    displayRegistry = new DebuggerDisplayRegistry();
    const editorServices = getEditorServices();
    const mimeTypeService = editorServices.mimeTypeService;
    service = new Debugger.Service({
      displayRegistry,
      specsManager,
      config,
      mimeTypeService
    });
  });

  afterAll(async () => {
    service.dispose();
    specsManager.dispose();
  });

  describe('#isAvailable', () => {
    it('should return true for kernels that have support for debugging', async () => {
      const enabled = await service.isAvailable({
        kernel: { name: 'python3' }
      } as any);
      expect(enabled).toBe(true);
    });

    it.skip('should return false for kernels that do not have support for debugging', async () => {
      // The kernel spec are mocked in KERNELSPECS
      const enabled = await service.isAvailable({
        kernel: { name: 'nopydebug' }
      } as any);
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
  let displayRegistry: DebuggerDisplayRegistry;

  beforeEach(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'python3' });
    config = new Debugger.Config();
    session = new Debugger.Session({ connection, config });
    displayRegistry = new DebuggerDisplayRegistry();
    const editorServices = getEditorServices();
    const mimeTypeService = editorServices.mimeTypeService;
    service = new Debugger.Service({
      displayRegistry,
      specsManager,
      config,
      mimeTypeService
    });
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

  describe('#pause()', () => {
    it('should send a pause request including a threadId', async () => {
      service.session = session;
      await service.start();
      const sendRequest = jest.spyOn(service.session, 'sendRequest');
      await service.pause();
      expect(sendRequest).toHaveBeenCalledWith(
        'pause',
        expect.objectContaining({ threadId: 1 })
      );
    });

    it('should use one of the stopped threads for pause if set', async () => {
      service.session = session;
      await service.start();
      service.model.stoppedThreads = new Set([42]);
      const sendRequest = jest.spyOn(service.session, 'sendRequest');
      await service.pause();
      expect(sendRequest).toHaveBeenCalledWith(
        'pause',
        expect.objectContaining({ threadId: 42 })
      );
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
      breakpoints = breakpointLines.map(
        (line: number): IDebugger.IBreakpoint => {
          return {
            line,
            verified: true,
            source: {
              path: sourceId
            }
          };
        }
      );
      await service.updateBreakpoints(code, breakpoints);
    });

    describe('#updateBreakpoints', () => {
      it('should update the breakpoints', async () => {
        const { model } = service;
        model.breakpoints.restoreBreakpoints(
          new Map<string, IDebugger.IBreakpoint[]>()
        );
        await service.updateBreakpoints(code, breakpoints);
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList.length).toEqual(breakpoints.length);
        expect(bpList[0].line).toEqual(breakpoints[0].line);
        expect(bpList[1].line).toEqual(breakpoints[1].line);
        expect(bpList[0].source).toEqual(breakpoints[0].source);
        expect(bpList[1].source).toEqual(breakpoints[1].source);
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
        expect(bpList).toEqual(breakpoints);
      });

      it('should preserve breakpoints after kernel restart', async () => {
        const kernelManager = new KernelManager();
        const sessionManager = new SessionManager({ kernelManager });
        const specsManager = new KernelSpecManager();
        await Promise.all([
          sessionManager.ready,
          kernelManager.ready,
          specsManager.ready
        ]);

        const path = UUID.uuid4();
        const sessionContext = new SessionContext({
          kernelManager,
          path,
          sessionManager,
          specsManager,
          kernelPreference: { name: specsManager.specs?.default }
        });

        const sessionContextDialogs = new SessionContextDialogs();

        // Get initial breakpoints
        const initialBps = service.model.breakpoints.getBreakpoints(sourceId);
        expect(initialBps.length).toBeGreaterThan(0);

        const emission = testEmission(sessionContext.statusChanged, {
          find: (_, args) => args === 'restarting'
        });

        await sessionContext.initialize();
        const restart = sessionContextDialogs.restart(sessionContext);

        await acceptDialog();
        expect(await restart).toBe(true);
        await emission;

        // Verify breakpoints are still present
        const restoredBps = service.model.breakpoints.getBreakpoints(sourceId);
        expect(restoredBps.length).toEqual(initialBps.length);
        expect(restoredBps[0].line).toEqual(initialBps[0].line);
        expect(restoredBps[1].line).toEqual(initialBps[1].line);
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

function getEditorServices() {
  const languages = new EditorLanguageRegistry();

  EditorLanguageRegistry.getDefaultLanguages()
    .filter(lang => ['Python'].includes(lang.name))
    .forEach(lang => {
      languages.addLanguage(lang);
    });
  const extensions = new EditorExtensionRegistry();
  EditorExtensionRegistry.getDefaultExtensions()
    .filter(ext => ['lineNumbers'].includes(ext.name))
    .forEach(ext => extensions.addExtension(ext));
  extensions.addExtension({
    name: 'binding',
    factory: ({ model }) => {
      const m = model.sharedModel as IYText;
      return EditorExtensionRegistry.createImmutableExtension(
        ybinding({ ytext: m.ysource, undoManager: m.undoManager ?? undefined })
      );
    }
  });
  const factoryService = new CodeMirrorEditorFactory({ extensions, languages });
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  const editorServices = { factoryService, mimeTypeService };
  return editorServices;
}
