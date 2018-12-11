import { SearchProviderRegistry } from './searchproviderregistry';

import { ISearchOptions, ISearchMatch, ISearchProvider } from './index';
import { Widget } from '@phosphor/widgets';
import { ApplicationShell } from '@jupyterlab/application';

export class Executor {
  constructor(registry: SearchProviderRegistry, shell: ApplicationShell) {
    this._registry = registry;
    this._shell = shell;
  }
  startSearch(options: ISearchOptions): Promise<ISearchMatch[]> {
    // TODO: figure out where to check if the options have changed
    // to know how to respond to an 'enter' keypress (new search or next search)
    let cleanupPromise = Promise.resolve();
    if (this._activeProvider) {
      console.log('we have an active provider already, cleaning up with end');
      cleanupPromise = this._activeProvider.endSearch();
    }
    this._currentWidget = this._shell.currentWidget;

    const compatibleProviders = this._registry.providers.filter(p =>
      p.canSearchOn(this._currentWidget)
    );
    // If multiple providers match, just use the first one.
    const provider = compatibleProviders[0];
    if (!provider) {
      console.warn(
        'Unable to search on current widget, no compatible search provider'
      );
      return;
    }
    this._activeProvider = provider;
    return cleanupPromise.then(() =>
      provider.startSearch(options, this._currentWidget)
    );
  }

  endSearch(): Promise<void> {
    if (!this._activeProvider) {
      return Promise.resolve();
    }
    return this._activeProvider.endSearch().then(() => {
      this._activeProvider = undefined;
      this._currentWidget = undefined;
    });
  }

  highlightNext(): Promise<ISearchMatch> {
    return this._activeProvider.highlightNext();
  }

  highlightPrevious(): Promise<ISearchMatch> {
    return this._activeProvider.highlightPrevious();
  }

  private _registry: SearchProviderRegistry;
  private _activeProvider: ISearchProvider;
  private _currentWidget: Widget;
  private _shell: ApplicationShell;
}
