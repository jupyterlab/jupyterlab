// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { IBaseSearchProvider } from '.';
import { ISearchProvider, ISearchProviderConstructor } from './interfaces';
import { ISearchProviderRegistry } from './tokens';

export class SearchProviderRegistry implements ISearchProviderRegistry {
  constructor(protected translator: ITranslator = nullTranslator) {}

  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  register<T extends Widget = Widget>(
    key: string,
    provider: ISearchProviderConstructor<T>
  ): IDisposable {
    this._providerMap.set(key, provider);
    this._changed.emit();
    return new DisposableDelegate(() => {
      this._providerMap.delete(key);
      this._changed.emit();
    });
  }

  /**
   * Add a search mime type provider to the registry.
   *
   * @param key - The mime type key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  registerMimeTypeSearchEngine(
    key: string,
    provider: IBaseSearchProvider<ReadonlyPartialJSONObject>
  ): IDisposable {
    this._mimeProviderMap.set(key, provider);
    this._changed.emit();
    return new DisposableDelegate(() => {
      this._mimeProviderMap.delete(key);
      this._changed.emit();
    });
  }

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget<T extends Widget = Widget>(
    widget: T
  ): ISearchProvider<T> | undefined {
    return this._findMatchingProvider(this._providerMap, widget);
  }

  /**
   * Returns a matching provider for the mimetype.
   *
   * @param key The mimetype to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getMimeTypeProvider(
    key: string
  ): IBaseSearchProvider<ReadonlyPartialJSONObject> | undefined {
    return this._mimeProviderMap.get(key);
  }

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  private _findMatchingProvider<T extends Widget = Widget>(
    providerMap: Private.ProviderMap,
    widget: T
  ): ISearchProvider<T> | undefined {
    // iterate through all providers and ask each one if it can search on the
    // widget.
    for (const P of providerMap.values()) {
      if (P.canSearchOn(widget)) {
        return new P(this.translator);
      }
    }
    return undefined;
  }

  private _changed = new Signal<this, void>(this);
  private _providerMap: Private.ProviderMap = new Map<
    string,
    ISearchProviderConstructor<Widget>
  >();
  private _mimeProviderMap = new Map<
    string,
    IBaseSearchProvider<ReadonlyPartialJSONObject>
  >();
}

namespace Private {
  export type ProviderMap = Map<string, ISearchProviderConstructor<Widget>>;
}
