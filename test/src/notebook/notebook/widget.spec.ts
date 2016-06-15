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
  simulate
} from 'simulate-event';

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
    super.onUpdateRequest(msg);
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
    super.onUpdateRequest(msg);
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
        let widget = new LogNotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods.indexOf('initialize')).to.be(-1);
        widget.model = model;
        expect(widget.childCount()).to.be(6);
        expect(widget.methods.indexOf('initialize')).to.not.be(-1);
      });

      it('should add a code cell if there are no cells', () => {
        let widget = new LogNotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        expect(widget.methods.indexOf('initialize')).to.be(-1);
        widget.model = model;
        expect(widget.childCount()).to.be(1);
        expect(widget.methods.indexOf('initialize')).to.not.be(-1);
        let cell = widget.childAt(0);
        expect(cell).to.be.a(CodeCellWidget);
      });

      it('should set the mime types of the cell widgets', () => {
        let widget = new LogNotebookRenderer(defaultRenderMime());
        let model = new NotebookModel();
        let cursor = model.getMetadata('language_info');
        cursor.setValue({ name: 'python', codemirror_mode: 'python' });
        widget.model = model;
        let child = widget.childAt(0);
        expect(child.mimetype).to.be('text/x-python');
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

      it('should select a cell widget', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = widget.childAt(0);
        widget.select(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

      it('should allow multiple widgets to be selected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < widget.childCount(); i++) {
          let cell = widget.childAt(i);
          widget.select(cell);
          expect(widget.isSelected(cell)).to.be(true);
        }
      });

    });

    describe('#deselect()', () => {

      it('should deselect a cell', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
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
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let cell = widget.childAt(widget.activeCellIndex);
        expect(widget.isSelected(cell)).to.be(true);
        widget.deselect(cell);
        expect(widget.isSelected(cell)).to.be(true);
      });

    });

    describe('#isSelected()', () => {

      it('should get whether the cell is selected', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        for (let i = 0; i < widget.childCount(); i++) {
          let cell = widget.childAt(i);
          if (i === widget.activeCellIndex) {
            expect(widget.isSelected(cell)).to.be(true);
          } else {
            expect(widget.isSelected(cell)).to.be(false);
          }
        }
      });

    });

    describe('#handleEvent()', () => {

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

      context('click', () => {

        it('should set the active cell index', () => {
          let child = widget.childAt(1);
          simulate(child.node, 'click');
          expect(widget.events.indexOf('click')).to.not.be(-1);
          expect(widget.activeCellIndex).to.be(1);
        });

        it('should be a no-op if the model is read only', () => {
          let child = widget.childAt(1);
          widget.model.readOnly = true;
          simulate(child.node, 'click');
          expect(widget.events.indexOf('click')).to.not.be(-1);
          expect(widget.activeCellIndex).to.be(0);
        });

        it('should be a no-op if not not a cell', () => {
          simulate(widget.node, 'click');
          expect(widget.events.indexOf('click')).to.not.be(-1);
          expect(widget.activeCellIndex).to.be(0);
        });

      });

      context('dblclick', () => {

        it('should unrender a markdown cell', () => {
          let cell = widget.model.createMarkdownCell();
          widget.model.cells.add(cell);
          let child = widget.childAt(widget.childCount() - 1) as MarkdownCellWidget;
          expect(child.rendered).to.be(true);
          simulate(child.node, 'dblclick');
          expect(child.rendered).to.be(false);
        });

        it('should be a no-op if the model is read only', () => {
          let cell = widget.model.createMarkdownCell();
          widget.model.cells.add(cell);
          widget.model.readOnly = true;
          let child = widget.childAt(widget.childCount() - 1) as MarkdownCellWidget;
          expect(child.rendered).to.be(true);
          simulate(child.node, 'dblclick');
          expect(child.rendered).to.be(true);
        });

      });

      context('focus', () => {

        it('should change to edit mode if a child cell takes focus', () => {
          let child = widget.childAt(0);
          simulate(child.editor.node, 'focus');
          expect(widget.events.indexOf('focus')).to.not.be(-1);
          expect(widget.mode).to.be('edit');
        });

        it('should change to command mode if the widget takes focus', () => {
          let child = widget.childAt(0);
          simulate(child.editor.node, 'focus');
          expect(widget.events.indexOf('focus')).to.not.be(-1);
          expect(widget.mode).to.be('edit');
          widget.events = [];
          simulate(widget.node, 'focus');
          expect(widget.events.indexOf('focus')).to.not.be(-1);
          expect(widget.mode).to.be('command');
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        let child = widget.childAt(0);
        requestAnimationFrame(() => {
          expect(widget.methods.indexOf('onAfterAttach')).to.not.be(-1);
          simulate(widget.node, 'click');
          expect(widget.events.indexOf('click')).to.not.be(-1);
          simulate(widget.node, 'dblclick');
          expect(widget.events.indexOf('dblclick')).to.not.be(-1);
          simulate(child.node, 'focus');
          expect(widget.events.indexOf('focus')).to.not.be(-1);
          widget.dispose();
          done();
        });
      });

      it('should post an update request', (done) => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => {
          expect(widget.methods.indexOf('onAfterAttach')).to.not.be(-1);
          requestAnimationFrame(() => {
            expect(widget.methods.indexOf('onUpdateRequest')).to.not.be(-1);
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
        widget.attach(document.body);
        let child = widget.childAt(0);
        requestAnimationFrame(() => {
          widget.detach();
          expect(widget.methods.indexOf('onBeforeDetach')).to.not.be(-1);
          widget.events = [];
          simulate(widget.node, 'click');
          expect(widget.events.indexOf('click')).to.be(-1);
          simulate(widget.node, 'dblclick');
          expect(widget.events.indexOf('dblclick')).to.be(-1);
          simulate(child.node, 'focus');
          expect(widget.events.indexOf('focus')).to.be(-1);
          widget.dispose();
          done();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      let widget: LogActiveNotebook;

      beforeEach((done) => {
        widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.attach(document.body);
        requestAnimationFrame(() => {  done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should apply the command class if in command mode', () => {
        expect(widget.methods.indexOf('onUpdateRequest')).to.not.be(-1);
        expect(widget.hasClass('jp-mod-commandMode')).to.be(true);
      });

      it('should focus the widget if in command mode', () => {
        expect(widget.node).to.be(document.activeElement);
      });

      it('should apply the edit class if in edit mode', (done) => {
        widget.mode = 'edit';
        requestAnimationFrame(() => {
          expect(widget.hasClass('jp-mod-editMode')).to.be(true);
          done();
        });
      });

      it('should focus the cell if in edit mode', (done) => {
        widget.mode = 'edit';
        let cell = widget.childAt(widget.activeCellIndex);
        requestAnimationFrame(() => {
          expect(cell.node.contains(document.activeElement)).to.be(true);
          done();
        });
      });

      it('should unrender a markdown cell in edit mode', (done) => {
        let cell = widget.model.createMarkdownCell();
        widget.model.cells.add(cell);
        let child = widget.childAt(widget.childCount() - 1) as MarkdownCellWidget;
        expect(child.rendered).to.be(true);
        widget.activeCellIndex = widget.childCount() - 1;
        widget.mode = 'edit';
        requestAnimationFrame(() => {
          expect(child.rendered).to.be(false);
          done();
        });
      });

      it('should add the active class to the active widget', () => {
        let cell = widget.childAt(widget.activeCellIndex);
        expect(cell.hasClass('jp-mod-active')).to.be(true);
      });

      it('should set the selected class on the selected widgets', (done) => {
        widget.select(widget.childAt(1));
        requestAnimationFrame(() => {
          for (let i = 0; i < 2; i++) {
            let cell = widget.childAt(i);
            expect(cell.hasClass('jp-mod-selected')).to.be(true);
            done();
          }
        });
      });

      it('should add the multi select class if there is more than one widget', (done) => {
        widget.select(widget.childAt(1));
        expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
        requestAnimationFrame(() => {
          expect(widget.hasClass('jp-mod-multSelected')).to.be(false);
          done();
        });
      });

    });

    describe('#initializeCellWidget()', () => {

      it('should add the `jp-Notebook-cell` class', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        expect(widget.methods.indexOf('initializeCellWidget')).to.not.be(-1);
      });

      it("should connect edge requested signals from the widget's editor", () => {
        let widget = createActiveWidget();
        let child = widget.childAt(widget.activeCellIndex);
        child.editor.edgeRequested.emit('top');
        expect(widget.methods.indexOf('onEdgeRequest')).to.not.be(-1);
      });

    });

    describe('#onEdgeRequest()', () => {

      it('should activate the previous cell if top is requested', () => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        let child = widget.childAt(widget.activeCellIndex);
        child.editor.edgeRequested.emit('top');
        expect(widget.methods.indexOf('onEdgeRequest')).to.not.be(-1);
        expect(widget.activeCellIndex).to.be(0);
      });

      it('should activate the next cell if bottom is requested', ()  => {
        let widget = createActiveWidget();
        widget.model.fromJSON(DEFAULT_CONTENT);
        let child = widget.childAt(widget.activeCellIndex);
        child.editor.edgeRequested.emit('bottom');
        expect(widget.methods.indexOf('onEdgeRequest')).to.not.be(-1);
        expect(widget.activeCellIndex).to.be(1);
      });

    });

  });

});
