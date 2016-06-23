// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MimeData
} from 'phosphor-dragdrop';

import {
  NotebookModel
} from '../../../../lib/notebook/notebook/model';

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
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        expect(panel).to.be.a(NotebookPanel);
      });

      it('should create a clone of the rendermime', () => {
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        expect(panel.rendermime).to.not.be(rendermime);
      });

      it('should start a kernel if one is given', () => {
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context, { name: 'shell' });
        expect(panel.context.kernel.name).to.be('shell');
      });

      it('should start a kernel given the default kernel language', () => {
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        expect(panel.context.kernel.name).to.be('python');
      });

      it('should start a kernel based on default language of the model', () => {
        let model = new NotebookModel();
        let cursor = model.getMetadata('language_info');
        cursor.setValue({ name: 'shell' });
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        expect(panel.context.kernel.name).to.be('shell');
      });

      it('should populate the default toolbar items', () => {
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        let items = panel.toolbar.list();
        expect(items).to.contain('save');
        expect(items).to.contain('restart');
        expect(items).to.contain('kernelStatus');
      });

    });

    describe('#beforeClose()', () => {

      it('should be a no-op', (done) => {
        let model = new NotebookModel();
        let context = new MockContext<NotebookModel>(model);
        let factory = new NotebookWidgetFactory(rendermime, clipboard);
        let panel = factory.createNew(context);
        factory.beforeClose(panel, context).then(() => {
          done();
        });
      });

    });

  });

});
