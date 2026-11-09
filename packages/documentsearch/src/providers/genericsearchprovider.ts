// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import type {
  IHTMLSearchMatch,
  ISearchProvider,
  ISearchProviderRegistry
} from '../tokens';
import { SearchProvider } from '../searchprovider';
import type { ITranslator } from '@jupyterlab/translation';

export const FOUND_CLASSES = ['cm-string', 'cm-overlay', 'cm-searching'];
const SELECTED_CLASSES = ['CodeMirror-selectedtext', 'jp-current-match'];

/**
 * The element that holds a formula typeset by MathJax.
 */
const FORMULA_ELEMENT = 'MJX-CONTAINER';

/**
 * The element of a line break opportunity in a formula typeset by MathJax,
 * which holds a space that is not part of the formula.
 */
const FORMULA_BREAK_ELEMENT = 'MJX-BREAK';

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
    SVG: true,
    // The visually hidden MathML copy that MathJax adds to each formula for
    // screen readers would count each match in the formula a second time.
    'MJX-ASSISTIVE-MML': true
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
    // Formulas are searched as a whole when the walker reaches their first
    // text node; `accepted` holds the formula of the node it last accepted.
    const accepted = { formula: null as Element | null };
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        // Filter subtrees of UNSUPPORTED_ELEMENTS and nodes that
        // do not contain our search text
        let formula: Element | null = null;
        let parentElement = node.parentElement!;
        while (parentElement !== rootNode) {
          if (parentElement.nodeName in HTMLSearchEngine.UNSUPPORTED_ELEMENTS) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parentElement.nodeName === FORMULA_ELEMENT) {
            formula = parentElement;
          }
          parentElement = parentElement.parentElement!;
        }
        if (formula) {
          accepted.formula = formula;
          return NodeFilter.FILTER_ACCEPT;
        }
        accepted.formula = null;
        return query.test(node.textContent!)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    let node: Node | null = null;
    while ((node = walker.nextNode()) !== null) {
      const formula = accepted.formula;
      if (formula) {
        matches.push(...searchFormula(query, formula));
        // Continue from the last node of the formula, so that the walker
        // does not visit the other text nodes of the formula
        let last: Node = formula;
        while (last.lastChild) {
          last = last.lastChild;
        }
        walker.currentNode = last;
        continue;
      }
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
      for (const hit of this._markNodes[this._currentMatchIndex]) {
        hit.classList.remove(...SELECTED_CLASSES);
      }
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

    // Transform the DOM: wrap each part of each match in a mark element. A
    // match in a formula can have parts in several text nodes.
    const partsByNode = new Map<
      Text,
      { match: number; part: IHTMLSearchMatch }[]
    >();
    matches.forEach((match, index) => {
      for (const part of match.parts ?? [match]) {
        let parts = partsByNode.get(part.node);
        if (!parts) {
          parts = [];
          partsByNode.set(part.node, parts);
        }
        parts.push({ match: index, part });
      }
    });
    this._markNodes = matches.map(() => []);
    for (const [activeNode, parts] of partsByNode) {
      const parent = activeNode.parentNode!;
      // Replace from last to first to maintain the positions of the parts.
      for (let i = parts.length - 1; i >= 0; i--) {
        const { match, part } = parts[i];
        // TODO: support tspan for svg when svg support is added
        const markedNode = document.createElement('mark');
        markedNode.classList.add(...FOUND_CLASSES);
        markedNode.textContent = part.text;

        const newNode = activeNode.splitText(part.position);
        newNode.textContent = newNode.textContent!.slice(part.text.length);
        parent.insertBefore(markedNode, newNode);
        // A match has at most one part per text node, and the text nodes come
        // in document order, so its marks stay in document order.
        this._markNodes[match].push(markedNode);
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
    for (const marks of this._markNodes) {
      for (const el of marks) {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent!), el);
          parent.normalize();
        }
      }
    }
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
      for (const hit of this._markNodes[this._currentMatchIndex]) {
        hit.classList.remove(...SELECTED_CLASSES);
      }

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
      const hits = this._markNodes[this._currentMatchIndex];
      for (const hit of hits) {
        hit.classList.add(...SELECTED_CLASSES);
      }
      // If not in view, scroll just enough to see it
      if (!elementInViewport(hits[0])) {
        hits[0].scrollIntoView(reverse);
      }
      hits[0].focus();

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
  // The mark elements of each match, in the order of the matches
  private _markNodes = new Array<HTMLElement[]>();
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

