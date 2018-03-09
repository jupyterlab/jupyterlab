// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  parseDSV
} from '@jupyterlab/csvviewer';


describe('csvviewer/parse', () => {

  describe('parseDSV', () => {

    it('does basic parsing of csv files', () => {
      let data = `a,b,c,d\r\n0,1,2,3\r\n4,5,6,7`;
      let options = {data, columnOffsets: false};
      let offsets = parseDSV(options);
      expect(offsets.nrows).to.eql(3);
      expect(offsets.ncols).to.eql(0);
      expect(offsets.offsets).to.eql([0, 9, 18]);
    });

    it('does basic parsing of csv files with column offsets', () => {
      let data = `a,b,c,d\r\n0,1,2,3\r\n4,5,6,7`;
      let options = {data, columnOffsets: true};
      let offsets = parseDSV(options);
      expect(offsets.nrows).to.eql(3);
      expect(offsets.ncols).to.eql(4);
      expect(offsets.offsets).to.eql([0, 2, 4, 6, 9, 11, 13, 15, 18, 20, 22, 24]);
    });

    // For simplicity, we'll use \n as a row delimiter below.

    it('handles trailing row delimiter', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      results = parseDSV({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 16]);

      results = parseDSV({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles changing the field delimiter', () => {
      let data = `a\tb\tc\td\n0\t1\t2\t3\n4\t5\t6\t7\n`;
      let options = {data, delimiter: '\t', rowDelimiter: '\n'};
      let results;

      results = parseDSV({...options, columnOffsets: false});
      expect(results.nrows).to.eql(3);
      expect(results.offsets).to.eql([0, 8, 16]);

      results = parseDSV({...options, columnOffsets: true});
      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles starting on a new row', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', startIndex: 8};
      let results;

      results = parseDSV({...options, columnOffsets: false});
      expect(results.nrows).to.eql(2);
      expect(results.offsets).to.eql([8, 16]);

      results = parseDSV({...options, columnOffsets: true});
      expect(results.nrows).to.eql(2);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('handles a max row argument', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', maxRows: 2};
      let results;

      results = parseDSV({...options, columnOffsets: false});
      expect(results.nrows).to.eql(2);
      expect(results.offsets).to.eql([0, 8]);

      results = parseDSV({...options, columnOffsets: true});
      expect(results.nrows).to.eql(2);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14]);
    });

    it('handles a start index and max row argument', () => {
      let data = `a,b,c,d\n0,1,2,3\n4,5,6,7\n`;
      let options = {data, rowDelimiter: '\n', startIndex: 8, maxRows: 1};
      let results;

      results = parseDSV({...options, columnOffsets: false});
      expect(results.nrows).to.eql(1);
      expect(results.offsets).to.eql([8]);

      results = parseDSV({...options, columnOffsets: true});
      expect(results.nrows).to.eql(1);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([8, 10, 12, 14]);
    });

// parseDSV, when padding columns, should return the offset of the row delimiter, not the start of the new line.

    it.only('adjusts columns to match first row by default', () => {
      let data = `a,b,c,d\n0,1\n`;
      let options = {data, rowDelimiter: '\n'};
      let results;

      // results = parseDSV({...options, columnOffsets: false});
      // expect(results.nrows).to.eql(3);
      // expect(results.offsets).to.eql([0, 8, 12]);

      results = parseDSV({...options, columnOffsets: true});
      console.log(Array.from(results.offsets));
      console.log(Array.from(results.offsets).map(i => data[i]));
      console.log(Array.from(results.offsets).map((i, ind, arr) => data.slice(i, arr[ind + 1])));

      expect(results.nrows).to.eql(3);
      expect(results.ncols).to.eql(4);
      expect(results.offsets).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

  });

});

// console.log(Array.from(results.offsets));
// console.log(Array.from(results.offsets).map(i => data[i]));
