import { ISearchProvider } from './index';
import {
  CodeMirrorSearchProvider,
  NotebookSearchProvider
} from './searchproviders';

const DEFAULT_NOTEBOOK_SEARCH_PROVIDER = 'jl-defaultNotebookSearchProvider';
const DEFAULT_CODEMIRROR_SEARCH_PROVIDER = 'jl-defaultCodeMirrorSearchProvider';

export class SearchProviderRegistry {
  constructor() {
    this.registerDefaultProviders(
      DEFAULT_NOTEBOOK_SEARCH_PROVIDER,
      new NotebookSearchProvider()
    );
    this.registerDefaultProviders(
      DEFAULT_CODEMIRROR_SEARCH_PROVIDER,
      new CodeMirrorSearchProvider()
    );
  }

  registerProvider(key: string, provider: ISearchProvider): void {
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
    provider: ISearchProvider
  ): void {
    this._defaultProviders[key] = provider;
  }

  private findMatchingProvider(
    providerMap: Private.ProviderMap,
    widget: any
  ): ISearchProvider {
    const compatibleProvders = Object.keys(providerMap)
      .map(k => providerMap[k])
      .filter((p: ISearchProvider) => p.canSearchOn(widget));

    if (compatibleProvders.length !== 0) {
      return compatibleProvders[0];
    }
    return null;
  }

  private _defaultProviders: Private.ProviderMap = {};
  private _customProviders: Private.ProviderMap = {};
}

namespace Private {
  export type ProviderMap = { [key: string]: ISearchProvider };
}
