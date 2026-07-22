// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICompletionContext } from '@jupyterlab/completer';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import type { Session } from '@jupyterlab/services';

import { KernelSpecManager } from '@jupyterlab/services';

import { JupyterServer, signalToPromise } from '@jupyterlab/testing';

import { UUID } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { DebuggerCompletionProvider } from '../src/completionprovider';

import { Debugger } from '../src/debugger';

import { DebuggerIPythonCompletionProvider } from '../src/ipythoncompletionprovider';

import type { IDebugger } from '../src/tokens';

/**
 * The code executed by the kernel; completions are requested while the
 * execution is paused on the `x += 1` breakpoint, so everything defined
 * above it is in scope.
 */
const code = [
  'def add(alpha_arg=0, beta_arg=0):',
  '    return alpha_arg + beta_arg',
  '',
  "data = {'alpha': 1, 'beta': 2}",
  "big = {f'key_{i:03d}': i for i in range(120)}",
  'x = 1',
  'x += 1',
  'x'
].join('\n');

const breakpointLine = code.split('\n').indexOf('x += 1') + 1;

const server = new JupyterServer();

describe('Debugger completion providers integration test', () => {
  const specsManager = new KernelSpecManager();
  const widget = new Widget();
  const context: ICompletionContext = { widget };

  let config: IDebugger.IConfig;
  let connection: Session.ISessionConnection;
  let session: IDebugger.ISession;
  let service: IDebugger;

  beforeAll(async () => {
    await server.start();

    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'python3' });

    config = new Debugger.Config();
    session = new Debugger.Session({ connection, config });
    service = new Debugger.Service({ config, specsManager });
    service.session = session;
    await service.restoreState(true);

    // Pause the execution on the breakpoint.
    const sourceId = service.getCodeId(code);
    await service.updateBreakpoints(code, [
      { line: breakpointLine, verified: true, source: { path: sourceId } }
    ]);
    const variablesChanged = signalToPromise(service.model.variables.changed);
    connection.kernel!.requestExecute({ code });
    await variablesChanged;
  }, 60000);

  afterAll(async () => {
    widget.dispose();
    await connection.shutdown();
    connection.dispose();
    session.dispose();
    (service as Debugger.Service).dispose();
    await server.shutdown();
  });

  describe('DebuggerCompletionProvider', () => {
    const provider = () =>
      new DebuggerCompletionProvider({ debuggerService: service });

    it('should be applicable when stopped on a breakpoint', async () => {
      expect(service.hasStoppedThreads()).toBe(true);
      expect(await provider().isApplicable(context)).toBe(true);
    });

    it('should complete variables defined in the stopped frame', async () => {
      const reply = await provider().fetch({ text: 'dat', offset: 3 }, context);
      const labels = reply.items.map(item => item.label);
      expect(labels).toContain('data');
    });
  });

  describe('DebuggerIPythonCompletionProvider', () => {
    const provider = () =>
      new DebuggerIPythonCompletionProvider({ debuggerService: service });

    it('should be applicable when stopped on a breakpoint', async () => {
      expect(await provider().isApplicable(context)).toBe(true);
    });

    it('should complete dictionary keys', async () => {
      const reply = await provider().fetch(
        { text: "data['", offset: 6 },
        context
      );
      const labels = reply.items.map(item => item.label);
      expect(labels.some(label => label.includes('alpha'))).toBe(true);
      expect(labels.some(label => label.includes('beta'))).toBe(true);
    });

    it('should complete function keyword arguments', async () => {
      const reply = await provider().fetch(
        { text: 'add(al', offset: 6 },
        context
      );
      const labels = reply.items.map(item => item.label);
      expect(labels.some(label => label.includes('alpha_arg'))).toBe(true);
    });

    it('should pass a large number of completions without truncation', async () => {
      const reply = await provider().fetch(
        { text: "big['", offset: 5 },
        context
      );
      const labels = reply.items.map(item => item.label);
      expect(labels.length).toBeGreaterThanOrEqual(120);
      expect(labels.some(label => label.includes('key_000'))).toBe(true);
      expect(labels.some(label => label.includes('key_119'))).toBe(true);
    });
  });
});
