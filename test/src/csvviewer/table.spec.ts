// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  VirtualDOM, VirtualElement, VirtualNode
} from '@phosphor/virtualdom';

import {
  CSVModel, CSVTable, DISPLAY_LIMIT
} from '@jupyterlab/csvwidget';

import {
  CSV_DATA
} from './data.csv';


class TestTable extends CSVTable {
  render(): VirtualNode | VirtualNode[] {
    return super.render();
  }
}


describe('csvwidget/table', () => {

  describe('CSVModel', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVModel`', () => {
        let model = new CSVModel();
        expect(model).to.be.a(CSVModel);
        model.dispose();
      });

      it('should accept content and delimiter values', () => {
        let content = 'foo';
        let delimiter = '\t';
        let model = new CSVModel({ content, delimiter });
        expect(model).to.be.a(CSVModel);
        expect(model.content).to.be(content);
        expect(model.delimiter).to.be(delimiter);
        model.dispose();
      });

    });

    describe('#maxExceeded', () => {

      it('should emit the overflow', () => {
        let model = new CSVModel({ content: CSV_DATA });
        let excess: CSVModel.IOverflow;
        model.maxExceeded.connect((sender, overflow) => { excess = overflow; });
        expect(excess).to.not.be.ok();
        model.parse();
        expect(excess).to.be.ok();
        expect(excess.available).to.be(1002);
        expect(excess.maximum).to.be(DISPLAY_LIMIT);
        model.dispose();
      });

    });

    describe('#content', () => {

      it('should default to empty', () => {
        let model = new CSVModel();
        expect(model.content).to.be.empty();
        model.dispose();
      });

      it('should be settable', () => {
        let model = new CSVModel({ content: CSV_DATA });
        expect(model.content).to.be(CSV_DATA);
        model.content = 'foo';
        expect(model.content).to.be('foo');
        model.dispose();
      });

    });

    describe('#delimiter', () => {

      it('should default to `,`', () => {
        let model = new CSVModel();
        expect(model.delimiter).to.be(',');
        model.dispose();
      });

      it('should be settable', () => {
        let model = new CSVModel();
        expect(model.delimiter).to.be(',');
        model.delimiter = ';';
        expect(model.delimiter).to.be(';');
        model.dispose();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new CSVModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let model = new CSVModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#parse()', () => {

      it('should parse the model content', () => {
        let model = new CSVModel({ content: CSV_DATA });
        let rows = model.parse();
        let cols = rows.columns;
        expect(rows.length).to.be(DISPLAY_LIMIT);
        expect(cols.length).to.be(4);
        model.dispose();
      });

    });

  });

  describe('CSVTable', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVTable`', () => {
        let table = new CSVTable();
        expect(table).to.be.a(CSVTable);
        table.dispose();
      });

    });

    describe('#render()', () => {

      it('should render the model into a virtual DOM table', () => {
        let model = new CSVModel({ content: CSV_DATA });
        let table = new TestTable();
        table.model = model;

        let rendered = VirtualDOM.realize(table.render() as VirtualElement);
        let rows = rendered.getElementsByTagName('tr');
        let cols = rendered.getElementsByTagName('th');
        expect(rows).to.have.length(DISPLAY_LIMIT);
        expect(cols).to.have.length(4);

        model.dispose();
        table.dispose();
      });

    });

  });

});
