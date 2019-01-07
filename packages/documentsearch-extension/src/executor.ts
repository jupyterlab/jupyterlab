import { SearchProviderRegistry } from './searchproviderregistry';
import { ISearchMatch, ISearchProvider } from './index';

import { ApplicationShell } from '@jupyterlab/application';

import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';

export class Executor {
  constructor(registry: SearchProviderRegistry, shell: ApplicationShell) {
    this._registry = registry;
    this._shell = shell;
  }
  startSearch(options: RegExp): Promise<ISearchMatch[]> {
    // TODO: figure out where to check if the options have changed
    // to know how to respond to an 'enter' keypress (new search or next search)
    let cleanupPromise = Promise.resolve();
    if (this._activeProvider) {
      cleanupPromise = this._activeProvider.endSearch();
    }
    this._currentWidget = this._shell.currentWidget;

    const provider = this._registry.getProviderForWidget(this._currentWidget);
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

  get currentMatchIndex(): number {
    return this._activeProvider.currentMatchIndex;
  }

  get matches(): ISearchMatch[] {
    return this._activeProvider.matches;
  }

  get changed(): ISignal<ISearchProvider, void> {
    return this._activeProvider.changed;
  }

  private _registry: SearchProviderRegistry;
  private _activeProvider: ISearchProvider;
  private _currentWidget: Widget;
  private _shell: ApplicationShell;
}
