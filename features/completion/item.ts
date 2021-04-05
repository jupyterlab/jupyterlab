import { CompletionHandler } from '@jupyterlab/completer';
import { LabIcon } from '@jupyterlab/ui-components';
import * as lsProtocol from 'vscode-languageserver-types';

import { until_ready } from '../../utils';

import { LSPConnector } from './completion_handler';

/**
 * To be upstreamed
 */
export interface ICompletionsSource {
  /**
   * The name displayed in the GUI
   */
  name: string;
  /**
   * The higher the number the higher the priority
   */
  priority: number;
  /**
   * The icon to be displayed if no type icon is present
   */
  fallbackIcon?: LabIcon;
}

/**
 * To be upstreamed
 */
export interface IExtendedCompletionItem
  extends CompletionHandler.ICompletionItem {
  insertText: string;
  sortText: string;
  source?: ICompletionsSource;
}

export class LazyCompletionItem implements IExtendedCompletionItem {
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
  public element: HTMLLIElement;
  private _currentInsertText: string;

  get isDocumentationMarkdown(): boolean {
    return this._is_documentation_markdown;
  }

  /**
   * User facing completion.
   * If insertText is not set, this will be inserted.
   */
  public label: string;

  public source: ICompletionsSource;

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

  /**
   * Resolve (fetch) details such as documentation.
   */
  public resolve(): Promise<lsProtocol.CompletionItem> {
    if (this._resolved) {
      return Promise.resolve(this);
    }
    if (!this.supportsResolution()) {
      return Promise.resolve(this);
    }
    if (this._requested_resolution) {
      return until_ready(() => this._resolved, 100, 50).then(() => this);
    }

    const connection = this.connector.get_connection(this.uri);

    this._requested_resolution = true;

    return connection
      .getCompletionResolve(this.match)
      .then(resolvedCompletionItem => {
        if (resolvedCompletionItem === null) {
          return resolvedCompletionItem;
        }
        this._setDocumentation(resolvedCompletionItem.documentation);
        this._detail = resolvedCompletionItem.detail;
        // TODO: implement in pyls and enable with proper LSP communication
        // this.label = resolvedCompletionItem.label;
        this._resolved = true;
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
