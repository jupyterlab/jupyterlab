/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import escape from 'lodash.escape';
import { removeMath, replaceMath } from './latex';

/**
 * Render HTML into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderHTML(options: renderHTML.IOptions): Promise<void> {
  // Unpack the options.
  let {
    host,
    source,
    trusted,
    sanitizer,
    resolver,
    linkHandler,
    shouldTypeset,
    latexTypesetter,
    translator
  } = options;

  translator = translator || nullTranslator;
  const trans = translator?.load('jupyterlab');
  let originalSource = source;

  // Bail early if the source is empty.
  if (!source) {
    host.textContent = '';
    return;
  }

  // Sanitize the source if it is not trusted. This removes all
  // `<script>` tags as well as other potentially harmful HTML.
  if (!trusted) {
    originalSource = `${source}`;
    source = sanitizer.sanitize(source);
  }

  // Set the inner HTML of the host.
  host.innerHTML = source;

  if (host.getElementsByTagName('script').length > 0) {
    // If output it trusted, eval any script tags contained in the HTML.
    // This is not done automatically by the browser when script tags are
    // created by setting `innerHTML`.
    if (trusted) {
      Private.evalInnerHTMLScriptTags(host);
    } else {
      const container = document.createElement('div');
      const warning = document.createElement('pre');
      warning.textContent = trans.__(
        'This HTML output contains inline scripts. Are you sure that you want to run arbitrary Javascript within your JupyterLab session?'
      );
      const runButton = document.createElement('button');
      runButton.textContent = trans.__('Run');
      runButton.onclick = event => {
        host.innerHTML = originalSource;
        Private.evalInnerHTMLScriptTags(host);
        if (host.firstChild) {
          host.removeChild(host.firstChild);
        }
      };
      container.appendChild(warning);
      container.appendChild(runButton);
      host.insertBefore(container, host.firstChild);
    }
  }

  // Handle default behavior of nodes.
  Private.handleDefaults(host);

  if (shouldTypeset && latexTypesetter) {
    const maybePromise = latexTypesetter.typeset(host);
    if (maybePromise instanceof Promise) {
      // Harden anchors to contain secure target/rel attributes.
      maybePromise
        .then(() => hardenAnchorLinks(host, resolver))
        .catch(console.warn);
    } else {
      hardenAnchorLinks(host, resolver);
    }
  } else {
    hardenAnchorLinks(host, resolver);
  }

  // Patch the urls if a resolver is available.
  if (resolver) {
    await Private.handleUrls(host, resolver, linkHandler);
  }
}

/**
 * The namespace for the `renderHTML` function statics.
 */
export namespace renderHTML {
  /**
   * The options for the `renderHTML` function.
   */
  export interface IOptions {
    /**
     * The host node for the rendered HTML.
     */
    host: HTMLElement;

    /**
     * The HTML source to render.
     */
    source: string;

    /**
     * Whether the source is trusted.
     */
    trusted: boolean;

    /**
     * The html sanitizer for untrusted source.
     */
    sanitizer: IRenderMime.ISanitizer;

    /**
     * An optional url resolver.
     */
    resolver: IRenderMime.IResolver | null;

    /**
     * An optional link handler.
     */
    linkHandler: IRenderMime.ILinkHandler | null;

    /**
     * Whether the node should be typeset.
     */
    shouldTypeset: boolean;

    /**
     * The LaTeX typesetter for the application.
     */
    latexTypesetter: IRenderMime.ILatexTypesetter | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * Render an image into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderImage(
  options: renderImage.IRenderOptions
): Promise<void> {
  // Unpack the options.
  const { host, mimeType, source, width, height, needsBackground, unconfined } =
    options;

  // Clear the content in the host.
  host.textContent = '';

  // Create the image element.
  const img = document.createElement('img');

  // Set the source of the image.
  img.src = `data:${mimeType};base64,${source}`;

  // Set the size of the image if provided.
  if (typeof height === 'number') {
    img.height = height;
  }
  if (typeof width === 'number') {
    img.width = width;
  }

  if (needsBackground === 'light') {
    img.classList.add('jp-needs-light-background');
  } else if (needsBackground === 'dark') {
    img.classList.add('jp-needs-dark-background');
  }

  if (unconfined === true) {
    img.classList.add('jp-mod-unconfined');
  }

  // Add the image to the host.
  host.appendChild(img);
}

/**
 * The namespace for the `renderImage` function statics.
 */
export namespace renderImage {
  /**
   * The options for the `renderImage` function.
   */
  export interface IRenderOptions {
    /**
     * The image node to update with the content.
     */
    host: HTMLElement;

    /**
     * The mime type for the image.
     */
    mimeType: string;

    /**
     * The base64 encoded source for the image.
     */
    source: string;

    /**
     * The optional width for the image.
     */
    width?: number;

    /**
     * The optional height for the image.
     */
    height?: number;

    /**
     * Whether an image requires a background for legibility.
     */
    needsBackground?: string;

    /**
     * Whether the image should be unconfined.
     */
    unconfined?: boolean;
  }
}

/**
 * Render LaTeX into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderLatex(
  options: renderLatex.IRenderOptions
): Promise<void> {
  // Unpack the options.
  const { host, source, shouldTypeset, latexTypesetter, resolver } = options;

  // Set the source on the node.
  host.textContent = source;

  // Typeset the node if needed.
  if (shouldTypeset && latexTypesetter) {
    const maybePromise = latexTypesetter.typeset(host);
    if (maybePromise instanceof Promise) {
      // Harden anchors to contain secure target/rel attributes.
      maybePromise
        .then(() => hardenAnchorLinks(host, resolver))
        .catch(console.warn);
    } else {
      hardenAnchorLinks(host, resolver);
    }
  }
}

/**
 * The namespace for the `renderLatex` function statics.
 */
export namespace renderLatex {
  /**
   * The options for the `renderLatex` function.
   */
  export interface IRenderOptions {
    /**
     * The host node for the rendered LaTeX.
     */
    host: HTMLElement;

    /**
     * The LaTeX source to render.
     */
    source: string;

    /**
     * Whether the node should be typeset.
     */
    shouldTypeset: boolean;

    /**
     * The LaTeX typesetter for the application.
     */
    latexTypesetter: IRenderMime.ILatexTypesetter | null;

    /**
     * An optional url resolver.
     */
    resolver?: IRenderMime.IResolver | null;
  }
}

/**
 * Render Markdown into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderMarkdown(
  options: renderMarkdown.IRenderOptions
): Promise<void> {
  // Unpack the options.
  const { host, source, markdownParser, ...others } = options;

  // Clear the content if there is no source.
  if (!source) {
    host.textContent = '';
    return;
  }

  let html = '';
  if (markdownParser) {
    // Separate math from normal markdown text.
    const parts = removeMath(source);

    // Convert the markdown to HTML.
    html = await markdownParser.render(parts['text']);

    // Replace math.
    html = replaceMath(html, parts['math']);
  } else {
    // Fallback if the application does not have any markdown parser.
    html = `<pre>${source}</pre>`;
  }

  // Render HTML.
  await renderHTML({
    host,
    source: html,
    ...others
  });

  // Apply ids to the header nodes.
  Private.headerAnchors(host, options.sanitizer.allowNamedProperties ?? false);
}

/**
 * The namespace for the `renderMarkdown` function statics.
 */
export namespace renderMarkdown {
  /**
   * The options for the `renderMarkdown` function.
   */
  export interface IRenderOptions {
    /**
     * The host node for the rendered Markdown.
     */
    host: HTMLElement;

    /**
     * The Markdown source to render.
     */
    source: string;

    /**
     * Whether the source is trusted.
     */
    trusted: boolean;

    /**
     * The html sanitizer for untrusted source.
     */
    sanitizer: IRenderMime.ISanitizer;

    /**
     * An optional url resolver.
     */
    resolver: IRenderMime.IResolver | null;

    /**
     * An optional link handler.
     */
    linkHandler: IRenderMime.ILinkHandler | null;

    /**
     * Whether the node should be typeset.
     */
    shouldTypeset: boolean;

    /**
     * The LaTeX typesetter for the application.
     */
    latexTypesetter: IRenderMime.ILatexTypesetter | null;

    /**
     * The Markdown parser.
     */
    markdownParser: IRenderMime.IMarkdownParser | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Create a normalized id for a header element.
   *
   * @param header Header element
   * @returns Normalized id
   */
  export function createHeaderId(header: Element): string {
    return (header.textContent ?? '').replace(/ /g, '-');
  }
}

/**
 * Render SVG into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderSVG(
  options: renderSVG.IRenderOptions
): Promise<void> {
  // Unpack the options.
  let { host, source, trusted, unconfined } = options;

  // Clear the content if there is no source.
  if (!source) {
    host.textContent = '';
    return;
  }

  // Display a message if the source is not trusted.
  if (!trusted) {
    host.textContent =
      'Cannot display an untrusted SVG. Maybe you need to run the cell?';
    return;
  }

  // Add missing SVG namespace (if actually missing)
  const patt = '<svg[^>]+xmlns=[^>]+svg';
  if (source.search(patt) < 0) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Render in img so that user can save it easily
  const img = new Image();
  img.src = `data:image/svg+xml,${encodeURIComponent(source)}`;
  host.appendChild(img);

  if (unconfined === true) {
    host.classList.add('jp-mod-unconfined');
  }
}

/**
 * The namespace for the `renderSVG` function statics.
 */
export namespace renderSVG {
  /**
   * The options for the `renderSVG` function.
   */
  export interface IRenderOptions {
    /**
     * The host node for the rendered SVG.
     */
    host: HTMLElement;

    /**
     * The SVG source.
     */
    source: string;

    /**
     * Whether the source is trusted.
     */
    trusted: boolean;

    /**
     * Whether the svg should be unconfined.
     */
    unconfined?: boolean;

    /**
     * The application language translator.
     */
    translator: ITranslator;
  }
}

/**
 * Options for auto linker.
 */
interface IAutoLinkOptions {
  /**
   * Whether to look for web URLs e.g. indicated by http schema or www prefix.
   */
  checkWeb: boolean;
  /**
   * Whether to look for path URIs.
   */
  checkPaths: boolean;
}

interface ILinker {
  /**
   * Regular expression capturing links in the group named `path`.
   *
   * Full match extend will be used as label for the link.
   * Additional named groups represent locator fragments.
   */
  regex: RegExp;
  /**
   * Create the anchor element.
   */
  createAnchor: (
    text: string,
    label: string,
    attributes?: Record<string, string>
  ) => HTMLAnchorElement;
  /**
   * Modify the path value if needed.
   */
  processPath?: (text: string) => string;
  /**
   * Modify the label if needed.
   */
  processLabel?: (text: string) => string;
}

namespace ILinker {
  // Matching regular expressions is slow; we can fast-reject
  // a string if it does not start with `data:`, `www.`, or
  // a valid schema. We define a valid schema as an alphanumeric
  // sequence of length at least two and followed by `://`,
  // e.g.`https://`. To fast-reject in long sequence of characters
  // we need to impose an additional restriction on the length.
  // As of 2025 the longest registered URI schemes are:
  // - machineProvisioningProgressReporter - 35
  // - microsoft.windows.camera.multipicker - 36
  // See https://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml
  // While technically any length is allowed, it is unlikely that any scheme
  // longer than 40 characters would be of a general benefit to most users,
  // and if one finds themselves with a use case which requires it, they are
  // welcome to open a PR which allows to customize this restriction.
  const maxAcceptedProtocolLength = 40;

