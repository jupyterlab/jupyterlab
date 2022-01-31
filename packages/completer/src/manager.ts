import { ICompletionProvider, ICompletionProviderManager } from './tokens';
import { ConnectorProxy } from './connectorproxy';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Completer } from './widget';
import { CompleterModel } from './model';
import { Session } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import { CompletionHandler } from './handler';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';
import { find, toArray } from '@lumino/algorithm';
import { ConsolePanel } from '@jupyterlab/console';
import { ICompletionContext } from '.';
import { CONTEXT_PROVIDER_ID } from './default/contextprovider';
import { KERNEL_PROVIDER_ID } from './default/kernelprovider';

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
  }

  /**
   * Set provider timeout
   *
   * @param {number} timeout - value of timeout in millisecond.
   */
  setTimeout(timeout: number): void {
    this._timeout = timeout;
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
  }

  /**
   * Activate completer providers for a console panel.
   */
  async attachConsole(consolePanel: ConsolePanel): Promise<void> {
    const anchor = consolePanel.console;
    const editor = anchor.promptCell?.editor ?? null;
    const session = anchor.sessionContext.session;
    const completerContext: ICompletionContext = {
      editor,
      widget: anchor,
      session
    };
    const handler = await this.generateHandler(completerContext);

    const updateConnector = async () => {
      const editor = anchor.promptCell?.editor ?? null;
      const session = anchor.sessionContext.session;

      handler.editor = editor;
      const completerContext: ICompletionContext = {
        editor,
        widget: anchor,
        session
      };
      handler.connector = await this.generateConnectorProxy(completerContext);
    };
    anchor.promptCellCreated.connect(async (_, cell) => {
      const editor = cell.editor;
      const session = anchor.sessionContext.session;
      const completerContext: ICompletionContext = {
        editor,
        widget: anchor,
        session
      };
      handler.editor = editor;

      handler.connector = await this.generateConnectorProxy(completerContext);
    });
    anchor.sessionContext.sessionChanged.connect(updateConnector);

    this._panelHandlers.set(consolePanel.id, handler);
    consolePanel.disposed.connect(old => {
      this.disposeHandler(old.id, handler);
    });
  }

  /**
   * Activate completer providers for a code editor.
   */
  async attachEditor(
    widget: IDocumentWidget<FileEditor>,
    sessionManager: Session.IManager
  ): Promise<void> {
    const editor = widget.content.editor;
    const completerContext: ICompletionContext = { editor, widget };
    const handler = await this.generateHandler(completerContext);
    const onRunningChanged = async (
      sender: Session.IManager,
      models: Session.IModel[]
    ) => {
      const oldSession = this._activeSessions[widget.id];
      // Search for a matching path.
      const model = find(models, m => m.path === widget.context.path);
      if (model) {
        // If there is a matching path, but it is the same
        // session as we previously had, do nothing.
        if (oldSession && oldSession.id === model.id) {
          return;
        }
        // Otherwise, dispose of the old session and reset to
        // a new CompletionConnector.
        if (oldSession) {
          delete this._activeSessions[widget.id];
          oldSession.dispose();
        }
        const session = sessionManager.connectTo({ model });
        const completerContext: ICompletionContext = {
          editor,
          widget,
          session
        };
        handler.connector = await this.generateConnectorProxy(completerContext);
        this._activeSessions[widget.id] = session;
      } else {
        // If we didn't find a match, make sure
        // the connector is the contextConnector and
        // dispose of any previous connection.
        if (oldSession) {
          delete this._activeSessions[widget.id];
          oldSession.dispose();
        }
      }
    };

    await onRunningChanged(sessionManager, toArray(sessionManager.running()));
    sessionManager.runningChanged.connect(onRunningChanged);

    widget.disposed.connect(() => {
      sessionManager.runningChanged.disconnect(onRunningChanged);
      const session = this._activeSessions[widget.id];
      if (session) {
        delete this._activeSessions[widget.id];
        session.dispose();
      }
      this.disposeHandler(widget.id, handler);
    });

    this._panelHandlers.set(widget.id, handler);
  }

  /**
   * Activate completer providers for a notebook.
   */
  async attachPanel(panel: NotebookPanel): Promise<void> {
    const editor = panel.content.activeCell?.editor ?? null;
    const session = panel.sessionContext.session;
    const completerContext: ICompletionContext = {
      editor,
      widget: panel,
      session
    };
    const handler = await this.generateHandler(completerContext);

    const updateConnector = async () => {
      const editor = panel.content.activeCell?.editor ?? null;
      const session = panel.sessionContext.session;

      if (editor) {
        handler.editor = editor;
        const completerContext: ICompletionContext = {
          editor,
          widget: panel,
          session
        };
        handler.connector = await this.generateConnectorProxy(completerContext);
      }
    };

    panel.content.activeCellChanged.connect(updateConnector);
    panel.sessionContext.sessionChanged.connect(updateConnector);
    this._panelHandlers.set(panel.id, handler);
    panel.disposed.connect(old => {
      this.disposeHandler(old.id, handler);
    });
  }

  /**
   * Invoke the completer in the widget with provided id.
   *
   * @param {string} id - the id of notebook panel, console panel or code editor.
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
    let renderer = this._providers.get(firstProvider)?.renderer;
    if (!renderer) {
      renderer = Completer.defaultRenderer;
    }
    const model = new CompleterModel();
    const completer = new Completer({ model, renderer });
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
   * A cache of `Session.ISessionConnection`, it is used to set the
   * session for file editor.
   */
  private _activeSessions: {
    [id: string]: Session.ISessionConnection;
  } = {};

  /**
   * The set of activated provider
   */
  private _activeProviders = new Set([KERNEL_PROVIDER_ID, CONTEXT_PROVIDER_ID]);

  /**
   * Timeout value for the completer provider.
   */
  private _timeout: number;
}