/**
 * Search the characters of a formula typeset by MathJax as one text.
 *
 * MathJax puts each character of a formula in its own text node, so `10`
 * spans two nodes, and it draws letters as mathematical symbols, such as
 * 𝑥 for x. The text of the formula joins its characters in the form typed
 * in a query (see `normalizeFormulaText`), without the hidden MathML copy
 * and the spaces of line break opportunities. A match that spans several
 * text nodes lists them in `parts`.
 *
 * Each character is normalized on its own, so that a match covers whole
 * characters of the formula: a query for x covers 𝑥, and a query for one
 * dot covers the whole `…`. Matches that would cover the same character,
 * such as the three dots of `…`, are joined into one, so that no character
 * is marked twice.
 *
 * @param query - Regular expression to search, with the global flag
 * @param formula - The `mjx-container` element of the formula
 * @returns The list of matches
 */
function searchFormula(query: RegExp, formula: Element): IHTMLSearchMatch[] {
  // One unit per character (code point) of the text nodes of the formula,
  // with its range in its text node (`from`, `to`) and in `text` (`start`,
  // `end`).
  const units: {
    node: Text;
    from: number;
    to: number;
    start: number;
    end: number;
  }[] = [];
  let text = '';
  const walker = document.createTreeWalker(formula, NodeFilter.SHOW_TEXT, {
    acceptNode: node => {
      let parentElement = node.parentElement;
      while (parentElement && parentElement !== formula) {
        if (
          parentElement.nodeName in HTMLSearchEngine.UNSUPPORTED_ELEMENTS ||
          parentElement.nodeName === FORMULA_BREAK_ELEMENT
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        parentElement = parentElement.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    let from = 0;
    for (const character of (node as Text).data) {
      const to = from + character.length;
      units.push({ node: node as Text, from, to, start: 0, end: 0 });
      from = to;
    }
  }
  // The normalized form of a function application depends on the character
  // after it, so pass the next character too
  const characterOf = (unit: (typeof units)[number] | undefined) =>
    unit ? unit.node.data.slice(unit.from, unit.to) : '';
  units.forEach((unit, index) => {
    unit.start = text.length;
    text += normalizeFormulaText(
      characterOf(unit),
      characterOf(units[index + 1])
    );
    unit.end = text.length;
  });

  // The first and last unit of each match
  const ranges: { first: number; last: number }[] = [];
  // Matches come in order, so the units before `cursor` stay behind
  let cursor = 0;
  query.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = query.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start === end) {
      // Step over an empty match, which would otherwise repeat forever
      query.lastIndex += 1;
      continue;
    }
    while (cursor < units.length && units[cursor].end <= start) {
      cursor += 1;
    }
    const first = cursor;
    let last = first;
    while (last + 1 < units.length && units[last + 1].start < end) {
      last += 1;
    }
    const previous = ranges[ranges.length - 1];
    if (previous && first <= previous.last) {
      previous.last = Math.max(previous.last, last);
    } else {
      ranges.push({ first, last });
    }
  }

  return ranges.map(({ first, last }) => {
    // One part per text node, from the first unit of the match in that node
    // to its last
    const parts: IHTMLSearchMatch[] = [];
    for (let index = first; index <= last; index++) {
      const unit = units[index];
      const part = parts[parts.length - 1];
      if (part && part.node === unit.node) {
        parts[parts.length - 1] = {
          ...part,
          text: unit.node.data.slice(part.position, unit.to)
        };
      } else {
        parts.push({
          text: unit.node.data.slice(unit.from, unit.to),
          position: unit.from,
          node: unit.node
        });
      }
    }
    return parts.length === 1
      ? parts[0]
      : {
          text: parts.map(part => part.text).join(''),
          position: parts[0].position,
          node: parts[0].node,
          parts
        };
  });
}

/**
 * Turn a character of a formula into the characters typed in a query.
 *
 * NFKC turns mathematical symbols into letters and digits (𝑥 into x, ℝ into
 * R). The minus sign, the asterisk operator and the prime become their ASCII
 * forms. MathJax adds an invisible function application after a function
 * name, such as `sin`. It becomes a space when a letter or a digit follows,
 * so that the text of `\sin x` is `sin x`, and is dropped otherwise, so that
 * the text of `\sin(x)` is `sin(x)`.
 *
 * @param character - The character to normalize
 * @param next - The character that follows it in the formula, if any
 */
function normalizeFormulaText(character: string, next = ''): string {
  if (character === '\u2061') {
    return /^[\p{L}\p{N}]/u.test(normalizeFormulaText(next)) ? ' ' : '';
  }
  return character
    .normalize('NFKC')
    .replace(/\u2212/g, '-')
    .replace(/\u2217/g, '*')
    .replace(/\u2032/g, "'");
}
