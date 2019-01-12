import { SearchProviderRegistry } from './searchproviderregistry';
import { ISearchMatch, ISearchProvider } from './index';

import { ISignal, Signal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';

export class Executor {
  constructor(registry: SearchProviderRegistry, activeWidget: Widget) {
    this._registry = registry;
    this._currentWidget = activeWidget;
  }
  startSearch(options: RegExp): Promise<ISearchMatch[]> {
    // TODO: figure out where to check if the options have changed
    // to know how to respond to an 'enter' keypress (new search or next search)
    let cleanupPromise = Promise.resolve();
    if (this._activeProvider) {
      cleanupPromise = this._activeProvider.endSearch();
    }

    const provider = this._registry.getProviderForWidget(this._currentWidget);
    if (!provider) {
      console.warn(
        'Unable to search on current widget, no compatible search provider'
      );
      return;
    }
    this._activeProvider = provider;
    this._activeProvider.changed.connect(
      this._onChanged,
      this
    );
    return cleanupPromise.then(() =>
      provider.startSearch(options, this._currentWidget)
    );
  }

  endSearch(): Promise<void> {
    if (!this._activeProvider) {
      return Promise.resolve();
    }
    return this._activeProvider.endSearch().then(() => {
      this._activeProvider.changed.disconnect(this._onChanged);
      this._activeProvider = undefined;
      this._currentWidget = undefined;
    });
  }

  highlightNext(): Promise<ISearchMatch> {
    if (!this._activeProvider) {
      return Promise.resolve(null);
    }
    return this._activeProvider.highlightNext();
  }

  highlightPrevious(): Promise<ISearchMatch> {
    if (!this._activeProvider) {
      return Promise.resolve(null);
    }
    return this._activeProvider.highlightPrevious();
  }

  get currentMatchIndex(): number {
    if (!this._activeProvider) {
      return 0;
    }
    return this._activeProvider.currentMatchIndex;
  }

  get matches(): ISearchMatch[] {
    if (!this._activeProvider) {
      return [];
    }
    return this._activeProvider.matches;
  }

  get changed(): ISignal<this, void> {
    return this._changed;
  }

  private _onChanged(): void {
    this._changed.emit(null);
  }
  private _registry: SearchProviderRegistry;
  private _activeProvider: ISearchProvider;
  private _currentWidget: Widget;
  private _changed: Signal<this, void> = new Signal<this, void>(this);
}
