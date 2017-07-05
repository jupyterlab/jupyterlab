/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import * as marked
  from 'marked';

import {
  ISanitizer
} from '@jupyterlab/apputils';

import {
  Mode, CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  typeset, removeMath, replaceMath
} from './latex';


/**
 * A collection of helper functions which render common formats.
 */
export
namespace RenderHelpers {


  /**
   * Render Markdown into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderMarkdown(options: renderMarkdown.IRenderOptions): Promise<void> {
    // Unpack the options.
    let {
      node, source, trusted, sanitizer, resolver, linkHandler, shouldTypeset
    } = options;

    // Clear the content if there is no source.
    if (!source) {
      node.textContent = '';
      return Promise.resolve(undefined);
    }

    // Initialize the marked library if necessary.
    Private.initializeMarked();

    // Separate math from normal markdown text.
    let parts = removeMath(source);

    // Render the markdown and handle sanitization.
    return Private.renderMarked(parts['text']).then(content => {
      // Restore the math content in the rendered markdown.
      content = replaceMath(content, parts['math']);

      // Santize the content it is not trusted.
      if (!trusted) {
        content = sanitizer.sanitize(content);
      }

      // Set the inner HTML to the parsed content.
      node.innerHTML = content;

      // Apply ids to the header nodes.
      Private.headerAnchors(node);

      // TODO - this was in the old code, but why?
      // <node owner widget>.fit();

      // Patch the urls if a resolver is available.
      let promise: Promise<void>;
      if (resolver) {
        promise = Private.handleUrls(node, resolver, linkHandler);
      } else {
        promise = Promise.resolve(undefined);
      }

      // Return the rendered promise.
      return promise;
    }).then(() => { if (shouldTypeset) { typeset(node) } });
  }

  /**
   * The namespace for the `renderMarkdown` function statics.
   */
  export
  namespace renderMarkdown {
    /**
     * The options for the `renderMarkdown` function.
     */
    export
    interface IRenderOptions {
      /**
       * The node to use as the host of the rendered Markdown.
       */
      node: HTMLElement;

      /**
       * The Markdown source to render.
       */
      source: string;

      /**
       * Whether the source is trusted.
       */
      trusted: boolean;

      /**
       * The html sanitizer.
       */
      sanitizer: ISanitizer;

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
    }
  }

  /**
   * Render LaTeX into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderLatex(options: renderLatex.IRenderOptions): Promise<void> {
    // Unpack the options.
    let { node, source, shouldTypeset } = options;

    // Set the source on the node.
    node.textContent = source;

    // Typeset the node if needed.
    if (shouldTypeset) {
      typeset(node);
    }

    // Return the rendered promise.
    return Promise.resolve(undefined);
  }

  /**
   * The namespace for the `renderLatex` function statics.
   */
  export
  namespace renderLatex {
    /**
     * The options for the `renderLatex` function.
     */
    export
    interface IRenderOptions {
      /**
       * The node to use as the host of the rendered LaTeX.
       */
      node: HTMLElement;

      /**
       * The LaTeX source to render.
       */
      source: string;

      /**
       * Whether the node should be typeset.
       */
      shouldTypeset: boolean;
    }
  }

  /**
   * Render an image into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderImage(options: renderImage.IRenderOptions): Promise<void> {
    // Unpack the options.
    let { mimeType, model, node } = options;

    // Get the source text from the model.
    let source = String(model.data[mimeType]);

    // Set the source of the image.
    node.src = `data:${mimeType};base64,${source}`;

    // Look up the metadata for the model.
    let metadata = model.metadata[mimeType] as ReadonlyJSONObject;

    // Set the size of the image if specified by the metadata.
    if (metadata) {
      let { height, width } = metadata;
      if (typeof height === 'number') {
        node.height = height;
      }
      if (typeof width === 'number') {
        node.width = width;
      }
    }

    // Return the rendered promise.
    return Promise.resolve(undefined);
  }

  /**
   * The namespace for the `renderImage` function statics.
   */
  export
  namespace renderImage {
    /**
     * The options for the `renderImage` function.
     */
    export
    interface IRenderOptions {
      /**
       * The image node to update with the content.
       */
      node: HTMLImageElement;

      /**
       * The mime type for the image data in the model.
       */
      mimeType: string;

      /**
       * The mime model which holds the data to render.
       */
      model: IRenderMime.IMimeModel;
    }
  }

  /**
   * Render text into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderText(options: renderText.IRenderOptions): Promise<void> {
    // Unpack the options.
    let { mimeType, model, node } = options;

    // Get the source text from the model.
    let source = String(model.data[mimeType]);

    // Escape the terminal codes for HTMl.
    let data = escape_for_html(source);

    // Set the inner HTML for the host node.
    node.innerHTML = ansi_to_html(data, { use_classes: true });

    // Return the rendered promise.
    return Promise.resolve(undefined);
  }

  /**
   * The namespace for the `renderText` function statics.
   */
  export
  namespace renderText {
    /**
     * The options for the `renderText` function.
     */
    export
    interface IRenderOptions {
      /**
       * The node to use as the host for the text content.
       */
      node: HTMLElement;

