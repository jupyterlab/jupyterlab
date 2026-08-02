// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PluginList } from '../src/pluginlist';
import { signalToPromise } from '@jupyterlab/coreutils';
import { framePromise, simulate } from '@jupyterlab/testing';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { updateFilterFunction } from '@jupyterlab/ui-components';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { TestConnector, TestRegistry } from './utils';

const ENTRY_QUERY = '.jp-PluginList-entry';

function entries(list: PluginList): HTMLElement[] {
  return Array.from(list.node.querySelectorAll(ENTRY_QUERY));
}

function tabStop(list: PluginList): HTMLElement {
  const items = entries(list);
  return items.find(entry => entry.tabIndex === 0) ?? items[0];
}

function key(target: EventTarget, keyName: string): void {
  simulate(target, 'keydown', { key: keyName, bubbles: true });
}

async function setupList(
  registry: TestRegistry,
  selection?: string
): Promise<PluginList> {
  const model = new PluginList.Model({ registry });
  await model.ready;
  const list = new PluginList({ registry, model });
  Widget.attach(list, document.body);
  list.setFilter(updateFilterFunction('', false, false), '');
  if (selection) {
    list.selection = selection;
  }
  MessageLoop.sendMessage(list, Widget.Msg.UpdateRequest);
  for (let i = 0; i < 10 && entries(list).length === 0; i++) {
    await framePromise();
  }
  return list;
}

