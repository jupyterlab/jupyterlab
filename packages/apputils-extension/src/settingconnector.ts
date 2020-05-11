import { PageConfig } from '@jupyterlab/coreutils';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { DataConnector, IDataConnector } from '@jupyterlab/statedb';

import { Throttler } from '@lumino/polling';

/**
 * A data connector for fetching settings.
 *
 * #### Notes
 * This connector adds a query parameter to the base services setting manager.
 */
export class SettingConnector extends DataConnector<
  ISettingRegistry.IPlugin,
  string
> {
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

  async list(
    query: 'active' | 'all' = 'all'
  ): Promise<{ ids: string[]; values: ISettingRegistry.IPlugin[] }> {
    const { isDeferred, isDisabled } = PageConfig.Extension;
    const { ids, values } = await this._connector.list();

    if (query === 'all') {
      return { ids, values };
    }

    return {
      ids: ids.filter(id => !isDeferred(id) && !isDisabled(id)),
      values: values.filter(({ id }) => !isDeferred(id) && !isDisabled(id))
    };
  }

  async save(id: string, raw: string): Promise<void> {
    await this._connector.save(id, raw);
  }

  private _connector: IDataConnector<ISettingRegistry.IPlugin, string>;
  private _throttlers: { [key: string]: Throttler } = Object.create(null);
}
