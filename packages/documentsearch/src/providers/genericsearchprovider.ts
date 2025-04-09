// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import {
  IHTMLSearchMatch,
  ISearchProvider,
  ISearchProviderRegistry
} from '../tokens';
import { SearchProvider } from '../searchprovider';
import { ITranslator } from '@jupyterlab/translation';

export const FOUND_CLASSES = ['cm-string', 'cm-overlay', 'cm-searching'];
const SELECTED_CLASSES = ['CodeMirror-selectedtext'];

/**
 * HTML search engine
 */
export class HTMLSearchEngine {
  /**
   * We choose opt out as most node types should be searched (e.g. script).
   * Even nodes like <data>, could have textContent we care about.
   *
   * Note:
   * We will be checking each node's nodeName attribute in the Node interface.
   * ref: https://dom.spec.whatwg.org/#dom-node-nodename
   *
   * Specifically for Element nodes, where nodeName is stated as the
   * 'HTML-uppercased qualified name'. However, that does not mean that HTML
   * elements qualified name is guaranteed to be uppercased even when the
   * content type is HTML, i.e. XML tags like <svg>. This only applies when the
   * node's namespace is in HTML and the node document is a HTML document.
   * ref: https://dom.spec.whatwg.org/#element-html-uppercased-qualified-name
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

    /*
     * While XML tags local name is case sensitive, XHTML tags need to be
     * lowercased.
     * ref: https://www.w3.org/TR/xhtml1/#h-4.2
     *
     * Which in practice means I've seen SVG tags local name to be lowercased.
     * I don't believe enumerating all possible cases would be useful as such,
     * and similarly transforming the nodeName to uppercase would seem like
     * unnecessary overhead.
     */
    svg: true,
    SVG: true
  };

  /**
   * Search for a `query` in a DOM tree.
   *
   * @param query Regular expression to search
   * @param rootNode DOM root node to search in
   * @returns The list of matches
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
          node: node as Text
        });
      }
    }

    return Promise.resolve(matches);
  }
}

/**
 * Generic DOM tree search provider.
 */
export class GenericSearchProvider extends SearchProvider<Widget> {
  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static isApplicable(domain: Widget): boolean {
    return domain instanceof Widget;
  }

  /**
   * Instantiate a generic search provider for the widget.
   *
   * #### Notes
   * The widget provided is always checked using `isApplicable` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param registry The search provider registry
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the widget
   */
  static createNew(
    widget: Widget,
    registry: ISearchProviderRegistry,
    translator?: ITranslator
  ): ISearchProvider {
    return new GenericSearchProvider(widget);
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    return this._currentMatchIndex >= 0 ? this._currentMatchIndex : null;
  }

  /**
   * The current match
   */
  get currentMatch(): IHTMLSearchMatch | null {
    return this._matches[this._currentMatchIndex] ?? null;
  }

  /**
   * The current matches
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
  get matchesCount(): number | null {
    return this._matches.length;
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): Promise<void> {
    if (this._currentMatchIndex >= 0) {
      const hit = this._markNodes[this._currentMatchIndex];
      hit.classList.remove(...SELECTED_CLASSES);
    }
    this._currentMatchIndex = -1;

    return Promise.resolve();
  }

  /**
   * Dispose of the resources held by the search provider.
   *
   * #### Notes
   * If the object's `dispose` method is called more than once, all
   * calls made after the first will be a no-op.
   *
   * #### Undefined Behavior
   * It is undefined behavior to use any functionality of the object
   * after it has been disposed unless otherwise explicitly noted.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.endQuery().catch(reason => {
      console.error(`Failed to end search query.`, reason);
    });
    super.dispose();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(loop?: boolean): Promise<IHTMLSearchMatch | undefined> {
    return this._highlightNext(false, loop ?? true) ?? undefined;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(
    loop?: boolean
  ): Promise<IHTMLSearchMatch | undefined> {
    return this._highlightNext(true, loop ?? true) ?? undefined;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @param newText The replacement text
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string, loop?: boolean): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @param newText The replacement text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    // This is read only, but we could loosen this in theory for input boxes...
    return Promise.resolve(false);
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(query: RegExp | null, filters = {}): Promise<void> {
    await this.endQuery();
    this._query = query;

    if (query === null) {
      return Promise.resolve();
    }

    const matches = await HTMLSearchEngine.search(query, this.widget.node);

    // Transform the DOM
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

      const markedNodes = subMatches.map(match => {
        // TODO: support tspan for svg when svg support is added
        const markedNode = document.createElement('mark');
        markedNode.classList.add(...FOUND_CLASSES);
        markedNode.textContent = match.text;

        const newNode = activeNode.splitText(match.position);
        newNode.textContent = newNode.textContent!.slice(match.text.length);
        parent.insertBefore(markedNode, newNode);
        return markedNode;
      });

      // Insert node in reverse order as we replace from last to first
      // to maintain match position.
      for (let i = markedNodes.length - 1; i >= 0; i--) {
        this._markNodes.push(markedNodes[i]);
      }
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

  /**
   * Clear the highlighted matches and any internal state.
   */
  async endQuery(): Promise<void> {
    this._mutationObserver.disconnect();
    this._markNodes.forEach(el => {
      const parent = el.parentNode!;
      parent.replaceChild(document.createTextNode(el.textContent!), el);
      parent.normalize();
    });
    this._markNodes = [];
    this._matches = [];
    this._currentMatchIndex = -1;
  }

  private _highlightNext(
    reverse: boolean,
    loop: boolean
  ): IHTMLSearchMatch | null {
    if (this._matches.length === 0) {
      return null;
    }
    if (this._currentMatchIndex === -1) {
      this._currentMatchIndex = reverse ? this.matches.length - 1 : 0;
    } else {
      const hit = this._markNodes[this._currentMatchIndex];
      hit.classList.remove(...SELECTED_CLASSES);

      this._currentMatchIndex = reverse
        ? this._currentMatchIndex - 1
        : this._currentMatchIndex + 1;
      if (
        loop &&
        (this._currentMatchIndex < 0 ||
          this._currentMatchIndex >= this._matches.length)
      ) {
        // Cheap way to make this a circular buffer
        this._currentMatchIndex =
          (this._currentMatchIndex + this._matches.length) %
          this._matches.length;
      }
    }

    if (
      this._currentMatchIndex >= 0 &&
      this._currentMatchIndex < this._matches.length
    ) {
      const hit = this._markNodes[this._currentMatchIndex];
      hit.classList.add(...SELECTED_CLASSES);
      // If not in view, scroll just enough to see it
      if (!elementInViewport(hit)) {
        hit.scrollIntoView(reverse);
      }
      hit.focus();

      return this._matches[this._currentMatchIndex];
    } else {
      this._currentMatchIndex = -1;
      return null;
    }
  }

  private async _onWidgetChanged(
    mutations: MutationRecord[],
    observer: MutationObserver
  ) {
    this._currentMatchIndex = -1;
    // This is typically cheap, but we do not control the rate of change or size of the output
    await this.startQuery(this._query);
    this._stateChanged.emit();
  }

  private _query: RegExp | null;
  private _currentMatchIndex: number;
  private _matches: IHTMLSearchMatch[] = [];
  private _mutationObserver: MutationObserver = new MutationObserver(
    this._onWidgetChanged.bind(this)
  );
  private _markNodes = new Array<HTMLSpanElement>();
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
