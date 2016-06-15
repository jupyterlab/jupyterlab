// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor-messaging';

import {
  IObservableList, IListChangedArgs
} from 'phosphor-observablelist';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  BaseCellWidget, CodeCellWidget, ICellModel, MarkdownCellWidget, RawCellWidget
} from '../../../../lib/notebook/cells';

import {
  EdgeLocation
} from '../../../../lib/notebook/cells/editor';

import {
  INotebookModel, NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  ActiveNotebook, NotebookRenderer
} from '../../../../lib/notebook/notebook/widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


const DEFAULT_CONTENT: nbformat.INotebookContent = require('../../../../examples/notebook/test.ipynb') as nbformat.INotebookContent;


function createWidget(): LogNotebookRenderer {
  let model = new NotebookModel();
  let rendermime = defaultRenderMime();
  let widget = new LogNotebookRenderer(rendermime);
  widget.model = model;
  return widget;
}


class LogNotebookRenderer extends NotebookRenderer {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onMetadataChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    super.onCellsChanged(sender, args);
    this.methods.push('onCellsChanged');
  }

  protected initialize(model: INotebookModel): void {
    super.initialize(model);
    this.methods.push('initialize');
  }

  protected initializeCellWidget(widget: BaseCellWidget): void {
    super.initializeCellWidget(widget);
    this.methods.push('initializeCellWidget');
  }

  protected updateMimetypes(): void {
    this.methods.push('updateMimetypes');
    return super.updateMimetypes();
  }
}


class LogActiveNotebook extends ActiveNotebook {

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

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }

  protected initializeCellWidget(widget: BaseCellWidget): void {
    super.initializeCellWidget(widget);
    this.methods.push('initializeCellWidget');
  }

  protected onEdgeRequest(widget: Widget, location: EdgeLocation): void {
    super.onEdgeRequest(widget, location);
    this.methods.push('onEdgeRequest');
  }
}


function createActiveWidget(): LogActiveNotebook {
  let model = new NotebookModel();
  let rendermime = defaultRenderMime();
  let widget = new LogActiveNotebook(rendermime);
  widget.model = model;
  return widget;
}


