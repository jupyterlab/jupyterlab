import * as React from 'react';

import '../style/index.css';
import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Signal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import { Executor } from './executor';
import { IDisplayUpdate } from '.';

const OVERLAY_CLASS = 'jp-DocumentSearch-overlay';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const INPUT_WRAPPER_CLASS = 'jp-DocumentSearch-input-wrapper';
const INPUT_BUTTON_CLASS_OFF = 'jp-DocumentSearch-input-button-off';
const INPUT_BUTTON_CLASS_ON = 'jp-DocumentSearch-input-button-on';
const INDEX_COUNTER_CLASS = 'jp-DocumentSearch-index-counter';
const UP_DOWN_BUTTON_WRAPPER_CLASS = 'jp-DocumentSearch-up-down-wrapper';
const UP_DOWN_BUTTON_CLASS = 'jp-DocumentSearch-up-down-button-class';
const CLOSE_BUTTON_CLASS = 'jp-DocumentSearch-close-button';

interface ISearchEntryProps {
  onCaseSensitiveToggled: Function;
  onRegexToggled: Function;
  onKeydown: Function;
  onChange: Function;
  caseSensitive: boolean;
  useRegex: boolean;
  inputText: string;
}

class SearchEntry extends React.Component<ISearchEntryProps> {
  constructor(props: ISearchEntryProps) {
    super(props);
  }

  componentDidMount() {
    this.focusInput();
  }

  focusInput() {
    (this.refs.searchInputNode as HTMLInputElement).focus();
  }

  render() {
    const caseButtonToggleClass = this.props.caseSensitive
      ? INPUT_BUTTON_CLASS_ON
      : INPUT_BUTTON_CLASS_OFF;
    const regexButtonToggleClass = this.props.useRegex
      ? INPUT_BUTTON_CLASS_ON
      : INPUT_BUTTON_CLASS_OFF;

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
          className={`${caseButtonToggleClass}`}
          onClick={() => this.props.onCaseSensitiveToggled()}
        >
          A<sup>a</sup>
        </button>
        <button
          className={`${regexButtonToggleClass}`}
          onClick={() => this.props.onRegexToggled()}
        >
          .*
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
        className={UP_DOWN_BUTTON_CLASS}
        onClick={() => props.onHighlightPrevious()}
      >
        ^
      </button>
      <button
        className={UP_DOWN_BUTTON_CLASS}
        onClick={() => props.onHightlightNext()}
      >
        v
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
    <>
      <label className={INDEX_COUNTER_CLASS}>
        {props.totalMatches === 0
          ? '-/-'
          : `${props.currentIndex + 1}/${props.totalMatches}`}
      </label>
    </>
  );
}

interface ISearchOverlayProps {
  overlayState: IDisplayUpdate;
  onCaseSensitiveToggled: Function;
  onRegexToggled: Function;
  onHightlightNext: Function;
  onHighlightPrevious: Function;
  onStartSearch: Function;
  onEndSearch: Function;
}

class SearchOverlay extends React.Component<
  ISearchOverlayProps,
  IDisplayUpdate
