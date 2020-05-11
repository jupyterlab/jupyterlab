// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISearchProvider, ISearchMatch } from '../interfaces';

import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

const FOUND_CLASSES = ['cm-string', 'cm-overlay', 'cm-searching'];
const SELECTED_CLASSES = ['CodeMirror-selectedtext'];

export class GenericSearchProvider implements ISearchProvider<Widget> {
  /**
   * We choose opt out as most node types should be searched (e.g. script).
   * Even nodes like <data>, could have innerText we care about.
   *
   * Note: nodeName is capitalized, so we do the same here
   */
  static UNSUPPORTED_ELEMENTS = {
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Document_metadata
    BASE: true,
    HEAD: true,
    LINK: true,
    META: true,
    STYLE: true,
    TITLE: true,
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Sectioning_root
    BODY: true,
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Content_sectioning
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Text_content
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Inline_text_semantics
    // Above is searched
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Image_and_multimedia
    AREA: true,
    AUDIO: true,
    IMG: true,
    MAP: true,
    TRACK: true,
    VIDEO: true,
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Embedded_content
    APPLET: true,
    EMBED: true,
    IFRAME: true,
    NOEMBED: true,
    OBJECT: true,
    PARAM: true,
    PICTURE: true,
    SOURCE: true,
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Scripting
    CANVAS: true,
    NOSCRIPT: true,
    SCRIPT: true,
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Demarcating_edits
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Table_content
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Forms
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Interactive_elements
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Web_Components
    // Above is searched
    // Other:
    SVG: true
  };

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: Widget): any {
    return '';
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   * @param [filters={}] Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(
    query: RegExp,
    searchTarget: Widget,
    filters = {}
  ): Promise<ISearchMatch[]> {
    const that = this; // eslint-disable-line
    // No point in removing overlay in the middle of the search
    await this.endQuery(false);

    this._widget = searchTarget;
    this._query = query;
    this._mutationObserver.disconnect();

    const matches: IGenericSearchMatch[] = [];
    const walker = document.createTreeWalker(
      this._widget.node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          // Filter subtrees of UNSUPPORTED_ELEMENTS and nodes that
          // do not contain our search text
          let parentElement = node.parentElement!;
          while (parentElement !== this._widget.node) {
            if (
              parentElement.nodeName in
              GenericSearchProvider.UNSUPPORTED_ELEMENTS
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            parentElement = parentElement.parentElement!;
          }
          return that._query.test(node.textContent!)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );
    const nodes: (Node | null)[] = [];
    const originalNodes: Node[] = [];
    // We MUST gather nodes first, otherwise the updates below will find each result twice
    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      /* We store them here as we want to avoid saving a modified one
       * This happens with something like this: <pre><span>Hello</span> world</pre> and looking for o
       * The o in world is found after the o in hello which means the pre could have been modified already
       * While there may be a better data structure to do this for performance, this was easy to reason about.
       */
      originalNodes.push(node.parentElement!.cloneNode(true));
      node = walker.nextNode();
    }
    // We'll need to copy the regexp to ensure its 'g' and that we start the index count from 0
    const flags =
      this._query.flags.indexOf('g') === -1 ? query.flags + 'g' : query.flags;

    nodes.forEach((node, nodeIndex) => {
      const q = new RegExp(query.source, flags);
      const subsections = [];
      let match = q.exec(node!.textContent!);
      while (match) {
        subsections.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
        match = q.exec(node!.textContent!);
      }
      const originalNode = originalNodes[nodeIndex];
      const originalLength = node!.textContent!.length; // Node length will change below
      let lastNodeAdded = null;
      // Go backwards as index may change if we go forwards
      const newMatches = [];
      for (let idx = subsections.length - 1; idx >= 0; --idx) {
        const { start, end, text } = subsections[idx];
        // TODO: support tspan for svg when svg support is added
        const spannedNode = document.createElement('span');
        spannedNode.classList.add(...FOUND_CLASSES);
        spannedNode.innerText = text;
        // Splice the text out before we add it back in with a span
        node!.textContent = `${node!.textContent!.slice(
          0,
          start
        )}${node!.textContent!.slice(end)}`;
        // Are we replacing from the start?
        if (start === 0) {
          node!.parentNode!.prepend(spannedNode);
          // Are we replacing at the end?
        } else if (end === originalLength) {
          node!.parentNode!.append(spannedNode);
          // Are the two results are adjacent to each other?
        } else if (lastNodeAdded && end === subsections[idx + 1].start) {
          node!.parentNode!.insertBefore(spannedNode, lastNodeAdded);
          // Ok, we are replacing somewhere in the middle
        } else {
          // We know this is Text as we filtered for this in the walker above
          const endText = (node as Text).splitText(start);
          node!.parentNode!.insertBefore(spannedNode, endText);
        }
        lastNodeAdded = spannedNode;
        newMatches.unshift({
          text,
          fragment: '',
          line: 0,
          column: 0,
          index: -1, // We set this later to ensure we get order correct
          // GenericSearchFields
          matchesIndex: -1,
          indexInOriginal: idx,
          spanElement: spannedNode,
          originalNode
        });
      }
      matches.push(...newMatches);
    });
    matches.forEach((match, idx) => {
      // This may be changed when this is a subprovider :/
      match.index = idx;
      // @ts-ignore
      match.matchesIndex = idx;
    });
    if (!this.isSubProvider && matches.length > 0) {
      this._currentMatch = matches[0];
    }
    // Watch for future changes:
    this._mutationObserver.observe(
      this._widget.node,
      // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserverInit
      {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
      }
    );

    this._matches = matches;
    return this._matches;
  }

  refreshOverlay() {
    // We don't have an overlay, we are directly changing the DOM
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(removeOverlay = true): Promise<void> {
    this._matches.forEach(match => {
      // We already took care of this parent with another match
      if (match.indexInOriginal !== 0) {
        return;
      }
      match.spanElement.parentElement!.replaceWith(match.originalNode);
    });
    this._matches = [];
    this._currentMatch = null;
    this._mutationObserver.disconnect();
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    return this.endQuery();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    return this._highlightNext(false);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    return this._highlightNext(true);
  }

  private _highlightNext(reverse: boolean): ISearchMatch | undefined {
    if (this._matches.length === 0) {
      return undefined;
    }
    if (!this._currentMatch) {
      this._currentMatch = reverse
        ? this._matches[this.matches.length - 1]
        : this._matches[0];
    } else {
      this._currentMatch.spanElement.classList.remove(...SELECTED_CLASSES);

      let nextIndex = reverse
        ? this._currentMatch.matchesIndex - 1
        : this._currentMatch.matchesIndex + 1;
      // When we are a subprovider, don't loop
      if (this.isSubProvider) {
        if (nextIndex < 0 || nextIndex >= this._matches.length) {
          this._currentMatch = null;
          return undefined;
        }
      }
      // Cheap way to make this a circular buffer
      nextIndex = (nextIndex + this._matches.length) % this._matches.length;
      this._currentMatch = this._matches[nextIndex];
    }
    if (this._currentMatch) {
      this._currentMatch.spanElement.classList.add(...SELECTED_CLASSES);
      // If not in view, scroll just enough to see it
      if (!elementInViewport(this._currentMatch.spanElement)) {
        this._currentMatch.spanElement.scrollIntoView(reverse);
      }
      this._currentMatch.spanElement.focus();
    }
    return this._currentMatch;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    // This is read only, but we could loosen this in theory for input boxes...
    return Promise.resolve(false);
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: Widget) {
    return domain instanceof Widget;
  }

  /**
   * The same list of matches provided by the startQuery promise resolution
   */
  get matches(): ISearchMatch[] {
    // Ensure that no other fn can overwrite matches index property
    // We shallow clone each node
    return this._matches
      ? this._matches.map(m => Object.assign({}, m))
      : this._matches;
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    if (!this._currentMatch) {
      return null;
    }
    return this._currentMatch.index;
  }

  get currentMatch(): ISearchMatch | null {
    return this._currentMatch;
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

  clearSelection(): void {
    return;
  }

  /**
   * Set whether or not this will wrap to the beginning
   * or end of the document on invocations of highlightNext or highlightPrevious, respectively
   */
  isSubProvider = false;

  private async _onWidgetChanged(
    mutations: MutationRecord[],
    observer: MutationObserver
  ) {
    // This is typically cheap, but we do not control the rate of change or size of the output
    await this.startQuery(this._query, this._widget);
    this._changed.emit(undefined);
  }

  private _query: RegExp;
  private _widget: Widget;
  private _currentMatch: IGenericSearchMatch | null;
  private _matches: IGenericSearchMatch[] = [];
  private _mutationObserver: MutationObserver = new MutationObserver(
    this._onWidgetChanged.bind(this)
  );
  private _changed = new Signal<this, void>(this);
}

interface IGenericSearchMatch extends ISearchMatch {
  readonly originalNode: Node;
  readonly spanElement: HTMLElement;
  /*
   * Index among spans within the same originalElement
   */
  readonly indexInOriginal: number;
  /**
   * Index in the matches array
   */
  readonly matchesIndex: number;
}

function elementInViewport(el: HTMLElement): boolean {
  const boundingClientRect = el.getBoundingClientRect();
  return (
    boundingClientRect.top >= 0 &&
    boundingClientRect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    boundingClientRect.left >= 0 &&
    boundingClientRect.right <=
      (window.innerWidth || document.documentElement.clientWidth)
  );
}
