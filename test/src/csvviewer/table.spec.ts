// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CSVModel
} from '@jupyterlab/csvviewer';

import {
  CSV_DATA
} from './data.csv';


describe('csvviewer/table', () => {

  describe('CSVModel', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVModel`', () => {
        let model = new CSVModel();
        expect(model).to.be.a(CSVModel);
      });

      it('should accept content and delimiter values', () => {
        let content = 'foo';
        let delimiter = '\t';
        let model = new CSVModel({ content, delimiter });
        expect(model).to.be.a(CSVModel);
        expect(model.content).to.be(content);
        expect(model.delimiter).to.be(delimiter);
      });

    });

    describe('#content', () => {

      it('should default to empty', () => {
        let model = new CSVModel();
        expect(model.content).to.be.empty();
      });

      it('should be settable', () => {
        let model = new CSVModel({ content: CSV_DATA });
        expect(model.content).to.be(CSV_DATA);
        model.content = 'foo';
        expect(model.content).to.be('foo');
      });

    });

    describe('#delimiter', () => {

      it('should default to `,`', () => {
        let model = new CSVModel();
        expect(model.delimiter).to.be(',');
      });

      it('should be settable', () => {
        let model = new CSVModel();
        expect(model.delimiter).to.be(',');
        model.delimiter = ';';
        expect(model.delimiter).to.be(';');
      });

    });

    describe('#rowCount()', () => {

      it('should be the number of rows in the region', () => {
        let model = new CSVModel({ content: CSV_DATA });
        expect(model.rowCount('column-header')).to.be(1);
        expect(model.rowCount('body')).to.be(1002);
      });

    });

    describe('#columnCount()', () => {

      it('should be the number of columns in the region', () => {
        let model = new CSVModel({ content: CSV_DATA });
        expect(model.columnCount('row-header')).to.be(1);
        expect(model.columnCount('body')).to.be(4);
      });

    });

    describe('#data()', () => {

      it('should get the data for the region', () => {
        let model = new CSVModel({ content: CSV_DATA });
        expect(model.data('row-header', 1, 1)).to.be('2');
        expect(model.data('column-header', 1, 1)).to.be('name');
        expect(model.data('corner-header', 1, 1)).to.be('');
        expect(model.data('body', 2, 2)).to.be('49.71.100.63');
      });

    });

  });

});
