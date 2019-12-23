// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import {
  DefaultSchemaValidator,
  ISettingRegistry,
  SettingRegistry,
  Settings
} from '@jupyterlab/settingregistry';

import { StateDB } from '@jupyterlab/statedb';

import { signalToPromise } from '@jupyterlab/testutils';

import { JSONObject } from '@lumino/coreutils';

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

describe('@jupyterlab/settingregistry', () => {
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
        const schema: ISettingRegistry.ISchema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string' }
          },
          type: 'object'
        };
        const composite = {};
        const user = {};
        const raw = '{ "bar": "baz" }';
        const version = 'test';
        const plugin = { id, data: { composite, user }, raw, schema, version };
        const errors = validator.validateData(plugin);

        expect(errors).to.equal(null);
      });

      it('should return errors if the data fails to validate', () => {
        const id = 'foo';
        const validator = new DefaultSchemaValidator();
        const schema: ISettingRegistry.ISchema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string' }
          },
          type: 'object'
        };
        const composite = {};
        const user = {};
        const raw = '{ "baz": "qux" }';
        const version = 'test';
        const plugin = { id, data: { composite, user }, raw, schema, version };
        const errors = validator.validateData(plugin);

        expect(errors).to.not.equal(null);
      });

      it('should populate the composite data', () => {
        const id = 'foo';
        const validator = new DefaultSchemaValidator();
        const schema: ISettingRegistry.ISchema = {
          additionalProperties: false,
          properties: {
            bar: { type: 'string', default: 'baz' }
          },
          type: 'object'
        };
        const composite = {} as JSONObject;
        const user = {} as JSONObject;
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data: { composite, user }, raw, schema, version };
        const errors = validator.validateData(plugin);

        expect(errors).to.equal(null);
        expect(plugin.data.user.bar).to.equal(undefined);
        expect(plugin.data.composite.bar).to.equal(
          schema.properties!.bar.default
        );
      });
    });
  });

  describe('SettingRegistry', () => {
    const connector = new TestConnector();
    const timeout = 500;
    let registry: SettingRegistry;

    afterEach(() => {
      connector.schemas = {};
      return connector.clear();
    });

    beforeEach(() => {
      registry = new SettingRegistry({ connector, timeout });
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

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[one] = { type: 'object' };
        connector.schemas[two] = { type: 'object' };
        await registry.load(one);
        expect(Object.keys(registry.plugins)).to.have.length(1);
        await registry.load(two);
        expect(Object.keys(registry.plugins)).to.have.length(2);
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
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: value
            }
          }
        });

        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(schema.properties![key].default);
        expect(saved.composite).to.not.equal(saved.user);
      });

      it('should let user value override schema default', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: 'delta'
            }
          }
        });

        await connector.save(id, JSON.stringify({ [key]: value }));
        const saved = await registry.get(id, key);
        expect(saved.composite).to.equal(value);
        expect(saved.user).to.equal(value);
        expect(saved.composite).to.not.equal(schema.properties![key].default);
        expect(saved.user).to.not.equal(schema.properties![key].default);
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
        expect(saved.composite).to.equal(undefined);
        expect(saved.user).to.equal(undefined);
      });
    });

    describe('#load()', () => {
      it(`should resolve a registered plugin's settings`, async () => {
        const id = 'foo';

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = { type: 'object' };
        const settings = (await registry.load(id)) as Settings;
        expect(settings.id).to.equal(id);
      });

      it(`should reject if a plugin transformation times out`, async () => {
        const id = 'foo';
        let failed = false;

        connector.schemas[id] = {
          'jupyter.lab.transform': true,
          type: 'object'
        };

        try {
          await registry.load(id);
        } catch (e) {
          failed = true;
        }
        expect(failed).to.equal(true);
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

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = { type: 'object' };
        const settings = await registry.reload(id);
        expect(settings.id).to.equal(id);
      });

      it(`should replace a registered plugin's settings`, async () => {
        const id = 'foo';
        const first = 'Foo';
        const second = 'Bar';

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = { type: 'object', title: first };
        let settings = await registry.reload(id);
        expect(settings.schema.title).to.equal(first);
        await Promise.resolve(undefined);
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

    describe('#transform()', () => {
      it(`should transform a plugin during the fetch phase`, async () => {
        const id = 'foo';
        const version = 'transform-test';

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = {
          'jupyter.lab.transform': true,
          type: 'object'
        };
        registry.transform(id, {
          fetch: plugin => {
            plugin.version = version;
            return plugin;
          }
        });
        expect((await registry.load(id)).version).to.equal(version);
      });

      it(`should transform a plugin during the compose phase`, async () => {
        const id = 'foo';
        const composite = { a: 1 };

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = {
          'jupyter.lab.transform': true,
          type: 'object'
        };
        registry.transform(id, {
          compose: plugin => {
            plugin.data = { user: plugin.data.user, composite };
            return plugin;
          }
        });
        expect((await registry.load(id)).composite).to.eql(composite);
      });

      it(`should disallow a transform that changes the plugin ID`, async () => {
        const id = 'foo';
        let failed = false;

        expect(Object.keys(registry.plugins)).to.be.empty;
        connector.schemas[id] = {
          'jupyter.lab.transform': true,
          type: 'object'
        };
        registry.transform(id, {
          compose: plugin => {
            plugin.id = 'bar';
            return plugin;
          }
        });
        try {
          await registry.load(id);
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
    let settings: Settings | null;

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
        const schema: ISettingRegistry.ISchema = { type: 'object' };
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data, raw, schema, version };

        settings = new Settings({ plugin, registry });
        expect(settings).to.be.an.instanceof(Settings);
      });
    });

    describe('#changed', () => {
      it('should emit when a plugin changes', async () => {
        const id = 'alpha';
        const schema: ISettingRegistry.ISchema = { type: 'object' };

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
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: value
            }
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
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: 'delta'
            }
          }
        });

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        await settings.set(key, value);
        expect(settings.composite[key]).to.equal(value);
      });
    });

    describe('#id', () => {
      it('should expose the plugin ID', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema: ISettingRegistry.ISchema = { type: 'object' };
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data, raw, schema, version };

        settings = new Settings({ plugin, registry });
        expect(settings.id).to.equal(id);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the settings object is disposed', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema: ISettingRegistry.ISchema = { type: 'object' };
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data, raw, schema, version };

        settings = new Settings({ plugin, registry });
        expect(settings.isDisposed).to.equal(false);
        settings.dispose();
        expect(settings.isDisposed).to.equal(true);
      });
    });

    describe('#schema', () => {
      it('should expose the plugin schema', async () => {
        const id = 'alpha';
        const schema: ISettingRegistry.ISchema = { type: 'object' };

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        expect(settings.schema).to.deep.equal(schema);
      });
    });

    describe('#user', () => {
      it('should privilege user data', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: 'delta'
            }
          }
        });

        connector.schemas[id] = schema;
        settings = (await registry.load(id)) as Settings;
        await settings.set(key, value);
        expect(settings.user[key]).to.equal(value);
      });
    });

    describe('#registry', () => {
      it('should expose the setting registry', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema: ISettingRegistry.ISchema = { type: 'object' };
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data, raw, schema, version };

        settings = new Settings({ plugin, registry });
        expect(settings.registry).to.equal(registry);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the settings object', () => {
        const id = 'alpha';
        const data = { composite: {}, user: {} };
        const schema: ISettingRegistry.ISchema = { type: 'object' };
        const raw = '{ }';
        const version = 'test';
        const plugin = { id, data, raw, schema, version };

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
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: value
            }
          }
        });

        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);

        expect(saved.composite).to.equal(schema.properties![key].default);
        expect(saved.composite).to.not.equal(saved.user);
      });

      it('should let user value override schema default', async () => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema: ISettingRegistry.ISchema = (connector.schemas[id] = {
          type: 'object',
          properties: {
            [key]: {
              type: typeof value as ISettingRegistry.Primitive,
              default: 'delta'
            }
          }
        });

        await connector.save(id, JSON.stringify({ [key]: value }));
        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);
        expect(saved.composite).to.equal(value);
        expect(saved.user).to.equal(value);
        expect(saved.composite).to.not.equal(schema.properties![key].default);
        expect(saved.user).to.not.equal(schema.properties![key].default);
      });

      it('should be `undefined` if a key does not exist', async () => {
        const id = 'foo';
        const key = 'bar';

        connector.schemas[id] = { type: 'object' };

        settings = (await registry.load(id)) as Settings;
        const saved = settings.get(key);
        expect(saved.composite).to.equal(undefined);
        expect(saved.user).to.equal(undefined);
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
        expect(saved.composite).to.equal(undefined);
        expect(saved.user).to.equal(undefined);
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
