// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { DSVModel } from '@jupyterlab/csvviewer';

/* tslint:disable:no-var-requires */
const CSV_TEST_FILES = [
  [
    'comma_in_quotes',
    require('csv-spectrum/csvs/comma_in_quotes.csv').default,
    require('csv-spectrum/json/comma_in_quotes.json')
  ],

  [
    'empty',
    require('csv-spectrum/csvs/empty.csv').default,
    require('csv-spectrum/json/empty.json')
  ],

  [
    'empty_crlf',
    require('csv-spectrum/csvs/empty_crlf.csv').default,
    require('csv-spectrum/json/empty_crlf.json')
  ],

  [
    'escaped_quotes',
    require('csv-spectrum/csvs/escaped_quotes.csv').default,
    require('csv-spectrum/json/escaped_quotes.json')
  ],

  [
    'json',
    require('csv-spectrum/csvs/json.csv').default,
    require('csv-spectrum/json/json.json')
  ],

  [
    'newlines',
    require('csv-spectrum/csvs/newlines.csv').default,
    require('csv-spectrum/json/newlines.json')
  ],

  [
    'newlines_crlf',
    require('csv-spectrum/csvs/newlines_crlf.csv').default,
    require('csv-spectrum/json/newlines_crlf.json')
  ],

  [
    'quotes_and_newlines',
    require('csv-spectrum/csvs/quotes_and_newlines.csv').default,
    require('csv-spectrum/json/quotes_and_newlines.json')
  ],

  [
    'simple',
    require('csv-spectrum/csvs/simple.csv').default,
    require('csv-spectrum/json/simple.json')
  ],

  [
    'simple_crlf',
    require('csv-spectrum/csvs/simple_crlf.csv').default,
    require('csv-spectrum/json/simple_crlf.json')
  ],

  [
    'utf8',
    require('csv-spectrum/csvs/utf8.csv').default,
    require('csv-spectrum/json/utf8.json')
  ]
];
/* tslint:enable:no-var-requires */

describe('csvviewer/model', () => {
  describe('DSVModel', () => {
    describe('#constructor()', () => {
      it('should instantiate a `DSVModel`', () => {
        const d = new DSVModel({ data: 'a,b,c\nd,e,f\n', delimiter: ',' });
        expect(d.rowCount('column-header')).to.equal(1);
        expect(d.rowCount('body')).to.equal(1);
        expect(d.columnCount('row-header')).to.equal(1);
        expect(d.columnCount('body')).to.equal(3);
        expect(
          [0, 1, 2].map(i => d.data('column-header', 0, i))
        ).to.deep.equal(['a', 'b', 'c']);
        expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
          'd',
          'e',
          'f'
        ]);
      });
    });

    it('parses a number of test files correctly', () => {
      for (const [, csv, answer] of CSV_TEST_FILES) {
        const d = new DSVModel({ data: csv, delimiter: ',' });
        const labels = [];
        for (let i = 0; i < d.columnCount('body'); i++) {
          labels.push(d.data('column-header', 0, i));
        }
        const values = [];
        for (let r = 0; r < d.rowCount('body'); r++) {
          const row: { [key: string]: string } = {};
          for (let c = 0; c < d.columnCount('body'); c++) {
            row[labels[c]] = d.data('body', r, c);
          }
          values.push(row);
        }
        expect(values).to.deep.equal(answer);
      }
    });

    it('handles tab-separated data', () => {
      const d = new DSVModel({ data: 'a\tb\tc\nd\te\tf\n', delimiter: '\t' });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('handles not having a header', () => {
      const d = new DSVModel({
        data: 'a,b,c\nd,e,f\n',
        delimiter: ',',
        header: false
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(2);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        '1',
        '2',
        '3'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('handles having only a header', () => {
      const d = new DSVModel({ data: 'a,b,c\n', delimiter: ',', header: true });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(0);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
    });

    it('handles single non-header line', () => {
      const d = new DSVModel({
        data: 'a,b,c\n',
        delimiter: ',',
        header: false
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        '1',
        '2',
        '3'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
    });

    it('handles CRLF row delimiter', () => {
      const d = new DSVModel({
        data: 'a,b,c\r\nd,e,f\r\n',
        delimiter: ',',
        rowDelimiter: '\r\n'
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('handles CR row delimiter', () => {
      const d = new DSVModel({
        data: 'a,b,c\rd,e,f\r',
        delimiter: ',',
        rowDelimiter: '\r'
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('can guess the row delimiter', () => {
      const d = new DSVModel({ data: 'a,b,c\rd,e,f\r', delimiter: ',' });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('handles a given quote character', () => {
      const d = new DSVModel({
        data: `a,'b','c'\r'd',e,'f'\r`,
        delimiter: ',',
        quote: `'`
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd',
        'e',
        'f'
      ]);
    });

    it('handles delimiters and quotes inside quotes', () => {
      const d = new DSVModel({
        data: `'a\rx',b,'c''x'\r'd,x',e,'f'\r`,
        delimiter: ',',
        quote: `'`,
        rowDelimiter: '\r'
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a\rx',
        'b',
        `c'x`
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'd,x',
        'e',
        'f'
      ]);
    });

    it('handles rows that are too short or too long', () => {
      const d = new DSVModel({ data: `a,b,c\n,c,d,e,f\ng,h`, delimiter: ',' });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(2);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        '',
        'c',
        'd,e,f'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).to.deep.equal([
        'g',
        'h',
        ''
      ]);
    });

    it('handles delayed parsing of rows past the initial rows', async () => {
      const d = new DSVModel({
        data: `a,b,c\nc,d,e\nf,g,h\ni,j,k`,
        delimiter: ',',
        initialRows: 2
      });
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(1);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);

      // Expected behavior is that all unparsed data is lumped into the final field.
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'c',
        'd',
        'e\nf,g,h\ni,j,k'
      ]);

      // Check everything is in order after all the data has been parsed asynchronously.
      await d.ready;
      expect(d.rowCount('column-header')).to.equal(1);
      expect(d.rowCount('body')).to.equal(3);
      expect(d.columnCount('row-header')).to.equal(1);
      expect(d.columnCount('body')).to.equal(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).to.deep.equal([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).to.deep.equal([
        'c',
        'd',
        'e'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).to.deep.equal([
        'f',
        'g',
        'h'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 2, i))).to.deep.equal([
        'i',
        'j',
        'k'
      ]);
    });
  });
});
