// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ClientSession
} from '@jupyterlab/apputils';

import {
  each
} from '@phosphor/algorithm';

import {
  CodeCell, MarkdownCell, RawCell
} from '@jupyterlab/cells';

import {
 NotebookModel
} from '@jupyterlab/notebook';

import {
  NotebookActions
} from '@jupyterlab/notebook';

import {
  Notebook
} from '@jupyterlab/notebook';

import {
  acceptDialog, createClientSession, dismissDialog, moment
} from '../../utils';

import {
  DEFAULT_CONTENT, createNotebookFactory, rendermime,
  clipboard, mimeTypeService
} from '../../notebook-utils';


const ERROR_INPUT = 'a = foo';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';


describe('@jupyterlab/notebook', () => {

  describe('NotebookActions', () => {

    let widget: Notebook;
    let session: ClientSession;
    let ipySession: ClientSession;

    before(() => {
      return createClientSession().then(s => {
        session = s;
        return createClientSession({ kernelPreference: { name: 'ipython' } });
      }).then(s => {
        ipySession = s;
        return Promise.all([s.initialize(), session.initialize()]);
      });
    });

    beforeEach(() => {
      widget = new Notebook({
        rendermime,
        contentFactory: createNotebookFactory(),
        mimeTypeService
      });
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      widget.model = model;

      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.dispose();
      clipboard.clear();
    });

    after(() => {
      return Promise.all([session.shutdown(), ipySession.shutdown()]);
    });

    describe('#executed', () => {

      it('should emit when Markdown and code cells are run', () => {
        let cell = widget.activeCell as CodeCell;
        let next = widget.widgets[1] as MarkdownCell;
        let emitted = 0;

        widget.select(next);
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.executed.connect(() => { emitted += 1; });

        return NotebookActions.run(widget, session).then(result => {
          expect(emitted).to.be(2);
          expect(next.rendered).to.be(true);
        });
      });

    });

    describe('#splitCell({})', () => {

      it('should split the active cell into two cells', () => {
        let cell = widget.activeCell;
        let source = 'thisisasamplestringwithnospaces';
        cell.model.value.text = source;
        let index = widget.activeCellIndex;
        let editor = cell.editor;
        editor.setCursorPosition(editor.getPositionAt(10));
        NotebookActions.splitCell(widget);
        let cells = widget.model.cells;
        let newSource = cells.get(index).value.text + cells.get(index + 1).value.text;
        expect(newSource).to.be(source);
      });

      it('should preserve leading white space in the second cell', () => {
        let cell = widget.activeCell;
        let source = 'this\n\n   is a test';
        cell.model.value.text = source;
        let editor = cell.editor;
        editor.setCursorPosition(editor.getPositionAt(4));
        NotebookActions.splitCell(widget);
        expect(widget.activeCell.model.value.text).to.be('   is a test');
      });

      it('should clear the existing selection', () => {
        each(widget.widgets, child => {
          widget.select(child);
        });
        NotebookActions.splitCell(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).to.be(false);
        }
      });

      it('should activate the second cell', () => {
        NotebookActions.splitCell(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

      it('should preserve the types of each cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).to.be.a(MarkdownCell);
        let prev = widget.widgets[0];
        expect(prev).to.be.a(MarkdownCell);
      });

      it('should create two empty cells if there is no content', () => {
        widget.activeCell.model.value.text = '';
        NotebookActions.splitCell(widget);
        expect(widget.activeCell.model.value.text).to.be('');
        let prev = widget.widgets[0];
        expect(prev.model.value.text).to.be('');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.splitCell(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.splitCell(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.value.text;
        let count = widget.widgets.length;
        NotebookActions.splitCell(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
        let cell = widget.widgets[0];
        expect(cell.model.value.text).to.be(source);
      });

    });

    describe('#mergeCells', () => {

      it('should merge the selected cells', () => {
        let source = widget.activeCell.model.value.text + '\n\n';
        let next = widget.widgets[1];
        widget.select(next);
        source += next.model.value.text + '\n\n';
        next = widget.widgets[2];
        widget.select(next);
        source += next.model.value.text;
        let count = widget.widgets.length;
        NotebookActions.mergeCells(widget);
        expect(widget.widgets.length).to.be(count - 2);
        expect(widget.activeCell.model.value.text).to.be(source);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should select the next cell if there is only one cell selected', () => {
        let source = widget.activeCell.model.value.text + '\n\n';
        let next = widget.widgets[1];
        source += next.model.value.text;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell.model.value.text).to.be(source);
      });

      it('should clear the outputs of a code cell', () => {
        NotebookActions.mergeCells(widget);
        let cell = widget.activeCell as CodeCell;
        expect(cell.model.outputs.length).to.be(0);
      });

      it('should preserve the widget mode', () => {
        widget.mode = 'edit';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).to.be('edit');
        widget.mode = 'command';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.value.text;
        let count = widget.widgets.length;
        NotebookActions.mergeCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
        let cell = widget.widgets[0];
        expect(cell.model.value.text).to.be(source);
      });

      it('should unrender a markdown cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        let cell = widget.activeCell as MarkdownCell;
        cell.rendered = true;
        NotebookActions.mergeCells(widget);
        cell = widget.activeCell as MarkdownCell;
        expect(cell.rendered).to.be(false);
        expect(widget.mode).to.be('command');
      });

      it('should preserve the cell type of the active cell', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).to.be.a(RawCell);
        expect(widget.mode).to.be('command');
      });

    });

    describe('#deleteCells()', () => {

      it('should delete the selected cells', () => {
        let next = widget.widgets[1];
        widget.select(next);
        let count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        expect(widget.widgets.length).to.be(count - 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.deleteCells(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should switch to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.deleteCells(widget);
        expect(widget.mode).to.be('command');
      });

      it('should activate the cell after the last selected cell', () => {
        widget.activeCellIndex = 4;
        let prev = widget.widgets[2];
        widget.select(prev);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).to.be(3);
      });

      it('should select the previous cell if the last cell is deleted', () => {
        widget.select(widget.widgets[widget.widgets.length - 1]);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).to.be(widget.widgets.length - 1);
      });

      it('should add a code cell if all cells are deleted', async () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.deleteCells(widget);
        await moment();
        expect(widget.widgets.length).to.be(1);
        expect(widget.activeCell).to.be.a(CodeCell);
      });

      it('should be undo-able', () => {
        let next = widget.widgets[1];
        widget.select(next);
        let source = widget.activeCell.model.value.text;
        let count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
        let cell = widget.widgets[0];
        expect(cell.model.value.text).to.be(source);
      });

      it('should be undo-able if all the cells are deleted', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        let count = widget.widgets.length;
        let source = widget.widgets[1].model.value.text;
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
        expect(widget.widgets[1].model.value.text).to.be(source);
      });

    });

    describe('#insertAbove()', () => {

      it('should insert a code cell above the active cell', () => {
        let count = widget.widgets.length;
        NotebookActions.insertAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
        expect(widget.widgets.length).to.be(count + 1);
        expect(widget.activeCell).to.be.a(CodeCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.insertAbove(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let count = widget.widgets.length;
        NotebookActions.insertAbove(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.insertAbove(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).to.be(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell.model.value.text).to.be('');
      });

    });

    describe('#insertBelow()', () => {

      it('should insert a code cell below the active cell', () => {
        let count = widget.widgets.length;
        NotebookActions.insertBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
        expect(widget.widgets.length).to.be(count + 1);
        expect(widget.activeCell).to.be.a(CodeCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell).to.be(void 0);
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.insertBelow(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        let count = widget.widgets.length;
        NotebookActions.insertBelow(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.insertBelow(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).to.be(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell.model.value.text).to.be('');
      });

    });

    describe('#changeCellType()', () => {

      it('should change the selected cell type(s)', () => {
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.activeCell).to.be.a(RawCell);
        next = widget.widgets[widget.activeCellIndex + 1];
        expect(next).to.be.a(RawCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.activeCell).to.be(void 0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.mode).to.be('edit');
      });

      it('should be undo-able', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.undo(widget);
        let cell = widget.widgets[0];
        expect(cell).to.be.a(CodeCell);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.changeCellType(widget, 'raw');
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).to.be(false);
        }
      });

      it('should unrender markdown cells', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        let cell = widget.activeCell as MarkdownCell;
        expect(cell.rendered).to.be(false);
      });

    });

    describe('#run()', () => {

      it('should run the selected cells', () => {
        let next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        let cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        return NotebookActions.run(widget, session).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
        });
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        return NotebookActions.run(widget, session).then(result => {
          expect(result).to.be(false);
        });
      });

      it('should activate the last selected cell', () => {
        let other = widget.widgets[2];
        widget.select(other);
        other.model.value.text = 'a = 1';
        return NotebookActions.run(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCell).to.be(other);
        });
      });

      it('should clear the selection', () => {
        let next = widget.widgets[1];
        widget.select(next);
        return NotebookActions.run(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.widgets[0])).to.be(false);
        });
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        return NotebookActions.run(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
        });
      });

      it('should handle no session', () => {
        return NotebookActions.run(widget, null).then(result => {
          expect(result).to.be(true);
          let cell = widget.activeCell as CodeCell;
          expect(cell.model.executionCount).to.be(null);
        });
      });

      it('should stop executing code cells on an error', () => {
        let cell = widget.model.contentFactory.createCodeCell({});
        cell.value.text = ERROR_INPUT;
        widget.model.cells.insert(2, cell);
        widget.select(widget.widgets[2]);
        cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        return NotebookActions.run(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          return ipySession.kernel.restart();
        });
      });

      it('should render all markdown cells on an error', () => {
        let cell = widget.model.contentFactory.createMarkdownCell({});
        widget.model.cells.push(cell);
        let child = widget.widgets[widget.widgets.length - 1] as MarkdownCell;
        child.rendered = false;
        widget.select(child);
        widget.activeCell.model.value.text = ERROR_INPUT;
        return NotebookActions.run(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(child.rendered).to.be(true);
          return ipySession.kernel.restart();
        });
      });

    });

    describe('#runAndAdvance()', () => {

      it('should run the selected cells ', () => {
        let next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        let cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
        });
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(false);
        });
      });

      it('should clear the existing selection', () => {
        let next = widget.widgets[2];
        widget.select(next);
        return NotebookActions.runAndAdvance(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(widget.isSelected(widget.widgets[0])).to.be(false);
          return ipySession.kernel.restart();
        });
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
        });
      });

      it('should activate the cell after the last selected cell', () => {
        let next = widget.widgets[3] as MarkdownCell;
        widget.select(next);
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCellIndex).to.be(4);
        });
      });

      it('should create a new code cell in edit mode if necessary', () => {
        let count = widget.widgets.length;
        widget.activeCellIndex = count - 1;
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.widgets.length).to.be(count + 1);
          expect(widget.activeCell).to.be.a(CodeCell);
          expect(widget.mode).to.be('edit');
        });
      });

      it('should allow an undo of the new cell', () => {
        let count = widget.widgets.length;
        widget.activeCellIndex = count - 1;
        return NotebookActions.runAndAdvance(widget, session).then(result => {
          expect(result).to.be(true);
          NotebookActions.undo(widget);
          expect(widget.widgets.length).to.be(count);
        });
      });

      it('should stop executing code cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        return NotebookActions.runAndAdvance(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          return ipySession.kernel.restart();
        });
      });

      it('should render all markdown cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        widget.select(cell);
        return NotebookActions.runAndAdvance(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          expect(widget.activeCellIndex).to.be(2);
          return ipySession.kernel.restart();
        });
      });

    });

    describe('#runAndInsert()', () => {

      it('should run the selected cells ', () => {
        let next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        let cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        return NotebookActions.runAndInsert(widget, session).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
        });
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        return NotebookActions.runAndInsert(widget, session).then(result => {
          expect(result).to.be(false);
        });
      });

      it('should clear the existing selection', () => {
        let next = widget.widgets[1];
        widget.select(next);
        return NotebookActions.runAndInsert(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.widgets[0])).to.be(false);
        });
      });

      it('should insert a new code cell in edit mode after the last selected cell', () => {
        let next = widget.widgets[2];
        widget.select(next);
        next.model.value.text = 'a = 1';
        let count = widget.widgets.length;
        return NotebookActions.runAndInsert(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.activeCell).to.be.a(CodeCell);
          expect(widget.mode).to.be('edit');
          expect(widget.widgets.length).to.be(count + 1);
        });
      });

      it('should allow an undo of the cell insert', () => {
        let next = widget.widgets[2];
        widget.select(next);
        next.model.value.text = 'a = 1';
        let count = widget.widgets.length;
        return NotebookActions.runAndInsert(widget, session).then(result => {
          expect(result).to.be(true);
          NotebookActions.undo(widget);
          expect(widget.widgets.length).to.be(count);
        });
      });

      it('should stop executing code cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        return NotebookActions.runAndInsert(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          return ipySession.kernel.restart();
        });
      });

      it('should render all markdown cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        widget.select(cell);
        return NotebookActions.runAndInsert(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          expect(widget.activeCellIndex).to.be(2);
          return ipySession.kernel.restart();
        });
      });

    });

    describe('#runAll()', () => {

      beforeEach(() => {
        // Make sure all cells have valid code.
        widget.widgets[2].model.value.text = 'a = 1';
      });

      it('should run all of the cells in the notebok', () => {
        let next = widget.widgets[1] as MarkdownCell;
        let cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        return NotebookActions.runAll(widget, session).then(result => {
          expect(result).to.be(true);
          expect(cell.model.outputs.length).to.be.above(0);
          expect(next.rendered).to.be(true);
        });
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        return NotebookActions.runAll(widget, session).then(result => {
          expect(result).to.be(false);
        });
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        return NotebookActions.runAll(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.mode).to.be('command');
        });
      });

      it('should clear the existing selection', () => {
        let next = widget.widgets[2];
        widget.select(next);
        return NotebookActions.runAll(widget, session).then(result => {
          expect(result).to.be(true);
          expect(widget.isSelected(widget.widgets[2])).to.be(false);
        });
      });

      it('should activate the last cell', () => {
        return NotebookActions.runAll(widget, session).then(result => {
          expect(widget.activeCellIndex).to.be(widget.widgets.length - 1);
        });
      });

      it('should stop executing code cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.push(cell);
        return NotebookActions.runAll(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.executionCount).to.be(null);
          expect(widget.activeCellIndex).to.be(widget.widgets.length - 1);
          return ipySession.kernel.restart();
        });
      });

      it('should render all markdown cells on an error', () => {
        widget.activeCell.model.value.text = ERROR_INPUT;
        let cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        return NotebookActions.runAll(widget, ipySession).then(result => {
          expect(result).to.be(false);
          expect(cell.rendered).to.be(true);
          return ipySession.kernel.restart();
        });
      });

    });

    describe('#selectAbove(`)', () => {

      it('should select the cell above the active cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the bottom', () => {
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectAbove(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.selectAbove(widget);
        expect(widget.mode).to.be('edit');
      });

    });

    describe('#selectBelow()', () => {

      it('should select the cell below the active cell', () => {
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the top', () => {
        widget.activeCellIndex = widget.widgets.length - 1;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).to.not.be(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectBelow(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.selectBelow(widget);
        expect(widget.mode).to.be('edit');
      });

    });

    describe('#extendSelectionAbove()', () => {

      it('should extend the selection to the cell above', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(widget.widgets[0])).to.be(true);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should change to command mode if there is a selection', () => {
        widget.mode = 'edit';
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.mode).to.be('command');
      });

      it('should not wrap around to the bottom', () => {
        widget.mode = 'edit';
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
        let last = widget.widgets[widget.widgets.length - 1];
        expect(widget.isSelected(last)).to.be(false);
        expect(widget.mode).to.equal('edit');
      });

      it('should deselect the current cell if the cell above is selected', () => {
        NotebookActions.extendSelectionBelow(widget);
        NotebookActions.extendSelectionBelow(widget);
        let cell = widget.activeCell;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(cell)).to.be(false);
      });

      it('should select only the first cell if we move from the second to first', () => {
        NotebookActions.extendSelectionBelow(widget);
        let cell = widget.activeCell;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(cell)).to.be(false);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should activate the cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

    });

    describe('#extendSelectionBelow()', () => {

      it('should extend the selection to the cell below', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(widget.widgets[0])).to.be(true);
        expect(widget.isSelected(widget.widgets[1])).to.be(true);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should change to command mode if there is a selection', () => {
        widget.mode = 'edit';
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.mode).to.be('command');
      });

      it('should not wrap around to the top', () => {
        let last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        widget.mode = 'edit';
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(last);
        expect(widget.isSelected(widget.widgets[0])).to.be(false);
        expect(widget.mode).to.equal('edit');
      });

      it('should deselect the current cell if the cell below is selected', () => {
        let last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        NotebookActions.extendSelectionAbove(widget);
        NotebookActions.extendSelectionAbove(widget);
        let current = widget.activeCell;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(current)).to.be(false);
      });

      it('should select only the last cell if we move from the second last to last', () => {
        let last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        NotebookActions.extendSelectionAbove(widget);
        let current = widget.activeCell;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(current)).to.be(false);
        expect(widget.activeCellIndex).to.be(last);
      });

      it('should activate the cell', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).to.be(1);
      });

    });

    describe('#moveUp()', () => {

      it('should move the selected cells up', () => {
        widget.activeCellIndex = 2;
        NotebookActions.extendSelectionAbove(widget);
        NotebookActions.moveUp(widget);
        expect(widget.isSelected(widget.widgets[0])).to.be(true);
        expect(widget.isSelected(widget.widgets[1])).to.be(true);
        expect(widget.isSelected(widget.widgets[2])).to.be(false);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the bottom', () => {
        expect(widget.activeCellIndex).to.be(0);
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should be undo-able', () => {
        widget.activeCellIndex++;
        let source = widget.activeCell.model.value.text;
        NotebookActions.moveUp(widget);
        expect(widget.model.cells.get(0).value.text).to.be(source);
        NotebookActions.undo(widget);
        expect(widget.model.cells.get(1).value.text).to.be(source);
      });

    });

    describe('#moveDown()', () => {

      it('should move the selected cells down', () => {
        NotebookActions.extendSelectionBelow(widget);
        NotebookActions.moveDown(widget);
        expect(widget.isSelected(widget.widgets[0])).to.be(false);
        expect(widget.isSelected(widget.widgets[1])).to.be(true);
        expect(widget.isSelected(widget.widgets[2])).to.be(true);
        expect(widget.activeCellIndex).to.be(2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should not wrap around to the top', () => {
        widget.activeCellIndex = widget.widgets.length - 1;
        NotebookActions.moveDown(widget);
        expect(widget.activeCellIndex).to.be(widget.widgets.length - 1);
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.value.text;
        NotebookActions.moveDown(widget);
        expect(widget.model.cells.get(1).value.text).to.be(source);
        NotebookActions.undo(widget);
        expect(widget.model.cells.get(0).value.text).to.be(source);
      });

    });

    describe('#copy()', () => {

      it('should copy the selected cells to a clipboard', () => {
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.copy(widget);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(true);
        let data = clipboard.getData(JUPYTER_CELL_MIME);
        expect(data.length).to.be(2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.copy(widget);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.copy(widget);
        expect(widget.mode).to.be('command');
      });

    });

    describe('#cut()', () => {

      it('should cut the selected cells to a clipboard', () => {
        let next = widget.widgets[1];
        widget.select(next);
        let count = widget.widgets.length;
        NotebookActions.cut(widget);
        expect(widget.widgets.length).to.be(count - 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.cut(widget);
        expect(clipboard.hasData(JUPYTER_CELL_MIME)).to.be(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let source = widget.activeCell.model.value.text;
        NotebookActions.cut(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets[0].model.value.text).to.be(source);
      });

      it('should add a new code cell if all cells were cut', async () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.cut(widget);
        await moment();
        expect(widget.widgets.length).to.be(1);
        expect(widget.activeCell).to.be.a(CodeCell);
      });

    });

    describe('#paste()', () => {

      it('should paste cells from a clipboard', () => {
        let source = widget.activeCell.model.value.text;
        let next = widget.widgets[1];
        widget.select(next);
        let count = widget.widgets.length;
        NotebookActions.cut(widget);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget);
        expect(widget.widgets.length).to.be(count);
        expect(widget.widgets[2].model.value.text).to.be(source);
        expect(widget.activeCellIndex).to.be(3);
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.copy(widget);
        widget.model = null;
        NotebookActions.paste(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there is no cell data on the clipboard', () => {
        let count = widget.widgets.length;
        NotebookActions.paste(widget);
        expect(widget.widgets.length).to.be(count);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget);
        NotebookActions.paste(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be undo-able', () => {
        let next = widget.widgets[1];
        widget.select(next);
        let count = widget.widgets.length;
        NotebookActions.cut(widget);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count - 2);
      });

    });

    describe('#undo()', () => {

      it('should undo a cell action', () => {
        let count = widget.widgets.length;
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count);
      });

      it('should switch the widget to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.undo(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.undo(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there are no cell actions to undo', () => {
        let count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        widget.model.cells.clearUndo();
        NotebookActions.undo(widget);
        expect(widget.widgets.length).to.be(count - 1);
      });

    });

    describe('#redo()', () => {

      it('should redo a cell action', () => {
        let count = widget.widgets.length;
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        NotebookActions.redo(widget);
        expect(widget.widgets.length).to.be(count - 2);
      });

      it('should switch the widget to command mode', () => {
        NotebookActions.undo(widget);
        widget.mode = 'edit';
        NotebookActions.redo(widget);
        expect(widget.mode).to.be('command');
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.undo(widget);
        widget.model = null;
        NotebookActions.redo(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should be a no-op if there are no cell actions to redo', () => {
        let count = widget.widgets.length;
        NotebookActions.redo(widget);
        expect(widget.widgets.length).to.be(count);
      });

    });

    describe('#toggleAllLineNumbers()', () => {

      it('should toggle line numbers on all cells', () => {
        let state = widget.activeCell.editor.getOption('lineNumbers');
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          let lineNumbers = widget.widgets[i].editor.getOption('lineNumbers');
          expect(lineNumbers).to.be(!state);
        }
      });

      it('should be based on the state of the active cell', () => {
        let state = widget.activeCell.editor.getOption('lineNumbers');
        for (let i = 1; i < widget.widgets.length; i++) {
          widget.widgets[i].editor.setOption('lineNumbers', !state);
        }
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          let lineNumbers = widget.widgets[i].editor.getOption('lineNumbers');
          expect(lineNumbers).to.be(!state);
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#clearOutputs()', () => {

      it('should clear the outputs on the selected cells', () => {
        // Select the next code cell that has outputs.
        let index = 0;
        for (let i = 1; i < widget.widgets.length; i++) {
          let cell = widget.widgets[i];
          if (cell instanceof CodeCell && cell.model.outputs.length) {
            widget.select(cell);
            index = i;
            break;
          }
        }
        NotebookActions.clearOutputs(widget);
        let cell = widget.widgets[0] as CodeCell;
        expect(cell.model.outputs.length).to.be(0);
        cell = widget.widgets[index] as CodeCell;
        expect(cell.model.outputs.length).to.be(0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearOutputs(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#clearAllOutputs()', () => {

      it('should clear the outputs on all cells', () => {
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.clearAllOutputs(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          let cell = widget.widgets[i];
          if (cell instanceof CodeCell) {
            expect(cell.model.outputs.length).to.be(0);
          }
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).to.be('command');
        widget.mode = 'edit';
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).to.be('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearAllOutputs(widget);
        expect(widget.activeCellIndex).to.be(-1);
      });

    });

    describe('#persistViewState()', () => {
      it('input hidden, output hidden and scrolled', () => {
        for (const cell of widget.widgets) {
          cell.inputHidden = true;
          if (cell instanceof CodeCell) {
            cell.outputHidden = true;
            cell.outputsScrolled = true;
          }
        }
        NotebookActions.persistViewState(widget);
        for (const cell of widget.widgets) {
          if (cell instanceof CodeCell) {
            expect(cell.model.metadata.get('collapsed')).to.be(true);
            expect(cell.model.metadata.get('scrolled')).to.be(true);
            expect(cell.model.metadata.get('jupyter')).to.eql({
              source_hidden: true,
              outputs_hidden: true
            });
          } else {
            expect(cell.model.metadata.get('jupyter')).to.eql({
              source_hidden: true,
            });
          }
        }
      });

      it('input hidden, output hidden and not scrolled', () => {
        for (const cell of widget.widgets) {
          cell.inputHidden = false;
          if (cell instanceof CodeCell) {
            cell.outputHidden = false;
            cell.outputsScrolled = false;
          }
        }
        NotebookActions.persistViewState(widget);
        for (const cell of widget.widgets) {
          if (cell instanceof CodeCell) {
            expect(cell.model.metadata.has('collapsed')).to.be(false);
            expect(cell.model.metadata.has('scrolled')).to.be(false);
          }
          expect(cell.model.metadata.has('jupyter')).to.be(false);
        }
      });

      it('input hidden, output shown and not scrolled', () => {

        for (const cell of widget.widgets) {
          cell.inputHidden = true;
          if (cell instanceof CodeCell) {
            cell.outputHidden = false;
            cell.outputsScrolled = false;
          }
        }
        NotebookActions.persistViewState(widget);
        for (const cell of widget.widgets) {
          if (cell instanceof CodeCell) {
            expect(cell.model.metadata.has('collapsed')).to.be(false);
            expect(cell.model.metadata.has('scrolled')).to.be(false);
          }
          expect(cell.model.metadata.get('jupyter')).to.eql({
            source_hidden: true
          });
        }
      });
    });

    describe('#setMarkdownHeader()', () => {

      it('should set the markdown header level of selected cells', () => {
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.value.text.slice(0, 3)).to.be('## ');
        expect(next.model.value.text.slice(0, 3)).to.be('## ');
      });

      it('should convert the cells to markdown type', () => {
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell).to.be.a(MarkdownCell);
      });

      it('should be clamped between 1 and 6', () => {
        NotebookActions.setMarkdownHeader(widget, -1);
        expect(widget.activeCell.model.value.text.slice(0, 2)).to.be('# ');
        NotebookActions.setMarkdownHeader(widget, 10);
        expect(widget.activeCell.model.value.text.slice(0, 7)).to.be('###### ');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.setMarkdownHeader(widget, 1);
        expect(widget.activeCellIndex).to.be(-1);
      });

      it('should replace an existing header', () => {
        widget.activeCell.model.value.text = '# foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.value.text).to.be('## foo');
      });

      it('should replace leading white space', () => {
        widget.activeCell.model.value.text = '      foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell.model.value.text).to.be('## foo');
      });

      it('should unrender the cells', () => {
        NotebookActions.setMarkdownHeader(widget, 1);
        expect((widget.activeCell as MarkdownCell).rendered).to.be(false);
      });

    });

    describe('#trust()', () => {

      it('should trust the notebook cells if the user accepts', (done) => {
        let model = widget.model;
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = model.cells.get(0);
        expect(cell.trusted).to.not.be(true);
        NotebookActions.trust(widget).then(() => {
          expect(cell.trusted).to.be(true);
          done();
        });
        acceptDialog();
      });

      it('should not trust the notebook cells if the user aborts', (done) => {
        let model = widget.model;
        model.fromJSON(DEFAULT_CONTENT);
        let cell = model.cells.get(0);
        expect(cell.trusted).to.not.be(true);
        NotebookActions.trust(widget).then(() => {
          expect(cell.trusted).to.not.be(true);
          done();
        });
        dismissDialog();
      });

      it('should bail if the model is `null`', (done) => {
        widget.model = null;
        NotebookActions.trust(widget).then(() => { done(); });
      });

      it('should show a dialog if all cells are trusted', (done) => {
        let model = widget.model;
        widget.model.fromJSON(DEFAULT_CONTENT);
        model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < model.cells.length; i++) {
          let cell = model.cells.get(i);
          cell.trusted = true;
        }
        NotebookActions.trust(widget).then(() => { done(); });
        acceptDialog();
      });

    });

  });

});
