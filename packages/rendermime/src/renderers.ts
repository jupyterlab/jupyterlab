/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
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
    'ug'
  );
  // Taken from Visual Studio Code:
  // https://github.com/microsoft/vscode/blob/3e407526a1e2ff22cacb69c7e353e81a12f41029/extensions/notebook-renderers/src/linkify.ts#L9
  const winAbsPathRegex = /(?:[a-zA-Z]:(?:(?:\\|\/)[\w\.-]*)+)/;
  const winRelPathRegex = /(?:(?:\~|\.)(?:(?:\\|\/)[\w\.-]*)+)/;
  const winPathRegex = new RegExp(
    `(${winAbsPathRegex.source}|${winRelPathRegex.source})`
  );
  const posixPathRegex = /((?:\~|\.)?(?:\/[\w\.-]*)+)/;
  const lineColumnRegex =
    /(?:(?:\:|", line )(?<line>[\d]+))?(?:\:(?<column>[\d]+))?/;
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
  pre.textContent = node.textContent?.slice(0, at) as string;
  const post = node.cloneNode() as T;
  post.textContent = node.textContent?.slice(at) as string;
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
          B.node.textContent = B.node.textContent?.slice(
            A.start - B.start
          ) as string;
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
          A.node.textContent = A.node.textContent?.slice(
            B.start - A.start
          ) as string;
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
  renderTextual(options, {
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
 * Enum used exclusively for static analysis to ensure that each
 * branch in `renderFrame` leads to explicit rendering decision.
 */
enum RenderingResult {
  stop,
  delay,
  continue
}

/**
 * Render the textual representation into a host node.
 *
 * Implements the shared logic for `renderText` and `renderError`.
 */
function renderTextual(
  options: renderText.IRenderOptions,
  autoLinkOptions: IAutoLinkOptions
): void {
  // Unpack the options.
  const { host, sanitizer, source } = options;

  // We want to only manipulate DOM once per animation frame whether
  // the autolink is enabled or not, because a stream can also choke
  // rendering pipeline even if autolink is disabled. This acts as
  // an effective debouncer which matches the refresh rate of the
  // screen.
  Private.cancelRenderingRequest(host);

  // Stop rendering after 10 minutes (assuming 60 Hz)
  const maxIterations = 60 * 60 * 10;
  let iteration = 0;

  let fullPreTextContent: string | null = null;
  let pre: HTMLPreElement;

  let isVisible = false;
  isVisible = true;

  // We will use the observer to pause rendering if the element
  // is not visible; this is helpful when opening a notebook
  // with a large number of large textual outputs.
  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            wasEverVisible = true;
          }
        }
      },
      { threshold: 0 }
    );
    observer.observe(host);
  }
  let wasEverVisible = false;
  wasEverVisible = true;

  const stopRendering = () => {
    // Remove the host from rendering queue
    Private.removeFromQueue(host);
    // Disconnect the intersection observer.
    observer?.disconnect();
    return RenderingResult.stop;
  };

  const continueRendering = () => {
    iteration += 1;
    Private.scheduleRendering(host, renderFrame);
    return RenderingResult.continue;
  };

  const delayRendering = () => {
    Private.scheduleRendering(host, renderFrame);
    return RenderingResult.delay;
  };

  const renderFrame = (timestamp: number): RenderingResult => {
    if (!host.isConnected) {
      // Abort rendering if host is no longer in DOM; note, that even in
      // full windowing notebook mode the output nodes are never removed,
      // but instead the cell gets hidden (usually with `display: none`
      // or in case of the active cell - opacity tricks).
      if (!wasEverVisible) {
        // If the host was never visible, it means it was not yet
        // attached when loading notebook for the first time.
        return delayRendering();
      } else {
        return stopRendering();
      }
    }

    // Delay rendering of this output if the output is not visible due to
    // scrolling away in full windowed notebook mode, or if another output
    // should be rendered first.
    // Note: cannot use `checkVisibility` as it triggers style recalculation
    // before we appended the new nodes from the stream, which leads to layout
    // trashing. Instead we use intersection observer
    if (!isVisible || !Private.canRenderInFrame(timestamp, host)) {
      return delayRendering();
    }

    const start = performance.now();
    Private.beginRendering(host);

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
    const cache = cacheStore.get(host);
    const applicableCache = getApplicableLinkCache(cache, fullPreTextContent);
    const hasCache = cache && applicableCache;
    if (iteration > 0 && !hasCache) {
      throw Error('Each iteration should set cache!');
    }

    let alreadyAutoLinked = hasCache ? applicableCache.processedText : '';
    let toBeAutoLinked = hasCache
      ? applicableCache.addedText
      : fullPreTextContent;
    let moreWorkToBeDone: boolean;

    const budget = 10;
    let linkedNodes: (HTMLAnchorElement | Text)[];
    let elapsed: number;
    let newRequest: number | undefined;

    do {
      // find first space (or equivalent) which follows a non-space character.
      const breakIndex = toBeAutoLinked.search(/(?<=\S)\s/);

      const before =
        breakIndex === -1
          ? toBeAutoLinked
          : toBeAutoLinked.slice(0, breakIndex);
      const after = breakIndex === -1 ? '' : toBeAutoLinked.slice(breakIndex);
      const fragment = alreadyAutoLinked + before;
      linkedNodes = incrementalAutoLink(
        cacheStore,
        options,
        autoLinkOptions,
        fragment
      );
      alreadyAutoLinked = fragment;
      toBeAutoLinked = after;
      moreWorkToBeDone = toBeAutoLinked != '';
      elapsed = performance.now() - start;
      newRequest = Private.hasNewRenderingRequest(host);
    } while (elapsed < budget && moreWorkToBeDone && !newRequest);

    // Note: we set `keepExisting` to `true` in `IRenderMime.IRenderer`s which
    // use this method to ensure that the previous node is not removed from DOM
    // when new chunks of data comes from the stream.
    if (linkedNodes.length === 1 && linkedNodes[0] instanceof Text) {
      if (host.childNodes.length === 1 && host.childNodes[0] === pre) {
        // no-op
      } else {
        Private.replaceChangedNodes(host, pre);
      }
    } else {
      // Persist nodes in cache by cloning them
      cacheStore.set(host, {
        preTextContent: alreadyAutoLinked,
        // Clone the nodes before storing them in the cache in case if another component
        // attempts to modify (e.g. dispose of) them - which is the case for search highlights!
        linkedNodes: linkedNodes.map(
          node => node.cloneNode(true) as HTMLAnchorElement | Text
        )
      });

      const preNodes = Array.from(pre.cloneNode(true).childNodes) as (
        | Text
        | HTMLSpanElement
      )[];
      const node = mergeNodes(preNodes, [
        ...linkedNodes,
        document.createTextNode(toBeAutoLinked)
      ]);

      Private.replaceChangedNodes(host, node);
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

  Private.scheduleRendering(host, renderFrame);
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

  // Only use cached nodes if:
  // - the last cached node is a text node
  // - the new content starts with a new line
  // - the old content ends with a new line
  if (
    cachedResult.preTextContent.endsWith('\n') ||
    addedText.startsWith('\n')
  ) {
    // Second or third condition is met, we can use the cached nodes
    // (this is a no-op, we just continue execution).
  } else if (lastCachedNode instanceof Text) {
    // The first condition is met, we can use the cached nodes,
    // but first we remove the Text node to re-analyse its text.
    // This is required when we cached `aaa www.one.com bbb www.`
    // and the incoming addition is `two.com`. We can still
    // use text node `aaa ` and anchor node `www.one.com`, but
    // we need to pass `bbb www.` + `two.com` through linkify again.
    cachedNodes = cachedNodes.slice(0, -1);
    addedText = lastCachedNode.textContent + addedText;
    processedText = processedText.slice(0, -lastCachedNode.textContent!.length);
  } else if (lastCachedNode instanceof HTMLAnchorElement) {
    // TODO: why did I not include this condition before?
    cachedNodes = cachedNodes.slice(0, -1);
    addedText = lastCachedNode.textContent + addedText;
    processedText = processedText.slice(0, -lastCachedNode.textContent!.length);
  } else {
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

  renderTextual(options, {
    checkWeb: true,
    checkPaths: true
  });

  // Patch the paths if a resolver is available.
  if (resolver) {
    await Private.handlePaths(host, resolver, linkHandler);
  }
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
      combinedNodes.push(nodes[1]);
      inAnchorElement = nodes[1].nodeType !== Node.TEXT_NODE;
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
      (linkNode as HTMLAnchorElement).href ===
        (lastCombined as HTMLAnchorElement).href
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
      // progress queue
      const last = renderQueue.shift();
      if (last) {
        renderQueue.push(last);
      } else {
        throw Error('Render queue cannot be empty here!');
      }
      lastFrameTimestamp = timestamp;
    }
    // check queue
    if (renderQueue[0] === host) {
      return true;
    }
    return false;
  }

  const renderQueue = new Array<HTMLElement>();
  const frameRequests = new WeakMap<HTMLElement, number>();

  export function cancelRenderingRequest(host: HTMLElement) {
    // do not remove from queue - the expectation is that rendering will resume
    const previousRequest = frameRequests.get(host);
    if (previousRequest) {
      window.cancelAnimationFrame(previousRequest);
    }
  }

  export function scheduleRendering(
    host: HTMLElement,
    render: (timetamp: number) => void
  ) {
    // push at the end of the queue
    if (!renderQueue.includes(host)) {
      renderQueue.push(host);
    }
    const thisRequest = window.requestAnimationFrame(render);
    frameRequests.set(host, thisRequest);
  }

  export function beginRendering(host: HTMLElement) {
    frameRequests.delete(host);
  }

  export function removeFromQueue(host: HTMLElement) {
    const index = renderQueue.indexOf(host);
    if (index !== -1) {
      renderQueue.splice(index, 1);
    }
  }

  export function hasNewRenderingRequest(host: HTMLElement) {
    return frameRequests.get(host);
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
        if (result.anchor) {
          anchor = offset + result.anchor;
        }
        if (result.focus) {
          focus = offset + result.focus;
        }
        offset += result.processedCharacters;
      } else {
        offset += node.textContent!.length;
      }
      if (anchor && focus) {
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
            : (node instanceof HTMLAnchorElement
                ? node.childNodes[0].nodeValue?.length ??
                  node.textContent?.length
                : node.textContent?.length) ?? 0;
        if (textOffset > offset && textOffset < offset + nodeEnd) {
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
   * Replace nodes in `target` using nodes from `source`, minimising DOM operations
   * and preserving selection (mapped using character offsets) if any.
   *
   * In the worst-case scenario (when no optimizations can be applied),
   * this is equivalent to `target.replaceChildren(source)`. However,
   * if nodes of the same type and with identical content are found
   * at the start of the `target` and `source` child list, these are
   * reused, improving the performance for stream operations.
   */
  export function replaceChangedNodes(
    target: HTMLElement,
    source: HTMLPreElement
  ) {
    const result = checkChangedNodes(target, source);
    const selection = window.getSelection();
    const hasSelection = selection && selection.containsNode(target, true);
    const selectionOffsets = hasSelection
      ? computeSelectionCharacterOffset(target, selection)
      : null;
    const pre = result ? result.parent : source;
    if (result) {
      for (const element of result.toDelete) {
        result.parent.removeChild(element);
      }
      result.parent.append(...result.toAppend);
    } else {
      target.replaceChildren(source);
    }
    // Restore selection - if there is a meaningful one.
    if (selection && selectionOffsets) {
      selectByOffsets(pre, selection, selectionOffsets);
    }
  }

  /**
   * Find nodes in `node` which do not have the same content or type and thus need to be appended.
   */
  function checkChangedNodes(host: HTMLElement, node: HTMLPreElement) {
    const oldPre = host.childNodes[0];
    if (!oldPre) {
      return;
    }
    if (!(oldPre instanceof HTMLPreElement)) {
      return;
    }
    // Normalization at this point should be cheap as the new node is not in the DOM yet.
    node.normalize();
    const newNodes = node.childNodes;
    const oldNodes = oldPre.childNodes;

    if (
      // This could be generalized to appending a mix of text and non-text
      // to a block of text too, but for now handles the most common case
      // of just streaming text.
      newNodes.length === 1 &&
      newNodes[0] instanceof Text &&
      [...oldNodes].every(n => n instanceof Text) &&
      node.textContent!.startsWith(oldPre.textContent!)
    ) {
      const textNodeToAppend = document.createTextNode(
        node.textContent!.slice(oldPre.textContent!.length)
      );
      return {
        parent: oldPre,
        toDelete: [],
        toAppend: [textNodeToAppend]
      };
    }

    let lastSharedNode: number = -1;
    for (let i = 0; i < oldNodes.length; i++) {
      const oldChild = oldNodes[i];
      const newChild = newNodes[i];
      if (
        newChild &&
        oldChild.nodeType === newChild.nodeType &&
        oldChild.textContent === newChild.textContent
      ) {
        lastSharedNode = i;
      } else {
        break;
      }
    }

    if (lastSharedNode === -1) {
      return;
    }
    return {
      parent: oldPre,
      toDelete: [...oldNodes].slice(lastSharedNode),
      toAppend: [...newNodes].slice(lastSharedNode)
    };
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
    const ansiRe = /\x1b\[(.*?)([@-~])/g; // eslint-disable-line no-control-regex
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
