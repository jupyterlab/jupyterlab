// Disclaimer/acknowledgement: Fragments are based on LspWsConnection, which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.
import * as lsProtocol from 'vscode-languageserver-protocol';
import {
  ILspOptions,
  IPosition,
  ITokenInfo,
  LspWsConnection
} from 'lsp-ws-connection';
import { CompletionTriggerKind } from './lsp';
import { until_ready } from './utils';

interface ILSPOptions extends ILspOptions {}

export class LSPConnection extends LspWsConnection {
  constructor(options: ILSPOptions) {
    super(options);
  }

  public sendSelectiveChange(
    changeEvent: lsProtocol.TextDocumentContentChangeEvent
  ) {
    this._sendChange([changeEvent]);
  }

  public sendFullTextChange(text: string): void {
    this._sendChange([{ text }]);
  }

  public isRenameSupported() {
    return !!(
      this.serverCapabilities && this.serverCapabilities.renameProvider
    );
  }

  public rename(location: IPosition, newName: string) {
    if (!this.isConnected || !this.isRenameSupported()) {
      return;
    }

    this.connection
      .sendRequest('textDocument/rename', {
        textDocument: {
          uri: this.documentInfo.documentUri
        },
        position: {
          line: location.line,
          character: location.ch
        },
        newName: newName
      } as lsProtocol.RenameParams)
      .then((result: lsProtocol.WorkspaceEdit | null) => {
        this.emit('renamed', result);
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
    changeEvents: lsProtocol.TextDocumentContentChangeEvent[]
  ) {
    if (!this.isConnected) {
      return;
    }
    const textDocumentChange: lsProtocol.DidChangeTextDocumentParams = {
      textDocument: {
        uri: this.documentInfo.documentUri,
        version: this.documentVersion
      } as lsProtocol.VersionedTextDocumentIdentifier,
      contentChanges: changeEvents
    };
    this.connection.sendNotification(
      'textDocument/didChange',
      textDocumentChange
    );
    this.documentVersion++;
  }

  public async getCompletion(
    location: IPosition,
    token: ITokenInfo,
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
            uri: this.documentInfo.documentUri
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
