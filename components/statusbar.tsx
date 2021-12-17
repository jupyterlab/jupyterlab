// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on the @jupyterlab/codemirror-extension statusbar

import {
  VDomModel,
  VDomRenderer,
  Dialog,
  showDialog
} from '@jupyterlab/apputils';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import {
  GroupItem,
  Popup,
  TextItem,
  interactiveItem,
  showPopup
} from '@jupyterlab/statusbar';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  LabIcon,
  caretDownIcon,
  caretUpIcon,
  circleEmptyIcon,
  circleIcon,
  stopIcon
} from '@jupyterlab/ui-components';
import React from 'react';

import '../../style/statusbar.css';
import * as SCHEMA from '../_schema';
import { WidgetAdapter } from '../adapters/adapter';
import { LSPConnection } from '../connection';
import { DocumentConnectionManager } from '../connection_manager';
import { SERVER_EXTENSION_404 } from '../errors';
import { LanguageServerManager } from '../manager';
import {
  ILSPAdapterManager,
  ILanguageServerManager,
  TSessionMap,
  TLanguageServerId,
  TSpecsMap
} from '../tokens';
import { VirtualDocument, collect_documents } from '../virtual/document';

import { codeCheckIcon, codeClockIcon, codeWarningIcon } from './icons';
import { DocumentLocator } from './utils';

import okButton = Dialog.okButton;

interface IServerStatusProps {
  server: SCHEMA.LanguageServerSession;
}

function ServerStatus(props: IServerStatusProps) {
  let list = props.server.spec.languages.map((language, i) => (
    <li key={i}>{language}</li>
  ));
  return (
    <div className={'lsp-server-status'}>
      <h5>{props.server.spec.display_name}</h5>
      <ul>{list}</ul>
    </div>
  );
}

export interface IListProps {
  /**
   * A title to display.
   */
  title: string;
  list: any[];
  /**
   * By default the list will be expanded; to change the initial state to collapsed, set to true.
   */
  startCollapsed?: boolean;
}

export interface ICollapsibleListStates {
  isCollapsed: boolean;
}

class CollapsibleList extends React.Component<
  IListProps,
  ICollapsibleListStates
> {
  constructor(props: IListProps) {
    super(props);
    this.state = { isCollapsed: props.startCollapsed || false };
  }

  handleClick = () => {
    this.setState(state => ({
      isCollapsed: !state.isCollapsed
    }));
  };

  render() {
    const collapseExpandIcon = !this.state.isCollapsed
      ? caretUpIcon
      : caretDownIcon;
    return (
      <div
        className={
          'lsp-collapsible-list ' +
          (this.state.isCollapsed ? 'lsp-collapsed' : '')
        }
      >
        <h4 onClick={this.handleClick}>
          <collapseExpandIcon.react tag="span" className="lsp-caret-icon" />
          {this.props.title}: {this.props.list.length}
        </h4>
        <div>{this.props.list}</div>
      </div>
    );
  }
}

interface IHelpButtonProps {
  language: string;
  servers: TSpecsMap;
  trans: TranslationBundle;
}

interface ILanguageServerInfo {
  serverId: TLanguageServerId;
  specs: SCHEMA.LanguageServerSpec;
  trans: TranslationBundle;
}

