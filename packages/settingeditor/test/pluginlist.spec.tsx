// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PluginList } from '../src/pluginlist';
import { signalToPromise } from '@jupyterlab/coreutils';
import { StateDB } from '@jupyterlab/statedb';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';

class TestConnector extends StateDB {
  schemas: { [key: string]: ISettingRegistry.ISchema } = {};

  async fetch(id: string): Promise<ISettingRegistry.IPlugin | undefined> {
    const fetched = await super.fetch(id);
    if (!fetched && !this.schemas[id]) {
      return undefined;
    }

    const schema: ISettingRegistry.ISchema = this.schemas[id] || {
      type: 'object'
    };
    const composite = {};
    const user = {};
    const raw = (fetched as string) || '{ }';
    const version = 'test';
    return { id, data: { composite, user }, raw, schema, version };
  }

  async list(): Promise<any> {
    return Promise.reject('list method not implemented');
  }
}

class TestRegistry extends SettingRegistry {
  get preloaded() {
    return this.ready;
  }
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
});
