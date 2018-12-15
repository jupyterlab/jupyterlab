import { Widget } from '@phosphor/widgets';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

const DOCUMENT_SEARCH_CLASS = 'jp-DocumentSearch';
const SEARCHBOX_CLASS = 'jp-DocumentSearch-searchbox';
const WRAPPER_CLASS = 'jp-DocumentSearch-wrapper';
const INPUT_CLASS = 'jp-DocumentSearch-input';
const globalBtns: any = {};
export class SearchBox extends Widget {
  constructor() {
    super({ node: Private.createNode(globalBtns) });
    this._nextBtn = globalBtns.next;
    this._prevBtn = globalBtns.prev;
    this._trackerLabel = globalBtns.trackerLabel;
    this._caseSensitive = globalBtns.caseSensitive;
    this._regex = globalBtns.regex;

    this.id = 'search-box';
    this.title.iconClass = 'jp-ExtensionIcon jp-SideBar-tabIcon';
    this.title.caption = 'Search document';
    this.addClass(DOCUMENT_SEARCH_CLASS);
  }

  get inputNode(): HTMLInputElement {
    return this.node.getElementsByClassName(INPUT_CLASS)[0] as HTMLInputElement;
  }

  get startSearch(): ISignal<this, RegExp> {
    return this._startSearch;
  }

  get endSearch(): ISignal<this, void> {
    return this._endSearch;
  }

  get highlightNext(): ISignal<this, void> {
    return this._highlightNext;
  }

  get highlightPrevious(): ISignal<this, void> {
    return this._highlightPrevious;
  }

  set totalMatches(num: number) {
    this._totalMatches = num;
    this.updateTracker();
  }

  set currentIndex(num: number) {
    this._currentIndex = num;
    this.updateTracker();
  }

  handleEvent(event: Event): void {
    if (event.type === 'keydown') {
      this._handleKeyDown(event as KeyboardEvent);
    }
    if (event.type === 'click') {
      this._handleClick(event as MouseEvent);
    }
  }

  protected onBeforeAttach(msg: Message): void {
    // Add event listeners
    this.node.addEventListener('keydown', this.handleEvent.bind(this));
    this._nextBtn.addEventListener('click', this.handleEvent.bind(this));
    this._prevBtn.addEventListener('click', this.handleEvent.bind(this));
  }

  protected onAfterAttach(msg: Message): void {
    // Remove event listeners
    this.node.removeEventListener('keydown', this);
  }

  private updateTracker(): void {
    if (this._currentIndex === 0 && this._totalMatches === 0) {
      this._trackerLabel.innerHTML = 'No results';
      return;
    }
    this._trackerLabel.innerHTML = `${this._currentIndex + 1}/${
      this._totalMatches
    }`;
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.keyCode === 13) {
      // execute search!
      const query: RegExp = this.getCurrentQuery();
      if (query.source.length === 0) {
        return;
      }
      console.log('received enter keydown, execute search on query: ', query);

      if (this.regexEqual(this._lastQuery, query)) {
        this._highlightNext.emit(undefined);
        return;
      }

      this._lastQuery = query;
      this._startSearch.emit(query);
    }
  }

  private _handleClick(event: MouseEvent) {
    console.log('click event!');
    const query = this.getCurrentQuery();
    if (!this.regexEqual(this._lastQuery, query)) {
      if (query.source.length === 0) {
        return;
      }
      this._lastQuery = query;
      this._startSearch.emit(query);
      return;
    }
    if (event.target === this._nextBtn) {
      this._highlightNext.emit(undefined);
    } else if (event.target === this._prevBtn) {
      this._highlightPrevious.emit(undefined);
    }
  }

  private getCurrentQuery(): RegExp {
    return Private.parseQuery(
      this.inputNode.value,
      this._caseSensitive.checked,
      this._regex.checked
    );
  }

  private regexEqual(a: RegExp, b: RegExp) {
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

  private _startSearch = new Signal<this, RegExp>(this);
  private _endSearch = new Signal<this, void>(this);
  private _highlightNext = new Signal<this, void>(this);
  private _highlightPrevious = new Signal<this, void>(this);
  private _lastQuery: RegExp;
  private _totalMatches: number = 0;
  private _currentIndex: number = 0;

  private _nextBtn: Element;
  private _prevBtn: Element;
  private _trackerLabel: Element;
  private _caseSensitive: any;
  private _regex: any;
}

namespace Private {
  export function createNode(context: any) {
    const node = document.createElement('div');
    const search = document.createElement('div');
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    const next = document.createElement('button');
    const prev = document.createElement('button');
    const caseSensitive = document.createElement('input');
    const caseLabel = document.createElement('label');
    const regex = document.createElement('input');
    const regexLabel = document.createElement('label');
    const trackerLabel = document.createElement('p');
    const results = document.createElement('div');
    const dummyText = document.createElement('p');

    input.placeholder = 'SEARCH';
    dummyText.innerHTML = 'Dummy result';
    next.textContent = '>';
    prev.textContent = '<';

    caseSensitive.setAttribute('type', 'checkbox');
    regex.setAttribute('type', 'checkbox');
    caseLabel.innerHTML = 'case sensitive';
    regexLabel.innerHTML = 'regex';

    context.next = next;
    context.prev = prev;
    context.trackerLabel = trackerLabel;
    context.caseSensitive = caseSensitive;
    context.regex = regex;

    search.className = SEARCHBOX_CLASS;
    wrapper.className = WRAPPER_CLASS;
    input.className = INPUT_CLASS;

    search.appendChild(wrapper);
    wrapper.appendChild(input);
    wrapper.appendChild(prev);
    wrapper.appendChild(next);
    wrapper.appendChild(caseSensitive);
    wrapper.appendChild(caseLabel);
    wrapper.appendChild(regex);
    wrapper.appendChild(regexLabel);
    wrapper.appendChild(trackerLabel);
    results.appendChild(dummyText);
    node.appendChild(search);
    node.appendChild(results);

    return node;
  }

  export function parseString(str: string) {
    return str.replace(/\\(.)/g, (_, ch) => {
      if (ch === 'n') {
        return '\n';
      }
      if (ch === 'r') {
        return '\r';
      }
      return ch;
    });
  }

  export function parseQuery(
    queryString: string,
    caseSensitive: boolean,
    regex: boolean
  ) {
    const flag = caseSensitive ? 'g' : 'gi';
    const queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    console.log('queryText: ', queryText);
    let ret;
    try {
      ret = new RegExp(queryText, flag);
    } catch (e) {
      console.error('invalid regex: ', e);
    }
    if (ret.test('')) {
      ret = /x^/;
    }
    console.log('regex produced: ', ret);
    return ret;
  }
}
