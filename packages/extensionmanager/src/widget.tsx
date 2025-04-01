// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import {
  Button,
  FilterBox,
  infoIcon,
  jupyterIcon,
  PanelWithToolbar,
  ReactWidget,
  refreshIcon,
  SidePanel,
  ToolbarButton,
  ToolbarButtonComponent
} from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { AccordionLayout, AccordionPanel } from '@lumino/widgets';
import * as React from 'react';
import ReactPaginate from 'react-paginate';
import { Action, IActionOptions, IEntry, ListModel } from './model';

const BADGE_SIZE = 32;
const BADGE_QUERY_SIZE = Math.floor(devicePixelRatio * BADGE_SIZE);

function getExtensionGitHubUser(entry: IEntry) {
  if (
    entry.homepage_url &&
    entry.homepage_url.startsWith('https://github.com/')
  ) {
    return entry.homepage_url.split('/')[3];
  } else if (
    entry.repository_url &&
    entry.repository_url.startsWith('https://github.com/')
  ) {
    return entry.repository_url.split('/')[3];
  }
  return null;
}

/**
 * VDOM for visualizing an extension entry.
 */
function ListEntry(props: ListEntry.IProperties): React.ReactElement<any> {
  const { canFetch, entry, supportInstallation, trans } = props;
  const flagClasses = [];
  if (entry.status && ['ok', 'warning', 'error'].indexOf(entry.status) !== -1) {
    flagClasses.push(`jp-extensionmanager-entry-${entry.status}`);
  }
  const githubUser = canFetch ? getExtensionGitHubUser(entry) : null;

  if (!entry.allowed) {
    flagClasses.push(`jp-extensionmanager-entry-should-be-uninstalled`);
  }

  return (
    <li
      className={`jp-extensionmanager-entry ${flagClasses.join(' ')}`}
      style={{ display: 'flex' }}
    >
      <div style={{ marginRight: '8px' }}>
        {githubUser ? (
          <img
            src={`https://github.com/${githubUser}.png?size=${BADGE_QUERY_SIZE}`}
            style={{ width: '32px', height: '32px' }}
          />
        ) : (
          <div
            style={{ width: `${BADGE_SIZE}px`, height: `${BADGE_SIZE}px` }}
          />
        )}
      </div>
      <div className="jp-extensionmanager-entry-description">
        <div className="jp-extensionmanager-entry-title">
          <div className="jp-extensionmanager-entry-name">
            {entry.homepage_url ? (
              <a
                href={entry.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
                title={trans.__('%1 extension home page', entry.name)}
              >
                {entry.name}
              </a>
            ) : (
              <div>{entry.name}</div>
            )}
          </div>
          <div className="jp-extensionmanager-entry-version">
            <div title={trans.__('Version: %1', entry.installed_version)}>
              {entry.installed_version}
            </div>
          </div>
          {entry.installed && !entry.allowed && (
            <ToolbarButtonComponent
              icon={infoIcon}
              iconLabel={trans.__(
                '%1 extension is not allowed anymore. Please uninstall it immediately or contact your administrator.',
                entry.name
              )}
              onClick={() =>
                window.open(
                  'https://jupyterlab.readthedocs.io/en/latest/user/extensions.html'
                )
              }
            />
          )}
          {entry.approved && (
            <jupyterIcon.react
              className="jp-extensionmanager-is-approved"
              top="1px"
              height="auto"
              width="1em"
              title={trans.__(
                'This extension is approved by your security team.'
              )}
            />
          )}
        </div>
        <div className="jp-extensionmanager-entry-content">
          <div className="jp-extensionmanager-entry-description">
            {entry.description}
          </div>
          {props.performAction && (
            <div className="jp-extensionmanager-entry-buttons">
              {entry.installed ? (
                <>
                  {supportInstallation && (
                    <>
                      {ListModel.entryHasUpdate(entry) && (
                        <Button
                          onClick={() =>
                            props.performAction!('install', entry, {
                              useVersion: entry.latest_version
                            })
                          }
                          title={trans.__(
                            'Update "%1" to "%2"',
                            entry.name,
                            entry.latest_version
                          )}
                          minimal
                          small
                        >
                          {trans.__('Update to %1', entry.latest_version)}
                        </Button>
                      )}
                      <Button
                        onClick={() => props.performAction!('uninstall', entry)}
                        title={trans.__('Uninstall "%1"', entry.name)}
                        minimal
                        small
                      >
                        {trans.__('Uninstall')}
                      </Button>
                    </>
                  )}
                  {entry.enabled ? (
                    <Button
                      onClick={() => props.performAction!('disable', entry)}
                      title={trans.__('Disable "%1"', entry.name)}
                      minimal
                      small
                    >
                      {trans.__('Disable')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => props.performAction!('enable', entry)}
                      title={trans.__('Enable "%1"', entry.name)}
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
                    onClick={() => props.performAction!('install', entry)}
                    title={trans.__('Install "%1"', entry.name)}
                    minimal
                    small
                  >
                    {trans.__('Install')}
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The namespace for extension entry statics.
 */
namespace ListEntry {
  export interface IProperties {
    /**
     * Whether thumbnails can be fetched from external webservices or not.
     */
    canFetch: boolean;

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
     *
     * Not provided if actions are not allowed.
     */
    performAction?: (
      action: Action,
      entry: IEntry,
      actionOptions?: IActionOptions
    ) => void;

    /**
     * The language translator.
     */
    trans: TranslationBundle;
  }
}

/**
 * List view widget for extensions
 */
function ListView(props: ListView.IProperties): React.ReactElement<any> {
  const { canFetch, performAction, supportInstallation, trans } = props;

  return (
    <div className="jp-extensionmanager-listview-wrapper">
      {props.entries.length > 0 ? (
        <ul className="jp-extensionmanager-listview">
          {props.entries.map(entry => (
            <ListEntry
              key={entry.name}
              canFetch={canFetch}
              entry={entry}
              performAction={performAction}
              supportInstallation={supportInstallation}
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
            breakLabel="..."
            breakClassName={'break'}
            initialPage={(props.initialPage ?? 1) - 1}
            pageCount={props.numPages}
            marginPagesDisplayed={2}
            pageRangeDisplayed={3}
            onPageChange={(data: { selected: number }) =>
              props.onPage(data.selected + 1)
            }
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
namespace ListView {
  export interface IProperties {
    /**
     * Whether thumbnails can be fetched from external webservices or not.
     */
    canFetch: boolean;

    /**
     * The extension entries to display.
     */
    entries: ReadonlyArray<IEntry>;

    /**
     * Active page
     */
    initialPage?: number;

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
     *
     * Not provided if actions are not allowed.
     */
    performAction?: (
      action: Action,
      entry: IEntry,
      actionOptions?: IActionOptions
    ) => void;
  }
}

function ErrorMessage(props: React.PropsWithChildren) {
  return <div className="jp-extensionmanager-error">{props.children}</div>;
}

class Header extends ReactWidget {
  constructor(
    protected model: ListModel,
    protected trans: TranslationBundle,
    protected searchInputRef: React.RefObject<HTMLInputElement>
  ) {
    super();
    model.stateChanged.connect(this.update, this);
    this.addClass('jp-extensionmanager-header');
  }

  render(): JSX.Element {
    return (
      <>
        <div className="jp-extensionmanager-title">
          <span>{this.trans.__('%1 Manager', this.model.name)}</span>
          {this.model.installPath && (
            <infoIcon.react
              className="jp-extensionmanager-path"
              tag="span"
              title={this.trans.__(
                'Extension installation path: %1',
                this.model.installPath
              )}
            ></infoIcon.react>
          )}
        </div>
        <FilterBox
          placeholder={this.trans.__('Search extensions')}
          disabled={!this.model.isDisclaimed}
          updateFilter={(fn, query) => {
            this.model.query = query ?? '';
          }}
          useFuzzyFilter={false}
          inputRef={this.searchInputRef}
        />

        <div
          className={`jp-extensionmanager-pending ${
            this.model.hasPendingActions() ? 'jp-mod-hasPending' : ''
          }`}
        />
        {this.model.actionError && (
          <ErrorMessage>
            <p>{this.trans.__('Error when performing an action.')}</p>
            <p>{this.trans.__('Reason given:')}</p>
            <pre>{this.model.actionError}</pre>
          </ErrorMessage>
        )}
      </>
    );
  }
}

class Warning extends ReactWidget {
  constructor(
    protected model: ListModel,
    protected trans: TranslationBundle
  ) {
    super();
    this.addClass('jp-extensionmanager-disclaimer');
    model.stateChanged.connect(this.update, this);
  }

  render(): JSX.Element {
    return (
      <>
        <p>
          {this.trans
            .__(`The JupyterLab development team is excited to have a robust
third-party extension community. However, we do not review
third-party extensions, and some extensions may introduce security
risks or contain malicious code that runs on your machine. Moreover in order
to work, this panel needs to fetch data from web services. Do you agree to
activate this feature?`)}
          <br />
          <a
            href="https://jupyterlab.readthedocs.io/en/latest/privacy_policies.html"
            target="_blank"
            rel="noreferrer"
          >
            {this.trans.__('Please read the privacy policy.')}
          </a>
        </p>
        {this.model.isDisclaimed ? (
          <Button
            className="jp-extensionmanager-disclaimer-disable"
            onClick={(e: React.MouseEvent<Element, MouseEvent>) => {
              this.model.isDisclaimed = false;
            }}
            title={this.trans.__('This will withdraw your consent.')}
          >
            {this.trans.__('No')}
          </Button>
        ) : (
          <div>
            <Button
              className="jp-extensionmanager-disclaimer-enable"
              onClick={() => {
                this.model.isDisclaimed = true;
              }}
            >
              {this.trans.__('Yes')}
            </Button>
            <Button
              className="jp-extensionmanager-disclaimer-disable"
              onClick={() => {
                this.model.isEnabled = false;
              }}
              title={this.trans.__(
                'This will disable the extension manager panel; including the listing of installed extension.'
              )}
            >
              {this.trans.__('No, disable')}
            </Button>
          </div>
        )}
      </>
    );
  }
}

class InstalledList extends ReactWidget {
  constructor(
    protected model: ListModel,
    protected trans: TranslationBundle
  ) {
    super();
    model.stateChanged.connect(this.update, this);
  }

  render(): JSX.Element {
    return (
      <>
        {this.model.installedError !== null ? (
          <ErrorMessage>
            {`Error querying installed extensions${
              this.model.installedError ? `: ${this.model.installedError}` : '.'
            }`}
          </ErrorMessage>
        ) : this.model.isLoadingInstalledExtensions ? (
          <div className="jp-extensionmanager-loader">
            {this.trans.__('Updating extensions list…')}
          </div>
        ) : (
          <ListView
            canFetch={this.model.isDisclaimed}
            entries={this.model.installed.filter(pkg =>
              new RegExp(this.model.query.toLowerCase()).test(pkg.name)
            )}
            numPages={1}
            trans={this.trans}
            onPage={value => {
              /* no-op */
            }}
            performAction={
              this.model.isDisclaimed ? this.onAction.bind(this) : null
            }
            supportInstallation={
              this.model.canInstall && this.model.isDisclaimed
            }
          />
        )}
      </>
    );
  }

  /**
   * Callback handler for when the user wants to perform an action on an extension.
   *
   * @param action The action to perform.
   * @param entry The entry to perform the action on.
   * @param actionOptions Additional options for the action.
   */
  onAction(
    action: Action,
    entry: IEntry,
    actionOptions: IActionOptions = {}
  ): Promise<void> {
    switch (action) {
      case 'install':
        return this.model.install(entry, actionOptions);
      case 'uninstall':
        return this.model.uninstall(entry);
      case 'enable':
        return this.model.enable(entry);
      case 'disable':
        return this.model.disable(entry);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }
}

class SearchResult extends ReactWidget {
  constructor(
    protected model: ListModel,
    protected trans: TranslationBundle
  ) {
    super();
    model.stateChanged.connect(this.update, this);
  }

  /**
   * Callback handler for the user changes the page of the search result pagination.
   *
   * @param value The pagination page number.
   */
  onPage(value: number): void {
    this.model.page = value;
  }

  /**
   * Callback handler for when the user wants to perform an action on an extension.
   *
   * @param action The action to perform.
   * @param entry The entry to perform the action on.
   * @param actionOptions Additional options for the action.
   */
  onAction(
    action: Action,
    entry: IEntry,
    actionOptions: IActionOptions = {}
  ): Promise<void> {
    switch (action) {
      case 'install':
        return this.model.install(entry, actionOptions);
      case 'uninstall':
        return this.model.uninstall(entry);
      case 'enable':
        return this.model.enable(entry);
      case 'disable':
        return this.model.disable(entry);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }

  render(): JSX.Element {
    return (
      <>
        {this.model.searchError !== null ? (
          <ErrorMessage>
            {`Error searching for extensions${
              this.model.searchError ? `: ${this.model.searchError}` : '.'
            }`}
          </ErrorMessage>
        ) : this.model.isSearching ? (
          <div className="jp-extensionmanager-loader">
            {this.trans.__('Updating extensions list…')}
          </div>
        ) : (
          <ListView
            canFetch={this.model.isDisclaimed}
            entries={this.model.searchResult}
            initialPage={this.model.page}
            numPages={this.model.lastPage}
            onPage={value => {
              this.onPage(value);
            }}
            performAction={
              this.model.isDisclaimed ? this.onAction.bind(this) : null
            }
            supportInstallation={
              this.model.canInstall && this.model.isDisclaimed
            }
            trans={this.trans}
          />
        )}
      </>
    );
  }

  update(): void {
    this.title.label = this.model.query
      ? this.trans.__('Search Results')
      : this.trans.__('Discover');
    super.update();
  }
}

export namespace ExtensionsPanel {
  export interface IOptions {
    model: ListModel;
    translator: ITranslator;
  }
}

export class ExtensionsPanel extends SidePanel {
  constructor(options: ExtensionsPanel.IOptions) {
    const { model, translator } = options;
    super({ translator });
    this.model = model;
    this._searchInputRef = React.createRef<HTMLInputElement>();
    this.addClass('jp-extensionmanager-view');

    this.trans = translator.load('jupyterlab');

    this.header.addWidget(new Header(model, this.trans, this._searchInputRef));

    const warning = new Warning(model, this.trans);
    warning.title.label = this.trans.__('Warning');

    this.addWidget(warning);

    const installed = new PanelWithToolbar();
    installed.addClass('jp-extensionmanager-installedlist');
    installed.toolbar.node.setAttribute(
      'aria-label',
      this.trans.__('Extensions panel toolbar')
    );
    installed.title.label = this.trans.__('Installed');

    installed.toolbar.addItem(
      'refresh',
      new ToolbarButton({
        icon: refreshIcon,
        onClick: () => {
          model.refreshInstalled(true).catch(reason => {
            console.error(
              `Failed to refresh the installed extensions list:\n${reason}`
            );
          });
        },
        tooltip: this.trans.__('Refresh extensions list')
      })
    );

    installed.addWidget(new InstalledList(model, this.trans));

    this.addWidget(installed);

    if (this.model.canInstall) {
      const searchResults = new SearchResult(model, this.trans);
      searchResults.addClass('jp-extensionmanager-searchresults');
      this.addWidget(searchResults);
    }

    this._wasDisclaimed = this.model.isDisclaimed;
    if (this.model.isDisclaimed) {
      (this.content as AccordionPanel).collapse(0);
      (this.content.layout as AccordionLayout).setRelativeSizes([0, 1, 1]);
    } else {
      // If warning is not disclaimed expand only the warning panel
      (this.content as AccordionPanel).expand(0);
      (this.content as AccordionPanel).collapse(1);
      (this.content as AccordionPanel).collapse(2);
    }

    this.model.stateChanged.connect(this._onStateChanged, this);
  }

  /**
   * Dispose of the widget and its descendant widgets.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.model.stateChanged.disconnect(this._onStateChanged, this);
    super.dispose();
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
    super.onBeforeAttach(msg);
  }

  protected onBeforeShow(msg: Message): void {
    if (!this._wasInitialized) {
      this._wasInitialized = true;
      this.model.refreshInstalled().catch(reason => {
        console.log(`Failed to refresh installed extension list:\n${reason}`);
      });
    }
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    super.onAfterDetach(msg);
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
        // Cover the cases, mainly on initial startup, where the input ref is not an input element
        if (input.focus) {
          input.focus();
        }

        if (input.select) {
          input.select();
        }
      }
    }
    super.onActivateRequest(msg);
  }

  private _onStateChanged(): void {
    if (!this._wasDisclaimed && this.model.isDisclaimed) {
      (this.content as AccordionPanel).collapse(0);
      (this.content as AccordionPanel).expand(1);
      (this.content as AccordionPanel).expand(2);
    }
    this._wasDisclaimed = this.model.isDisclaimed;
  }

  /**
   * Toggle the focused modifier based on the input node focus state.
   */
  private _toggleFocused(): void {
    const focused = document.activeElement === this._searchInputRef.current;
    this.toggleClass('lm-mod-focused', focused);
  }

  protected model: ListModel;
  protected trans: TranslationBundle;
  private _searchInputRef: React.RefObject<HTMLInputElement>;
  private _wasInitialized = false;
  private _wasDisclaimed = true;
}