  // Taken from Visual Studio Code:
  // https://github.com/microsoft/vscode/blob/9f709d170b06e991502153f281ec3c012add2e42/src/vs/workbench/contrib/debug/browser/linkDetector.ts#L17-L18
  const controlCodes = '\\u0000-\\u0020\\u007f-\\u009f';
  export const webLinkRegex = new RegExp(
    '(?<path>(?:[a-zA-Z][a-zA-Z0-9+.-]{2,' +
      maxAcceptedProtocolLength +
      '}:\\/\\/|data:|www\\.)[^\\s' +
      controlCodes +
      '"]{2,}[^\\s' +
      controlCodes +
      '"\'(){}\\[\\],:;.!?])',
    'gu'
  );
  // Taken from Visual Studio Code:
  // https://github.com/microsoft/vscode/blob/3e407526a1e2ff22cacb69c7e353e81a12f41029/extensions/notebook-renderers/src/linkify.ts#L9
  const winAbsPathRegex = /(?:[a-zA-Z]:(?:(?:\\|\/)[\w.-]*)+)/;
  const winRelPathRegex = /(?:(?:~|\.)(?:(?:\\|\/)[\w.-]*)+)/;
  const winPathRegex = new RegExp(
    // eslint-disable-next-line regexp/no-useless-non-capturing-group
    `(${winAbsPathRegex.source}|${winRelPathRegex.source})`
  );
  const posixPathRegex = /((?:~|\.)?(?:\/[\w.-]*)+)/;
  const lineColumnRegex = /(?:(?::|", line )(?<line>\d+))?(?::(?<column>\d+))?/;
  // TODO: this ought to come from kernel (browser may be on a different OS).
  const isWindows = navigator.userAgent.indexOf('Windows') >= 0;
  export const pathLinkRegex = new RegExp(
    `(?<path>${isWindows ? winPathRegex.source : posixPathRegex.source})${
      lineColumnRegex.source
    }`,
    'g'
  );
}

/**
 * Linker for web URLs.
 */
class WebLinker implements ILinker {
  regex = ILinker.webLinkRegex;
  createAnchor(url: string, label: string) {
    const anchor = document.createElement('a');
    anchor.href = url.startsWith('www.') ? 'https://' + url : url;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    anchor.appendChild(document.createTextNode(label));
    return anchor;
  }
  processPath(url: string) {
    // Special case when the URL ends with ">" or "<"
    const lastChars = url.slice(-1);
    const endsWithGtLt = ['>', '<'].indexOf(lastChars) !== -1;
    const len = endsWithGtLt ? url.length - 1 : url.length;
    url = url.slice(0, len);
    return url;
  }
  processLabel(url: string) {
    return this.processPath(url);
  }
}

/**
 * Linker for path URIs.
 */
class PathLinker implements ILinker {
  regex = ILinker.pathLinkRegex;
  createAnchor(path: string, label: string, locators: Record<string, string>) {
    const anchor = document.createElement('a');

    // Store the path in dataset.
    // Do not set `href` - at this point we do not know if the path is valid and
    // accessible for application (and we want rendering those as links).
    anchor.dataset.path = path;

    // Store line using RFC 5147 fragment locator for text/plain files.
    // It could be expanded to other formats, e.g. based on file extension.
    const line = parseInt(locators['line'], 10);
    let locator: string = !isNaN(line) ? `line=${line - 1}` : '';
    anchor.dataset.locator = locator;

    anchor.appendChild(document.createTextNode(label));
    return anchor;
  }
}

function autolink(
  content: string,
  options: IAutoLinkOptions
): Array<HTMLAnchorElement | Text> {
  const linkers: ILinker[] = [];
  if (options.checkWeb) {
    linkers.push(new WebLinker());
  }
  if (options.checkPaths) {
    linkers.push(new PathLinker());
  }
  const nodes: Array<HTMLAnchorElement | Text> = [];

  // There are two ways to implement competitive regexes:
  // - two heads (which would need to resolve overlaps), or
  // - (simpler) divide and recurse (implemented below)
  const linkify = (content: string, regexIndex: number) => {
    if (regexIndex >= linkers.length) {
      nodes.push(document.createTextNode(content));
      return;
    }

    const linker = linkers[regexIndex];

    let match: RegExpExecArray | null;
    let currentIndex = 0;
    const regex = linker.regex;
    // Reset regex
    regex.lastIndex = 0;

    while (null != (match = regex.exec(content))) {
      const stringBeforeMatch = content.substring(currentIndex, match.index);

      if (stringBeforeMatch) {
        linkify(stringBeforeMatch, regexIndex + 1);
      }

      const { path, ...locators } = match.groups!;
      const value = linker.processPath ? linker.processPath(path) : path;
      const label = linker.processLabel
        ? linker.processLabel(match[0])
        : match[0];
      nodes.push(linker.createAnchor(value, label, locators));
      currentIndex = match.index + label.length;
    }
    const stringAfterMatches = content.substring(currentIndex);
    if (stringAfterMatches) {
      linkify(stringAfterMatches, regexIndex + 1);
    }
  };

  linkify(content, 0);
  return nodes;
}

/**
 * Split a shallow node (node without nested nodes inside) at a given text content position.
 *
 * @param node the shallow node to be split
 * @param at the position in textContent at which the split should occur
 */
function splitShallowNode<T extends Node>(
  node: T,
  at: number
): { pre: T; post: T } {
  const pre = node.cloneNode() as T;
  pre.textContent = (node.textContent ?? '').slice(0, at);
  const post = node.cloneNode() as T;
  post.textContent = (node.textContent ?? '').slice(at);
  return {
    pre,
    post
  };
}

/**
 * Iterate over some nodes, while tracking cumulative start and end position.
 */
function* nodeIter<T extends Node>(
  nodes: T[]
): IterableIterator<{ node: T; start: number; end: number; isText: boolean }> {
  let start = 0;
  let end;
  for (let node of nodes) {
    end = start + (node.textContent?.length || 0);
    yield {
      node,
      start,
      end,
      isText: node.nodeType === Node.TEXT_NODE
    };
    start = end;
  }
}

/**
 * Align two collections of nodes.
 *
 * If a text node in one collections spans an element in the other, yield the spanned elements.
 * Otherwise, split the nodes such that yielded pair start and stop on the same position.
 */
function* alignedNodes<T extends Node, U extends Node>(
  a: T[],
  b: U[]
): IterableIterator<[T, null] | [null, U] | [T, U]> {
  let iterA = nodeIter(a);
  let iterB = nodeIter(b);
  let nA = iterA.next();
  let nB = iterB.next();
  while (!nA.done && !nB.done) {
    let A = nA.value;
    let B = nB.value;

    if (A.isText && A.start <= B.start && A.end >= B.end) {
      // A is a text element that spans all of B, simply yield B
      yield [null, B.node];
      nB = iterB.next();
    } else if (B.isText && B.start <= A.start && B.end >= A.end) {
      // B is a text element that spans all of A, simply yield A
      yield [A.node, null];
      nA = iterA.next();
    } else {
      // There is some intersection, split one, unless they match exactly
      if (A.end === B.end && A.start === B.start) {
        yield [A.node, B.node];
        nA = iterA.next();
        nB = iterB.next();
      } else if (A.end > B.end) {
        /*
        A |-----[======]---|
        B |--[======]------|
                    | <- Split A here
                | <- trim B to start from here if needed
        */
        let { pre, post } = splitShallowNode(A.node, B.end - A.start);
        if (B.start < A.start) {
          // this node should not be yielded anywhere else, so ok to modify in-place
          B.node.textContent = (B.node.textContent ?? '').slice(
            A.start - B.start
          );
        }
        yield [pre, B.node];
        // Modify iteration result in-place:
        A.node = post;
        A.start = B.end;
        nB = iterB.next();
      } else if (B.end > A.end) {
        let { pre, post } = splitShallowNode(B.node, A.end - B.start);
        if (A.start < B.start) {
          // this node should not be yielded anywhere else, so ok to modify in-place
          A.node.textContent = (A.node.textContent ?? '').slice(
            B.start - A.start
          );
        }
        yield [A.node, pre];
        // Modify iteration result in-place:
        B.node = post;
        B.start = A.end;
        nA = iterA.next();
      } else {
        throw new Error(
          `Unexpected intersection: ${JSON.stringify(A)} ${JSON.stringify(B)}`
        );
      }
    }
  }
}

/**
 * Render text into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderText(
  options: renderText.IRenderOptions
): Promise<void> {
  // Text has no post-render step, so we do not await completion here (rendering
  // continues incrementally across animation frames).
  void renderTextual(options, {
    checkWeb: true,
    checkPaths: false
  });
}

/**
 * Sanitize HTML out using native browser sanitizer.
 *
 * Compared to the `ISanitizer.sanitize` this does not allow to selectively
 * allow to keep certain tags but escapes everything; on the other hand
 * it is much faster as it uses platform-optimized code.
 */
function nativeSanitize(source: string): string {
  const el = document.createElement('span');
  el.textContent = source;
  return el.innerHTML;
}

const ansiPrefix = '\x1b';

/**
 * Minimum number of characters an incremental auto-linking step advances by;
 * each step extends to the first safe break point (see `autoLinkBreak` and
 * `autoLinkPathBreak`) at or after this offset. Advancing by a sizable stride rather than a single word
 * amortizes the per-step overhead - cache lookup, prefix verification and
 * node-array copying - over much more text; the per-frame time budget still
 * decides how many steps run in one frame.
 */
const AUTO_LINK_STRIDE = 8192;

/**
 * Matches a whitespace character preceded by a non-space character - a safe
 * point to split text for incremental auto-linking, as a URL never spans
 * whitespace. The `g` flag makes `lastIndex` the search start position,
 * letting the search begin at `AUTO_LINK_STRIDE` without slicing the string
 * (the lookbehind may inspect characters before `lastIndex`).
 */
const autoLinkBreak = /(?<=\S)\s/g;

/**
 * The break point used when path auto-linking is enabled: only a line break
 * is safe then, because a path link can span spaces within a line - the
 * Python traceback locator in `File "/path/to/a.py", line 1` is part of the
 * link - but no link spans a line break.
 */
const autoLinkPathBreak = /\n/g;

/**
 * Enum used exclusively for static analysis to ensure that each
 * branch in `renderFrame` leads to explicit rendering decision.
 */
enum RenderingResult {
  stop,
  delay,
  continue
}

/**
 * How a render frame was invoked; decides which scheduling gates apply
 * and what time budget the frame runs with.
 */
enum FrameInvocation {
  /**
   * A regular animation frame: subject to the visibility gate and to the
   * round-robin render queue (both reserved for on-screen hosts).
   */
  animation,
  /**
   * Forced by the first-paint fallback watchdog under animation-frame
   * starvation: bypasses all gates (see `armFallbackWatchdog`).
   */
  forced,
  /**
   * A background slice delivered during browser idle time to a host which has
   * painted but is off-screen: bypasses the gates and runs with the budget
   * derived from the idle deadline (see `scheduleIdleRendering`).
   */
  idle
}

/**
 * Renders one frame of an incremental render and reports the decision taken.
 */
type FrameRenderer = (
  timestamp: number,
  invocation?: FrameInvocation,
  budget?: number
) => RenderingResult;

/**
 * Upper bound (in milliseconds) for the adaptive per-frame auto-linking
 * budget.
 *
 * The default 10ms budget assumes frames are otherwise cheap. For very large
 * outputs the browser-side cost of a frame - style recalculation, layout and
 * paint of the content shifted by the newly inserted nodes - can reach
 * hundreds of milliseconds, and the total rendering cost is then governed by
 * the *number* of frames rather than the work done in each. When that happens
 * the budget is scaled up towards the observed frame overhead (capped here),
 * so that expensive layout passes are paid fewer times; outputs with cheap
 * frames keep the responsive default.
 */
const MAX_FRAME_BUDGET = 200;

/**
 * Maximum number of characters per tail segment in the live render DOM.
 *
 * The not-yet-linkified remainder ("tail") of an output is kept as a series of
 * separate nodes so that consuming text from its front - which happens on
 * every frame - only touches nodes of bounded size, instead of rewriting one
 * huge text node whose layout cost would be proportional to everything that
 * remains.
 */
const TAIL_SEGMENT_MAX = 16384;

/**
 * A segment of the not-yet-linkified tail in the live render DOM.
 */
interface ITailSegment {
  /**
   * The live node: Text, or an ANSI-colored `<span>` piece, so the tail shows
   * source formatting before it has been linkified.
   */
  node: Text | HTMLSpanElement;
  /**
   * The number of characters the node is expected to hold. Compared against
   * the actual length before the segment is touched: a mismatch means another
   * component (e.g. search highlighting) mutated it, which triggers a rebuild
   * of the tail region of the live DOM (see `rebuildTail` in `renderTextual`;
   * the committed region is preserved, along with any highlights on it).
   */
  length: number;
}

/**
 * Live DOM state of an incrementally rendered output, kept per host across
 * frames and across renders (i.e. stream chunks).
 *
 * The `<pre>` holds two regions: `[0, committedLength)` is merged, linkified
 * content which is never touched again - so e.g. search highlights applied to
 * it survive subsequent frames - and the tail segments cover
 * `[committedLength, fullText.length)` with source-formatted plain text. Each
 * frame consumes segments from the front of the tail and replaces them with
 * merged (linkified) nodes appended to the committed region; per-frame DOM
 * work is thereby proportional to the text processed in that frame, not to
 * the total size of the output.
 */
interface ILiveRenderState {
  /**
   * The live `<pre>` element, child of the host.
   */
  pre: HTMLPreElement;
  /**
   * The full source text (as rendered, i.e. with ANSI codes stripped) that
   * the live DOM represents.
   */
  fullText: string;
  /**
   * Number of characters (from the start) covered by committed - merged and
   * linkified - content.
   */
  committedLength: number;
  /**
   * Tail segments; entries before `tailIndex` are already consumed.
   */
  tail: ITailSegment[];
  /**
   * Index of the first tail segment not yet consumed.
   */
  tailIndex: number;
}

/**
 * Create a detached copy of the `[from, to)` character range of a shallow
 * node (Text, or an ANSI `<span>`, whose attributes are preserved).
 */
function sliceNodePiece(
  node: Text | HTMLSpanElement,
  from: number,
  to: number
): Text | HTMLSpanElement {
  const text = (node.textContent ?? '').slice(from, to);
  if (node instanceof Text) {
    return document.createTextNode(text);
  }
  const piece = node.cloneNode(false) as HTMLSpanElement;
  piece.textContent = text;
  return piece;
}

/**
 * Build detached tail segments covering the `[from, to)` character range of
 * the pristine source `<pre>`, splitting anything larger than
 * `TAIL_SEGMENT_MAX`.
 */
function buildTailSegments(
  sourcePre: HTMLPreElement,
  from: number,
  to: number
): ITailSegment[] {
  const segments: ITailSegment[] = [];
  let offset = 0;
  for (const child of sourcePre.childNodes) {
    if (offset >= to) {
      break;
    }
    // Only Text and `<span>` nodes are present after sanitization.
    const node = child as Text | HTMLSpanElement;
    const length = node.textContent?.length ?? 0;
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + length);
    for (let at = start; at < end; at += TAIL_SEGMENT_MAX) {
      const pieceEnd = Math.min(end, at + TAIL_SEGMENT_MAX);
      segments.push({
        node: sliceNodePiece(node, at - offset, pieceEnd - offset),
        length: pieceEnd - at
      });
    }
    offset += length;
  }
  return segments;
}

/**
 * Render the textual representation into a host node.
 *
 * Implements the shared logic for `renderText` and `renderError`.
 */
function renderTextual(
  options: renderText.IRenderOptions,
  autoLinkOptions: IAutoLinkOptions
): Promise<void> {
  // Unpack the options.
  const { host, sanitizer, source } = options;

  // Settle the completion promise of any previous render for this host - it is
  // being superseded by this call.
  Private.settleRender(host);

  // Escape hatch: when incremental auto-linking is disabled, render
  // synchronously in a single pass (legacy behavior). Links then appear
  // together with the text at first paint, at the cost of blocking on large
  // outputs. Disabling incremental auto-linking thus also disables incremental
  // rendering. Useful as a fallback and to benchmark the incremental pipeline.
  if (sanitizer.getIncrementalAutolink?.() === false) {
    // Abort any incremental rendering that may be in-flight for this host
    // (e.g. if the setting was toggled mid-stream) before rendering synchronously.
    Private.abortRendering(host);
    renderTextualSync(options, autoLinkOptions);
    return Promise.resolve();
  }

  // Completion promise: resolves once this render has finished (reached
  // `stopRendering`) or has been superseded by a later render. `renderError`
  // awaits it before resolving file-path links, which requires the anchors to
  // already be present in the DOM.
  let resolveRendered!: () => void;
  const rendered = new Promise<void>(resolve => {
    resolveRendered = resolve;
  });
  Private.registerRenderResolver(host, resolveRendered);

  // We want to only manipulate DOM once per animation frame whether
  // the autolink is enabled or not, because a stream can also choke
  // rendering pipeline even if autolink is disabled. This acts as
  // an effective debouncer which matches the refresh rate of the
  // screen.
  Private.cancelRenderingRequest(host);

  // Stop rendering after 36000 frames: 10 minutes for a visible output
  // (animation frames, assuming 60 Hz); up to an hour for an out-of-view one
  // (background-tier slices arrive at most every 100ms in the idle fallback,
  // see `idleFallbackPeriod`).
  const maxIterations = 60 * 60 * 10;
  let iteration = 0;

  let fullPreTextContent: string | null = null;
  let pre: HTMLPreElement;

  // Auto-linking progress, carried across frames: the already-linkified prefix,
  // the remaining text, and the linkified nodes produced so far. Persisting
  // these in the closure (rather than re-deriving them from the auto-link
  // cache on every step and frame) guarantees strictly monotonic progress -
  // without it, a frame whose budget is exhausted by a single step over a
  // large trailing node (e.g. a huge whitespace-free token) would redo exactly
  // the same work on the next frame, forever - and avoids paying a
  // full-prefix cache validation per step. The cache is still consulted once,
  // on the first working frame, to reuse the results of a previous render for
  // this host (i.e. the preceding stream chunk).
  //
  // Aliasing contract for `linkedNodes`: these nodes are NEVER placed in the
  // DOM - `mergeNodes` receives clones of them - so they stay pristine while
  // components like search highlighting mutate the rendered DOM. The cache
  // entry written at the end of each frame may therefore alias them without
  // cloning: both are only ever read by this renderer.
  let autoLinkSeeded = false;
  let alreadyAutoLinked = '';
  let toBeAutoLinked = '';
  let linkedNodes: (HTMLAnchorElement | Text)[] = [];

  // The live DOM state this render commits into (see `ILiveRenderState`),
  // established (adopted from the previous render, or built fresh) on the
  // first working frame.
  let liveState: ILiveRenderState | null = null;

  // Commit cursor into `linkedNodes`: everything before
  // (`workingIndex`, `workingOffset`) has been committed to the live DOM.
  // The offset may sit at the current end of a node: a committed Text node
  // can still grow afterwards (adjacent-Text join in the step loop), in which
  // case the next commit resumes inside it.
  let workingIndex = 0;
  let workingOffset = 0;

  // When the previous animation frame of this render finished its work (in
  // the `performance.now()` time domain). The gap between it and the next
  // frame's timestamp estimates the browser-side (style/layout/paint) cost
  // per frame, which drives the adaptive budget (see `MAX_FRAME_BUDGET`).
  let lastFrameEnd = 0;

  // Number of frames for which rendering has been delayed because the host is
  // not yet attached to the DOM (see the `!host.isConnected` handling below).
  // Bounded so that a host that is disposed before ever attaching does not keep
  // an animation-frame/watchdog loop alive indefinitely.
  let disconnectedAttempts = 0;
  const maxDisconnectedAttempts = 1000;

  // Observe visibility (lazily - one persistent observer per host, not one per
  // render, which with streamed outputs would mean one per chunk): rendering is
  // deprioritized while the output is off-screen - work continues in the
  // background (idle) tier at a reduced rate rather than competing with
  // visible outputs for animation frames - and the observer promotes the host
  // back as soon as it returns into view. Until the asynchronous observer
  // callback first delivers, visibility is optimistically assumed (see
  // `isHostVisible`) so the first paint is not held back.
  Private.observeVisibility(host);

  const stopRendering = () => {
    // Remove the host from rendering queue. The visibility observer is left in
    // place - it is persistent per host (see `observeVisibility`), so that
    // subsequent renders (e.g. further stream chunks) reuse it.
    Private.removeFromQueue(host);
    // Clear the first-paint watchdog: rendering is over for this host, so
    // there is nothing left to force-paint. On paths that painted this is a
    // no-op (the watchdog is cleared on first paint); it matters for renders
    // which stop without ever painting (a host discarded before being
    // attached), where a stale watchdog would otherwise keep re-arming its
    // timer - and strongly referencing the host - for as long as animation
    // frames keep being produced.
    Private.clearFallbackWatchdog(host);
    // Resolve the completion promise now that rendering has finished.
    Private.settleRender(host);
    return RenderingResult.stop;
  };

  // Schedule the next frame on the tier matching the current visibility:
  // off-screen hosts which have already painted are parked in the background
  // (idle) tier where they keep making progress during browser idle time;
  // everything else (visible hosts, and hosts awaiting their first paint or
  // attachment) goes through the animation-frame render queue.
  const scheduleNextFrame = () => {
    if (!Private.isHostVisible(host) && Private.hasPainted(host)) {
      Private.scheduleIdleRendering(host, renderFrame);
    } else {
      Private.scheduleRendering(host, renderFrame);
    }
  };

  const continueRendering = () => {
    iteration += 1;
    scheduleNextFrame();
    return RenderingResult.continue;
  };

  const delayRendering = () => {
    scheduleNextFrame();
    return RenderingResult.delay;
  };

  // ---------------------------------------------------------------------
  // Live DOM commit (append-only).
  //
  // Frames advance the auto-linking progress (`alreadyAutoLinked` /
  // `linkedNodes`); the functions below transfer that progress into the live
  // DOM by consuming source-formatted tail segments and replacing them with
  // merged (linkified) nodes. Committed content is never touched again, so
  // per-frame DOM work is proportional to the frame's progress - and foreign
  // mutations of the committed region (e.g. search highlights) survive.
  // ---------------------------------------------------------------------

  /**
   * Discard any adopted/previous DOM and rebuild the live `<pre>` from the
   * pristine source: full text as tail segments, nothing committed. The
   * fallback when no previous state exists or its bookkeeping no longer
   * matches the DOM (foreign mutation).
   */
  const freshLiveState = () => {
    const segments = buildTailSegments(pre, 0, fullPreTextContent!.length);
    const live = document.createElement('pre');
    for (const segment of segments) {
      live.appendChild(segment.node);
    }
    Private.withSelectionPreserved(host, [host], () => {
      host.replaceChildren(live);
    });
    liveState = {
      pre: live,
      fullText: fullPreTextContent!,
      committedLength: 0,
      tail: segments,
      tailIndex: 0
    };
    // Everything needs (re-)committing.
    workingIndex = 0;
    workingOffset = 0;
    Private.setLiveRenderState(host, liveState);
  };

  /**
   * Adopt the live DOM left by the previous render of this host (the
   * preceding stream chunk): trim the committed region back to the seeded
   * progress (the seed re-analyses the trailing cached node, e.g. a URL the
   * new chunk may extend), re-derive tail segments for the trimmed range, and
   * append segments for the newly added text.
   *
   * @returns Whether adoption succeeded; on `false` the caller builds fresh.
   */
  const tryAdoptLiveState = (): boolean => {
    const existing = Private.getLiveRenderState(host);
    if (!existing || existing.pre.parentNode !== host) {
      return false;
    }
    const fullText = fullPreTextContent!;
    // The previous content must be a prefix of the new content; this also
    // vouches for the (unvalidated-by-the-cache) tail region.
    if (!fullText.startsWith(existing.fullText)) {
      return false;
    }
    const seededLength = alreadyAutoLinked.length;
    if (seededLength > existing.committedLength) {
      return false;
    }
    if (seededLength === 0 && existing.committedLength > 0) {
      // Nothing usable was seeded (e.g. the chunk boundary fell inside the
      // only, link-free text node, dropping the whole cache - the shape of
      // partial-line progress streams): adoption would trim away the entire
      // committed region node by node only to re-derive it as pristine
      // segments. A fresh rebuild produces the identical result with a
      // single `replaceChildren`, so let the caller do that instead.
      return false;
    }

    // Plan the trim-back: walk backward from the end of the committed region
    // collecting whole nodes until exactly `committedLength - seededLength`
    // characters are covered. Merged nodes never cross working-node
    // boundaries, and the trim boundary is a working-node boundary, so the
    // walk must land exactly; landing mid-node means the DOM was mutated in
    // an unexpected way and we rebuild instead.
    const firstTail = existing.tail[existing.tailIndex]?.node ?? null;
    if (firstTail && firstTail.parentNode !== existing.pre) {
      return false;
    }
    let toRemove = existing.committedLength - seededLength;
    const removals: ChildNode[] = [];
    let cursor = firstTail ? firstTail.previousSibling : existing.pre.lastChild;
    while (toRemove > 0) {
      if (!cursor) {
        return false;
      }
      const length = cursor.textContent?.length ?? 0;
      if (length > toRemove) {
        return false;
      }
      removals.push(cursor);
      toRemove -= length;
      cursor = cursor.previousSibling;
    }

    // Re-derive source-formatted segments for the trimmed range and build
    // segments for the appended text, both from the pristine new parse.
    const trimmedSegments = buildTailSegments(
      pre,
      seededLength,
      existing.committedLength
    );
    const appendedSegments = buildTailSegments(
      pre,
      existing.fullText.length,
      fullText.length
    );
    Private.withSelectionPreserved(existing.pre, removals, () => {
      for (const node of removals) {
        existing.pre.removeChild(node);
      }
      for (const segment of trimmedSegments) {
        existing.pre.insertBefore(segment.node, firstTail);
      }
      for (const segment of appendedSegments) {
        existing.pre.appendChild(segment.node);
      }
    });
    existing.tail = [
      ...trimmedSegments,
      ...existing.tail.slice(existing.tailIndex),
      ...appendedSegments
    ];
    existing.tailIndex = 0;
    existing.committedLength = seededLength;
    existing.fullText = fullText;
    liveState = existing;
    // The seeded working nodes cover exactly the committed region: position
    // the commit cursor at their end (inside the last node, so that it can
    // still grow via joins).
    if (linkedNodes.length > 0) {
      workingIndex = linkedNodes.length - 1;
      workingOffset = linkedNodes[workingIndex].textContent!.length;
    } else {
      workingIndex = 0;
      workingOffset = 0;
    }
    return true;
  };

  const ensureLiveState = () => {
    if (!liveState && !tryAdoptLiveState()) {
      freshLiveState();
    }
  };

  /**
   * Collect clones of the working nodes covering the next `chars` characters,
   * advancing the commit cursor. The DOM must only ever receive clones - see
   * the aliasing contract on `linkedNodes`.
   */
  const takeWorkingSlice = (chars: number): (HTMLAnchorElement | Text)[] => {
    const slice: (HTMLAnchorElement | Text)[] = [];
    while (chars > 0) {
      let node = linkedNodes[workingIndex];
      // Skip nodes consumed to their current end.
      while (workingOffset >= node.textContent!.length) {
        workingIndex += 1;
        workingOffset = 0;
        node = linkedNodes[workingIndex];
      }
      const available = node.textContent!.length - workingOffset;
      const used = Math.min(chars, available);
      if (workingOffset === 0 && used === node.textContent!.length) {
        slice.push(node.cloneNode(true) as HTMLAnchorElement | Text);
      } else {
        // Partial pieces are always Text: anchors are never split by commit
        // boundaries (commits end on working-node boundaries) and only Text
        // nodes grow via joins.
        slice.push(
          document.createTextNode(
            node.textContent!.slice(workingOffset, workingOffset + used)
          )
        );
      }
      workingOffset += used;
      chars -= used;
    }
    return slice;
  };

  /**
   * Commit the auto-linking progress made since the last commit into the live
   * DOM: validate and consume the tail segments covering the newly linkified
   * range, merge them with the corresponding working nodes, and insert the
   * merged nodes in their place.
   *
   * @returns `false` when the tracked nodes no longer match the DOM (foreign
   * mutation, e.g. search highlighting splitting or normalizing them); the
   * caller then rebuilds via `freshLiveState` and retries.
   */
  const tryCommit = (): boolean => {
    const state = liveState;
    if (!state || state.pre.parentNode !== host) {
      return false;
    }
    const upTo = alreadyAutoLinked.length;
    const take = upTo - state.committedLength;
    if (take <= 0) {
      return true;
    }

    // Plan: validate and gather the tail segments covering the committed
    // range, without mutating anything yet.
    const whole: ITailSegment[] = [];
    let boundary: ITailSegment | null = null;
    let boundaryTake = 0;
    let index = state.tailIndex;
    let remaining = take;
    while (remaining > 0) {
      const segment = state.tail[index];
      if (
        !segment ||
        segment.node.parentNode !== state.pre ||
        (segment.node.textContent?.length ?? 0) !== segment.length
      ) {
        return false;
      }
      if (remaining >= segment.length) {
        whole.push(segment);
        remaining -= segment.length;
        index += 1;
      } else {
        boundary = segment;
        boundaryTake = remaining;
        remaining = 0;
      }
    }

    const linkedSlice = takeWorkingSlice(take);
    const touched: Node[] = whole.map(segment => segment.node);
    if (boundary) {
      touched.push(boundary.node);
    }
    const insertBeforeNode = boundary
      ? boundary.node
      : (state.tail[index]?.node ?? null);

    Private.withSelectionPreserved(state.pre, touched, () => {
      // Detach the consumed segments; they become the source-formatting side
      // of the merge (mutating them is fine - they are being replaced).
      const preNodes: (Text | HTMLSpanElement)[] = [];
      for (const segment of whole) {
        state.pre.removeChild(segment.node);
        preNodes.push(segment.node);
      }
      if (boundary) {
        preNodes.push(sliceNodePiece(boundary.node, 0, boundaryTake));
        // Shrink the live boundary segment in place.
        boundary.node.textContent = (boundary.node.textContent ?? '').slice(
          boundaryTake
        );
        boundary.length -= boundaryTake;
      }
      const merged = mergeNodes(preNodes, linkedSlice);
      for (const child of Array.from(merged.childNodes)) {
        state.pre.insertBefore(child, insertBeforeNode);
      }
    });

    state.tailIndex = index;
    state.committedLength = upTo;
    return true;
  };

  /**
   * Rebuild only the tail (not-yet-committed) region of the live DOM from
   * the pristine source, leaving the committed region - and any foreign
   * decorations applied to it, such as search highlights - untouched.
   *
   * This is the recovery for commit-time validation failures: those are
   * caused by another component mutating *tail* nodes (splitting, wrapping
   * or normalizing them), and the committed region - which the renderer
   * never touches after committing - needs no rebuilding. The walk verifies
   * that the committed region still holds exactly the first
   * `committedLength` characters of the source, so the recovery cannot
   * produce an inconsistent output.
   *
   * @returns Whether the tail was rebuilt; `false` when the committed region
   * no longer checks out (its text was altered, or a foreign element spans
   * the committed/tail boundary), in which case the caller falls back to a
   * full rebuild.
   */
  const rebuildTail = (): boolean => {
    const state = liveState;
    if (!state || state.pre.parentNode !== host) {
      return false;
    }
    // Find the DOM position where the committed region ends, verifying its
    // content along the way. Foreign mutations may have split or merged
    // (`normalize()`) text nodes, so the boundary is located by character
    // count rather than through tracked nodes.
    const committed = state.committedLength;
    let offset = 0;
    let node: ChildNode | null = state.pre.firstChild;
    let firstTail: ChildNode | null = node;
    while (offset < committed) {
      if (!node) {
        return false;
      }
      const text = node.textContent ?? '';
      if (offset + text.length <= committed) {
        if (!state.fullText.startsWith(text, offset)) {
          return false;
        }
        offset += text.length;
        node = node.nextSibling;
        firstTail = node;
      } else {
        // The boundary falls inside this node. A Text node can be split
        // exactly at it (without affecting rendering or highlights); an
        // element spanning the boundary (e.g. a highlight of a match
        // crossing it) makes the boundary ambiguous.
        if (!(node instanceof Text)) {
          return false;
        }
        const take = committed - offset;
        if (
          state.fullText.slice(offset, committed) !== node.data.slice(0, take)
        ) {
          return false;
        }
        firstTail = node.splitText(take);
        offset = committed;
      }
    }
    // Replace everything past the boundary with pristine tail segments.
    const segments = buildTailSegments(pre, committed, state.fullText.length);
    const removals: ChildNode[] = [];
    for (let n: ChildNode | null = firstTail; n !== null; n = n.nextSibling) {
      removals.push(n);
    }
    Private.withSelectionPreserved(state.pre, removals, () => {
      for (const n of removals) {
        state.pre.removeChild(n);
      }
      for (const segment of segments) {
        state.pre.appendChild(segment.node);
      }
    });
    state.tail = segments;
    state.tailIndex = 0;
    return true;
  };

  /**
   * Run `tryCommit`, translating a thrown error (the DOM diverged from the
   * bookkeeping in a way the commit validation did not anticipate) into a
   * `false` return so that the caller can recover.
   */
  const attemptCommit = (): boolean => {
    try {
      return tryCommit();
    } catch (error) {
      // Never leave the output wedged: the caller rebuilds.
      console.error('Incremental rendering commit failed; recovering.', error);
      return false;
    }
  };

  /**
   * Transfer this frame's progress into the live DOM. When the bookkeeping
   * no longer matches the DOM (another component mutated it - e.g. search
   * highlighting splitting, wrapping or normalizing text nodes), recover by
   * rebuilding only the tail, which preserves the committed region and any
   * highlights applied to it; fall back to a full rebuild when even the
   * committed region no longer checks out.
   */
  const commitProgress = () => {
    ensureLiveState();
    if (attemptCommit()) {
      return;
    }
    let tailRebuilt = false;
    try {
      tailRebuilt = rebuildTail();
    } catch (error) {
      console.error('Incremental tail rebuild failed.', error);
    }
    if (tailRebuilt && attemptCommit()) {
      return;
    }
    freshLiveState();
    attemptCommit();
  };

  const renderFrame: FrameRenderer = (
    timestamp: number,
    invocation: FrameInvocation = FrameInvocation.animation,
    budget: number = 10
  ): RenderingResult => {
    if (!host.isConnected) {
      // The host is not in the DOM. Note that even in full windowing notebook
      // mode the output nodes are never removed; instead the cell gets hidden
      // (usually with `display: none`, or for the active cell via opacity), so
      // it stays connected. A disconnected host therefore means one of:
      // - it has not been attached yet (the notebook is still being laid out,
      //   which under load can outlast the first scheduled frame or the fallback
      //   watchdog) - in which case we must wait rather than give up, otherwise
      //   the first paint is lost while the synchronously-rendered siblings
      //   (HTML/Markdown) still appear;
      // - it has already painted and was then detached (e.g. the cell was
      //   removed) - in which case we stop.
      if (!Private.hasPainted(host)) {
        if (disconnectedAttempts < maxDisconnectedAttempts) {
          disconnectedAttempts += 1;
          return delayRendering();
        }
        // Give up eventually so a host disposed before ever attaching does not
        // keep the render loop alive forever.
      }
      return stopRendering();
    }

    // Gates applied to regular animation frames only:
    // - if the output is not visible (scrolled away in full windowed notebook
    //   mode), park it in the background tier: `delayRendering` re-schedules
    //   through `scheduleNextFrame`, which sends off-screen hosts to the idle
    //   tier where they keep making progress during browser idle time instead
    //   of competing with visible outputs for animation frames;
    // - otherwise wait for this host's round-robin turn in the render queue.
    // Note: cannot use `checkVisibility` as it triggers style recalculation
    // before we appended the new nodes from the stream, which leads to layout
    // trashing. Instead we use intersection observer.
    // The visibility gate is only applied once the host has been painted at
    // least once: before the first paint the host has no content and, because
    // `RenderedText` sets `contain: style layout`, collapses to zero height,
    // which the intersection observer reports as not intersecting even when the
    // output is within the viewport. Gating the first paint on the observer
    // would therefore deadlock (never paint -> stays zero height -> never
    // reported visible). This matches the documented intent that the first
    // paint is not held back; only subsequent work (auto-linking, stream
    // updates) is deprioritized while the output is off-screen.
    //
    // A `forced` frame (delivered by the fallback watchdog because animation
    // frames are starved) bypasses both gates entirely: the render queue
    // distributes work across animation frames to avoid janky frames, but that
    // is moot when frames are not being produced, and letting the queue rotate
    // this host past its turn would defeat the very purpose of the fallback
    // (see `armFallbackWatchdog`). An `idle` slice likewise bypasses them: it
    // exists precisely to run work for off-screen hosts, outside the queue.
    if (
      invocation === FrameInvocation.animation &&
      ((!Private.isHostVisible(host) && Private.hasPainted(host)) ||
        !Private.canRenderInFrame(timestamp, host))
    ) {
      return delayRendering();
    }

    const start = performance.now();
    // Scale the budget towards the observed per-frame overhead: for very
    // large outputs the browser-side frame cost (style/layout/paint of the
    // content shifted by the insertions) dwarfs the default budget, and the
    // total cost is then governed by the number of frames. Batching more
    // progress into each frame when frames are expensive anyway means paying
    // for fewer layout passes; cheap frames keep the responsive default.
    // The gap since `lastFrameEnd` measures that overhead only when this host
    // rendered in the immediately preceding frame (`lastFrameEnd` at or after
    // that frame's start); otherwise it is dominated by other hosts' turns in
    // the round-robin queue - or by time this host spent parked off-screen -
    // and is ignored, so concurrently rendering outputs cannot escalate each
    // other's budgets (see `previousFrameTime`). `MAX_FRAME_BUDGET` bounds
    // the cost of a single expensive layout.
    let frameBudget = budget;
    if (
      invocation === FrameInvocation.animation &&
      lastFrameEnd > 0 &&
      lastFrameEnd >= Private.previousFrameTime()
    ) {
      const overhead = timestamp - lastFrameEnd;
      frameBudget = Math.min(MAX_FRAME_BUDGET, Math.max(budget, overhead));
    }
    Private.beginRendering(host);
    // Record that this host has been painted so that subsequent frames (updates
    // and auto-linking passes) are not treated as a first paint. From here on we
    // are committed to writing to the DOM in this frame.
    Private.markPainted(host);
    // The plain text is about to be shown; the starvation watchdog is no longer
    // needed for this host.
    Private.clearFallbackWatchdog(host);

    if (fullPreTextContent === null) {
      const hasAnsiPrefix = source.includes(ansiPrefix);

      // Create the HTML content:
      // If no ANSI codes are present use a fast path for escaping.
      const content = hasAnsiPrefix
        ? sanitizer.sanitize(Private.ansiSpan(source), {
            allowedTags: ['span']
          })
        : nativeSanitize(source);

      // Set the sanitized content for the host node.
      pre = document.createElement('pre');
      pre.innerHTML = content;

      const maybePreTextContent = pre.textContent;

      if (!maybePreTextContent) {
        // Short-circuit if there is no content to auto-link
        host.replaceChildren(pre);
        return stopRendering();
      }
      fullPreTextContent = maybePreTextContent;
    }

    const shouldAutoLink = sanitizer.getAutolink?.() ?? true;

    if (!shouldAutoLink) {
      host.replaceChildren(pre.cloneNode(true));
      return stopRendering();
    }
    const cacheStore = Private.getCacheStore(autoLinkOptions);
    if (!autoLinkSeeded) {
      // First working frame: seed the progress from the auto-link cache left
      // by a previous render for this host (the preceding stream chunk), if
      // it is applicable to the current text. Subsequent frames continue from
      // the closure state instead of consulting the cache again.
      const applicableCache = getApplicableLinkCache(
        cacheStore.get(host),
        fullPreTextContent
      );
      alreadyAutoLinked = applicableCache ? applicableCache.processedText : '';
      toBeAutoLinked = applicableCache
        ? applicableCache.addedText
        : fullPreTextContent;
      // The previous render's nodes are dead (it can no longer run), so they
      // can be adopted as this render's working nodes without cloning.
      linkedNodes = applicableCache ? applicableCache.cachedNodes : [];
      autoLinkSeeded = true;
      // Establish the live DOM now, while `alreadyAutoLinked` still equals
      // the seeded progress: adoption trims the committed region back to
      // exactly this point, before the steps below advance it.
      ensureLiveState();
    }
    let moreWorkToBeDone: boolean;
    let elapsed: number;
    // Defensive only: the loop below runs synchronously, so nothing can
    // schedule a new frame while it is executing - a new stream chunk
    // supersedes this render between frames instead (`renderTextual` cancels
    // the pending frame request). Kept as a cheap safeguard in case a future
    // change lets other code run mid-loop (e.g. yielding to the event loop).
    let newRequest: number | undefined;

    // The step break point: a place no link can span, so that splitting there
    // cannot cut a link in two. With web links only, any whitespace qualifies;
    // with path links a line break is required, because a path link can span
    // spaces within a line (the `", line 1` locator of a Python traceback).
    const stepBreak = autoLinkOptions.checkPaths
      ? autoLinkPathBreak
      : autoLinkBreak;

    do {
      // Find a safe break point at or after the stride, so that each step
      // advances by at least `AUTO_LINK_STRIDE` characters.
      stepBreak.lastIndex = AUTO_LINK_STRIDE;
      const breakMatch = stepBreak.exec(toBeAutoLinked);
      const breakIndex = breakMatch ? breakMatch.index : -1;

      const before =
        breakIndex === -1
          ? toBeAutoLinked
          : toBeAutoLinked.slice(0, breakIndex);
      const after = breakIndex === -1 ? '' : toBeAutoLinked.slice(breakIndex);

      // Linkify only this step's text and append to the running node list.
      // Steps always split at a break point no link can span (see
      // `stepBreak`), so the nodes from earlier steps stay valid as-is;
      // adjacent Text nodes are merged to avoid unbounded fragmentation. (The seed boundary - where a
      // new stream chunk may extend a URL from the previous chunk - is the one
      // place a node can be invalidated, and is handled by
      // `getApplicableLinkCache` when seeding above.)
      const newAdditions = autolink(before, autoLinkOptions);
      const lastNode = linkedNodes[linkedNodes.length - 1];
      const firstNew = newAdditions[0];
      if (lastNode instanceof Text && firstNew instanceof Text) {
        lastNode.data += firstNew.data;
        linkedNodes.push(...newAdditions.slice(1));
      } else {
        linkedNodes.push(...newAdditions);
      }

      alreadyAutoLinked += before;
      toBeAutoLinked = after;
      moreWorkToBeDone = toBeAutoLinked != '';
      elapsed = performance.now() - start;
      newRequest = Private.hasNewRenderingRequest(host);
    } while (elapsed < frameBudget && moreWorkToBeDone && !newRequest);

    // Persist this frame's progress for the next render of this host (i.e.
    // the next stream chunk). No cloning: per the aliasing contract on
    // `linkedNodes`, the working nodes never enter the DOM, so nothing outside
    // this renderer (e.g. search highlighting, which mutates the rendered DOM)
    // can touch them. The entry is consistent whenever it can be read - it is
    // rewritten at the end of every frame, and reads only happen between
    // frames.
    cacheStore.set(host, {
      preTextContent: alreadyAutoLinked,
      linkedNodes
    });

    // Note: we set `keepExisting` to `true` in `IRenderMime.IRenderer`s which
    // use this method to ensure that the previous node is not removed from DOM
    // when new chunks of data comes from the stream.
    commitProgress();

    if (invocation === FrameInvocation.animation) {
      lastFrameEnd = performance.now();
    }

    // Continue unless:
    // - no more text needs to be linkified,
    // - new stream part was received (and new request sent),
    // - maximum iterations limit was exceeded,
    if (moreWorkToBeDone && !newRequest && iteration < maxIterations) {
      return continueRendering();
    } else {
      return stopRendering();
    }
  };

  // Schedule the first paint through the normal animation-frame render queue.
  Private.scheduleRendering(host, renderFrame);

  // Until the host has painted, keep a watchdog that force-paints it if
  // `requestAnimationFrame` turns out to be starved (background tab or heavy
  // resource pressure), so the plain text is shown even when frames stop being
  // produced. The watchdog only fires under genuine starvation - while frames
  // are still being produced it simply lets the render queue deliver this host
  // in due course (see `armFallbackWatchdog`). Subsequent frames (auto-linking
  // passes, stream updates) rely on animation frames and idle slices alone, so
  // auto-linking naturally backs off under resource pressure rather than
  // competing for it.
  //
  // The callback returns `true` when the host still needs watching (the forced
  // frame could not paint yet because the host is not attached), so the watchdog
  // keeps trying until the host attaches and paints.
  if (!Private.hasPainted(host)) {
    Private.armFallbackWatchdog(
      host,
      () =>
        renderFrame(performance.now(), FrameInvocation.forced) ===
        RenderingResult.delay
    );
  }

  return rendered;
}

/**
 * Render the textual representation synchronously in a single pass.
 *
 * This is the legacy (non-incremental) rendering path, used when incremental
 * rendering is disabled via the sanitizer settings. It produces the same final
 * DOM as `renderTextual`, but without spreading the work across animation
 * frames - so it blocks the main thread for the duration of the render and does
 * not preserve selection while streaming.
 */
function renderTextualSync(
  options: renderText.IRenderOptions,
  autoLinkOptions: IAutoLinkOptions
): void {
  const { host, sanitizer, source } = options;

  const hasAnsiPrefix = source.includes(ansiPrefix);

  // Create the HTML content:
  // If no ANSI codes are present use a fast path for escaping.
  const content = hasAnsiPrefix
    ? sanitizer.sanitize(Private.ansiSpan(source), {
        allowedTags: ['span']
      })
    : nativeSanitize(source);

  const pre = document.createElement('pre');
  pre.innerHTML = content;

  const preTextContent = pre.textContent;
  const shouldAutoLink = sanitizer.getAutolink?.() ?? true;

  if (!preTextContent || !shouldAutoLink) {
    // Nothing to auto-link (or auto-linking is disabled): use the sanitized
    // `<pre>` as-is.
    host.replaceChildren(pre);
    return;
  }

  // Auto-link the whole content in a single pass, reusing the streaming cache -
  // this is what keeps repeated renders of a growing stream from being O(n^2).
  const cacheStore = Private.getCacheStore(autoLinkOptions);
  const linkedNodes = incrementalAutoLink(
    cacheStore,
    options,
    autoLinkOptions,
    preTextContent
  );

  if (linkedNodes.length === 1 && linkedNodes[0] instanceof Text) {
    // No links were found; use the sanitized `<pre>` as-is.
    host.replaceChildren(pre);
    return;
  }

  // Persist clones in the cache so that a component mutating the rendered nodes
  // (e.g. search highlighting) cannot corrupt the cache.
  cacheStore.set(host, {
    preTextContent,
    linkedNodes: linkedNodes.map(
      node => node.cloneNode(true) as HTMLAnchorElement | Text
    )
  });

  const preNodes = Array.from(pre.childNodes) as (Text | HTMLSpanElement)[];
  host.replaceChildren(mergeNodes(preNodes, linkedNodes));
}

function incrementalAutoLink(
  cacheStore: WeakMap<HTMLElement, IAutoLinkCacheEntry>,
  options: renderText.IRenderOptions,
  autoLinkOptions: IAutoLinkOptions,
  preFragmentToAutoLink: string
): (HTMLAnchorElement | Text)[] {
  const { host } = options;

  // Note: only text nodes and span elements should be present after sanitization in the `<pre>` element.
  let linkedNodes: (HTMLAnchorElement | Text)[];

  const cache = getApplicableLinkCache(
    cacheStore.get(host),
    preFragmentToAutoLink
  );
  if (cache) {
    const { cachedNodes: fromCache, addedText } = cache;
    const newAdditions = autolink(addedText, autoLinkOptions);
    const lastInCache = fromCache[fromCache.length - 1];
    const firstNewNode = newAdditions[0];

    if (lastInCache instanceof Text && firstNewNode instanceof Text) {
      const joiningNode = lastInCache;
      joiningNode.data += firstNewNode.data;
      linkedNodes = [
        ...fromCache.slice(0, -1),
        joiningNode,
        ...newAdditions.slice(1)
      ];
    } else {
      linkedNodes = [...fromCache, ...newAdditions];
    }
  } else {
    linkedNodes = autolink(preFragmentToAutoLink, autoLinkOptions);
  }
  cacheStore.set(host, {
    preTextContent: preFragmentToAutoLink,
    linkedNodes
  });
  return linkedNodes;
}

/**
 * The namespace for the `renderText` function statics.
 */
export namespace renderText {
  /**
   * The options for the `renderText` function.
   */
  export interface IRenderOptions {
    /**
     * The host node for the text content.
     */
    host: HTMLElement;

