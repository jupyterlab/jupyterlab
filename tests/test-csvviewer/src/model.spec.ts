// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  DSVModel
} from '@jupyterlab/csvviewer';


/* tslint:disable:no-var-requires */
const CSV_TEST_FILES = [
  ['comma_in_quotes',
   require('csv-spectrum/csvs/comma_in_quotes.csv'),
   require('csv-spectrum/json/comma_in_quotes.json')],

  ['empty',
   require('csv-spectrum/csvs/empty.csv'),
   require('csv-spectrum/json/empty.json')],

  ['empty_crlf',
   require('csv-spectrum/csvs/empty_crlf.csv'),
   require('csv-spectrum/json/empty_crlf.json')],

  ['escaped_quotes',
   require('csv-spectrum/csvs/escaped_quotes.csv'),
   require('csv-spectrum/json/escaped_quotes.json')],

  ['json',
   require('csv-spectrum/csvs/json.csv'),
   require('csv-spectrum/json/json.json')],

  ['newlines',
   require('csv-spectrum/csvs/newlines.csv'),
   require('csv-spectrum/json/newlines.json')],

  ['newlines_crlf',
   require('csv-spectrum/csvs/newlines_crlf.csv'),
   require('csv-spectrum/json/newlines_crlf.json')],

  ['quotes_and_newlines',
   require('csv-spectrum/csvs/quotes_and_newlines.csv'),
   require('csv-spectrum/json/quotes_and_newlines.json')],

  ['simple',
   require('csv-spectrum/csvs/simple.csv'),
   require('csv-spectrum/json/simple.json')],

  ['simple_crlf',
   require('csv-spectrum/csvs/simple_crlf.csv'),
   require('csv-spectrum/json/simple_crlf.json')],

  ['utf8',
   require('csv-spectrum/csvs/utf8.csv'),
   require('csv-spectrum/json/utf8.json')]
];
/* tslint:enable:no-var-requires */


describe('csvviewer/model', () => {

  describe('DSVModel', () => {

    describe('#constructor()', () => {

      it('should instantiate a `DSVModel`', () => {
        let d = new DSVModel({data: 'a,b,c\nd,e,f\n', delimiter: ','});
        expect(d.rowCount('column-header')).to.be(1);
        expect(d.rowCount('body')).to.be(1);
        expect(d.columnCount('row-header')).to.be(1);
        expect(d.columnCount('body')).to.be(3);
        expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
        expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
      });

    });

    it('parses a number of test files correctly', () => {
      for (let [ , csv, answer] of CSV_TEST_FILES) {
        let d = new DSVModel({data: csv, delimiter: ','});
        let labels = [];
        for (let i = 0; i < d.columnCount('body'); i++) {
          labels.push(d.data('column-header', 0, i));
        }
        let values = [];
        for (let r = 0; r < d.rowCount('body'); r++) {
          let row: {[key: string]: string} = {};
          for (let c = 0; c < d.columnCount('body'); c++) {
            row[labels[c]] = d.data('body', r, c);
          }
          values.push(row);
        }
        expect(values).to.eql(answer);
      }
    });

    it('handles tab-separated data', () => {
      let d = new DSVModel({data: 'a\tb\tc\nd\te\tf\n', delimiter: '\t'});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);

    });

    it('handles not having a header', () => {
      let d = new DSVModel({data: 'a,b,c\nd,e,f\n', delimiter: ',', header: false});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(2);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['1', '2', '3']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).to.eql(['d', 'e', 'f']);
    });

    it('handles CRLF row delimiter', () => {
      let d = new DSVModel({data: 'a,b,c\r\nd,e,f\r\n', delimiter: ',', rowDelimiter: '\r\n'});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
    });

    it('handles CR row delimiter', () => {
      let d = new DSVModel({data: 'a,b,c\rd,e,f\r', delimiter: ',', rowDelimiter: '\r'});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
    });

    it('can guess the row delimiter', () => {
      let d = new DSVModel({data: 'a,b,c\rd,e,f\r', delimiter: ','});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
    });

    it('handles a given quote character', () => {
      let d = new DSVModel({data: `a,'b','c'\r'd',e,'f'\r`, delimiter: ',', quote: `'`});
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
    });

    it('handles a given quote character', () => {
      let d = new DSVModel({
        data: `'a\rx',b,'c'\r'd',e,'f'\r`,
        delimiter: ',',
        quote: `'`,
        rowDelimiter: '\r',
      });
      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(1);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a\rx', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['d', 'e', 'f']);
    });

    it('handles rows that are too short or too long', () => {
      let data = `a,b,c\n,c,d,e,f\ng,h`;
      let d = new DSVModel({
        data,
        delimiter: ',',
        quoteParser: false
      });

      expect(d.rowCount('column-header')).to.be(1);
      expect(d.rowCount('body')).to.be(2);
      expect(d.columnCount('row-header')).to.be(1);
      expect(d.columnCount('body')).to.be(3);
      // expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.eql(['a', 'b', 'c']);
      // expect([0, 1, 2].map(i => d.data('body', 0, i))).to.eql(['', 'c', 'd,e,f']);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).to.eql(['g', 'h', '']);
    });

  });

});
