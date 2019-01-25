import { IDataset, IDataRegistry } from './dataregistry';
import { Token } from '@phosphor/coreutils';

export interface IResolver<T extends IDataset<any>> {
  resolve(uri: string): Promise<T | null>;
}

export class ResolverRegistry implements IResolver<any> {
  constructor(public dataRegistry: IDataRegistry) {}
  async resolve(uri: string): Promise<IDataset<any> | null> {
    for (const r of this._resolvers) {
      const res = await r.resolve(uri);
      if (res !== null) {
        return res;
      }
    }
    return null;
  }
  async resolveAndPublish(uri: string): Promise<boolean> {
    const dataset = await this.resolve(uri);
    if (dataset === null) {
      return false;
    }
    this.dataRegistry.publish(dataset);
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
