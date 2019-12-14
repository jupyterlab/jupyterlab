// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';

import { ISearchProvider, ISearchProviderConstructor } from './interfaces';

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
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  register(key: string, provider: ISearchProviderConstructor<any>): IDisposable;

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: any): ISearchProvider<any> | undefined;

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  changed: ISignal<ISearchProviderRegistry, void>;
}
