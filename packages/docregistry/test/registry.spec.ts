// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ABCWidgetFactory,
  Base64ModelFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { UUID } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';

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
        expect(registry.isDisposed).toBe(false);
        registry.dispose();
        expect(registry.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the registry', () => {
        registry.addFileType({ name: 'notebook', extensions: ['.ipynb'] });
        registry.dispose();
        expect(registry.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        registry.dispose();
        registry.dispose();
        expect(registry.isDisposed).toBe(true);
      });
    });

    describe('#addWidgetFactory()', () => {
      it('should add the widget factory to the registry', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.getWidgetFactory(factory.name)).toBe(factory);
        expect(registry.getWidgetFactory(factory.name.toUpperCase())).toBe(
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
        expect(registry.defaultWidgetFactory('*').name).toBe('global');
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
        expect(registry.defaultWidgetFactory('*').name).toBe('bar');
      });

      it('should override an existing extension default', () => {
        registry.addWidgetFactory(createFactory());
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(registry.defaultWidgetFactory('a.foo.bar')).toBe(factory);
      });

      it('should be removed from the registry when disposed', () => {
        const factory = createFactory();
        const disposable = registry.addWidgetFactory(factory);
        disposable.dispose();
        expect(registry.getWidgetFactory('test')).toBeUndefined();
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
        }).toThrow(/Invalid/);
        expect(() => {
          registry.addWidgetFactory(
            new WidgetFactory({
              name: '',
              fileTypes: [],
              defaultFor: []
            })
          );
        }).toThrow(/Invalid/);
      });
    });

    describe('#addModelFactory()', () => {
      it('should add the model factory to the registry', () => {
        const factory = new Base64ModelFactory();
        expect(() => {
          registry.addModelFactory(factory);
        }).not.toThrow();
      });

      it('should be a no-op a factory with the given `name` is already registered', () => {
        const factory = new Base64ModelFactory();
        registry.addModelFactory(factory);

        expect(() => {
          const disposable = registry.addModelFactory(new Base64ModelFactory());
          disposable.dispose();
        }).not.toThrow();
      });

      it('should be a no-op if the same factory is already registered', () => {
        const factory = new Base64ModelFactory();
        registry.addModelFactory(factory);
        expect(() => {
          const disposable = registry.addModelFactory(factory);
          disposable.dispose();
        }).not.toThrow();
      });

      it('should be removed from the registry when disposed', () => {
        const factory = new Base64ModelFactory();
        expect(() => {
          const disposable = registry.addModelFactory(factory);
          disposable.dispose();
        }).not.toThrow();
      });
    });

    describe('#addWidgetExtension()', () => {
      it('should add a widget extension to the registry', () => {
        const extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        expect(registry.widgetExtensions('foo').next().value).toBe(extension);
      });

      it('should be a no-op if the extension is already registered for a given widget factory', () => {
        const extension = new WidgetExtension();
        registry.addWidgetExtension('foo', extension);
        const disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(registry.widgetExtensions('foo').next().value).toBe(extension);
      });

      it('should be removed from the registry when disposed', () => {
        const extension = new WidgetExtension();
        const disposable = registry.addWidgetExtension('foo', extension);
        disposable.dispose();
        expect(Array.from(registry.widgetExtensions('foo')).length).toBe(0);
      });
    });

    describe('#addFileType()', () => {
      it('should add a file type to the document registry', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        expect(registry.fileTypes().next().value.name).toBe(fileType.name);
      });

      it('should be removed from the registry when disposed', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        const disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(Array.from(registry.fileTypes()).length).toBe(0);
      });

      it('should be a no-op if a file type of the same name is registered', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const fileType = { name: 'notebook', extensions: ['.ipynb'] };
        registry.addFileType(fileType);
        const disposable = registry.addFileType(fileType);
        disposable.dispose();
        expect(registry.fileTypes().next().value.name).toBe(fileType.name);
      });

      it('should add a file type to some factories', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);

        expect(registry.defaultWidgetFactory('dummy.test').name).toEqual(
          gFactory.name
        );

        const fileType = { name: 'test-file', extensions: ['.test'] };
        registry.addFileType(fileType, [factory.name]);
        expect(registry.defaultWidgetFactory('dummy.test').name).toEqual(
          factory.name
        );
      });

      it('should add a file type to some factories without changing the default', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);

        expect(registry.defaultWidgetFactory('dummy.foo.bar').name).toEqual(
          factory.name
        );

        const newFactory = new WidgetFactory({
          name: 'new-factory',
          fileTypes: ['new-foobar']
        });
        registry.addWidgetFactory(newFactory);

        const fileType = { name: 'test-file', extensions: ['.foo.bar'] };
        registry.addFileType(fileType, [newFactory.name]);

        expect(registry.defaultWidgetFactory('dummy.foo.bar').name).toEqual(
          factory.name
        );
        expect(
          registry.preferredWidgetFactories('dummy.foo.bar').map(f => f.name)
        ).toContain(newFactory.name);
      });

      it('should remove the link to factory when disposed', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);

        const fileType = { name: 'test-file', extensions: ['.test'] };
        const disposable = registry.addFileType(fileType, [factory.name]);

        disposable.dispose();

        expect(registry.defaultWidgetFactory('dummy.test').name).toBe(
          gFactory.name
        );
      });

      it('should remove the link to factory when disposed without changing the default', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);

        const newFactory = new WidgetFactory({
          name: 'new-factory',
          fileTypes: ['new-foobar']
        });
        registry.addWidgetFactory(newFactory);

        const fileType = { name: 'test-file', extensions: ['.foo.bar'] };
        const disposable = registry.addFileType(fileType, [newFactory.name]);

        disposable.dispose();

        expect(registry.defaultWidgetFactory('dummy.foo.bar').name).toEqual(
          factory.name
        );
        expect(
          registry.preferredWidgetFactories('dummy.foo.bar').map(f => f.name)
        ).not.toContain(newFactory.name);
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
          Array.from(registry.preferredWidgetFactories('foo.txt'))
        ).toEqual([]);
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        const factories = registry.preferredWidgetFactories('a.foo.bar');
        expect(Array.from(factories)).toEqual([factory, gFactory]);
      });

      it('should not list a factory whose model is not registered', () => {
        registry.addWidgetFactory(createFactory('foobar'));
        expect(registry.preferredWidgetFactories('a.foo.bar').length).toEqual(
          0
        );
      });

      it('should select the factory for a given extension', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown']
        });
        registry.addWidgetFactory(mdFactory);
        expect(registry.preferredWidgetFactories('a.txt')[0]).toBe(factory);
        expect(registry.preferredWidgetFactories('a.md')[0]).toBe(mdFactory);
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
        expect(Array.from(factories)).toEqual([factory, gFactory]);
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
        expect(factories).toEqual([mdFactory, gFactory]);
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
        expect(Array.from(factories)).toEqual([tFactory, jFactory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(Array.from(factories)).toEqual([jFactory]);
      });

      it('should handle just a multi-part extension', () => {
        const factory = new WidgetFactory({
          name: 'table',
          fileTypes: ['tablejson']
        });
        registry.addWidgetFactory(factory);
        let factories = registry.preferredWidgetFactories('foo.table.json');
        expect(Array.from(factories)).toEqual([factory]);
        factories = registry.preferredWidgetFactories('foo.json');
        expect(Array.from(factories)).toEqual([]);
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
        expect(registry.defaultWidgetFactory('a.foo.bar')).toBe(factory);
        expect(registry.defaultWidgetFactory('a.md')).toBe(mdFactory);
        expect(registry.defaultWidgetFactory()).toBe(gFactory);
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
        expect(registry.defaultWidgetFactory('a.foo.bar')).toBe(mdFactory);
      });

      it('should override the default rendered widget factory for a file type', () => {
        const mdFactory = new WidgetFactory({
          name: 'markdown',
          fileTypes: ['markdown', 'foobar'],
          defaultFor: []
        });
        registry.addWidgetFactory(mdFactory);
        registry.setDefaultWidgetFactory('foobar', 'markdown');
        expect(registry.defaultRenderedWidgetFactory('a.foo.bar')).toBe(
          mdFactory
        );
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
        expect(registry.defaultWidgetFactory('a.foo.bar')).toBe(factory);
      });

      it('should throw if the factory or file type do not exist', () => {
        const factory = createFactory();
        registry.addWidgetFactory(factory);
        expect(() => {
          registry.setDefaultWidgetFactory('foobar', 'fake');
        }).toThrow(/Cannot find/);
        expect(() => {
          registry.setDefaultWidgetFactory('fake', undefined);
        }).toThrow(/Cannot find/);
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
        }).toThrow(/cannot view/);
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
        expect(registry.defaultWidgetFactory('a.foo.bar')).toBe(factory);
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
        expect(registry.defaultRenderedWidgetFactory('a.baz')).toBe(factory);
        expect(registry.defaultRenderedWidgetFactory('a.md')).toBe(mdFactory);
      });

      it('should get the default widget factory if no default rendered factory is registered', () => {
        const gFactory = new WidgetFactory({
          name: 'global',
          fileTypes: ['*'],
          defaultFor: ['*']
        });
        registry.addWidgetFactory(gFactory);
        expect(registry.defaultRenderedWidgetFactory('a.md')).toBe(gFactory);
      });
    });

    describe('#fileTypes()', () => {
      it('should get the registered file types', () => {
        registry = new DocumentRegistry({ initialFileTypes: [] });
        expect(Array.from(registry.fileTypes()).length).toBe(0);
        const fileTypes = [
          { name: 'notebook', extensions: ['.ipynb'] },
          { name: 'python', extensions: ['.py'] },
          { name: 'table', extensions: ['.table.json'] }
        ];
        registry.addFileType(fileTypes[0]);
        registry.addFileType(fileTypes[1]);
        registry.addFileType(fileTypes[2]);
        const values = registry.fileTypes();
        expect(values.next().value.name).toBe(fileTypes[0].name);
        expect(values.next().value.name).toBe(fileTypes[1].name);
        expect(values.next().value.name).toBe(fileTypes[2].name);
      });
    });

    describe('#getFileType()', () => {
      it('should get a file type by name', () => {
        expect(registry.getFileType('notebook')).toBeTruthy();
        expect(registry.getFileType('python')).toBeTruthy();
        expect(registry.getFileType('fizzbuzz')).toBeUndefined();
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
        expect(pref!.shouldStart).toBe(false);
        expect(pref!.canStart).toBe(false);

        pref = registry.getKernelPreference('.py', 'python');
        expect(pref!.shouldStart).toBe(true);
        expect(pref!.canStart).toBe(true);

        pref = registry.getKernelPreference('.py', 'baz');
        expect(pref).toBeUndefined();
      });
    });

    describe('#getModelFactory()', () => {
      it('should get a registered model factory by name', () => {
        const mFactory = new Base64ModelFactory();
        registry.addModelFactory(mFactory);
        expect(registry.getModelFactory('base64')).toBe(mFactory);
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
        expect(registry.getWidgetFactory(factory.name)).toBe(factory);
        expect(registry.getWidgetFactory('markdown')).toBe(mdFactory);
        expect(registry.getWidgetFactory('baz')).toBeUndefined();
      });
    });

    describe('#widgetExtensions()', () => {
      it('should get the registered extensions for a given widget', () => {
        const foo = new WidgetExtension();
        const bar = new WidgetExtension();
        registry.addWidgetExtension('fizz', foo);
        registry.addWidgetExtension('fizz', bar);
        registry.addWidgetExtension('buzz', foo);
        const fizz = Array.from(registry.widgetExtensions('fizz'));
        expect(fizz[0]).toBe(foo);
        expect(fizz[1]).toBe(bar);
        expect(fizz.length).toBe(2);
        const buzz = Array.from(registry.widgetExtensions('buzz'));
        expect(buzz[0]).toBe(foo);
        expect(Array.from(buzz).length).toBe(1);
        expect(registry.widgetExtensions('baz').next().done).toBe(true);
      });
    });

    describe('#getFileTypeForModel()', () => {
      beforeEach(() => {
        DocumentRegistry.getDefaultFileTypes().forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a directory', () => {
        const ft = registry.getFileTypeForModel({
          type: 'directory'
        });
        expect(ft.name).toBe('directory');
      });

      it('should handle a notebook', () => {
        const ft = registry.getFileTypeForModel({
          type: 'notebook'
        });
        expect(ft.name).toBe('notebook');
      });

      it('should allow to customise filetype for directory', () => {
        registry.addFileType({
          name: 'node_module',
          contentType: 'directory',
          pattern: '^node_modules$'
        });
        const regularDirectoryFt = registry.getFileTypeForModel({
          path: '/foo',
          type: 'directory'
        });
        expect(regularDirectoryFt.name).toBe('directory');
        const nodeModuleFt = registry.getFileTypeForModel({
          path: '/foo/node_modules',
          type: 'directory'
        });
        expect(nodeModuleFt.name).toBe('node_module');
      });

      it('should allow to customise filetype for notebook', () => {
        registry.addFileType({
          name: 'test_ipynb',
          contentType: 'notebook',
          pattern: '^test.ipynb$'
        });
        const regularNotebookFt = registry.getFileTypeForModel({
          name: 'foo.ipynb',
          type: 'notebook'
        });
        expect(regularNotebookFt.name).toBe('notebook');
        const customNotebookType = registry.getFileTypeForModel({
          path: 'test.ipynb',
          type: 'notebook'
        });
        expect(customNotebookType.name).toBe('test_ipynb');
      });

      it('should handle a python file', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.py'
        });
        expect(ft.name).toBe('python');
      });

      it('should handle an unknown file', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.bar'
        });
        expect(ft.name).toBe('text');
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
        expect(ft.name).toBe('vega');
      });

      it('should be case insensitive', () => {
        const ft = registry.getFileTypeForModel({
          name: 'foo.PY'
        });
        expect(ft.name).toBe('python');
      });
    });

    describe('#getFileTypesForPath()', () => {
      beforeEach(() => {
        DocumentRegistry.getDefaultFileTypes().forEach(ft => {
          registry.addFileType(ft);
        });
      });

      it('should handle a notebook', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.ipynb');
        expect(ft[0].name).toBe('notebook');
      });

      it('should handle a python file', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.py');
        expect(ft[0].name).toBe('python');
      });

      it('should return an empty list for an unknown file', () => {
        const ft = registry.getFileTypesForPath('foo/bar/baz.weird');
        expect(ft.length).toBe(0);
      });

      it('should get the most specific extension first', () => {
        [
          { name: 'json', extensions: ['.json'] },
          { name: 'vega', extensions: ['.vg.json'] }
        ].forEach(ft => {
          registry.addFileType(ft);
        });
        const ft = registry.getFileTypesForPath('foo/bar/baz.vg.json');
        expect(ft[0].name).toBe('vega');
        expect(ft[1].name).toBe('json');
      });

      it.each([
        ['python', null, 'foo/bar/baz.PY'],
        ['r-markdown', ['.Rmd'], 'foo/bar/baz.Rmd']
      ])('should be case insensitive', (name, extensions, filename) => {
        if (extensions) {
          registry.addFileType({ name, extensions });
        }
        const ft = registry.getFileTypesForPath(filename);
        expect(ft[0].name).toBe(name);
      });

      it('should support pattern matching', () => {
        registry.addFileType({
          name: 'test',
          extensions: ['.temp'],
          pattern: '.*\\.test$'
        });

        const ft = registry.getFileTypesForPath('foo/bar/baz.test');
        expect(ft[0].name).toBe('test');

        const ft2 = registry.getFileTypesForPath('foo/bar/baz.temp');
        expect(ft2[0].name).toBe('test');
      });

      it('should returns all file types', () => {
        registry.addFileType({
          name: 'test',
          extensions: ['.foo.bar']
        });

        const ft = registry.getFileTypesForPath('foo/bar/test.foo.bar');
        expect(ft.length).toBeGreaterThanOrEqual(2);
        expect(ft.map(f => f.name)).toContain('test');
      });
    });
  });
});
