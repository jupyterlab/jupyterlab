/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig } from '@jupyterlab/coreutils';
import {
  ISettingConnector,
  ISettingRegistry
} from '@jupyterlab/settingregistry';
import { DataConnector, IDataConnector } from '@jupyterlab/statedb';
import { Throttler } from '@lumino/polling';

/**
 * A data connector for fetching settings.
 *
 * #### Notes
 * This connector adds a query parameter to the base services setting manager.
 */
export class SettingConnector
  extends DataConnector<ISettingRegistry.IPlugin, string>
  implements ISettingConnector
{
  constructor(connector: IDataConnector<ISettingRegistry.IPlugin, string>) {
    super();
    this._connector = connector;
  }

  /**
   * Fetch settings for a plugin.
   * @param id - The plugin ID
   *
   * #### Notes
   * The REST API requests are throttled at one request per plugin per 100ms.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin | undefined> {
    const throttlers = this._throttlers;
    if (!(id in throttlers)) {
      throttlers[id] = new Throttler(() => this._connector.fetch(id), 100);
    }
    return throttlers[id].invoke();
  }

  async list(query: 'ids'): Promise<{ ids: string[] }>;
  async list(
    query: 'active' | 'all'
  ): Promise<{ ids: string[]; values: ISettingRegistry.IPlugin[] }>;
  async list(
    query: 'active' | 'all' | 'ids' = 'all'
  ): Promise<{ ids: string[]; values?: ISettingRegistry.IPlugin[] }> {
    const { isDisabled } = PageConfig.Extension;
    const { ids, values } = await this._connector.list(
      query === 'ids' ? 'ids' : undefined
    );

    if (query === 'all') {
      return { ids, values };
    }

    if (query === 'ids') {
      return { ids };
    }

    return {
      ids: ids.filter(id => !isDisabled(id)),
      values: values.filter(({ id }) => !isDisabled(id))
    };
  }

  async save(id: string, raw: string): Promise<void> {
    await this._connector.save(id, raw);
  }

  private _connector: IDataConnector<ISettingRegistry.IPlugin, string>;
  private _throttlers: { [key: string]: Throttler } = Object.create(null);
}