    /**
     * The html sanitizer for untrusted source.
     */
    sanitizer: IRenderMime.ISanitizer;

    /**
     * The source text to render.
     */
    source: string;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

interface IAutoLinkCacheEntry {
  preTextContent: string;
  linkedNodes: (HTMLAnchorElement | Text)[];
}

/**
 * Return the information from the cache that can be used given the cache entry and current text.
 * If the cache is invalid given the current text (or cannot be used) `null` is returned.
 */
function getApplicableLinkCache(
  cachedResult: IAutoLinkCacheEntry | undefined,
  preTextContent: string
): {
  cachedNodes: IAutoLinkCacheEntry['linkedNodes'];
  addedText: string;
  processedText: string;
} | null {
  if (!cachedResult) {
    return null;
  }
  if (preTextContent.length < cachedResult.preTextContent.length) {
    // If the new content is shorter than the cached content
    // we cannot use the cache as we only support appending.
    return null;
  }
  let addedText = preTextContent.substring(cachedResult.preTextContent.length);
  let cachedNodes = cachedResult.linkedNodes;
  const lastCachedNode =
    cachedResult.linkedNodes[cachedResult.linkedNodes.length - 1];
  let processedText = cachedResult.preTextContent;

  // Decide how much of the cache the appended text lets us keep.
  if (
    cachedResult.preTextContent.endsWith('\n') ||
    addedText.startsWith('\n')
  ) {
    // A newline on either side of the join means the appended text cannot
    // extend the last cached node into (or out of) a link - a URL never spans
    // a line break - so every cached node stays valid and we linkify only the
    // addition (this is a no-op, we just continue execution).
  } else if (
    lastCachedNode instanceof Text ||
    lastCachedNode instanceof HTMLAnchorElement
  ) {
    // Otherwise the appended text may merge with the last cached node, so we
    // drop that node and re-analyse its text together with the addition. Every
    // earlier node is shielded by it and stays valid. This covers both a
    // trailing Text node (cached `aaa www.one.com bbb www.` + `two.com`: keep
    // text `aaa ` and anchor `www.one.com`, re-linkify `bbb www.` + `two.com`)
    // and a trailing anchor (cached `www.one.com` + `/path` extends the link,
    // which matters when a stream chunk boundary falls right after a URL).
    cachedNodes = cachedNodes.slice(0, -1);
    addedText = lastCachedNode.textContent + addedText;
    processedText = processedText.slice(0, -lastCachedNode.textContent!.length);
  } else {
    // `linkedNodes` only ever holds Text or anchor nodes, so we reach here only
    // when it is empty (`lastCachedNode` is undefined): nothing to reuse.
    return null;
  }

  // Finally check if text has not changed.
  if (!preTextContent.startsWith(cachedResult.preTextContent)) {
    return null;
  }
  return {
    cachedNodes,
    addedText,
    processedText
  };
}

/**
 * Render error into a host node.
 *
 * @param options - The options for rendering.
 *
 * @returns A promise which resolves when rendering is complete.
 */
export async function renderError(
  options: renderError.IRenderOptions
): Promise<void> {
  // Unpack the options.
  const { host, linkHandler, resolver } = options;

  // Wait for rendering to complete before patching paths: the path anchors must
  // be in the DOM for `handlePaths` to resolve them. In the incremental pipeline
  // rendering happens across animation frames, so this must be awaited.
  await renderTextual(options, {
    checkWeb: true,
    checkPaths: true
  });

  // Patch the paths if a resolver is available.
  if (resolver) {
    await Private.handlePaths(host, resolver, linkHandler);
  }
}

/**
 * Whether two nodes produced by the auto-linker represent the same anchor.
 *
 * Web anchors are identified by `href`; path anchors carry no `href` (the
 * path is resolved asynchronously after rendering) and are identified by
 * their pending path/locator data instead - without this, any two path
 * anchors would compare as equal through their empty `href`.
 */
function isSameAnchor(a: HTMLAnchorElement, b: HTMLAnchorElement): boolean {
  return (
    a.href === b.href &&
    a.dataset.path === b.dataset.path &&
    a.dataset.locator === b.dataset.locator
  );
}

/**
 * Merge `<span>` nodes from a `<pre>` element with `<a>` nodes from linker.
 */
function mergeNodes(
  preNodes: (Text | HTMLSpanElement)[],
  linkedNodes: (Text | HTMLAnchorElement)[]
): HTMLPreElement {
  const ret = document.createElement('pre');
  let inAnchorElement = false;

  const combinedNodes: (HTMLAnchorElement | Text | HTMLSpanElement)[] = [];

  for (let nodes of alignedNodes(preNodes, linkedNodes)) {
    if (!nodes[0]) {
      const node = nodes[1];
      const isAnchor = node.nodeType !== Node.TEXT_NODE;
      const lastCombined = combinedNodes[combinedNodes.length - 1];
      if (
        isAnchor &&
        inAnchorElement &&
        isSameAnchor(
          node as HTMLAnchorElement,
          lastCombined as HTMLAnchorElement
        )
      ) {
        // Continuation of the anchor started by the previous pair: a boundary
        // between source-side nodes (an ANSI span edge, or a tail-segment
        // edge) fell inside the link, so `alignedNodes` yielded the anchor in
        // pieces. Fold this piece's content into the open anchor instead of
        // producing a second, adjacent anchor for the same URL.
        while (node.firstChild) {
          lastCombined.appendChild(node.firstChild);
        }
      } else {
        combinedNodes.push(node);
      }
      inAnchorElement = isAnchor;
      continue;
    } else if (!nodes[1]) {
      combinedNodes.push(nodes[0]);
      inAnchorElement = false;
      continue;
    }
    let [preNode, linkNode] = nodes;

    const lastCombined = combinedNodes[combinedNodes.length - 1];

    // If we are already in an anchor element and the anchor element did not change,
    // we should insert the node from <pre> which is either Text node or coloured span Element
    // into the anchor content as a child
    if (
      inAnchorElement &&
      isSameAnchor(
        linkNode as HTMLAnchorElement,
        lastCombined as HTMLAnchorElement
      )
    ) {
      lastCombined.appendChild(preNode);
    } else {
      // the `linkNode` is either Text or AnchorElement;
      const isAnchor = linkNode.nodeType !== Node.TEXT_NODE;
      // if we are NOT about to start an anchor element, just add the pre Node
      if (!isAnchor) {
        combinedNodes.push(preNode);
        inAnchorElement = false;
      } else {
        // otherwise start a new anchor; the contents of the `linkNode` and `preNode` should be the same,
        // so we just put the neatly formatted `preNode` inside the anchor node (`linkNode`)
        // and append that to combined nodes.
        linkNode.textContent = '';
        linkNode.appendChild(preNode);
        combinedNodes.push(linkNode);
        inAnchorElement = true;
      }
    }
  }
  // Do not reuse `pre` element. Clearing out previous children is too slow...
  for (const child of combinedNodes) {
    ret.appendChild(child);
  }
  return ret;
}

/**
 * The namespace for the `renderError` function statics.
 */
export namespace renderError {
  /**
   * The options for the `renderError` function.
   */
  export interface IRenderOptions {
    /**
     * The host node for the error content.
     */
    host: HTMLElement;

