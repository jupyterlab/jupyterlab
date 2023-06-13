/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module markedparser-extension
 */

import { PromiseDelegate } from '@lumino/coreutils';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { IMarkdownParser } from '@jupyterlab/rendermime';

import type { marked, Renderer } from 'marked';
import type MermaidType from 'mermaid';

const MERMAID_CLASS = 'jp-RenderedMermaid';
const WARNING_CLASS = 'jp-mod-warning';
const DETAILS_CLASS = 'jp-RenderedMermaid-Details';
const SUMMARY_CLASS = 'jp-RenderedMermaid-Summary';

// values for highlight/diagram cache key and size
const FENCE = '```~~~';
const MAX_CACHE = 256;

// themes
const DEFAULT_THEME = 'default';
const DARK_THEME = 'dark';

/**
 * The markdown parser plugin.
 */
const plugin: JupyterFrontEndPlugin<IMarkdownParser> = {
  id: '@jupyterlab/markedparser-extension:plugin',
  description: 'Provides the Markdown parser.',
  autoStart: true,
  provides: IMarkdownParser,
  requires: [IEditorLanguageRegistry],
  optional: [IThemeManager],
  activate: (
    app: JupyterFrontEnd,
    languages: IEditorLanguageRegistry,
    themes: IThemeManager
  ) => {
    return {
      render: async (content: string): Promise<string> => {
        return await Private.render(content, languages, themes);
      }
    };
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;

namespace Private {
  let _initializing: PromiseDelegate<typeof marked> | null = null;
  let _marked: typeof marked | null = null;
  let _mermaid: typeof MermaidType | null = null;
  let _themes: IThemeManager | null = null;
  let _languages: IEditorLanguageRegistry | null = null;
  let _markedOptions: marked.MarkedOptions = {};
  let _highlights = new Map<string, string>();
  let _diagrams = new Map<string, string>();
  let _nextMermaidId = 0;

  export async function render(
    content: string,
    languages: IEditorLanguageRegistry,
    themes: IThemeManager | null
  ): Promise<string> {
    if (!_marked) {
      _marked = await initializeMarked(languages, themes);
    }
    return _marked(content, _markedOptions);
  }

  /**
   * Load marked lazily and exactly once.
   */
  export async function initializeMarked(
    languages: IEditorLanguageRegistry,
    themes: IThemeManager | null
  ): Promise<typeof marked> {
    if (_marked) {
      return _marked;
    }

    if (_initializing) {
      return await _initializing.promise;
    }

    _initializing = new PromiseDelegate();
    _themes = themes;
    _languages = languages;

    // load marked lazily, and exactly once
    const { marked, Renderer } = await import('marked');

    // finish marked configuration
    _markedOptions = {
      // use the explicit async paradigm for `walkTokens`
      async: true,
      // enable all built-in GitHub-flavored Markdown opinions
      gfm: true,
      // santizing is applied by the sanitizer
      sanitize: false,
      // asynchronously prepare for any special tokens, like mermaid and highlighting
      walkTokens,
      // use custom renderer
      renderer: makeRenderer(Renderer)
    };

    if (themes) {
      // handle changes to theme (e.g. for mermaid theme)
      themes.themeChanged.connect(initMermaid);
    }

    // complete initialization
    _marked = marked;
    _initializing.resolve(_marked);
    return _marked;
  }

  /**
   * Build a custom marked renderer.
   */
  function makeRenderer(Renderer_: typeof Renderer): Renderer {
    const renderer = new Renderer_();
    const originalCode = renderer.code;

    renderer.code = (code: string, language: string) => {
      if (language === 'mermaid' && _mermaid) {
        return cacheGet(_diagrams, code);
      }
      const key = `${language}${FENCE}${code}${FENCE}`;
      const highlight = cacheGet(_highlights, key);
      if (highlight != null) {
        return highlight;
      }
      // call with the renderer as `this`
      return originalCode.call(renderer, code, language);
    };

    return renderer;
  }

  /**
   * Apply and cache syntax highlighting for code blocks.
   */
  async function highlight(token: marked.Tokens.Code): Promise<void> {
    const languages = _languages as IEditorLanguageRegistry;
    const { lang, text } = token;
    if (!lang) {
      // no language, no highlight
      return;
    }
    const key = `${lang}${FENCE}${text}${FENCE}`;
    if (cacheGet(_highlights, key)) {
      // already cached, don't make another DOM element
      return;
    }
    const el = document.createElement('div');
    try {
      await languages.highlight(text, languages.findBest(lang), el);
      const html = `<pre><code class="language-${lang}">${el.innerHTML}</code></pre>`;
      cacheSet(_highlights, key, html);
    } catch (err) {
      console.error(`Failed to highlight ${lang} code`, err);
    } finally {
      el.remove();
    }
  }

  /**
   * After parsing, lazily load and highlight/render code blocks into the cache.
   */
  async function walkTokens(token: marked.Token): Promise<void> {
    switch (token.type) {
      case 'code':
        if (token.lang === 'mermaid') {
          return await handleMermaid(token);
        }
        await highlight(token);
    }
  }

  /**
   * Load mermaid, and then update the diagram cache.
   */
  async function handleMermaid(token: marked.Tokens.Code): Promise<void> {
    if (!_mermaid) {
      _mermaid = (await import('mermaid')).default;
      initMermaid();
    }

    // bail if already cached
    if (cacheGet(_diagrams, token.text)) {
      return;
    }

    let className = MERMAID_CLASS;
    const id = `jp-mermaid-${_nextMermaidId++}`;

    // create temporary element into which to render
    const el = document.createElement('div');
    document.body.appendChild(el);

    let result: HTMLElement | null = null;

    // the element that will be dumped as text
    const output = document.createElement('div');
    output.className = className;

    try {
      const { svg } = await _mermaid.render(id, token.text, el);
      result = makeMermaidImage(svg);
    } catch (err) {
      output.classList.add(WARNING_CLASS);
      result = await makeMermaidError(_mermaid, token.text);
    } finally {
      // always remove the element
      el.remove();
    }

    output.appendChild(result);

    // update the cache for use when rendering
    cacheSet(_diagrams, token.text, output.outerHTML);
  }

  /** Get the parser message from a failed parse
   *
   * This doesn't do much of anything if the text is successfully parsed.
   */
  async function makeMermaidError(
    mermaid: typeof MermaidType,
    text: string
  ): Promise<HTMLElement> {
    let errorMessage = '';
    try {
      await mermaid.parse(text);
    } catch (err) {
      errorMessage = `${err}`;
    }

    const result = document.createElement('details');
    result.className = DETAILS_CLASS;
    const summary = document.createElement('summary');
    summary.className = SUMMARY_CLASS;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerText = text;
    pre.appendChild(code);
    summary.appendChild(pre);
    result.appendChild(summary);

    const warning = document.createElement('pre');
    warning.innerText = errorMessage;
    result.appendChild(warning);
    return result;
  }

  /** Extract extra attributes to add to a generated image.  */
  function makeMermaidImage(svg: string): HTMLImageElement {
    const img = document.createElement('img');
    const maxWidth = svg.match(/max-width: (\d+)/);
    if (maxWidth && maxWidth[1]) {
      const width = parseInt(maxWidth[1]);
      if (width && !Number.isNaN(width) && Number.isFinite(width)) {
        img.width = width;
      }
    }
    img.setAttribute('src', `data:image/svg+xml,${encodeURIComponent(svg)}`);
    return img;
  }

  /**
   * Clear the diagram cache and reconfigure mermaid if loaded.
   */
  function initMermaid() {
    let theme = DEFAULT_THEME;

    if (_themes && _themes.theme) {
      theme = _themes.isLight(_themes.theme) ? DEFAULT_THEME : DARK_THEME;
    }

    if (_mermaid) {
      _diagrams.clear();
      _mermaid.mermaidAPI.initialize({
        theme,
        maxTextSize: 100000,
        startOnLoad: false,
        fontFamily: window
          .getComputedStyle(document.body)
          .getPropertyValue('--jp-ui-font-family')
      });
    }
  }

  /**
   * Restore from cache, and move to the front of the queue.
   */
  function cacheGet<K, V>(cache: Map<K, V>, key: K): V | undefined {
    const item = cache.get(key);
    if (item != null) {
      cache.delete(key);
      cache.set(key, item);
    }
    return item;
  }

  /**
   * Set to the front of the cache queue, potentially evicting the oldest key.
   */
  function cacheSet<K, V>(cache: Map<K, V>, key: K, item: V): void {
    if (cache.size >= MAX_CACHE) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, item);
  }
}
