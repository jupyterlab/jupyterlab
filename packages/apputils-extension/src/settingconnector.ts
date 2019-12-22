import { PageConfig } from '@jupyterlab/coreutils';

import { DataConnector, IDataConnector } from '@jupyterlab/statedb';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

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

  fetch(id: string): Promise<ISettingRegistry.IPlugin | undefined> {
    return this._connector.fetch(id);
  }

  async list(
    query: 'active' | 'all' = 'all'
  ): Promise<{ ids: string[]; values: ISettingRegistry.IPlugin[] }> {
    const { isDeferred, isDisabled } = PageConfig.Extension;
    let { ids, values } = await this._connector.list();

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
}