    /**
     * The html sanitizer for untrusted source.
     */
    sanitizer: IRenderMime.ISanitizer;

    /**
     * The source error to render.
     */
    source: string;

    /**
     * An optional url resolver.
     */
    resolver: IRenderMime.IResolver | null;

    /**
     * An optional link handler.
     */
    linkHandler: IRenderMime.ILinkHandler | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * Harden anchor links.
 */
export function hardenAnchorLinks(
  node: HTMLElement,
  resolver?: IRenderMime.IResolver | null
): void {
  // Handle anchor elements.
  const anchors = node.getElementsByTagName('a');
  for (let i = 0; i < anchors.length; i++) {
    const el = anchors[i];
    // skip when processing a elements inside svg
    // which are of type SVGAnimatedString
    if (!(el instanceof HTMLAnchorElement)) {
      continue;
    }
    const path = el.href;
    const isLocal =
      resolver && resolver.isLocal
        ? resolver.isLocal(path)
        : URLExt.isLocal(path);
    // set target attribute if not already present
    if (!el.target) {
      el.target = isLocal ? '_self' : '_blank';
    }
    // set rel as 'noopener' for non-local anchors
    if (!isLocal) {
      el.rel = 'noopener';
    }
  }
}

/**
 * The namespace for module implementation details.
 */
namespace Private {
  let lastFrameTimestamp: number | null = null;