      /**
       * The mime type for the text data in the model.
       */
      mimeType: string;

      /**
       * The mime model which holds the data to render.
       */
      model: IRenderMime.IMimeModel;
    }
  }

  /**
   * Render JavaScript into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderJavaScript(options: renderJavaScript.IRenderOptions): Promise<void> {
    // Unpack the options.
    let { mimeType, model, node } = options;

    // Clear the content of the node.
    node.textContent = '';

    // Get the source text from the model.
    let source = String(model.data[mimeType]);

    // Bail early if there is no source.
    if (!source) {
      return Promise.resolve(undefined);
    }

    // Create the "script" node to hold the source.
    let script: HTMLElement;
    if (model.trusted) {
      script = document.createElement('script');
    } else {
      script = document.createElement('pre');
    }

    // Set the source for the script.
    script.textContent = source;

    // Add the script to the host node.
    node.appendChild(script);

    // Return the rendered promise.
    return Promise.resolve(undefined);
  }

  /**
   * The namespace for the `renderJavaScript` function statics.
   */
  export
  namespace renderJavaScript {
    /**
     * The options for the `renderJavaScript` function.
     */
    export
    interface IRenderOptions {
      /**
       * The node to use as the host for the script content.
       */
      node: HTMLElement;

      /**
       * The mime type for the JavaScript source in the model.
       */
      mimeType: string;

      /**
       * The mime model which holds the JavaScript source.
       */
      model: IRenderMime.IMimeModel;
    }
  }

  /**
   * Render SVG into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderSVG(options: renderSVG.IRenderOptions): Promise<void> {
    // Unpack the options.
    let {
      mimeType, model, node, resolver, linkHandler, shouldTypeset
    } = options;

    // Get the source text from the model.
    let source = String(model.data[mimeType]);

    // Clear the content if there is no source.
    if (!source) {
      node.textContent = '';
      return Promise.resolve(undefined);
    }

    // Create the "script" node to hold the source.
    if (model.trusted) {
      node.innerHTML = source;
    } else {
      node.textContent = 'Run the cell to display SVG.'
    }

    // Patch the urls if a resolver is available.
    let promise: Promise<void>;
    if (resolver) {
      promise = Private.handleUrls(node, resolver, linkHandler);
    } else {
      promise = Promise.resolve(undefined);
    }

    // Return the final rendered promise.
    return promise.then(() => { if (shouldTypeset) { typeset(node); } });
  }

  /**
   * The namespace for the `renderSVG` function statics.
   */
  export
  namespace renderSVG {
    /**
     * The options for the `renderSVG` function.
     */
    export
    interface IRenderOptions {
      /**
       * The mimeType to render.
       */
      mimeType: string;

      /**
       * An optional url resolver.
       */
      resolver: IRenderMime.IResolver | null;

      /**
       * An optional link handler.
       */
      linkHandler: IRenderMime.ILinkHandler | null;

      /**
       * The node to use as the host of the rendered SVG.
       */
      node: HTMLElement;

      /**
       * The mime model which holds the data to render.
       */
      model: IRenderMime.IMimeModel;

      /**
       * Whether the node should be typeset.
       */
      shouldTypeset: boolean;
    }
  }

  /**
   * Render a PDF into a host node.
   *
   * @params options - The options for rendering.
   *
   * @returns A promise which resolves when rendering is complete.
   */
  export
  function renderPDF(options: renderPDF.IRenderOptions): Promise<void> {
    // Unpack the options.
    let { mimeType, model, node } = options;

    // Get the source text from the model.
    let source = String(model.data[mimeType]);

    // Clear the content if there is no source.
    if (!source) {
      node.textContent = '';
      return Promise.resolve(undefined);
    }

    // Update the node with the display content.
    if (model.trusted) {
      let href = `data:application/pdf;base64,${source}`;
      node.innerHTML = `<a target="_blank" href="${href}">View PDF</a>`;
    } else {
      node.textContent = 'Run the cell to display PDF.'
    }

    // Return the final rendered promise.
    return Promise.resolve(undefined);
  }

  /**
   * The namespace for the `renderPDF` function statics.
   */
  export
  namespace renderPDF {
    /**
     * The options for the `renderPDF` function.
     */
    export
    interface IRenderOptions {
      /**
       * The mimeType to render.
       */
      mimeType: string;

      /**
       * The node to use as the host of the rendered SVG.
       */
      node: HTMLElement;

