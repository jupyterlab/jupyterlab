// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IDisplayState } from './interfaces';
import { SearchInstance } from './searchinstance';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Debouncer } from '@jupyterlab/coreutils';
import { Signal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import * as React from 'react';

const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
const OVERLAY_ROW_CLASS = 'jp-DocumentSearch-overlay-row';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const REGEX_BUTTON_CLASS_OFF =
  'jp-DocumentSearch-input-button-off jp-DocumentSearch-regex-button';
const REGEX_BUTTON_CLASS_ON =
  'jp-DocumentSearch-input-button-on jp-DocumentSearch-regex-button';
const CASE_BUTTON_CLASS_OFF =
  'jp-DocumentSearch-input-button-off jp-DocumentSearch-case-button';
const CASE_BUTTON_CLASS_ON =
  'jp-DocumentSearch-input-button-on jp-DocumentSearch-case-button';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_BUTTON_CLASS = 'jp-DocumentSearch-up-button';
const DOWN_BUTTON_CLASS = 'jp-DocumentSearch-down-button';
const CLOSE_BUTTON_CLASS = 'jp-DocumentSearch-close-button';
const REGEX_ERROR_CLASS = 'jp-DocumentSearch-regex-error';
const REPLACE_ENTRY_CLASS = 'jp-DocumentSearch-replace-entry';
const REPLACE_BUTTON_CLASS = 'jp-DocumentSearch-replace-button';
const REPLACE_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-replace-button-wrapper';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';
const REPLACE_TOGGLE_COLLAPSED = 'jp-DocumentSearch-replace-toggle-collapsed';
const REPLACE_TOGGLE_EXPANDED = 'jp-DocumentSearch-replace-toggle-expanded';
const FOCUSED_INPUT = 'jp-DocumentSearch-focused-input';
const TOGGLE_WRAPPER = 'jp-DocumentSearch-toggle-wrapper';
const TOGGLE_PLACEHOLDER = 'jp-DocumentSearch-toggle-placeholder';
const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';

interface ISearchEntryProps {
  onCaseSensitiveToggled: Function;
  onRegexToggled: Function;
  onKeydown: Function;
  onChange: Function;
  onInputFocus: Function;
  onInputBlur: Function;
  inputFocused: boolean;
  caseSensitive: boolean;
  useRegex: boolean;
  searchText: string;
  forceFocus: boolean;
}

interface IReplaceEntryProps {
  onReplaceCurrent: Function;
  onReplaceAll: Function;
  onReplaceKeydown: Function;
  onChange: Function;
  replaceText: string;
}

class SearchEntry extends React.Component<ISearchEntryProps> {
  constructor(props: ISearchEntryProps) {
    super(props);
  }

  /**
   * Focus the input.
   */
  focusInput() {
    (this.refs.searchInputNode as HTMLInputElement).focus();
  }

  componentDidUpdate() {
    if (this.props.forceFocus) {
      this.focusInput();
    }
  }

  render() {
    const caseButtonToggleClass = this.props.caseSensitive
      ? CASE_BUTTON_CLASS_ON
      : CASE_BUTTON_CLASS_OFF;
    const regexButtonToggleClass = this.props.useRegex
      ? REGEX_BUTTON_CLASS_ON
      : REGEX_BUTTON_CLASS_OFF;

    const wrapperClass = `${INPUT_WRAPPER_CLASS} ${
      this.props.inputFocused ? FOCUSED_INPUT : ''
    }`;

    return (
      <div className={wrapperClass}>
        <input
          placeholder={this.props.searchText ? null : 'Find'}
          className={INPUT_CLASS}
          value={this.props.searchText}
          onChange={e => this.props.onChange(e)}
          onKeyDown={e => this.props.onKeydown(e)}
          tabIndex={2}
          onFocus={e => this.props.onInputFocus()}
          onBlur={e => this.props.onInputBlur()}
          ref="searchInputNode"
        />
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onCaseSensitiveToggled()}
          tabIndex={4}
        >
          <span
            className={`${caseButtonToggleClass} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          />
        </button>
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onRegexToggled()}
          tabIndex={5}
        >
          <span
            className={`${regexButtonToggleClass} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          />
        </button>
      </div>
    );
  }
}

class ReplaceEntry extends React.Component<IReplaceEntryProps> {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <div className={REPLACE_WRAPPER_CLASS}>
        <input
          placeholder={this.props.replaceText ? null : 'Replace'}
          className={REPLACE_ENTRY_CLASS}
          value={this.props.replaceText}
          onKeyDown={e => this.props.onReplaceKeydown(e)}
          onChange={e => this.props.onChange(e)}
          tabIndex={3}
          ref="replaceInputNode"
        />
        <button
          className={REPLACE_BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onReplaceCurrent()}
          tabIndex={9}
        >
          <span
            className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          >
            Replace
          </span>
        </button>
        <button
          className={REPLACE_BUTTON_WRAPPER_CLASS}
          tabIndex={10}
          onClick={() => this.props.onReplaceAll()}
        >
          <span
            className={`${REPLACE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          >
            Replace All
          </span>
        </button>
      </div>
    );
  }
}

interface IUpDownProps {
  onHighlightPrevious: Function;
  onHightlightNext: Function;
}

function UpDownButtons(props: IUpDownProps) {
  return (
    <div className={UP_DOWN_BUTTON_WRAPPER_CLASS}>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHighlightPrevious()}
        tabIndex={6}
      >
        <span
          className={`${UP_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
          tabIndex={-1}
        />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHightlightNext()}
        tabIndex={7}
      >
        <span
          className={`${DOWN_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
          tabIndex={-1}
        />
      </button>
    </div>
  );
}

interface ISearchIndexProps {
  currentIndex: number;
  totalMatches: number;
}

function SearchIndices(props: ISearchIndexProps) {
  return (
    <div className={INDEX_COUNTER_CLASS}>
      {props.totalMatches === 0
        ? '-/-'
        : `${props.currentIndex + 1}/${props.totalMatches}`}
    </div>
  );
}

interface ISearchOverlayProps {
  overlayState: IDisplayState;
  onCaseSensitiveToggled: Function;
  onRegexToggled: Function;
  onHightlightNext: Function;
  onHighlightPrevious: Function;
  onStartQuery: Function;
  onEndSearch: Function;
  onReplaceCurrent: Function;
  onReplaceAll: Function;
  isReadOnly: boolean;
}

class SearchOverlay extends React.Component<
  ISearchOverlayProps,
  IDisplayState
> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.state = props.overlayState;
  }

  componentDidMount() {
    if (this.state.searchText) {
      this._executeSearch(true, this.state.searchText);
    }
  }

  private _onSearchChange(event: React.ChangeEvent) {
    const searchText = (event.target as HTMLInputElement).value;
    this.setState({ searchText: searchText });
    void this._debouncedStartSearch.invoke();
  }

  private _onReplaceChange(event: React.ChangeEvent) {
    this.setState({ replaceText: (event.target as HTMLInputElement).value });
  }

  private _onSearchKeydown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
      this._executeSearch(!event.shiftKey);
    } else if (event.keyCode === 27) {
      event.preventDefault();
      event.stopPropagation();
      this._onClose();
    }
  }

  private _onReplaceKeydown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onReplaceCurrent(this.state.replaceText);
    }
  }

  private _executeSearch(goForward: boolean, searchText?: string) {
    // execute search!
    let query;
    const input = searchText ? searchText : this.state.searchText;
    try {
      query = Private.parseQuery(
        input,
        this.props.overlayState.caseSensitive,
        this.props.overlayState.useRegex
      );
      this.setState({ errorMessage: '' });
    } catch (e) {
      this.setState({ errorMessage: e.message });
      return;
    }

    if (Private.regexEqual(this.props.overlayState.query, query)) {
      if (goForward) {
        this.props.onHightlightNext();
      } else {
        this.props.onHighlightPrevious();
      }
      return;
    }

    this.props.onStartQuery(query);
  }

  private _onClose() {
    // Clean up and close widget.
    this.props.onEndSearch();
    this._debouncedStartSearch.dispose();
  }

  private _onReplaceToggled() {
    this.setState({
      replaceEntryShown: !this.state.replaceEntryShown
    });
  }

  private _onSearchInputFocus() {
    if (!this.state.searchInputFocused) {
      this.setState({ searchInputFocused: true });
    }
  }

  private _onSearchInputBlur() {
    if (this.state.searchInputFocused) {
      this.setState({ searchInputFocused: false });
    }
  }

  render() {
    return [
      <div className={OVERLAY_ROW_CLASS} key={0}>
        {this.props.isReadOnly ? (
          <div className={TOGGLE_PLACEHOLDER} />
        ) : (
          <button
            className={TOGGLE_WRAPPER}
            onClick={() => this._onReplaceToggled()}
            tabIndex={1}
          >
            <span
              className={`${
                this.state.replaceEntryShown
                  ? REPLACE_TOGGLE_EXPANDED
                  : REPLACE_TOGGLE_COLLAPSED
              } ${BUTTON_CONTENT_CLASS}`}
              tabIndex={-1}
            />
          </button>
        )}
        <SearchEntry
          useRegex={this.props.overlayState.useRegex}
          caseSensitive={this.props.overlayState.caseSensitive}
          onCaseSensitiveToggled={() => {
            this.props.onCaseSensitiveToggled();
            this._executeSearch(true);
          }}
          onRegexToggled={() => {
            this.props.onRegexToggled();
            this._executeSearch(true);
          }}
          onKeydown={(e: KeyboardEvent) => this._onSearchKeydown(e)}
          onChange={(e: React.ChangeEvent) => this._onSearchChange(e)}
          onInputFocus={this._onSearchInputFocus.bind(this)}
          onInputBlur={this._onSearchInputBlur.bind(this)}
          inputFocused={this.state.searchInputFocused}
          searchText={this.state.searchText}
          forceFocus={this.props.overlayState.forceFocus}
        />
        <SearchIndices
          currentIndex={this.props.overlayState.currentIndex}
          totalMatches={this.props.overlayState.totalMatches}
        />
        <UpDownButtons
          onHighlightPrevious={() => this._executeSearch(false)}
          onHightlightNext={() => this._executeSearch(true)}
        />
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this._onClose()}
          tabIndex={8}
        >
          <span
            className={`${CLOSE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          />
        </button>
      </div>,
      <div className={OVERLAY_ROW_CLASS} key={1}>
        {!this.props.isReadOnly && this.state.replaceEntryShown ? (
          <ReplaceEntry
            onReplaceKeydown={(e: KeyboardEvent) => this._onReplaceKeydown(e)}
            onChange={(e: React.ChangeEvent) => this._onReplaceChange(e)}
            onReplaceCurrent={() =>
              this.props.onReplaceCurrent(this.state.replaceText)
            }
            onReplaceAll={() => this.props.onReplaceAll(this.state.replaceText)}
            replaceText={this.state.replaceText}
            ref="replaceEntry"
          />
        ) : null}
      </div>,
      <div
        className={REGEX_ERROR_CLASS}
        hidden={this.state.errorMessage && this.state.errorMessage.length === 0}
        key={3}
      >
        {this.state.errorMessage}
      </div>
    ];
  }

  private _debouncedStartSearch = new Debouncer(() => {
    this._executeSearch(true, this.state.searchText);
  }, 100);
}

export function createSearchOverlay(
  options: createSearchOverlay.IOptions
): Widget {
  const {
    widgetChanged,
    overlayState,
    onCaseSensitiveToggled,
    onRegexToggled,
    onHightlightNext,
    onHighlightPrevious,
    onStartQuery,
    onReplaceCurrent,
    onReplaceAll,
    onEndSearch,
    isReadOnly
  } = options;
  const widget = ReactWidget.create(
    <UseSignal signal={widgetChanged} initialArgs={overlayState}>
      {(_, args) => {
        return (
          <SearchOverlay
            onCaseSensitiveToggled={onCaseSensitiveToggled}
            onRegexToggled={onRegexToggled}
            onHightlightNext={onHightlightNext}
            onHighlightPrevious={onHighlightPrevious}
            onStartQuery={onStartQuery}
            onEndSearch={onEndSearch}
            onReplaceCurrent={onReplaceCurrent}
            onReplaceAll={onReplaceAll}
            overlayState={args}
            isReadOnly={isReadOnly}
          />
        );
      }}
    </UseSignal>
  );
  widget.addClass(OVERLAY_CLASS);
  return widget;
}

namespace createSearchOverlay {
  export interface IOptions {
    widgetChanged: Signal<SearchInstance, IDisplayState>;
    overlayState: IDisplayState;
    onCaseSensitiveToggled: Function;
    onRegexToggled: Function;
    onHightlightNext: Function;
    onHighlightPrevious: Function;
    onStartQuery: Function;
    onEndSearch: Function;
    onReplaceCurrent: Function;
    onReplaceAll: Function;
    isReadOnly: boolean;
  }
}

namespace Private {
  export function parseQuery(
    queryString: string,
    caseSensitive: boolean,
    regex: boolean
  ) {
    const flag = caseSensitive ? 'g' : 'gi';
    // escape regex characters in query if its a string search
    const queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    let ret;
    ret = new RegExp(queryText, flag);
    if (ret.test('')) {
      ret = /x^/;
    }
    return ret;
  }

  export function regexEqual(a: RegExp, b: RegExp) {
    if (!a || !b) {
      return false;
    }
    return (
      a.source === b.source &&
      a.global === b.global &&
      a.ignoreCase === b.ignoreCase &&
      a.multiline === b.multiline
    );
  }
}
