// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on the @jupyterlab/codemirror-extension statusbar

import React from 'react';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import {
  interactiveItem,
  // Popup,
  // showPopup,
  TextItem
} from '@jupyterlab/statusbar';

import { JupyterLabWidgetAdapter } from '../jl_adapter';

/**
 * StatusBar item.
 */
export class LSPStatus extends VDomRenderer<LSPStatus.Model> {
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
    return <TextItem source={this.model.message} onClick={this.handleClick} />;
  }

  handleClick() {
    console.log('Click;');
  }
}

export namespace LSPStatus {
  /**
   * A VDomModel for the LSP of current file editor/notebook.
   */
  export class Model extends VDomModel {
    get message(): string {
      return (
        'LSP Code Intelligence: ' +
        this.status +
        (this._message ? this._message : '')
      );
    }

    get status(): string {
      if (!this.adapter) {
        return 'not initialized';
      } else {
        let connection_manager = this.adapter.connection_manager;
        const documents = connection_manager.documents;
        let connected_documents = 0;
        let initialized_documents = 0;

        documents.forEach((document, id_path) => {
          let connection = connection_manager.connections.get(id_path);
          if (!connection) {
            return;
          }

          // @ts-ignore
          if (connection.isConnected) {
            connected_documents += 1;
          }
          // @ts-ignore
          if (connection.isInitialized) {
            initialized_documents += 1;
          }
        });

        // there may be more open connections than documents if a document was recently closed
        // and the grace period has not passed yet
        let open_connections = 0;
        connection_manager.connections.forEach((connection, path) => {
          // @ts-ignore
          if (connection.isConnected) {
            open_connections += 1;
            console.warn('Connected:', path);
          } else {
            console.warn(path);
          }
        });
        let msg = '';
        const plural = documents.size > 1 ? 's' : '';
        if (documents.size === 0) {
          msg = 'Waiting for documents initialization...';
        } else if (initialized_documents === documents.size) {
          msg = `Fully connected & initialized (${documents.size} virtual document${plural})`;
        } else if (connected_documents === documents.size) {
          const uninitialized = documents.size - initialized_documents;
          // servers for n documents did not respond ot the initialization request
          msg = `Fully connected, but ${uninitialized}/${documents.size} virtual document${plural} stuck uninitialized`;
        } else if (open_connections === 0) {
          msg = `No open connections (${documents.size} virtual document${plural})`;
        } else {
          msg = `${connected_documents}/${documents.size} virtual document${plural} connected (${open_connections})`;
        }
        return `${this.adapter.language} | ${msg}`;
      }
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
      }

      let onChange = this._onChange.bind(this);
      adapter.connection_manager.connected.connect(onChange);
      adapter.connection_manager.initialized.connect(onChange);
      adapter.connection_manager.disconnected.connect(onChange);
      adapter.connection_manager.closed.connect(onChange);
      adapter.connection_manager.documents_changed.connect(onChange);
      this._adapter = adapter;
    }

    private _onChange() {
      this.stateChanged.emit(void 0);
    }

    private _message: string = '';
    private _adapter: JupyterLabWidgetAdapter | null = null;
  }
}
