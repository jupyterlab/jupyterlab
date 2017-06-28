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

  beforeEach(() => connector.clear()
    .then(() => { registry = new SettingRegistry({ connector }); }));

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

  });

});
