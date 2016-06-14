// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernelId
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  ABCWidgetFactory, Base64ModelFactory, DocumentModel,
  IDocumentModel, IDocumentContext, TextModelFactory
} from '../../../lib/docmanager';

import {
  MockContext
} from './mockcontext';


class WidgetFactory extends ABCWidgetFactory {

  createNew(model: IDocumentModel, context: IDocumentContext, kernel?: IKernelId): Widget {
    return new Widget();
  }
}


describe('docmanager/default', () => {

  describe('ABCWidgetFactory', () => {

    describe('#isDisposed', () => {

      it('should get whether the factory has been disposed', () => {
        let factory = new WidgetFactory();
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let factory = new WidgetFactory();
        expect(() => { factory.isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the factory', () => {
        let factory = new WidgetFactory();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = new WidgetFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new widget given a document model and a context', () => {
        let factory = new WidgetFactory();
        let model = new DocumentModel();
        let context = new MockContext(model);
        let widget = factory.createNew(model, context);
        expect(widget).to.be.a(Widget);
      });

    });

    describe('#beforeClose()', () => {

      it('should take an action on a widget before closing it', (done) => {
        let factory = new WidgetFactory();
        let model = new DocumentModel();
        let context = new MockContext(model);
        let widget = factory.createNew(model, context);
        factory.beforeClose(model, context, widget).then(() => {
          done();
        });
      });

    });

  });

  describe('Base64ModelFactory', () => {

    describe('#name', () => {

      it('should get the name of the factory', () => {
        let factory = new Base64ModelFactory();
        expect(factory.name).to.be('base64');
      });

      it('should be read-only', () => {
        let factory = new Base64ModelFactory();
        expect(() => { factory.name = ''; }).to.throwError();
      });

    });

    describe('#contentsOptions', () => {

      it('should get the contents options used to fetch/save files', () => {
        let factory = new Base64ModelFactory();
        let expected = { type: 'file', format: 'base64' };
        expect(factory.contentsOptions).to.eql(expected);
      });

      it('should be read-only', () => {
        let factory = new Base64ModelFactory();
        expect(() => { factory.contentsOptions = null; }).to.throwError();
      });

    });

  });

  describe('DocumentModel', () => {

    describe('#constructor()', () => {

      it('should create a new document model', () => {
        let model = new DocumentModel();
        expect(model).to.be.a(DocumentModel);
      });

      it('should accept an optional language preference', () => {
        let model = new DocumentModel('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the model has been disposed', () => {
        let model = new DocumentModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let model = new DocumentModel();
        expect(() => { model.isDisposed = false; }).to.throwError();
      });

    });

    describe('#contentChanged', () => {

      it('should be emitted when the content of the model changes', () => {
        let model = new DocumentModel();
        let called = false;
        model.contentChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args).to.be(void 0);
          called = true;
        });
        model.fromString('foo');
        expect(called).to.be(true);
      });

      it('should not be emitted if the content does not change', () => {
        let model = new DocumentModel();
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        model.fromString('');
        expect(called).to.be(false);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state of the model changes', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('readOnly');
          expect(args.oldValue).to.be(false);
          expect(args.newValue).to.be(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.be(true);
      });

      it('should not be emitted if the state does not change', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dirty = false;
        expect(called).to.be(false);
      });

    });

    describe('#dirty', () => {

    });

    describe('#readOnly', () => {

    });

    describe('#defaultKernelName', () => {

    });

    describe('defaultKernelLanguage', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#toString()', () => {

    });

    describe('#fromString()', () => {

    });

    describe('#toJSON()', () => {

    });

    describe('#fromJSON()', () => {

    });

    describe('#initialize()', () => {

    });

  });

  describe('TextModelFactory', () => {

    describe('#name', () => {

    });

    describe('#contentsOptions', () => {

    });

    describe('#isDisposed', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#createNew()', () => {

    });

    describe('#preferredLanguage()', () => {

    });

  });

});
