// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TranslationBundle } from '@jupyterlab/translation';
import {
  Button,
  caretDownIcon,
  caretRightIcon,
  Collapse,
  FilterBox,
  listingsInfoIcon,
  refreshIcon,
  ToolbarButtonComponent,
  VDomRenderer
} from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import * as React from 'react';
import ReactPaginate from 'react-paginate';
import { Action, IEntry, ListModel } from './model';

// TODO: Replace pagination with lazy loading of lower search results

/**
 * Icons with custom styling bound.
 */
const caretDownIconStyled = caretDownIcon.bindprops({
  height: 'auto',
  width: '20px'
});
const caretRightIconStyled = caretRightIcon.bindprops({
  height: 'auto',
  width: '20px'
});

const badgeSize = 32;
const badgeQuerySize = Math.floor(devicePixelRatio * badgeSize);

function getExtensionGitHubUser(entry: IEntry) {
  if (entry.url && entry.url.startsWith('https://github.com/')) {
    return entry.url.split('/')[3];
  }
  return null;
}

/**
 * VDOM for visualizing an extension entry.
 */
function ListEntry(props: ListEntry.IProperties): React.ReactElement<any> {
  const { entry, supportInstallation, trans } = props;
  const flagClasses = [];
  if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
    flagClasses.push(`jp-extensionmanager-entry-${entry.status}`);
  }
  let title = entry.name;
  const githubUser = getExtensionGitHubUser(entry);

  if (!entry.is_allowed) {
    flagClasses.push(`jp-extensionmanager-entry-should-be-uninstalled`);
  }
  return (
    <li
      className={`jp-extensionmanager-entry ${flagClasses.join(' ')}`}
      title={title}
      style={{ display: 'flex' }}
    >
      <div style={{ marginRight: '8px' }}>
        {githubUser ? (
          <img
            src={`https://github.com/${githubUser}.png?size=${badgeQuerySize}`}
            style={{ width: '32px', height: '32px' }}
          />
        ) : (
          <div style={{ width: `${badgeSize}px`, height: `${badgeSize}px` }} />
        )}
      </div>
      <div className="jp-extensionmanager-entry-description">
        <div className="jp-extensionmanager-entry-title">
          <div className="jp-extensionmanager-entry-name">
            {entry.url ? (
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                {entry.name}
              </a>
            ) : (
              <div>{entry.name}</div>
            )}
          </div>
          {entry.installed && !entry.is_allowed && (
            <ToolbarButtonComponent
              icon={listingsInfoIcon}
              iconLabel={trans.__(
                '%1 extension is not allowed any more. Please uninstall immediately or contact your administrator.',
                entry.name
              )}
              onClick={() =>
                window.open(
                  'https://jupyterlab.readthedocs.io/en/latest/user/extensions.html'
                )
              }
            />
          )}
        </div>
        <div className="jp-extensionmanager-entry-content">
          <div className="jp-extensionmanager-entry-description">
            {entry.description}
          </div>
          <div className="jp-extensionmanager-entry-buttons">
            {entry.installed ? (
              <>
                {supportInstallation && (
                  <>
                    {ListModel.entryHasUpdate(entry) && (
                      <Button
                        onClick={() => props.performAction('install', entry)}
                        minimal
                        small
                      >
                        {trans.__('Update')}
                      </Button>
                    )}
                    <Button
                      onClick={() => props.performAction('uninstall', entry)}
                      minimal
                      small
                    >
                      {trans.__('Uninstall')}
                    </Button>
                  </>
                )}
                {entry.enabled ? (
                  <Button
                    onClick={() => props.performAction('disable', entry)}
                    minimal
                    small
                  >
                    {trans.__('Disable')}
                  </Button>
                ) : (
                  <Button
                    onClick={() => props.performAction('enable', entry)}
                    minimal
                    small
                  >
                    {trans.__('Enable')}
                  </Button>
                )}
              </>
            ) : (
              supportInstallation && (
                <Button
                  onClick={() => props.performAction('install', entry)}
                  minimal
                  small
                >
                  {trans.__('Install')}
                </Button>
              )
            )}
          </div>
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
     * Whether the extension can be (un-)install or not.
     */
    supportInstallation: boolean;

    /**
     * Callback to use for performing an action on the entry.
     */
    performAction: (action: Action, entry: IEntry) => void;

    /**
     * The language translator.
     */
    trans: TranslationBundle;
  }
}

/**
 * List view widget for extensions
 */
