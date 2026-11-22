// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { YCodeCell } from '@jupyter/ydoc';
import { createStandaloneCell } from '@jupyter/ydoc';
import type { Cell, ICodeCellModel } from '@jupyterlab/cells';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';
import {
  NotebookModel,
  NotebookModelFactory,
  NotebookViewModel
} from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookModelFactory', () => {
    describe('#constructor', () => {
      it('should create a new notebook model factory', () => {
        const factory = new NotebookModelFactory({});
        expect(factory).toBeInstanceOf(NotebookModelFactory);
      });
    });

    describe('#name', () => {
      it('should get the name of the model factory', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.name).toBe('notebook');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.contentType).toBe('notebook');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.fileFormat).toBe('json');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory is disposed', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the model factory', () => {
        const factory = new NotebookModelFactory({});
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = new NotebookModelFactory({});
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new model for a given path', () => {
        const factory = new NotebookModelFactory({});
        const model = factory.createNew();
        expect(model).toBeInstanceOf(NotebookModel);
      });

      it('should accept a language preference', () => {
        const factory = new NotebookModelFactory({});
        const model = factory.createNew({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#preferredLanguage()', () => {
      it('should always return an empty string', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.preferredLanguage('')).toBe('');
        expect(factory.preferredLanguage('.ipynb')).toBe('');
      });
    });
  });

  describe('NotebookViewModel', () => {
    let notebook: NotebookViewModelTest;

    beforeEach(() => {
      notebook = new NotebookViewModelTest([]);
    });

    test('should not throw if requested for cell out of bonds', () => {
      const height = notebook.estimateWidgetSize(100);
      expect(height).toBe(0);
    });

    test('should calculate height based on number of lines in source and output (string output)', () => {
      const outputObj = [
        {
          output_type: 'execute_result',
          data: {
            'text/plain': '15',
            'text/html': ['<div>\n', ' <p>15</p>\n', '</div>']
          },
          execution_count: 2,
          metadata: {}
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['sum([1, 2, 3, 4, 5])'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      expect(model.executionCount).toBe(1);
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      expect(height).toBe(56); // (1 source_line + 1 output_line) * 17 (line_height) + 22 (cell_margin)
    });

    test('should prefer text/markdown over text/plain for height estimation', () => {
      const outputObj = [
        {
          output_type: 'execute_result',
          data: {
            'text/markdown': '# Header\n\nSome paragraph\n\nAnother paragraph',
            'text/plain': 'short fallback'
          },
          execution_count: 1,
          metadata: {}
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['display(md)'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 1 source line, 5 markdown lines
      expect(height).toBe(124); // (1 + 5) * 17 + 22
    });

    test('should count lines from stdout stream output', () => {
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'line 1\nline 2\nline 3\n'
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['print("line 1")\nprint("line 2")\nprint("line 3")'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 3 source lines, 3 output lines
      expect(height).toBe(124); // (3 + 3) * 17 + 22
    });

    test('should count lines from stderr stream output', () => {
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stderr',
          text: 'Warning: something\nTraceback:\n  File "test.py"\n'
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['import warnings\nwarnings.warn("something")'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 2 source lines, 3 stderr lines
      expect(height).toBe(107); // (2 + 3) * 17 + 22
    });

    test('should count lines from the traceback of an error output', () => {
      const outputObj = [
        {
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: [
            'ZeroDivisionError                         Traceback (most recent call last)',
            'Cell In[1], line 1\n----> 1 1 / 0',
            'ZeroDivisionError: division by zero'
          ]
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['1 / 0'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 1 source line, 4 traceback lines
      expect(height).toBe(107); // (1 + 4) * 17 + 22
    });

    test('should add up the lines of all outputs', () => {
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'hello\nworld\n'
        },
        {
          output_type: 'execute_result',
          data: {
            'text/plain': '42'
          },
          execution_count: 1,
          metadata: {}
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['print("hello")\nprint("world")\n42'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 3 source lines, 2 stdout lines + 1 text/plain line = 3 output lines
      expect(height).toBe(124); // (3 + 3) * 17 + 22
    });

    test('should count blank lines in the output', () => {
      const outputObj = [
        {
          output_type: 'execute_result',
          data: {
            'text/plain':
              'array([[[0., 0.],\n        [0., 0.]],\n\n       [[0., 0.],\n        [0., 0.]]])'
          },
          execution_count: 1,
          metadata: {}
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['np.zeros((2, 2, 2))'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 1 source line, 5 output lines
      expect(height).toBe(124); // (1 + 5) * 17 + 22
    });

    test('should count collapsed outputs as one line', () => {
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'line 1\nline 2\nline 3\n'
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['print("line 1\\nline 2\\nline 3")'],
        metadata: { collapsed: true }
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 1 source line, 1 placeholder line
      expect(height).toBe(56); // (1 + 1) * 17 + 22
    });

    test('should count at most 18 lines of scrolled outputs', () => {
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'epoch\n'.repeat(400)
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['for i in range(400):\n    print("epoch")'],
        metadata: { scrolled: true }
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      // 2 source lines, 18 lines in the scrolled output area
      expect(height).toBe(362); // (2 + 18) * 17 + 22
    });

    test('should count the lines that fit in the maximum height of scrolled outputs', () => {
      const style = document.createElement('style');
      style.textContent =
        '.jp-CodeCell.jp-mod-outputsScrolled .jp-Cell-outputArea { max-height: 170px; }';
      document.head.appendChild(style);
      const outputObj = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'epoch\n'.repeat(400)
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['for i in range(400):\n    print("epoch")'],
        metadata: { scrolled: true }
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      style.remove();
      // 2 source lines, 10 lines of 17 px in the scrolled output area
      expect(height).toBe(226); // (2 + 10) * 17 + 22
    });

    test('should count the outputs past the limit of the output area as one line', () => {
      const outputObj = Array.from({ length: 10 }, (_, i) => ({
        output_type: 'stream',
        name: i % 2 ? 'stderr' : 'stdout',
        text: `step ${i}\n`
      }));
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['for i in range(5):\n    print(i)\n    log.warning(i)'],
        metadata: {}
      }) as YCodeCell;

      const model = new CodeCellModel({ sharedModel });
      const cell = new CodeCell({
        model,
        rendermime: NBTestUtils.defaultRenderMime(),
        contentFactory: NBTestUtils.createCodeCellFactory(),
        maxNumberOutputs: 4
      });
      notebook.cells.push(cell);

      const height = notebook.estimateWidgetSize(0);
      // 3 source lines, 4 output lines and the button that shows the rest
      expect(height).toBe(158); // (3 + 4 + 1) * 17 + 22
      cell.dispose();
    });

    test('should calculate height based on number of lines in source and output (string[] output)', () => {
      const outputObj = [
        {
          output_type: 'execute_result',
          data: {
            'text/plain': [
              'Output line 1\n',
              'Output line 2\n',
              'Output line 3\n'
            ],
            'text/html': []
          },
          execution_count: 4,
          metadata: {}
        }
      ];
      const sharedModel = createStandaloneCell({
        cell_type: 'code',
        execution_count: 1,
        outputs: outputObj,
        source: ['for i in range(3):\n', '    print(f"Output line {i+1}")'],
        metadata: {}
      }) as YCodeCell;

      const model: ICodeCellModel = new CodeCellModel({ sharedModel });
      expect(model.executionCount).toBe(1);
      notebook.cells.push({ model } as Cell<ICodeCellModel>);

      const height = notebook.estimateWidgetSize(0);
      expect(height).toBe(107); // (2 source_lines + 3 output_lines) * 17 (line_height) + 22 (cell_margin)
    });
  });
});

class NotebookViewModelTest extends NotebookViewModel {
  public cells: Cell[] = [];
}
