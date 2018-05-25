// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MessageLoop, Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  generate, simulate
} from 'simulate-event';

import {
  CodeCellModel, CodeCell, MarkdownCellModel, MarkdownCell,
  RawCellModel, RawCell, Cell
} from '@jupyterlab/cells';

import {
  INotebookModel, NotebookModel
} from '@jupyterlab/notebook';

import {
  Notebook, StaticNotebook
} from '@jupyterlab/notebook';

import {
  DEFAULT_CONTENT, createNotebookFactory, rendermime, mimeTypeService,
  editorFactory, defaultEditorConfig
} from '../../notebook-utils';
import { moment } from '../../utils';


const contentFactory = createNotebookFactory();
const options: Notebook.IOptions = {
  rendermime, contentFactory, mimeTypeService, editorConfig: defaultEditorConfig
};


function createWidget(): LogStaticNotebook {
  let model = new NotebookModel();
  let widget = new LogStaticNotebook(options);
  widget.model = model;
  return widget;
}


class LogStaticNotebook extends StaticNotebook {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onModelChanged(oldValue: INotebookModel, newValue: INotebookModel): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }

  protected onMetadataChanged(model: any, args: any): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onCellInserted(index: number, cell: Cell): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellMoved(fromIndex: number, toIndex: number): void {
    super.onCellMoved(fromIndex, toIndex);
    this.methods.push('onCellMoved');
  }

  protected onCellRemoved(index: number, cell: Cell): void {
    super.onCellRemoved(index, cell);
    this.methods.push('onCellRemoved');
  }
}


class LogNotebook extends Notebook {

  events: string[] = [];

  methods: string[] = [];

