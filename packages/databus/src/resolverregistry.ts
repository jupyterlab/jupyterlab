import { IDataset, IDataRegistry } from './dataregistry';
import { Token } from '@phosphor/coreutils';

export interface IResolver<T extends IDataset<any>> {
  resolve(url: URL): Promise<T | null>;
}

export class ResolverRegistry implements IResolver<any> {
  async resolve(url: URL): Promise<IDataset<any> | null> {
    for (const r of this._resolvers) {
      const res = await r.resolve(url);
      if (res !== null) {
        return res;
      }
    }
    return null;
  }

  register(resolver: IResolver<any>) {
    this._resolvers.push(resolver);
  }

  async hydrate(registry: IDataRegistry, urls: Array<URL>) {
    for (const dataset of await Promise.all(
      urls.map(url => this.resolve(url))
    )) {
      if (dataset) {
        registry.publish(dataset);
      }
    }
  }

  dehydrate(registry: IDataRegistry): Array<URL> {
    const urls: Array<URL> = [];
    for (const { url } of registry.datasets) {
      if (url) {
        urls.push(url);
      }
    }
    return urls;
  }

  private _resolvers: Array<IResolver<any>> = [];
}

export interface IResolverRegistry extends ResolverRegistry {}

/* tslint:disable */
export const IResolverRegistry = new Token<IResolverRegistry>(
  '@jupyterlab/databus:IResolverRegistry'
);
