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
  CodeCellModel, CodeCellWidget, MarkdownCellModel, MarkdownCellWidget,
  RawCellModel, RawCellWidget, BaseCellWidget
} from '@jupyterlab/cells';

import {
  INotebookModel, NotebookModel
} from '@jupyterlab/notebook';

import {
  Notebook, StaticNotebook
} from '@jupyterlab/notebook';

import {
  DEFAULT_CONTENT, createNotebookFactory, rendermime, mimeTypeService,
  editorFactory
} from './utils';


const contentFactory = createNotebookFactory();
const options: Notebook.IOptions = {
  rendermime, contentFactory, mimeTypeService
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

  protected onCellInserted(index: number, cell: BaseCellWidget): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellMoved(fromIndex: number, toIndex: number): void {
    super.onCellMoved(fromIndex, toIndex);
    this.methods.push('onCellMoved');
  }

  protected onCellRemoved(cell: BaseCellWidget): void {
    super.onCellRemoved(cell);
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

  protected onCellInserted(index: number, cell: BaseCellWidget): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellMoved(fromIndex: number, toIndex: number): void {
    super.onCellMoved(fromIndex, toIndex);
    this.methods.push('onCellMoved');
  }

  protected onCellRemoved(cell: BaseCellWidget): void {
    super.onCellRemoved(cell);
    this.methods.push('onCellRemoved');
  }
}


function createActiveWidget(): LogNotebook {
  let model = new NotebookModel();
  let widget = new LogNotebook(options);
  widget.model = model;
  return widget;
}


describe('notebook/widget', () => {

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
        widget.model.cells.pushBack(cell);
        expect(called).to.be(true);
      });

      it('should be emitted when metadata is set', () => {
        let widget = new StaticNotebook(options);
        widget.model = new NotebookModel();
        let called = false;
        widget.modelContentChanged.connect(() => { called = true; });
        let cursor = widget.model.metadata.set('foo', 1);
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

        it('should handle changes to the model cell list', (done) => {
          widget = createWidget();
          widget.model.cells.clear();
          // The model should add a single code cell.
          requestAnimationFrame(() => {
            expect(widget.widgets.length).to.be(1);
            done();
          });
        });

        it('should handle a remove', () => {
          let cell = widget.model.cells.at(1);
          let child = widget.widgets[1];
          widget.model.cells.remove(cell);
          expect(cell.isDisposed).to.be(false);
          expect(child.isDisposed).to.be(true);
        });

        it('should handle an add', () => {
          let cell = widget.model.contentFactory.createCodeCell({});
          widget.model.cells.pushBack(cell);
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
          widget.model.cells.pushBack(cell);
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
        expect(child).to.be.a(CodeCellWidget);
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
        let cell = widget.model.cells.at(0);
        widget.model.cells.remove(cell);
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

      describe('#codeCellContentFactory', () => {

        it('should be a CodeCellWidget.ContentFactory', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          expect(factory.codeCellContentFactory).to.be.a(CodeCellWidget.ContentFactory);
        });

      });

      describe('#markdownCellContentFactory', () => {

        it('should be a BaseCellWidget.ContentFactory', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          expect(factory.markdownCellContentFactory).to.be.a(BaseCellWidget.ContentFactory);
        });

      });

      describe('#rawCellContentFactory', () => {

        it('should be a BaseCellWidget.ContentFactory', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          expect(factory.rawCellContentFactory).to.be.a(BaseCellWidget.ContentFactory);
        });

      });

      describe('#createCodeCell({})', () => {

        it('should create a `CodeCellWidget`', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          let contentFactory = factory.codeCellContentFactory;
          let model = new CodeCellModel({});
          let codeOptions = { model, rendermime, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = factory.createCodeCell(codeOptions, parent);
          expect(widget).to.be.a(CodeCellWidget);
        });

      });

      describe('#createMarkdownCell({})', () => {

        it('should create a `MarkdownCellWidget`', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          let contentFactory = factory.markdownCellContentFactory;
          let model = new MarkdownCellModel({});
          let mdOptions = { model, rendermime, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = factory.createMarkdownCell(mdOptions, parent);
          expect(widget).to.be.a(MarkdownCellWidget);
        });

      });

      describe('#createRawCell()', () => {

        it('should create a `RawCellWidget`', () => {
          let factory = new StaticNotebook.ContentFactory({ editorFactory });
          let contentFactory = factory.rawCellContentFactory;
          let model = new RawCellModel({});
          let rawOptions = { model, contentFactory };
          let parent = new StaticNotebook(options);
          let widget = factory.createRawCell(rawOptions, parent);
          expect(widget).to.be.a(RawCellWidget);
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

      it('should post an update request', (done) => {
        let widget = createActiveWidget();
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
        widget.mode = 'edit';
      });

      it('should deselect all cells if switching to edit mode', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          for (let i = 0; i < widget.widgets.length; i++) {
            let cell = widget.widgets[i];
            widget.select(cell);
            expect(widget.isSelected(cell)).to.be(true);
          }
          widget.mode = 'edit';
          for (let i = 0; i < widget.widgets.length; i++) {
            if (i === widget.activeCellIndex) {
              continue;
            }
            let cell = widget.widgets[i];
            expect(widget.isSelected(cell)).to.be(false);
          }
          widget.dispose();
          done();
        });
      });

      it('should unrender a markdown cell when switching to edit mode', () => {
        let widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        let cell = widget.model.contentFactory.createMarkdownCell({});
        widget.model.cells.pushBack(cell);
        let child = widget.widgets[widget.widgets.length - 1] as MarkdownCellWidget;
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

      it('should post an update request', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
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
        for (let i = 0; i < widget.widgets.length; i++) {
          let cell = widget.widgets[i];
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
        }
      });

    });

    describe('#deselect()', () => {

      it('should deselect a cell', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          let cell = widget.widgets[i];
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
          widget.deselect(cell);
          expect(widget.isSelected(cell)).to.be(false);
        }
      });

      it('should have no effect on the active cell', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = widget.widgets[widget.activeCellIndex];
        expect(widget.isSelected(cell)).to.be(true);
        widget.deselect(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

    });

    describe('#isSelected()', () => {

      it('should get whether the cell is selected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < widget.widgets.length; i++) {
          let cell = widget.widgets[i];
          if (i === widget.activeCellIndex) {
            expect(widget.isSelected(cell)).to.be(true);
          } else {
            expect(widget.isSelected(cell)).to.be(false);
          }
        }
      });

    });

    describe('#handleEvent()', () => {

      let widget: LogNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => { done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      context('mousedown', () => {

        it('should set the active cell index', () => {
          let child = widget.widgets[1];
          simulate(child.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.activeCellIndex).to.be(1);
        });

        it('should be a no-op if the model is read only', () => {
          let child = widget.widgets[1];
          widget.model.readOnly = true;
          simulate(child.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.activeCellIndex).to.be(0);
        });

        it('should be a no-op if not not a cell', () => {
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.activeCellIndex).to.be(0);
        });

        it('should preserve "command" mode if in a markdown cell', () => {
          let cell = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.pushBack(cell);
          let count = widget.widgets.length;
          let child = widget.widgets[count - 1] as MarkdownCellWidget;
          expect(child.rendered).to.be(true);
          simulate(child.node, 'mousedown');
          expect(child.rendered).to.be(true);
          expect(widget.activeCell).to.be(child);
        });

      });

      context('dblclick', () => {

        it('should unrender a markdown cell', () => {
          let cell = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.pushBack(cell);
          let child = widget.widgets[widget.widgets.length - 1] as MarkdownCellWidget;
          expect(child.rendered).to.be(true);
          expect(widget.mode).to.be('command');
          simulate(child.node, 'dblclick');
          expect(widget.mode).to.be('command');
          expect(child.rendered).to.be(false);
        });

        it('should be a no-op if the model is read only', () => {
          let cell = widget.model.contentFactory.createMarkdownCell({});
          widget.model.cells.pushBack(cell);
          widget.model.readOnly = true;
          let child = widget.widgets[widget.widgets.length - 1] as MarkdownCellWidget;
          expect(child.rendered).to.be(true);
          simulate(child.node, 'dblclick');
          expect(child.rendered).to.be(true);
        });

      });

      context('focus', () => {

        it('should change to edit mode if a child cell takes focus', () => {
          let child = widget.widgets[0];
          simulate(child.editorWidget.node, 'focus');
          expect(widget.events).to.contain('focus');
          expect(widget.mode).to.be('edit');
        });

        it('should change to command mode if the widget takes focus', () => {
          let child = widget.widgets[0];
          simulate(child.editorWidget.node, 'focus');
          expect(widget.events).to.contain('focus');
          expect(widget.mode).to.be('edit');
          widget.events = [];
          simulate(widget.node, 'focus');
          expect(widget.events).to.contain('focus');
          expect(widget.mode).to.be('command');
        });

      });

      context('blur', () => {

        it('should preserve the mode', () => {
          simulate(widget.node, 'focus');
          widget.mode = 'edit';
          let other = document.createElement('div');
          simulate(widget.node, 'blur', { relatedTarget: other });
          expect(widget.mode).to.be('edit');
          MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
          expect(widget.mode).to.be('edit');
          expect(widget.activeCell.editor.hasFocus()).to.be(true);
        });

        it('should set command mode', () => {
          simulate(widget.node, 'focus');
          widget.mode = 'edit';
          let evt = generate('blur');
          (evt as any).relatedTarget = widget.activeCell.node;
          widget.node.dispatchEvent(evt);
          expect(widget.mode).to.be('command');
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        let child = widget.widgets[0];
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onAfterAttach');
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          simulate(widget.node, 'dblclick');
          expect(widget.events).to.contain('dblclick');
          simulate(child.node, 'focus');
          expect(widget.events).to.contain('focus');
          widget.dispose();
          done();
        });
      });

      it('should post an update request', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onAfterAttach');
          requestAnimationFrame(() => {
            expect(widget.methods).to.contain('onUpdateRequest');
            widget.dispose();
            done();
          });
        });
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        let child = widget.widgets[0];
        requestAnimationFrame(() => {
          Widget.detach(widget);
          expect(widget.methods).to.contain('onBeforeDetach');
          widget.events = [];
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.not.contain('mousedown');
          simulate(widget.node, 'dblclick');
          expect(widget.events).to.not.contain('dblclick');
          simulate(child.node, 'focus');
          expect(widget.events).to.not.contain('focus');
          widget.dispose();
          done();
        });
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the node after an update', (done) => {
        let widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        requestAnimationFrame(() => {
          expect(document.activeElement).to.be(widget.node);
          widget.dispose();
          done();
        });
      });

      it('should post an `update-request', (done) => {
        let widget = createActiveWidget();
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          widget.dispose();
          done();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      let widget: LogNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {  done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should apply the command class if in command mode', () => {
        expect(widget.methods).to.contain('onUpdateRequest');
        expect(widget.hasClass('jp-mod-commandMode')).to.be(true);
      });

      it('should apply the edit class if in edit mode', (done) => {
        widget.mode = 'edit';
        requestAnimationFrame(() => {
          expect(widget.hasClass('jp-mod-editMode')).to.be(true);
          done();
        });
      });

      it('should add the active class to the active widget', () => {
        let cell = widget.widgets[widget.activeCellIndex];
        expect(cell.hasClass('jp-mod-active')).to.be(true);
      });

      it('should set the selected class on the selected widgets', (done) => {
        widget.select(widget.widgets[1]);
        requestAnimationFrame(() => {
          for (let i = 0; i < 2; i++) {
            let cell = widget.widgets[i];
            expect(cell.hasClass('jp-mod-selected')).to.be(true);
            done();
          }
        });
      });

      it('should add the multi select class if there is more than one widget', (done) => {
        widget.select(widget.widgets[1]);
        expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
        requestAnimationFrame(() => {
          expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
          done();
        });
      });

    });

    describe('#onCellInserted()', () => {

      it('should post an `update-request', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods).to.contain('onCellInserted');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

      it('should update the active cell if necessary', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.activeCell).to.be(widget.widgets[0]);
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
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.model.cells.move(1, 0);
        expect(widget.activeCellIndex).to.be(0);
      });

    });

    describe('#onCellRemoved()', () => {

      it('should post an `update-request', (done) => {
        let widget = createActiveWidget();
        let cell = widget.model.cells.at(0);
        widget.model.cells.remove(cell);
        expect(widget.methods).to.contain('onCellRemoved');
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

      it('should update the active cell if necessary', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.model.cells.removeAt(0);
        expect(widget.activeCell).to.be(widget.widgets[0]);
      });

    });

  });

});