class LanguageServerInfo extends React.Component<ILanguageServerInfo, any> {
  render() {
    const specification = this.props.specs;
    const trans = this.props.trans;
    return (
      <div>
        <h3>{specification.display_name}</h3>
        <div>
          <ul className={'lsp-server-links-list'}>
            {Object.entries(specification?.urls || {}).map(([name, url]) => (
              <li key={this.props.serverId + '-url-' + name}>
                {name}:{' '}
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
          <h4>{trans.__('Troubleshooting')}</h4>
          <p className={'lsp-troubleshoot-section'}>
            {specification.troubleshoot
              ? specification.troubleshoot
              : trans.__(
                  'In case of issues with installation feel welcome to ask a question on GitHub.'
                )}
          </p>
          <h4>{trans.__('Installation')}</h4>
          <ul>
            {specification?.install
              ? Object.entries(specification?.install || {}).map(
                  ([name, command]) => (
                    <li key={this.props.serverId + '-install-' + name}>
                      {name}: <code>{command}</code>
                    </li>
                  )
                )
              : trans.__(
                  'No installation instructions were provided with this specification.'
                )}
          </ul>
        </div>
      </div>
    );
  }
}

class HelpButton extends React.Component<IHelpButtonProps, any> {
  handleClick = () => {
    const trans = this.props.trans;

    showDialog({
      title: trans.__(
        'No language server for %1 detected',
        this.props.language
      ),
      body: (
        <div>
          {this.props.servers.size ? (
            <div>
              <p>
                {trans._n(
                  'There is %1 language server you can easily install that supports %2.',
                  'There are %1 language servers you can easily install that supports %2.',
                  this.props.servers.size,
                  this.props.language
                )}
              </p>
              {[...this.props.servers.entries()].map(([key, specification]) => (
                <LanguageServerInfo
                  specs={specification}
                  serverId={key}
                  key={key}
                  trans={trans}
                />
              ))}
            </div>
          ) : (
            <div>
              <p>
                {trans.__(
                  'We do not have an auto-detection ready for a language servers supporting %1 yet.',
                  this.props.language
                )}
              </p>
              <p>
                {trans.__(
                  'You may contribute a specification for auto-detection as described in our '
                )}{' '}
                <a
                  href={
                    'https://jupyterlab-lsp.readthedocs.io/en/latest/Contributing.html#specs'
                  }
                >
                  {trans.__('documentation')}
                </a>
              </p>
            </div>
          )}
        </div>
      ),
      buttons: [okButton()]
    }).catch(console.warn);
  };

  render() {
    return (
      <button
        type={'button'}
        className={'jp-Button lsp-help-button'}
        onClick={this.handleClick}
      >
        ?
      </button>
    );
  }
}

class LSPPopup extends VDomRenderer<LSPStatus.Model> {
  constructor(model: LSPStatus.Model) {
    super(model);
    this.addClass('lsp-popover');
  }
  render() {
    if (!this.model?.connection_manager) {
      return null;
    }
    const servers_available = this.model.servers_available_not_in_use.map(
      (session, i) => <ServerStatus key={i} server={session} />
    );

    let running_servers = new Array<any>();
    let key = -1;
    for (let [
      session,
      documents_by_language
    ] of this.model.documents_by_server.entries()) {
      key += 1;
      let documents_html = new Array<any>();
      for (let [language, documents] of documents_by_language) {
        // TODO: stop button
        // TODO: add a config buttons next to the language header
        let list = documents.map((document, i) => {
          let connection = this.model.connection_manager.connections.get(
            document.uri
          );

          let status = '';
          if (connection?.isInitialized) {
            status = 'initialized';
          } else if (connection?.isConnected) {
            status = 'connected';
          } else {
            status = 'not connected';
          }

          const icon = status === 'initialized' ? circleIcon : circleEmptyIcon;

          return (
            <li key={i}>
              <DocumentLocator
                document={document}
                adapter={this.model.adapter}
              />
              <span className={'lsp-document-status'}>
                {this.model.trans.__(status)}
                <icon.react
                  tag="span"
                  className="lsp-document-status-icon"
                  elementSize={'small'}
                />
              </span>
            </li>
          );
        });

        documents_html.push(
          <div key={key} className={'lsp-documents-by-language'}>
            <h5>
              {language}{' '}
              <span className={'lsp-language-server-name'}>
                ({session.spec.display_name})
              </span>
            </h5>
            <ul>{list}</ul>
          </div>
        );
      }

      running_servers.push(<div key={key}>{documents_html}</div>);
    }

    const missing_languages = this.model.missing_languages.map(
      (language, i) => {
        const specs_for_missing =
          this.model.language_server_manager.getMatchingSpecs({ language });
        return (
          <div key={i} className={'lsp-missing-server'}>
            {language}
            {specs_for_missing.size ? (
              <HelpButton
                language={language}
                servers={specs_for_missing}
                trans={this.model.trans}
              />
            ) : (
              ''
            )}
          </div>
        );
      }
    );
    const trans = this.model.trans;
    return (
      <div className={'lsp-popover-content'}>
        <div className={'lsp-servers-menu'}>
          <h3 className={'lsp-servers-title'}>{trans.__('LSP servers')}</h3>
          <div className={'lsp-servers-lists'}>
            {servers_available.length ? (
              <CollapsibleList
                key={'available'}
                title={trans.__('Available')}
                list={servers_available}
                startCollapsed={true}
              />
            ) : (
              ''
            )}
            {running_servers.length ? (
              <CollapsibleList
                key={'running'}
                title={trans.__('Running')}
                list={running_servers}
              />
            ) : (
              ''
            )}
            {missing_languages.length ? (
              <CollapsibleList
                key={'missing'}
                title={trans.__('Missing')}
                list={missing_languages}
              />
            ) : (
              ''
            )}
          </div>
        </div>
        <div className={'lsp-popover-status'}>
          {trans.__('Documentation:')}{' '}
          <a
            href={
              'https://jupyterlab-lsp.readthedocs.io/en/latest/Language%20Servers.html'
            }
            target="_blank"
            rel="noreferrer"
          >
            {trans.__('Language Servers')}
          </a>
        </div>
      </div>
    );
  }
}

const SELECTED_CLASS = 'jp-mod-selected';

/**
 * StatusBar item.
 */
export class LSPStatus extends VDomRenderer<LSPStatus.Model> {
  protected _popup: Popup = null;
  private interactiveStateObserver: MutationObserver;
  private trans: TranslationBundle;
  /**
   * Construct a new VDomRenderer for the status item.
   */
  constructor(
    widget_manager: ILSPAdapterManager,
    protected displayText: boolean = true,
    trans: TranslationBundle
  ) {
    super(new LSPStatus.Model(widget_manager, trans));
    this.addClass(interactiveItem);
    this.addClass('lsp-statusbar-item');
    this.trans = trans;
    this.title.caption = this.trans.__('LSP status');

    // add human-readable (and stable) class name reflecting otherwise obfuscated typestyle interactiveItem
    this.interactiveStateObserver = new MutationObserver(() => {
      const has_selected = this.node.classList.contains(SELECTED_CLASS);
      if (!this.node.classList.contains(interactiveItem)) {
        if (!has_selected) {
          this.addClass(SELECTED_CLASS);
        }
      } else {
        if (has_selected) {
          this.removeClass(SELECTED_CLASS);
        }
      }
    });
  }

  protected onAfterAttach(msg: any) {
    super.onAfterAttach(msg);
    this.interactiveStateObserver.observe(this.node, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  protected onBeforeDetach(msg: any) {
    super.onBeforeDetach(msg);
    this.interactiveStateObserver.disconnect();
  }

  /**
   * Render the status item.
   */
  render() {
    const { model } = this;

    if (model == null) {
      return null;
    }

    return (
      <GroupItem
        spacing={this.displayText ? 2 : 0}
        title={model.long_message}
        onClick={this.handleClick}
        className={'lsp-status-group'}
      >
        <model.status_icon.react
          top={'2px'}
          kind={'statusBar'}
          title={this.trans.__('LSP Code Intelligence')}
        />
        {this.displayText ? (
          <TextItem
            className={'lsp-status-message'}
            source={model.short_message}
          />
        ) : null}
        <TextItem source={model.feature_message} />
      </GroupItem>
    );
  }

  handleClick = () => {
    if (this._popup) {
      this._popup.dispose();
    }
    if (this.model.status.status == 'no_server_extension') {
      showDialog({
        title: this.trans.__('LSP server extension not found'),
        body: SERVER_EXTENSION_404,
        buttons: [okButton()]
      }).catch(console.warn);
    } else {
      this._popup = showPopup({
        body: new LSPPopup(this.model),
        anchor: this,
        align: 'left'
      });
    }
  };
}

export class StatusButtonExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  constructor(
    private options: {
      language_server_manager: LanguageServerManager;
      connection_manager: DocumentConnectionManager;
      adapter_manager: ILSPAdapterManager;
      translator_bundle: TranslationBundle;
    }
  ) {}

  /**
   * For statusbar registration and for internal use.
   */
  createItem(displayText: boolean = true): LSPStatus {
    const status_bar_item = new LSPStatus(
      this.options.adapter_manager,
      displayText,
      this.options.translator_bundle
    );
    status_bar_item.model.language_server_manager =
      this.options.language_server_manager;
    status_bar_item.model.connection_manager = this.options.connection_manager;
    return status_bar_item;
  }

  /**
   * For registration on notebook panels.
   */
  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): LSPStatus {
    const item = this.createItem(false);
    item.addClass('jp-ToolbarButton');
    panel.toolbar.insertAfter('spacer', 'LSPStatus', item);

    return item;
  }
}

type StatusCode =
  | 'no_server_extension'
  | 'waiting'
  | 'initializing'
  | 'initialized'
  | 'connecting'
  | 'initialized_but_some_missing';

export interface IStatus {
  connected_documents: Set<VirtualDocument>;
  initialized_documents: Set<VirtualDocument>;
  open_connections: Array<LSPConnection>;
  detected_documents: Set<VirtualDocument>;
  status: StatusCode;
}

function collect_languages(virtual_document: VirtualDocument): Set<string> {
  let documents = collect_documents(virtual_document);
  return new Set(
    [...documents].map(document => document.language.toLocaleLowerCase())
  );
}

type StatusMap = Record<StatusCode, string>;
type StatusIconClass = Record<StatusCode, string>;

const classByStatus: StatusIconClass = {
  no_server_extension: 'error',
  waiting: 'inactive',
  initialized: 'ready',
  initializing: 'preparing',
  initialized_but_some_missing: 'ready',
  connecting: 'preparing'
};

const iconByStatus: Record<StatusCode, LabIcon> = {
  no_server_extension: codeWarningIcon,
  waiting: codeClockIcon,
  initialized: codeCheckIcon,
  initializing: codeClockIcon,
  initialized_but_some_missing: codeWarningIcon,
  connecting: codeClockIcon
};

const shortMessageByStatus: StatusMap = {
  no_server_extension: 'Server extension missing',
  waiting: 'Waiting...',
  initialized: 'Fully initialized',
  initialized_but_some_missing: 'Initialized (additional servers needed)',
  initializing: 'Initializing...',
  connecting: 'Connecting...'
};

export namespace LSPStatus {
  /**
   * A VDomModel for the LSP of current file editor/notebook.
   */
  export class Model extends VDomModel {
    server_extension_status: SCHEMA.ServersResponse = null;
    language_server_manager: ILanguageServerManager;
    trans: TranslationBundle;
    private _connection_manager: DocumentConnectionManager;

    constructor(
      widget_adapter_manager: ILSPAdapterManager,
      trans: TranslationBundle
    ) {
      super();
      this.trans = trans;
      widget_adapter_manager.adapterChanged.connect((manager, adapter) => {
        this.change_adapter(adapter);
      }, this);
      widget_adapter_manager.adapterDisposed.connect((manager, adapter) => {
        if (this.adapter === adapter) {
          this.change_adapter(null);
        }
      }, this);
    }

    get available_servers(): TSessionMap {
      return this.language_server_manager.sessions;
    }

    get supported_languages(): Set<string> {
      const languages = new Set<string>();
      for (let server of this.available_servers.values()) {
        for (let language of server.spec.languages) {
          languages.add(language.toLocaleLowerCase());
        }
      }
      return languages;
    }

    private is_server_running(
      id: TLanguageServerId,
      server: SCHEMA.LanguageServerSession
    ): boolean {
      for (const language of this.detected_languages) {
        const matchedServers = this.language_server_manager.getMatchingServers({
          language
        });
        // TODO server.status === "started" ?
        // TODO update once multiple servers are allowed
        if (matchedServers.length && matchedServers[0] === id) {
          return true;
        }
      }
    }

    get documents_by_server(): Map<
      SCHEMA.LanguageServerSession,
      Map<string, VirtualDocument[]>
    > {
      let data = new Map<
        SCHEMA.LanguageServerSession,
        Map<string, VirtualDocument[]>
      >();
      if (!this.adapter?.virtual_editor) {
        return data;
      }

      let main_document = this.adapter.virtual_editor.virtual_document;
      let documents = collect_documents(main_document);

      for (let document of documents.values()) {
        let language = document.language.toLocaleLowerCase();
        let server_ids =
          this._connection_manager.language_server_manager.getMatchingServers({
            language: document.language
          });
        if (server_ids.length === 0) {
          continue;
        }
        // For now only use the server with the highest priority
        let server = this.language_server_manager.sessions.get(server_ids[0]);

        if (!data.has(server)) {
          data.set(server, new Map<string, VirtualDocument[]>());
        }

        let documents_map = data.get(server);

        if (!documents_map.has(language)) {
          documents_map.set(language, new Array<VirtualDocument>());
        }

        let documents = documents_map.get(language);
        documents.push(document);
      }
      return data;
    }

    get servers_available_not_in_use(): Array<SCHEMA.LanguageServerSession> {
      return [...this.available_servers.entries()]
        .filter(([id, server]) => !this.is_server_running(id, server))
        .map(([id, server]) => server);
    }

    get detected_languages(): Set<string> {
      if (!this.adapter?.virtual_editor) {
        return new Set<string>();
      }

      let document = this.adapter.virtual_editor.virtual_document;
      return collect_languages(document);
    }

    get missing_languages(): Array<string> {
      // TODO: false negative for r vs R?
      return [...this.detected_languages].filter(
        language => !this.supported_languages.has(language.toLocaleLowerCase())
      );
    }

    get status(): IStatus {
      let detected_documents: Map<string, VirtualDocument>;

      if (!this.adapter?.virtual_editor) {
        detected_documents = new Map();
      } else {
        let main_document = this.adapter.virtual_editor.virtual_document;
        const all_documents = this._connection_manager.documents;
        // detected documents that are open in the current virtual editor
        const detected_documents_set = collect_documents(main_document);
        detected_documents = new Map(
          [...all_documents].filter(([id, doc]) =>
            detected_documents_set.has(doc)
          )
        );
      }

      let connected_documents = new Set<VirtualDocument>();
      let initialized_documents = new Set<VirtualDocument>();
      let absent_documents = new Set<VirtualDocument>();
      // detected documents with LSP servers available
      let documents_with_available_servers = new Set<VirtualDocument>();
      // detected documents with LSP servers known
      let documents_with_known_servers = new Set<VirtualDocument>();

      detected_documents.forEach((document, uri) => {
        let connection = this._connection_manager.connections.get(uri);
        let server_ids =
          this._connection_manager.language_server_manager.getMatchingServers({
            language: document.language
          });

        if (server_ids.length !== 0) {
          documents_with_known_servers.add(document);
        }
        if (!connection) {
          absent_documents.add(document);
          return;
        } else {
          documents_with_available_servers.add(document);
        }

        if (connection.isConnected) {
          connected_documents.add(document);
        }
        if (connection.isInitialized) {
          initialized_documents.add(document);
        }
      });

      // there may be more open connections than documents if a document was recently closed
      // and the grace period has not passed yet
      let open_connections = new Array<LSPConnection>();
      this._connection_manager.connections.forEach((connection, path) => {
        if (connection.isConnected) {
          open_connections.push(connection);
        }
      });

      let status: StatusCode;
      if (this.language_server_manager.statusCode === 404) {
        status = 'no_server_extension';
      } else if (detected_documents.size === 0) {
        status = 'waiting';
      } else if (initialized_documents.size === detected_documents.size) {
        status = 'initialized';
      } else if (
        initialized_documents.size === documents_with_available_servers.size &&
        detected_documents.size > documents_with_known_servers.size
      ) {
        status = 'initialized_but_some_missing';
      } else if (
        connected_documents.size === documents_with_available_servers.size
      ) {
        status = 'initializing';
      } else {
        status = 'connecting';
      }

      return {
        open_connections,
        connected_documents,
        initialized_documents,
        detected_documents: new Set([...detected_documents.values()]),
        status
      };
    }

    get status_icon(): LabIcon {
      if (!this.adapter) {
        return stopIcon;
      }
      return iconByStatus[this.status.status].bindprops({
        className: 'lsp-status-icon ' + classByStatus[this.status.status]
      });
    }

    get short_message(): string {
      if (!this.adapter) {
        return this.trans.__('not initialized');
      }
      return this.trans.__(shortMessageByStatus[this.status.status]);
    }

    get feature_message(): string {
      return this.adapter?.status_message?.message || '';
    }

    get long_message(): string {
      if (!this.adapter) {
        return this.trans.__('not initialized');
      }
      let status = this.status;
      let msg = '';
      if (status.status === 'waiting') {
        msg = this.trans.__('Waiting for documents initialization...');
      } else if (status.status === 'initialized') {
        msg = this.trans._n(
          'Fully connected & initialized (%2 virtual document)',
          'Fully connected & initialized (%2 virtual document)',
          status.detected_documents.size,
          status.detected_documents.size
        );
      } else if (status.status === 'initializing') {
        const uninitialized = new Set<VirtualDocument>(
          status.detected_documents
        );
        for (let initialized of status.initialized_documents.values()) {
          uninitialized.delete(initialized);
        }
        // servers for n documents did not respond to the initialization request
        msg = this.trans._np(
          'pluralized',
          'Fully connected, but %2/%3 virtual document stuck uninitialized: %4',
          'Fully connected, but %2/%3 virtual documents stuck uninitialized: %4',
          status.detected_documents.size,
          uninitialized.size,
          status.detected_documents.size,
          [...uninitialized].map(document => document.id_path).join(', ')
        );
      } else {
        const unconnected = new Set<VirtualDocument>(status.detected_documents);
        for (let connected of status.connected_documents.values()) {
          unconnected.delete(connected);
        }

        msg = this.trans._np(
          'pluralized',
          '%2/%3 virtual document connected (%4 connections; waiting for: %5)',
          '%2/%3 virtual documents connected (%4 connections; waiting for: %5)',
          status.detected_documents.size,
          status.connected_documents.size,
          status.detected_documents.size,
          status.open_connections.length,
          [...unconnected].map(document => document.id_path).join(', ')
        );
      }
      return msg;
    }

    get adapter(): WidgetAdapter<IDocumentWidget> | null {
      return this._adapter;
    }

    change_adapter(adapter: WidgetAdapter<IDocumentWidget> | null) {
      if (this._adapter != null) {
        this._adapter.status_message.changed.disconnect(this._onChange);
      }

      if (adapter != null) {
        adapter.status_message.changed.connect(this._onChange);
      }

      this._adapter = adapter;
    }

    get connection_manager() {
      return this._connection_manager;
    }

    /**
     * Note: it is ever only set once, as connection_manager is a singleton.
     */
    set connection_manager(connection_manager) {
      if (this._connection_manager != null) {
        this._connection_manager.connected.disconnect(this._onChange);
        this._connection_manager.initialized.connect(this._onChange);
        this._connection_manager.disconnected.disconnect(this._onChange);
        this._connection_manager.closed.disconnect(this._onChange);
        this._connection_manager.documents_changed.disconnect(this._onChange);
      }

      if (connection_manager != null) {
        connection_manager.connected.connect(this._onChange);
        connection_manager.initialized.connect(this._onChange);
        connection_manager.disconnected.connect(this._onChange);
        connection_manager.closed.connect(this._onChange);
        connection_manager.documents_changed.connect(this._onChange);
      }

      this._connection_manager = connection_manager;
    }

    private _onChange = () => {
      this.stateChanged.emit(void 0);
    };

    private _adapter: WidgetAdapter<IDocumentWidget> | null = null;
  }
}
