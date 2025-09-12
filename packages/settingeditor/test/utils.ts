// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StateDB } from '@jupyterlab/statedb';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';

export class TestConnector extends StateDB {
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

export class TestRegistry extends SettingRegistry {
  get preloaded() {
    return this.ready;
  }
}
