// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  INotebookSession
} from 'jupyter-js-services';

import {
  ObservableList, IListChangedArgs
} from 'phosphor-observablelist';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  EditorModel, IEditorModel
} from '../../../lib/editor/model';

import {
  InputAreaModel
} from '../../../lib/input-area/model';

import {
  OutputAreaModel
} from '../../../lib/output-area/model';

import {
  BaseCellModel, CodeCellModel, MarkdownCellModel, MetadataCursor,
  RawCellModel, ICellModel
} from '../../../lib/cells/model';

import {
  NotebookModel
} from '../../../lib/notebook/model';

import {
  MockSession
} from './mock';



/**
 * A notebook model which tests protected methods.
 */
class MyNotebookModel extends NotebookModel {
  methods: string[] = [];

  protected onEditorChanged(editor: IEditorModel, args: IChangedArgs<any>): void {
    super.onEditorChanged(editor, args);
    this.methods.push('onEditorChanged');
  }

  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    super.onCellsChanged(list, change);
    this.methods.push('onCellsChanged');
  }
}


describe('jupyter-js-notebook', () => {

  describe('NotebookModel', () => {

    describe('#constructor()', () => {

      it('should create an notebook model', () => {
        let model = new NotebookModel();
        expect(model instanceof NotebookModel).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('readOnly');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.be(true);
      });

    });

    describe('#metadataChanged', () => {

      it ('should be emitted when metadata changes', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadataChanged.connect((cell, name) => {
          expect(name).to.be('foo');
          called = true;
        });
        let foo = model.getMetadata('foo');
        foo.setValue(1);
        expect(called).to.be(true);
      });

    });

    describe('#cells', () => {

      it('should be an observable list', () => {
        let model = new NotebookModel();
        expect(model.cells instanceof ObservableList).to.be(true);
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.cells = null; }).to.throwError();
      });

    });

    describe('#defaultMimetype', () => {

      it('should default to `text/x-ipython`', () => {
        let model = new NotebookModel();
        expect(model.defaultMimetype).to.be('text/x-ipython');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('defaultMimetype');
          expect(change.oldValue).to.be('text/x-ipython');
          expect(change.newValue).to.be('text/python');
          called = true;
        });
        model.defaultMimetype = 'text/python';
        expect(called).to.be(true);
      });

    });

    describe('#readOnly', () => {

      it('should default to false', () => {
        let model = new NotebookModel();
        expect(model.readOnly).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('readOnly');
          expect(change.oldValue).to.be(false);;
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.be(true);
      });

    });

    describe('#session', () => {

      it('should default to null', () => {
        let model = new NotebookModel();
        expect(model.session).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        let session = new MockSession('test.ipynb');
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('session');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be(session);
          called = true;
        });
        model.session = session;
        expect(called).to.be(true);
      });

    });

    describe('#kernelspec', () => {

      it('should default to an unknown kernel', () => {
        let model = new NotebookModel();
        expect(model.kernelspec.name).to.be('unknown');
        expect(model.kernelspec.display_name).to.be('No Kernel!');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('kernelspec');
          expect(change.oldValue.name).to.be('unknown');;
          expect(change.newValue.name).to.be('python');
          called = true;
        });
        model.kernelspec = { name: 'python', display_name: 'Python' };
        expect(called).to.be(true);
      });

    });

    describe('#languageInfo', () => {

      it('should default to an unknown language', () => {
        let model = new NotebookModel();
        expect(model.languageInfo.name).to.be('unknown');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('languageInfo');
          expect(change.oldValue.name).to.be('unknown');;
          expect(change.newValue.name).to.be('python');
          called = true;
        });
        model.languageInfo = { name: 'python' };
        expect(called).to.be(true);
      });

    });

    describe('#origNbformat', () => {

      it('should default to null', () => {
        let model = new NotebookModel();
        expect(model.origNbformat).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('origNbformat');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be(4);
          called = true;
        });
        model.origNbformat = 4;
        expect(called).to.be(true);
      });

    });

    describe('#activeCellIndex', () => {

      it('should default to null', () => {
        let model = new NotebookModel();
        expect(model.activeCellIndex).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('activeCellIndex');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be(0);
          called = true;
        });
        model.cells.add(model.createMarkdownCell());
        model.activeCellIndex = 0;
        expect(called).to.be(true);
      });

      it('should be clamped to the length of the cells list', () => {
        let model = new NotebookModel();
        model.cells.add(model.createMarkdownCell());
        model.cells.add(model.createMarkdownCell());
        model.activeCellIndex = -1;
        expect(model.activeCellIndex).to.be(0);
        model.activeCellIndex = 2;
        expect(model.activeCellIndex).to.be(1);
      });

    });

    describe('#mode', () => {

      it('should default to command', () => {
        let model = new NotebookModel();
        expect(model.mode).to.be('command');
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('mode');
          expect(change.oldValue).to.be('command');
          expect(change.newValue).to.be('edit');
          called = true;
        });
        model.mode = 'edit';
        expect(called).to.be(true);
      });

      it('should set the rendered status of active markdown cells', () => {
        let model = new NotebookModel();
        let cell0 = model.createMarkdownCell();
        let cell1 = model.createMarkdownCell();
        model.cells.add(cell0);
        model.cells.add(cell1)
        model.activeCellIndex = 0;
        expect(cell0.rendered).to.be(true);
        model.mode = 'edit';
        expect(cell0.rendered).to.be(false);
        expect(cell1.rendered).to.be(true);
      });

    });

    describe('#dirty', () => {

      it('should default to false', () => {
        let model = new NotebookModel();
        expect(model.dirty).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect((nb, change) => {
          expect(change.name).to.be('dirty');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.dirty = true;
        expect(called).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the model is disposed', () => {
        let model = new NotebookModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resource held by the model', () => {
        let model = new NotebookModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dispose();
        model.dirty = true;
        expect(called).to.be(false);
        expect(model.cells).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let model = new NotebookModel();
        model.dispose();
        model.dispose();
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when metadata changes', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadataChanged.connect((cell, name) => {
          expect(name).to.be('foo');
          called = true;
        });
        let foo = model.getMetadata('foo');
        foo.setValue(1);
        expect(called).to.be(true);
      });

      it('should throw an error on blacklisted names', () => {
        let model = new NotebookModel();
        let invalid = ['kernelspec', 'languageInfo', 'origNbformat'];
        for (let key of invalid) {
          expect(() => { model.getMetadata(key); }).to.throwError();
        }
      });

    });

    describe('#select()', () => {

      it('should select a cell', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        model.cells.add(cell);
        model.cells.add(model.createCodeCell())
        expect(model.isSelected(cell)).to.be(false);
        model.select(cell);
        expect(model.isSelected(cell)).to.be(true);
      });

    });

    describe('#deselect()', () => {

      it('should deselect a cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        model.cells.add(model.createCodeCell());
        model.select(cell);
        expect(model.isSelected(cell)).to.be(true);
        model.deselect(cell);
        expect(model.isSelected(cell)).to.be(false);
      });

      it('should have no effect on the active cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        model.deselect(cell);
        expect(model.isSelected(cell)).to.be(true);
      });

    });

    describe('#isSelected()', () => {

      it('should indicate whether a cell is selected', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        expect(model.isSelected(cell)).to.be(true);
        model.cells.add(model.createMarkdownCell());
        expect(model.isSelected(cell)).to.be(false);
      });

    });

    describe('#createCodeCell()', () => {

      it('should create a new code cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        expect(cell instanceof CodeCellModel).to.be(true);
      });

      it('should clone a code cell model', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        cell.collapsed = true;
        cell.scrolled = true;
        cell.output.outputs.add({
          output_type: 'error',
          ename: 'foo',
          evalue: '',
          traceback: ['']
        });
        let newCell = model.createCodeCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
        expect(newCell.collapsed).to.be(true);
        expect(newCell.scrolled).to.be(true);
        expect(newCell.output.outputs.length).to.be(1);
      });

      it('should clone from a markdown cell model', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        let newCell = model.createCodeCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
      });

    });

    describe('#createCodeCell()', () => {

      it('should create a new markdown cell', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        expect(cell instanceof MarkdownCellModel).to.be(true);
      });

      it('should clone a markdown cell model', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        cell.rendered = false;
        let newCell = model.createMarkdownCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
        expect(newCell.rendered).to.be(false);
      });

      it('should clone from a code cell model', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        let newCell = model.createMarkdownCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
      });

    });

    describe('#createRawCell()', () => {

      it('should create a new raw cell', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        expect(cell instanceof RawCellModel).to.be(true);
      });

      it('should clone a raw cell model', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        cell.format = 'foo';
        let newCell = model.createRawCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
        expect(newCell.format).to.be('foo');
      });

      it('should clone from a code cell model', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.trusted = true;
        cell.input.textEditor.text = 'foo';
        cell.tags = ['foo', 'bar'];
        let newCell = model.createRawCell(cell);
        expect(newCell.trusted).to.be(true);
        expect(newCell.input.textEditor.text).to.be('foo');
        expect(newCell.tags).to.eql(['foo', 'bar']);
      });

    });

    describe('#runActiveCell()', () => {

      it('should mark the active cell as trusted ', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        cell.trusted = false;
        model.cells.add(cell);
        model.activeCellIndex = 0;
        model.runActiveCell();
        expect(cell.trusted).to.be(true);
      });

      it('should have no effect on a readonly notebook', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.trusted = false;
        model.cells.add(cell);
        model.activeCellIndex = 0;
        model.readOnly = true;
        model.runActiveCell();
        expect(cell.trusted).to.be(false);
      });

      it('should have no effect if there is no active cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.trusted = false;
        model.runActiveCell();
        expect(cell.trusted).to.be(false);
      });

      it('should render a markdown cell', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        cell.rendered = false;
        model.cells.add(cell);
        model.runActiveCell();
        expect(cell.rendered).to.be(true);
      });

      it('should clear the prompt on a code cell if there is no session', () => {
        let model = new MyNotebookModel();
        let cell = model.createCodeCell();
        cell.input.textEditor.text = 'a = 1';
        cell.input.prompt = '';
        model.cells.add(cell);
        model.runActiveCell();
        expect(cell.input.prompt).to.be(' ');
      });

    });

    describe('#onEditorChanged()', () => {

      it('should set the dirty flag when a text editor text changes', () => {
        let model = new MyNotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        model.dirty = false;
        cell.input.textEditor.text = 'foo';
        expect(model.dirty).to.be(true);
        expect(model.methods.indexOf('onEditorChanged')).to.not.be(-1);
      });

    });

    describe('#onCellsChanged()', () => {

      it('should set the dirty flag', () => {
        let model = new MyNotebookModel();
        let cell = model.createCodeCell();
        expect(model.dirty).to.be(false);
        model.cells.add(cell);
        expect(model.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(model.dirty).to.be(true);
      });

      it('should set the activeCellIndex on an add', () => {
        let model = new MyNotebookModel();
        let cell = model.createCodeCell();
        expect(model.activeCellIndex).to.be(null);
        model.cells.add(cell);
        expect(model.activeCellIndex).to.be(0);
        expect(model.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(model.dirty).to.be(true);
      });

      it('should adjust the activeCellIndex on a remove', () => {
        let model = new MyNotebookModel();
        model.cells.add(model.createCodeCell());
        let cell = model.createCodeCell();
        model.cells.add(cell);
        expect(model.activeCellIndex).to.be(1);
        model.dirty = false;
        model.cells.remove(cell);
        expect(model.activeCellIndex).to.be(0);
        expect(model.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(model.dirty).to.be(true);
        expect(cell.isDisposed).to.be(true);
      });

      it('should dispose of all old cells on a replace', () => {
        let model = new MyNotebookModel();
        let cells: ICellModel[] = [];
        for (let i = 0; i < 5; i++) {
          let cell = model.createMarkdownCell()
          cells.push(cell);
          model.cells.add(cell);
        }
        model.dirty = false;
        model.cells.clear();
        expect(model.methods.indexOf('onCellsChanged')).to.not.be(-1);
        expect(model.dirty).to.be(true);
        for (let i = 0; i < 5; i++) {
          let cell = cells[i];
          expect(cell.isDisposed).to.be(true);
        }
      });

    });

  });

});
