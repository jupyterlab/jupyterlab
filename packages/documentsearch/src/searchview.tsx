// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  caretDownEmptyThinIcon,
  caretDownIcon,
  caretRightIcon,
  caretUpEmptyThinIcon,
  caseSensitiveIcon,
  classes,
  closeIcon,
  ellipsesIcon,
  regexIcon,
  VDomRenderer,
  wordIcon
} from '@jupyterlab/ui-components';
import { ISignal, Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import * as React from 'react';
import { SearchDocumentModel } from './searchmodel';
import { IFilter, IFilters, IReplaceOptionsSupport } from './tokens';

const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
const OVERLAY_ROW_CLASS = 'jp-DocumentSearch-overlay-row';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const INPUT_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off';
const INPUT_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_DOWN_BUTTON_CLASS = 'jp-DocumentSearch-up-down-button';
const ELLIPSES_BUTTON_CLASS = 'jp-DocumentSearch-ellipses-button';
const ELLIPSES_BUTTON_ENABLED_CLASS =
  'jp-DocumentSearch-ellipses-button-enabled';
const REGEX_ERROR_CLASS = 'jp-DocumentSearch-regex-error';
const SEARCH_OPTIONS_CLASS = 'jp-DocumentSearch-search-options';
const SEARCH_OPTIONS_DISABLED_CLASS =
  'jp-DocumentSearch-search-options-disabled';
const REPLACE_BUTTON_CLASS = 'jp-DocumentSearch-replace-button';
const REPLACE_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-replace-button-wrapper';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';
const REPLACE_TOGGLE_CLASS = 'jp-DocumentSearch-replace-toggle';
const TOGGLE_WRAPPER = 'jp-DocumentSearch-toggle-wrapper';
const TOGGLE_PLACEHOLDER = 'jp-DocumentSearch-toggle-placeholder';
const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';
const SPACER_CLASS = 'jp-DocumentSearch-spacer';

interface ISearchEntryProps {
  inputRef: React.RefObject<HTMLInputElement>;
  onCaseSensitiveToggled: () => void;
  onRegexToggled: () => void;
  onWordToggled: () => void;
  onKeydown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWords: boolean;
  searchText: string;
  translator?: ITranslator;
}

function SearchEntry(props: ISearchEntryProps): JSX.Element {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');

  const caseButtonToggleClass = classes(
    props.caseSensitive ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
    BUTTON_CONTENT_CLASS
  );
  const regexButtonToggleClass = classes(
    props.useRegex ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
    BUTTON_CONTENT_CLASS
  );
  const wordButtonToggleClass = classes(
    props.wholeWords ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
    BUTTON_CONTENT_CLASS
  );

  const wrapperClass = INPUT_WRAPPER_CLASS;

  return (
    <div className={wrapperClass}>
      <input
        placeholder={trans.__('Find')}
        className={INPUT_CLASS}
        value={props.searchText}
        onChange={e => props.onChange(e)}
        onKeyDown={e => props.onKeydown(e)}
        tabIndex={0}
        ref={props.inputRef}
        title={trans.__('Find')}
      />
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => {
          props.onCaseSensitiveToggled();
        }}
        tabIndex={0}
        title={trans.__('Match Case')}
      >
        <caseSensitiveIcon.react className={caseButtonToggleClass} tag="span" />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onWordToggled()}
        tabIndex={0}
        title={trans.__('Match Whole Word')}
      >
        <wordIcon.react className={wordButtonToggleClass} tag="span" />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onRegexToggled()}
        tabIndex={0}
        title={trans.__('Use Regular Expression')}
      >
        <regexIcon.react className={regexButtonToggleClass} tag="span" />
      </button>
    </div>
  );
}

interface IReplaceEntryProps {
  onPreserveCaseToggled: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onReplaceKeydown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preserveCase: boolean;
  replaceOptionsSupport: IReplaceOptionsSupport | undefined;
  replaceText: string;
  translator?: ITranslator;
}

