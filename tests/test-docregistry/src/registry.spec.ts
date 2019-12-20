// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@lumino/coreutils';

import { toArray } from '@lumino/algorithm';

import { DisposableDelegate, IDisposable } from '@lumino/disposable';

import { Widget } from '@lumino/widgets';

import {
  ABCWidgetFactory,
  Base64ModelFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget {
    const content = new Widget();
    const widget = new DocumentWidget({ content, context });
    widget.addClass('WidgetFactory');
    return widget;
  }
}

class WidgetExtension implements DocumentRegistry.WidgetExtension {
  createNew(widget: Widget, context: DocumentRegistry.Context): IDisposable {
    return new DisposableDelegate(() => undefined);
  }
}

function createFactory(modelName?: string) {
  return new WidgetFactory({
    name: UUID.uuid4(),
    modelName: modelName || 'text',
    fileTypes: ['text', 'foobar', 'baz'],
    defaultFor: ['text', 'foobar'],
    defaultRendered: ['baz']
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
      registry.addFileType({
        name: 'baz',
        extensions: ['.baz']
      });
    });

    afterEach(() => {
      registry.dispose();
    });

    describe('#isDisposed', () => {
      it('should get whether the registry has been disposed', () => {
        expect(registry.isDisposed).to.equal(false);
        registry.dispose();
        expect(registry.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the registry', () => {
        registry.addFileType({ name: 'notebook', extensions: ['.ipynb'] });
        registry.dispose();
        expect(registry.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        registry.dispose();
        registry.dispose();
        expect(registry.isDisposed).to.equal(true);
      });
    });

    describe('#addWidgetFactory()', () => {
      it('should add the widget factory to the registry', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.getWidgetFactory(factory.name)).to.equal(factory);
        expect(registry.getWidgetFactory(factory.name.toUpperCase())).to.equal(
          factory
        );
      });

      it('should become the global default if `*` is given as a defaultFor', () => {
        const factory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.equal('global');
      });

      it('should override an existing global default', () => {
        registry.addWidgetFactory(
          new WidgetFactory({
            name: 'global',
            fileTypes: ['*'],
            defaultFor: ['*']
          })
        );
        const factory = new WidgetFactory({
          name: 'bar',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('*').name).to.equal('bar');
      });

      it('should override an existing extension default', () => {
        registry.addWidgetFactory(createFactory());
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.equal(factory);
      });

      it('should be removed from the registry when disposed', () => {
        const factory = createFactory();
        const disposable = registry.addWidgetFactory(factory);
        disposable.dispose();
        expect(registry.getWidgetFactory('test')).to.be.undefined;
      });

      it('should throw for an invalid factory name', () => {
        expect(() => {
          registry.addWidgetFactory(
            new WidgetFactory({
              name: 'default',
              fileTypes: [],
              defaultFor: []
            })
          );
        }).to.throw(/Invalid/);
        expect(() => {
          registry.addWidgetFactory(
            new WidgetFactory({
              name: '',
              fileTypes: [],
              defaultFor: []
            })
          );
        }).to.throw(/Invalid/);
      });
    });

    describe('#addModelFactory()', () => {
      it('should add the model factory to the registry', () => {
        const factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
      });

      it('should be a no-op a factory with the given `name` is already registered', () => {
        const factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
        const disposable = registry.addModelFactory(new Base64ModelFactory());
        disposable.dispose();
      });

      it('should be a no-op if the same factory is already registered', () => {
        const factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
        const disposable = registry.addModelFactory(factory);
        disposable.dispose();
      });

      it('should be removed from the registry when disposed', () => {
        const factory = new Base64ModelFactory();
        const disposable = registry.addModelFactory(factory);
        disposable.dispose();
      });
    });

    describe('#addWidgetExtension()', () => {
      it('should add a widget extension to the registry', () => {
        const extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        expect(registry.widgetExtensions('foo').next()).to.equal(extension);
      });

      it('should be a no-op if the extension is already registered for a given widget factory', () => {
        const extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        const disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(registry.widgetExtensions('foo').next()).to.equal(extension);
      });

      it('should be removed from the registry when disposed', () => {
        const extension = new WidgetExtension();
        const disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(toArray(registry.widgetExtensions('foo')).length).to.equal(0);
      });
    });

    describe('#addFileType()', () => {
      it('should add a file type to the document registry', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        expect(registry.fileTypes().next()!.name).to.equal(fileType.name);
      });

      it('should be removed from the registry when disposed', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        const disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(toArray(registry.fileTypes()).length).to.equal(0);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        const disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.fileTypes().next()!.name).to.equal(fileType.name);
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
        expect(
          toArray(registry.preferredWidgetFactories('foo.txt'))
        ).to.deep.equal([]);
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        const factories = registry.preferredWidgetFactories('a.foo.bar');
        expect(toArray(factories)).to.deep.equal([factory, gFactory]);
      });

      it('should not list a factory whose model is not registered', () => {
        registry.addWidgetFactory(createFactory('foobar'));
        expect(
          registry.preferredWidgetFactories('a.foo.bar').length
        ).to.deep.equal(0);
      });

      it('should select the factory for a given extension', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.preferredWidgetFactories('a.txt')[0]).to.equal(factory);
        expect(registry.preferredWidgetFactories('a.md')[0]).to.equal(
          mdFactory
        );
      });

      it('should respect the priority order', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        const factories = registry.preferredWidgetFactories('a.txt');
        expect(toArray(factories)).to.deep.equal([factory, gFactory]);
      });

      it('should list a default rendered factory after the default factory', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          defaultRendered: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);

        const factories = registry.preferredWidgetFactories('a.md');
        expect(factories).to.deep.equal([mdFactory, gFactory]);
      });

      it('should handle multi-part extensions', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const tFactory = new WidgetFactory({
          name: 'table',
          fileTypes: ['tablejson']
        });
        registry.addWidgetFactory(tFactory);
        const jFactory = new WidgetFactory({
          name: 'json',
          fileTypes: ['json']
        });
        registry.addWidgetFactory(jFactory);
        let factories = registry.preferredWidgetFactories('foo.table.json');
        expect(toArray(factories)).to.deep.equal([tFactory, jFactory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(toArray(factories)).to.deep.equal([jFactory]);
      });

      it('should handle just a multi-part extension', () => {
        const factory = new WidgetFactory({
          name: 'table',
          fileTypes: ['tablejson']
        });
        registry.addWidgetFactory(factory);
        let factories = registry.preferredWidgetFactories('foo.table.json');
        expect(toArray(factories)).to.deep.equal([factory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(toArray(factories)).to.deep.equal([]);
      });
    });

    describe('#defaultWidgetFactory()', () => {
      it('should get the default widget factory for a given extension', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          defaultFor: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.equal(factory);
        expect(registry.defaultWidgetFactory('a.md')).to.equal(mdFactory);
        expect(registry.defaultWidgetFactory()).to.equal(gFactory);
      });
    });

    describe('#setDefaultWidgetFactory()', () => {
      it('should override the default widget factory for a file type', () => {
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown', 'foobar'],
          defaultFor: []
        });
        registry.addWidgetFactory(mdFactory);
        registry.setDefaultWidgetFactory('foobar', 'markdown');
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.equal(mdFactory);
      });

      it('should revert to the default widget factory when unset', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown', 'foobar'],
          defaultFor: []
        });
        registry.addWidgetFactory(mdFactory);
        registry.setDefaultWidgetFactory('foobar', 'markdown');
        registry.setDefaultWidgetFactory('foobar', undefined);
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.equal(factory);
      });

      it('should throw if the factory or file type do not exist', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(() => {
          registry.setDefaultWidgetFactory('foobar', 'fake');
        }).to.throw(/Cannot find/);
        expect(() => {
          registry.setDefaultWidgetFactory('fake', undefined);
        }).to.throw(/Cannot find/);
      });

      it('should throw if the factory cannot render a file type', () => {
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          defaultFor: []
        });
        registry.addWidgetFactory(mdFactory);
        expect(() => {
          registry.setDefaultWidgetFactory('foobar', 'markdown');
        }).to.throw(/cannot view/);
      });

      it('should revert to the default widget factory if the override is removed', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown', 'foobar'],
          defaultFor: []
        });
        const disposable = registry.addWidgetFactory(mdFactory);
        registry.setDefaultWidgetFactory('foobar', 'markdown');
        disposable.dispose();
        expect(registry.defaultWidgetFactory('a.foo.bar')).to.equal(factory);
      });
    });

    describe('#defaultRenderedWidgetFactory()', () => {
      it('should get the default rendered widget factory for a given extension', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown'],
          defaultRendered: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.defaultRenderedWidgetFactory('a.baz')).to.equal(
          factory
        );
        expect(registry.defaultRenderedWidgetFactory('a.md')).to.equal(
          mdFactory
        );
      });

      it('should get the default widget factory if no default rendered factory is registered', () => {
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        expect(registry.defaultRenderedWidgetFactory('a.md')).to.equal(
          gFactory
        );
      });
    });

    describe('#fileTypes()', () => {
      it('should get the registered file types', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        expect(toArray(registry.fileTypes()).length).to.equal(0);
        const fileTypes = [
          { name: 'notebook', extensions: ['.ipynb'] },
          { name: 'python', extensions: ['.py'] },
          { name: 'table', extensions: ['.table.json'] }
        ];
        registry.addFileType(fileTypes[0]);
        registry.addFileType(fileTypes[1]);
        registry.addFileType(fileTypes[2]);
        const values = registry.fileTypes();
        expect(values.next()!.name).to.equal(fileTypes[0].name);
        expect(values.next()!.name).to.equal(fileTypes[1].name);
        expect(values.next()!.name).to.equal(fileTypes[2].name);
      });
    });

    describe('#getFileType()', () => {
      it('should get a file type by name', () => {
        expect(registry.getFileType('notebook')).to.be.ok;
        expect(registry.getFileType('python')).to.be.ok;
        expect(registry.getFileType('fizzbuzz')).to.be.undefined;
      });
    });

    describe('#getKernelPreference()', () => {
      it('should get a kernel preference', () => {
        registry.addWidgetFactory(createFactory());
        registry.addWidgetFactory(
          new WidgetFactory({
            name: 'python',
            fileTypes: ['python'],
            preferKernel: true,
            canStartKernel: true
          })
        );
        registry.addWidgetFactory(
          new WidgetFactory({
            name: 'global',
            fileTypes: ['*'],
            defaultFor: ['*']
          })
        );
        let pref = registry.getKernelPreference('.c', 'global');
        expect(pref!.language).to.equal('clike');
        expect(pref!.shouldStart).to.equal(false);
        expect(pref!.canStart).to.equal(false);

        pref = registry.getKernelPreference('.py', 'python');
        expect(pref!.language).to.equal('python');
        expect(pref!.shouldStart).to.equal(true);
        expect(pref!.canStart).to.equal(true);

        pref = registry.getKernelPreference('.py', 'baz');
        expect(pref).to.be.undefined;
      });
    });

    describe('#getModelFactory()', () => {
      it('should get a registered model factory by name', () => {
        const mFactory = new Base64ModelFactory();
        registry.addModelFactory(mFactory);
        expect(registry.getModelFactory('base64')).to.equal(mFactory);
      });
    });

    describe('#getWidgetFactory()', () => {
      it('should get a widget factory by name', () => {
        registry.addModelFactory(new Base64ModelFactory());
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.getWidgetFactory(factory.name)).to.equal(factory);
        expect(registry.getWidgetFactory('markdown')).to.equal(mdFactory);
        expect(registry.getWidgetFactory('baz')).to.be.undefined;
      });
    });

    describe('#widgetExtensions()', () => {
      it('should get the registered extensions for a given widget', () => {
        const foo = new WidgetExtension();
        const bar = new WidgetExtension();
        registry.addWidgetExtension('fizz', foo);
        registry.addWidgetExtension('fizz', bar);
        registry.addWidgetExtension('buzz', foo);
        const fizz = toArray(registry.widgetExtensions('fizz'));
        expect(fizz[0]).to.equal(foo);
        expect(fizz[1]).to.equal(bar);
        expect(fizz.length).to.equal(2);
        const buzz = toArray(registry.widgetExtensions('buzz'));
        expect(buzz[0]).to.equal(foo);
        expect(toArray(buzz).length).to.equal(1);
        expect(registry.widgetExtensions('baz').next()).to.be.undefined;
      });
    });

    describe('#getFileTypeForModel()', () => {
      beforeEach(() => {
        DocumentRegistry.defaultFileTypes.forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a directory', () => {
        const ft = registry.getFileTypeForModel({
          type: 'directory'
        });
        expect(ft.name).to.equal('directory');
      });

      it('should handle a notebook', () => {
        const ft = registry.getFileTypeForModel({
          type: 'notebook'
        });
        expect(ft.name).to.equal('notebook');
      });

      it('should handle a python file', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.py'
        });
        expect(ft.name).to.equal('python');
      });

      it('should handle an unknown file', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.bar'
        });
        expect(ft.name).to.equal('text');
      });

      it('should get the most specific extension', () => {
        [
          { name: 'json', extensions: ['.json'] },
          { name: 'vega', extensions: ['.vg.json'] }
        ].forEach(ft => {
          registry.addFileType(ft);
        });
        const ft = registry.getFileTypeForModel({
          name: 'foo.vg.json'
        });
        expect(ft.name).to.equal('vega');
      });

      it('should be case insensitive', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.PY'
        });
        expect(ft.name).to.equal('python');
      });
    });

    describe('#getFileTypesForPath()', () => {
      beforeEach(() => {
        DocumentRegistry.defaultFileTypes.forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a notebook', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.ipynb');
        expect(ft[0].name).to.equal('notebook');
      });

      it('should handle a python file', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.py');
        expect(ft[0].name).to.equal('python');
      });

      it('should return an empty list for an unknown file', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.weird');
        expect(ft.length).to.equal(0);
      });

      it('should get the most specific extension first', () => {
        [
          { name: 'json', extensions: ['.json'] },
          { name: 'vega', extensions: ['.vg.json'] }
        ].forEach(ft => {
          registry.addFileType(ft);
        });
        const ft = registry.getFileTypesForPath('foo/bar/baz.vg.json');
        expect(ft[0].name).to.equal('vega');
        expect(ft[1].name).to.equal('json');
      });

      it('should be case insensitive', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.PY');
        expect(ft[0].name).to.equal('python');
      });
    });
  });
});
