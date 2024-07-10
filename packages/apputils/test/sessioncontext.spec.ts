// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog,
  ISessionContext,
  ISessionContextDialogs,
  SessionContext,
  SessionContextDialogs
} from '@jupyterlab/apputils';
import {
  KernelManager,
  KernelSpecManager,
  SessionAPI,
  SessionManager
} from '@jupyterlab/services';
import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';
import {
  acceptDialog,
  dismissDialog,
  JupyterServer,
  testEmission
} from '@jupyterlab/testing';
import { PromiseDelegate, UUID } from '@lumino/coreutils';
import * as fs from 'fs-extra';

const MOCK_KERNEL = {
  transport: 'tcp',
  ip: '127.0.0.1',
  // eslint-disable-next-line camelcase
  control_port: 63607,
  // eslint-disable-next-line camelcase
  shell_port: 49458,
  // eslint-disable-next-line camelcase
  stdin_port: 54582,
  // eslint-disable-next-line camelcase
  iopub_port: 50266,
  // eslint-disable-next-line camelcase
  hb_port: 59840,
  // eslint-disable-next-line camelcase
  signature_scheme: 'hmac-sha256',
  key: '883965661293433ea9c07538beeb8451',
  // eslint-disable-next-line camelcase
  kernel_name: 'mock-kernel'
};

function mktempDir(suffix: string): string {
  const pathPrefix = '/tmp/jupyterlab-apputils-sessioncontext-test';
  if (!fs.existsSync(pathPrefix)) {
    fs.mkdirSync(pathPrefix);
  }
  return fs.mkdtempSync(`${pathPrefix}/${suffix}`);
}