describe('@jupyterlab/settingeditor', () => {
  describe('PluginList.Model', () => {
    let connector: TestConnector;
    let registry: TestRegistry;

    const id = 'test-id';
    const schema: ISettingRegistry.ISchema = {
      type: 'object',
      properties: {
        testSetting: {
          type: 'string',
          default: 'example'
        }
      }
    };
    const transformSchema = {
      'jupyter.lab.transform': true,
      ...schema
    };

    beforeAll(() => {
      connector = new TestConnector();
    });

    beforeEach(() => {
      registry = new TestRegistry({ connector });
    });

    afterEach(async () => {
      connector.schemas = {};
      await connector.clear();
    });

    describe('#changed', () => {
      it('should emit when a new plugin is loaded', async () => {
        connector.schemas[id] = schema;

        const model = new PluginList.Model({ registry });
        await model.ready;

        await registry.load(id);

        await expect(signalToPromise(model.changed)).resolves.not.toThrow();
      });

      it('should emit when the transform of a plugin resolves', async () => {
        connector.schemas[id] = transformSchema;
        const plugin = await connector.fetch(id);

        // Preload the plugin
        registry = new TestRegistry({ connector, plugins: [plugin!] });
        const model = new PluginList.Model({ registry });
        await model.ready;

        // Register transforms
        registry.transform(id, {
          fetch: p => p
        });
        // Load with transformer
        await registry.load(id);

        await expect(signalToPromise(model.changed)).resolves.not.toThrow();
      });

      it('should emit when settings change', async () => {
        connector.schemas[id] = schema;

        const settings = await registry.load(id);
        const model = new PluginList.Model({ registry });
        await model.ready;

        // Change to a non-default value
        await Promise.all([
          settings.set('testSetting', 'test'),
          expect(signalToPromise(model.changed)).resolves.not.toThrow()
        ]);

        // Change back to the default
        await Promise.all([
          settings.set('testSetting', 'example'),
          expect(signalToPromise(model.changed)).resolves.not.toThrow()
        ]);
      });
    });

    describe('#plugins', () => {
      it('should load plugins loaded after the model has initialised', async () => {
        connector.schemas[id] = schema;

        const model = new PluginList.Model({ registry });
        await model.ready;
        expect(model.plugins).toHaveLength(0);

        await registry.load(id);

        await signalToPromise(model.changed);
        expect(model.plugins).toHaveLength(1);
        expect(model.plugins[0].id).toBe(id);
      });

      it('should include pre-loaded plugins', async () => {
        connector.schemas[id] = schema;
        const plugin = await connector.fetch(id);

        // Passing a plugin without transform will lead to pre-loading
        registry = new TestRegistry({ connector, plugins: [plugin!] });
        await registry.preloaded;

        const model = new PluginList.Model({ registry });
        await model.ready;

        expect(model.plugins).toHaveLength(1);
        expect(model.plugins[0].id).toBe(id);
      });

      it('should include pre-fetched plugins once their transform is applied', async () => {
        connector.schemas[id] = transformSchema;
        const plugin = await connector.fetch(id);

        // Passing a plugin with transform will cache it (but not load yet!)
        registry = new TestRegistry({ connector, plugins: [plugin!] });
        const model = new PluginList.Model({ registry });
        await model.ready;

        expect(model.plugins).toHaveLength(0);

        // Register transforms
        registry.transform(id, {
          fetch: p => p
        });
        // Load with transformer
        await registry.load(id);

        await signalToPromise(model.changed);
        expect(model.plugins).toHaveLength(1);
      });
    });

    describe('#settings', () => {
      it('should load settings for plugins loaded after the model has initialised', async () => {
        connector.schemas[id] = schema;

        const model = new PluginList.Model({ registry });
        await model.ready;
        expect(Object.keys(model.settings)).toHaveLength(0);

        await registry.load(id);

        await signalToPromise(model.changed);
        expect(Object.keys(model.settings)).toHaveLength(1);
        expect(model.settings[id].id).toBe(id);
      });

      it('should include settings for pre-loaded plugins', async () => {
        connector.schemas[id] = schema;
        const plugin = await connector.fetch(id);

        // Passing a plugin without transform will lead to pre-loading
        registry = new TestRegistry({ connector, plugins: [plugin!] });
        await registry.preloaded;

        const model = new PluginList.Model({ registry });
        await model.ready;

        expect(Object.keys(model.settings)).toHaveLength(1);
        expect(model.settings[id].id).toBe(id);
      });

      it('includes settings for pre-fetched plugins once their transform is applied', async () => {
        connector.schemas[id] = transformSchema;
        const plugin = await connector.fetch(id);

        // Passing a plugin with transform will cache it (but not load yet!)
        registry = new TestRegistry({ connector, plugins: [plugin!] });
        await registry.preloaded;

        const model = new PluginList.Model({ registry });
        await model.ready;

        expect(Object.keys(model.settings)).toHaveLength(0);

        // Register transforms
        registry.transform(id, {
          fetch: p => {
            p.schema['transformed'] = true;
            return p;
          }
        });
        // Load with transformer
        await registry.load(id);

        await signalToPromise(model.changed);
        expect(Object.keys(model.settings)).toHaveLength(1);
        expect(model.settings[id].schema.transformed).toBe(true);
      });
    });
  });

  describe('PluginList', () => {
    let connector: TestConnector;
    let registry: TestRegistry;
    let list: PluginList;

    const IDS = ['plugin-alpha', 'plugin-beta', 'plugin-gamma'];
    const mkSchema = (title: string): ISettingRegistry.ISchema => ({
      type: 'object',
      title,
      properties: { value: { type: 'string', default: 'x' } }
    });

    beforeAll(() => {
      connector = new TestConnector();
    });

    beforeEach(async () => {
      registry = new TestRegistry({ connector });
      connector.schemas = {
        [IDS[0]]: mkSchema('Alpha'),
        [IDS[1]]: mkSchema('Beta'),
        [IDS[2]]: mkSchema('Gamma')
      };
      await Promise.all(IDS.map(id => registry.load(id)));
    });

    afterEach(async () => {
      list?.dispose();
      if (list?.node.isConnected) {
        Widget.detach(list);
      }
      connector.schemas = {};
      await connector.clear();
    });

    it('should rove tabindex and move focus with arrows without selecting', async () => {
      list = await setupList(registry, IDS[0]);
      expect(entries(list).length).toBe(3);

      const focused = tabStop(list);
      focused.focus();
      key(focused, 'ArrowDown');

      expect(document.activeElement?.getAttribute('data-id')).toBe(IDS[1]);
      expect(list.selection).toBe(IDS[0]);
      expect(entries(list).filter(entry => entry.tabIndex === 0)).toHaveLength(
        1
      );

      let emitted = false;
      list.handleSelectSignal.connect(() => {
        emitted = true;
      });
      key(document.activeElement!, 'ArrowDown');
      expect(emitted).toBe(false);
    });

    it('should select the focused entry on Enter', async () => {
      list = await setupList(registry, IDS[0]);
      const focused = tabStop(list);
      focused.focus();
      key(focused, 'ArrowDown');

      const selected = signalToPromise(list.handleSelectSignal);
      key(document.activeElement!, 'Enter');
      const [, pluginId] = await selected;
      expect(pluginId).toBe(IDS[1]);
      expect(list.selection).toBe(IDS[1]);
    });
  });
});
