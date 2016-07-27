// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IKernel
} from 'jupyter-js-services';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

import {
  Widget
} from 'phosphor-widget';

import {
  ABCWidgetFactory, DocumentRegistry,
  IDocumentModel, IDocumentContext, IWidgetExtension, TextModelFactory
} from '../../../lib/docregistry';



class WidgetFactory extends ABCWidgetFactory<Widget, IDocumentModel> {

  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): Widget {
    return new Widget();
  }
}


class WidgetExtension implements IWidgetExtension<Widget, IDocumentModel> {
   /**
    * Create a new extension for a given widget.
    */
   createNew(widget: Widget, context: IDocumentContext<IDocumentModel>): IDisposable {
     return new DisposableDelegate(() => {
       // no-op
     });
   }
}


describe('docregistry/registry', () => {

  describe('DocumentRegistry', () => {

    let registry: DocumentRegistry;

    beforeEach(() => {
      registry = new DocumentRegistry();
    });

    afterEach(() => {
      registry.dispose();
    });

    describe('#isDisposed', () => {

      it('should get whether the registry has been disposed', () => {
        expect(registry.isDisposed).to.be(false);
        registry.dispose();
        expect(registry.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        expect(() => { registry.isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the registry', () => {
        registry.addFileType({ name: 'notebook', extension: '.ipynb' });
        registry.dispose();
        expect(registry.isDisposed).to.be(true);
        expect(registry.listFileTypes()).to.eql([]);
      });

      it('should be safe to call multiple times', () => {
        registry.dispose();
        registry.dispose();
        expect(registry.isDisposed).to.be(true);
      });

    });

    describe('#addWidgetFactory()', () => {

      it('should add the widget factory to the registry', () => {
        let factory = new WidgetFactory();
        registry.addWidgetFactory(factory, {
          fileExtensions: [],
          displayName: 'foo',
          modelName: 'bar'
        });
        expect(registry.getWidgetFactory('foo')).to.be(factory);
      });

      it('should throw an error if the `displayName` is already registerd', () => {
        registry.addWidgetFactory(new WidgetFactory(), {
          fileExtensions: [],
          displayName: 'foo',
          modelName: 'bar'
        });
        expect(() => {
          registry.addWidgetFactory(new WidgetFactory(), {
          fileExtensions: [],
          displayName: 'foo',
          modelName: 'bar'
        }); }).to.throwError();
      });

      it('should become the global default if `*` is given as a defaultFor', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = new WidgetFactory();
        registry.addWidgetFactory(factory, {
          fileExtensions: ['*'],
          displayName: 'foo',
          modelName: 'text'
        });
        expect(registry.defaultWidgetFactory('*')).to.be(factory);
      });

      it('should override an existing global default', () => {
        registry.addModelFactory(new TextModelFactory());
        registry.addWidgetFactory(new WidgetFactory(), {
          fileExtensions: ['*'],
          displayName: 'foo',
          modelName: 'text'
        });
        let factory = new WidgetFactory();
        registry.addWidgetFactory(factory, {
          fileExtensions: ['*'],
          displayName: 'bar',
          modelName: 'text'
        });
        expect(registry.defaultWidgetFactory('*')).to.be(factory);
      });

      it('should override an existing extension default', () => {
        registry.addModelFactory(new TextModelFactory());
        registry.addWidgetFactory(new WidgetFactory(), {
          fileExtensions: ['.txt'],
          displayName: 'foo',
          modelName: 'text'
        });
        let factory = new WidgetFactory();
        registry.addWidgetFactory(factory, {
          fileExtensions: ['.txt'],
          displayName: 'bar',
          modelName: 'text'
        });
        expect(registry.defaultWidgetFactory('.txt')).to.be(factory);
      });

      it('should be removed from the registry when disposed', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = new WidgetFactory();
        let disposable = registry.addWidgetFactory(factory, {
          fileExtensions: ['.txt'],
          displayName: 'bar',
          modelName: 'text'
        });
        disposable.dispose();
        expect(registry.getWidgetFactory('bar')).to.be(void 0);
      });

    });

    describe('#addModelFactory()', () => {

      it('should add the model factory to the registry', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
        expect(registry.getModelFactory('text')).to.be(factory);
      });

      it('should be a no-op a factory with the given `name` is already registered', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(new TextModelFactory());
        disposable.dispose();
        expect(registry.listModelFactories()).to.eql('text');
      });

      it('should be a no-op if the same factory is already registered', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(factory);
        disposable.dispose();
        expect(registry.listModelFactories()).to.eql('text');
      });

      it('should be removed from the registry when disposed', () => {
        let factory = new TextModelFactory();
        let disposable = registry.addModelFactory(factory);
        disposable.dispose();
        expect(registry.listModelFactories()).to.eql([]);
      });

    });

    describe('#addWidgetExtension()', () => {

      it('should add a widget extension to the registry', () => {
        let extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        expect(registry.getWidgetExtensions('foo')).to.eql([extension]);
      });

      it('should be a no-op if the extension is already registered for a given widget factory', () => {
        let extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        let disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(registry.getWidgetExtensions('foo')).to.eql([extension]);
      });

      it('should be removed from the registry when disposed', () => {
        let extension = new WidgetExtension();
        let disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(registry.getWidgetExtensions('foo')).to.eql([]);
      });

    });

    describe('#addFileType()', () => {

      it('should add a file type to the document registry', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        registry.addFileType(fileType);
        expect(registry.listFileTypes()).to.eql([fileType]);
      });

      it('should be removed from the registry when disposed', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.listFileTypes()).to.eql([]);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        registry.addFileType(fileType);
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.listFileTypes()).to.eql([fileType]);
      });

    });

    describe('#addCreator()', () => {

      it('should add a file type to the document registry', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        registry.addCreator(creator);
        expect(registry.listCreators()).to.eql([creator]);
      });

      it('should add after a named creator if given', () => {
        let creators = [
          { name: 'Python Notebook', fileType: 'notebook' },
          { name: 'R Notebook', fileType: 'notebook' },
          { name: 'Shell Notebook', fileType: 'notebook' }
        ];
        registry.addCreator(creators[0]);
        registry.addCreator(creators[1]);
        registry.addCreator(creators[2], creators[0].name);
        expect(registry.listCreators()).to.eql([ creators[0], creators[2], creators[1]]);
      });

      it('should be removed from the registry when disposed', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        let disposable = registry.addCreator(creator);
        disposable.dispose();
        expect(registry.listCreators()).to.eql([]);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        registry.addCreator(creator);
        let disposable = registry.addCreator(creator);
        disposable.dispose();
        expect(registry.listFileTypes()).to.eql([creator]);
      });

    });

    describe('#listWidgetFactories()', () => {

    });

    describe('#defaultWidgetFactory()', () => {

    });

    describe('#listModelFactories()', () => {

    });

    describe('#listFileTypes()', () => {

    });

    describe('#listCreators()', () => {

    });

    describe('#getFileType()', () => {

    });

    describe('#getCreator()', () => {

    });

    describe('#getKernelPreference()', () => {

    });

    describe('#getModelFactory()', () => {

    });

    describe('#getWidgetFactory()', () => {

    });

    describe('#getWidgetExtensions()', () => {

    });

  });

});
