// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import { IHTMLSearchMatch } from '../tokens';
import { SearchProvider } from '../searchprovider';

export const FOUND_CLASSES = ['cm-string', 'cm-overlay', 'cm-searching'];
const SELECTED_CLASSES = ['CodeMirror-selectedtext'];

// Highlight next and previous seem broken

export class HTMLSearchEngine {
  /**
   * We choose opt out as most node types should be searched (e.g. script).
   * Even nodes like <data>, could have textContent we care about.
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
   *
   * @param query
   * @param data
   * @returns
   */
  static search(query: RegExp, rootNode: Node): Promise<IHTMLSearchMatch[]> {
    if (!(rootNode instanceof Node)) {
      console.warn(
        'Unable to search with HTMLSearchEngine the provided object.',
        rootNode
      );
      return Promise.resolve([]);
    }

    if (!query.global) {
      query = new RegExp(query.source, query.flags + 'g');
    }

    const matches: IHTMLSearchMatch[] = [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        // Filter subtrees of UNSUPPORTED_ELEMENTS and nodes that
        // do not contain our search text
        let parentElement = node.parentElement!;
        while (parentElement !== rootNode) {
          if (parentElement.nodeName in HTMLSearchEngine.UNSUPPORTED_ELEMENTS) {
            return NodeFilter.FILTER_REJECT;
          }
          parentElement = parentElement.parentElement!;
        }
        return query.test(node.textContent!)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    let node: Node | null = null;
    while ((node = walker.nextNode()) !== null) {
      // Reset query index
      query.lastIndex = 0;
      let match: RegExpExecArray | null = null;
      while ((match = query.exec(node.textContent!)) !== null) {
        matches.push({
          text: match[0],
          position: match.index,
          node: node as Text,
          // TODO remove those
          index: -1 // We set this later to ensure we get order correct
        });
      }
    }

    matches.forEach((match, idx) => {
      // This may be changed when this is a subprovider :/
      match.index = idx;
    });
    return Promise.resolve(matches);
  }
}

export class GenericSearchProvider extends SearchProvider<Widget> {
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
  async startQuery(query: RegExp, filters = {}): Promise<void> {
    if (!this.widget) {
      return Promise.resolve();
    }

    // No point in removing overlay in the middle of the search
    await this.endQuery(false);
    this._query = query;

    const matches = await HTMLSearchEngine.search(query, this.widget.node);

    // Transform the DOM
    /*
     * We store them here as we want to avoid saving a modified one
     * This happens with something like this: <pre><span>Hello</span> world</pre> and looking for o
     * The o in world is found after the o in hello which means the pre could have been modified already
     * While there may be a better data structure to do this for performance, this was easy to reason about.
     */
    // const originalNodes = matches.forEach(match =>
    //   match.originalNode.parentElement!.cloneNode(true)
    // );

    let nodeIdx = 0;
    while (nodeIdx < matches.length) {
      let activeNode = matches[nodeIdx].node;
      let parent = activeNode.parentNode!;

      let subMatches = [matches[nodeIdx]];
      while (
        ++nodeIdx < matches.length &&
        matches[nodeIdx].node === activeNode
      ) {
        subMatches.unshift(matches[nodeIdx]);
      }

      subMatches.forEach(match => {
        // TODO: support tspan for svg when svg support is added
        const spannedNode = document.createElement('span');
        spannedNode.classList.add(...FOUND_CLASSES);
        spannedNode.textContent = match.text;

        const newNode = activeNode.splitText(match.position);
        newNode.textContent = newNode.textContent!.slice(match.text.length);
        parent.insertBefore(spannedNode, newNode);
        this._spanNodes.push(spannedNode);
      });
    }

    if (!this.isSubProvider && matches.length > 0) {
      this._currentMatchIndex = 0;
    }
    // Watch for future changes:
    this._mutationObserver.observe(
      this.widget.node,
      // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserverInit
      {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
      }
    );

    this._matches = matches;
  }

  refreshOverlay(): void {
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
    this._mutationObserver.disconnect();
    this._spanNodes.forEach(el => {
      const parent = el.parentNode!;
      parent.replaceChild(document.createTextNode(el.textContent!), el);
      parent.normalize();
    });
    this._spanNodes = [];
    this._matches = [];
    this._currentMatchIndex = null;
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
  async highlightNext(): Promise<IHTMLSearchMatch | undefined> {
    return this._highlightNext(false);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(): Promise<IHTMLSearchMatch | undefined> {
    return this._highlightNext(true);
  }

  private _highlightNext(reverse: boolean): IHTMLSearchMatch | undefined {
    if (this._matches.length === 0) {
      return undefined;
    }
    if (!this._currentMatchIndex) {
      this._currentMatchIndex = reverse ? this.matches.length - 1 : 0;
    } else {
      const hit = this._spanNodes[this._currentMatchIndex];
      hit.classList.remove(...SELECTED_CLASSES);

      this._currentMatchIndex = reverse
        ? this._currentMatchIndex - 1
        : this._currentMatchIndex + 1;
      if (
        this._currentMatchIndex < 0 ||
        this._currentMatchIndex >= this._matches.length
      ) {
        this._currentMatchIndex = this.isSubProvider
          ? null
          : // Cheap way to make this a circular buffer
            (this._currentMatchIndex + this._matches.length) %
            this._matches.length;
      }
    }

    if (this._currentMatchIndex) {
      const hit = this._spanNodes[this._currentMatchIndex];
      hit.classList.add(...SELECTED_CLASSES);
      // If not in view, scroll just enough to see it
      if (!elementInViewport(hit)) {
        hit.scrollIntoView(reverse);
      }
      hit.focus();

      return this._matches[this._currentMatchIndex];
    } else {
      return undefined;
    }
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
  static canSearchOn(domain: Widget): boolean {
    return domain instanceof Widget;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    return this._currentMatchIndex;
  }

  get currentMatch(): IHTMLSearchMatch | null {
    return this._currentMatchIndex === null
      ? null
      : this._matches[this._currentMatchIndex];
  }

  /**
   * The same list of matches provided by the startQuery promise resolution
   */
  get matches(): IHTMLSearchMatch[] {
    // Ensure that no other fn can overwrite matches index property
    // We shallow clone each node
    return this._matches
      ? this._matches.map(m => Object.assign({}, m))
      : this._matches;
  }

  /**
   * The number of matches.
   */
  get matchesSize(): number | null {
    return this._matches.length;
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

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
    await this.startQuery(this._query);
    this.changed.emit(undefined);
  }

  private _query: RegExp;
  private _currentMatchIndex: number | null;
  private _matches: IHTMLSearchMatch[] = [];
  private _mutationObserver: MutationObserver = new MutationObserver(
    this._onWidgetChanged.bind(this)
  );
  private _spanNodes = new Array<HTMLSpanElement>();
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
