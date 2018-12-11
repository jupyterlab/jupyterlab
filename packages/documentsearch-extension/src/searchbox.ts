import { Widget } from '@phosphor/widgets';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';
import { ISearchOptions } from '.';

const DOCUMENT_SEARCH_CLASS = 'jp-DocumentSearch';
const SEARCHBOX_CLASS = 'jp-DocumentSearch-searchbox';
const WRAPPER_CLASS = 'jp-DocumentSearch-wrapper';
const INPUT_CLASS = 'jp-DocumentSearch-input';

export class SearchBox extends Widget {
  constructor() {
    super({ node: Private.createNode() });
    this.id = 'search-box';
    this.title.iconClass = 'jp-ExtensionIcon jp-SideBar-tabIcon';
    this.title.caption = 'Search document';
    this.addClass(DOCUMENT_SEARCH_CLASS);
  }

  get inputNode(): HTMLInputElement {
    return this.node.getElementsByClassName(INPUT_CLASS)[0] as HTMLInputElement;
  }

  get startSearch(): ISignal<this, ISearchOptions> {
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

  handleEvent(event: Event): void {
    if (event.type === 'keydown') {
      this._handleKeyDown(event as KeyboardEvent);
    }
  }

  protected onBeforeAttach(msg: Message): void {
    // Add event listeners
    this.node.addEventListener('keydown', this.handleEvent.bind(this));
  }

  protected onAfterAttach(msg: Message): void {
    // Remove event listeners
    this.node.removeEventListener('keydown', this);
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.keyCode === 13) {
      // execute search!
      const searchTerm = this.inputNode.value;
      if (searchTerm.length === 0) {
        return;
      }
      console.log(
        'received enter keydown, execute search on searchTerm: ',
        searchTerm
      );
      const options: ISearchOptions = {
        query: searchTerm,
        caseSensitive: false,
        regex: false
      };

      if (this.optionsEqual(this._lastOptions, options)) {
        this._highlightNext.emit(undefined);
        return;
      }

      this._lastOptions = options;
      this._startSearch.emit(options);
    }
  }

  private optionsEqual(a: ISearchOptions, b: ISearchOptions) {
    return (
      !!a &&
      !!b &&
      a.query === b.query &&
      a.caseSensitive === b.caseSensitive &&
      a.regex === b.regex
    );
  }

  private _startSearch = new Signal<this, ISearchOptions>(this);
  private _endSearch = new Signal<this, void>(this);
  private _highlightNext = new Signal<this, void>(this);
  private _highlightPrevious = new Signal<this, void>(this);
  private _lastOptions: ISearchOptions;
}

namespace Private {
  export function createNode() {
    const node = document.createElement('div');
    const search = document.createElement('div');
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    const results = document.createElement('div');
    const dummyText = document.createElement('p');

    input.placeholder = 'SEARCH';
    dummyText.innerHTML = 'Dummy result';

    search.className = SEARCHBOX_CLASS;
    wrapper.className = WRAPPER_CLASS;
    input.className = INPUT_CLASS;

    search.appendChild(wrapper);
    wrapper.appendChild(input);
    results.appendChild(dummyText);
    node.appendChild(search);
    node.appendChild(results);

    return node;
  }
}
