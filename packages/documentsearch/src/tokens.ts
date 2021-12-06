// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { IBaseSearchProvider } from '.';
import { ISearchProvider, ISearchProviderConstructor } from './interfaces';

/**
 * The search provider registry token.
 */
export const ISearchProviderRegistry = new Token<ISearchProviderRegistry>(
  '@jupyterlab/documentsearch:ISearchProviderRegistry'
);

export interface ISearchProviderRegistry {
  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  register(
    key: string,
    provider: ISearchProviderConstructor<Widget>
  ): IDisposable;

  /**
   * Add a search mime type provider to the registry.
   *
   * @param key - The mime type key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  registerMimeTypeSearchEngine(
    key: string,
    provider: IBaseSearchProvider<ReadonlyPartialJSONObject>
  ): IDisposable;

  /**
   * Returns a matching provider for the mimetype.
   *
   * @param key The mimetype to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getMimeTypeProvider(
    key: string
  ): IBaseSearchProvider<ReadonlyPartialJSONObject> | undefined;

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: Widget): ISearchProvider<Widget> | undefined;

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  changed: ISignal<ISearchProviderRegistry, void>;
}
