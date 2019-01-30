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

  private _resolvers: Array<IResolver<any>> = [];
}

export interface IResolverRegistry extends ResolverRegistry {}

/* tslint:disable */
export const IResolverRegistry = new Token<IResolverRegistry>(
  '@jupyterlab/databus:IResolverRegistry'
);