describe('notebook/notebook/widget', () => {

  describe('NotebookRenderer', () => {

    describe('.createCell()', () => {

      it('should create a new code cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createCodeCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(CodeCellWidget);
      });

      it('should create a new raw cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createRawCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(RawCellWidget);
      });

      it('should create a new markdown cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createMarkdownCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(MarkdownCellWidget);
      });

    });

    describe('#constructor()', () => {

      it('should create a notebook widget', () => {
        let rendermime = defaultRenderMime();
        let widget = new NotebookRenderer(rendermime);
        expect(widget).to.be.a(NotebookRenderer);
      });

      it('should add the `jp-Notebook` class', () => {
        let rendermime = defaultRenderMime();
        let widget = new NotebookRenderer(rendermime);
        expect(widget.hasClass('jp-Notebook')).to.be(true);
      });

    });

    describe('#model', () => {

      it('should get the model for the widget', () => {
        let widget = new NotebookRenderer(defaultRenderMime());
        expect(widget.model).to.be(null);
      });

      it('should set the model for the widget', () => {
        let widget = new NotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should call `initialize()` on the widget', () => {
        let widget = new LogNotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        widget.model = model;
        expect(widget.methods.indexOf('initialize')).to.not.be(-1);
      });

      it('should throw an error when changing to a different value', () => {
        let widget = new LogNotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        widget.model = model;
        expect(() => { widget.model = new NotebookModel(); }).to.throwError();
      });

      it('should throw an error if set to `null`', () => {
        let widget = new LogNotebookRenderer(defaultRenderMime());
        widget.model = new NotebookModel();
        expect(() => { widget.model = null; }).to.throwError();
      });

      it('should be a no-op if the value does not change', () => {
        let widget = new NotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        widget.model = model;
        widget.model = model;
        expect(widget.model).to.be(model);
      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let rendermime = defaultRenderMime();
        let widget = new NotebookRenderer(rendermime);
        expect(widget.rendermime).to.be(rendermime);
      });

      it('should be read-only', () => {
        let widget = createWidget();
        expect(() => { widget.rendermime = null; }).to.throwError();
      });

    });

    describe('#childAt()', () => {

      it('should get the child widget at a specified index', () => {
        let widget = createWidget();
        let child = widget.childAt(0);
        expect(child).to.be.a(CodeCellWidget);
      });

      it('should return `undefined` if out of range', () => {
        let widget = createWidget();
        let child = widget.childAt(1);
        expect(child).to.be(void 0);
      });

    });

    describe('#childCount()', () => {

      it('should get the number of child widgets', () => {
        let widget = createWidget();
        expect(widget.childCount()).to.be(1);
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.childCount()).to.be(6);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createWidget();
        let model = widget.model;
        widget.dispose();
        expect(widget.model).to.be(null);
        expect(model.isDisposed).to.be(false);
        expect(widget.rendermime).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#initialize()', () => {

      it('should add the cells to the initial layout', () => {
        let widget = createWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.childCount()).to.be(6);
        expect(widget.methods.indexOf('initialize')).to.not.be(-1);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should be called when the metadata on the notebook changes', () => {
        let widget = createWidget();
        let called = false;
        widget.model.metadataChanged.connect(() => {
          expect(widget.methods.indexOf('onMetadataChanged')).to.not.be(-1);
          called = true;
        });
        let cursor = widget.model.getMetadata('foo');
        cursor.setValue(1);
        expect(called).to.be(true);
      });

      it('should update the cell widget mimetype based on language info', () => {
        let widget = createWidget();
        let called = false;
        widget.model.metadataChanged.connect(() => {
          expect(widget.methods.indexOf('onMetadataChanged')).to.not.be(-1);
          let child = widget.childAt(0);
          expect(child.mimetype).to.be('text/x-python');
          called = true;
        });
        let cursor = widget.model.getMetadata('language_info');
        cursor.setValue({ name: 'python', mimetype: 'text/x-python' });
        expect(called).to.be(true);
      });

    });

    describe('#onCellsChanged()', () => {

      let widget: LogNotebookRenderer;

      beforeEach(() => {
        widget = createWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should handle changes to the model cell list', () => {
        widget = createWidget();
        expect(widget.methods.indexOf('onCellsChanged')).to.be(-1);
        widget.model.cells.clear();
        expect(widget.methods.indexOf('onCellsChanged')).to.not.be(-1);
      });

      it('should handle a remove', () => {
        let cell = widget.model.cells.get(1);
        widget.model.cells.remove(cell);
        expect(widget.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(cell.isDisposed).to.be(true);
      });

      it('should handle an add', () => {
        let cell = widget.model.createCodeCell();
        widget.model.cells.add(cell);
        expect(widget.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(widget.childCount()).to.be(7);
      });

      it('should handle a move', () => {
        let child = widget.childAt(1);
        widget.model.cells.move(1, 2);
        expect(widget.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(widget.childAt(2)).to.be(child);
      });

      it('should handle a replace', () => {
        let cell = widget.model.createCodeCell();
        widget.model.cells.replace(0, 6, [cell]);
        expect(widget.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(widget.childCount()).to.be(1);
      });

      it('should post an update-request', (done) => {
        widget.model.cells.clear();
        widget.methods = [];
        requestAnimationFrame(() => {
          expect(widget.methods.indexOf('onUpdateRequest')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#initializeCellWidget()', () => {

      it('should add the `jp-Notebook-cell` class', () => {
        let widget = createWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods.indexOf('initializeCellWidget')).to.not.be(-1);
      });

    });

    describe('#updateMimetypes()', () => {

      it('should set the mime types of the code cells', () => {
        let widget = createWidget();
        let cursor = widget.model.getMetadata('language_info');
        cursor.setValue({ name: 'python', codemirror_mode: 'python' });
        expect(widget.methods.indexOf('updateMimetypes')).to.not.be(-1);
        let child = widget.childAt(0);
        expect(child.mimetype).to.be('text/x-python');
      });

    });

  });

  describe('ActiveNotebook', () => {

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
          expect(widget.methods.indexOf('onUpdateRequest')).to.not.be(-1);
          done();
        });
        widget.mode = 'edit';
      });

      it('should deselect all cells if switching to edit mode', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => {
          for (let i = 0; i < widget.childCount(); i++) {
            let cell = widget.childAt(i);
            widget.select(cell);
            expect(widget.isSelected(cell)).to.be(true);
          }
          widget.mode = 'edit';
          for (let i = 0; i < widget.childCount(); i++) {
            if (i === widget.activeCellIndex) {
              continue;
            }
            let cell = widget.childAt(i);
            expect(widget.isSelected(cell)).to.be(false);
          }
          widget.dispose();
          done();
        });

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
          expect(widget.methods.indexOf('onUpdateRequest')).to.not.be(-1);
          done();
        });
        widget.activeCellIndex = 1;
      });

    });

    describe('#select()', () => {

      let widget: LogActiveNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => { done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should select a cell widget', () => {
        let cell = widget.childAt(0);
        widget.select(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

      it('should allow multiple widgets to be selected', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          let cell = widget.childAt(i);
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
        }
      });

    });

    describe('#deselect()', () => {

      let widget: LogActiveNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => { done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should deselect a cell', () => {
        for (let i = 0; i < widget.childCount(); i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          let cell = widget.childAt(i);
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
          widget.deselect(cell);
          expect(widget.isSelected(cell)).to.be(false);
        }
      });

      it('should have no effect on the active cell', () => {
        let cell = widget.childAt(widget.activeCellIndex);
        expect(widget.isSelected(cell)).to.be(true);
        widget.deselect(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

    });

    describe('#isSelected()', () => {

      let widget: LogActiveNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => { done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should get whether the cell is selected', () => {

      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

      });

      context('dblclick', () => {

      });

    });

    describe('#onAfterAttach()', () => {

    });

    describe('#onBeforeDetach()', () => {

    });

    describe('#onUpdateRequest()', () => {

    });

    describe('#initializeCellWidget()', () => {

    });

    describe('#onEdgeRequest()', () => {

    });

  });

});
