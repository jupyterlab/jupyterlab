// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  CSVViewer
} from '@jupyterlab/csvviewer';

import {
  Context, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';


function createContext(): Context<DocumentRegistry.IModel> {
  let factory = new TextModelFactory();
  let manager = new ServiceManager();
  let path = uuid() + '.csv';
  return new Context({ factory, manager, path });
}


describe('csvviewer/widget', () => {

  const context = createContext();

  describe('CSVViewer', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVViewer`', () => {
        let widget = new CSVViewer({ context });
        expect(widget).to.be.a(CSVViewer);
        widget.dispose();
      });

    });

    describe('#context', () => {

      it('should be the context for the file', () => {
        let widget = new CSVViewer({ context });
        expect(widget.context).to.be(context);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CSVViewer({ context });
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CSVViewer({ context });
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

  });

});
