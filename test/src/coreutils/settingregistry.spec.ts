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
  constructor() {
    super({ namespace: 'setting-registry-tests' });
  }

  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(user => {
      const schema = schemas[id] || { };
      const result = { data: { composite: { }, user }, id, schema };

      return result;
    });
  }

  remove(id: string): Promise<void> {
    return super.remove(id);
  }

  save(id: string, user: JSONObject): Promise<void> {
    return super.save(id, user);
  }
}


const connector = new TestConnector();

const registry = new SettingRegistry({ connector });

const schemas: { [key: string]: ISettingRegistry.ISchema } = { };


describe('@jupyterlab/coreutils', () => {

  describe('SettingRegistry', () => {

    beforeEach(() => connector.clear());

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
        registry.load(id).then(() => registry.set(id, key, value));
        registry.pluginChanged.connect((sender: any, plugin: string) => {
          expect(id).to.be(plugin);
          done();
        });
     });

    });

  });

});
