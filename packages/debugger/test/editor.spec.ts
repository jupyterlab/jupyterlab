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

  describe('#_publishBreakpoints()', () => {
    let editor: CodeEditor.IEditor;

    function editorWithBreakpoints(
      lines: readonly number[]
    ): CodeEditor.IEditor {
      return {
        isDisposed: false,
        doc: {
          length: 100,
          lineAt: (from: number) => ({ number: from })
        },
        editor: {
          state: {
            field: () => ({
              between: (
                _from: number,
                _to: number,
                emit: (from: number) => void
              ) => {
                lines.forEach(emit);
              }
            })
          }
        }
      } as unknown as CodeEditor.IEditor;
    }

    async function settleSourceChange(): Promise<void> {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    }

    beforeEach(() => {
      handler.dispose();
      editor = editorWithBreakpoints([1, 2]);
      handler = new Debugger.EditorHandler({
        debuggerService: service,
        editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
        getEditor: () => editor,
        src
      });
    });

    afterEach(() => {
      (editor as { isDisposed: boolean }).isDisposed = true;
    });

    it('should clear breakpoints for the previous cell source when editing continues', async () => {
      const previous = 'def f():\n    x = 1\n    return x\n';
      const current = 'def f():\n    x = 2\n    return x\n';

      src.setSource(previous);
      await settleSourceChange();
      updateBreakpoints.mockClear();

      src.setSource(current);
      await settleSourceChange();

      expect(updateBreakpoints).toHaveBeenCalledWith(previous, []);
      expect(updateBreakpoints).toHaveBeenCalledWith(
        current,
        [
          { line: 1, verified: true, source: { name: '' } },
          { line: 2, verified: true, source: { name: '' } }
        ],
        ''
      );
    });

    it('should keep breakpoints on code that has run and clear only the later draft', async () => {
      const executed = 'def f():\n    return 1\n';
      const draft = 'def f():\n    return 2\n';
      const redraft = 'def f():\n    return 3\n';

      src.setSource(executed);
      await settleSourceChange();
      src.executionState = 'running';
      updateBreakpoints.mockClear();

      src.setSource(draft);
      await settleSourceChange();

      expect(updateBreakpoints).not.toHaveBeenCalledWith(executed, []);
      expect(updateBreakpoints).toHaveBeenCalledWith(
        draft,
        [
          { line: 1, verified: true, source: { name: '' } },
          { line: 2, verified: true, source: { name: '' } }
        ],
        ''
      );

      updateBreakpoints.mockClear();
      src.setSource(redraft);
      await settleSourceChange();

      expect(updateBreakpoints).toHaveBeenCalledWith(draft, []);
      expect(updateBreakpoints).not.toHaveBeenCalledWith(executed, []);
    });

    it('should replace breakpoints on a stable file path', async () => {
      (editor as { isDisposed: boolean }).isDisposed = true;
      handler.dispose();
      (editor as { isDisposed: boolean }).isDisposed = false;
      const path = '/home/jovyan/script.py';
      handler = new Debugger.EditorHandler({
        debuggerService: service,
        editorReady: () => new Promise<CodeEditor.IEditor>(() => undefined),
        getEditor: () => editor,
        path,
        src
      });

      src.setSource('x = 2\n');
      await settleSourceChange();
      src.setSource('x = 3\n');
      await settleSourceChange();

      const cleared = updateBreakpoints.mock.calls.filter(
        call => Array.isArray(call[1]) && call[1].length === 0
      );
      expect(cleared).toEqual([]);
      expect(updateBreakpoints).toHaveBeenCalledWith(
        'x = 3\n',
        [
          { line: 1, verified: true, source: { name: '' } },
          { line: 2, verified: true, source: { name: '' } }
        ],
        path
      );
    });
  });
});
