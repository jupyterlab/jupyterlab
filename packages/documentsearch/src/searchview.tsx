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
  filterDotIcon,
  filterIcon,
  regexIcon,
  VDomRenderer,
  wordIcon
} from '@jupyterlab/ui-components';
import { ISignal, Signal } from '@lumino/signaling';
import { CommandRegistry } from '@lumino/commands';
import { UseSignal } from '@jupyterlab/apputils';
import { Message } from '@lumino/messaging';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { SearchDocumentModel } from './searchmodel';
import { IFilter, IFilters, IReplaceOptionsSupport } from './tokens';

const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
const OVERLAY_ROW_CLASS = 'jp-DocumentSearch-overlay-row';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_LABEL_CLASS = 'jp-DocumentSearch-input-label';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const INPUT_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off';
const INPUT_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_DOWN_BUTTON_CLASS = 'jp-DocumentSearch-up-down-button';
const FILTER_BUTTON_CLASS = 'jp-DocumentSearch-filter-button';
const FILTER_BUTTON_ENABLED_CLASS = 'jp-DocumentSearch-filter-button-enabled';
const REGEX_ERROR_CLASS = 'jp-DocumentSearch-regex-error';
const SEARCH_OPTIONS_CLASS = 'jp-DocumentSearch-search-options';
const SEARCH_FILTER_DISABLED_CLASS = 'jp-DocumentSearch-search-filter-disabled';
const SEARCH_FILTER_CLASS = 'jp-DocumentSearch-search-filter';
const REPLACE_BUTTON_CLASS = 'jp-DocumentSearch-replace-button';
const REPLACE_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-replace-button-wrapper';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';
const REPLACE_TOGGLE_CLASS = 'jp-DocumentSearch-replace-toggle';
const TOGGLE_WRAPPER = 'jp-DocumentSearch-toggle-wrapper';
const TOGGLE_PLACEHOLDER = 'jp-DocumentSearch-toggle-placeholder';
const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';
const SPACER_CLASS = 'jp-DocumentSearch-spacer';

interface ISearchInputProps {
  placeholder: string;
  title: string;
  initialValue: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  autoFocus: boolean;
  autoUpdate: boolean;
  lastSearchText?: string;
}

/**
 * Provides information about keybindings for display in tooltips.
 */
export interface ISearchKeyBindings {
  readonly next?: CommandRegistry.IKeyBinding;
  readonly previous?: CommandRegistry.IKeyBinding;
  readonly toggleSearchInSelection?: CommandRegistry.IKeyBinding;
}

function SearchInput(props: ISearchInputProps): JSX.Element {
  const [rows, setRows] = useState<number>(1);

  const updateDimensions = useCallback(
    (event?: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const element = event
        ? (event.target as HTMLTextAreaElement)
        : props.inputRef?.current;
      if (element) {
        const split = element.value.split(/\n/);
        // use the longest string out of all lines to compute the width.
        let longest = split.reduce((a, b) => (a.length > b.length ? a : b), '');
        if (element.parentNode && element.parentNode instanceof HTMLElement) {
          element.parentNode.dataset.value = longest;
        }
        setRows(split.length);
      }
    },
    []
  );

  useEffect(() => {
    // For large part, `focusSearchInput()` is responsible for focusing and
    // selecting the search input, however when `initialValue` changes, this
    // triggers React re-render to update `defaultValue` (implemented via `key`)
    // which means that `focusSearchInput` is no longer effective as it has
    // already fired before the re-render, hence we use this conditional effect.
    props.inputRef?.current?.select();
    // After any change to initial value we also want to update rows in case if
    // multi-line text was selected.
    updateDimensions();
  }, [props.initialValue]);

  return (
    <label className={INPUT_LABEL_CLASS}>
      <textarea
        onChange={e => {
          props.onChange(e);
          updateDimensions(e);
        }}
        onKeyDown={e => {
          props.onKeyDown(e);
          updateDimensions(e);
        }}
        rows={rows}
        placeholder={props.placeholder}
        className={INPUT_CLASS}
        // Setting a key ensures that `defaultValue` will become updated
        // when the initial value changes.
        key={props.autoUpdate ? props.initialValue : null}
        tabIndex={0}
        ref={props.inputRef}
        title={props.title}
        defaultValue={props.initialValue || props.lastSearchText}
        autoFocus={props.autoFocus}
      ></textarea>
    </label>
  );
}

