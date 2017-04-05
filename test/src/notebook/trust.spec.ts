// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
 NotebookModel
} from '@jupyterlab/notebook';

import {
  trustNotebook
} from '@jupyterlab/notebook';

import {
  acceptDialog, dismissDialog
} from '../utils';

import {
  DEFAULT_CONTENT
} from './utils';


describe('notebook/notebook/trust', () => {

  describe('#trustNotebook()', () => {

    it('should trust the notebook cells if the user accepts', (done) => {
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      let cell = model.cells.at(0);
      expect(cell.trusted).to.not.be(true);
      trustNotebook(model).then(() => {
        expect(cell.trusted).to.be(true);
        done();
      });
      acceptDialog();
    });

    it('should not trust the notebook cells if the user aborts', (done) => {
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      let cell = model.cells.at(0);
      expect(cell.trusted).to.not.be(true);
      trustNotebook(model).then(() => {
        expect(cell.trusted).to.not.be(true);
        done();
      });
      dismissDialog();
    });

    it('should bail if the model is `null`', (done) => {
      trustNotebook(null).then(() => { done(); });
    });

    it('should show a dialog if all cells are trusted', (done) => {
      let model = new NotebookModel();
      model.fromJSON(DEFAULT_CONTENT);
      for (let i = 0; i < model.cells.length; i++) {
        let cell = model.cells.at(i);
        cell.trusted = true;
      }
      trustNotebook(model).then(() => { done(); });
      acceptDialog();
    });

  });

});
