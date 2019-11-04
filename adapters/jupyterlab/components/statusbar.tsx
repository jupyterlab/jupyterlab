// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on the @jupyterlab/codemirror-extension statusbar

import React from 'react';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import {
  interactiveItem,
  Popup,
  showPopup,
  TextItem,
  GroupItem
} from '@jupyterlab/statusbar';

import { DefaultIconReact } from '@jupyterlab/ui-components';
import { JupyterLabWidgetAdapter } from '../jl_adapter';
import { VirtualDocument } from '../../../virtual/document';
import { LSPConnection } from '../../../connection';

class LSPPopup extends VDomRenderer<LSPStatus.Model> {
  constructor(model: LSPStatus.Model) {
    super();
    this.model = model;
    // TODO: add proper, custom class?
    this.addClass('p-Menu');
  }
  render() {
    if (!this.model) {
      return null;
    }
    return (
      <GroupItem spacing={4} className={'p-Menu-item'}>
        <TextItem source={this.model.lsp_servers} />
        <TextItem source={this.model.long_message} />
      </GroupItem>
    );
  }
}

/**
 * StatusBar item.
 */
export class LSPStatus extends VDomRenderer<LSPStatus.Model> {
  protected _popup: Popup = null;
  /**
   * Construct a new VDomRenderer for the status item.
   */
  constructor() {
    super();
    this.model = new LSPStatus.Model();
    this.addClass(interactiveItem);
    this.title.caption = 'LSP status';
  }

  /**
   * Render the status item.
   */
  render() {
    if (!this.model) {
      return null;
    }
    return (
      <GroupItem
        spacing={4}
        title={'LSP Code Intelligence'}
        onClick={this.handleClick}
      >
        <DefaultIconReact name={'file'} top={'2px'} kind={'statusBar'} />
        <TextItem source={this.model.lsp_servers_truncated} />
        <DefaultIconReact
          name={this.model.status_icon}
          top={'2px'}
          kind={'statusBar'}
        />
        <TextItem source={this.model.short_message} />
        <TextItem source={this.model.feature_message} />
      </GroupItem>
    );
  }

  handleClick = () => {
    if (this._popup) {
      this._popup.dispose();
    }
    this._popup = showPopup({
      body: new LSPPopup(this.model),
      anchor: this,
      align: 'left'
    });
  };
}

type StatusCode = 'waiting' | 'initializing' | 'initialized' | 'connecting';

export interface IStatus {
  connected_documents: Set<VirtualDocument>;
  initialized_documents: Set<VirtualDocument>;
  open_connections: Array<LSPConnection>;
  detected_documents: Set<VirtualDocument>;
  status: StatusCode;
}

function collect_languages(virtual_document: VirtualDocument): Set<string> {
  let collected = new Set<string>();
  collected.add(virtual_document.language);
  for (let foreign of virtual_document.foreign_documents.values()) {
    let foreign_languages = collect_languages(foreign);
    foreign_languages.forEach(collected.add, collected);
  }
  return collected;
}

type StatusMap = Record<StatusCode, string>;

const iconByStatus: StatusMap = {
  waiting: 'refresh',
  initialized: 'running',
  initializing: 'refresh',
  connecting: 'refresh'
};

const shortMessageByStatus: StatusMap = {
  waiting: 'Waiting...',
  initialized: 'Fully initialized',
  initializing: 'Fully connected & partially initialized',
  connecting: 'Connecting...'
};

export namespace LSPStatus {
  /**
   * A VDomModel for the LSP of current file editor/notebook.
   */
  export class Model extends VDomModel {
    get lsp_servers(): string {
      if (!this.adapter) {
        return '';
      }
      let document = this.adapter.virtual_editor.virtual_document;
      return `Languages detected: ${[...collect_languages(document)].join(
        ', '
      )}`;
    }

    get lsp_servers_truncated(): string {
      if (!this.adapter) {
        return '';
      }
      let document = this.adapter.virtual_editor.virtual_document;
      let foreign_languages = collect_languages(document);
      foreign_languages.delete(this.adapter.language);
      if (foreign_languages.size) {
        if (foreign_languages.size < 4) {
          return `${this.adapter.language}, ${[...foreign_languages].join(
            ', '
          )}`;
        }
        return `${this.adapter.language} (+${foreign_languages.size} more)`;
      }
      return this.adapter.language;
    }

