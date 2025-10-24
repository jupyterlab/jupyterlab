// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  createToolbarFactory,
  SessionContext,
  SessionContextDialogs,
  Toolbar,
  ToolbarRegistry,
  ToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { IDataConnector } from '@jupyterlab/statedb';
import { framePromise, JupyterServer } from '@jupyterlab/testing';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt, PromiseDelegate } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';

const DEFAULT_LANGUAGE_CODE = 'en';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/apputils', () => {
  describe('Toolbar', () => {
    describe('Kernel buttons', () => {
      let sessionContext: SessionContext;
      beforeEach(async () => {
        sessionContext = await createSessionContext();
      });

      afterEach(async () => {
        await sessionContext.shutdown();
        sessionContext.dispose();
      });

      describe('.createInterruptButton()', () => {
        it("should add an inline svg node with the 'stop' icon", async () => {
          const button = Toolbar.createInterruptButton(sessionContext);
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='stop']")
          ).toBeDefined();
        });
      });

      describe('.createRestartButton()', () => {
        it("should add an inline svg node with the 'refresh' icon", async () => {
          const button = Toolbar.createRestartButton(
            sessionContext,
            new SessionContextDialogs()
          );
          Widget.attach(button, document.body);
          await framePromise();
          expect(
            button.node.querySelector("[data-icon$='refresh']")
          ).toBeDefined();
        });
      });

      describe('.createKernelNameItem()', () => {
        it("should display the `'display_name'` of the kernel", async () => {
          const item = Toolbar.createKernelNameItem(
            sessionContext,
            new SessionContextDialogs()
          );
          await sessionContext.initialize();
          Widget.attach(item, document.body);
          await framePromise();
          const node = item.node.querySelector('.jp-Toolbar-kernelName')!;
          expect(node.textContent).toBe(sessionContext.kernelDisplayName);
        });
      });

      describe('.createKernelStatusItem()', () => {
        beforeEach(async () => {
          await sessionContext.initialize();
          await sessionContext.session?.kernel?.info;
        });

        it('should display a busy status if the kernel status is busy', async () => {
          const item = Toolbar.createKernelStatusItem(sessionContext);
          let called = false;
          sessionContext.statusChanged.connect((_, status) => {
            if (status === 'busy') {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(
                item.node.querySelector("[data-icon$='circle']")
              ).toBeDefined();
              called = true;
            }
          });
          const future = sessionContext.session!.kernel!.requestExecute({
            code: 'a = 109\na'
          })!;
          await future.done;
          expect(called).toBe(true);
        });

        it('should show the current status in the node title', async () => {
          const item = Toolbar.createKernelStatusItem(sessionContext);
          const status = sessionContext.session?.kernel?.status;
          expect(item.node.title.toLowerCase()).toContain(status);
          let called = false;
          const future = sessionContext.session!.kernel!.requestExecute({
            code: 'a = 1'
          })!;
          future.onIOPub = msg => {
            if (sessionContext.session?.kernel?.status === 'busy') {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(item.node.title.toLowerCase()).toContain('busy');
              called = true;
            }
          };
          await future.done;
          expect(called).toBe(true);
        });

        it('should handle a starting session', async () => {
          await sessionContext.session?.kernel?.info;
          await sessionContext.shutdown();
          sessionContext = await createSessionContext();
          await sessionContext.initialize();
          const item = Toolbar.createKernelStatusItem(sessionContext);
          expect(item.node.title).toBe('Kernel Connecting');
          expect(
            item.node.querySelector("[data-icon$='circle-empty']")
          ).toBeDefined();
          await sessionContext.initialize();
          await sessionContext.session?.kernel?.info;
        });
      });
    });
  });

  describe('ToolbarWidgetRegistry', () => {
    describe('#constructor', () => {
      it('should set a default factory', () => {
        const dummy = jest.fn();
        const registry = new ToolbarWidgetRegistry({
          defaultFactory: dummy
        });

        expect(registry.defaultFactory).toBe(dummy);
      });
    });

    describe('#defaultFactory', () => {
      it('should set a default factory', () => {
        const dummy = jest.fn();
        const dummy2 = jest.fn();
        const registry = new ToolbarWidgetRegistry({
          defaultFactory: dummy
        });

        registry.defaultFactory = dummy2;

        expect(registry.defaultFactory).toBe(dummy2);
      });
    });

    describe('#createWidget', () => {
      it('should call the default factory as fallback', () => {
        const documentWidget = new Widget();
        const dummyWidget = new Widget();
        const dummy = jest.fn().mockReturnValue(dummyWidget);
        const registry = new ToolbarWidgetRegistry({
          defaultFactory: dummy
        });

        const item: ToolbarRegistry.IWidget = {
          name: 'test'
        };

        const widget = registry.createWidget('factory', documentWidget, item);

        expect(widget).toBe(dummyWidget);
        expect(dummy).toHaveBeenCalledWith('factory', documentWidget, item);
      });

      it('should call the registered factory', () => {
        const documentWidget = new Widget();
        const dummyWidget = new Widget();
        const defaultFactory = jest.fn().mockReturnValue(dummyWidget);
        const dummy = jest.fn().mockReturnValue(dummyWidget);
        const registry = new ToolbarWidgetRegistry({
          defaultFactory
        });

        const item: ToolbarRegistry.IWidget = {
          name: 'test'
        };

        registry.addFactory('factory', item.name, dummy);

        const widget = registry.createWidget('factory', documentWidget, item);

        expect(widget).toBe(dummyWidget);
        expect(dummy).toHaveBeenCalledWith(documentWidget);
        expect(defaultFactory).toHaveBeenCalledTimes(0);
      });
    });

    describe('#addFactory', () => {
      it('should return the previous registered factory', () => {
        const defaultFactory = jest.fn();
        const dummy = jest.fn();
        const dummy2 = jest.fn();
        const registry = new ToolbarWidgetRegistry({
          defaultFactory
        });

        const item: ToolbarRegistry.IWidget = {
          name: 'test'
        };

        expect(
          registry.addFactory('factory', item.name, dummy)
        ).toBeUndefined();
        expect(registry.addFactory('factory', item.name, dummy2)).toBe(dummy);
      });
    });
  });

  describe('createToolbarFactory', () => {
    it('should return the toolbar items', async () => {
      const factoryName = 'dummyFactory';
      const pluginId = 'test-plugin:settings';
      const toolbarRegistry = new ToolbarWidgetRegistry({
        defaultFactory: jest.fn()
      });

      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.toolbars': {
            dummyFactory: [
              {
                name: 'insert',
                command: 'notebook:insert-cell-below',
                rank: 20
              },
              { name: 'spacer', type: 'spacer', rank: 100 },
              { name: 'cut', command: 'notebook:cut-cell', rank: 21 },
              {
                name: 'clear-all',
                command: 'notebook:clear-all-cell-outputs',
                rank: 60,
                disabled: true
              }
            ]
          },
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array'
            }
          },
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      const translator: ITranslator = {
        languageCode: DEFAULT_LANGUAGE_CODE,
        load: jest.fn()
      };

      const factory = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        factoryName,
        pluginId,
        translator
      );

      await settingRegistry.load(bar.id);

      const items = factory(new Widget());
      expect(items).toHaveLength(3);
      expect(items.get(0).name).toEqual('insert');
      expect(items.get(1).name).toEqual('cut');
      expect(items.get(2).name).toEqual('spacer');
    });

    it('should update the toolbar items with late settings load', async () => {
      const factoryName = 'dummyFactory';
      const pluginId = 'test-plugin:settings';
      const toolbarRegistry = new ToolbarWidgetRegistry({
        defaultFactory: jest.fn()
      });

      const foo: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: 'foo',
        raw: '{}',
        schema: {
          'jupyter.lab.toolbars': {
            dummyFactory: [
              { name: 'cut', command: 'notebook:cut-cell', rank: 21 },
              { name: 'insert', rank: 40 },
              {
                name: 'clear-all',
                disabled: true
              }
            ]
          },
          type: 'object'
        },
        version: 'test'
      };
      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.toolbars': {
            dummyFactory: [
              {
                name: 'insert',
                command: 'notebook:insert-cell-below',
                rank: 20
              },
              {
                name: 'clear-all',
                command: 'notebook:clear-all-cell-outputs',
                rank: 60
              }
            ]
          },
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array'
            }
          },
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            case foo.id:
              return foo;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      const translator: ITranslator = {
        languageCode: DEFAULT_LANGUAGE_CODE,
        load: jest.fn()
      };

      const factory = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        factoryName,
        pluginId,
        translator
      );

      const barPlugin = await settingRegistry.load(bar.id);
      const baseToolbar = JSONExt.deepCopy(
        barPlugin.composite['toolbar'] as any
      );

      let waitForChange = new PromiseDelegate<void>();
      barPlugin.changed.connect(() => {
        if (
          !JSONExt.deepEqual(baseToolbar, barPlugin.composite['toolbar'] as any)
        ) {
          waitForChange.resolve();
        }
      });
      await settingRegistry.load(foo.id);
      await waitForChange.promise;

      const items = factory(new Widget());
      expect(items).toHaveLength(2);
      expect(items.get(0).name).toEqual('cut');
      expect(items.get(1).name).toEqual('insert');
    });

    it('should be callable multiple times', async () => {
      const factoryName = 'dummyFactory';
      const pluginId = 'test-plugin:settings';
      const toolbarRegistry = new ToolbarWidgetRegistry({
        defaultFactory: jest.fn()
      });

      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.toolbars': {
            dummyFactory: [
              {
                name: 'insert',
                command: 'notebook:insert-cell-below',
                rank: 20
              },
              { name: 'spacer', type: 'spacer', rank: 100 },
              { name: 'cut', command: 'notebook:cut-cell', rank: 21 },
              {
                name: 'clear-all',
                command: 'notebook:clear-all-cell-outputs',
                rank: 60,
                disabled: true
              }
            ]
          },
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array'
            }
          },
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      const translator: ITranslator = {
        languageCode: DEFAULT_LANGUAGE_CODE,
        load: jest.fn()
      };

      const factory = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        factoryName,
        pluginId,
        translator
      );

      const factory2 = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        factoryName,
        pluginId,
        translator
      );

      await settingRegistry.load(bar.id);

      expect(factory(new Widget())).toHaveLength(3);
      expect(factory2(new Widget())).toHaveLength(3);
    });

    it('should update the toolbar items with late item factory', async () => {
      const factoryName = 'dummyFactory';
      const pluginId = 'test-plugin:settings';

      const dummyWidget = new Widget();
      const defaultFactory = jest.fn().mockReturnValue(dummyWidget);

      const textContent = 'This is a test widget';
      const node = document.createElement('div');
      node.textContent = textContent;
      const testWidget = new Widget({ node });
      const itemFactory = jest.fn().mockReturnValue(testWidget);

      const toolbarRegistry = new ToolbarWidgetRegistry({
        defaultFactory: defaultFactory
      });

      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.toolbars': {
            dummyFactory: [
              {
                name: 'test',
                rank: 20
              }
            ]
          },
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array'
            }
          },
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      const translator: ITranslator = {
        languageCode: DEFAULT_LANGUAGE_CODE,
        load: jest.fn()
      };

      const factory = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        factoryName,
        pluginId,
        translator
      );

      await settingRegistry.load(bar.id);

      const toolbar = factory(new Widget());

      // Should contain the defaultFactory widget
      expect(toolbar).toHaveLength(1);
      expect(toolbar.get(0).widget.node.textContent).not.toContain(textContent);

      // Add a factory item to the toolbar should re-render the widget.
      toolbarRegistry.addFactory(factoryName, 'test', itemFactory);
      expect(toolbar).toHaveLength(1);
      expect(toolbar.get(0).widget.node.textContent).toContain(textContent);
    });
  });
});
