// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';


describe('jupyter-js-notebook', () => {

  describe('isMarkdownCell()', () => {

    it('should return true if `markdown` type', () => {
      let cell: nbformat.IBaseCell = {
        cell_type: 'markdown',
        source: '',
        metadata: { trusted: false },
      };
      expect(nbformat.isMarkdownCell(cell)).to.be(true);
      cell.cell_type = 'code';
      expect(nbformat.isMarkdownCell(cell)).to.be(false);
    });

  });

  describe('isCodeCell()', () => {

    it('should return true if `code` type', () => {
      let cell: nbformat.IBaseCell = {
        cell_type: 'code',
        source: '',
        metadata: { trusted: false },
      };
      expect(nbformat.isCodeCell(cell)).to.be(true);
      cell.cell_type = 'markdown';
      expect(nbformat.isCodeCell(cell)).to.be(false);
    });

  });

  describe('isRawCell()', () => {

    it('should return true if `raw` type', () => {
      let cell: nbformat.IBaseCell = {
        cell_type: 'raw',
        source: '',
        metadata: { trusted: false },
      };
      expect(nbformat.isRawCell(cell)).to.be(true);
      cell.cell_type = 'markdown';
      expect(nbformat.isRawCell(cell)).to.be(false);
    });

  });

  describe('isExecuteResult()', () => {

    it('should return true if `execute_result` type', () => {
      let output: nbformat.IBaseOutput = {
        output_type: 'execute_result'
      };
      expect(nbformat.isExecuteResult(output)).to.be(true);
      output.output_type = 'stream';
      expect(nbformat.isExecuteResult(output)).to.be(false);
    });

  });

  describe('isDisplayData()', () => {

    it('should return true if `display_data` type', () => {
      let output: nbformat.IBaseOutput = {
        output_type: 'display_data'
      };
      expect(nbformat.isDisplayData(output)).to.be(true);
      output.output_type = 'stream';
      expect(nbformat.isDisplayData(output)).to.be(false);
    });

  });

  describe('isStream()', () => {

    it('should return true if `stream` type', () => {
      let output: nbformat.IBaseOutput = {
        output_type: 'stream'
      };
      expect(nbformat.isStream(output)).to.be(true);
      output.output_type = 'error';
      expect(nbformat.isStream(output)).to.be(false);
    });

  });

  describe('isError()', () => {

    it('should return true if `error` type', () => {
      let output: nbformat.IBaseOutput = {
        output_type: 'error'
      };
      expect(nbformat.isError(output)).to.be(true);
      output.output_type = 'stream';
      expect(nbformat.isError(output)).to.be(false);
    });

  });

});
