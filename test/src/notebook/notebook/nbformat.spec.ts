// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  isMarkdownCell, isCodeCell, isRawCell, isExecuteResult,
  isDisplayData, isStream, isError, IBaseCell, IBaseOutput
} from '../../../../lib/notebook/notebook/nbformat';


describe('jupyter-js-notebook', () => {

  describe('isMarkdownCell()', () => {

    it('should return true if `markdown` type', () => {
      let cell: IBaseCell = {
        cell_type: 'markdown',
        source: '',
        metadata: { trusted: false },
      }
      expect(isMarkdownCell(cell)).to.be(true);
      cell.cell_type = 'code';
      expect(isMarkdownCell(cell)).to.be(false);
    });

  });

  describe('isCodeCell()', () => {

    it('should return true if `code` type', () => {
      let cell: IBaseCell = {
        cell_type: 'code',
        source: '',
        metadata: { trusted: false },
      }
      expect(isCodeCell(cell)).to.be(true);
      cell.cell_type = 'markdown';
      expect(isCodeCell(cell)).to.be(false);
    });

  });

  describe('isRawCell()', () => {

    it('should return true if `raw` type', () => {
      let cell: IBaseCell = {
        cell_type: 'raw',
        source: '',
        metadata: { trusted: false },
      }
      expect(isRawCell(cell)).to.be(true);
      cell.cell_type = 'markdown';
      expect(isRawCell(cell)).to.be(false);
    });

  });

  describe('isExecuteResult()', () => {

    it('should return true if `execute_result` type', () => {
      let output: IBaseOutput = {
        output_type: 'execute_result'
      }
      expect(isExecuteResult(output)).to.be(true);
      output.output_type = 'stream';
      expect(isExecuteResult(output)).to.be(false);
    });

  });

  describe('isDisplayData()', () => {

    it('should return true if `display_data` type', () => {
      let output: IBaseOutput = {
        output_type: 'display_data'
      }
      expect(isDisplayData(output)).to.be(true);
      output.output_type = 'stream';
      expect(isDisplayData(output)).to.be(false);
    });

  });

  describe('isStream()', () => {

    it('should return true if `stream` type', () => {
      let output: IBaseOutput = {
        output_type: 'stream'
      }
      expect(isStream(output)).to.be(true);
      output.output_type = 'error';
      expect(isStream(output)).to.be(false);
    });

  });

  describe('isError()', () => {

    it('should return true if `error` type', () => {
      let output: IBaseOutput = {
        output_type: 'error'
      }
      expect(isError(output)).to.be(true);
      output.output_type = 'stream';
      expect(isError(output)).to.be(false);
    });

  });

});