  /**
   * Check if frame rendering can proceed in frame identified by timestamp
   * from the first `requestAnimationFrame` callback argument. This argument
   * is guaranteed to be the same for multiple requests executed on the same
   * frame, which allows to limit number of animations to one per frame,
   * and in turn avoids choking the rendering pipeline by creating tasks
   * longer than the delta between frames.
   *
   * Also, we want to distribute the rendering between outputs to avoid
   * displaying blank space while waiting for the previous output to be fully rendered.
   */
  export function canRenderInFrame(
    timestamp: number,
    host: HTMLElement
  ): boolean {
    if (lastFrameTimestamp !== timestamp) {
      // Progress the round-robin queue: move the current front host to the back.
      const front: HTMLElement | undefined = renderQueue.values().next().value;
      if (front === undefined) {
        throw Error('Render queue cannot be empty here!');
      }
      renderQueue.delete(front);
      renderQueue.add(front);
      lastFrameTimestamp = timestamp;
    }
    // Only the host now at the front of the queue may render in this frame. A
    // `Set` iterates in insertion order, so its first value is the front.
    const next: HTMLElement | undefined = renderQueue.values().next().value;
    return next === host;
  }

  // A `Set` (not an array) so membership, appending, round-robin rotation and
  // removal are all O(1): with an output-heavy notebook every in-flight host
  // re-enqueues each frame, which would be O(n^2) per frame with an array.
  const renderQueue = new Set<HTMLElement>();
  const frameRequests = new WeakMap<HTMLElement, number>();

