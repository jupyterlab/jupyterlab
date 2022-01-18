import { ICompletionProvider, ICompletionProviderManager } from './tokens';
import { ConnectorProxy } from './connectorproxy';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Completer } from './widget';
import { CompleterModel } from './model';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Session } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import { CompletionHandler } from './handler';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';
import { find, toArray } from '@lumino/algorithm';
import { ConsolePanel } from '@jupyterlab/console';
import { DEFAULT_PROVIDER_ID } from './default/provider';

export class CompletionProviderManager implements ICompletionProviderManager {
  constructor() {
    this._providers = new Map();
    this._panelHandlers = new Map();
  }

  generateConnectorProxy(options: {
    session: Session.ISessionConnection | null;
    editor: CodeEditor.IEditor | null;
  }): ConnectorProxy {
    let map: ConnectorProxy.IConnectorMap = new Map();
    this._activeProviders.forEach(id => {
      map.set(id, this._providers.get(id)!.provider.connectorFactory(options));
    });
    return new ConnectorProxy(map);
  }

  registerProvider(provider: ICompletionProvider): void {
    const identifier = provider.identifier;
    if (this._providers.has(identifier)) {
      console.warn(
        `Completion service with identifier ${identifier} is already registered`
      );
    } else {
      this._providers.set(identifier, {
        provider
      });
    }
  }

  getServices(): Map<string, ICompletionProviderManager.IRegisteredService> {
    return this._providers;
  }

  activateProvider(providerIds: Array<string>): void {
    this._activeProviders = new Set([]);
    providerIds.forEach(providerId => {
      if (this._providers.has(providerId)) {
        this._activeProviders.add(providerId);
      }
    });
    if (this._activeProviders.size === 0) {
      this._activeProviders.add(DEFAULT_PROVIDER_ID);
    }
  }

  generateHandler(
    editor: CodeEditor.IEditor | null,
    session: Session.ISessionConnection | null
  ): CompletionHandler {
    const firstProvider = [...this._activeProviders][0];
    let renderer = this._providers.get(firstProvider)?.provider.renderer;
    if (!renderer) {
      renderer = Completer.defaultRenderer;
    }
    const model = new CompleterModel();
    const completer = new Completer({ model, renderer });
    completer.hide();
    Widget.attach(completer, document.body);
    const connectorManager = this.generateConnectorProxy({ session, editor });
    const handler = new CompletionHandler({
      completer,
      connector: connectorManager
    });
    handler.editor = editor;

    return handler;
  }

  attachConsole(consolePanel: ConsolePanel): void {
    const anchor = consolePanel.console;
    const editor = anchor.promptCell?.editor ?? null;
    const session = anchor.sessionContext.session;
    const handler = this.generateHandler(editor, session);

    const updateConnector = () => {
      const editor = anchor.promptCell?.editor ?? null;
      const session = anchor.sessionContext.session;

      handler.editor = editor;
      handler.connector = this.generateConnectorProxy({ session, editor });
    };
    anchor.promptCellCreated.connect((_, cell) => {
      const editor = cell.editor;
      const session = anchor.sessionContext.session;

      handler.editor = editor;
      handler.connector = this.generateConnectorProxy({ session, editor });
    });
    anchor.sessionContext.sessionChanged.connect(updateConnector);

    this._panelHandlers.set(consolePanel.id, handler);
    consolePanel.disposed.connect(old => this._panelHandlers.delete(old.id));
  }

  attachEditor(
    widget: IDocumentWidget<FileEditor>,
    sessionManager: Session.IManager
  ): void {
    const editor = widget.content.editor;
    const handler = this.generateHandler(editor, null);
    const onRunningChanged = (
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
        handler.connector = this.generateConnectorProxy({ session, editor });
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

    onRunningChanged(sessionManager, toArray(sessionManager.running()));
    sessionManager.runningChanged.connect(onRunningChanged);

    widget.disposed.connect(() => {
      sessionManager.runningChanged.disconnect(onRunningChanged);
      const session = this._activeSessions[widget.id];
      if (session) {
        delete this._activeSessions[widget.id];
        session.dispose();
      }
    });

    this._panelHandlers.set(widget.id, handler);
  }

  attachPanel(panel: NotebookPanel): void {
    const editor = panel.content.activeCell?.editor ?? null;
    const session = panel.sessionContext.session;
    const handler = this.generateHandler(editor, session);

    const updateConnector = () => {
      const editor = panel.content.activeCell?.editor ?? null;
      const session = panel.sessionContext.session;

      handler.editor = editor;
      handler.connector = this.generateConnectorProxy({ session, editor });
    };

    panel.content.activeCellChanged.connect(updateConnector);
    panel.sessionContext.sessionChanged.connect(updateConnector);

    this._panelHandlers.set(panel.id, handler);
    panel.disposed.connect(old => this._panelHandlers.delete(old.id));
  }

  invoke(id: string): void {
    const handler = this._panelHandlers.get(id);
    if (handler) {
      handler.invoke();
    }
  }

  select(id: string): void {
    const handler = this._panelHandlers.get(id);
    if (handler) {
      handler.completer.selectActive();
    }
  }

  private readonly _providers: Map<
    string,
    ICompletionProviderManager.IRegisteredService
  >;
  private _panelHandlers: Map<string, CompletionHandler>;
  private _activeSessions: {
    [id: string]: Session.ISessionConnection;
  } = {};
  private _activeProviders = new Set([DEFAULT_PROVIDER_ID]);
}