interface ISearchEntryProps {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onCaseSensitiveToggled: () => void;
  onRegexToggled: () => void;
  onWordToggled: () => void;
  onKeydown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  caseSensitive: boolean;
  useRegex: boolean;
  wholeWords: boolean;
  initialSearchText: string;
  lastSearchText: string;
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
      <SearchInput
        placeholder={trans.__('Find')}
        onChange={e => props.onChange(e)}
        onKeyDown={e => props.onKeydown(e)}
        inputRef={props.inputRef}
        initialValue={props.initialSearchText}
        lastSearchText={props.lastSearchText}
        title={trans.__('Find')}
        autoFocus={true}
        autoUpdate={true}
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
  onReplaceKeydown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
        <SearchInput
          placeholder={trans.__('Replace')}
          initialValue={props.replaceText ?? ''}
          onKeyDown={e => props.onReplaceKeydown(e)}
          onChange={e => props.onChange(e)}
          title={trans.__('Replace')}
          autoFocus={false}
          autoUpdate={false}
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
  keyBindings?: ISearchKeyBindings;
  onHighlightPrevious: () => void;
  onHighlightNext: () => void;
  trans: TranslationBundle;
  isEnabled: boolean;
}

function UpDownButtons(props: IUpDownProps) {
  const nextBinding = props.keyBindings?.next;
  const prevBinding = props.keyBindings?.previous;

  const nextKeys = nextBinding
    ? CommandRegistry.formatKeystroke(nextBinding.keys)
    : '';
  const prevKeys = prevBinding
    ? CommandRegistry.formatKeystroke(prevBinding.keys)
    : '';

  const prevShortcut = prevKeys ? ` (${prevKeys})` : '';
  const nextShortcut = nextKeys ? ` (${nextKeys})` : '';

  const upButton = (
    <button
      className={BUTTON_WRAPPER_CLASS}
      onClick={() => (props.isEnabled ? props.onHighlightPrevious() : false)}
      tabIndex={0}
      title={`${props.trans.__('Previous Match')}${prevShortcut}`}
      disabled={!props.isEnabled}
    >
      <caretUpEmptyThinIcon.react
        className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
        tag="span"
      />
    </button>
  );

  const downButton = (
    <button
      className={BUTTON_WRAPPER_CLASS}
      onClick={() => (props.isEnabled ? props.onHighlightNext() : false)}
      tabIndex={0}
      title={`${props.trans.__('Next Match')}${nextShortcut}`}
      disabled={!props.isEnabled}
    >
      <caretDownEmptyThinIcon.react
        className={classes(UP_DOWN_BUTTON_CLASS, BUTTON_CONTENT_CLASS)}
        tag="span"
      />
    </button>
  );

  return (
    <div className={UP_DOWN_BUTTON_WRAPPER_CLASS}>
      {upButton}
      {downButton}
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
  visible: boolean;
  toggleVisible: () => void;
  anyEnabled: boolean;
  trans: TranslationBundle;
}

function FilterToggle(props: IFilterToggleProps): JSX.Element {
  let className = `${FILTER_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`;
  if (props.visible) {
    className = `${className} ${FILTER_BUTTON_ENABLED_CLASS}`;
  }

  const icon = props.anyEnabled ? filterDotIcon : filterIcon;

  return (
    <button
      className={BUTTON_WRAPPER_CLASS}
      onClick={() => props.toggleVisible()}
      tabIndex={0}
      title={
        props.visible
          ? props.trans.__('Hide Search Filters')
          : props.trans.__('Show Search Filters')
      }
    >
      <icon.react className={className} tag="span" height="20px" width="20px" />
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
      className={
        props.isEnabled
          ? SEARCH_FILTER_CLASS
          : `${SEARCH_FILTER_CLASS} ${SEARCH_FILTER_DISABLED_CLASS}`
      }
      title={props.description}
    >
      <input
        type="checkbox"
        className="jp-mod-styled"
        disabled={!props.isEnabled}
        checked={props.value}
        onChange={props.onToggle}
      />
      {props.title}
    </label>
  );
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
   * Whether the replace entry row is visible.
   */
  replaceEntryVisible: boolean;
  /**
   * Whether the filters grid is visible.
   */
  filtersVisible: boolean;
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
  initialSearchText: string;
  /**
   * The last searched query used to prepopulate the search field when the widget is reopened.
   */
  lastSearchText: string;
  /**
   * Search input reference.
   */
  searchInputRef: React.RefObject<HTMLTextAreaElement>;
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
   * Callback on filters grid visibility change.
   */
  onFiltersVisibilityChanged: (v: boolean) => void;
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
  /**
   * Provides information about keybindings for display.
   */
  keyBindings?: ISearchKeyBindings;
}

class SearchOverlay extends React.Component<ISearchOverlayProps> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.translator = props.translator || nullTranslator;
  }

  private _onSearchChange(event: React.ChangeEvent) {
    const searchText = (event.target as HTMLTextAreaElement).value;
    this.props.onSearchChanged(searchText);
  }

  private _onSearchKeydown(event: React.KeyboardEvent) {
    if (event.keyCode === 13) {
      // Enter pressed
      event.stopPropagation();
      event.preventDefault();
      if (event.ctrlKey) {
        const textarea = event.target as HTMLTextAreaElement;
        this._insertNewLine(textarea);
        this.props.onSearchChanged(textarea.value);
      } else {
        event.shiftKey
          ? this.props.onHighlightPrevious()
          : this.props.onHighlightNext();
      }
    }
  }

  private _onReplaceKeydown(event: React.KeyboardEvent) {
    if (event.keyCode === 13) {
      // Enter pressed
      event.stopPropagation();
      event.preventDefault();
      if (event.ctrlKey) {
        this._insertNewLine(event.target as HTMLTextAreaElement);
      } else {
        this.props.onReplaceCurrent();
      }
    }
  }

  private _insertNewLine(textarea: HTMLTextAreaElement) {
    const [start, end] = [textarea.selectionStart, textarea.selectionEnd];
    textarea.setRangeText('\n', start, end, 'end');
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

  private _toggleFiltersVisibility() {
    this.props.onFiltersVisibilityChanged(!this.props.filtersVisible);
  }

  render() {
    const trans = this.translator.load('jupyterlab');
    const showReplace =
      !this.props.isReadOnly && this.props.replaceEntryVisible;
    const filters = this.props.filtersDefinition;

    const hasFilters = Object.keys(filters).length > 0;
    const filterToggle = hasFilters ? (
      <FilterToggle
        visible={this.props.filtersVisible}
        anyEnabled={Object.keys(filters).some(name => {
          const filter = filters[name];
          return this.props.filters[name] ?? filter.default;
        })}
        toggleVisible={() => this._toggleFiltersVisibility()}
        trans={trans}
      />
    ) : null;

    const selectionBinding = this.props.keyBindings?.toggleSearchInSelection;
    const selectionKeys = selectionBinding
      ? CommandRegistry.formatKeystroke(selectionBinding.keys)
      : '';

    const selectionKeyHint = selectionKeys ? ` (${selectionKeys})` : '';

    const filter = hasFilters ? (
      <div className={SEARCH_OPTIONS_CLASS}>
        {Object.keys(filters).map(name => {
          const filter = filters[name];

          const isEnabled = !showReplace || filter.supportReplace;
          // Show an alternate description, if one exists, when a filter is disabled in replace mode.
          const description = isEnabled
            ? filter.description
            : filter.disabledDescription ?? filter.description;
          return (
            <FilterSelection
              key={name}
              title={filter.title}
              description={
                description + (name == 'selection' ? selectionKeyHint : '')
              }
              isEnabled={isEnabled}
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
              title={
                showReplace
                  ? trans.__('Hide Replace')
                  : trans.__('Show Replace')
              }
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
            onKeydown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
              this._onSearchKeydown(e)
            }
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              this._onSearchChange(e)
            }
            initialSearchText={this.props.initialSearchText}
            lastSearchText={this.props.lastSearchText}
            translator={this.translator}
          />
          {filterToggle}
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
            keyBindings={this.props.keyBindings}
            isEnabled={!!this.props.searchInputRef.current?.value}
          />
          <button
            className={BUTTON_WRAPPER_CLASS}
            onClick={() => this._onClose()}
            tabIndex={0}
            title={trans.__('Close Search Box')}
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
                    (e.target as HTMLTextAreaElement).value
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
            </>
          ) : null}
        </div>
        {this.props.filtersVisible ? filter : null}
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
   * @param keyBindings Search keybindings
   *
   */
  constructor(
    model: SearchDocumentModel,
    protected translator?: ITranslator,
    keyBindings?: ISearchKeyBindings
  ) {
    super(model);
    this.addClass(OVERLAY_CLASS);
    this._searchInput = React.createRef<HTMLTextAreaElement>();
    this._keyBindings = keyBindings;
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
   * Set the initial search text.
   */
  setSearchText(search: string): void {
    this.model.initialQuery = search;
    // Only set the new search text to search expression if there is any
    // to avoid nullifying the one that was remembered from last time.
    if (search) {
      this.model.searchExpression = search;
    }
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

  protected setFiltersVisibility(v: boolean): void {
    if (this._showFilters !== v) {
      this._showFilters = v;
      this.update();
    }
  }

  render(): JSX.Element {
    return this.model.filtersDefinitionChanged ? (
      <UseSignal signal={this.model.filtersDefinitionChanged}>
        {() => this._renderOverlay()}
      </UseSignal>
    ) : (
      this._renderOverlay()
    );
  }

  private _renderOverlay() {
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
        filtersVisible={this._showFilters}
        replaceOptionsSupport={this.model.replaceOptionsSupport}
        replaceText={this.model.replaceText}
        initialSearchText={this.model.initialQuery}
        lastSearchText={this.model.searchExpression}
        searchInputRef={
          this._searchInput as React.RefObject<HTMLTextAreaElement>
        }
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
        onFiltersVisibilityChanged={(v: boolean) => {
          this.setFiltersVisibility(v);
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
        keyBindings={this._keyBindings}
      ></SearchOverlay>
    );
  }

  private _searchInput: React.RefObject<HTMLTextAreaElement>;
  private _showReplace = false;
  private _showFilters = false;
  private _closed = new Signal<this, void>(this);
  private _keyBindings?: ISearchKeyBindings;
}