  /**
   * Timestamp (in the `performance.now()` / animation-frame time domain) at
   * which an animation frame most recently ran. Used by the fallback watchdog to
   * tell genuine `requestAnimationFrame` starvation (background tab, heavy
   * resource pressure) apart from a host simply waiting its turn in the
   * per-frame render queue.
   */
  let lastAnimationFrameTime = 0;

  /**
   * The animation-frame timestamp observed immediately before the most recent
   * one (callbacks of multiple hosts within one frame share a timestamp).
   *
   * Used by the adaptive frame budget: the gap between a host's last
   * frame-end and the current timestamp measures the browser-side rendering
   * overhead of that host's own work only if the host rendered in the
   * immediately preceding frame - that is, its frame-end falls at or after
   * this timestamp. Otherwise the gap is dominated by other hosts' turns in
   * the round-robin queue (or by time the host spent parked off-screen) and
   * must not inflate the budget: concurrently rendering outputs would
   * escalate each other's budgets up to `MAX_FRAME_BUDGET`, trading frame
   * rate for no throughput gain.
   */
  let previousAnimationFrameTime = 0;

  export function previousFrameTime(): number {
    return previousAnimationFrameTime;
  }

  /**
   * Self-rearming fallback watchdogs, one per host awaiting its first paint.
   */
  const fallbackWatchdogs = new WeakMap<HTMLElement, number>();

  /**
   * Arm a watchdog that force-paints an as-yet-unpainted host if animation
   * frames are starved.
   *
   * The watchdog is *not* a plain timeout racing the animation frame: with the
   * per-frame render queue a host may legitimately wait many frames for its
   * turn (e.g. when opening a notebook with many outputs), which is far longer
   * than the fallback delay. Firing unconditionally would therefore force a
   * disruptive burst of out-of-turn paints. Instead, on each tick the watchdog
   * checks whether animation frames are still being produced at all: if they
   * are, it just re-arms and lets the queue deliver this host; only when frames
   * have genuinely stopped does it force a paint.
   *
   * `forcePaint` returns `true` if the host still needs watching afterwards -
   * i.e. the forced frame could not paint yet because the host is not attached -
   * in which case the watchdog re-arms and keeps trying until it attaches.
   */
  export function armFallbackWatchdog(
    host: HTMLElement,
    forcePaint: () => boolean
  ): void {
    clearFallbackWatchdog(host);
    const rearm = () =>
      fallbackWatchdogs.set(
        host,
        window.setTimeout(tick, firstPaintFallbackDelay)
      );
    const tick = () => {
      const framesStarved =
        performance.now() - lastAnimationFrameTime >= firstPaintFallbackDelay;
      if (!framesStarved) {
        // Frames are still being produced; keep watching in case they stop
        // before this host gets its turn in the render queue.
        rearm();
        return;
      }
      fallbackWatchdogs.delete(host);
      // Cancel the pending (starved) animation frame so it does not fire later
      // and re-render on top of the forced paint.
      cancelRenderingRequest(host);
      if (forcePaint()) {
        // The host was not ready to paint (not attached yet); keep watching.
        rearm();
      }
    };
    rearm();
  }

  export function clearFallbackWatchdog(host: HTMLElement): void {
    const timer = fallbackWatchdogs.get(host);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      fallbackWatchdogs.delete(host);
    }
  }

  /**
   * Hosts which have already had their content painted at least once.
   *
   * Used to distinguish a "first paint" - which should be shown as promptly and
   * as resiliently as possible - from a subsequent update or auto-linking pass -
   * which can be throttled to the frame rate.
   */
  const paintedHosts = new WeakSet<HTMLElement>();

  export function hasPainted(host: HTMLElement): boolean {
    return paintedHosts.has(host);
  }

  export function markPainted(host: HTMLElement): void {
    paintedHosts.add(host);
  }

  /**
   * Resolvers for the per-host render completion promise returned by
   * `renderTextual`. A host has at most one in-flight render; its resolver is
   * called (and cleared) when the render finishes or is superseded.
   */
  const renderResolvers = new WeakMap<HTMLElement, () => void>();

  export function registerRenderResolver(
    host: HTMLElement,
    resolve: () => void
  ): void {
    renderResolvers.set(host, resolve);
  }

  /**
   * Resolve and clear the pending render completion promise for a host, if any.
   */
  export function settleRender(host: HTMLElement): void {
    const resolve = renderResolvers.get(host);
    if (resolve) {
      renderResolvers.delete(host);
      resolve();
    }
  }

  /**
   * Delay (in milliseconds) used by the fallback watchdog: if no animation frame
   * has run for at least this long while a host is still awaiting its first
   * paint, the watchdog force-paints it.
   *
   * Animation frames do not fire in background tabs and can be starved by the
   * browser under heavy resource pressure (e.g. when the OS starts swapping);
   * the watchdog ensures the cheap first paint of the plain text is not held
   * back in those cases. It is long enough that normally produced frames keep it
   * from firing, so the fallback only kicks in when frames are genuinely not
   * being produced.
   */
  const firstPaintFallbackDelay = 100;

  export function cancelRenderingRequest(host: HTMLElement) {
    // do not remove from queue - the expectation is that rendering will resume
    const previousRequest = frameRequests.get(host);
    if (previousRequest) {
      window.cancelAnimationFrame(previousRequest);
    }
  }

  export function scheduleRendering(host: HTMLElement, render: FrameRenderer) {
    // The host may have been parked in the background tier (e.g. it is being
    // promoted after scrolling back into view, or a new stream chunk arrived
    // for it): pull it out, it now (re-)enters the animation-frame tier.
    idleQueue.delete(host);
    // Append to the queue; a no-op if the host is already queued, which
    // preserves its current position (a `Set` keeps insertion order).
    renderQueue.add(host);
    const thisRequest = window.requestAnimationFrame(timestamp => {
      // Record that an animation frame ran so the fallback watchdog can
      // distinguish real starvation from queue waiting, and keep the previous
      // distinct timestamp for the adaptive-budget check (see
      // `previousFrameTime`).
      if (timestamp !== lastAnimationFrameTime) {
        previousAnimationFrameTime = lastAnimationFrameTime;
        lastAnimationFrameTime = timestamp;
      }
      cancelRenderingRequest(host);
      render(timestamp, FrameInvocation.animation);
    });
    frameRequests.set(host, thisRequest);
  }

  export function beginRendering(host: HTMLElement) {
    frameRequests.delete(host);
  }

  export function removeFromQueue(host: HTMLElement) {
    renderQueue.delete(host);
    idleQueue.delete(host);
  }

  export function hasNewRenderingRequest(host: HTMLElement) {
    return frameRequests.get(host);
  }

  /**
   * Background (idle) rendering tier: hosts which have painted but are
   * currently off-screen. They keep making progress during browser idle
   * periods instead of competing with visible outputs for animation frames -
   * so scrolling later lands on already-rendered content - while the
   * round-robin `renderQueue` stays reserved for on-screen hosts. Like the
   * render queue, this is a `Set` used as a round-robin queue.
   */
  const idleQueue = new Set<HTMLElement>();

  /**
   * The frame renderer of each host currently parked in the idle tier.
   */
  const idleRenderers = new WeakMap<HTMLElement, FrameRenderer>();

  /**
   * Handle of the pending idle callback (or its timer fallback) driving the
   * idle tier, if any. A single callback serves the whole tier.
   */
  let idlePumpHandle: number | null = null;

