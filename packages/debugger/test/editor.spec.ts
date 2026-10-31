// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YCodeCell } from '@jupyter/ydoc';

import type { CodeEditor } from '@jupyterlab/codeeditor';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

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
});