function ReplaceEntry(props: IReplaceEntryProps): JSX.Element {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');

  const preserveCaseButtonToggleClass = classes(
    props.preserveCase ? INPUT_BUTTON_CLASS_ON : INPUT_BUTTON_CLASS_OFF,
    BUTTON_CONTENT_CLASS
  );

  return (
    <div className={REPLACE_WRAPPER_CLASS}>
      <div className={INPUT_WRAPPER_CLASS}>
        <input
          placeholder={trans.__('Replace')}
          className={INPUT_CLASS}
          value={props.replaceText ?? ''}
          onKeyDown={e => props.onReplaceKeydown(e)}
          onChange={e => props.onChange(e)}
          tabIndex={0}
          title={trans.__('Replace')}
        />
        {props.replaceOptionsSupport?.preserveCase ? (
          <button
            className={BUTTON_WRAPPER_CLASS}
            onClick={() => props.onPreserveCaseToggled()}
            tabIndex={0}
            title={trans.__('Preserve Case')}
          >
            <caseSensitiveIcon.react
              className={preserveCaseButtonToggleClass}
              tag="span"
            />
          </button>
        ) : null}
      </div>
      <button
        className={REPLACE_BUTTON_WRAPPER_CLASS}
        onClick={() => props.onReplaceCurrent()}
        tabIndex={0}
      >
        <span
          className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
          tabIndex={0}
        >
          {trans.__('Replace')}
        </span>
      </button>
      <button
        className={REPLACE_BUTTON_WRAPPER_CLASS}
        tabIndex={0}
        onClick={() => props.onReplaceAll()}
      >
        <span
          className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
          tabIndex={-1}
        >
          {trans.__('Replace All')}
        </span>
      </button>
    </div>
  );
}

interface IUpDownProps {
  onHighlightPrevious: () => void;
  onHighlightNext: () => void;
  trans: TranslationBundle;
}

function UpDownButtons(props: IUpDownProps) {
  return (
    <div className={UP_DOWN_BUTTON_WRAPPER_CLASS}>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHighlightPrevious()}
        tabIndex={0}
        title={props.trans.__('Previous Match')}
      >
        <caretUpEmptyThinIcon.react
          className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
          tag="span"
        />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHighlightNext()}
        tabIndex={0}
        title={props.trans.__('Next Match')}
      >
        <caretDownEmptyThinIcon.react
          className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
          tag="span"
        />
      </button>
    </div>
  );
}

interface ISearchIndexProps {
  currentIndex: number | null;
  totalMatches: number;
}

function SearchIndices(props: ISearchIndexProps) {
  return (
    <div className={INDEX_COUNTER_CLASS}>
      {props.totalMatches === 0
        ? '-/-'
        : `${props.currentIndex === null ? '-' : props.currentIndex + 1}/${
            props.totalMatches
          }`}
    </div>
  );
}

interface IFilterToggleProps {
  enabled: boolean;
  toggleEnabled: () => void;
  trans: TranslationBundle;
}

function FilterToggle(props: IFilterToggleProps): JSX.Element {
  let className = `${ELLIPSES_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`;
  if (props.enabled) {
    className = `${className} ${ELLIPSES_BUTTON_ENABLED_CLASS}`;
  }

  return (
    <button
      className={BUTTON_WRAPPER_CLASS}
      onClick={() => props.toggleEnabled()}
      tabIndex={0}
      title={
        props.enabled
          ? props.trans.__('Hide Search Filters')
          : props.trans.__('Show Search Filters')
      }
    >
      <ellipsesIcon.react
        className={className}
        tag="span"
        height="20px"
        width="20px"
      />
    </button>
  );
}

interface IFilterSelectionProps {
  title: string;
  description: string;
  value: boolean;
  isEnabled: boolean;
  onToggle: () => void;
}

function FilterSelection(props: IFilterSelectionProps): JSX.Element {
  return (
    <label
      className={props.isEnabled ? '' : SEARCH_OPTIONS_DISABLED_CLASS}
      title={props.description}
    >
      {props.title}
      <input
        type="checkbox"
        disabled={!props.isEnabled}
        checked={props.value}
        onChange={props.onToggle}
      />
    </label>
  );
}

/**
 * React search component state
 */
interface ISearchOverlayState {
  /**
   * Is the filters view open?
   */
  filtersOpen: boolean;
}

