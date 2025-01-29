// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createStandaloneCell, YCodeCell } from '@jupyter/ydoc';
import { Cell, CodeCellModel, ICodeCellModel } from '@jupyterlab/cells';
import {
  NotebookModel,
  NotebookModelFactory,
  NotebookViewModel
} from '@jupyterlab/notebook';

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
      expect(height).toBe(124); // (2 source_line + 4 output_line) * 17 (line_height) + 22 (cell_margin)
    });
  });
});

class NotebookViewModelTest extends NotebookViewModel {
  public cells: Cell[] = [];
}
