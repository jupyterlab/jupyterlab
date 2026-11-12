// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type { IEditorServices } from '@jupyterlab/codeeditor';
import { DebuggerConfig } from '../src/config';
import { DebuggerSources } from '../src/sources';

function createMockCell(source: string, editorId: string) {
  const mockEditor = { id: editorId } as unknown as CodeEditor.IEditor;
  return {
    editor: mockEditor,
    model: {
      sharedModel: {
        getSource: () => source
      }
    }
  };
}

describe('DebuggerSources', () => {
  const kernel = 'python';
  let config: DebuggerConfig;
  let shell: JupyterFrontEnd.IShell;

  beforeEach(() => {
    config = new DebuggerConfig();
    config.setHashParams({ method: 'Murmur2', seed: '0', kernel });
    config.setTmpFileParams({ prefix: '/tmp/test-', suffix: '.py', kernel });
    shell = {
      activateById: jest.fn()
    } as unknown as JupyterFrontEnd.IShell;
  });

  describe('#find', () => {
    it('should find editors across multiple console cells (not just the first cell)', () => {
      const cell0 = createMockCell('a = 1', 'editor-0');
      const cell1 = createMockCell('b = 2', 'editor-1');
      const cell2 = createMockCell('c = 3', 'editor-2');

      const consolePanel = {
        id: 'console-1',
        sessionContext: {
          path: 'test-console-path'
        },
        console: {
          cells: [cell0, cell1, cell2],
          promptCell: null
        }
      } as unknown as ConsolePanel;

      const consoleTracker = {
        forEach: (fn: (panel: ConsolePanel) => void) => fn(consolePanel)
      } as unknown as IConsoleTracker;

      const sources = new DebuggerSources({
        config,
        editorServices: {} as IEditorServices,
        shell,
        consoleTracker
      });

      const codeId0 = config.getCodeId('a = 1', kernel);
      const codeId1 = config.getCodeId('b = 2', kernel);
      const codeId2 = config.getCodeId('c = 3', kernel);

      // Verify cell 0
      const editors0 = sources.find({
        focus: false,
        kernel,
        path: 'test-console-path',
        source: codeId0
      });
      expect(editors0.length).toBe(1);
      expect(editors0[0].get()).toBe(cell0.editor);

      // Verify cell 1 (fails if break; is used on mismatch of cell 0)
      const editors1 = sources.find({
        focus: false,
        kernel,
        path: 'test-console-path',
        source: codeId1
      });
      expect(editors1.length).toBe(1);
      expect(editors1[0].get()).toBe(cell1.editor);

      // Verify cell 2
      const editors2 = sources.find({
        focus: false,
        kernel,
        path: 'test-console-path',
        source: codeId2
      });
      expect(editors2.length).toBe(1);
      expect(editors2[0].get()).toBe(cell2.editor);
    });

    it('should find editor in promptCell of console', () => {
      const cell0 = createMockCell('a = 1', 'editor-0');
      const promptCell = createMockCell('prompt_code = 42', 'prompt-editor');

      const consolePanel = {
        id: 'console-1',
        sessionContext: {
          path: 'test-console-path'
        },
        console: {
          cells: [cell0],
          promptCell
        }
      } as unknown as ConsolePanel;

      const consoleTracker = {
        forEach: (fn: (panel: ConsolePanel) => void) => fn(consolePanel)
      } as unknown as IConsoleTracker;

      const sources = new DebuggerSources({
        config,
        editorServices: {} as IEditorServices,
        shell,
        consoleTracker
      });

      const promptCodeId = config.getCodeId('prompt_code = 42', kernel);
      const editors = sources.find({
        focus: false,
        kernel,
        path: 'test-console-path',
        source: promptCodeId
      });
      expect(editors.length).toBe(1);
      expect(editors[0].get()).toBe(promptCell.editor);
    });

    it('should return empty array if no console cell matches', () => {
      const cell0 = createMockCell('a = 1', 'editor-0');
      const consolePanel = {
        id: 'console-1',
        sessionContext: {
          path: 'test-console-path'
        },
        console: {
          cells: [cell0],
          promptCell: null
        }
      } as unknown as ConsolePanel;

      const consoleTracker = {
        forEach: (fn: (panel: ConsolePanel) => void) => fn(consolePanel)
      } as unknown as IConsoleTracker;

      const sources = new DebuggerSources({
        config,
        editorServices: {} as IEditorServices,
        shell,
        consoleTracker
      });

      const editors = sources.find({
        focus: false,
        kernel,
        path: 'test-console-path',
        source: '/tmp/test-non-existent.py'
      });
      expect(editors.length).toBe(0);
    });
  });
});