  /**
   * Period and per-slice budget (both in milliseconds) of the `setTimeout`
   * fallback used in browsers without `requestIdleCallback` (Safari): the
   * background tier advances for up to 10ms every 100ms, a ~10% duty cycle
   * that keeps off-screen rendering cheap without stalling it entirely.
   */
  const idleFallbackPeriod = 100;
  const idleFallbackBudget = 10;

  /**
   * `requestIdleCallback` with a `setTimeout` fallback emulating a fixed-size
   * idle deadline.
   */
  const requestIdle: (callback: (deadline: IdleDeadline) => void) => number =
    typeof requestIdleCallback === 'function'
      ? callback => requestIdleCallback(callback)
      : callback =>
          window.setTimeout(() => {
            const start = performance.now();
            callback({
              didTimeout: false,
              timeRemaining: () =>
                Math.max(0, idleFallbackBudget - (performance.now() - start))
            });
          }, idleFallbackPeriod);

  /**
   * Park a host in the background (idle) tier, leaving the animation-frame
   * tier if it was in it. Its rendering continues in browser idle time until
   * it completes, or until the host is promoted back (see `promoteFromIdle`)
   * or removed (`removeFromQueue`).
   */
  export function scheduleIdleRendering(
    host: HTMLElement,
    render: FrameRenderer
  ): void {
    renderQueue.delete(host);
    idleQueue.add(host);
    idleRenderers.set(host, render);
    ensureIdlePump();
  }

  /**
   * Promote a host parked in the idle tier back to the animation-frame tier;
   * a no-op if the host is not in the idle tier.
   */
  function promoteFromIdle(host: HTMLElement): void {
    if (!idleQueue.has(host)) {
      return;
    }
    const render = idleRenderers.get(host);
    if (render) {
      scheduleRendering(host, render);
    }
  }

  /**
   * Request an idle callback to drive the idle tier, unless one is already
   * pending or there is nothing to drive.
   *
   * Note that without spare main-thread time the browser may delay the idle
   * callback indefinitely; that is intended - background rendering should
   * yield entirely to whatever is keeping the page busy. Hosts which become
   * visible in the meantime are promoted eagerly by their intersection
   * observers rather than waiting for an idle slice.
   */
  function ensureIdlePump(): void {
    if (idlePumpHandle !== null || idleQueue.size === 0) {
      return;
    }
    idlePumpHandle = requestIdle(deadline => {
      idlePumpHandle = null;
      // Round-robin over the background tier for as long as the browser
      // reports spare time. A host which still has work re-enqueues itself at
      // the back (via `scheduleIdleRendering`), preserving fairness while
      // allowing several slices within one long idle period; a host which
      // finishes (or moves tiers) leaves the queue, so the loop terminates.
      while (idleQueue.size > 0 && deadline.timeRemaining() > 1) {
        const host: HTMLElement = idleQueue.values().next().value!;
        idleQueue.delete(host);
        const render = idleRenderers.get(host);
        if (render) {
          render(
            performance.now(),
            FrameInvocation.idle,
            deadline.timeRemaining()
          );
        }
      }
      ensureIdlePump();
    });
  }

  /**
   * Per-host visibility as last reported by the persistent intersection
   * observer (see `observeVisibility`). Hosts without an entry are assumed
   * visible: this keeps the first paint optimistic (an unpainted host has no
   * content and, with `contain: style layout`, zero height - so the observer
   * would report it as not intersecting even inside the viewport) and errs
   * towards rendering at full rate.
   */
  const hostVisibility = new WeakMap<HTMLElement, boolean>();

  export function isHostVisible(host: HTMLElement): boolean {
    return hostVisibility.get(host) ?? true;
  }

  /**
   * Persistent intersection observers, one per host.
   *
   * An observer is created lazily on the first render for a host and then
   * kept for the host's lifetime, so that subsequent renders (with streamed
   * outputs: every chunk) reuse it instead of paying for an
   * observe/disconnect cycle each. No explicit disconnection is needed:
   * observation targets are held weakly (they do not prevent the host from
   * being garbage collected), and this `WeakMap` keeps the observer itself
   * alive only as long as its host.
   */
  const hostObservers = new WeakMap<HTMLElement, IntersectionObserver>();

  /**
   * Start observing the visibility of a host, unless it is already observed.
   *
   * Besides recording visibility (see `isHostVisible`), the observer promotes
   * the host out of the background (idle) tier as soon as it comes back into
   * view, so rendering resumes at full rate without waiting for an idle slice
   * (idle callbacks can be delayed indefinitely on a busy page, e.g. while
   * the user is scrolling through a heavy notebook).
   */
  export function observeVisibility(host: HTMLElement): void {
    if (
      typeof IntersectionObserver === 'undefined' ||
      hostObservers.has(host)
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          hostVisibility.set(host, entry.isIntersecting);
        }
        if (isHostVisible(host)) {
          promoteFromIdle(host);
        }
      },
      { threshold: 0 }
    );
    observer.observe(host);
    hostObservers.set(host, observer);
  }

  /**
   * Abort any in-flight incremental rendering for a host: cancel its pending
   * frame and fallback watchdog, remove it from the rendering queues (both the
   * animation-frame and the idle tier), and disconnect its observer.
   */
  export function abortRendering(host: HTMLElement): void {
    cancelRenderingRequest(host);
    clearFallbackWatchdog(host);
    removeFromQueue(host);
    hostObservers.get(host)?.disconnect();
    hostObservers.delete(host);
    hostVisibility.delete(host);
  }

  /**
   * Selection offset in character relative to a root node.
   */
  interface ISelectionOffsets {
    /**
     * Offset of the selection anchor end.
     */
    anchor: number | null;
    /**
     * Offset of the selection focus end.
     */
    focus: number | null;
  }

  /**
   * Internal structure used for selection offset computation
   */
  interface ISelectionComputation extends ISelectionOffsets {
    /**
     * Number of characters already processed
     * by the recursive DOM traversal algorithm.
     */
    processedCharacters: number;
  }

  /**
   * Compute the position (anchor and focus) of the given selection
   * as characters offsets relative to the `root` node.
   *
   * For example, given the selection encompassing `am` in the sentence
   * `I am` we would expect to get anchor and focus with values 2 and 3
   * (depending on the selection direction). These character offsets are
   * stable, regardless of the number of DOM nodes encompassing the selection.
   *
   * This differs from the DOM-based selection representation used by browsers
   * where the offsets mean either characters, or position of nodes (depending
   * on parent node type), and are thus not suitable for retaining selection
   * when content of the root node is replaced.
   */
  function computeSelectionCharacterOffset(
    root: Node,
    selection: Selection
  ): ISelectionComputation {
    let anchor: number | null = null;
    let focus: number | null = null;
    let offset = 0;
    for (const node of [...root.childNodes]) {
      if (node === selection.focusNode) {
        focus = offset + selection.focusOffset;
      }
      if (node === selection.anchorNode) {
        anchor = offset + selection.anchorOffset;
      }
      if (node.childNodes.length > 0) {
        const result = computeSelectionCharacterOffset(node, selection);
        // Compare against `null` rather than testing truthiness: an offset of
        // `0` is a valid position (the selection end is at the very start of a
        // nested node, e.g. the first character of a linkified URL) and must
        // not be discarded.
        if (result.anchor !== null) {
          anchor = offset + result.anchor;
        }
        if (result.focus !== null) {
          focus = offset + result.focus;
        }
        offset += result.processedCharacters;
      } else {
        offset += node.textContent!.length;
      }
      if (anchor !== null && focus !== null) {
        break;
      }
    }
    return {
      processedCharacters: offset,
      anchor,
      focus
    };
  }

  /**
   * Finds a text node and offset within the given root node
   * where the selection should be anchored to select exactly
   * from n-th character given by `textOffset`.
   */
  function findTextSelectionNode(
    root: Node,
    textOffset: number | null,
    offset: number = 0
  ) {
    if (textOffset !== null) {
      for (const node of [...root.childNodes]) {
        // As much as possible avoid calling `textContent` here as it is slower
        const nodeEnd =
          node instanceof Text
            ? node.nodeValue!.length
            : ((node instanceof HTMLAnchorElement
                ? (node.childNodes[0].nodeValue?.length ??
                  node.textContent?.length)
                : node.textContent?.length) ?? 0);
        // Use `>=` on the lower bound so an offset that falls exactly on a node
        // boundary is resolved to the start of that node. With a strict `>` the
        // offset `0` (start of content) and every inter-node boundary would be
        // missed, leaving the selection unrestored - the ranges are half-open
        // [offset, offset + nodeEnd), so each character position still maps to
        // exactly one node.
        if (textOffset >= offset && textOffset < offset + nodeEnd) {
          if (node instanceof Text) {
            return { node, positionOffset: textOffset - offset };
          } else {
            return findTextSelectionNode(node, textOffset, offset);
          }
        } else {
          offset += nodeEnd;
        }
      }
    }
    return {
      node: null,
      positionOffset: null
    };
  }

  /**
   * Modify given `selection` object to span between the
   * given selection offsets, within the given `root` node.
   */
  function selectByOffsets(
    root: Node,
    selection: Selection,
    offsets: ISelectionOffsets
  ) {
    const { node: focusNode, positionOffset: focusOffset } =
      findTextSelectionNode(root, offsets.focus, 0);
    const { node: anchorNode, positionOffset: anchorOffset } =
      findTextSelectionNode(root, offsets.anchor, 0);
    if (
      anchorNode &&
      focusNode &&
      anchorOffset !== null &&
      focusOffset !== null
    ) {
      selection.setBaseAndExtent(
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset
      );
    }
  }

  /**
   * Run a DOM mutation, preserving the user selection (mapped through
   * character offsets relative to `root`) when it intersects any of the
   * `touched` nodes. The mutation must not change the total text content of
   * `root`, as the offsets are restored against the post-mutation DOM.
   */
  export function withSelectionPreserved(
    root: HTMLElement,
    touched: Node[],
    mutate: () => void
  ): void {
    const selection = window.getSelection();
    const affected =
      selection && touched.some(node => selection.containsNode(node, true));
    const offsets = affected
      ? computeSelectionCharacterOffset(root, selection!)
      : null;
    mutate();
    if (selection && offsets) {
      selectByOffsets(root, selection, offsets);
    }
  }

  /**
   * Live render state (see `ILiveRenderState`) per host. Kept across renders
   * so that subsequent stream chunks append to the existing DOM instead of
   * rebuilding it.
   */
  const liveRenderStates = new WeakMap<HTMLElement, ILiveRenderState>();

  export function getLiveRenderState(
    host: HTMLElement
  ): ILiveRenderState | undefined {
    return liveRenderStates.get(host);
  }

  export function setLiveRenderState(
    host: HTMLElement,
    state: ILiveRenderState
  ): void {
    liveRenderStates.set(host, state);
  }

  /**
   * Cache for auto-linking results to provide better performance when streaming outputs.
   */
  const autoLinkCache = new Map<
    string,
    WeakMap<HTMLElement, IAutoLinkCacheEntry>
  >();

  export function getCacheStore(autoLinkOptions: IAutoLinkOptions) {
    const cacheStoreOptions = [];
    if (autoLinkOptions.checkWeb) {
      cacheStoreOptions.push('web');
    }
    if (autoLinkOptions.checkPaths) {
      cacheStoreOptions.push('paths');
    }
    const cacheStoreKey = cacheStoreOptions.join('-');
    let cacheStore = autoLinkCache.get(cacheStoreKey);
    if (!cacheStore) {
      cacheStore = new WeakMap();
      autoLinkCache.set(cacheStoreKey, cacheStore);
    }
    return cacheStore;
  }

  /**
   * Eval the script tags contained in a host populated by `innerHTML`.
   *
   * When script tags are created via `innerHTML`, the browser does not
   * evaluate them when they are added to the page. This function works
   * around that by creating new equivalent script nodes manually, and
   * replacing the originals.
   */
  export function evalInnerHTMLScriptTags(host: HTMLElement): void {
    // Create a snapshot of the current script nodes.
    const scripts = Array.from(host.getElementsByTagName('script'));

    // Loop over each script node.
    for (const script of scripts) {
      // Skip any scripts which no longer have a parent.
      if (!script.parentNode) {
        continue;
      }

      // Create a new script node which will be clone.
      const clone = document.createElement('script');

      // Copy the attributes into the clone.
      const attrs = script.attributes;
      for (let i = 0, n = attrs.length; i < n; ++i) {
        const { name, value } = attrs[i];
        clone.setAttribute(name, value);
      }

      // Copy the text content into the clone.
      clone.textContent = script.textContent;

      // Replace the old script in the parent.
      script.parentNode.replaceChild(clone, script);
    }
  }

  /**
   * Handle the default behavior of nodes.
   */
  export function handleDefaults(node: HTMLElement): void {
    // Handle image elements.
    const imgs = node.getElementsByTagName('img');
    for (let i = 0; i < imgs.length; i++) {
      if (!imgs[i].alt) {
        imgs[i].alt = 'Image';
      }
    }
  }

