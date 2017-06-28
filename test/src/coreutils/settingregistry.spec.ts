// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IDataConnector, ISettingRegistry, SettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';


export
class TestConnector extends StateDB implements IDataConnector<ISettingRegistry.IPlugin, JSONObject> {
  constructor(schemas: { [key: string]: ISettingRegistry.ISchema }) {
    super({ namespace: 'setting-registry-tests' });
    this._schemas = schemas;
  }

  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(user => {
      const schema = this._schemas[id] || { };
      const result = { data: { composite: { }, user }, id, schema };

      return result;
    });
  }

  private _schemas: { [key: string]: ISettingRegistry.ISchema };
}


describe('@jupyterlab/coreutils', () => {

  const schemas: { [key: string]: ISettingRegistry.ISchema } = { };
  const connector = new TestConnector(schemas);

  let registry: SettingRegistry;

  beforeEach(() => {
    return connector.clear().then(() => {
      Object.keys(schemas).forEach(key => { delete schemas[key]; });
      registry = new SettingRegistry({ connector });
    });
  });

  describe('SettingRegistry', () => {

    describe('#constructor()', () => {

      it('should create a new setting registry', () => {
        expect(registry).to.be.a(SettingRegistry);
      });

    });

    describe('#pluginChanged', () => {

      it('should emit when a plugin changes', done => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        schemas[id] = { type: 'object' };
        registry.pluginChanged.connect((sender: any, plugin: string) => {
          expect(id).to.be(plugin);
          done();
        });
        registry.load(id).then(() => registry.set(id, key, value)).catch(done);
      });

    });

    describe('#plugins', () => {

      it('should return a list of registered plugins in registry', done => {
        const one = 'foo';
        const two = 'bar';

        expect(registry.plugins).to.be.empty();
        schemas[one] = { type: 'object' };
        schemas[two] = { type: 'object' };
        registry.load(one)
          .then(() => { expect(registry.plugins).to.have.length(1); })
          .then(() => registry.load(two))
          .then(() => { expect(registry.plugins).to.have.length(2); })
          .then(done)
          .catch(done);
      });

    });

    describe('#get()', () => {

      it('should get a setting item from a loaded plugin', done => {
        const id = 'foo';
        const key = 'bar';
        const value = 'baz';

        schemas[id] = { type: 'object' };
        connector.save(id, { [key]: value })
          .then(() => registry.load(id))
          .then(() => registry.get(id, key))
          .then(saved => { expect(saved.user).to.be(value); })
          .then(done)
          .catch(done);
      });

      it('should get a setting item from a plugin that is not loaded', done => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';

        schemas[id] = { type: 'object' };
        connector.save(id, { [key]: value })
          .then(() => registry.get(id, key))
          .then(saved => { expect(saved.composite).to.be(value); })
          .then(done)
          .catch(done);
      });

      it('should use schema default if user data not available', done => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: value }
          }
        };

        registry.get(id, key)
          .then(saved => {
            expect(saved.composite).to.be(schema.properties[key].default);
            expect(saved.composite).to.not.be(saved.user);
          }).then(done)
            .catch(done);
      });

      it('should let user value override schema default', done => {
        const id = 'alpha';
        const key = 'beta';
        const value = 'gamma';
        const schema = schemas[id] = {
          type: 'object',
          properties: {
            [key]: { type: typeof value, default: 'delta' }
          }
        };

        connector.save(id, { [key]: value })
          .then(() => registry.get(id, key))
          .then(saved => {
            expect(saved.composite).to.be(value);
            expect(saved.user).to.be(value);
            expect(saved.composite).to.not.be(schema.properties[key].default);
            expect(saved.user).to.not.be(schema.properties[key].default);
          }).then(done)
            .catch(done);
      });

      it('should reject if a plugin does not exist', done => {
        registry.get('foo', 'bar')
          .then(saved => { throw new Error('should not resolve'); })
          .catch(reason => { done(); });
      });

      it('should resolve `undefined` if a key does not exist', done => {
        const id = 'foo';
        const key = 'bar';

        schemas[id] = { type: 'object' };

        registry.get(id, key)
          .then(saved => {
            expect(saved.composite).to.be(void 0);
            expect(saved.user).to.be(void 0);
          }).then(done)
            .catch(done);
      });

    });

    describe('#load()', () => {

      it(`should resolve a registered plugin's settings`, done => {
        const id = 'foo';

        expect(registry.plugins).to.be.empty();
        schemas[id] = { type: 'object' };
        registry.load(id)
          .then(settings => { expect(settings.plugin).to.be(id); })
          .then(done)
          .catch(done);
      });

      it('should reject if a plugin does not exist', done => {
        registry.load('foo')
          .then(settings => { throw new Error('should not resolve'); })
          .catch(reason => { done(); });
      });

    });

  });

});