  handleEvent(event: Event): void {
    this.events.push(event.type);
    super.handleEvent(event);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onCellInserted(index: number, cell: Cell): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellMoved(fromIndex: number, toIndex: number): void {
    super.onCellMoved(fromIndex, toIndex);
    this.methods.push('onCellMoved');
  }

  protected onCellRemoved(index: number, cell: Cell): void {
    super.onCellRemoved(index, cell);
    this.methods.push('onCellRemoved');
  }
}


function createActiveWidget(): LogNotebook {
  let model = new NotebookModel();
  let widget = new LogNotebook(options);
  widget.model = model;
  return widget;
}


function selected(nb: Notebook): number[] {
    const selected = [];
    const cells = nb.widgets;
    for (let i = 0; i < cells.length; i++) {
      if (nb.isSelected(cells[i])) {
        selected.push(i);
      }
    }
    return selected;
}


describe('@jupyter/notebook', () => {

  describe('StaticNotebook', () => {

    describe('#constructor()', () => {

      it('should create a notebook widget', () => {
        let widget = new StaticNotebook(options);
        expect(widget).to.be.a(StaticNotebook);
      });

      it('should add the `jp-Notebook` class', () => {
        let widget = new StaticNotebook(options);
        expect(widget.hasClass('jp-Notebook')).to.be(true);
      });

      it('should accept an optional render', () => {
        let widget = new StaticNotebook(options);
        expect(widget.contentFactory).to.be(contentFactory);
      });

      it('should accept an optional editor config', () => {
        let widget = new StaticNotebook(options);
        expect(widget.editorConfig).to.be(defaultEditorConfig);
      });
    });

    describe('#modelChanged', () => {

      it('should be emitted when the model changes', () => {
        let widget = new StaticNotebook(options);
        let model = new NotebookModel();
        let called = false;
        widget.modelChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args).to.be(void 0);
          called = true;
        });
        widget.model = model;
        expect(called).to.be(true);
      });

    });

    describe('#modelContentChanged', () => {

      it('should be emitted when a cell is added', () => {
        let widget = new StaticNotebook(options);
        widget.model = new NotebookModel();
        let called = false;
        widget.modelContentChanged.connect(() => { called = true; });
        let cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.push(cell);
        expect(called).to.be(true);
      });

      it('should be emitted when metadata is set', () => {
        let widget = new StaticNotebook(options);
        widget.model = new NotebookModel();
        let called = false;
        widget.modelContentChanged.connect(() => { called = true; });
        widget.model.metadata.set('foo', 1);
        expect(called).to.be(true);
      });

    });

    describe('#model', () => {

      it('should get the model for the widget', () => {
        let widget = new StaticNotebook(options);
        expect(widget.model).to.be(null);
      });

      it('should set the model for the widget', () => {
        let widget = new StaticNotebook(options);
        let model = new NotebookModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should emit the `modelChanged` signal', () => {
        let widget = new StaticNotebook(options);
        let model = new NotebookModel();
        widget.model = model;
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = new NotebookModel();
        expect(called).to.be(true);
      });

      it('should be a no-op if the value does not change', () => {
        let widget = new StaticNotebook(options);
        let model = new NotebookModel();
        widget.model = model;
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = model;
        expect(called).to.be(false);
      });

      it('should add the model cells to the layout', () => {
        let widget = new LogStaticNotebook(options);
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        widget.model = model;
        expect(widget.widgets.length).to.be(6);
      });

      it('should set the mime types of the cell widgets', () => {
        let widget = new LogStaticNotebook(options);
        let model = new NotebookModel();
        let value = { name: 'python', codemirror_mode: 'python' };
        model.metadata.set('language_info', value);
        widget.model = model;
        let child = widget.widgets[0];
        expect(child.model.mimeType).to.be('text/x-python');
      });

      context('`cells.changed` signal', () => {

        let widget: LogStaticNotebook;

        beforeEach(() => {
          widget = createWidget();
          widget.model.fromJSON(DEFAULT_CONTENT);
        });

        afterEach(() => {
          widget.dispose();
        });

        it('should handle changes to the model cell list', async () => {
          widget = createWidget();
          widget.model.cells.clear();
          await moment();
          expect(widget.widgets.length).to.be(1);
        });

        it('should handle a remove', () => {
          let cell = widget.model.cells.get(1);
          let child = widget.widgets[1];
          widget.model.cells.removeValue(cell);
          expect(cell.isDisposed).to.be(false);
          expect(child.isDisposed).to.be(true);
        });

        it('should handle an add', () => {
          let cell = widget.model.contentFactory.createCodeCell({});
          widget.model.cells.push(cell);
          expect(widget.widgets.length).to.be(7);
          let child = widget.widgets[0];
          expect(child.hasClass('jp-Notebook-cell')).to.be(true);
        });

        it('should handle a move', () => {
          let child = widget.widgets[1];
          widget.model.cells.move(1, 2);
          expect(widget.widgets[2]).to.be(child);
        });

        it('should handle a clear', () => {
          let cell = widget.model.contentFactory.createCodeCell({});
          widget.model.cells.push(cell);
          widget.model.cells.clear();
          expect(widget.widgets.length).to.be(0);
        });

      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let widget = new StaticNotebook(options);
        expect(widget.rendermime).to.be(rendermime);
      });

    });

    describe('#contentFactory', () => {

      it('should be the cell widget contentFactory used by the widget', () => {
        let widget = new StaticNotebook(options);
        expect(widget.contentFactory).to.be.a(StaticNotebook.ContentFactory);
      });

    });

    describe('#editorConfig', () => {

      it('should be the cell widget contentFactory used by the widget', () => {
        let widget = new StaticNotebook(options);
        expect(widget.editorConfig).to.be(options.editorConfig);
      });

      it('should be settable', () => {
        let widget = createWidget();
        expect(widget.widgets[0].editor.getOption('autoClosingBrackets'))
        .to.be(true);
        let newConfig = {
          raw: defaultEditorConfig.raw,
          markdown: defaultEditorConfig.markdown,
          code: {
            ...defaultEditorConfig.code,
            autoClosingBrackets: false
          }
        };
        widget.editorConfig = newConfig;
        expect(widget.widgets[0].editor.getOption('autoClosingBrackets'))
        .to.be(false);
      });

    });

    describe('#codeMimetype', () => {

      it('should get the mime type for code cells', () => {
        let widget = new StaticNotebook(options);
        expect(widget.codeMimetype).to.be('text/plain');
      });

      it('should be set from language metadata', () => {
        let widget = new LogStaticNotebook(options);
        let model = new NotebookModel();
        let value = { name: 'python', codemirror_mode: 'python' };
        model.metadata.set('language_info', value);
        widget.model = model;
        expect(widget.codeMimetype).to.be('text/x-python');
      });

    });

    describe('#widgets', () => {

      it('should get the child widget at a specified index', () => {
        let widget = createWidget();
        let child = widget.widgets[0];
        expect(child).to.be.a(CodeCell);
      });

      it('should return `undefined` if out of range', () => {
        let widget = createWidget();
        let child = widget.widgets[1];
        expect(child).to.be(void 0);
      });

      it('should get the number of child widgets', () => {
        let widget = createWidget();
        expect(widget.widgets.length).to.be(1);
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.widgets.length).to.be(6);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createWidget();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onModelChanged()', () => {

      it('should be called when the model changes', () => {
        let widget = new LogStaticNotebook(options);
        widget.model = new NotebookModel();
        expect(widget.methods).to.contain('onModelChanged');
      });

      it('should not be called if the model does not change', () => {
        let widget = createWidget();
        widget.methods = [];
        widget.model = widget.model;
        expect(widget.methods).to.not.contain('onModelChanged');
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should be called when the metadata on the notebook changes', () => {
        let widget = createWidget();
        widget.model.metadata.set('foo', 1);
        expect(widget.methods).to.contain('onMetadataChanged');
      });

      it('should update the `codeMimetype`', () => {
        let widget = createWidget();
        let value = { name: 'python', codemirror_mode: 'python' };
        widget.model.metadata.set('language_info', value);
        expect(widget.methods).to.contain('onMetadataChanged');
        expect(widget.codeMimetype).to.be('text/x-python');
      });

      it('should update the cell widget mimetype', () => {
        let widget = createWidget();
        let value = { name: 'python', mimetype: 'text/x-python' };
        widget.model.metadata.set('language_info', value);
        expect(widget.methods).to.contain('onMetadataChanged');
        let child = widget.widgets[0];
        expect(child.model.mimeType).to.be('text/x-python');
      });

    });

    describe('#onCellInserted()', () => {

      it('should be called when a cell is inserted', () => {
        let widget = createWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods).to.contain('onCellInserted');
      });

    });

    describe('#onCellMoved()', () => {

      it('should be called when a cell is moved', () => {
        let widget = createWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.model.cells.move(0, 1);
        expect(widget.methods).to.contain('onCellMoved');
      });

    });

    describe('#onCellRemoved()', () => {

      it('should be called when a cell is removed', () => {
        let widget = createWidget();
        let cell = widget.model.cells.get(0);
        widget.model.cells.removeValue(cell);
        expect(widget.methods).to.contain('onCellRemoved');
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new ContentFactory', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          expect(factory).to.be.a(StaticNotebook.ContentFactory);
        });

      });

      describe('#createCodeCell({})', () => {

        it('should create a `CodeCell`', () => {
          let contentFactory = new StaticNotebook.ContentFactory();
          let model = new CodeCellModel({});
          let codeOptions = { model, rendermime, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = contentFactory.createCodeCell(codeOptions, parent);
          expect(widget).to.be.a(CodeCell);
        });

      });

      describe('#createMarkdownCell({})', () => {

        it('should create a `MarkdownCell`', () => {
          let contentFactory = new StaticNotebook.ContentFactory();
          let model = new MarkdownCellModel({});
          let mdOptions = { model, rendermime, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = contentFactory.createMarkdownCell(mdOptions, parent);
          expect(widget).to.be.a(MarkdownCell);
        });

      });

      describe('#createRawCell()', () => {

        it('should create a `RawCell`', () => {
          let contentFactory = new StaticNotebook.ContentFactory();
          let model = new RawCellModel({});
          let rawOptions = { model, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = contentFactory.createRawCell(rawOptions, parent);
          expect(widget).to.be.a(RawCell);
        });

      });

    });

  });