      /**
       * The mime model which holds the data to render.
       */
      model: IRenderMime.IMimeModel;
    }
  }
}


/**
 * The namespace for module implementation details.
 */
namespace Private {
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
  export
  function handleUrls(node: HTMLElement, resolver: IRenderMime.IResolver, linkHandler: IRenderMime.ILinkHandler | null): Promise<void> {
    // Set up an array to collect promises.
    let promises: Promise<void>[] = [];

    // Handle HTML Elements with src attributes.
    let nodes = node.querySelectorAll('*[src]');
    for (let i = 0; i < nodes.length; i++) {
      promises.push(handleAttr(nodes[i] as HTMLElement, 'src', resolver));
    }

    // Handle achor elements.
    let anchors = node.getElementsByTagName('a');
    for (let i = 0; i < anchors.length; i++) {
      promises.push(handleAnchor(anchors[i], resolver, linkHandler));
    }

    // Handle link elements.
    let links = node.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      promises.push(handleAttr(links[i], 'href', resolver));
    }

    // Wait on all promises.
    return Promise.all(promises).then(() => undefined);
  }

  /**
   * Handle a node with a `src` or `href` attribute.
   */
  function handleAttr(node: HTMLElement, name: 'src' | 'href', resolver: IRenderMime.IResolver): Promise<void> {
    let source = node.getAttribute(name);
    if (!source) {
      return Promise.resolve(undefined);
    }
    node.setAttribute(name, '');
    return resolver.resolveUrl(source).then(path => {
      return resolver.getDownloadUrl(path);
    }).then(url => {
      node.setAttribute(name, url);
    });
  }

  /**
   * Apply ids to headers.
   */
  export
  function headerAnchors(node: HTMLElement): void {
    let headerNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    for (let headerType of headerNames){
      let headers = node.getElementsByTagName(headerType);
      for (let i=0; i < headers.length; i++) {
        let header = headers[i];
        header.id = header.innerHTML.replace(/ /g, '-');
        let anchor = document.createElement('a');
        anchor.target = '_self';
        anchor.textContent = '¶';
        anchor.href = '#' + header.id;
        anchor.classList.add('jp-InternalAnchorLink');
        header.appendChild(anchor);
      }
    }
  }

  /**
   * Handle an anchor node.
   */
  function handleAnchor(anchor: HTMLAnchorElement, resolver: IRenderMime.IResolver, linkHandler: IRenderMime.ILinkHandler | null): Promise<void> {
    anchor.target = '_blank';
    // Get the link path without the location prepended.
    // (e.g. "./foo.md#Header 1" vs "http://localhost:8888/foo.md#Header 1")
    let href = anchor.getAttribute('href');
    // Bail if it is not a file-like url.
    if (!href || href.indexOf('://') !== -1 && href.indexOf('//') === 0) {
      return Promise.resolve(undefined);
    }
    // Remove the hash until we can handle it.
    let hash = anchor.hash;
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
    return resolver.resolveUrl(href).then(path => {
      // Handle the click override.
      if (linkHandler && URLExt.isLocal(path)) {
        linkHandler.handleLink(anchor, path);
      }
      // Get the appropriate file download path.
      return resolver.getDownloadUrl(path);
    }).then(url => {
      // Set the visible anchor.
      anchor.href = url + hash;
    });
  }

  let markedInitialized = false;

  /**
   * Support GitHub flavored Markdown, leave sanitizing to external library.
   */
  export
  function initializeMarked(): void {
    if (markedInitialized) {
      return;
    }
    markedInitialized = true;
    marked.setOptions({
      gfm: true,
      sanitize: false,
      tables: true,
      // breaks: true; We can't use GFM breaks as it causes problems with tables
      langPrefix: `cm-s-${CodeMirrorEditor.defaultConfig.theme} language-`,
      highlight: (code, lang, callback) => {
        if (!lang) {
            // no language, no highlight
            if (callback) {
                callback(null, code);
                return;
            } else {
                return code;
            }
        }
        Mode.ensure(lang).then(spec => {
          let el = document.createElement('div');
          if (!spec) {
              console.log(`No CodeMirror mode: ${lang}`);
              callback(null, code);
              return;
          }
          try {
            Mode.run(code, spec.mime, el);
            callback(null, el.innerHTML);
          } catch (err) {
            console.log(`Failed to highlight ${lang} code`, err);
            callback(err, code);
          }
        }).catch(err => {
          console.log(`No CodeMirror mode: ${lang}`);
          console.log(`Require CodeMirror mode error: ${err}`);
          callback(null, code);
        });
      }
    });
  }

  /**
   * Render markdown for the specified content.
   *
   * @param content - The string of markdown to render.
   *
   * @return A promise which resolves with the rendered content.
   */
  export
  function renderMarked(content: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      marked(content, (err: any, content: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }
}
