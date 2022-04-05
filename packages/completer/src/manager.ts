// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { ConnectorProxy } from './connectorproxy';
import { CONTEXT_PROVIDER_ID } from './default/contextprovider';
import { KERNEL_PROVIDER_ID } from './default/kernelprovider';
import { CompletionHandler } from './handler';
import { CompleterModel } from './model';
import {
  ICompletionContext,
  ICompletionProvider,
  ICompletionProviderManager
} from './tokens';
import { Completer } from './widget';

/**
 * A manager for completer provider.
 */
export class CompletionProviderManager implements ICompletionProviderManager {
  /**
   * Construct a new completer manager.
   */
  constructor() {
    this._providers = new Map();
    this._panelHandlers = new Map();
    this._activeProvidersChanged = new Signal<ICompletionProviderManager, void>(
      this
    );
  }

  /**
   * Signal emitted when active providers list is changed.
   */
  get activeProvidersChanged(): ISignal<ICompletionProviderManager, void> {
    return this._activeProvidersChanged;
  }

  /**
   * Set provider timeout.
   *
   * @param {number} timeout - value of timeout in millisecond.
   */
  setTimeout(timeout: number): void {
    this._timeout = timeout;
  }

  /**
   * Enable/disable the document panel.
   */
  setShowDocumentFlag(showDoc: boolean): void {
    this._panelHandlers.forEach(
      handler => (handler.completer.showDocsPanel = showDoc)
    );
    this._showDoc = showDoc;
  }

  /**
   * Enable/disable continuous hinting mode.
   */
  setContinuousHinting(value: boolean): void {
    this._panelHandlers.forEach(handler => (handler.autoCompletion = value));
    this._autoCompletion = value;
  }

  /**
   * Register a completer provider with the manager.
   *
   * @param {ICompletionProvider} provider - the provider to be registered.
   */
  registerProvider(provider: ICompletionProvider): void {
    const identifier = provider.identifier;
    if (this._providers.has(identifier)) {
      console.warn(
        `Completion service with identifier ${identifier} is already registered`
      );
    } else {
      this._providers.set(identifier, provider);
    }
  }

  /**
   *
   * Return the map of providers.
   */
  getProviders(): Map<string, ICompletionProvider> {
    return this._providers;
  }

  /**
   * Activate the providers by id, the list of ids is populated from user setting.
   * The non-existing providers will be discarded.
   *
   * @param {Array<string>} providerIds - Array of strings with ids of provider
   */
  activateProvider(providerIds: Array<string>): void {
    this._activeProviders = new Set([]);
    providerIds.forEach(providerId => {
      if (this._providers.has(providerId)) {
        this._activeProviders.add(providerId);
      }
    });
    if (this._activeProviders.size === 0) {
      this._activeProviders.add(KERNEL_PROVIDER_ID);
      this._activeProviders.add(CONTEXT_PROVIDER_ID);
    }
    this._activeProvidersChanged.emit();
  }

  /**
   * Create or update completer handler of a widget with new context.
   *
   * @param newCompleterContext - The completion context.
   */
  async updateCompleter(
    newCompleterContext: ICompletionContext
  ): Promise<void> {
    const { widget, editor } = newCompleterContext;
    const id = widget.id;
    const handler = this._panelHandlers.get(id);
    if (!handler) {
      // Create a new handler.
      const handler = await this.generateHandler(newCompleterContext);
      this._panelHandlers.set(widget.id, handler);
      widget.disposed.connect(old => {
        this.disposeHandler(old.id, handler);
      });
    } else {
      // Update existing handler.
      handler.completer.showDocsPanel = this._showDoc;
      handler.autoCompletion = this._autoCompletion;
      if (editor) {
        handler.editor = editor;
        handler.connector = await this.generateConnectorProxy(
          newCompleterContext
        );
      }
    }
  }

  /**
   * Invoke the completer in the widget with provided id.
   *
   * @param id - the id of notebook panel, console panel or code editor.
   */
  invoke(id: string): void {
    const handler = this._panelHandlers.get(id);
    if (handler) {
      handler.invoke();
    }
  }

  /**
   * Activate `select` command in the widget with provided id.
   *
   * @param {string} id - the id of notebook panel, console panel or code editor.
   */
  select(id: string): void {
    const handler = this._panelHandlers.get(id);
    if (handler) {
      handler.completer.selectActive();
    }
  }

  /**
   * Helper function to generate a `ConnectorProxy` with provided context.
   * The `isApplicable` method of provider is used to filter out the providers
   * which can not be used with provided context.
   *
   * @param {ICompletionContext} completerContext - the current completer context
   */
  private async generateConnectorProxy(
    completerContext: ICompletionContext
  ): Promise<ConnectorProxy> {
    let providers: Array<ICompletionProvider> = [];
    //TODO Update list with rank
    for (const id of this._activeProviders) {
      const provider = this._providers.get(id);
      if (provider && (await provider.isApplicable(completerContext))) {
        providers.push(provider);
      }
    }
    return new ConnectorProxy(completerContext, providers, this._timeout);
  }

  /**
   * Helper to dispose the completer handler on widget disposed event.
   *
   * @param {string} id - id of the widget
   * @param {CompletionHandler} handler - the handler to be disposed.
   */
  private disposeHandler(id: string, handler: CompletionHandler) {
    handler.completer.model?.dispose();
    handler.completer.dispose();
    handler.dispose();
    this._panelHandlers.delete(id);
  }

  /**
   * Helper to generate a completer handler from provided context.
   */
  private async generateHandler(
    completerContext: ICompletionContext
  ): Promise<CompletionHandler> {
    const firstProvider = [...this._activeProviders][0];
    const provider = this._providers.get(firstProvider);

    let renderer = provider?.renderer;
    if (!renderer) {
      renderer = Completer.defaultRenderer;
    }
    const modelFactory = provider?.modelFactory;
    let model: Completer.IModel;
    if (modelFactory) {
      model = await modelFactory(completerContext);
    } else {
      model = new CompleterModel();
    }

    const completer = new Completer({ model, renderer });
    completer.showDocsPanel = this._showDoc;
    completer.hide();
    Widget.attach(completer, document.body);
    const connectorProxy = await this.generateConnectorProxy(completerContext);
    const handler = new CompletionHandler({
      completer,
      connector: connectorProxy
    });
    handler.editor = completerContext.editor;

    return handler;
  }

  /**
   * The completer provider map, the keys are id of provider
   */
  private readonly _providers: Map<string, ICompletionProvider>;

  /**
   * The completer handler map, the keys are id of widget and
   * values are the completer handler attached to this widget.
   */
  private _panelHandlers: Map<string, CompletionHandler>;

  /**
   * The set of activated provider
   */
  private _activeProviders = new Set([KERNEL_PROVIDER_ID, CONTEXT_PROVIDER_ID]);

  /**
   * Timeout value for the completer provider.
   */
  private _timeout: number;

  /**
   * Flag to show or hide the document panel.
   */
  private _showDoc: boolean;

  /**
   * Flag to enable/disable continuous hinting.
   */
  private _autoCompletion: boolean;

  private _activeProvidersChanged: Signal<ICompletionProviderManager, void>;
}
