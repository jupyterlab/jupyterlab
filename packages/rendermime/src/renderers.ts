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
export function renderHTML(options: renderHTML.IOptions): Promise<void> {
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
    return Promise.resolve(undefined);
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
  Private.handleDefaults(host, resolver);

  // Patch the urls if a resolver is available.
  let promise: Promise<void>;
  if (resolver) {
    promise = Private.handleUrls(host, resolver, linkHandler);
  } else {
    promise = Promise.resolve(undefined);
  }

  // Return the final rendered promise.
  return promise.then(() => {
    if (shouldTypeset && latexTypesetter) {
      latexTypesetter.typeset(host);
    }
  });
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
export function renderImage(
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

  // Return the rendered promise.
  return Promise.resolve(undefined);
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
export function renderLatex(
  options: renderLatex.IRenderOptions
): Promise<void> {
  // Unpack the options.
  const { host, source, shouldTypeset, latexTypesetter } = options;

  // Set the source on the node.
  host.textContent = source;

  // Typeset the node if needed.
  if (shouldTypeset && latexTypesetter) {
    latexTypesetter.typeset(host);
  }

  // Return the rendered promise.
  return Promise.resolve(undefined);
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
  Private.headerAnchors(host);
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
export function renderSVG(options: renderSVG.IRenderOptions): Promise<void> {
  // Unpack the options.
  let { host, source, trusted, unconfined } = options;

  // Clear the content if there is no source.
  if (!source) {
    host.textContent = '';
    return Promise.resolve(undefined);
  }

  // Display a message if the source is not trusted.
  if (!trusted) {
    host.textContent =
      'Cannot display an untrusted SVG. Maybe you need to run the cell?';
    return Promise.resolve(undefined);
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
  return Promise.resolve();
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
 * Replace URLs with links.
 *
 * @param content - The text content of a node.
 *
 * @returns A list of text nodes and anchor elements.
 */
function autolink(content: string): Array<HTMLAnchorElement | Text> {
  // Taken from Visual Studio Code:
  // https://github.com/microsoft/vscode/blob/9f709d170b06e991502153f281ec3c012add2e42/src/vs/workbench/contrib/debug/browser/linkDetector.ts#L17-L18
  const controlCodes = '\\u0000-\\u0020\\u007f-\\u009f';
  const webLinkRegex = new RegExp(
    '(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' +
      controlCodes +
      '"]{2,}[^\\s' +
      controlCodes +
      '"\'(){}\\[\\],:;.!?]',
    'ug'
  );

  const nodes = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while (null != (match = webLinkRegex.exec(content))) {
    if (match.index !== lastIndex) {
      nodes.push(
        document.createTextNode(content.slice(lastIndex, match.index))
      );
    }
    let url = match[0];
    // Special case when the URL ends with ">" or "<"
    const lastChars = url.slice(-1);
    const endsWithGtLt = ['>', '<'].indexOf(lastChars) !== -1;
    const len = endsWithGtLt ? url.length - 1 : url.length;
    const anchor = document.createElement('a');
    url = url.slice(0, len);
    anchor.href = url.startsWith('www.') ? 'https://' + url : url;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    anchor.appendChild(document.createTextNode(url.slice(0, len)));
    nodes.push(anchor);
    lastIndex = match.index + len;
  }
  if (lastIndex !== content.length) {
    nodes.push(
      document.createTextNode(content.slice(lastIndex, content.length))
    );
  }
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
export function renderText(options: renderText.IRenderOptions): Promise<void> {
  // Unpack the options.
  const { host, sanitizer, source } = options;

  // Create the HTML content.
  const content = sanitizer.sanitize(Private.ansiSpan(source), {
    allowedTags: ['span']
  });

  // Set the sanitized content for the host node.
  const ret = document.createElement('pre');
  const pre = document.createElement('pre');
  pre.innerHTML = content;

  const preTextContent = pre.textContent;

  if (preTextContent) {
    // Note: only text nodes and span elements should be present after sanitization in the `<pre>` element.
    const linkedNodes =
      sanitizer.getAutolink?.() ?? true
        ? autolink(preTextContent)
        : [document.createTextNode(content)];
    let inAnchorElement = false;

    const combinedNodes: (HTMLAnchorElement | Text | HTMLSpanElement)[] = [];
    const preNodes = Array.from(pre.childNodes) as (Text | HTMLSpanElement)[];

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
  }

  host.appendChild(ret);

  // Return the rendered promise.
  return Promise.resolve(undefined);
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

/**
 * The namespace for module implementation details.
 */
namespace Private {
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
  export function handleDefaults(
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
  export function handleUrls(
    node: HTMLElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<void> {
    // Set up an array to collect promises.
    const promises: Promise<void>[] = [];

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

    // Wait on all promises.
    return Promise.all(promises).then(() => undefined);
  }

  /**
   * Apply ids to headers.
   */
  export function headerAnchors(node: HTMLElement): void {
    const headerNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    for (const headerType of headerNames) {
      const headers = node.getElementsByTagName(headerType);
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        header.id = renderMarkdown.createHeaderId(header);
        const anchor = document.createElement('a');
        anchor.target = '_self';
        anchor.textContent = '¶';
        anchor.href = '#' + header.id;
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
      const urlPath = await resolver.resolveUrl(source);
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
  function handleAnchor(
    anchor: HTMLAnchorElement,
    resolver: IRenderMime.IResolver,
    linkHandler: IRenderMime.ILinkHandler | null
  ): Promise<void> {
    // Get the link path without the location prepended.
    // (e.g. "./foo.md#Header 1" vs "http://localhost:8888/foo.md#Header 1")
    let href = anchor.getAttribute('href') || '';
    const isLocal = resolver.isLocal
      ? resolver.isLocal(href)
      : URLExt.isLocal(href);
    // Bail if it is not a file-like url.
    if (!href || !isLocal) {
      return Promise.resolve(undefined);
    }
    // Remove the hash until we can handle it.
    const hash = anchor.hash;
    if (hash) {
      // Handle internal link in the file.
      if (hash === href) {
        anchor.target = '_self';
        return Promise.resolve(undefined);
      }
      // For external links, remove the hash until we have hash handling.
      href = href.replace(hash, '');
    }
    // Get the appropriate file path.
    return resolver
      .resolveUrl(href)
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
