import { CompletionHandler } from '@jupyterlab/completer';
import { LabIcon } from '@jupyterlab/ui-components';
import * as lsProtocol from 'vscode-languageserver-types';
import { LSPConnector } from './completion_handler';

export class LazyCompletionItem implements CompletionHandler.ICompletionItem {
  private _detail: string;
  private _documentation: string;
  private _is_documentation_markdown: boolean;
  private _requested_resolution: boolean;
  private _resolved: boolean;
  /**
   * Self-reference to make sure that the instance for will remain accessible
   * after any copy operation (whether via spread syntax or Object.assign)
   * performed by the JupyterLab completer internals.
   */
  public self: LazyCompletionItem;
  private _currentInsertText: string;

  get isDocumentationMarkdown(): boolean {
    return this._is_documentation_markdown;
  }

  /**
   * User facing completion.
   * If insertText is not set, this will be inserted.
   */
  public label: string;

  constructor(
    /**
     * Type of this completion item.
     */
    public type: string,
    /**
     * LabIcon object for icon to be rendered with completion type.
     */
    public icon: LabIcon,
    private match: lsProtocol.CompletionItem,
    private connector: LSPConnector,
    private uri: string
  ) {
    this.label = match.label;
    this._setDocumentation(match.documentation);
    this._requested_resolution = false;
    this._resolved = false;
    this._detail = match.detail;
    this.self = this;
  }

  private _setDocumentation(documentation: string | lsProtocol.MarkupContent) {
    if (lsProtocol.MarkupContent.is(documentation)) {
      this._documentation = documentation.value;
      this._is_documentation_markdown = documentation.kind === 'markdown';
    } else {
      this._documentation = documentation;
      this._is_documentation_markdown = false;
    }
  }

  /**
   * Completion to be inserted.
   */
  get insertText(): string {
    return this._currentInsertText || this.match.insertText || this.match.label;
  }

  set insertText(text: string) {
    this._currentInsertText = text;
  }

  get sortText(): string {
    return this.match.sortText || this.match.label;
  }

  get filterText(): string {
    return this.match.filterText;
  }

  public supportsResolution() {
    const connection = this.connector.get_connection(this.uri);

    return connection.isCompletionResolveProvider();
  }

  get detail(): string {
    return this._detail;
  }

  public needsResolution(): boolean {
    if (this.documentation) {
      return false;
    }

    if (this._resolved) {
      return false;
    }

    if (this._requested_resolution) {
      return false;
    }

    return this.supportsResolution();
  }

  public isResolved() {
    return this._resolved;
  }

  public fetchDocumentation(): void {
    if (!this.needsResolution()) {
      return;
    }

    const connection = this.connector.get_connection(this.uri);

    this._requested_resolution = true;

    connection
      .getCompletionResolve(this.match)
      .then(resolvedCompletionItem => {
        this.connector.lab_integration.set_doc_panel_placeholder(false);
        if (resolvedCompletionItem === null) {
          return;
        }
        this._setDocumentation(resolvedCompletionItem.documentation);
        this._detail = resolvedCompletionItem.detail;
        // TODO: implement in pyls and enable with proper LSP communication
        // this.label = resolvedCompletionItem.label;
        this._resolved = true;
        this.connector.lab_integration.refresh_doc_panel(this);
      })
      .catch(e => {
        this.connector.lab_integration.set_doc_panel_placeholder(false);
        console.warn(e);
      });
  }

  /**
   * A human-readable string with additional information
   * about this item, like type or symbol information.
   */
  get documentation(): string {
    if (!this.connector.should_show_documentation) {
      return null;
    }
    if (this._documentation) {
      return this._documentation;
    }
    return null;
  }

  /**
   * Indicates if the item is deprecated.
   */
  get deprecated(): boolean {
    if (this.match.deprecated) {
      return this.match.deprecated;
    }
    return (
      this.match.tags &&
      this.match.tags.some(
        tag => tag == lsProtocol.CompletionItemTag.Deprecated
      )
    );
  }
}