describe('@jupyterlab/apputils', () => {
  let server: JupyterServer;
  let external: string;

  beforeAll(async () => {
    server = new JupyterServer();
    external = mktempDir('external_kernels');

    if (!(await fs.pathExists(`${external}/kernel.json`))) {
      const data = JSON.stringify(MOCK_KERNEL);
      await fs.writeFile(`${external}/kernel.json`, data);
    }

    await server.start({
      configData: {
        ServerApp: {
          // eslint-disable-next-line camelcase
          allow_external_kernels: true,
          // eslint-disable-next-line camelcase
          external_connection_dir: external
        }
      }
    });
  }, 30000);

  afterAll(async () => {
    await server.shutdown();
  });

  jest.retryTimes(3);

  describe('SessionContext', () => {
    let kernelManager: KernelManager;
    let sessionManager: SessionManager;
    let specsManager: KernelSpecManager;
    let path = '';
    let sessionContext: SessionContext;

    beforeAll(async () => {
      kernelManager = new KernelManager();
      sessionManager = new SessionManager({ kernelManager });
      specsManager = new KernelSpecManager();
      await Promise.all([
        sessionManager.ready,
        kernelManager.ready,
        specsManager.ready
      ]);
    }, 30000);

    beforeEach(async () => {
      Dialog.flush();
      path = UUID.uuid4();
      sessionContext = new SessionContext({
        kernelManager,
        path,
        sessionManager,
        specsManager,
        kernelPreference: { name: specsManager.specs?.default }
      });
    });

    afterEach(async () => {
      Dialog.flush();
      try {
        if (sessionContext.session) {
          await sessionContext.shutdown();
        }
      } catch (error) {
        console.warn('Session shutdown failed.', error);
      }
      sessionContext.dispose();
    });

    describe('#constructor()', () => {
      it('should create a session context', () => {
        expect(sessionContext).toBeInstanceOf(SessionContext);
      });
    });

    describe('#disposed', () => {
      it('should be emitted when the session context is disposed', async () => {
        sessionContext.kernelPreference = { canStart: false };
        await sessionContext.initialize();
        let called = false;
        sessionContext.disposed.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          expect(args).toBeUndefined();
          called = true;
        });
        sessionContext.dispose();
        expect(called).toBe(true);
      });
    });

    describe('#kernelChanged', () => {
      it('should be emitted when the kernel changes', async () => {
        let called = false;
        sessionContext.kernelChanged.connect(
          (sender, { oldValue, newValue }) => {
            if (oldValue !== null) {
              return;
            }
            expect(sender).toBe(sessionContext);
            expect(oldValue).toBeNull();
            expect(newValue).toBe(sessionContext.session?.kernel || null);
            called = true;
          }
        );
        await sessionContext.initialize();
        expect(called).toBe(true);
      });
    });

    describe('#sessionChanged', () => {
      it('should be emitted when the session changes', async () => {
        let called = false;
        sessionContext.sessionChanged.connect(
          (sender, { oldValue, newValue }) => {
            if (oldValue !== null) {
              return;
            }
            expect(sender).toBe(sessionContext);
            expect(oldValue).toBeNull();
            expect(newValue).toBe(sessionContext.session);
            called = true;
          }
        );
        await sessionContext.initialize();
        expect(called).toBe(true);
      });
    });

    describe('#statusChanged', () => {
      it('should be emitted when the status changes', async () => {
        let called = false;
        sessionContext.statusChanged.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          expect(typeof args).toBe('string');
          called = true;
        });
        await sessionContext.initialize();
        await sessionContext.session!.kernel!.info;
        expect(called).toBe(true);
      });
    });

    describe('#iopubMessage', () => {
      it('should be emitted for iopub kernel messages', async () => {
        let called = false;
        sessionContext.iopubMessage.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          called = true;
        });
        await sessionContext.initialize();
        await sessionContext.session!.kernel!.info;
        expect(called).toBe(true);
      });
    });

    describe('#propertyChanged', () => {
      it('should be emitted when a session path changes', async () => {
        let called = false;
        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          expect(args).toBe('path');
          called = true;
        });
        await sessionContext.session!.setPath('foo');
        expect(called).toBe(true);
      });

      it('should be emitted when a session name changes', async () => {
        let called = false;
        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          expect(args).toBe('name');
          called = true;
        });
        await sessionContext.session!.setName('foo');
        expect(called).toBe(true);
      });

      it('should be emitted when a session type changes', async () => {
        let called = false;

        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).toBe(sessionContext);
          expect(args).toBe('type');
          called = true;
        });
        await sessionContext.session!.setType('foo');
        expect(called).toBe(true);
      });
    });

    describe('#kernel', () => {
      it('should be the current kernel of the the session', async () => {
        expect(sessionContext.session?.kernel).toBeFalsy();
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel).toBeTruthy();
      });
    });

    describe('#kernelPreference', () => {
      it('should be the kernel preference of the session', () => {
        const preference: ISessionContext.IKernelPreference = {
          name: 'foo',
          language: 'bar',
          id: '1234',
          shouldStart: true,
          canStart: true
        };
        sessionContext.kernelPreference = preference;
        expect(sessionContext.kernelPreference).toBe(preference);
      });
    });

    describe('#manager', () => {
      it('should be the session manager used by the session', () => {
        expect(sessionContext.sessionManager).toBe(sessionManager);
      });
    });

    describe('#initialize()', () => {
      it('should start the default kernel', async () => {
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel?.name).toBe(
          specsManager.specs!.default
        );
      });

      it('should connect to an existing session on the path', async () => {
        const other = await sessionManager.startNew({
          name: '',
          path,
          type: 'test'
        });

        await sessionContext.initialize();
        expect(other.kernel?.id).toBeDefined();
        expect(other.kernel?.id).toBe(sessionContext.session?.kernel?.id);
        await other.shutdown();
        other.dispose();
      });

      it('should connect to an existing kernel', async () => {
        // Shut down and dispose the session so it can be re-instantiated.
        await sessionContext.shutdown();

        const other = await sessionManager.startNew({
          name: '',
          path: UUID.uuid4(),
          type: 'test'
        });
        const kernelPreference = { id: other.kernel!.id };

        sessionContext = new SessionContext({
          kernelManager,
          sessionManager,
          specsManager,
          kernelPreference
        });
        await sessionContext.initialize();
        expect(other.kernel?.id).toBeDefined();
        expect(other.kernel?.id).toBe(sessionContext.session?.kernel?.id);
        // We don't call other.shutdown() here because that
        // is handled by the afterEach() handler above.
        other.dispose();
      });

      it('should yield true if there is no distinct kernel to start', async () => {
        // Remove the kernel preference before initializing.
        sessionContext.kernelPreference = {};
        const result = await sessionContext.initialize();
        expect(result).toBe(true);
      });

      it('should be a no-op if the shouldStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { shouldStart: false };
        const result = await sessionContext.initialize();
        expect(result).toBe(false);
        expect(sessionContext.session?.kernel).toBeFalsy();
      });

      it('should be a no-op if the canStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { canStart: false };
        const result = await sessionContext.initialize();
        expect(result).toBe(false);
        expect(sessionContext.session?.kernel).toBeFalsy();
      });

      it('should handle an error during startup', async () => {
        // Give it a mock manager that errors on connectTo
        const mockManager = new SessionManager({ kernelManager });

        sessionContext = new SessionContext({
          kernelManager,
          path,
          sessionManager: mockManager,
          specsManager,
          kernelPreference: { name: specsManager.specs?.default }
        });

        (mockManager as any).running = () => {
          return [{ path }];
        };
        (mockManager as any).connectTo = () => {
          throw new Error('mock error');
        };

        let caught = false;
        const promise = sessionContext.initialize().catch(() => {
          caught = true;
        });
        await Promise.all([promise, acceptDialog()]);
        expect(caught).toBe(true);
      });
    });

    describe('#kernelDisplayName', () => {
      it('should be the display name of the current kernel', async () => {
        await sessionContext.initialize();
        const spec = await sessionContext.session!.kernel!.spec;
        expect(sessionContext.kernelDisplayName).toBe(spec!.display_name);
      });

      it('should display "No Kernel" when there is no kernel', async () => {
        sessionContext.kernelPreference = {
          canStart: false,
          shouldStart: false
        };
        expect(sessionContext.kernelDisplayName).toBe('No Kernel');
      });
    });

    describe('#kernelDisplayStatus', () => {
      it('should be the status of the current kernel if connected', async () => {
        await sessionContext.initialize();
        await sessionContext.session!.kernel!.info;
        expect(sessionContext.kernelDisplayStatus).toBe(
          sessionContext.session?.kernel?.status
        );
      });

      it('should be the connection status of the current kernel if not connected', async () => {
        await sessionContext.initialize();
        const reconnect = sessionContext.session!.kernel!.reconnect();
        expect(sessionContext.kernelDisplayStatus).toBe(
          sessionContext.session?.kernel?.connectionStatus
        );
        await reconnect;
      });

      it('should be "initializing" if it looks like we are trying to start a kernel', async () => {
        sessionContext.kernelPreference = {};
        expect(sessionContext.kernelDisplayStatus).toBe('initializing');
      });

      it('should be "unknown" if there is no current kernel', async () => {
        await sessionContext.initialize();
        await sessionContext.shutdown();
        expect(sessionContext.kernelDisplayStatus).toBe('unknown');
      });
    });

    describe('#isDisposed', () => {
      it('should test whether a client session has been disposed', () => {
        expect(sessionContext.isDisposed).toBe(false);
        sessionContext.dispose();
        expect(sessionContext.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the client session', () => {
        sessionContext.dispose();
        expect(sessionContext.isDisposed).toBe(true);
        sessionContext.dispose();
        expect(sessionContext.isDisposed).toBe(true);
      });

      it('should not shut down the session by default', async () => {
        await sessionContext.initialize();
        const id = sessionContext.session!.id;
        sessionContext.dispose();
        const sessions = await SessionAPI.listRunning();
        expect(sessions.find(s => s.id === id)).toBeTruthy();
        await SessionAPI.shutdownSession(id);
      });

      it('should shut down the session when shutdownOnDispose is true', async () => {
        sessionContext.kernelPreference = {
          ...sessionContext.kernelPreference,
          shutdownOnDispose: true
        };
        const delegate = new PromiseDelegate();
        await sessionContext.initialize();
        const id = sessionContext.session!.id;
        // Wait for the session to shut down.
        sessionContext.sessionManager.runningChanged.connect((_, sessions) => {
          if (!sessions.find(s => s.id === id)) {
            delegate.resolve(void 0);
            return;
          }
        });
        sessionContext.dispose();
        await expect(delegate.promise).resolves.not.toThrow();
      });
    });

    describe('#changeKernel()', () => {
      it('should change the current kernel', async () => {
        await sessionContext.initialize();

        const name = sessionContext.session?.kernel?.name;
        const id = sessionContext.session?.kernel?.id;
        const kernel = (await sessionContext.changeKernel({ name }))!;

        expect(kernel.id).not.toBe(id);
        expect(kernel.name).toBe(name);
      });

      it('should still work if called before fully initialized', async () => {
        const initPromise = sessionContext.initialize(); // Start but don't finish init.
        const name = 'echo';
        const kernelPromise = sessionContext.changeKernel({ name });

        let lastKernel: IKernelConnection | null | undefined = null;
        sessionContext.kernelChanged.connect(() => {
          lastKernel = sessionContext.session?.kernel;
        });
        const results = await Promise.all([kernelPromise, initPromise]);
        const kernel = results[0];
        const shouldSelect = results[1];
        expect(shouldSelect).toBe(false);
        expect(lastKernel).toBe(kernel);
      });

      it('should handle multiple requests', async () => {
        await sessionContext.initialize();
        const name = 'echo';
        const kernelPromise0 = sessionContext.changeKernel({ name });
        // The last launched kernel should win.
        const kernelPromise1 = sessionContext.changeKernel({ name });

        let lastKernel: IKernelConnection | null | undefined = null;
        sessionContext.kernelChanged.connect(() => {
          lastKernel = sessionContext.session?.kernel;
        });
        const results = await Promise.all([kernelPromise0, kernelPromise1]);
        // We can't know which of the two was launched first, so the result
        // could be either, just make sure it isn't the original kernel.
        expect([results[0], results[1]]).toContain(lastKernel);
      });
    });

    describe('#shutdown', () => {
      it('should kill the kernel and shut down the session', async () => {
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel).toBeTruthy();
        await sessionContext.shutdown();
        expect(sessionContext.session?.kernel).toBeFalsy();
      });

      it('should handle a shutdown during startup', async () => {
        const initPromise = sessionContext.initialize(); // Start but don't finish init.
        const shutdownPromise = sessionContext.shutdown();
        const results = await Promise.all([initPromise, shutdownPromise]);
        expect(results[0]).toBe(false);
        expect(sessionContext.session).toBe(null);
      });
    });

    describe('.getDefaultKernel()', () => {
      it('should return null if no options are given', () => {
        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: {}
          })
        ).toBeNull();
      });

      it('should return a matching name', () => {
        const spec =
          specsManager.specs!.kernelspecs[specsManager.specs!.default]!;

        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: { name: spec.name }
          })
        ).toBe(spec.name);
      });

      it('should return null if no match is found', () => {
        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: { name: 'foo' }
          })
        ).toBeNull();
      });

      it('should return a matching language', () => {
        const spec =
          specsManager.specs!.kernelspecs[specsManager.specs!.default]!;
        const kernelspecs: any = {};

        kernelspecs[spec.name] = spec;
        expect(
          SessionContext.getDefaultKernel({
            specs: {
              default: spec.name,
              kernelspecs
            },
            preference: { language: spec.language }
          })
        ).toBe(spec.name);
      });

      it('should return null if a language matches twice', () => {
        const spec =
          specsManager.specs!.kernelspecs[specsManager.specs!.default]!;
        const kernelspecs: any = {};

        kernelspecs['foo'] = spec;
        kernelspecs['bar'] = spec;
        expect(
          SessionContext.getDefaultKernel({
            specs: {
              default: spec.name,
              kernelspecs
            },
            preference: { language: spec.language }
          })
        ).toBeNull();
      });
    });
  });
  describe('SessionContextDialogs', () => {
    let sessionContextDialogs: ISessionContextDialogs;
    let kernelManager: KernelManager;
    let sessionManager: SessionManager;
    let specsManager: KernelSpecManager;
    let path = '';
    let sessionContext: SessionContext;

    beforeAll(async () => {
      kernelManager = new KernelManager();
      sessionManager = new SessionManager({ kernelManager });
      specsManager = new KernelSpecManager();
      await Promise.all([
        sessionManager.ready,
        kernelManager.ready,
        specsManager.ready
      ]);
    }, 30000);

    beforeEach(async () => {
      Dialog.flush();
      path = UUID.uuid4();
      sessionContext = new SessionContext({
        kernelManager,
        path,
        sessionManager,
        specsManager,
        kernelPreference: { name: specsManager.specs?.default }
      });

      sessionContextDialogs = new SessionContextDialogs();
    });

    afterEach(async () => {
      Dialog.flush();
      try {
        if (sessionContext.session) {
          await sessionContext.shutdown();
        }
      } catch (error) {
        console.warn('Session shutdown failed.', error);
      }
      sessionContext.dispose();
    });

    describe('#kernelOptions', () => {
      it('should return externally connected kernels', async () => {
        await sessionContext.initialize();
        const { groups } = SessionContextDialogs.kernelOptions(sessionContext);
        const options = groups.reduce(
          (acc, group) => acc.concat(group.options),
          [] as { text: string }[]
        );
        expect(options[options.length - 1].text).toContain(
          MOCK_KERNEL['kernel_name']
        );
      });
    });

    describe('#selectKernel()', () => {
      it('should select the currently running kernel by default', async () => {
        await sessionContext.initialize();

        const { id, name } = sessionContext!.session!.kernel!;
        const accept = acceptDialog();

        await sessionContextDialogs.selectKernel(sessionContext);
        await accept;

        const session = sessionContext?.session;
        expect(session!.kernel!.id).toBe(id);
        expect(session!.kernel!.name).toBe(name);
      });

      it('should keep the existing kernel if dismissed', async () => {
        await sessionContext.initialize();

        const { id, name } = sessionContext!.session!.kernel!;
        const dismiss = dismissDialog();

        await sessionContextDialogs.selectKernel(sessionContext);
        await dismiss;

        const session = sessionContext.session;
        expect(session!.kernel!.id).toBe(id);
        expect(session!.kernel!.name).toBe(name);
      });
    });

    describe('#restart()', () => {
      it('should restart if the user accepts the dialog', async () => {
        const emission = testEmission(sessionContext.statusChanged, {
          find: (_, args) => args === 'restarting'
        });
        await sessionContext.initialize();
        await sessionContext!.session?.kernel?.info;
        const restart = sessionContextDialogs.restart(sessionContext);

        await acceptDialog();
        expect(await restart).toBe(true);
        await emission;
      });

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        await sessionContext.initialize();
        sessionContext.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = sessionContextDialogs.restart(sessionContext);
        await dismissDialog();
        expect(await restart).toBe(false);
        expect(called).toBe(false);
      });

      it('should start the same kernel as the previously started kernel', async () => {
        await sessionContext.initialize();
        await sessionContext.shutdown();
        await sessionContextDialogs.restart(sessionContext);
        expect(sessionContext?.session?.kernel).toBeTruthy();
      });
    });
  });
});
