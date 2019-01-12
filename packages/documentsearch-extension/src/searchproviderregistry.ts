import { ISearchProvider } from './index';
import {
  CodeMirrorSearchProvider,
  NotebookSearchProvider
} from './searchproviders';

const DEFAULT_NOTEBOOK_SEARCH_PROVIDER = 'jl-defaultNotebookSearchProvider';
const DEFAULT_CODEMIRROR_SEARCH_PROVIDER = 'jl-defaultCodeMirrorSearchProvider';

interface ISearchProviderConstructor {
  new (): ISearchProvider;
}

export class SearchProviderRegistry {
  constructor() {
    this.registerDefaultProviders(
      DEFAULT_NOTEBOOK_SEARCH_PROVIDER,
      NotebookSearchProvider
    );
    this.registerDefaultProviders(
      DEFAULT_CODEMIRROR_SEARCH_PROVIDER,
      CodeMirrorSearchProvider
    );
  }

  registerProvider(key: string, provider: ISearchProviderConstructor): void {
    this._customProviders[key] = provider;
  }

  deregisterProvider(key: string): boolean {
    if (!this._customProviders[key]) {
      return false;
    }
    this._customProviders[key] = undefined;
    return true;
  }

  getProviderForWidget(widget: any): ISearchProvider {
    return (
      this.findMatchingProvider(this._customProviders, widget) ||
      this.findMatchingProvider(this._defaultProviders, widget)
    );
  }

  private registerDefaultProviders(
    key: string,
    provider: ISearchProviderConstructor
  ): void {
    this._defaultProviders[key] = provider;
  }

  private findMatchingProvider(
    providerMap: Private.ProviderMap,
    widget: any
  ): ISearchProvider {
    let providerInstance;
    Object.keys(providerMap)
      .map(k => providerMap[k])
      .forEach((providerConstructor: ISearchProviderConstructor) => {
        const testInstance = new providerConstructor();
        if (testInstance.canSearchOn(widget)) {
          providerInstance = testInstance;
        }
      });

    return providerInstance;
  }

  private _defaultProviders: Private.ProviderMap = {};
  private _customProviders: Private.ProviderMap = {};
}

namespace Private {
  export type ProviderMap = { [key: string]: ISearchProviderConstructor };
}