    get status(): IStatus {
      let connection_manager = this.adapter.connection_manager;
      const detected_documents = connection_manager.documents;
      let connected_documents = new Set<VirtualDocument>();
      let initialized_documents = new Set<VirtualDocument>();

      detected_documents.forEach((document, id_path) => {
        let connection = connection_manager.connections.get(id_path);
        if (!connection) {
          return;
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
      connection_manager.connections.forEach((connection, path) => {
        if (connection.isConnected) {
          open_connections.push(connection);
        }
      });

      let status: StatusCode;
      if (detected_documents.size === 0) {
        status = 'waiting';
        // TODO: instead of detected documents, I should use "detected_documents_with_LSP_servers_available"
      } else if (initialized_documents.size === detected_documents.size) {
        status = 'initialized';
      } else if (connected_documents.size === detected_documents.size) {
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

    get status_icon(): string {
      if (!this.adapter) {
        return 'stop';
      }
      return iconByStatus[this.status.status];
    }

    get short_message(): string {
      if (!this.adapter) {
        return 'not initialized';
      }
      return shortMessageByStatus[this.status.status];
    }

    get feature_message(): string {
      return this.adapter ? this.adapter.status_message.message : '';
    }

    get long_message(): string {
      if (!this.adapter) {
        return 'not initialized';
      }
      let status = this.status;
      let msg = '';
      const plural = status.detected_documents.size > 1 ? 's' : '';
      if (status.status === 'waiting') {
        msg = 'Waiting for documents initialization...';
      } else if (status.status === 'initialized') {
        msg = `Fully connected & initialized (${status.detected_documents.size} virtual document${plural})`;
      } else if (status.status === 'initializing') {
        const uninitialized = new Set<VirtualDocument>(
          status.detected_documents
        );
        for (let initialized of status.initialized_documents.values()) {
          uninitialized.delete(initialized);
        }
        // servers for n documents did not respond ot the initialization request
        msg = `Fully connected, but ${uninitialized.size}/${
          status.detected_documents.size
        } virtual document${plural} stuck uninitialized: ${[...uninitialized]
          .map(document => document.id_path)
          .join(', ')}`;
      } else {
        const unconnected = new Set<VirtualDocument>(status.detected_documents);
        for (let connected of status.connected_documents.values()) {
          unconnected.delete(connected);
        }

        msg = `${status.connected_documents.size}/${
          status.detected_documents.size
        } virtual document${plural} connected (${
          status.open_connections.length
        } connections; waiting for: ${[...unconnected]
          .map(document => document.id_path)
          .join(', ')})`;
      }
      return msg;
    }

    get adapter(): JupyterLabWidgetAdapter | null {
      return this._adapter;
    }

    set adapter(adapter: JupyterLabWidgetAdapter | null) {
      const oldAdapter = this._adapter;
      if (oldAdapter !== null) {
        oldAdapter.connection_manager.connected.disconnect(this._onChange);
        oldAdapter.connection_manager.initialized.connect(this._onChange);
        oldAdapter.connection_manager.disconnected.disconnect(this._onChange);
        oldAdapter.connection_manager.closed.disconnect(this._onChange);
        oldAdapter.connection_manager.documents_changed.disconnect(
          this._onChange
        );
        oldAdapter.status_message.changed.connect(this._onChange);
      }

      let onChange = this._onChange.bind(this);
      adapter.connection_manager.connected.connect(onChange);
      adapter.connection_manager.initialized.connect(onChange);
      adapter.connection_manager.disconnected.connect(onChange);
      adapter.connection_manager.closed.connect(onChange);
      adapter.connection_manager.documents_changed.connect(onChange);
      adapter.status_message.changed.connect(onChange);
      this._adapter = adapter;
    }

    private _onChange() {
      this.stateChanged.emit(void 0);
    }

    private _adapter: JupyterLabWidgetAdapter | null = null;
  }
}
