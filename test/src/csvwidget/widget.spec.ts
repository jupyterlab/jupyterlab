// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, utils
} from '@jupyterlab/services';

import {
  CSVModel
} from '@jupyterlab/csvwidget';

import {
  CSVWidget
} from '@jupyterlab/csvwidget';

import {
  Context, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';

import {
  CSV_DATA
} from './data.csv';


function createContext(): Context<DocumentRegistry.IModel> {
  let factory = new TextModelFactory();
  let manager = new ServiceManager();
  let path = utils.uuid() + '.csv';
  return new Context({ factory, manager, path });
}


describe('csvwidget/widget', () => {

  const context = createContext();

  describe('CSVWidget', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVWidget`', () => {
        let widget = new CSVWidget({ context });
        expect(widget).to.be.a(CSVWidget);
        widget.dispose();
      });

      it('should set a max exceeded listener on its warning area', done => {
        let widget = new CSVWidget({ context });
        let warning = widget.node.querySelector('.jp-CSVWidget-warning');
        expect(warning).to.be.ok();
        expect(warning.innerHTML).to.be.empty();
        widget.model.content = CSV_DATA;
        requestAnimationFrame(() => {
          expect(warning.innerHTML).to.not.be.empty();
          widget.dispose();
          done();
        });
      });

    });

    describe('#model', () => {

      it('should be a `CSVModel`', () => {
        let widget = new CSVWidget({ context });
        expect(widget.model).to.be.a(CSVModel);
        widget.dispose();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CSVWidget({ context });
        expect(widget.isDisposed).to.be(false);
        expect(widget.model).to.be.ok();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        expect(widget.model).to.not.be.ok();
      });

      it('should be safe to call multiple times', () => {
        let widget = new CSVWidget({ context });
        expect(widget.isDisposed).to.be(false);
        expect(widget.model).to.be.ok();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        expect(widget.model).to.not.be.ok();
      });

    });

  });

});
