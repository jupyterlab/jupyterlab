// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const fs = require('fs');

import { DSVModel } from '../src';

function readCSV(path: string): any {
  path = require.resolve(path);
  return fs.readFileSync(path, 'utf8');
}

/* tslint:disable:no-var-requires */
const CSV_TEST_FILES = [
  [
    'comma_in_quotes',
    readCSV('csv-spectrum/csvs/comma_in_quotes.csv'),
    require('csv-spectrum/json/comma_in_quotes.json')
  ],

  [
    'empty_values',
    readCSV('csv-spectrum/csvs/empty.csv'),
    require('csv-spectrum/json/empty.json')
  ],

  [
    'empty_crlf',
    readCSV('csv-spectrum/csvs/empty_crlf.csv'),
    require('csv-spectrum/json/empty_crlf.json')
  ],

  ['empty_file', '', []],

  [
    'escaped_quotes',
    readCSV('csv-spectrum/csvs/escaped_quotes.csv'),
    require('csv-spectrum/json/escaped_quotes.json')
  ],

  [
    'json',
    readCSV('csv-spectrum/csvs/json.csv'),
    require('csv-spectrum/json/json.json')
  ],

  [
    'newlines',
    readCSV('csv-spectrum/csvs/newlines.csv'),
    require('csv-spectrum/json/newlines.json')
  ],

  [
    'newlines_crlf',
    readCSV('csv-spectrum/csvs/newlines_crlf.csv'),
    require('csv-spectrum/json/newlines_crlf.json')
  ],

  [
    'quotes_and_newlines',
    readCSV('csv-spectrum/csvs/quotes_and_newlines.csv'),
    require('csv-spectrum/json/quotes_and_newlines.json')
  ],

  [
    'simple',
    readCSV('csv-spectrum/csvs/simple.csv'),
    require('csv-spectrum/json/simple.json')
  ],

  [
    'simple_crlf',
    readCSV('csv-spectrum/csvs/simple_crlf.csv'),
    require('csv-spectrum/json/simple_crlf.json')
  ],

  [
    'utf8',
    readCSV('csv-spectrum/csvs/utf8.csv'),
    require('csv-spectrum/json/utf8.json')
  ]
];
/* tslint:enable:no-var-requires */

