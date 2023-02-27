// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  EditorExtensionRegistry,
  ExtensionsHandler
} from '@jupyterlab/codemirror';
import { signalToPromise } from '@jupyterlab/coreutils';

describe('@jupyterlab/codemirror', () => {
  describe('EditorExtensionRegistry', () => {
    function createRegistry(): EditorExtensionRegistry {
      const extensions = new EditorExtensionRegistry();

      EditorExtensionRegistry.getDefaultExtensions()
        .filter(extension =>
          [
            // User configurable extension
            'lineNumbers',
            // Programmatic configurable extension
            'readOnly'
          ].includes(extension.name)
        )
        .forEach(extension => {
          extensions.addExtension(extension);
        });

      extensions.addExtension({
        name: 'immutable',
        factory: () => EditorExtensionRegistry.createImmutableExtension([])
      });
      return extensions;
    }

    describe('baseConfiguration', () => {
      it('should return the default configuration by default', () => {
        const registry = createRegistry();

        expect(registry.baseConfiguration).toEqual({
          lineNumbers: true,
          readOnly: false
        });
      });

      it('should override the default configuration', () => {
        const registry = createRegistry();
        registry.baseConfiguration = { readOnly: true };
        expect(registry.baseConfiguration).toEqual({
          lineNumbers: true,
          readOnly: true
        });
      });
    });

    describe('defaultConfiguration', () => {
      it('should return the default configuration', () => {
        const registry = createRegistry();

        expect(registry.defaultConfiguration).toEqual({
          lineNumbers: true,
          readOnly: false
        });
      });
    });

    describe('settingsSchema', () => {
      it('should return the configurable json schema', () => {
        const registry = createRegistry();

        expect(registry.settingsSchema).toEqual({
          lineNumbers: {
            type: 'boolean',
            title: 'Line Numbers',
            default: true
          }
        });
      });

      it('should have schema default if defined', () => {
        const registry = new EditorExtensionRegistry();
        registry.addExtension({
          name: 'dummy',
          default: true,
          factory: () =>
            EditorExtensionRegistry.createConfigurableExtension(v => []),
          schema: {
            type: 'boolean',
            default: false
          }
        });

        expect(registry.settingsSchema).toEqual({
          dummy: {
            type: 'boolean',
            default: false
          }
        });
      });

      it('should have null as default if undefined', () => {
        const registry = new EditorExtensionRegistry();
        registry.addExtension({
          name: 'dummy',
          factory: () =>
            EditorExtensionRegistry.createConfigurableExtension(v => []),
          schema: {
            type: ['string', 'null']
          }
        });

        expect(registry.settingsSchema).toEqual({
          dummy: {
            type: ['string', 'null'],
            default: null
          }
        });
      });
    });

    describe('#addExtension', () => {
      it('should add a configurable extension factory', () => {
        const registry = new EditorExtensionRegistry();
        registry.addExtension({
          name: 'dummy',
          default: true,
          factory: () =>
            EditorExtensionRegistry.createConfigurableExtension(v => [])
        });

        expect(
          registry
            .createNew({ inline: false, model: {} as CodeEditor.IModel })
            .hasOption('dummy')
        ).toEqual(true);
      });

      it('should add an immutable extension factory', () => {
        const registry = new EditorExtensionRegistry();
        registry.addExtension({
          name: 'dummy',
          factory: () =>
            EditorExtensionRegistry.createConfigurableExtension(v => [])
        });

        const handler = registry.createNew({
          inline: false,
          model: {} as CodeEditor.IModel
        });
        expect(handler.hasOption('dummy')).toEqual(false);
        expect(handler.getInitialExtensions()).toHaveLength(1);
      });

      it('should raise if an extension with the same name already exists', () => {
        const registry = new EditorExtensionRegistry();
        registry.addExtension({
          name: 'dummy',
          factory: () =>
            EditorExtensionRegistry.createConfigurableExtension(v => [])
        });

        expect(() => {
          registry.addExtension({
            name: 'dummy',
            factory: () =>
              EditorExtensionRegistry.createConfigurableExtension(v => [])
          });
        }).toThrow();
      });
    });

    describe('#createNew', () => {
      it('should create a extension handler', () => {
        const registry = createRegistry();

        const handler = registry.createNew({
          inline: false,
          model: {} as CodeEditor.IModel
        });

        expect(handler.getOption('lineNumbers')).toEqual(true);
        expect(handler.getOption('readOnly')).toEqual(false);
        expect(handler.hasOption('immutable')).toEqual(false);
      });

      it('should create a extension handler with custom configuration', () => {
        const registry = createRegistry();
        registry.baseConfiguration = {
          lineNumbers: true,
          readOnly: true
        };
        const handler = registry.createNew({
          inline: false,
          model: {} as CodeEditor.IModel,
          config: {
            lineNumbers: false
          }
        });

        expect(handler.getOption('lineNumbers')).toEqual(false);
        expect(handler.getOption('readOnly')).toEqual(true);
        expect(handler.hasOption('immutable')).toEqual(false);
      });
    });
  });

  describe('ExtensionsHandler', () => {
    function createHandler(config?: Record<string, any>) {
      return new ExtensionsHandler({
        baseConfiguration: {
          lineNumbers: true,
          readOnly: false
        },
        config,
        defaultExtensions: [
          [
            'lineNumbers',
            EditorExtensionRegistry.createConditionalExtension([])
          ],
          ['readOnly', EditorExtensionRegistry.createConditionalExtension([])],
          ['immutable', EditorExtensionRegistry.createImmutableExtension([])]
        ]
      });
    }
    describe('#constructor', () => {
      it('should accept no options', () => {
        const handler = new ExtensionsHandler();

        expect(handler).toBeInstanceOf(ExtensionsHandler);
      });

      it('should accept options', () => {
        const handler = createHandler({
          lineNumbers: false
        });

        expect(handler.getOption('lineNumbers')).toEqual(false);
        expect(handler.getOption('readOnly')).toEqual(false);
        expect(handler.hasOption('immutable')).toEqual(false);

        expect(handler.getInitialExtensions()).toHaveLength(3);
      });
    });

    describe('#configChanged', () => {
      it('should be emitted when an option change', async () => {
        const handler = createHandler();
        const configChanged = signalToPromise(handler.configChanged);
        handler.setOption('lineNumbers', false);

        const [_, args] = await configChanged;
        expect(args).toEqual({ lineNumbers: false });
      });
      it('should be emitted when some base options change', async () => {
        const handler = createHandler();
        const configChanged = signalToPromise(handler.configChanged);
        handler.setBaseOptions({ lineNumbers: false, readOnly: true });
        const [_, args] = await configChanged;
        expect(args).toEqual({
          lineNumbers: false,
          readOnly: true
        });
      });
      it('should be emitted when some options change', async () => {
        const handler = createHandler();
        const configChanged = signalToPromise(handler.configChanged);
        handler.setOptions({ lineNumbers: false, readOnly: true });
        const [_, args] = await configChanged;
        expect(args).toEqual({
          lineNumbers: false,
          readOnly: true
        });
      });
    });

    describe('#disposed', () => {
      it('should be emitted when the handler is disposed', async () => {
        const handler = new ExtensionsHandler();

        const disposed = signalToPromise(handler.disposed);
        handler.dispose();
        await disposed;

        expect(handler.isDisposed).toEqual(true);
      });
    });

    describe('#isDisposed', () => {
      it('should be false by default', () => {
        const handler = new ExtensionsHandler();

        expect(handler.isDisposed).toEqual(false);
      });

      it('should be true when the handler is disposed', async () => {
        const handler = new ExtensionsHandler();

        const disposed = signalToPromise(handler.disposed);
        handler.dispose();
        await disposed;

        expect(handler.isDisposed).toEqual(true);
      });
    });

    describe('#dispose', () => {
      it('should dispose the resources of the handler', () => {
        const handler = new ExtensionsHandler();
        handler.dispose();
        expect(handler.isDisposed).toEqual(true);
      });
    });

    describe('#getOption', () => {
      it('should return the value of an option', () => {
        const handler = createHandler();

        expect(handler.getOption('lineNumbers')).toEqual(true);
      });

      it('should return undefined if the option does not exist', () => {
        const handler = new ExtensionsHandler();

        expect(handler.getOption('lineNumbers')).toBeUndefined();
      });
    });

    describe('#hasOption', () => {
      it('should return true if an option exists', () => {
        const handler = createHandler();

        expect(handler.hasOption('lineNumbers')).toEqual(true);
      });

      it('should return false if the option does not exist', () => {
        const handler = new ExtensionsHandler();

        expect(handler.hasOption('lineNumbers')).toEqual(false);
      });
    });

    describe('#setOption', () => {
      it('should set an option and emit a signal', async () => {
        const handler = createHandler();

        const configChanged = signalToPromise(handler.configChanged);
        handler.setOption('lineNumbers', false);

        const [_, args] = await configChanged;
        expect(args).toEqual({ lineNumbers: false });
      });
    });

    describe('#setBaseOptions', () => {
      it('should set the base options and emit a signal', async () => {
        const handler = createHandler();

        const configChanged = signalToPromise(handler.configChanged);
        handler.setBaseOptions({ lineNumbers: false });

        const [_, args] = await configChanged;
        expect(args).toEqual({
          lineNumbers: false,
          // The signal will emit removed option with `undefined` value
          readOnly: undefined
        });
      });
    });

    describe('#setOptions', () => {
      it('should set the options and emit a signal', async () => {
        const handler = createHandler({ readOnly: true });

        const configChanged = signalToPromise(handler.configChanged);
        handler.setOptions({ lineNumbers: false });

        const [_, args] = await configChanged;
        expect(args).toEqual({
          lineNumbers: false,
          // The signal will emit removed option with base configuration value
          readOnly: false
        });
      });
    });

    describe('#getInitialExtensions', () => {
      it('should return the list of initial editor extensions', () => {
        const handler = createHandler();

        expect(handler.getInitialExtensions()).toHaveLength(3);
      });
    });
  });
});
