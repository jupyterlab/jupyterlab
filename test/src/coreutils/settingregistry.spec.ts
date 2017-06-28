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
  /**
   * Create a new setting client data connector.
   */
  constructor() {
    super({ namespace: 'setting-registry-tests' });
  }

  /**
   * Retrieve a saved bundle from the data connector.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(user => {
      const schema = schemas[id] || { };
      const result = { data: { composite: { }, user }, id, schema };

      return result;
    });
  }

  /**
   * Remove a value from the data connector.
   */
  remove(id: string): Promise<void> {
    return super.remove(id);
  }

  /**
   * Save the user setting data in the data connector.
   */
  save(id: string, user: JSONObject): Promise<void> {
    return super.save(id, user);
  }
}


const connector = new TestConnector();

const registry = new SettingRegistry({ connector });

const schemas: { [key: string]: ISettingRegistry.ISchema } = { };


describe('@jupyterlab/coreutils', () => {

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

        connector.clear()
          .then(() => registry.load(id))
          .then(() => registry.set(id, key, value))
          .catch(reason => { done(JSON.stringify(reason)); });

        registry.pluginChanged.connect((sender: any, plugin: string) => {
          expect(id).to.be(plugin);
          done();
        });
     });

    });

  });

});
