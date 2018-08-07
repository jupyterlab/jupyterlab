// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomRenderer } from '@jupyterlab/apputils';

import { ServiceManager } from '@jupyterlab/services';

import { Message } from '@phosphor/messaging';

import * as React from 'react';

import ReactPaginate from 'react-paginate';

import { ListModel, IEntry, Action } from './model';

import { isJupyterOrg } from './query';

// TODO: Replace pagination with lazy loading of lower search results

/**
 * Search bar VDOM component.
 */
export class SearchBar extends React.Component<
  SearchBar.IProperties,
  SearchBar.IState
> {
  constructor(props: SearchBar.IProperties) {
    super(props);
    this.state = {
      value: ''
    };
  }

  /**
   * Render the list view using the virtual DOM.
   */
  render(): React.ReactElement<any> {
    return (
      <div className="jp-extensionmanager-search-bar">
        <div className="jp-extensionmanager-search-wrapper">
          <input
            type="text"
            className="jp-extensionmanager-input"
            placeholder={this.props.placeholder}
            onChange={this.handleChange.bind(this)}
            value={this.state.value}
          />
        </div>
      </div>
    );
  }

  /**
   * Handler for search input changes.
   */
  handleChange(e: KeyboardEvent) {
    let target = e.target as HTMLInputElement;
    this.setState({
      value: target.value
    });
  }
}

/**
 * The namespace for search bar statics.
 */
export namespace SearchBar {
  /**
   * React properties for search bar component.
   */
  export interface IProperties {
    /**
     * The placeholder string to use in the search bar input field when empty.
     */
    placeholder: string;
  }

  /**
   * React state for search bar component.
   */
  export interface IState {
    /**
     * The value of the search bar input field.
     */
    value: string;
  }
}

/**
 * Create a build prompt as a react element.
 *
 * @param props Configuration of the build prompt.
 */
function BuildPrompt(props: BuildPrompt.IProperties): React.ReactElement<any> {
  return (
    <div className="jp-extensionmanager-buildprompt">
      <div className="jp-extensionmanager-buildmessage">
        A build is needed to include the latest changes
      </div>
      <button
        className="jp-extensionmanager-rebuild"
        onClick={props.performBuild}
      >
        Rebuild
      </button>
      <button
        className="jp-extensionmanager-ignorebuild"
        onClick={props.ignoreBuild}
      >
        Ignore
      </button>
    </div>
  );
}

/**
 * The namespace for build prompt statics.
 */
namespace BuildPrompt {
  /**
   * Properties for build prompt react component.
   */
  export interface IProperties {
    /**
     * Callback for when a build is requested.
     */
    performBuild: () => void;

    /**
     * Callback for when a build notice is dismissed.
     */
    ignoreBuild: () => void;
  }
}

/**
 * VDOM for visualizing an extension entry.
 */
