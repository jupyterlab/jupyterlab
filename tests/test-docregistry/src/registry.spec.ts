// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

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
  ABCWidgetFactory, Base64ModelFactory, DocumentRegistry, DocumentWidget, IDocumentWidget
} from '@jupyterlab/docregistry';


class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {

  protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget {
    const content = new Widget();
    const widget = new DocumentWidget({ content, context });
    widget.addClass('WidgetFactory');
    return widget;
  }
}


class WidgetExtension implements DocumentRegistry.WidgetExtension {

   createNew(widget: Widget, context: DocumentRegistry.Context): IDisposable {
     return new DisposableDelegate(null);
   }
}


function createFactory(modelName?: string) {
  return new WidgetFactory({
    name: uuid(),
    modelName: modelName || 'text',
    fileTypes: ['text', 'foobar'],
    defaultFor: ['text', 'foobar']
  });
}


describe('docregistry/registry', () => {

  describe('DocumentRegistry', () => {

    let registry: DocumentRegistry;

    beforeEach(() => {
      registry = new DocumentRegistry();
      registry.addFileType({
        name: 'foobar',
        extensions: ['.foo.bar']
      });
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
        registry.addFileType({ name: 'notebook', extensions: ['.ipynb'] });
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
        let factory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.be('global');
      });

      it('should override an existing global default', () => {
        registry.addWidgetFactory(new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        }));
        let factory = new WidgetFactory({
          name: 'bar',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.be('bar');
      });

      it('should override an existing extension default', () => {
        registry.addWidgetFactory(createFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.be(factory);
      });

      it('should be removed from the registry when disposed', () => {
        let factory = createFactory();
        let disposable = registry.addWidgetFactory(factory);
        disposable.dispose();
        expect(registry.getWidgetFactory('test')).to.be(void 0);
      });

    });

    describe('#addModelFactory()', () => {

      it('should add the model factory to the registry', () => {
        let factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
      });

      it('should be a no-op a factory with the given `name` is already registered', () => {
        let factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(new Base64ModelFactory());
        disposable.dispose();
      });

      it('should be a no-op if the same factory is already registered', () => {
        let factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
        let disposable = registry.addModelFactory(factory);
        disposable.dispose();
      });

      it('should be removed from the registry when disposed', () => {
        let factory = new Base64ModelFactory();
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
        registry = new DocumentRegistry({ initialFileTypes: [] });
        let fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        expect(registry.fileTypes().next().name).to.be(fileType.name);
      });

      it('should be removed from the registry when disposed', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        let fileType = { name: 'notebook', extensions: ['.ipynb'] };
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(toArray(registry.fileTypes()).length).to.be(0);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        let fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        let disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.fileTypes().next().name).to.be(fileType.name);
      });

    });

    describe('#preferredWidgetFactories()', () => {

      beforeEach(() => {
        registry.addFileType({
          name: 'tablejson',
          extensions: ['.table.json']
        });
      });

      it('should give the valid registered widget factories', () => {
        expect(toArray(registry.preferredWidgetFactories('foo.txt'))).to.eql([]);
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let factories = registry.preferredWidgetFactories('a.foo.bar');
        expect(toArray(factories)).to.eql([factory, gFactory]);
      });

      it('should not list a factory whose model is not registered', () => {
        registry.addWidgetFactory(createFactory('foobar'));
        expect(registry.preferredWidgetFactories('a.foo.bar').length).to.eql(0);
      });

      it('should select the factory for a given extension', () => {
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.preferredWidgetFactories('a.txt')[0]).to.be(factory);
        expect(registry.preferredWidgetFactories('a.md')[0]).to.be(mdFactory);
      });

      it('should respect the priority order', () => {
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
        });
        registry.addWidgetFactory(mdFactory);
        let factories = registry.preferredWidgetFactories('a.txt');
        expect(toArray(factories)).to.eql([factory, gFactory]);
      });

      it('should handle multi-part extensions', () => {
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let tFactory = new WidgetFactory({
          name: 'table',
          fileTypes: ['tablejson'],
        });
        registry.addWidgetFactory(tFactory);
        let jFactory = new WidgetFactory({
          name: 'json',
          fileTypes: ['json'],
        });
        registry.addWidgetFactory(jFactory);
        let factories = registry.preferredWidgetFactories('foo.table.json');
        expect(toArray(factories)).to.eql([tFactory, jFactory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(toArray(factories)).to.eql([jFactory]);
      });

      it('should handle just a multi-part extension', () => {
        let factory = new WidgetFactory({
          name: 'table',
          fileTypes: ['tablejson'],
        });
        registry.addWidgetFactory(factory);
        let factories = registry.preferredWidgetFactories('foo.table.json');
        expect(toArray(factories)).to.eql([factory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(toArray(factories)).to.eql([]);
      });

    });

    describe('#defaultWidgetFactory()', () => {

      it('should get the default widget factory for a given extension', () => {
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          defaultFor: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.be(factory);
        expect(registry.defaultWidgetFactory('a.md')).to.be(mdFactory);
        expect(registry.defaultWidgetFactory()).to.be(gFactory);
      });

    });

    describe('#fileTypes()', () => {

      it('should get the registered file types', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        expect(toArray(registry.fileTypes()).length).to.be(0);
        let fileTypes = [
          { name: 'notebook', extensions: ['.ipynb'] },
          { name: 'python', extensions: ['.py'] },
          { name: 'table', extensions: ['.table.json'] }
        ];
        registry.addFileType(fileTypes[0]);
        registry.addFileType(fileTypes[1]);
        registry.addFileType(fileTypes[2]);
        let values = registry.fileTypes();
        expect(values.next().name).to.be(fileTypes[0].name);
        expect(values.next().name).to.be(fileTypes[1].name);
        expect(values.next().name).to.be(fileTypes[2].name);
      });

    });

    describe('#getFileType()', () => {

      it('should get a file type by name', () => {
        expect(registry.getFileType('notebook')).to.be.ok();
        expect(registry.getFileType('python')).to.be.ok();
        expect(registry.getFileType('fizzbuzz')).to.be(void 0);
      });
    });

    describe('#getKernelPreference()', () => {

      it('should get a kernel preference', () => {
        registry.addWidgetFactory(createFactory());
        registry.addWidgetFactory(new WidgetFactory({
          name: 'python',
          fileTypes: ['python'],
          preferKernel: true,
          canStartKernel: true
        }));
        registry.addWidgetFactory(new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        }));
        let pref = registry.getKernelPreference('.c', 'global');
        expect(pref.language).to.be('clike');
        expect(pref.shouldStart).to.be(false);
        expect(pref.canStart).to.be(false);

        pref = registry.getKernelPreference('.py', 'python');
        expect(pref.language).to.be('python');
        expect(pref.shouldStart).to.be(true);
        expect(pref.canStart).to.be(true);

        pref = registry.getKernelPreference('.py', 'baz');
        expect(pref).to.be(void 0);
      });

    });

    describe('#getModelFactory()', () => {

      it('should get a registered model factory by name', () => {
        let mFactory = new Base64ModelFactory();
        registry.addModelFactory(mFactory);
        expect(registry.getModelFactory('base64')).to.be(mFactory);
      });

    });

    describe('#getWidgetFactory()', () => {

      it('should get a widget factory by name', () => {
        registry.addModelFactory(new Base64ModelFactory());
        let factory = createFactory();
        registry.addWidgetFactory(factory);
        let mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
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

    describe('#getFileTypeForModel()', () => {

      beforeEach(() => {
        DocumentRegistry.defaultFileTypes.forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a directory', () => {
        let ft = registry.getFileTypeForModel({
          type: 'directory'
        });
        expect(ft.name).to.be('directory');
      });

      it('should handle a notebook', () => {
        let ft = registry.getFileTypeForModel({
          type: 'notebook'
        });
        expect(ft.name).to.be('notebook');
      });

      it('should handle a python file', () => {
        let ft = registry.getFileTypeForModel({
          name: 'foo.py'
        });
        expect(ft.name).to.be('python');
      });

      it('should handle an unknown file', () => {
        let ft = registry.getFileTypeForModel({
          name: 'foo.bar'
        });
        expect(ft.name).to.be('text');
      });

      it('should get the most specific extension', () => {
        [
          { name: 'json', extensions: ['.json'] },
          { name: 'vega', extensions: ['.vg.json'] }
        ].forEach(ft => {registry.addFileType(ft); });
        let ft = registry.getFileTypeForModel({
          name: 'foo.vg.json'
        });
        expect(ft.name).to.be('vega');
      });

      it('should be case insensitive', () => {
        let ft = registry.getFileTypeForModel({
          name: 'foo.PY'
        });
        expect(ft.name).to.be('python');
      });

    });

    describe('#getFileTypesForPath()', () => {

      beforeEach(() => {
        DocumentRegistry.defaultFileTypes.forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a notebook', () => {
        let ft = registry.getFileTypesForPath('foo/bar/baz.ipynb');
        expect(ft[0].name).to.be('notebook');
      });

      it('should handle a python file', () => {
        let ft = registry.getFileTypesForPath('foo/bar/baz.py');
        expect(ft[0].name).to.be('python');
      });

      it('should return an empty list for an unknown file', () => {
        let ft = registry.getFileTypesForPath('foo/bar/baz.weird');
        expect(ft.length).to.be(0);
      });

      it('should get the most specific extension first', () => {
        [
          { name: 'json', extensions: ['.json'] },
          { name: 'vega', extensions: ['.vg.json'] }
        ].forEach(ft => {registry.addFileType(ft); });
        let ft = registry.getFileTypesForPath('foo/bar/baz.vg.json');
        expect(ft[0].name).to.be('vega');
        expect(ft[1].name).to.be('json');
      });

      it('should be case insensitive', () => {
        let ft = registry.getFileTypesForPath('foo/bar/baz.PY');
        expect(ft[0].name).to.be('python');
      });

    });

  });

});
