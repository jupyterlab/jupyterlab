// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  utils
} from '@jupyterlab/services';

import {
  toArray
} from '@phosphor/algorithm';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Widget
} from '@phosphor/widgets';

import {
  ABCWidgetFactory, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  createNewWidget(context: DocumentRegistry.Context): Widget {
    return new Widget();
  }
}


class WidgetExtension implements DocumentRegistry.WidgetExtension {

   createNew(widget: Widget, context: DocumentRegistry.Context): IDisposable {
     return new DisposableDelegate(null);
   }
}


function createFactory() {
  return new WidgetFactory({
    name: utils.uuid(),
    fileExtensions: ['.txt', '.foo.bar'],
    defaultFor: ['.txt', '.foo.bar']
  });
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

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the registry', () => {
        registry.addFileType({ name: 'notebook', extension: '.ipynb' });
        registry.dispose();
        expect(registry.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        registry.dispose();
        registry.dispose();
        expect(registry.isDisposed).to.be(true);
      });

    });

    describe('#addWidgetFactory()', () => {

      it('should add the widget factory to the registry', () => {
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.getWidgetFactory(factory.name)).to.be(factory);
        expect(registry.getWidgetFactory(factory.name.toUpperCase())).to.be(factory);
      });

      it('should become the global default if `*` is given as a defaultFor', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.be('global');
      });

      it('should override an existing global default', () => {
        registry.addModelFactory(new TextModelFactory());
        registry.addWidgetFactory(new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        }));
        let factory = new WidgetFactory({
          name: 'bar',
          fileExtensions: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.be('bar');
      });

      it('should override an existing extension default', () => {
        registry.addModelFactory(new TextModelFactory());
        registry.addWidgetFactory(createFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('.foo.bar')).to.be(factory);
      });

      it('should be removed from the registry when disposed', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        let disposable = registry.addWidgetFactory(factory);
        disposable.dispose();
        expect(registry.getWidgetFactory('test')).to.be(void 0);
      });

    });

    describe('#addModelFactory()', () => {

      it('should add the model factory to the registry', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
      });

      it('should be a no-op a factory with the given `name` is already registered', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(new TextModelFactory());
        disposable.dispose();
      });

      it('should be a no-op if the same factory is already registered', () => {
        let factory = new TextModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(factory);
        disposable.dispose();
      });

      it('should be removed from the registry when disposed', () => {
        let factory = new TextModelFactory();
        let disposable = registry.addModelFactory(factory);
        disposable.dispose();
      });

    });

    describe('#addWidgetExtension()', () => {

      it('should add a widget extension to the registry', () => {
        let extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        expect(registry.widgetExtensions('foo').next()).to.be(extension);
      });

      it('should be a no-op if the extension is already registered for a given widget factory', () => {
        let extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        let disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(registry.widgetExtensions('foo').next()).to.be(extension);
      });

      it('should be removed from the registry when disposed', () => {
        let extension = new WidgetExtension();
        let disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(toArray(registry.widgetExtensions('foo')).length).to.be(0);
      });

    });

    describe('#addFileType()', () => {

      it('should add a file type to the document registry', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        registry.addFileType(fileType);
        expect(registry.fileTypes().next()).to.be(fileType);
      });

      it('should be removed from the registry when disposed', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(toArray(registry.fileTypes()).length).to.be(0);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        let fileType = { name: 'notebook', extension: '.ipynb' };
        registry.addFileType(fileType);
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.fileTypes().next()).to.be(fileType);
      });

    });

    describe('#addCreator()', () => {

      it('should add a file type to the document registry', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        registry.addCreator(creator);
        expect(registry.creators().next()).to.be(creator);
      });

      it('should be removed from the registry when disposed', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        let disposable = registry.addCreator(creator);
        disposable.dispose();
        expect(toArray(registry.creators()).length).to.be(0);
      });

      it('should end up in locale order', () => {
        let creators = [
          { name: 'Python Notebook', fileType: 'notebook' },
          { name: 'R Notebook', fileType: 'notebook' },
          { name: 'CSharp Notebook', fileType: 'notebook' }
        ];
        registry.addCreator(creators[0]);
        registry.addCreator(creators[1]);
        registry.addCreator(creators[2]);
        let it = registry.creators();
        expect(it.next()).to.be(creators[2]);
        expect(it.next()).to.be(creators[0]);
        expect(it.next()).to.be(creators[1]);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        let creator = { name: 'notebook', fileType: 'notebook' };
        registry.addCreator(creator);
        let disposable = registry.addCreator(creator);
        disposable.dispose();
        expect(registry.creators().next()).to.eql(creator);
      });

    });

    describe('#preferredWidgetFactories()', () => {

      it('should give the valid registered widget factories', () => {
        expect(toArray(registry.preferredWidgetFactories())).to.eql([]);
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let factories = registry.preferredWidgetFactories('.foo.bar');
        expect(toArray(factories)).to.eql([factory, gFactory]);
      });

      it('should not list a factory whose model is not registered', () => {
        registry.addWidgetFactory(createFactory());
        expect(registry.preferredWidgetFactories()[0]).to.eql(void 0);
      });

      it('should select the factory for a given extension', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileExtensions: ['.md'],
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.preferredWidgetFactories('.txt')[0]).to.be(factory);
        expect(registry.preferredWidgetFactories('.md')[0]).to.be(mdFactory);
      });

      it('should respect the priority order', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileExtensions: ['.md'],
        });
        registry.addWidgetFactory(mdFactory);
        let factories = registry.preferredWidgetFactories('.txt');
        expect(toArray(factories)).to.eql([factory, gFactory]);
      });

      it('should handle multi-part extensions', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let tFactory = new WidgetFactory({
          name: 'table',
          fileExtensions: ['.table.json'],
        });
        registry.addWidgetFactory(tFactory);
        let jFactory = new WidgetFactory({
          name: 'json',
          fileExtensions: ['.json'],
        });
        registry.addWidgetFactory(jFactory);
        let factories = registry.preferredWidgetFactories('.table.json');
        expect(toArray(factories)).to.eql([tFactory, jFactory]);
        factories = registry.preferredWidgetFactories('.json');
        expect(toArray(factories)).to.eql([jFactory]);
      });

      it('should handle just a multi-part extension', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = new WidgetFactory({
          name: 'table',
          fileExtensions: ['.table.json'],
        });
        registry.addWidgetFactory(factory);
        let factories = registry.preferredWidgetFactories('.table.json');
        expect(toArray(factories)).to.eql([factory]);
        factories = registry.preferredWidgetFactories('.json');
        expect(toArray(factories)).to.eql([]);
      });

    });

    describe('#defaultWidgetFactory()', () => {

      it('should get the default widget factory for a given extension', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileExtensions: ['.md'],
          defaultFor: ['.md']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.defaultWidgetFactory('.foo.bar')).to.be(factory);
        expect(registry.defaultWidgetFactory('.md')).to.be(mdFactory);
        expect(registry.defaultWidgetFactory()).to.be(gFactory);
      });

    });

    describe('#fileTypes()', () => {

      it('should get the registered file types', () => {
        expect(toArray(registry.fileTypes()).length).to.be(0);
        let fileTypes = [
          { name: 'notebook', extension: '.ipynb' },
          { name: 'python', extension: '.py' },
          { name: 'table', extension: '.table.json' }
        ];
        registry.addFileType(fileTypes[0]);
        registry.addFileType(fileTypes[1]);
        registry.addFileType(fileTypes[2]);
        let values = registry.fileTypes();
        expect(values.next()).to.be(fileTypes[0]);
        expect(values.next()).to.be(fileTypes[1]);
        expect(values.next()).to.be(fileTypes[2]);
      });

    });

    describe('#creators()', () => {

      it('should get the registered file creators', () => {
        expect(toArray(registry.creators()).length).to.be(0);
        let creators = [
          { name: 'Python Notebook', fileType: 'notebook' },
          { name: 'R Notebook', fileType: 'notebook' },
          { name: 'CSharp Notebook', fileType: 'notebook' }
        ];
        registry.addCreator(creators[0]);
        registry.addCreator(creators[1]);
        registry.addCreator(creators[2]);
        expect(toArray(registry.creators()).length).to.be(3);
        expect(registry.creators().next().name).to.be('CSharp Notebook');
      });

    });

    describe('#getFileType()', () => {

      it('should get a file type by name', () => {
        let fileTypes = [
          { name: 'notebook', extension: '.ipynb' },
          { name: 'python', extension: '.py' }
        ];
        registry.addFileType(fileTypes[0]);
        registry.addFileType(fileTypes[1]);
        expect(registry.getFileType('notebook')).to.be(fileTypes[0]);
        expect(registry.getFileType('python')).to.be(fileTypes[1]);
        expect(registry.getFileType('r')).to.be(void 0);
      });
    });

    describe('#getCreator()', () => {

      it('should get a creator by name', () => {
        let creators = [
          { name: 'Python Notebook', fileType: 'notebook' },
          { name: 'R Notebook', fileType: 'notebook' },
          { name: 'Shell Notebook', fileType: 'notebook' }
        ];
        registry.addCreator(creators[0]);
        registry.addCreator(creators[1]);
        registry.addCreator(creators[2]);
        expect(registry.getCreator('Python Notebook')).to.be(creators[0]);
        expect(registry.getCreator('r notebook')).to.be(creators[1]);
        expect(registry.getCreator('shell Notebook')).to.be(creators[2]);
        expect(registry.getCreator('foo')).to.be(void 0);
      });

    });

    describe('#getKernelPreference()', () => {

      it('should get a kernel preference', () => {
        registry.addModelFactory(new TextModelFactory());
        registry.addWidgetFactory(createFactory());
        registry.addWidgetFactory(new WidgetFactory({
          name: 'python',
          fileExtensions: ['.py'],
          preferKernel: true,
          canStartKernel: true
        }));
        registry.addWidgetFactory(new WidgetFactory({
          name: 'global',
          fileExtensions: ['*'],
          defaultFor: ['*']
        }));
        let pref = registry.getKernelPreference('.c', 'global');
        expect(pref.language).to.be('clike');
        expect(pref.preferKernel).to.be(false);
        expect(pref.canStartKernel).to.be(false);

        pref = registry.getKernelPreference('.py', 'python');
        expect(pref.language).to.be('python');
        expect(pref.preferKernel).to.be(true);
        expect(pref.canStartKernel).to.be(true);

        pref = registry.getKernelPreference('.py', 'baz');
        expect(pref).to.be(void 0);
      });

    });

    describe('#getModelFactory()', () => {

      it('should get a registered model factory by name', () => {
        let mFactory = new TextModelFactory();
        registry.addModelFactory(mFactory);
        expect(registry.getModelFactory('text')).to.be(mFactory);
      });

    });

    describe('#getWidgetFactory()', () => {

      it('should get a widget factory by name', () => {
        registry.addModelFactory(new TextModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileExtensions: ['.md'],
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.getWidgetFactory(factory.name)).to.be(factory);
        expect(registry.getWidgetFactory('markdown')).to.be(mdFactory);
        expect(registry.getWidgetFactory('baz')).to.be(void 0);
      });

    });

    describe('#widgetExtensions()', () => {

      it('should get the registered extensions for a given widget', () => {
        let foo = new WidgetExtension();
        let bar = new WidgetExtension();
        registry.addWidgetExtension('fizz', foo);
        registry.addWidgetExtension('fizz', bar);
        registry.addWidgetExtension('buzz', foo);
        let fizz = toArray(registry.widgetExtensions('fizz'));
        expect(fizz[0]).to.be(foo);
        expect(fizz[1]).to.be(bar);
        expect(fizz.length).to.be(2);
        let buzz = toArray(registry.widgetExtensions('buzz'));
        expect(buzz[0]).to.be(foo);
        expect(toArray(buzz).length).to.be(1);
        expect(registry.widgetExtensions('baz').next()).to.be(void 0);
      });

    });

  });

});