interface ISearchOverlayProps {
  /**
   * Whether the search is case sensitive or not.
   */
  caseSensitive: boolean;
  /**
   * Current match index.
   */
  currentIndex: number | null;
  /**
   * Error message
   */
  errorMessage: string;
  /**
   * Filters values.
   */
  filters: IFilters;
  /**
   * Available filters definition.
   */
  filtersDefinition: { [f: string]: IFilter };
  /**
   * Whether the document is read-only or not.
   */
  isReadOnly: boolean;
  /**
   * Whether to preserve case when replacing.
   */
  preserveCase: boolean;
  /**
   * Whether or not the replace entry row is visible
   */
  replaceEntryVisible: boolean;
  /**
   * Support for replace options
   */
  replaceOptionsSupport?: IReplaceOptionsSupport;
  /**
   * Replacement expression
   */
  replaceText: string;
  /**
   * The text in the search entry
   */
  searchText: string;
  /**
   * Search input reference.
   */
  searchInputRef: React.RefObject<HTMLInputElement>;
  /**
   * Total number of search matches.
   */
  totalMatches: number | null;
  /**
   * Application translator object
   */
  translator?: ITranslator;
  /**
   * Whether the search defines a regular expression or not.
   */
  useRegex: boolean;
  /**
   * Whether the search matches entire words or any substring.
   */
  wholeWords: boolean;
  /**
   * Callback on case sensitive toggled.
   */
  onCaseSensitiveToggled: () => void;
  /**
   * Callback on highlight next click.
   */
  onHighlightNext: () => void;
  /**
   * Callback on highlight previous click.
   */
  onHighlightPrevious: () => void;
  /**
   * Callback on filters values changed.
   *
   * The provided filter values are the one changing.
   */
  onFilterChanged: (name: string, value: boolean) => Promise<void>;
  /**
   * Callback on close button click.
   */
  onClose: () => void;
  /**
   * Callback on preserve case in replace toggled.
   */
  onPreserveCaseToggled: () => void;
  /**
   * Callback on use regular expression toggled.
   */
  onRegexToggled: () => void;
  /**
   * Callback on use whole word toggled.
   */
  onWordToggled: () => void;
  /**
   * Callback on replace all button click.
   */
  onReplaceAll: () => void;
  /**
   * Callback on replace expression change.
   */
  onReplaceChanged: (q: string) => void;
  /**
   * Callback on replace current button click.
   */
  onReplaceCurrent: () => void;
  /**
   * Callback on show replace menu button click.
   */
  onReplaceEntryShown: (v: boolean) => void;
  /**
   * Callback on search expression change.
   */
  onSearchChanged: (q: string) => void;
}

class SearchOverlay extends React.Component<
  ISearchOverlayProps,
  ISearchOverlayState
> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.translator = props.translator || nullTranslator;
    this.state = {
      filtersOpen: false
    };
  }

  private _onSearchChange(event: React.ChangeEvent) {
    const searchText = (event.target as HTMLInputElement).value;
    this.props.onSearchChanged(searchText);
  }

  private _onSearchKeydown(event: React.KeyboardEvent) {
    if (event.keyCode === 13) {
      // Enter pressed
      event.preventDefault();
      event.stopPropagation();
      event.shiftKey
        ? this.props.onHighlightPrevious()
        : this.props.onHighlightNext();
    }
  }

  private _onReplaceKeydown(event: React.KeyboardEvent) {
    if (event.keyCode === 13) {
      // Enter pressed
      event.preventDefault();
      event.stopPropagation();
      this.props.onReplaceCurrent();
    }
  }

  private _onClose() {
    // Clean up and close widget.
    this.props.onClose();
  }

  private _onReplaceToggled() {
    // Deactivate invalid replace filters
    if (!this.props.replaceEntryVisible) {
      for (const key in this.props.filtersDefinition) {
        const filter = this.props.filtersDefinition[key];
        if (!filter.supportReplace) {
          this.props.onFilterChanged(key, false).catch(reason => {
            console.error(
              `Fail to update filter value for ${filter.title}:\n${reason}`
            );
          });
        }
      }
    }

    this.props.onReplaceEntryShown(!this.props.replaceEntryVisible);
  }

  private _toggleFiltersOpen() {
    this.setState(prevState => ({
      filtersOpen: !prevState.filtersOpen
    }));
  }

  render() {
    const trans = this.translator.load('jupyterlab');
    const showReplace =
      !this.props.isReadOnly && this.props.replaceEntryVisible;
    const filters = this.props.filtersDefinition;

    const hasFilters = Object.keys(filters).length > 0;
    const filterToggle = hasFilters ? (
      <FilterToggle
        enabled={this.state.filtersOpen}
        toggleEnabled={() => this._toggleFiltersOpen()}
        trans={trans}
      />
    ) : null;
    const filter = hasFilters ? (
      <div className={SEARCH_OPTIONS_CLASS}>
        {Object.keys(filters).map(name => {
          const filter = filters[name];
          return (
            <FilterSelection
              key={name}
              title={filter.title}
              description={filter.description}
              isEnabled={!showReplace || filter.supportReplace}
              onToggle={async () => {
                await this.props.onFilterChanged(
                  name,
                  !this.props.filters[name]
                );
              }}
              value={this.props.filters[name] ?? filter.default}
            />
          );
        })}
      </div>
    ) : null;
    const icon = this.props.replaceEntryVisible
      ? caretDownIcon
      : caretRightIcon;

    // TODO: Error messages from regex are not currently localizable.
    return (
      <>
        <div className={OVERLAY_ROW_CLASS}>
          {this.props.isReadOnly ? (
            <div className={TOGGLE_PLACEHOLDER} />
          ) : (
            <button
              className={TOGGLE_WRAPPER}
              onClick={() => this._onReplaceToggled()}
              tabIndex={0}
              title={trans.__('Toggle Replace')}
            >
              <icon.react
                className={`${REPLACE_TOGGLE_CLASS} ${BUTTON_CONTENT_CLASS}`}
                tag="span"
                elementPosition="center"
                height="20px"
                width="20px"
              />
            </button>
          )}
          <SearchEntry
            inputRef={this.props.searchInputRef}
            useRegex={this.props.useRegex}
            caseSensitive={this.props.caseSensitive}
            wholeWords={this.props.wholeWords}
            onCaseSensitiveToggled={this.props.onCaseSensitiveToggled}
            onRegexToggled={this.props.onRegexToggled}
            onWordToggled={this.props.onWordToggled}
            onKeydown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              this._onSearchKeydown(e)
            }
            onChange={(e: React.ChangeEvent) => this._onSearchChange(e)}
            searchText={this.props.searchText}
            translator={this.translator}
          />
          <SearchIndices
            currentIndex={this.props.currentIndex}
            totalMatches={this.props.totalMatches ?? 0}
          />
          <UpDownButtons
            onHighlightPrevious={() => {
              this.props.onHighlightPrevious();
            }}
            onHighlightNext={() => {
              this.props.onHighlightNext();
            }}
            trans={trans}
          />
          {showReplace ? null : filterToggle}
          <button
            className={BUTTON_WRAPPER_CLASS}
            onClick={() => this._onClose()}
            tabIndex={0}
          >
            <closeIcon.react
              className="jp-icon-hover"
              elementPosition="center"
              height="16px"
              width="16px"
            />
          </button>
        </div>
        <div className={OVERLAY_ROW_CLASS}>
          {showReplace ? (
            <>
              <ReplaceEntry
                onPreserveCaseToggled={this.props.onPreserveCaseToggled}
                onReplaceKeydown={(e: React.KeyboardEvent) =>
                  this._onReplaceKeydown(e)
                }
                onChange={(e: React.ChangeEvent) =>
                  this.props.onReplaceChanged(
                    (e.target as HTMLInputElement).value
                  )
                }
                onReplaceCurrent={() => this.props.onReplaceCurrent()}
                onReplaceAll={() => this.props.onReplaceAll()}
                replaceOptionsSupport={this.props.replaceOptionsSupport}
                replaceText={this.props.replaceText}
                preserveCase={this.props.preserveCase}
                translator={this.translator}
              />
              <div className={SPACER_CLASS}></div>
              {filterToggle}
            </>
          ) : null}
        </div>
        {this.state.filtersOpen ? filter : null}
        {!!this.props.errorMessage && (
          <div className={REGEX_ERROR_CLASS}>{this.props.errorMessage}</div>
        )}
      </>
    );
  }

  protected translator: ITranslator;
}

