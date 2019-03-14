// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IDisplayState } from './interfaces';
import { SearchInstance } from './searchinstance';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
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
const REPLACE_CURRENT_BUTTON_CLASS = 'jp-DocumentSearch-replace-current-button';
const REPLACE_ALL_BUTTON_CLASS = 'jp-DocumentSearch-replace-all-button';
const REPLACE_WRAPPER_CLASS = 'jp-DocumentSearch-replace-wrapper-class';

const BUTTON_CONTENT_CLASS = 'jp-DocumentSearch-button-content';
const BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-button-wrapper';

interface ISearchEntryProps {
  onCaseSensitiveToggled: Function;
  onRegexToggled: Function;
  onKeydown: Function;
  onChange: Function;
  caseSensitive: boolean;
  useRegex: boolean;
  inputText: string;
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

    return (
      <div className={INPUT_WRAPPER_CLASS}>
        <input
          placeholder={this.props.inputText ? null : 'SEARCH'}
          className={INPUT_CLASS}
          value={this.props.inputText}
          onChange={e => this.props.onChange(e)}
          onKeyDown={e => this.props.onKeydown(e)}
          tabIndex={1}
          ref="searchInputNode"
        />
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onCaseSensitiveToggled()}
          tabIndex={2}
        >
          <span
            className={`${caseButtonToggleClass} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          />
        </button>
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this.props.onRegexToggled()}
          tabIndex={3}
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
          placeholder={this.props.replaceText ? null : 'REPLACE'}
          className={REPLACE_ENTRY_CLASS}
          value={this.props.replaceText}
          onKeyDown={e => this.props.onReplaceKeydown(e)}
          onChange={e => this.props.onChange(e)}
        />
        <button
          className={REPLACE_CURRENT_BUTTON_CLASS}
          onClick={() => this.props.onReplaceCurrent()}
        >
          Next
        </button>
        <button
          className={REPLACE_ALL_BUTTON_CLASS}
          onClick={() => this.props.onReplaceAll()}
        >
          All
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
        tabIndex={4}
      >
        <span
          className={`${UP_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
          tabIndex={-1}
        />
      </button>
      <button
        className={BUTTON_WRAPPER_CLASS}
        onClick={() => props.onHightlightNext()}
        tabIndex={5}
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
}

class SearchOverlay extends React.Component<
  ISearchOverlayProps,
  IDisplayState
> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.state = props.overlayState;
  }

  private _onSearchChange(event: React.ChangeEvent) {
    const inputText = (event.target as HTMLInputElement).value;
    this.setState({ inputText });
    console.log('search change, calling debounced startSearch');
    this._debouncedStartSearch(true, inputText);
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
      this.props.onEndSearch();
    }
  }

  private _onReplaceKeydown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onReplaceCurrent(this.state.replaceText);
    }
  }

  private _executeSearch(goForward: boolean, inputText?: string) {
    // execute search!
    let query;
    const input = inputText ? inputText : this.state.inputText;
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
    // clean up and close widget
    this.props.onEndSearch();
  }

  private _debounce(func: Function, wait: number) {
    const context = this;
    let timeout: number;
    return function(...args: any[]) {
      const later = function() {
        timeout = null;
        return func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  private _debouncedStartSearch = this._debounce(
    this._executeSearch.bind(this),
    100
  );

  render() {
    return [
      <div className={OVERLAY_ROW_CLASS} key={0}>
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
          inputText={this.state.inputText}
          forceFocus={this.props.overlayState.forceFocus}
          key={0}
        />
        <SearchIndices
          currentIndex={this.props.overlayState.currentIndex}
          totalMatches={this.props.overlayState.totalMatches}
          key={1}
        />
        <UpDownButtons
          onHighlightPrevious={() => this._executeSearch(false)}
          onHightlightNext={() => this._executeSearch(true)}
          key={2}
        />
        <button
          className={BUTTON_WRAPPER_CLASS}
          onClick={() => this._onClose()}
          tabIndex={6}
          key={3}
        >
          <span
            className={`${CLOSE_BUTTON_CLASS} ${BUTTON_CONTENT_CLASS}`}
            tabIndex={-1}
          />
        </button>
      </div>,
      <div className={OVERLAY_ROW_CLASS} key={1}>
        <ReplaceEntry
          onReplaceKeydown={(e: KeyboardEvent) => this._onReplaceKeydown(e)}
          onChange={(e: React.ChangeEvent) => this._onReplaceChange(e)}
          onReplaceCurrent={() =>
            this.props.onReplaceCurrent(this.state.replaceText)
          }
          onReplaceAll={() => this.props.onReplaceAll(this.state.replaceText)}
          replaceText={this.state.replaceText}
        />
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
    onEndSearch
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