function ListEntry(props: ListEntry.IProperties): React.ReactElement<any> {
  const { entry } = props;
  const flagClasses = [];
  if (entry.installed) {
    flagClasses.push('jp-extensionmanager-entry-installed');
  }
  if (entry.enabled) {
    flagClasses.push('jp-extensionmanager-entry-enabled');
  }
  if (ListModel.entryHasUpdate(entry)) {
    flagClasses.push('jp-extensionmanager-entry-update');
  }
  if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
    flagClasses.push(`jp-extensionmanager-entry-${entry.status}`);
  }
  let title = entry.name;
  if (isJupyterOrg(entry.name)) {
    flagClasses.push(`jp-extensionmanager-entry-mod-whitelisted`);
    title = `${entry.name} (Developed by Project Jupyter)`;
  }
  return (
    <li
      className={`jp-extensionmanager-entry ${flagClasses.join(' ')}`}
      title={title}
    >
      <div className="jp-extensionmanager-entry-title">
        <div className="jp-extensionmanager-entry-name">
          <a href={entry.url} target="_blank">
            {entry.name}
          </a>
        </div>
        <div className="jp-extensionmanager-entry-jupyter-org" />
      </div>
      <div className="jp-extensionmanager-entry-content">
        <div className="jp-extensionmanager-entry-description">
          {entry.description}
        </div>
        <div className="jp-extensionmanager-entry-buttons">
          <button
            className="jp-extensionmanager-install"
            onClick={() => props.performAction('install', entry)}
          >
            Install
          </button>
          <button
            className="jp-extensionmanager-update"
            // An install action will update the extension:
            onClick={() => props.performAction('install', entry)}
          >
            Update
          </button>
          <button
            className="jp-extensionmanager-uninstall"
            onClick={() => props.performAction('uninstall', entry)}
          >
            Uninstall
          </button>
          <button
            className="jp-extensionmanager-enable"
            onClick={() => props.performAction('enable', entry)}
          >
            Enable
          </button>
          <button
            className="jp-extensionmanager-disable"
            onClick={() => props.performAction('disable', entry)}
          >
            Disable
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * The namespace for extension entry statics.
 */
export namespace ListEntry {
  export interface IProperties {
    /**
     * The entry to visualize.
     */
    entry: IEntry;

    /**
     * Callback to use for performing an action on the entry.
     */
    performAction: (action: Action, entry: IEntry) => void;
  }
}

/**
 * List view widget for extensions
 */
export function ListView(props: ListView.IProperties): React.ReactElement<any> {
  const entryViews = [];
  for (let entry of props.entries) {
    entryViews.push(
      <ListEntry
        entry={entry}
        key={entry.name}
        performAction={props.performAction}
      />
    );
  }
  let pagination;
  if (props.numPages > 1) {
    pagination = (
      <div className="jp-extensionmanager-pagination">
        <ReactPaginate
          previousLabel={'<'}
          nextLabel={'>'}
          breakLabel={<a href="">...</a>}
          breakClassName={'break-me'}
          pageCount={props.numPages}
          marginPagesDisplayed={2}
          pageRangeDisplayed={5}
          onPageChange={(data: { selected: number }) =>
            props.onPage(data.selected)
          }
          containerClassName={'pagination'}
          activeClassName={'active'}
        />
      </div>
    );
  }
  const listview = (
    <ul className="jp-extensionmanager-listview">{entryViews}</ul>
  );
  return (
    <div className="jp-extensionmanager-listview-wrapper">
      {entryViews.length > 0 ? (
        listview
      ) : (
        <div key="message" className="jp-extensionmanager-listview-message">
          No entries
        </div>
      )}
      {pagination}
    </div>
  );
}

/**
 * The namespace for list view widget statics.
 */
export namespace ListView {
  export interface IProperties {
    /**
     * The extension entries to display.
     */
    entries: ReadonlyArray<IEntry>;

    /**
     * The number of pages that can be viewed via pagination.
     */
    numPages: number;

    /**
     * The callback to use for changing the page
     */
    onPage: (page: number) => void;

    /**
     * Callback to use for performing an action on an entry.
     */
    performAction: (action: Action, entry: IEntry) => void;
  }
}

/**
 * The main view for the discovery extension.
 */
export class ExtensionView extends VDomRenderer<ListModel> {
  constructor(serviceManager: ServiceManager) {
    super();
    this.model = new ListModel(serviceManager);
    this.addClass('jp-extensionmanager-view');
  }

  /**
   * The search input node.
   */
  get inputNode(): HTMLInputElement {
    return this.node.getElementsByClassName(
      'jp-extensionmanager-input'
    )[0] as HTMLInputElement;
  }

  /**
   * Render the extension view using the virtual DOM.
   */
  protected render(): React.ReactElement<any>[] {
    const model = this.model!;
    let pages = Math.ceil(model.totalEntries / model.pagination);
    let elements = [<SearchBar key="searchbar" placeholder="SEARCH" />];
    if (model.promptBuild) {
      elements.push(
        <BuildPrompt
          key="buildpromt"
          performBuild={() => {
            model.performBuild();
          }}
          ignoreBuild={() => {
            model.ignoreBuildRecommendation();
          }}
        />
      );
    }
    // Indicator element for pending actions:
    elements.push(
      <div
        key="pending"
        className={`jp-extensionmanager-pending ${
          model.hasPendingActions() ? 'jp-mod-hasPending' : ''
        }`}
      />
    );
    const content = [];
    if (!model.initialized) {
      model.initialize();
      content.push(
        <div key="loading-placeholder" className="jp-extensionmanager-loader">
          Updating extensions list
        </div>
      );
    } else if (!model.query && model.serverConnectionError !== null) {
      content.push(
        <div key="error-msg" className="jp-extensionmanager-error">
          <p>
            Error communicating with server extension. Consult the documentation
            for how to ensure that it is enabled.
          </p>

          <p>Reason given:</p>
          <pre>{model.serverConnectionError}</pre>
        </div>
      );
    } else if (!model.query && model.installed.length) {
      elements.push(
        <header key="installed-header">
          Installed<button
            className="jp-extensionmanager-refresh"
            onClick={() => {
              model.refreshInstalled();
            }}
          >
            &#8635;
          </button>
        </header>
      );
      content.push(
        <ListView
          key="installed"
          entries={model.installed}
          numPages={1}
          onPage={value => {
            /* no-op */
          }}
          performAction={this.onAction.bind(this)}
        />
      );
    } else if (model.searchError === null) {
      elements.push(<header key="installable-header">Search results</header>);
      content.push(
        <ListView
          key="installable"
          entries={model.searchResult}
          numPages={pages}
          onPage={value => {
            this.onPage(value);
          }}
          performAction={this.onAction.bind(this)}
        />
      );
    } else {
      content.push(
        <div key="error-msg" className="jp-extensionmanager-error">
          Error searching for extensions{model.searchError
            ? `: ${model.searchError}`
            : '.'}
        </div>
      );
    }
    elements.push(
      <div key="content" className="jp-extensionmanager-content">
        {content}
      </div>
    );
    return elements;
  }

  /**
   * Callback handler for the user specifies a new search query.
   *
   * @param value The new query.
   */
  onSearch(value: string) {
    this.model!.query = value;
  }

  /**
   * Callback handler for the user changes the page of the search result pagination.
   *
   * @param value The pagination page number.
   */
  onPage(value: number) {
    this.model!.page = value;
  }

  /**
   * Callback handler for when the user wants to perform an action on an extension.
   *
   * @param action The action to perform.
   * @param entry The entry to perform the action on.
   */
  onAction(action: Action, entry: IEntry) {
    switch (action) {
      case 'install':
        return this.model!.install(entry);
      case 'uninstall':
        return this.model!.uninstall(entry);
      case 'enable':
        return this.model!.enable(entry);
      case 'disable':
        return this.model!.disable(entry);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }

  /**
   * Handle the DOM events for the command palette.
   *
   * @param event - The DOM event sent to the command palette.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the command palette's DOM node.
   * It should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'input':
        this.onSearch(this.inputNode.value);
        break;
      case 'focus':
      case 'blur':
        this._toggleFocused();
        break;
      default:
        break;
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.node.addEventListener('input', this);
    this.node.addEventListener('focus', this, true);
    this.node.addEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('input', this);
    this.node.removeEventListener('focus', this, true);
    this.node.removeEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'activate-request'` message.
   */
  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      let input = this.inputNode;
      input.focus();
      input.select();
    }
  }

  /**
   * Toggle the focused modifier based on the input node focus state.
   */
  private _toggleFocused(): void {
    let focused = document.activeElement === this.inputNode;
    this.toggleClass('p-mod-focused', focused);
  }
}