/**
 * Search document widget
 */
export class SearchDocumentView extends VDomRenderer<SearchDocumentModel> {
  /**
   * Search document widget constructor.
   *
   * @param model Search document model
   * @param translator Application translator object
   */
  constructor(model: SearchDocumentModel, protected translator?: ITranslator) {
    super(model);
    this.addClass(OVERLAY_CLASS);
    this._searchInput = React.createRef<HTMLInputElement>();
  }

  /**
   * A signal emitted when the widget is closed.
   *
   * Closing the widget detached it from the DOM but does not dispose it.
   */
  get closed(): ISignal<SearchDocumentView, void> {
    return this._closed;
  }

  /**
   * Focus search input.
   */
  focusSearchInput(): void {
    this._searchInput.current?.select();
  }

  /**
   * Set the search text
   *
   * It does not trigger a view update.
   */
  setSearchText(search: string): void {
    this.model.searchExpression = search;
  }

  /**
   * Set the replace text
   *
   * It does not trigger a view update.
   */
  setReplaceText(replace: string): void {
    this.model.replaceText = replace;
  }

  /**
   * Show the replacement input box.
   */
  showReplace(): void {
    this.setReplaceInputVisibility(true);
  }

  /**
   * A message handler invoked on a `'close-request'` message.
   *
   * #### Notes
   * On top of the default implementation emit closed signal and end model query.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this._closed.emit();
    void this.model.endQuery();
  }

  protected setReplaceInputVisibility(v: boolean): void {
    if (this._showReplace !== v) {
      this._showReplace = v;
      this.update();
    }
  }

  render(): JSX.Element {
    return (
      <SearchOverlay
        caseSensitive={this.model.caseSensitive}
        currentIndex={this.model.currentIndex}
        isReadOnly={this.model.isReadOnly}
        errorMessage={this.model.parsingError}
        filters={this.model.filters}
        filtersDefinition={this.model.filtersDefinition}
        preserveCase={this.model.preserveCase}
        replaceEntryVisible={this._showReplace}
        replaceOptionsSupport={this.model.replaceOptionsSupport}
        replaceText={this.model.replaceText}
        searchText={this.model.searchExpression}
        searchInputRef={this._searchInput}
        totalMatches={this.model.totalMatches}
        translator={this.translator}
        useRegex={this.model.useRegex}
        wholeWords={this.model.wholeWords}
        onCaseSensitiveToggled={() => {
          this.model.caseSensitive = !this.model.caseSensitive;
        }}
        onRegexToggled={() => {
          this.model.useRegex = !this.model.useRegex;
        }}
        onWordToggled={() => {
          this.model.wholeWords = !this.model.wholeWords;
        }}
        onFilterChanged={async (name: string, value: boolean) => {
          await this.model.setFilter(name, value);
        }}
        onHighlightNext={() => {
          void this.model.highlightNext();
        }}
        onHighlightPrevious={() => {
          void this.model.highlightPrevious();
        }}
        onPreserveCaseToggled={() => {
          this.model.preserveCase = !this.model.preserveCase;
        }}
        onSearchChanged={(q: string) => {
          this.model.searchExpression = q;
        }}
        onClose={() => {
          this.close();
        }}
        onReplaceEntryShown={(v: boolean) => {
          this.setReplaceInputVisibility(v);
        }}
        onReplaceChanged={(q: string) => {
          this.model.replaceText = q;
        }}
        onReplaceCurrent={() => {
          void this.model.replaceCurrentMatch();
        }}
        onReplaceAll={() => {
          void this.model.replaceAllMatches();
        }}
      ></SearchOverlay>
    );
  }

  private _searchInput: React.RefObject<HTMLInputElement>;
  private _showReplace = false;
  private _closed = new Signal<this, void>(this);
}
