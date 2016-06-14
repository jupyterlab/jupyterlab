// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeCellWidget, MarkdownCellWidget, RawCellWidget
} from '../../../../lib/notebook/cells';

import {
  NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookRenderer
} from '../../../../lib/notebook/notebook/widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


const DEFAULT_CONTENT: nbformat.INotebookContent = require('../../../../examples/notebook/test.ipynb') as nbformat.INotebookContent;


describe('notebook/notebook/widget', () => {

  describe('NotebookRenderer', () => {

    describe('.createCell()', () => {

      it('should create a new code cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createCodeCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(CodeCellWidget);
      });

      it('should create a new raw cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createRawCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(RawCellWidget);
      });

      it('should create a new markdown cell widget given a cell model', () => {
        let model = new NotebookModel();
        let rendermime = defaultRenderMime();
        let cell = model.createMarkdownCell();
        let widget = NotebookRenderer.createCell(cell, rendermime);
        expect(widget).to.be.a(MarkdownCellWidget);
      });

    });

    describe('#constructor()', () => {

      it('should create a notebook widget', () => {
        let rendermime = defaultRenderMime();
        let widget = new NotebookRenderer(new NotebookModel(), rendermime);
        expect(widget).to.be.a(NotebookRenderer);
      });

      it('should add the `jp-Notebook` class', () => {
        let rendermime = defaultRenderMime();
        let widget = new NotebookRenderer(new NotebookModel(), rendermime);
        expect(widget.hasClass('jp-Notebook')).to.be(true);
      });

      it('should create widgets for existing cells', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        let widget = new NotebookRenderer(model, defaultRenderMime());
        expect(widget.childCount()).to.be(6);
      });

    });

  });

});
