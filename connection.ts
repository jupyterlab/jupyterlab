// Disclaimer/acknowledgement: Fragments are based on LspWsConnection, which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.
import * as lsProtocol from 'vscode-languageserver-protocol';
import {
  ILspOptions,
  IPosition,
  ITokenInfo,
  LspWsConnection,
  IDocumentInfo
} from 'lsp-ws-connection';
import { CompletionTriggerKind } from './lsp';
import { until_ready } from './utils';

interface ILSPOptions extends ILspOptions {}

export class LSPConnection extends LspWsConnection {
  constructor(options: ILSPOptions) {
    super(options);
  }

  public sendSelectiveChange(
    changeEvent: lsProtocol.TextDocumentContentChangeEvent,
    documentInfo: IDocumentInfo
  ) {
    this._sendChange([changeEvent], documentInfo);
  }

  public sendFullTextChange(text: string, documentInfo: IDocumentInfo): void {
    this._sendChange([{ text }], documentInfo);
  }

  public isRenameSupported() {
    return !!(
      this.serverCapabilities && this.serverCapabilities.renameProvider
    );
  }

  async rename(
    location: IPosition,
    documentInfo: IDocumentInfo,
    newName: string
  ): Promise<boolean> {
    if (!this.isConnected || !this.isRenameSupported()) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.connection
        .sendRequest('textDocument/rename', {
          textDocument: {
            uri: documentInfo.uri
          },
          position: {
            line: location.line,
            character: location.ch
          },
          newName: newName
        } as lsProtocol.RenameParams)
        .then(
          (result: lsProtocol.WorkspaceEdit | null) => {
            this.emit('renamed', result);
            resolve(true);
          },
          error => {
            console.warn(error);
            reject(error);
          }
        );
    });
  }

  public connect(socket: WebSocket): this {
    super.connect(socket);

    until_ready(() => {
      return this.isConnected;
    }, -1)
      .then(() => {
        this.connection.onClose(() => {
          this.isConnected = false;
          this.emit('close', this.closing_manually);
        });
      })
      .catch(() => {
        console.error('Could not connect onClose signal');
      });
    return this;
  }

  private closing_manually = false;

  public close() {
    try {
      this.closing_manually = true;
      super.close();
    } catch (e) {
      this.closing_manually = false;
    }
  }

  private _sendChange(
    changeEvents: lsProtocol.TextDocumentContentChangeEvent[],
    documentInfo: IDocumentInfo
  ) {
    if (!this.isConnected || !this.isInitialized) {
      return;
    }
    const textDocumentChange: lsProtocol.DidChangeTextDocumentParams = {
      textDocument: {
        uri: documentInfo.uri,
        version: documentInfo.version
      } as lsProtocol.VersionedTextDocumentIdentifier,
      contentChanges: changeEvents
    };
    this.connection.sendNotification(
      'textDocument/didChange',
      textDocumentChange
    );
    documentInfo.version++;
  }

  public async getCompletion(
    location: IPosition,
    token: ITokenInfo,
    documentInfo: IDocumentInfo,
    triggerCharacter: string,
    triggerKind: CompletionTriggerKind
  ): Promise<lsProtocol.CompletionItem[]> {
    if (!this.isConnected) {
      return;
    }
    if (
      !(this.serverCapabilities && this.serverCapabilities.completionProvider)
    ) {
      return;
    }

    return new Promise<lsProtocol.CompletionItem[]>(resolve => {
      this.connection
        .sendRequest('textDocument/completion', {
          textDocument: {
            uri: documentInfo.uri
          },
          position: {
            line: location.line,
            character: location.ch
          },
          context: {
            triggerKind: triggerKind,
            triggerCharacter
          }
        } as lsProtocol.CompletionParams)
        .then(
          (
            params:
              | lsProtocol.CompletionList
              | lsProtocol.CompletionItem[]
              | null
          ) => {
            if (params) {
              params = 'items' in params ? params.items : params;
            }
            resolve(params as lsProtocol.CompletionItem[]);
          }
        );
    });
  }
}
