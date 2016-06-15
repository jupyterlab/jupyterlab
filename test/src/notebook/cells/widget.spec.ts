// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror from 'codemirror';

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  Message
} from 'phosphor-messaging';

import {
  BaseCellWidget, CellModel, InputAreaWidget
} from '../../../../lib/notebook/cells';

import {
  CellEditorWidget
} from '../../../../lib/notebook/cells/editor';


const INPUT_CLASS = 'jp-InputArea';


class LogCell extends BaseCellWidget {

  methods: string[] = [];

  messages: string[] = [];

  processMessage(msg: Message): void {
    super.processMessage(msg);
    this.messages.push(msg.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }
}


describe('jupyter-js-notebook', () => {

  describe('BaseCellWidget', () => {

    describe('.createCellEditor()', () => {

      it('should create a cell editor widget', () => {
        let editor = BaseCellWidget.createCellEditor(new CellModel());
        expect(editor).to.be.a(CellEditorWidget);
      });

    });

    describe('.createInputArea()', () => {

      it('should create an input area widget', () => {
        let editor = BaseCellWidget.createCellEditor(new CellModel());
        let input = BaseCellWidget.createInputArea(editor);
        expect(input).to.be.a(InputAreaWidget);
      });

    });

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget).to.be.a(BaseCellWidget);
      });

    });

    describe('#model', () => {

      it('should be settable', () => {
        let model = new CellModel();
        let widget = new BaseCellWidget(model);
        expect(widget.model).to.be(model);
        widget.model = new CellModel();
        expect(widget.model).not.to.be(model);
      });

    });

    describe('#editor', () => {

      it('should be a cell editor widget', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget.editor).to.be.a(CellEditorWidget);
      });

      it('should be read-only', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(() => { widget.editor = null; }).to.throwError();
      });

    });

    describe('#mimetype', () => {

      it('should be a string', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(typeof widget.mimetype).to.be('string');
      });

      it('should default to text/plain', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget.mimetype).to.be('text/plain');
      });

      it('should supporting being set to other types', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.mimetype = 'test/test';
        expect(widget.mimetype).to.be('test/test');
      });

      it('should not allow being set to empty or null strings', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.mimetype = null;
        expect(widget.mimetype).to.be('text/plain');
        widget.mimetype = '';
        expect(widget.mimetype).to.be('text/plain');
      });

    });

    describe('#readOnly', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(typeof widget.readOnly).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget.readOnly).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.readOnly = true;
        expect(widget.readOnly).to.be(true);
      });

    });

    describe('#trusted', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(typeof widget.trusted).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(widget.trusted).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.trusted = true;
        expect(widget.trusted).to.be(true);
      });

    });

    describe('#focus()', () => {

      it('should focus the cell editor', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.attach(document.body);
        expect(widget.editor.editor.hasFocus()).to.be(false);
        widget.focus();
        expect(widget.editor.editor.hasFocus()).to.be(true);
        widget.dispose();
      });

    });

    describe('#setPrompt()', () => {

      it('should not throw an error (full test in input area)', () => {
        let widget = new BaseCellWidget(new CellModel());
        expect(() => { widget.setPrompt(void 0); }).to.not.throwError();
        expect(() => { widget.setPrompt(null); }).to.not.throwError();
        expect(() => { widget.setPrompt(''); }).to.not.throwError();
        expect(() => { widget.setPrompt('null'); }).to.not.throwError();
        expect(() => { widget.setPrompt('test'); }).to.not.throwError();
      });

    });

    describe('#toggleInput()', () => {

      it('should toggle whether the input is shown', () => {
        let widget = new BaseCellWidget(new CellModel());
        let input = widget.node.getElementsByClassName(INPUT_CLASS)[0];
        widget.attach(document.body);
        expect(window.getComputedStyle(input).display).to.not.be('none');
        widget.toggleInput(false);
        expect(window.getComputedStyle(input).display).to.be('none');
        widget.toggleInput(true);
        expect(window.getComputedStyle(input).display).to.not.be('none');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new BaseCellWidget(new CellModel());
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should update the widget', () => {
        let widget = new LogCell(new CellModel());
        expect(widget.methods).to.not.contain('onAfterAttach');
        widget.attach(document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

  });



});