  /**
   * Resolve the relative urls in element `src` and `href` attributes.
   *
   * @param node - The head html element.
   *
   * @param resolver - A url resolver.
   *
   * @param linkHandler - An optional link handler for nodes.
   *
   * @returns a promise fulfilled when the relative urls have been resolved.
   */
  export async function handleUrls(
    node: HTMLElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<unknown> {
    const promises = [];

    // Handle HTML Elements with src attributes.
    const nodes = node.querySelectorAll('*[src]');
    for (let i = 0; i < nodes.length; i++) {
      promises.push(handleAttr(nodes[i] as HTMLElement, 'src', resolver));
    }

    // Handle anchor elements.
    const anchors = node.getElementsByTagName('a');
    for (let i = 0; i < anchors.length; i++) {
      promises.push(handleAnchor(anchors[i], resolver, linkHandler));
    }

    // Handle link elements.
    const links = node.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      promises.push(handleAttr(links[i], 'href', resolver));
    }

    return Promise.all(promises);
  }

  /**
   * Resolve the paths in `<a>` elements that have a `data-path` attribute.
   *
   * @param node - The head html element.
   *
   * @param resolver - A url resolver.
   *
   * @param linkHandler - An optional link handler for nodes.
   *
   * @returns a promise fulfilled when the relative urls have been resolved.
   */
  export async function handlePaths(
    node: HTMLElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<unknown> {
    const anchors: HTMLAnchorElement[] = Array.from(
      node.querySelectorAll('a[data-path]')
    );
    return Promise.all(
      anchors.map(anchor => handlePathAnchor(anchor, resolver, linkHandler))
    );
  }

  /**
   * Apply ids to headers.
   */
  export function headerAnchors(
    node: HTMLElement,
    allowNamedProperties: boolean
  ): void {
    const headerNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    for (const headerType of headerNames) {
      const headers = node.getElementsByTagName(headerType);
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const headerId = renderMarkdown.createHeaderId(header);
        if (allowNamedProperties) {
          header.id = headerId;
        } else {
          header.setAttribute('data-jupyter-id', headerId);
        }
        const anchor = document.createElement('a');
        anchor.target = '_self';
        anchor.textContent = '¶';
        anchor.href = '#' + headerId;
        anchor.classList.add('jp-InternalAnchorLink');
        header.appendChild(anchor);
      }
    }
  }

  /**
   * Handle a node with a `src` or `href` attribute.
   */
  async function handleAttr(
    node: HTMLElement,
    name: 'src' | 'href',
    resolver: IRenderMime.IResolver
  ): Promise<void> {
    const source = node.getAttribute(name) || '';
    const isLocal = resolver.isLocal
      ? resolver.isLocal(source)
      : URLExt.isLocal(source);
    if (!source || !isLocal) {
      return;
    }
    try {
      const urlPath = await resolver.resolveUrl(source, {
        attribute: name,
        tag: node.localName as IRenderMime.IResolveUrlContext['tag']
      });
      let url = await resolver.getDownloadUrl(urlPath);
      if (URLExt.parse(url).protocol !== 'data:') {
        // Bust caching for local src attrs.
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
        url += (/\?/.test(url) ? '&' : '?') + new Date().getTime();
      }
      node.setAttribute(name, url);
    } catch (err) {
      // If there was an error getting the url,
      // just make it an empty link and report the error.
      node.setAttribute(name, '');
      throw err;
    }
  }

  /**
   * Handle an anchor node.
   */
  async function handleAnchor(
    anchor: HTMLAnchorElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<void> {
    // Get the link path without the location prepended.
    // (e.g. "./foo.md#Header 1" vs "http://localhost:8888/foo.md#Header 1")
    let href = anchor.getAttribute('href') || '';
    if (!href) {
      return;
    }
    const hash = anchor.hash;
    if (hash && hash === href) {
      anchor.target = '_self';
      anchor.addEventListener('click', (event: MouseEvent) => {
        const id = hash.slice(1);
        const escapedId = CSS.escape(id);
        const doc = anchor.ownerDocument;
        const el =
          doc.querySelector(`[data-jupyter-id="${escapedId}"]`) ||
          doc.querySelector(`#${escapedId}`);
        if (el) {
          event.preventDefault();
          el.scrollIntoView();
        }
      });
      return;
    }
    const isLocal = resolver.isLocal
      ? resolver.isLocal(href)
      : URLExt.isLocal(href);
    // Bail if it is not a file-like url.
    if (!isLocal) {
      return;
    }
    // Remove the hash until we can handle it.
    if (hash) {
      // For external links, remove the hash until we have hash handling.
      href = href.replace(hash, '');
    }
    // Get the appropriate file path.
    return resolver
      .resolveUrl(href, { attribute: 'href', tag: 'a' })
      .then(urlPath => {
        // decode encoded url from url to api path
        const path = decodeURIComponent(urlPath);
        // Handle the click override.
        if (linkHandler) {
          linkHandler.handleLink(anchor, path, hash);
        }
        // Get the appropriate file download path.
        return resolver.getDownloadUrl(urlPath);
      })
      .then(url => {
        // Set the visible anchor.
        anchor.href = url + hash;
      })
      .catch(err => {
        // If there was an error getting the url,
        // just make it an empty link.
        anchor.href = '';
      });
  }

  /**
   * Handle an anchor node.
   */
  async function handlePathAnchor(
    anchor: HTMLAnchorElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<void> {
    let path = anchor.dataset.path || '';
    let locator = anchor.dataset.locator ? '#' + anchor.dataset.locator : '';
    delete anchor.dataset.path;
    delete anchor.dataset.locator;
    const allowRoot = true;

    const isLocal = resolver.isLocal
      ? resolver.isLocal(path, allowRoot)
      : URLExt.isLocal(path, allowRoot);

    // Bail if:
    // - it is not a file-like url,
    // - the resolver does not support paths
    // - there is no link handler, or if it does not support paths
    if (
      !path ||
      !isLocal ||
      !resolver.resolvePath ||
      !linkHandler ||
      !linkHandler.handlePath
    ) {
      anchor.replaceWith(...anchor.childNodes);
      return;
    }
    try {
      // Find given path
      const resolution = await resolver.resolvePath(path);

      if (!resolution) {
        // Bail if the file does not exist
        console.log('Path resolution bailing: does not exist');
        return;
      }

      // Handle the click override.
      linkHandler.handlePath(
        anchor,
        resolution.path,
        resolution.scope,
        locator
      );

      // Set the visible anchor.
      anchor.href = resolution.path + locator;
    } catch (err) {
      // If there was an error getting the url,
      // just make it an empty link.
      console.warn('Path anchor error:', err);
      anchor.href = '#linking-failed-see-console';
    }
  }

  const ANSI_COLORS = [
    'ansi-black',
    'ansi-red',
    'ansi-green',
    'ansi-yellow',
    'ansi-blue',
    'ansi-magenta',
    'ansi-cyan',
    'ansi-white',
    'ansi-black-intense',
    'ansi-red-intense',
    'ansi-green-intense',
    'ansi-yellow-intense',
    'ansi-blue-intense',
    'ansi-magenta-intense',
    'ansi-cyan-intense',
    'ansi-white-intense'
  ];

  /**
   * Create HTML tags for a string with given foreground, background etc. and
   * add them to the `out` array.
   */
  function pushColoredChunk(
    chunk: string,
    fg: number | Array<number>,
    bg: number | Array<number>,
    bold: boolean,
    underline: boolean,
    inverse: boolean,
    out: Array<string>
  ): void {
    if (chunk) {
      const classes = [];
      const styles = [];

      if (bold && typeof fg === 'number' && 0 <= fg && fg < 8) {
        fg += 8; // Bold text uses "intense" colors
      }
      if (inverse) {
        [fg, bg] = [bg, fg];
      }

      if (typeof fg === 'number') {
        classes.push(ANSI_COLORS[fg] + '-fg');
      } else if (fg.length) {
        styles.push(`color: rgb(${fg})`);
      } else if (inverse) {
        classes.push('ansi-default-inverse-fg');
      }

      if (typeof bg === 'number') {
        classes.push(ANSI_COLORS[bg] + '-bg');
      } else if (bg.length) {
        styles.push(`background-color: rgb(${bg})`);
      } else if (inverse) {
        classes.push('ansi-default-inverse-bg');
      }

      if (bold) {
        classes.push('ansi-bold');
      }

      if (underline) {
        classes.push('ansi-underline');
      }

      if (classes.length || styles.length) {
        out.push('<span');
        if (classes.length) {
          out.push(` class="${classes.join(' ')}"`);
        }
        if (styles.length) {
          out.push(` style="${styles.join('; ')}"`);
        }
        out.push('>');
        out.push(chunk);
        out.push('</span>');
      } else {
        out.push(chunk);
      }
    }
  }

  /**
   * Convert ANSI extended colors to R/G/B triple.
   */
  function getExtendedColors(numbers: Array<number>): number | Array<number> {
    let r;
    let g;
    let b;
    const n = numbers.shift();
    if (n === 2 && numbers.length >= 3) {
      // 24-bit RGB
      r = numbers.shift()!;
      g = numbers.shift()!;
      b = numbers.shift()!;
      if ([r, g, b].some(c => c < 0 || 255 < c)) {
        throw new RangeError('Invalid range for RGB colors');
      }
    } else if (n === 5 && numbers.length >= 1) {
      // 256 colors
      const idx = numbers.shift()!;
      if (idx < 0) {
        throw new RangeError('Color index must be >= 0');
      } else if (idx < 16) {
        // 16 default terminal colors
        return idx;
      } else if (idx < 232) {
        // 6x6x6 color cube, see https://stackoverflow.com/a/27165165/500098
        r = Math.floor((idx - 16) / 36);
        r = r > 0 ? 55 + r * 40 : 0;
        g = Math.floor(((idx - 16) % 36) / 6);
        g = g > 0 ? 55 + g * 40 : 0;
        b = (idx - 16) % 6;
        b = b > 0 ? 55 + b * 40 : 0;
      } else if (idx < 256) {
        // grayscale, see https://stackoverflow.com/a/27165165/500098
        r = g = b = (idx - 232) * 10 + 8;
      } else {
        throw new RangeError('Color index must be < 256');
      }
    } else {
      throw new RangeError('Invalid extended color specification');
    }
    return [r, g, b];
  }

  /**
   * Transform ANSI color escape codes into HTML <span> tags with CSS
   * classes such as "ansi-green-intense-fg".
   * The actual colors used are set in the CSS file.
   * This also removes non-color escape sequences.
   * This is supposed to have the same behavior as nbconvert.filters.ansi2html()
   */
  export function ansiSpan(str: string): string {
    // Final byte range and control regex are intended here
    const ansiRe = /\x1b\[(.*?)([@-~])/g; // eslint-disable-line no-control-regex, regexp/no-obscure-range
    let fg: number | Array<number> = [];
    let bg: number | Array<number> = [];
    let bold = false;
    let underline = false;
    let inverse = false;
    let match;
    const out: Array<string> = [];
    const numbers = [];
    let start = 0;

    str = escape(str);

    str += '\x1b[m'; // Ensure markup for trailing text
    // tslint:disable-next-line
    while ((match = ansiRe.exec(str))) {
      if (match[2] === 'm') {
        const items = match[1].split(';');
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item === '') {
            numbers.push(0);
          } else if (item.search(/^\d+$/) !== -1) {
            numbers.push(parseInt(item, 10));
          } else {
            // Ignored: Invalid color specification
            numbers.length = 0;
            break;
          }
        }
      } else {
        // Ignored: Not a color code
      }
      const chunk = str.substring(start, match.index);
      pushColoredChunk(chunk, fg, bg, bold, underline, inverse, out);
      start = ansiRe.lastIndex;

      while (numbers.length) {
        const n = numbers.shift();
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (n) {
          case 0:
            fg = bg = [];
            bold = false;
            underline = false;
            inverse = false;
            break;
          case 1:
          case 5:
            bold = true;
            break;
          case 4:
            underline = true;
            break;
          case 7:
            inverse = true;
            break;
          case 21:
          case 22:
            bold = false;
            break;
          case 24:
            underline = false;
            break;
          case 27:
            inverse = false;
            break;
          case 30:
          case 31:
          case 32:
          case 33:
          case 34:
          case 35:
          case 36:
          case 37:
            fg = n - 30;
            break;
          case 38:
            try {
              fg = getExtendedColors(numbers);
            } catch (e) {
              numbers.length = 0;
            }
            break;
          case 39:
            fg = [];
            break;
          case 40:
          case 41:
          case 42:
          case 43:
          case 44:
          case 45:
          case 46:
          case 47:
            bg = n - 40;
            break;
          case 48:
            try {
              bg = getExtendedColors(numbers);
            } catch (e) {
              numbers.length = 0;
            }
            break;
          case 49:
            bg = [];
            break;
          case 90:
          case 91:
          case 92:
          case 93:
          case 94:
          case 95:
          case 96:
          case 97:
            fg = n - 90 + 8;
            break;
          case 100:
          case 101:
          case 102:
          case 103:
          case 104:
          case 105:
          case 106:
          case 107:
            bg = n - 100 + 8;
            break;
          default:
          // Unknown codes are ignored
        }
      }
    }
    return out.join('');
  }
}