> {
  constructor(props: ISearchOverlayProps) {
    super(props);
    this.state = props.overlayState;
  }

  private onChange(event: React.ChangeEvent) {
    this.setState({ inputText: (event.target as HTMLInputElement).value });
  }

  private onKeydown(event: KeyboardEvent) {
    if (event.keyCode !== 13) {
      return;
    }
    // execute search!
    const query: RegExp = Private.parseQuery(
      this.state.inputText,
      this.props.overlayState.caseSensitive,
      this.props.overlayState.useRegex
    );
    if (!query) {
      // display error! WAS TODO
    }
    if (query.source.length === 0) {
      return;
    }

    if (Private.regexEqual(this.props.overlayState.lastQuery, query)) {
      if (event.shiftKey) {
        this.props.onHighlightPrevious();
      } else {
        this.props.onHightlightNext();
      }
      return;
    }

    this.props.onStartSearch(query);
  }

  private onClose() {
    // clean up and close widget
    this.props.onEndSearch();
  }

  render() {
    return (
      <div>
        <SearchEntry
          useRegex={this.props.overlayState.useRegex}
          caseSensitive={this.props.overlayState.caseSensitive}
          onCaseSensitiveToggled={() => this.props.onCaseSensitiveToggled()}
          onRegexToggled={() => this.props.onRegexToggled()}
          onKeydown={(e: KeyboardEvent) => this.onKeydown(e)}
          onChange={(e: React.ChangeEvent) => this.onChange(e)}
          inputText={this.state.inputText}
        />
        <SearchIndices
          currentIndex={this.props.overlayState.currentIndex}
          totalMatches={this.props.overlayState.totalMatches}
        />
        <UpDownButtons
          onHighlightPrevious={() => this.props.onHighlightPrevious()}
          onHightlightNext={() => this.props.onHightlightNext()}
        />
        <div className={CLOSE_BUTTON_CLASS} onClick={() => this.onClose()} />
      </div>
    );
  }
}

export function createSearchOverlay(
  wigdetChanged: Signal<Executor, IDisplayUpdate>,
  overlayState: IDisplayUpdate,
  onCaseSensitiveToggled: Function,
  onRegexToggled: Function,
  onHightlightNext: Function,
  onHighlightPrevious: Function,
  onStartSearch: Function,
  onEndSearch: Function
): Widget {
  // const onKeydown = (event: KeyboardEvent) => {
  //   if (event.keyCode === 13) {
  //     // execute search!
  //     const query: RegExp = Private.parseQuery(
  //       overlayState.inputText,
  //       overlayState.caseSensitive,
  //       overlayState.useRegex
  //     );
  //     if (!query) {
  //       // display error!
  //     }
  //     if (query.source.length === 0) {
  //       return;
  //     }

  //     if (Private.regexEqual(overlayState.lastQuery, query)) {
  //       if (event.shiftKey) {
  //         onHighlightPrevious();
  //       } else {
  //         onHightlightNext();
  //       }
  //       return;
  //     }

  //     onStartSearch(query);
  //   }
  // };
  // const onChange = (event: React.ChangeEvent) => {
  //   overlayState.inputText = (event.target as HTMLInputElement).value;
  //   wigdetChanged.emit(overlayState);
  // };
  // const onClose = () => {
  //   // clean up and close widget
  //   onEndSearch();
  // };
  const widget = ReactWidget.create(
    <UseSignal signal={wigdetChanged} initialArgs={overlayState}>
      {(sender, args) => {
        return (
          <SearchOverlay
            onCaseSensitiveToggled={onCaseSensitiveToggled}
            onRegexToggled={onRegexToggled}
            onHightlightNext={onHightlightNext}
            onHighlightPrevious={onHighlightPrevious}
            onStartSearch={onStartSearch}
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
/*
<div>
          <SearchEntry
            useRegex={args.useRegex}
            caseSensitive={args.caseSensitive}
            onCaseSensitiveToggled={onCaseSensitiveToggled}
            onRegexToggled={onRegexToggled}
            onKeydown={onKeydown}
            onChange={onChange}
            inputText={args.inputText}
          />
          <SearchIndices
            currentIndex={args.currentIndex}
            totalMatches={args.totalMatches}
          />
          <UpDownButtons
            onHighlightPrevious={onHighlightPrevious}
            onHightlightNext={onHightlightNext}
          />
          <div className={CLOSE_BUTTON_CLASS} onClick={onClose} />
        </div>
*/
namespace Private {
  export function parseQuery(
    queryString: string,
    caseSensitive: boolean,
    regex: boolean
  ) {
    const flag = caseSensitive ? 'g' : 'gi';
    const queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    let ret;
    try {
      ret = new RegExp(queryText, flag);
    } catch (e) {
      console.error('invalid regex: ', e);
      return null;
    }
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
