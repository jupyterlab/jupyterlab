// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  parseDSVNoQuotes as parser
} from '@jupyterlab/csvviewer';


describe('csvviewer/parsenoquotes', () => {

  describe('parseDSVNoQuotes', () => {

    it('does basic parsing of csv files', () => {
      let data = `a,b,c,d\r\n0,1,2,3\r\n4,5,6,7`;
      let options = {data};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(0);
      expect(results.offsets).to.eql([0, 9, 18]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 9, 11, 13, 15, 18, 20, 22, 24]);
    });

    // For simplicity, we'll use \n as a row delimiter below.

    it('handles trailing row delimiter', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 16]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles changing the field delimiter', () => {
      let data = `a\tb\tc\td\n0\t1\t2\t3\n4\t5\t6\t7\n`;
      let options = {data, delimiter: '\t', rowDelimiter: '\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 16]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles starting on a new row', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', startIndex: 8};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(2);
      expect(results.offsets).to.eql([8, 16]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(2);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles a max row argument', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', maxRows: 2};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(2);
      expect(results.offsets).to.eql([0, 8]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(2);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14]);
    });

    it('handles a start index and max row argument', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', startIndex: 8, maxRows: 1};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(1);
      expect(results.offsets).to.eql([8]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(1);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([8, 10, 12, 14]);
    });

    it('adjusts columns to match first row by default', () => {
      let data = `a,b,c,d\n0,\n1,2,3,4,5,6`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 11]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 10, 10, 11, 13, 15, 17]);
    });

    it('adjusts columns to match first row by default with CRLF row delimiter', () => {
      let data = `a,b,c,d\r\n0,\r\n1,2,3,4,5,6`;
      let options = {data, rowDelimiter: '\r\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 9, 13]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([ 0, 2, 4, 6, 9, 11, 11, 11, 13, 15, 17, 19 ]);
    });

    it('adjusts columns to match ncols', () => {
      let data = `a,b,c,d\n0,\n1,2,3,4,5,6`;
      let options = {data, rowDelimiter: '\n', ncols: 5};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 11]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(5);
      expect(results.offsets).to.eql([0, 2, 4, 6, 7, 8, 10, 10, 10, 10, 11, 13, 15, 17, 19]);
    });

    it('adjusts columns to match ncols with CRLF row delimiter', () => {
      let data = `a,b,c,d\r\n0,\r\n1,2,3,4,5,6`;
      let options = {data, rowDelimiter: '\r\n', ncols: 5};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 9, 13]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(5);
      expect(results.offsets).to.eql([0, 2, 4, 6, 7, 9, 11, 11, 11, 11, 13, 15, 17, 19, 21]);
    });

    it('adjusts columns to match ncols with one row', () => {
      let data = `a,b,c,d`;
      let options = {data, rowDelimiter: '\n', ncols: 7};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(1);
      expect(results.offsets).to.eql([0]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(1);
      expect(results.ncols).to.eql(7);
      expect(results.offsets).to.eql([0, 2, 4, 6, 7, 7, 7]);
    });

    it('adjusts columns to match ncols with one row and trailing delimiter', () => {
      let data = `a,b,c,d\n`;
      let options = {data, rowDelimiter: '\n', ncols: 7};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(1);
      expect(results.offsets).to.eql([0]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(1);
      expect(results.ncols).to.eql(7);
      expect(results.offsets).to.eql([0, 2, 4, 6, 7, 7, 7]);
    });

    it('handles a single row delimiter', () => {
      let data = `\n`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(1);
      expect(results.offsets).to.eql([0]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(1);
      expect(results.ncols).to.eql(1);
      expect(results.offsets).to.eql([0]);
    });

    it('handles adding columns or merging columns as necessary', () => {
      let data = `a,b,c\n,c,d,e,f\ng,h`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      results = parser({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 6, 15]);

      results = parser({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(3);
      expect(results.offsets).to.eql([0, 2, 4, 6, 7, 9, 15, 17, 18]);
    });

  });
});

// Helpful debugging logging
// console.log(Array.from(results.offsets));
// console.log(Array.from(results.offsets).map(i => data[i]));
// console.log(Array.from(results.offsets).map((i, ind, arr) => data.slice(i, arr[ind + 1])));
