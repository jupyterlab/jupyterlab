// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISearchProvider, ISearchProviderConstructor } from './interfaces';
import { CodeMirrorSearchProvider } from './providers/codemirrorsearchprovider';
import { NotebookSearchProvider } from './providers/notebooksearchprovider';

import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { IDisposable, DisposableDelegate } from '@phosphor/disposable';

/* tslint:disable */
/**
 * The search provider registry token.
 */
export const ISearchProviderRegistry = new Token<ISearchProviderRegistry>(
  '@jupyterlab/documentsearch:ISearchProviderRegistry'
);
/* tslint:enable */

export interface ISearchProviderRegistry {
  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   */
  register(key: string, provider: ISearchProviderConstructor): IDisposable;

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: any): ISearchProvider | undefined;
}

export class SearchProviderRegistry implements ISearchProviderRegistry {
  constructor() {
    this._registerDefaultProviders(
      'jl-defaultNotebookSearchProvider',
      NotebookSearchProvider
    );
    this._registerDefaultProviders(
      'jl-defaultCodeMirrorSearchProvider',
      CodeMirrorSearchProvider
    );
  }

  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   */
  register(key: string, provider: ISearchProviderConstructor): IDisposable {
    this._customProviders.set(key, provider);
    return new DisposableDelegate(() => {
      this._customProviders.delete(key);
    });
  }

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: Widget): ISearchProvider | undefined {
    return (
      this._findMatchingProvider(this._customProviders, widget) ||
      this._findMatchingProvider(this._defaultProviders, widget)
    );
  }

  private _registerDefaultProviders(
    key: string,
    provider: ISearchProviderConstructor
  ): void {
    this._defaultProviders.set(key, provider);
  }

  private _findMatchingProvider(
    providerMap: Private.ProviderMap,
    widget: Widget
  ): ISearchProvider | undefined {
    // iterate through all providers and ask each one if it can search on the
    // widget.
    for (let P of providerMap.values()) {
      if (P.canSearchOn(widget)) {
        return new P();
      }
    }
    return undefined;
  }

  private _defaultProviders: Private.ProviderMap = new Map<
    string,
    ISearchProviderConstructor
  >();
  private _customProviders: Private.ProviderMap = new Map<
    string,
    ISearchProviderConstructor
  >();
}

namespace Private {
  export type ProviderMap = Map<string, ISearchProviderConstructor>;
}
