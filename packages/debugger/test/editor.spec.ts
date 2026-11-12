// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YCodeCell } from '@jupyter/ydoc';
import { Signal } from '@lumino/signaling';

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
      .mockResolvedValue(undefined);
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

  it('should pass oldPath and clearKernel=true when typing in an unexecuted cell', async () => {
    updateBreakpoints.mockResolvedValueOnce('tmp/cell_path_1.py');
    src.setSource('x = 2');
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(updateBreakpoints).toHaveBeenLastCalledWith(
      'x = 2',
      [],
      '',
      undefined,
      false
    );

    updateBreakpoints.mockResolvedValueOnce('tmp/cell_path_2.py');
    src.setSource('x = 3');
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(updateBreakpoints).toHaveBeenLastCalledWith(
      'x = 3',
      [],
      '',
      'tmp/cell_path_1.py',
      true
    );
  });

  it('should preserve kernel breakpoints when modifying a cell that already ran', async () => {
    const cellSrc = YCodeCell.create();
    const stateChanged = new Signal<unknown, unknown>(cellSrc);
    const cellHandler = new Debugger.EditorHandler({
      debuggerService: service,
      editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
      getEditor: () => null,
      src: cellSrc,
      stateChanged
    });

    updateBreakpoints.mockResolvedValueOnce('tmp/executed_path.py');
    cellSrc.setSource('def foo(): pass');
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Simulate cell execution
    stateChanged.emit({ name: 'executionCount', oldValue: null, newValue: 1 });

    // Simulate user editing the cell after execution
    updateBreakpoints.mockResolvedValueOnce('tmp/draft_path.py');
    cellSrc.setSource('def foo(): pass\nx = 1');
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // oldPath was the executed path, so clearKernel must be false
    expect(updateBreakpoints).toHaveBeenLastCalledWith(
      'def foo(): pass\nx = 1',
      [],
      '',
      'tmp/executed_path.py',
      false
    );

    cellHandler.dispose();
    cellSrc.dispose();
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
