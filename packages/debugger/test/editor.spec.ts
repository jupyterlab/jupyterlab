// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YCodeCell, YFile } from '@jupyter/ydoc';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor, ybinding } from '@jupyterlab/codemirror';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

import { flushRequests, startTestSession } from './utils';

describe('Debugger.EditorHandler', () => {
  let service: DebuggerService;
  let src: YCodeCell;
  let handler: Debugger.EditorHandler;
  let updateBreakpoints: jest.SpyInstance;
  let editor: CodeMirrorEditor | null = null;

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
    editor?.dispose();
    editor = null;
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

  /**
   * Debug with a kernel that keeps breakpoints, in a CodeMirror editor that
   * shows the given source.
   */
  async function startDebuggingInEditor(
    source: string
  ): Promise<Map<string, number[]>> {
    updateBreakpoints.mockRestore();
    const kernel = startTestSession(service);
    handler.dispose();
    src.setSource(source);
    const codeEditor = new CodeMirrorEditor({
      model: new CodeEditor.Model({ sharedModel: src }),
      host: document.createElement('div'),
      extensions: [ybinding({ ytext: src.ysource })]
    });
    editor = codeEditor;
    handler = new Debugger.EditorHandler({
      debuggerService: service,
      editorReady: async () => codeEditor,
      getEditor: () => codeEditor,
      src
    });
    await flushRequests();
    return kernel;
  }

  /**
   * Click the breakpoint gutter of the line at the given position.
   */
  async function clickGutter(position: number): Promise<void> {
    handler['_onGutterClick'](editor!.editor, position);
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

  it('should keep the breakpoints of code that another cell ran', async () => {
    const kernel = startDebugging([1]);
    await edit('x = 2');
    src.executionState = 'running';
    const prompt = YCodeCell.create();
    prompt.setSource('x = 2');
    const promptHandler = new Debugger.EditorHandler({
      debuggerService: service,
      editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
      getEditor: () => null,
      src: prompt
    });
    promptHandler['_getBreakpointsFromEditor'] = () => [1];
    prompt.setSource('x = 3');
    jest.advanceTimersByTime(1000);
    await flushRequests();

    expect(kernel.get(service.getCodeId('x = 2'))).toEqual([1]);
    promptHandler.dispose();
    prompt.dispose();
  });

  it('should keep the breakpoints of the previous code of a file', async () => {
    const kernel = startDebugging([]);
    // Run All Code runs a file in a console, and the handler records no run.
    const file = YFile.create();
    file.setSource('x = 1');
    const fileHandler = new Debugger.EditorHandler({
      debuggerService: service,
      editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
      getEditor: () => null,
      src: file
    });
    fileHandler['_getBreakpointsFromEditor'] = () => [1];
    file.setSource('x = 2');
    jest.advanceTimersByTime(1000);
    await flushRequests();
    file.setSource('x = 3');
    jest.advanceTimersByTime(1000);
    await flushRequests();

    expect(kernel.get(service.getCodeId('x = 2'))).toEqual([1]);
    fileHandler.dispose();
    file.dispose();
  });

  it('should keep the breakpoints when the source changes while they are sent', async () => {
    const kernel = await startDebuggingInEditor('x = 1');
    await clickGutter(0);
    src.updateSource(5, 5, '0');
    jest.advanceTimersByTime(1000);
    src.updateSource(6, 6, '0');
    await flushRequests();
    jest.advanceTimersByTime(1000);
    await flushRequests();

    expect(kernel.get(service.getCodeId('x = 100'))).toEqual([1]);
  });

  it('should keep a breakpoint on its line when the gutter is clicked before an edit is sent', async () => {
    const kernel = await startDebuggingInEditor('x = 1\ny = 2');
    await clickGutter(6);
    src.updateSource(0, 0, 'w = 0\n');
    await clickGutter(0);

    expect(kernel.get(service.getCodeId('w = 0\nx = 1\ny = 2'))).toEqual([
      1, 3
    ]);
  });

  it('should keep a breakpoint on its line when other breakpoints change before an edit is sent', async () => {
    const kernel = await startDebuggingInEditor('x = 1\ny = 2');
    await clickGutter(6);
    src.updateSource(0, 0, 'w = 0\n');
    // Another cell sends its breakpoints.
    await service.updateBreakpoints('z = 1', [{ line: 1, verified: true }]);
    jest.advanceTimersByTime(1000);
    await flushRequests();

    expect(kernel.get(service.getCodeId('w = 0\nx = 1\ny = 2'))).toEqual([3]);
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
