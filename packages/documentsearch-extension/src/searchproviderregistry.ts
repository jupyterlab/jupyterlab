import { ISearchProvider } from './index';

import {
  CodeMirrorSearchProvider,
  NotebookSearchProvider
} from './searchproviders';

const DEFAULT_NOTEBOOK_SEARCH_PROVIDER = 'jl-defaultNotebookSearchProvider';
const DEFAULT_CODEMIRROR_SEARCH_PROVIDER = 'jl-defaultCodeMirrorSearchProvider';

export class SearchProviderRegistry {
  constructor() {
    this.registerProvider(
      DEFAULT_NOTEBOOK_SEARCH_PROVIDER,
      new NotebookSearchProvider()
    );
    this.registerProvider(
      DEFAULT_CODEMIRROR_SEARCH_PROVIDER,
      new CodeMirrorSearchProvider()
    );
  }

  registerProvider(key: string, provider: ISearchProvider): void {
    this._providers[key] = provider;
  }

  deregisterProvider(key: string): boolean {
    if (!this._providers[key]) {
      return false;
    }
    this._providers[key] = undefined;
    return true;
  }

  get providers(): ISearchProvider[] {
    return Object.keys(this._providers).map(k => this._providers[k]);
  }

  private _providers: Private.ProviderMap = {};
}

namespace Private {
  export type ProviderMap = { [key: string]: ISearchProvider };
}
