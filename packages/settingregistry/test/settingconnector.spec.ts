// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SettingConnector } from '@jupyterlab/settingregistry';
import { DataConnector } from '@jupyterlab/statedb';

class TestConnector extends DataConnector<ISettingRegistry.IPlugin, string> {
  fetchCalls: string[] = [];
  listCalls: (string | undefined)[] = [];
  saveCalls: [string, string][] = [];
  plugins: ISettingRegistry.IPlugin[] = [];

  async fetch(id: string): Promise<ISettingRegistry.IPlugin | undefined> {
    this.fetchCalls.push(id);
    return this.plugins.find(plugin => plugin.id === id);
  }

  async list(
    query?: string
  ): Promise<{ ids: string[]; values: ISettingRegistry.IPlugin[] }> {
    this.listCalls.push(query);
    return {
      ids: this.plugins.map(plugin => plugin.id),
      values: this.plugins
    };
  }

  async save(id: string, raw: string): Promise<void> {
    this.saveCalls.push([id, raw]);
  }
}

function makePlugin(id: string): ISettingRegistry.IPlugin {
  return {
    id,
    data: { composite: {}, user: {} },
    raw: '{}',
    schema: { type: 'object' },
    version: 'test'
  };
}

describe('@jupyterlab/settingregistry', () => {
  describe('SettingConnector', () => {
    let testConnector: TestConnector;
    let connector: SettingConnector;

    beforeEach(() => {
      testConnector = new TestConnector();
      testConnector.plugins = [makePlugin('foo:bar'), makePlugin('baz:qux')];
      connector = new SettingConnector(testConnector);
    });

    describe('#fetch()', () => {
      it('should fetch a plugin from the underlying connector', async () => {
        const plugin = await connector.fetch('foo:bar');
        expect(plugin?.id).toBe('foo:bar');
        expect(testConnector.fetchCalls).toEqual(['foo:bar']);
      });

      it('should return undefined for a missing plugin', async () => {
        const plugin = await connector.fetch('does-not:exist');
        expect(plugin).toBeUndefined();
      });

      it('should throttle concurrent requests for the same plugin', async () => {
        const plugins = await Promise.all([
          connector.fetch('foo:bar'),
          connector.fetch('foo:bar')
        ]);
        expect(plugins.map(plugin => plugin?.id)).toEqual([
          'foo:bar',
          'foo:bar'
        ]);
        expect(testConnector.fetchCalls).toEqual(['foo:bar']);
      });
    });

    describe('#list()', () => {
      it('should list all plugins for the "all" query', async () => {
        const { ids, values } = await connector.list('all');
        expect(ids).toEqual(['foo:bar', 'baz:qux']);
        expect(values.map(plugin => plugin.id)).toEqual(['foo:bar', 'baz:qux']);
      });

      it('should list only the plugin ids for the "ids" query', async () => {
        const result = await connector.list('ids');
        expect(result.ids).toEqual(['foo:bar', 'baz:qux']);
        expect(result).not.toHaveProperty('values');
        expect(testConnector.listCalls).toEqual(['ids']);
      });

      it('should list the active plugins', async () => {
        const { ids, values } = await connector.list('active');
        expect(ids).toEqual(['foo:bar', 'baz:qux']);
        expect(values.map(plugin => plugin.id)).toEqual(['foo:bar', 'baz:qux']);
      });
    });

    describe('#save()', () => {
      it('should delegate to the underlying connector', async () => {
        await connector.save('foo:bar', '{ "flag": true }');
        expect(testConnector.saveCalls).toEqual([
          ['foo:bar', '{ "flag": true }']
        ]);
      });
    });
  });
});
