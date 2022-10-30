/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Disclaimer/acknowledgement: Fragments are based on https://github.com/wylieconlon/lsp-editor-adapter,
// which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.

import type * as lsp from 'vscode-languageserver-protocol';

export interface IDocumentInfo {
  /**
   * URI of the virtual document.
   */
  uri: string;

  /**
   * Version of the virtual document.
   */
  version: number;

  /**
   * Text content of the document.
   */
  text: string;

  /**
   * Language id of the document.
   */
  languageId: string;
}

export interface ILspConnection {
  /**
   * Is the language server is connected?
   */
  isConnected: boolean;
  /**
   * Is the language server is initialized?
   */
  isInitialized: boolean;

  /**
   * Is the language server is connected and initialized?
   */
  isReady: boolean;

  /**
   * Initialize a connection over a web socket that speaks the LSP protocol
   */
  connect(socket: WebSocket): void;

  /**
   * Close the connection
   */
  close(): void;

  // This should support every method from https://microsoft.github.io/language-server-protocol/specification
  /**
   * The initialize request tells the server which options the client supports
   */
  sendInitialize(): void;
  /**
   * Inform the server that the document was opened
   */
  sendOpen(documentInfo: IDocumentInfo): void;

  /**
   * Sends the full text of the document to the server
   */
  sendChange(documentInfo: IDocumentInfo): void;

  /**
   * Send save notification to the server.
   */
  sendSaved(documentInfo: IDocumentInfo): void;

  /**
   * Send configuration change to the server.
   */
  sendConfigurationChange(settings: lsp.DidChangeConfigurationParams): void;
}

export interface ILspOptions {
  /**
   * LSP handler endpoint.
   */
  serverUri: string;

  /**
   * Language Id.
   */
  languageId: string;

  /**
   * The root URI set by server.
   */
  rootUri: string;
}