  describe('Notebook', () => {

    describe('#stateChanged', () => {

      it('should be emitted when the state of the notebook changes', () => {
        let widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args.name).to.be('mode');
          expect(args.oldValue).to.be('command');
          expect(args.newValue).to.be('edit');
          called = true;
        });
        widget.mode = 'edit';
        expect(called).to.be(true);
      });

    });

    describe('#activeCellChanged', () => {

      it('should be emitted when the active cell changes', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let called = false;
        widget.activeCellChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args).to.be(widget.activeCell);
          called = true;
        });
        widget.activeCellIndex++;
        expect(called).to.be(true);
      });

      it('should not be emitted when the active cell does not change', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let called = false;
        widget.activeCellChanged.connect(() => { called = true; });
        widget.activeCellIndex = widget.activeCellIndex;
        expect(called).to.be(false);
      });

    });

    describe('#selectionChanged', () => {

      it('should be emitted when the selection changes', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let called = false;
        widget.selectionChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args).to.be(void 0);
          called = true;
        });
        widget.select(widget.widgets[1]);
        expect(called).to.be(true);
      });

      it('should not be emitted when the selection does not change', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let called = false;
        widget.select(widget.widgets[1]);
        widget.selectionChanged.connect(() => { called = true; });
        widget.select(widget.widgets[1]);
        expect(called).to.be(false);
      });

    });

    describe('#mode', () => {

      it('should get the interactivity mode of the notebook', () => {
        let widget = createActiveWidget();
        expect(widget.mode).to.be('command');
      });

      it('should set the interactivity mode of the notebook', () => {
        let widget = createActiveWidget();
        widget.mode = 'edit';
        expect(widget.mode).to.be('edit');
      });

      it('should emit the `stateChanged` signal', () => {
        let widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args.name).to.be('mode');
          expect(args.oldValue).to.be('command');
          expect(args.newValue).to.be('edit');
          called = true;
        });
        widget.mode = 'edit';
        expect(called).to.be(true);
      });

      it('should be a no-op if the value does not change', () => {
        let widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect(() => { called = true; });
        widget.mode = 'command';
        expect(called).to.be(false);
      });

      it('should post an update request', async () => {
        let widget = createActiveWidget();
        widget.mode = 'edit';
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
      });

      it('should deselect all cells if switching to edit mode', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await moment();
        widget.extendContiguousSelectionTo(widget.widgets.length - 1);
        let selectedRange = Array.from(Array(widget.widgets.length).keys());
        expect(selected(widget)).to.eql(selectedRange);
        widget.mode = 'edit';
        expect(selected(widget)).to.eql([]);
        widget.dispose();
      });

      it('should unrender a markdown cell when switching to edit mode', () => {
        let widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        let cell = widget.model.contentFactory.createMarkdownCell({});
        widget.model.cells.push(cell);
        let child = widget.widgets[widget.widgets.length - 1] as MarkdownCell;
        expect(child.rendered).to.be(true);
        widget.activeCellIndex = widget.widgets.length - 1;
        widget.mode = 'edit';
        expect(child.rendered).to.be(false);
      });

    });

    describe('#activeCellIndex', () => {

      it('should get the active cell index of the notebook', () => {
        let widget = createActiveWidget();
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should set the active cell index of the notebook', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        expect(widget.activeCellIndex).to.be(1);
      });

      it('should clamp the index to the bounds of the notebook cells', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = -2;
        expect(widget.activeCellIndex).to.be(0);
        widget.activeCellIndex = 100;
        expect(widget.activeCellIndex).to.be(5);
      });

      it('should emit the `stateChanged` signal', () => {
        let widget = createActiveWidget();
        let called = false;
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.stateChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args.name).to.be('activeCellIndex');
          expect(args.oldValue).to.be(0);
          expect(args.newValue).to.be(1);
          called = true;
        });
        widget.activeCellIndex = 1;
        expect(called).to.be(true);
      });

      it('should be a no-op if the value does not change', () => {
        let widget = createActiveWidget();
        let called = false;
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.stateChanged.connect(() => { called = true; });
        widget.activeCellIndex = 0;
        expect(called).to.be(false);
      });

      it('should post an update request', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.activeCellIndex = 1;
      });

      it('should update the active cell if necessary', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        expect(widget.activeCell).to.be(widget.widgets[1]);
      });

    });

    describe('#activeCell', () => {

      it('should get the active cell widget', () => {
        let widget = createActiveWidget();
        expect(widget.activeCell).to.be(widget.widgets[0]);
      });

    });

    describe('#select()', () => {

      it('should select a cell widget', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = widget.widgets[0];
        widget.select(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

      it('should allow multiple widgets to be selected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.widgets.forEach(cell => { widget.select(cell); });
        let expectSelected = Array.from(Array(widget.widgets.length).keys());
        expect(selected(widget)).to.eql(expectSelected);
      });

    });

    describe('#deselect()', () => {

      it('should deselect a cell', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < widget.widgets.length; i++) {
          let cell = widget.widgets[i];
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
          widget.deselect(cell);
          expect(widget.isSelected(cell)).to.be(false);
        }
      });

      it('should let the active cell be deselected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = widget.activeCell;
        widget.select(cell);
        expect(widget.isSelected(cell)).to.be(true);
        widget.deselect(cell);
        expect(widget.isSelected(cell)).to.be(false);
      });


    });

    describe('#isSelected()', () => {

      it('should get whether the cell is selected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.select(widget.widgets[0]);
        widget.select(widget.widgets[2]);
        expect(selected(widget)).to.eql([0, 2]);
      });

      it('reports selection whether or not cell is active', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(selected(widget)).to.eql([]);
        widget.select(widget.activeCell);
        expect(selected(widget)).to.eql([widget.activeCellIndex]);
      });

    });

    describe('#deselectAll()', () => {

      it('should deselect all cells', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.select(widget.widgets[0]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.select(widget.widgets[4]);
        expect(selected(widget)).to.eql([0, 2, 3, 4]);
        widget.deselectAll();
        expect(selected(widget)).to.eql([]);
      });

    });

    describe('#extendContiguousSelectionTo()', () => {

      // Test a permutation for extending a selection.
      let checkSelection = (widget: Notebook, anchor: number, head: number, index: number, select = true) => {

        if (!select && anchor !== head) {
          throw new Error('anchor must equal head if select is false');
        }

        // Set up the test by pre-selecting appropriate cells if select is true.
        if (select) {
          for (let i = Math.min(anchor, head); i <= Math.max(anchor, head); i++) {
            widget.select(widget.widgets[i]);
          }
        }

        // Set the active cell to indicate the head of the selection.
        widget.activeCellIndex = head;

        // Set up a selection event listener.
        let selectionChanged = 0;
        let countSelectionChanged = (sender: Notebook, args: void) => {
          selectionChanged += 1;
        };
        widget.selectionChanged.connect(countSelectionChanged);

        // Check the contiguous selection.
        let selection = widget.getContiguousSelection();
        if (select) {
          expect(selection.anchor).to.be(anchor);
          expect(selection.head).to.be(head);
        } else {
          expect(selection.anchor).to.be(null);
          expect(selection.head).to.be(null);
        }

        // Extend the selection.
        widget.extendContiguousSelectionTo(index);

        // Clip index to fall within the cell index range.
        index = Math.max(0, Math.min(widget.widgets.length - 1, index));

        // Check the active cell is now at the index.
        expect(widget.activeCellIndex).to.be.equal(index);

        // Check the contiguous selection.
        selection = widget.getContiguousSelection();

        // Check the selection changed signal was emitted once if necessary.
        if (head === index) {
          if (index === anchor && select) {
            // we should have collapsed the single cell selection
            expect(selectionChanged).to.be(1);
          } else {
            expect(selectionChanged).to.be(0);
          }
        } else {
          expect(selectionChanged).to.be(1);
        }

        if (anchor !== index) {
          expect(selection.anchor).to.be.equal(anchor);
          expect(selection.head).to.be.equal(index);
        } else {
          // If the anchor and index are the same, the selection is collapsed.
          expect(selection.anchor).to.be.equal(null);
          expect(selection.head).to.be.equal(null);
        }

        // Clean up widget
        widget.selectionChanged.disconnect(countSelectionChanged);
        widget.activeCellIndex = 0;
        widget.deselectAll();
      };

      // Lists are of the form [anchor, head, index].
      let permutations = [
        // Anchor, head, and index are distinct
        [1, 3, 5],
        [1, 5, 3],
        [3, 1, 5],
        [3, 5, 1],
        [5, 1, 3],
        [5, 3, 1],

        // Two of anchor, head, and index are equal
        [1, 3, 3],
        [3, 1, 3],
        [3, 3, 1],

        // Anchor, head, and index all equal
        [3, 3, 3]
      ];

      it('should work in each permutation of anchor, head, and index', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          checkSelection(widget, p[0], p[1], p[2]);
        });
      });

      it('should work when we only have an active cell, with no existing selection', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          if (p[0] === p[1]) {
            checkSelection(widget, p[0], p[1], p[2], false);
          }
        });
      });

      it('should clip when the index is greater than the last index', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          checkSelection(widget, p[0], p[1], Number.MAX_SAFE_INTEGER);
        });
      });

      it('should clip when the index is greater than the last index with no existing selection', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          if (p[0] === p[1]) {
            checkSelection(widget, p[0], p[1], Number.MAX_SAFE_INTEGER, false);
          }
        });
      });

      it('should clip when the index is less than 0', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          checkSelection(widget, p[0], p[1], -10);
        });
      });

      it('should clip when the index is less than 0 with no existing selection', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        permutations.forEach(p => {
          if (p[0] === p[1]) {
            checkSelection(widget, p[0], p[1], -10, false);
          }
        });
      });

      it('handles the case of no cells', () => {
        let widget = createActiveWidget();
        widget.model.cells.clear();
        expect(widget.widgets.length).to.be(0);

        // Set up a selection event listener.
        let selectionChanged = 0;
        widget.selectionChanged.connect((sender, args) => {
          selectionChanged += 1;
        });

        widget.extendContiguousSelectionTo(3);

        expect(widget.activeCellIndex).to.be(-1);
        expect(selectionChanged).to.be(0);
      });

    });

    describe('#getContiguousSelection()', () => {

      it('throws an error when the selection is not contiguous', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        expect(() => widget.getContiguousSelection()).to.throwError(/Selection not contiguous/);
      });

      it('throws an error if the active cell is not at an endpoint', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);

        // Check if active cell is outside selection.
        widget.activeCellIndex = 0;
        expect(() => widget.getContiguousSelection()).to.throwError(/Active cell not at endpoint of selection/);

        // Check if active cell is inside selection.
        widget.activeCellIndex = 2;
        expect(() => widget.getContiguousSelection()).to.throwError(/Active cell not at endpoint of selection/);
      });

      it('returns null values if there is no selection', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        let selection = widget.getContiguousSelection();
        expect(selection).to.eql({head: null, anchor: null});
      });

      it('handles the case of no cells', () => {
        let widget = createActiveWidget();
        widget.model.cells.clear();
        expect(widget.widgets.length).to.be(0);

        let selection = widget.getContiguousSelection();
        expect(selection).to.eql({head: null, anchor: null});
      });

      it('works if head is before the anchor', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 1;

        let selection = widget.getContiguousSelection();
        expect(selection).to.eql({head: 1, anchor: 3});
      });

      it('works if head is after the anchor', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        let selection = widget.getContiguousSelection();
        expect(selection).to.eql({head: 3, anchor: 1});
      });

      it('works if head and anchor are the same', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);

        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        let selection = widget.getContiguousSelection();
        expect(selection).to.eql({head: 3, anchor: 3});
      });

    });

    describe('#handleEvent()', () => {

      let widget: LogNotebook;

      beforeEach(async () => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await moment();
      });

      afterEach(() => {
        widget.dispose();
      });

      context('mousedown', () => {

        it('should set the active cell index', () => {
          let child = widget.widgets[1];
          simulate(child.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.isSelected(widget.widgets[0])).to.be(false);
          expect(widget.activeCellIndex).to.be(1);
        });

        it('should be a no-op if not not a cell', () => {
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.activeCellIndex).to.be(0);
        });

        it('should preserve "command" mode if in a markdown cell', () => {
          let cell = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.push(cell);
          let count = widget.widgets.length;
          let child = widget.widgets[count - 1] as MarkdownCell;
          expect(child.rendered).to.be(true);
          simulate(child.node, 'mousedown');
          expect(child.rendered).to.be(true);
          expect(widget.activeCell).to.be(child);
        });

        it('should extend selection if invoked with shift', () => {
          widget.activeCellIndex = 3;

          // shift click below
          simulate(widget.widgets[4].node, 'mousedown', {shiftKey: true});
          expect(widget.activeCellIndex).to.be(4);
          expect(selected(widget)).to.eql([3, 4]);

          // shift click above
          simulate(widget.widgets[1].node, 'mousedown', {shiftKey: true});
          expect(widget.activeCellIndex).to.be(1);
          expect(selected(widget)).to.eql([1, 2, 3]);

          // shift click expand
          simulate(widget.widgets[0].node, 'mousedown', {shiftKey: true});
          expect(widget.activeCellIndex).to.be(0);
          expect(selected(widget)).to.eql([0, 1, 2, 3]);

          // shift click contract
          simulate(widget.widgets[2].node, 'mousedown', {shiftKey: true});
          expect(widget.activeCellIndex).to.be(2);
          expect(selected(widget)).to.eql([2, 3]);
        });

        it('should leave a markdown cell rendered', () => {
          let code = widget.model.contentFactory.createCodeCell({});
          let md = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.push(code);
          widget.model.cells.push(md);
          let count = widget.widgets.length;
          let codeChild = widget.widgets[count - 2];
          let mdChild = widget.widgets[count - 1] as MarkdownCell;
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = count - 2;
          expect(mdChild.rendered).to.be(true);
          simulate(codeChild.editorWidget.node, 'mousedown');
          simulate(codeChild.editorWidget.node, 'focusin');
          expect(mdChild.rendered).to.be(true);
          expect(widget.activeCell).to.be(codeChild);
          expect(widget.mode).to.be('edit');
        });

        it('should remove selection and switch to command mode', () => {
          let code = widget.model.contentFactory.createCodeCell({});
          let md = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.push(code);
          widget.model.cells.push(md);
          let count = widget.widgets.length;
          let codeChild = widget.widgets[count - 2];
          let mdChild = widget.widgets[count - 1] as MarkdownCell;
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = count - 2;
          simulate(codeChild.editorWidget.node, 'mousedown');
          simulate(codeChild.editorWidget.node, 'focusin');
          expect(widget.mode).to.be('edit');
          simulate(codeChild.editorWidget.node, 'mousedown', { button: 2 });
          expect(widget.isSelected(mdChild)).to.be(false);
          expect(widget.mode).to.be('command');
        });

        it('should have no effect on shift right click', () => {
          let code = widget.model.contentFactory.createCodeCell({});
          let md = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.push(code);
          widget.model.cells.push(md);
          let count = widget.widgets.length;
          let codeChild = widget.widgets[count - 2];
          let mdChild = widget.widgets[count - 1] as MarkdownCell;
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = count - 2;
          simulate(codeChild.editorWidget.node, 'mousedown', {
            shiftKey: true, button: 2
          });
          expect(widget.isSelected(mdChild)).to.be(true);
          expect(widget.mode).to.be('command');
        });

      });

      context('dblclick', () => {

        it('should unrender a markdown cell', () => {
          let cell = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.push(cell);
          let child = widget.widgets[widget.widgets.length - 1] as MarkdownCell;
          expect(child.rendered).to.be(true);
          expect(widget.mode).to.be('command');
          simulate(child.node, 'dblclick');
          expect(widget.mode).to.be('command');
          expect(child.rendered).to.be(false);
        });

      });

      context('focusin', () => {

        it('should change to edit mode if a child cell takes focus', () => {
          let child = widget.widgets[0];
          simulate(child.editorWidget.node, 'focusin');
          expect(widget.events).to.contain('focusin');
          expect(widget.mode).to.be('edit');
        });

        it('should change to command mode if the widget takes focus', () => {
          let child = widget.widgets[0];
          simulate(child.editorWidget.node, 'focusin');
          expect(widget.events).to.contain('focusin');
          expect(widget.mode).to.be('edit');
          widget.events = [];
          simulate(widget.node, 'focusin');
          expect(widget.events).to.contain('focusin');
          expect(widget.mode).to.be('command');
        });

      });

      context('focusout', () => {

        it('should switch to command mode', () => {
          simulate(widget.node, 'focusin');
          widget.mode = 'edit';
          let event = generate('focusout');
          (event as any).relatedTarget = document.body;
          widget.node.dispatchEvent(event);
          expect(widget.mode).to.be('command');
          MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
          expect(widget.mode).to.be('command');
          expect(widget.activeCell.editor.hasFocus()).to.be(false);
        });

        it('should set command mode', () => {
          simulate(widget.node, 'focusin');
          widget.mode = 'edit';
          let evt = generate('focusout');
          (evt as any).relatedTarget = widget.activeCell.node;
          widget.node.dispatchEvent(evt);
          expect(widget.mode).to.be('command');
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        let child = widget.widgets[0];
        await moment();
        expect(widget.methods).to.contain('onAfterAttach');
        simulate(widget.node, 'mousedown');
        expect(widget.events).to.contain('mousedown');
        simulate(widget.node, 'dblclick');
        expect(widget.events).to.contain('dblclick');
        simulate(child.node, 'focusin');
        expect(widget.events).to.contain('focusin');
        widget.dispose();
      });

      it('should post an update request', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await moment();
        expect(widget.methods).to.contain('onAfterAttach');
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.dispose();
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        let child = widget.widgets[0];
        await moment();
        Widget.detach(widget);
        expect(widget.methods).to.contain('onBeforeDetach');
        widget.events = [];
        simulate(widget.node, 'mousedown');
        expect(widget.events).to.not.contain('mousedown');
        simulate(widget.node, 'dblclick');
        expect(widget.events).to.not.contain('dblclick');
        simulate(child.node, 'focusin');
        expect(widget.events).to.not.contain('focusin');
        widget.dispose();
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the node after an update', async () => {
        let widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        await moment();
        expect(document.activeElement).to.be(widget.node);
        widget.dispose();
      });

      it('should post an `update-request', async () => {
        let widget = createActiveWidget();
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      let widget: LogNotebook;

      beforeEach(async () => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await moment();
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should apply the command class if in command mode', () => {
        expect(widget.methods).to.contain('onUpdateRequest');
        expect(widget.hasClass('jp-mod-commandMode')).to.be(true);
      });

      it('should apply the edit class if in edit mode', async () => {
        widget.mode = 'edit';
        await moment();
        expect(widget.hasClass('jp-mod-editMode')).to.be(true);
      });

      it('should add the active class to the active widget', () => {
        let cell = widget.widgets[widget.activeCellIndex];
        expect(cell.hasClass('jp-mod-active')).to.be(true);
      });

      it('should set the selected class on the selected widgets', async () => {
        widget.select(widget.widgets[1]);
        await moment();
        for (let i = 0; i < 2; i++) {
          let cell = widget.widgets[i];
          expect(cell.hasClass('jp-mod-selected')).to.be(true);
        }
      });

      it('should add the multi select class if there is more than one widget', async () => {
        widget.select(widget.widgets[1]);
        expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
        await moment();
        expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
      });

    });

    describe('#onCellInserted()', () => {

      it('should post an `update-request', async () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods).to.contain('onCellInserted');
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
      });

      it('should update the active cell if necessary', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.activeCell).to.be(widget.widgets[0]);
      });

      it('should keep the currently active cell active', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        let cell = widget.model.contentFactory.createCodeCell({});
        widget.model.cells.insert(1, cell);
        expect(widget.activeCell).to.be(widget.widgets[2]);
      });

      context('`edgeRequested` signal', () => {

        it('should activate the previous cell if top is requested', () => {
          let widget = createActiveWidget();
          widget.model.fromJSON(DEFAULT_CONTENT);
          widget.activeCellIndex = 1;
          let child = widget.widgets[widget.activeCellIndex];
          (child.editor.edgeRequested as any).emit('top');
          expect(widget.activeCellIndex).to.be(0);
        });

        it('should activate the next cell if bottom is requested', ()  => {
          let widget = createActiveWidget();
          widget.model.fromJSON(DEFAULT_CONTENT);
          let child = widget.widgets[widget.activeCellIndex];
          (child.editor.edgeRequested as any).emit('bottom');
          expect(widget.activeCellIndex).to.be(1);
        });

      });

    });

    describe('#onCellMoved()', () => {

      it('should update the active cell index if necessary', () => {
        let widget = createActiveWidget();

        // [fromIndex, toIndex, activeIndex], starting with activeIndex=3.
        let moves = [
          [0, 2, 3],
          [0, 3, 2],
          [0, 4, 2],
          [3, 2, 2],
          [3, 3, 3],
          [3, 4, 4],
          [4, 2, 4],
          [4, 3, 4],
          [4, 5, 3]
        ];

        moves.forEach((m) => {
          let [fromIndex, toIndex, activeIndex] = m;
          widget.model.fromJSON(DEFAULT_CONTENT);
          let cell = widget.widgets[3];
          widget.activeCellIndex = 3;
          widget.model.cells.move(fromIndex, toIndex);
          expect(widget.activeCellIndex).to.be(activeIndex);
          expect(widget.widgets[activeIndex]).to.be(cell);
        });
      });

    });

    describe('#onCellRemoved()', () => {

      it('should post an `update-request', async () => {
        let widget = createActiveWidget();
        let cell = widget.model.cells.get(0);
        widget.model.cells.removeValue(cell);
        expect(widget.methods).to.contain('onCellRemoved');
        await moment();
        expect(widget.methods).to.contain('onUpdateRequest');
      });

      it('should update the active cell if necessary', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.model.cells.remove(0);
        expect(widget.activeCell).to.be(widget.widgets[0]);
      });

      it('should keep the currently active cell active', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = 2;
        widget.model.cells.remove(1);
        expect(widget.activeCell).to.be(widget.widgets[1]);
      });

    });

  });

});
