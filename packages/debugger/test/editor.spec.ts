// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YCodeCell } from '@jupyter/ydoc';

import type { CodeEditor } from '@jupyterlab/codeeditor';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

import { flushRequests, startTestSession } from './utils';

describe('Debugger.EditorHandler', () => {
  let service: DebuggerService;
  let src: YCodeCell;
  let handler: Debugger.EditorHandler;
  let updateBreakpoints: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new DebuggerService({ config: new Debugger.Config() });
    updateBreakpoints = jest
      .spyOn(service, 'updateBreakpoints')
      .mockResolvedValue();
    src = YCodeCell.create();
    src.setSource('x = 1');
    handler = new Debugger.EditorHandler({
      debuggerService: service,
      editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
      getEditor: () => null,
      src
    });
  });

  afterEach(() => {
    handler.dispose();
    src.dispose();
    service.dispose();
    jest.useRealTimers();
  });

  /**
   * Debug with a kernel that keeps breakpoints, and with breakpoints on the
   * given lines of the editor.
   */
  function startDebugging(lines: number[]): Map<string, number[]> {
    updateBreakpoints.mockRestore();
    handler['_getBreakpointsFromEditor'] = () => lines;
    return startTestSession(service);
  }

  /**
   * Change the source and wait for the breakpoints the editor then sends.
   */
  async function edit(source: string): Promise<void> {
    src.setSource(source);
    jest.advanceTimersByTime(1000);
    await flushRequests();
  }

  it('should send the breakpoints after the source changes', () => {
    src.setSource('x = 2');
    jest.advanceTimersByTime(1000);
    expect(updateBreakpoints).toHaveBeenCalledTimes(1);
  });

  it('should not send the breakpoints when only the outputs and execution count change', () => {
    src.execution_count = 1;
    src.setOutputs([{ output_type: 'stream', name: 'stdout', text: '1\n' }]);
    jest.advanceTimersByTime(1000);
    expect(updateBreakpoints).not.toHaveBeenCalled();
  });

  it('should clear the breakpoints of the previous code when the source changes', async () => {
    const kernel = startDebugging([1]);
    await edit('x = 2');
    await edit('x = 3');

    expect([...kernel.keys()]).toEqual([service.getCodeId('x = 3')]);
  });

  it('should not clear the previous code of a cell without breakpoints', async () => {
    startDebugging([]);
    const sendRequest = jest.spyOn(service.session!, 'sendRequest');
    await edit('x = 2');
    await edit('x = 3');

    const requests = sendRequest.mock.calls.map(([command]) => command);
    expect(
      requests.filter(command => command === 'setBreakpoints')
    ).toHaveLength(2);
  });

  describe('#clearBreakpoints()', () => {
    it('should clear the breakpoints of the cell', async () => {
      const kernel = startDebugging([1]);
      await edit('x = 2');

      handler.clearBreakpoints();
      await flushRequests();

      expect(kernel.size).toBe(0);
    });
  });
});
