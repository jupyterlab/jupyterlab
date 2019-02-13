// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IDisplayState } from './interfaces';
import { SearchInstance } from './searchinstance';

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Signal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import * as React from 'react';

const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
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
          ref="searchInputNode"
        />
        <button
          className={caseButtonToggleClass}
          onClick={() => this.props.onCaseSensitiveToggled()}
        />
        <button
          className={regexButtonToggleClass}
          onClick={() => this.props.onRegexToggled()}
        />
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
        className={UP_BUTTON_CLASS}
        onClick={() => props.onHighlightPrevious()}
      />
      <button
        className={DOWN_BUTTON_CLASS}
        onClick={() => props.onHightlightNext()}
      />
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
}

class SearchOverlay extends React.Component<
  ISearchOverlayProps,
  IDisplayState
> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.state = props.overlayState;
  }

  private _onChange(event: React.ChangeEvent) {
    this.setState({ inputText: (event.target as HTMLInputElement).value });
  }

  private _onKeydown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
      this._executeSearch(!event.shiftKey);
    }
    if (event.keyCode === 27) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onEndSearch();
    }
  }

  private _executeSearch(goForward: boolean) {
    // execute search!
    let query;
    try {
      query = Private.parseQuery(
        this.state.inputText,
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

  private onClose() {
    // clean up and close widget
    this.props.onEndSearch();
  }

  render() {
    return [
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
        onKeydown={(e: KeyboardEvent) => this._onKeydown(e)}
        onChange={(e: React.ChangeEvent) => this._onChange(e)}
        inputText={this.state.inputText}
        forceFocus={this.props.overlayState.forceFocus}
        key={0}
      />,
      <SearchIndices
        currentIndex={this.props.overlayState.currentIndex}
        totalMatches={this.props.overlayState.totalMatches}
        key={1}
      />,
      <UpDownButtons
        onHighlightPrevious={() => this._executeSearch(false)}
        onHightlightNext={() => this._executeSearch(true)}
        key={2}
      />,
      <div
        className={CLOSE_BUTTON_CLASS}
        onClick={() => this.onClose()}
        key={3}
      />,
      <div
        className={REGEX_ERROR_CLASS}
        hidden={this.state.errorMessage && this.state.errorMessage.length === 0}
        key={4}
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
