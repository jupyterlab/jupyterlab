// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISearchProvider, ISearchProviderConstructor } from './interfaces';
import { ISearchProviderRegistry } from './tokens';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

export class SearchProviderRegistry implements ISearchProviderRegistry {
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
        return new P();
      }
    }
    return undefined;
  }

  private _changed = new Signal<this, void>(this);
  private _providerMap: Private.ProviderMap = new Map<
    string,
    ISearchProviderConstructor<any>
  >();
}

namespace Private {
  export type ProviderMap = Map<string, ISearchProviderConstructor<any>>;
}
