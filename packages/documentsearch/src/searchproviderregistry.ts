// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import {
  ISearchProvider,
  ISearchProviderFactory,
  ISearchProviderRegistry
} from './tokens';

/**
 * Search provider registry
 */
export class SearchProviderRegistry implements ISearchProviderRegistry {
  /**
   * Constructor
   *
   * @param translator Application translator object
   */
  constructor(protected translator: ITranslator = nullTranslator) {}

  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  add<T extends Widget = Widget>(
    key: string,
    provider: ISearchProviderFactory<T>
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
  getProvider(widget: Widget): ISearchProvider | undefined {
    // iterate through all providers and ask each one if it can search on the
    // widget.
    for (const P of this._providerMap.values()) {
      if (P.isApplicable(widget)) {
        return P.createNew(widget, this.translator);
      }
    }
    return undefined;
  }

  /**
   * Whether the registry as a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns Provider existence
   */
  hasProvider(widget: Widget): boolean {
    for (const P of this._providerMap.values()) {
      if (P.isApplicable(widget)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  private _changed = new Signal<this, void>(this);
  private _providerMap = new Map<string, ISearchProviderFactory<Widget>>();
}
