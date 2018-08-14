// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import {
  DefaultSchemaValidator,
  IDataConnector,
  ISettingRegistry,
  SettingRegistry,
  Settings,
  StateDB
} from '@jupyterlab/coreutils';

import { signalToPromise } from '@jupyterlab/testutils';

import { JSONObject } from '@phosphor/coreutils';

export class TestConnector extends StateDB
  implements IDataConnector<ISettingRegistry.IPlugin, string> {
  constructor(
    public schemas: { [key: string]: ISettingRegistry.ISchema } = {}
  ) {
    super({ namespace: 'setting-registry-tests' });
  }

  async fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    const data = await super.fetch(id);
    if (!data && !this.schemas[id]) {
      return null;
    }

    const schema = this.schemas[id] || { type: 'object' };
    const composite = {};
    const user = {};
    const raw = (data as string) || '{ }';
    return { id, data: { composite, user }, raw, schema };
  }
}

describe('@jupyterlab/coreutils', () => {
  describe('DefaultSchemaValidator', () => {
    describe('#constructor()', () => {
      it('should create a new schema validator', () => {
        const validator = new DefaultSchemaValidator();

        expect(validator).to.be.an.instanceof(DefaultSchemaValidator);
      });
    });

    describe('#validateData()', () => {
      it('should validate data against a schema', () => {
        const id = 'foo';
        const validator = new DefaultSchemaValidator();
        const schema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string' }
          },
          type: 'object'
        };
        const composite = {};
        const user = {};
        const raw = '{ "bar": "baz" }';
        const plugin = { id, data: { composite, user }, raw, schema };
        const errors = validator.validateData(plugin);

        expect(errors).to.equal(null);
      });

      it('should return errors if the data fails to validate', () => {
        const id = 'foo';
        const validator = new DefaultSchemaValidator();
        const schema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string' }
          },
          type: 'object'
        };
        const composite = {};
        const user = {};
        const raw = '{ "baz": "qux" }';
        const plugin = { id, data: { composite, user }, raw, schema };
        const errors = validator.validateData(plugin);

        expect(errors).to.not.equal(null);
      });

      it('should populate the composite data', () => {
        const id = 'foo';
        const validator = new DefaultSchemaValidator();
        const schema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string', default: 'baz' }
          },
          type: 'object'
        };
        const composite = {} as JSONObject;
        const user = {} as JSONObject;
        const raw = '{ }';
        const plugin = { id, data: { composite, user }, raw, schema };
        const errors = validator.validateData(plugin);

        expect(errors).to.equal(null);
        expect(plugin.data.user.bar).to.equal(undefined);
        expect(plugin.data.composite.bar).to.equal(
          schema.properties.bar.default
        );
      });
    });
  });

  describe('SettingRegistry', () => {
    const connector = new TestConnector();
    let registry: SettingRegistry;

    afterEach(() => {
      connector.schemas = {};
      return connector.clear();
    });

    beforeEach(() => {
      registry = new SettingRegistry({ connector });
    });

    describe('#constructor()', () => {
      it('should create a new setting registry', () => {
        expect(registry).to.be.an.instanceof(SettingRegistry);
      });
    });

    describe('#pluginChanged', () => {
      it('should emit when a plugin changes', async () => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        connector.schemas[id] = { type: 'object' };
        let called = false;
        registry.pluginChanged.connect((sender: any, plugin: string) => {
          expect(id).to.equal(plugin);
          called = true;
        });
        await registry.load(id);
        await registry.set(id, key, value);
        expect(called).to.equal(true);
      });
    });

    describe('#plugins', () => {
      it('should return a list of registered plugins in registry', async () => {
        const one = 'foo';
        const two = 'bar';

        expect(registry.plugins.length).to.equal(0);
        connector.schemas[one] = { type: 'object' };
        connector.schemas[two] = { type: 'object' };
        await registry.load(one);
        expect(registry.plugins).to.have.length(1);
        await registry.load(two);
        expect(registry.plugins).to.have.length(2);
      });
    });

    describe('#get()', () => {
      it('should get a setting item from a loaded plugin', async () => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        connector.schemas[id] = { type: 'object' };
        await connector.save(id, JSON.stringify({ [key]: value }));
        (await registry.load(id)) as Settings;
        const saved = await registry.get(id, key);
        expect(saved.user).to.equal(value);
      });

      it('should get a setting item from a plugin that is not loaded', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';

        connector.schemas[id] = { type: 'object' };
        await connector.save(id, JSON.stringify({ [key]: value }));
        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(value);
      });

      it('should use schema default if user data not available', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: value }
          }
        });

        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(schema.properties[key].default);
        expect(saved.composite).to.not.equal(saved.user);
      });

      it('should let user value override schema default', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: 'delta' }
          }
        });

        await connector.save(id, JSON.stringify({ [key]: value }));
        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(value);
        expect(saved.user).to.equal(value);
        expect(saved.composite).to.not.equal(schema.properties[key].default);
        expect(saved.user).to.not.equal(schema.properties[key].default);
      });

      it('should reject if a plugin does not exist', async () => {
        let failed = false;
        try {
          await registry.get('foo', 'bar');
        } catch (e) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });

      it('should resolve `undefined` if a key does not exist', async () => {
        const id = 'foo';
        const key = 'bar';

        connector.schemas[id] = { type: 'object' };

        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(void 0);
        expect(saved.user).to.equal(void 0);
      });
    });

    describe('#load()', () => {
      it(`should resolve a registered plugin's settings`, async () => {
        const id = 'foo';

        expect(registry.plugins.length).to.equal(0);
        connector.schemas[id] = { type: 'object' };
        const settings = (await registry.load(id)) as Settings;
        expect(settings.plugin).to.equal(id);
      });

      it('should reject if a plugin does not exist', async () => {
        let failed = false;
        try {
          await registry.load('foo');
        } catch (e) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });
    });

    describe('#reload()', () => {
      it(`should load a registered plugin's settings`, async () => {
        const id = 'foo';

        expect(registry.plugins.length).to.equal(0);
        connector.schemas[id] = { type: 'object' };
        const settings = await registry.reload(id);
        expect(settings.plugin).to.equal(id);
      });

      it(`should replace a registered plugin's settings`, async () => {
        const id = 'foo';
        const first = 'Foo';
        const second = 'Bar';

        expect(registry.plugins.length).to.equal(0);
        connector.schemas[id] = { type: 'object', title: first };
        let settings = await registry.reload(id);
        expect(settings.schema.title).to.equal(first);
        await Promise.resolve(void 0);
        connector.schemas[id].title = second;
        settings = await registry.reload(id);
        expect(settings.schema.title).to.equal(second);
      });

      it('should reject if a plugin does not exist', async () => {
        let failed = false;
        try {
          await registry.reload('foo');
        } catch (e) {
          failed = true;
        }
        expect(failed).to.equal(true);
      });
    });
  });

  describe('Settings', () => {
    const connector = new TestConnector();
    let registry: SettingRegistry;
    let settings: Settings;

    afterEach(() => {
      if (settings) {
        settings.dispose();
        settings = null;
      }
      connector.schemas = {};
      return connector.clear();
    });

    beforeEach(() => {
      registry = new SettingRegistry({ connector });
    });

    describe('#constructor()', () => {
      it('should create a new settings object for a plugin', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings).to.be.an.instanceof(Settings);
      });
    });

    describe('#changed', () => {
      it('should emit when a plugin changes', async () => {
        const id = 'alpha';
        const schema = { type: 'object' };

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        let promise = signalToPromise(settings.changed);
        await settings.set('foo', 'bar');
        await promise;
      });
    });

    describe('#composite', () => {
      it('should contain the merged user and default data', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: value }
          }
        });

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        expect(settings.composite[key]).to.equal(value);
      });

      it('should privilege user data', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: 'delta' }
          }
        });

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        await settings.set(key, value);
        expect(settings.composite[key]).to.equal(value);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the settings object is disposed', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings.isDisposed).to.equal(false);
        settings.dispose();
        expect(settings.isDisposed).to.equal(true);
      });
    });

    describe('#schema', () => {
      it('should expose the plugin schema', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings.schema).to.deep.equal(schema);
      });
    });

    describe('#user', () => {
      it('should privilege user data', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: 'delta' }
          }
        });

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        await settings.set(key, value);
        expect(settings.user[key]).to.equal(value);
      });
    });

    describe('#plugin', () => {
      it('should expose the plugin ID', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings.plugin).to.equal(id);
      });
    });

    describe('#registry', () => {
      it('should expose the setting registry', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings.registry).to.equal(registry);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the settings object', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema = { type: 'object' };
        const raw = '{ }';
        const plugin = { id, data, raw, schema };

        settings = new Settings({ plugin, registry });
        expect(settings.isDisposed).to.equal(false);
        settings.dispose();
        expect(settings.isDisposed).to.equal(true);
      });
    });

    describe('#default()', () => {
      it('should return a fully extrapolated schema default', async () => {
        const id = 'omicron';
        const defaults = {
          foo: 'one',
          bar: 100,
          baz: {
            qux: 'two',
            quux: 'three',
            quuz: {
              corge: { grault: 200 }
            }
          }
        };

        connector.schemas[id] = {
          type: 'object',
          properties: {
            foo: { type: 'string', default: defaults.foo },
            bar: { type: 'number', default: defaults.bar },
            baz: {
              type: 'object',
              default: {},
              properties: {
                qux: { type: 'string', default: defaults.baz.qux },
                quux: { type: 'string', default: defaults.baz.quux },
                quuz: {
                  type: 'object',
                  default: {},
                  properties: {
                    corge: {
                      type: 'object',
                      default: {},
                      properties: {
                        grault: {
                          type: 'number',
                          default: defaults.baz.quuz.corge.grault
                        }
                      }
                    }
                  }
                }
              }
            },
            'nonexistent-default': { type: 'string' }
          }
        };
        settings = (await registry.load(id)) as Settings;
        expect(settings.default('nonexistent-key')).to.equal(undefined);
        expect(settings.default('foo')).to.equal(defaults.foo);
        expect(settings.default('bar')).to.equal(defaults.bar);
        expect(settings.default('baz')).to.deep.equal(defaults.baz);
        expect(settings.default('nonexistent-default')).to.equal(undefined);
      });
    });

    describe('#get()', () => {
      it('should get a setting item', async () => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        connector.schemas[id] = { type: 'object' };
        await connector.save(id, JSON.stringify({ [key]: value }));
        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);
        expect(saved.user).to.equal(value);
      });

      it('should use schema default if user data not available', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: value }
          }
        });

        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);

        expect(saved.composite).to.equal(schema.properties[key].default);
        expect(saved.composite).to.not.equal(saved.user);
      });

      it('should let user value override schema default', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: 'delta' }
          }
        });

        await connector.save(id, JSON.stringify({ [key]: value }));
        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);
        expect(saved.composite).to.equal(value);
        expect(saved.user).to.equal(value);
        expect(saved.composite).to.not.equal(schema.properties[key].default);
        expect(saved.user).to.not.equal(schema.properties[key].default);
      });

      it('should be `undefined` if a key does not exist', async () => {
        const id = 'foo';
        const key = 'bar';

        connector.schemas[id] = { type: 'object' };

        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);
        expect(saved.composite).to.equal(void 0);
        expect(saved.user).to.equal(void 0);
      });
    });

    describe('#remove()', () => {
      it('should remove a setting item', async () => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        connector.schemas[id] = { type: 'object' };
        await connector.save(id, JSON.stringify({ [key]: value }));
        settings = (await registry.load(id)) as Settings;
        let saved = settings.get(key);
        expect(saved.user).to.equal(value);
        await settings.remove(key);
        saved = settings.get(key);
        expect(saved.composite).to.equal(void 0);
        expect(saved.user).to.equal(void 0);
      });
    });

    describe('#save()', () => {
      it('should save user setting data', async () => {
        const id = 'foo';
        const one = 'one';
        const two = 'two';

        connector.schemas[id] = { type: 'object' };
        settings = (await registry.load(id)) as Settings;
        await settings.save(JSON.stringify({ one, two }));
        let saved = settings.get('one');
        expect(saved.composite).to.equal(one);
        expect(saved.user).to.equal(one);

        saved = settings.get('two');

        expect(saved.composite).to.equal(two);
        expect(saved.user).to.equal(two);
      });
    });

    describe('#set()', () => {
      it('should set a user setting item', async () => {
        const id = 'foo';
        const one = 'one';

        connector.schemas[id] = { type: 'object' };
        settings = (await registry.load(id)) as Settings;
        await settings.set('one', one);
        const saved = settings.get('one');
        expect(saved.composite).to.equal(one);
        expect(saved.user).to.equal(one);
      });
    });
  });
});