describe('csvviewer/model', () => {
  describe('DSVModel', () => {
    it('uses the widest row as the column count', () => {
      const d = new DSVModel({
        data: 'a,b\n1,2,3\n4,5,6,7',
        delimiter: ',',
        rowDelimiter: '\n'
      });

      expect(d.columnCount('body')).toBe(4);
      expect([0, 1, 2, 3].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        '',
        ''
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 0, i))).toEqual([
        '1',
        '2',
        '3',
        ''
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 1, i))).toEqual([
        '4',
        '5',
        '6',
        '7'
      ]);
    });

    it('does not count delimiters inside quoted fields when detecting columns', () => {
      const d = new DSVModel({
        data: 'city,population\n"New York, USA",8000000,extra',
        delimiter: ',',
        rowDelimiter: '\n'
      });

      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'city',
        'population',
        ''
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual([
        'New York, USA',
        '8000000',
        'extra'
      ]);
    });

    it('updates the column count when the widest row is parsed asynchronously', async () => {
      const d = new DSVModel({
        data: 'a,b\n1,2\n3,4\n5,6,7,8',
        delimiter: ',',
        rowDelimiter: '\n',
        initialRows: 2
      });

      expect(d.columnCount('body')).toBe(2);

      await d.ready;

      expect(d.columnCount('body')).toBe(4);
      expect([0, 1, 2, 3].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        '',
        ''
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 2, i))).toEqual([
        '5',
        '6',
        '7',
        '8'
      ]);
    });

    describe('#constructor()', () => {
      it('should instantiate a `DSVModel`', () => {
        const d = new DSVModel({ data: 'a,b,c\nd,e,f\n', delimiter: ',' });
        expect(d.rowCount('column-header')).toBe(1);
        expect(d.rowCount('body')).toBe(1);
        expect(d.columnCount('row-header')).toBe(1);
        expect(d.columnCount('body')).toBe(3);
        expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
          'a',
          'b',
          'c'
        ]);
        expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual([
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
        expect(values).toEqual(answer);
      }
    });

    it('handles tab-separated data', () => {
      const d = new DSVModel({ data: 'a\tb\tc\nd\te\tf\n', delimiter: '\t' });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['d', 'e', 'f']);
    });

    it('handles not having a header', () => {
      const d = new DSVModel({
        data: 'a,b,c\nd,e,f\n',
        delimiter: ',',
        header: false
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(2);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        '1',
        '2',
        '3'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['a', 'b', 'c']);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).toEqual(['d', 'e', 'f']);
    });

    it('handles having only a header', () => {
      const d = new DSVModel({ data: 'a,b,c\n', delimiter: ',', header: true });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(0);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
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
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        '1',
        '2',
        '3'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['a', 'b', 'c']);
    });

    it('handles CRLF row delimiter', () => {
      const d = new DSVModel({
        data: 'a,b,c\r\nd,e,f\r\n',
        delimiter: ',',
        rowDelimiter: '\r\n'
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['d', 'e', 'f']);
    });

    it('handles CR row delimiter', () => {
      const d = new DSVModel({
        data: 'a,b,c\rd,e,f\r',
        delimiter: ',',
        rowDelimiter: '\r'
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['d', 'e', 'f']);
    });

    it('can guess the row delimiter', () => {
      const d = new DSVModel({ data: 'a,b,c\rd,e,f\r', delimiter: ',' });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['d', 'e', 'f']);
    });

    it('handles a given quote character', () => {
      const d = new DSVModel({
        data: `a,'b','c'\r'd',e,'f'\r`,
        delimiter: ',',
        quote: `'`
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['d', 'e', 'f']);
    });

    it('handles delimiters and quotes inside quotes', () => {
      const d = new DSVModel({
        data: `'a\rx',b,'c''x'\r'd,x',e,'f'\r`,
        delimiter: ',',
        quote: `'`,
        rowDelimiter: '\r'
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a\rx',
        'b',
        `c'x`
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual([
        'd,x',
        'e',
        'f'
      ]);
    });

    it('handles rows that are too short or too long', () => {
      const d = new DSVModel({ data: `a,b,c\n,c,d,e,f\ng,h`, delimiter: ',' });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(2);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(5);
      expect([0, 1, 2, 3, 4].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c',
        '',
        ''
      ]);
      expect([0, 1, 2, 3, 4].map(i => d.data('body', 0, i))).toEqual([
        '',
        'c',
        'd',
        'e',
        'f'
      ]);
      expect([0, 1, 2, 3, 4].map(i => d.data('body', 1, i))).toEqual([
        'g',
        'h',
        '',
        '',
        ''
      ]);
    });

    it('ignores leading comment rows when determining headers and columns', () => {
      const d = new DSVModel({
        data: `# metadata\n# units,date,lon,lat,value\ndate,lon,lat,value\n2020-01-01,-97.0,40,5.00\n`,
        delimiter: ',',
        comment: '#'
      });
      expect(d.rowCount('body')).toBe(3);
      expect(d.columnCount('body')).toBe(4);
      expect([0, 1, 2, 3].map(i => d.data('column-header', 0, i))).toEqual([
        'date',
        'lon',
        'lat',
        'value'
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 0, i))).toEqual([
        '# metadata',
        '',
        '',
        ''
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 1, i))).toEqual([
        '# units,date,lon,lat,value',
        '',
        '',
        ''
      ]);
      expect([0, 1, 2, 3].map(i => d.data('body', 2, i))).toEqual([
        '2020-01-01',
        '-97.0',
        '40',
        '5.00'
      ]);
    });

    it.each([false, true])(
      'detects wider data rows with comments and quoteParser=%s',
      async quoteParser => {
        for (const initialRows of [3, 500]) {
          for (const trailingNewline of ['', '\n']) {
            const d = new DSVModel({
              data:
                '# metadata,extra,columns,ignored\na,b\n1,2\n3,4,5\n# trailing,extra,columns,ignored' +
                trailingNewline,
              delimiter: ',',
              comment: '#',
              quoteParser,
              initialRows
            });
            expect(d.columnCount('body')).toBe(initialRows === 3 ? 2 : 3);
            await d.ready;
            expect(d.columnCount('body')).toBe(3);
            expect(d.header).toEqual(['a', 'b', '']);
            expect([0, 1, 2].map(c => d.data('body', 2, c))).toEqual([
              '3',
              '4',
              '5'
            ]);
            expect(d.rowCount('body')).toBe(4);
            d.dispose();
          }
        }
      }
    );

    it.each([undefined, '#'])(
      'preserves quoted wider rows with comment %s',
      comment => {
        const d = new DSVModel({
          data: 'name,id\n"Doe, Jane",1,"extra"',
          delimiter: ',',
          comment
        });
        expect(d.columnCount('body')).toBe(3);
        expect([0, 1, 2].map(c => d.data('body', 0, c))).toEqual([
          'Doe, Jane',
          '1',
          'extra'
        ]);
        d.dispose();
      }
    );

    it.each([undefined, '#'])(
      'updates header state through the setter with comment %s',
      comment => {
        const d = new DSVModel({
          data: `${comment ? '# metadata\n' : ''}a,b\n1,2`,
          delimiter: ',',
          comment,
          header: false
        });
        const headerRow = comment ? 1 : 0;
        d.header = ['A', 'B'];
        expect(d.rowCount('body')).toBe(headerRow + 1);
        expect([0, 1].map(c => d.data('column-header', 0, c))).toEqual([
          'A',
          'B'
        ]);
        expect(d.data('body', headerRow, 0)).toBe('1');

        d.header = [];
        expect(d.rowCount('body')).toBe(headerRow + 2);
        expect([0, 1].map(c => d.data('column-header', 0, c))).toEqual([
          '1',
          '2'
        ]);
        expect(d.data('body', headerRow, 0)).toBe('a');
        expect(d.data('body', 0, 0)).toBe(comment ? '# metadata' : 'a');
        d.dispose();
      }
    );

    it.each([undefined, '#'])(
      'falls back when the initial delimiter is wrong with comment %s',
      comment => {
        const warning = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {});
        try {
          const d = new DSVModel({
            data: `${comment ? '# metadata\n' : ''}"name";"value"\n"Alice";"1"\n`,
            delimiter: ',',
            comment
          });
          expect(d.header).toEqual(['name";"value']);
          expect(d.columnCount('body')).toBe(1);
          expect(warning).toHaveBeenCalledTimes(1);
          d.dispose();
        } finally {
          warning.mockRestore();
        }
      }
    );

    it.each(['\n', '\r\n', '\r'])(
      'preserves quoted data and literal comments with row delimiter %j',
      async rowDelimiter => {
        const d = new DSVModel({
          data: [
            '# metadata,"unfinished',
            'name,id',
            '"Doe, Jane",1',
            '# note,"literal"',
            '"first line' + rowDelimiter + '# still data",2'
          ].join(rowDelimiter),
          delimiter: ',',
          comment: '#',
          initialRows: 1
        });
        expect(d.header).toEqual(['name', 'id']);
        await d.ready;
        expect(d.rowCount('body')).toBe(4);
        expect([0, 1].map(c => d.data('body', 0, c))).toEqual([
          '# metadata',
          '"unfinished'
        ]);
        expect([0, 1].map(c => d.data('body', 1, c))).toEqual([
          'Doe, Jane',
          '1'
        ]);
        expect([0, 1].map(c => d.data('body', 2, c))).toEqual([
          '# note',
          '"literal"'
        ]);
        expect([0, 1].map(c => d.data('body', 3, c))).toEqual([
          'first line' + rowDelimiter + '# still data',
          '2'
        ]);
        d.dispose();
      }
    );

    it('preserves a short final row in CRLF files with literal comment quotes', () => {
      const d = new DSVModel({
        data: '# metadata,"unfinished\r\na,b,c\r\n1,2',
        delimiter: ',',
        comment: '#'
      });
      expect(d.header).toEqual(['a', 'b', 'c']);
      expect([0, 1, 2].map(c => d.data('body', 1, c))).toEqual(['1', '2', '']);
      d.dispose();
    });

    it('renders files containing only comments with literal quotes', () => {
      const d = new DSVModel({
        data: '# first,"unfinished\n# second,"literal"',
        delimiter: ',',
        comment: '#',
        header: false
      });
      expect(d.rowCount('body')).toBe(2);
      expect([0, 1].map(c => d.data('body', 1, c))).toEqual([
        '# second',
        '"literal"'
      ]);
      d.dispose();
    });

    it.each(['\n', '\r\n'])(
      'skips an empty line between comments and the header with row delimiter %j',
      rowDelimiter => {
        const d = new DSVModel({
          data: ['# Pages', '', 'Page,Pageviews', '/,1200', ''].join(
            rowDelimiter
          ),
          delimiter: ',',
          comment: '#'
        });
        expect(d.header).toEqual(['Page', 'Pageviews']);
        expect(d.rowCount('body')).toBe(3);
        expect([0, 1].map(c => d.data('body', 1, c))).toEqual(['', '']);
        expect([0, 1].map(c => d.data('body', 2, c))).toEqual(['/', '1200']);
        d.dispose();
      }
    );

    describe('comment rows', () => {
      let d: DSVModel;

      beforeEach(() => {
        d = new DSVModel({
          data: [
            '# exported, 2024',
            '',
            'id,name,value',
            '1,Alice,10',
            '# note, with a comma',
            '2,Bob,20'
          ].join('\n'),
          delimiter: ',',
          comment: '#'
        });
      });

      afterEach(() => {
        d.dispose();
      });

      it('should hold the whole comment line in the first cell', () => {
        expect([0, 1, 2].map(c => d.data('body', 3, c))).toEqual([
          '# note, with a comma',
          '',
          ''
        ]);
      });

      it('should merge each comment row across all columns', () => {
        expect(d.groupCount('body')).toBe(2);
        expect([0, 1].map(i => d.group('body', i))).toEqual([
          { r1: 0, r2: 0, c1: 0, c2: 2 },
          { r1: 3, r2: 3, c1: 0, c2: 2 }
        ]);
      });

      it('should mark merged comment rows in the cell metadata', () => {
        expect(d.metadata('body', 3, 1)).toEqual({
          comment: true,
          merged: true
        });
        expect(d.metadata('body', 2, 1)).toEqual({});
      });

      it('should number only the rows after the header which are not comments', () => {
        expect([0, 1, 2, 3, 4].map(r => d.data('row-header', r, 0))).toEqual([
          '',
          '',
          '1',
          '',
          '2'
        ]);
      });

      it('should find the body row of a row number', () => {
        expect([1, 2].map(n => d.bodyRowForNumber(n))).toEqual([2, 4]);
      });

      it('should split a comment line with as many fields as the data', () => {
        const units = new DSVModel({
          data: '# kg, m, s\nweight, length, time\n1, 2, 3\n',
          delimiter: ',',
          comment: '#'
        });
        expect([0, 1, 2].map(c => units.data('body', 0, c))).toEqual([
          '# kg',
          ' m',
          ' s'
        ]);
        expect(units.groupCount('body')).toBe(0);
        units.dispose();
      });

      it('should mark split comment rows in the cell metadata', () => {
        const units = new DSVModel({
          data: '# kg, m, s\nweight, length, time\n1, 2, 3\n',
          delimiter: ',',
          comment: '#'
        });
        expect(units.metadata('body', 0, 1)).toEqual({ comment: true });
        units.dispose();
      });

      it('should merge a comment line padded with empty fields', () => {
        const padded = new DSVModel({
          data: '# Section title,,\na,b,c\n1,2,3\n',
          delimiter: ',',
          comment: '#'
        });
        expect([0, 1, 2].map(c => padded.data('body', 0, c))).toEqual([
          '# Section title,,',
          '',
          ''
        ]);
        padded.dispose();
      });

      it('should merge a two-column comment line with a long field', () => {
        const prose = new DSVModel({
          data: '# reference: Viehland and Kirkpatrick, Int. J. Mass Spectrom. 149 (1995)\na,b\n1,2\n',
          delimiter: ',',
          comment: '#'
        });
        expect(prose.groupCount('body')).toBe(1);
        prose.dispose();
      });

      it('should split a two-column comment line with short fields', () => {
        const units = new DSVModel({
          data: '# kg,m\nmass,length\n1,2\n',
          delimiter: ',',
          comment: '#'
        });
        expect([0, 1].map(c => units.data('body', 0, c))).toEqual([
          '# kg',
          'm'
        ]);
        units.dispose();
      });

      it('should merge at most 1000 comment rows', async () => {
        const many = new DSVModel({
          data: 'a,b\n' + '# note\n1,2\n'.repeat(1005),
          delimiter: ',',
          comment: '#'
        });
        await many.ready;
        expect(many.groupCount('body')).toBe(1000);
        many.dispose();
      });

      it('should merge comment rows found by the delayed parse', async () => {
        const late = new DSVModel({
          data: 'a,b\n' + '1,2\n'.repeat(10) + '# late note\n3,4\n',
          delimiter: ',',
          comment: '#',
          initialRows: 3
        });
        await late.ready;
        expect(late.groupCount('body')).toBe(1);
        expect(late.group('body', 0)).toEqual({ r1: 10, r2: 10, c1: 0, c2: 1 });
        late.dispose();
      });
    });

    it('handles delayed parsing of rows past the initial rows', async () => {
      const d = new DSVModel({
        data: `a,b,c\nc,d,e\nf,g,h\ni,j,k`,
        delimiter: ',',
        initialRows: 2
      });
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(1);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);

      // Expected behavior is that all unparsed data is lumped into the final field.
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual([
        'c',
        'd',
        'e\nf,g,h\ni,j,k'
      ]);

      // Check everything is in order after all the data has been parsed asynchronously.
      await d.ready;
      expect(d.rowCount('column-header')).toBe(1);
      expect(d.rowCount('body')).toBe(3);
      expect(d.columnCount('row-header')).toBe(1);
      expect(d.columnCount('body')).toBe(3);
      expect([0, 1, 2].map(i => d.data('column-header', 0, i))).toEqual([
        'a',
        'b',
        'c'
      ]);
      expect([0, 1, 2].map(i => d.data('body', 0, i))).toEqual(['c', 'd', 'e']);
      expect([0, 1, 2].map(i => d.data('body', 1, i))).toEqual(['f', 'g', 'h']);
      expect([0, 1, 2].map(i => d.data('body', 2, i))).toEqual(['i', 'j', 'k']);
    });
  });
});
