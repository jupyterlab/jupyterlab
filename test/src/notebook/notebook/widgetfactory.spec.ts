// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeData
} from 'phosphor-dragdrop';

import {
  NotebookPanel
} from '../../../../lib/notebook/notebook/panel';

import {
  NotebookWidgetFactory
} from '../../../../lib/notebook/notebook/widgetfactory';

import {
  MockContext
} from '../../docmanager/mockcontext';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


const rendermime = defaultRenderMime();
const clipboard = new MimeData();


describe('notebook/notebook/widgetfactory', () => {

  describe('NotebookWidgetFactory', () => {

    describe('#constructor()', () => {

      it('should create a notebook widget factory', () => {
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        expect(factory).to.be.a(NotebookWidgetFactory);
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory has been disposed', () => {
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        expect(() => { factory.isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the factory', () => {
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new `NotebookPanel` widget', () => {
        let model = new NotebookModel();
        let context = new MockContext();
        let factory = new NotebookWidgetFactory(rendermime, clipboard);

      });
    });

  });

});