export function ListView(props: ListView.IProperties): React.ReactElement<any> {
  const { trans } = props;

  return (
    <div className="jp-extensionmanager-listview-wrapper">
      {props.entries.length > 0 ? (
        <ul className="jp-extensionmanager-listview">
          {props.entries.map(entry => (
            <ListEntry
              key={entry.name}
              entry={entry}
              performAction={props.performAction}
              supportInstallation={props.supportInstallation}
              trans={trans}
            />
          ))}
        </ul>
      ) : (
        <div key="message" className="jp-extensionmanager-listview-message">
          {trans.__('No entries')}
        </div>
      )}
      {props.numPages > 1 && (
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
      )}
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
     * Whether the extension can be (un-)install or not.
     */
    supportInstallation: boolean;

    /**
     * The language translator.
     */
    trans: TranslationBundle;

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

function ErrorMessage(props: ErrorMessage.IProperties) {
  return <div className="jp-extensionmanager-error">{props.children}</div>;
}

namespace ErrorMessage {
  export interface IProperties {
    children: React.ReactNode;
  }
}

/**
 *
 */
export class CollapsibleSection extends React.Component<
  CollapsibleSection.IProperties,
  CollapsibleSection.IState
> {
  constructor(props: CollapsibleSection.IProperties) {
    super(props);
    this.state = {
      isOpen: props.isOpen ? true : false
    };
  }

  /**
   * Render the collapsible section using the virtual DOM.
   */
  render(): React.ReactNode {
    let isOpen = this.state.isOpen;
    let className = 'jp-extensionmanager-headerText';
    if (this.props.disabled) {
      isOpen = false;
      className = 'jp-extensionmanager-headerTextDisabled';
    }
    let icon = isOpen ? caretDownIconStyled : caretRightIconStyled;

    return (
      <>
        <div className="jp-stack-panel-header">
          <ToolbarButtonComponent
            icon={icon}
            onClick={() => {
              this.handleCollapse();
            }}
          />
          <span className={className}>{this.props.header}</span>
          {!this.props.disabled && this.props.headerElements}
        </div>
        <Collapse isOpen={isOpen}>{this.props.children}</Collapse>
      </>
    );
  }

  /**
   * Handler for search input changes.
   */
  handleCollapse(): void {
    this.setState(
      {
        isOpen: !this.state.isOpen
      },
      () => {
        if (this.props.onCollapse) {
          this.props.onCollapse(this.state.isOpen);
        }
      }
    );
  }

  UNSAFE_componentWillReceiveProps(
    nextProps: CollapsibleSection.IProperties
  ): void {
    if (nextProps.forceOpen) {
      this.setState({
        isOpen: true
      });
    }
  }
}

/**
 * The namespace for collapsible section statics.
 */
export namespace CollapsibleSection {
  /**
   * React properties for collapsible section component.
   */
  export interface IProperties {
    /**
     * The header string for section list.
     */
    header: string;

    /**
     * Whether the view will be expanded or collapsed initially, defaults to open.
     */
    isOpen?: boolean;

    /**
     * Handle collapse event.
     */
    onCollapse?: (isOpen: boolean) => void;

    /**
     * Any additional elements to add to the header.
     */
    headerElements?: React.ReactNode;

    /**
     * If given, this will be displayed instead of the children.
     */
    errorMessage?: string | null;

    /**
     * If true, the section will be collapsed and will not respond
     * to open nor close actions.
     */
    disabled?: boolean;

    /**
     * If true, the section will be opened if not disabled.
     */
    forceOpen?: boolean;
  }

  /**
   * React state for collapsible section component.
   */
  export interface IState {
    /**
     * Whether the section is expanded or collapsed.
     */
    isOpen: boolean;
  }
}

/**
 * The main view for the discovery extension.
 */
export class ExtensionView extends VDomRenderer<ListModel> {
  constructor(model: ListModel, trans: TranslationBundle) {
    super(model);
    this.trans = trans;
    this._forceOpen = false;
    this._searchInputRef = React.createRef<HTMLInputElement>();
    this.addClass('jp-extensionmanager-view');
  }

  /**
   * Render the extension view using the virtual DOM.
   */
  protected render(): JSX.Element | JSX.Element[] | null {
    const model = this.model;

    const pages = Math.ceil(model.totalEntries / model.pagination);

    const content = [];
    content.push(
      <CollapsibleSection
        key="warning-section"
        isOpen={!this.model.isDisclaimed}
        disabled={false}
        header={this.trans.__('Warning')}
      >
        <div className="jp-extensionmanager-disclaimer">
          <div>
            {this.trans
              .__(`The JupyterLab development team is excited to have a robust
third-party extension community. However, we do not review
third-party extensions, and some extensions may introduce security
risks or contain malicious code that runs on your machine.`)}
          </div>
          <div style={{ paddingTop: 8 }}>
            {model.isDisclaimed ? (
              <Button
                className="jp-extensionmanager-disclaimer-disable"
                onClick={(e: React.MouseEvent<Element, MouseEvent>) => {
                  this.model.isDisclaimed = false;
                }}
              >
                {this.trans.__('Disable')}
              </Button>
            ) : (
              <Button
                className="jp-extensionmanager-disclaimer-enable"
                onClick={(e: React.MouseEvent<Element, MouseEvent>) => {
                  this._forceOpen = true;
                  this.model.isDisclaimed = true;
                }}
              >
                {this.trans.__('Enable')}
              </Button>
            )}
          </div>
        </div>
      </CollapsibleSection>
    );
    if (model.isUpdating) {
      content.push(
        <div key="loading-placeholder" className="jp-extensionmanager-loader">
          {this.trans.__('Updating extensions list…')}
        </div>
      );
    } else if (model.serverConnectionError !== null) {
      content.push(
        <ErrorMessage key="error-msg">
          <p>
            {this.trans
              .__(`Error communicating with server extension. Consult the documentation
            for how to ensure that it is enabled.`)}
          </p>

          <p>{this.trans.__('Reason given:')}</p>
          <pre>{model.serverConnectionError}</pre>
        </ErrorMessage>
      );
    } else if (model.serverRequirementsError !== null) {
      content.push(
        <ErrorMessage key="server-requirements-error">
          <p>
            {this.trans.__(
              'The server has some missing requirements for installing extensions.'
            )}
          </p>

          <p>{this.trans.__('Details:')}</p>
          <pre>{model.serverRequirementsError}</pre>
        </ErrorMessage>
      );
    } else {
      // List installed and discovery sections
      const query = new RegExp(model.query?.toLowerCase() ?? '');
      content.push(
        <CollapsibleSection
          key="installed-section"
          isOpen={model.isDisclaimed}
          forceOpen={this._forceOpen}
          disabled={!model.isDisclaimed}
          header={this.trans.__('Installed')}
          headerElements={
            <ToolbarButtonComponent
              key="refresh-button"
              icon={refreshIcon}
              onClick={() => {
                model.refreshInstalled();
              }}
              tooltip={this.trans.__('Refresh extension list')}
            />
          }
        >
          {model.installedError !== null ? (
            <ErrorMessage>
              {`Error querying installed extensions${
                model.installedError ? `: ${model.installedError}` : '.'
              }`}
            </ErrorMessage>
          ) : (
            <ListView
              entries={model.installed.filter(
                pkg => !model.query || query.test(pkg.name)
              )}
              numPages={1}
              trans={this.trans}
              onPage={value => {
                /* no-op */
              }}
              performAction={this.onAction.bind(this)}
              supportInstallation={model.isDisclaimed}
            />
          )}
        </CollapsibleSection>
      );

      content.push(
        <CollapsibleSection
          key="search-section"
          isOpen={model.isDisclaimed}
          forceOpen={this._forceOpen}
          disabled={!model.isDisclaimed}
          header={
            model.query
              ? this.trans.__('Search Results')
              : this.trans.__('Discover')
          }
          onCollapse={(isOpen: boolean) => {
            if (isOpen && model.query === null) {
              model.query = '';
            }
          }}
        >
          {model.searchError !== null ? (
            <ErrorMessage>
              {`Error searching for extensions${
                model.searchError ? `: ${model.searchError}` : '.'
              }`}
            </ErrorMessage>
          ) : (
            <ListView
              // Filter out installed extensions:
              entries={model.searchResult.filter(
                entry => model.installed.indexOf(entry) === -1
              )}
              numPages={pages}
              onPage={value => {
                this.onPage(value);
              }}
              performAction={this.onAction.bind(this)}
              supportInstallation={model.isDisclaimed}
              trans={this.trans}
            />
          )}
        </CollapsibleSection>
      );
    }

    // Reset the force open for future usage.
    this._forceOpen = false;

    return (
      <>
        <FilterBox
          placeholder={this.trans.__('Search')}
          disabled={!this.model.isDisclaimed}
          updateFilter={(fn, query) => void 0}
          useFuzzyFilter={false}
          inputRef={this._searchInputRef}
        />

        <div
          className={`jp-extensionmanager-pending ${
            model.hasPendingActions() ? 'jp-mod-hasPending' : ''
          }`}
        />

        <div className="jp-extensionmanager-content">{content}</div>
      </>
    );
  }

  /**
   * Callback handler for the user specifies a new search query.
   *
   * @param value The new query.
   */
  onSearch(value: string): void {
    this.model!.query = value;
  }

  /**
   * Callback handler for the user changes the page of the search result pagination.
   *
   * @param value The pagination page number.
   */
  onPage(value: number): void {
    this.model!.page = value;
  }

  /**
   * Callback handler for when the user wants to perform an action on an extension.
   *
   * @param action The action to perform.
   * @param entry The entry to perform the action on.
   */
  onAction(action: Action, entry: IEntry): Promise<void> {
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
   * Handle the DOM events for the extension manager search bar.
   *
   * @param event - The DOM event sent to the extension manager search bar.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the search bar's DOM node.
   * It should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
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
    this.node.addEventListener('focus', this, true);
    this.node.addEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('focus', this, true);
    this.node.removeEventListener('blur', this, true);
  }

  /**
   * A message handler invoked on an `'activate-request'` message.
   */
  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      const input = this._searchInputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  /**
   * Toggle the focused modifier based on the input node focus state.
   */
  private _toggleFocused(): void {
    const focused = document.activeElement === this._searchInputRef.current;
    this.toggleClass('lm-mod-focused', focused);
  }

  protected trans: TranslationBundle;
  private _forceOpen: boolean;
  private _searchInputRef: React.RefObject<HTMLInputElement>;
}
