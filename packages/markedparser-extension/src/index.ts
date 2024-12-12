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
import { LruCache } from '@jupyterlab/coreutils';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { IMarkdownParser } from '@jupyterlab/rendermime';
import { IMermaidMarkdown } from '@jupyterlab/mermaid';

import type {
  marked,
  MarkedExtension,
  MarkedOptions,
  Renderer,
  Token,
  Tokens
} from 'marked';

// highlight cache key separator
const FENCE = '```~~~';

/**
 * An interface for fenced code block renderers.
 */
export interface IFencedBlockRenderer {
  languages: string[];
  rank: number;
  walk: (text: string) => Promise<void>;
  render: (text: string) => string | null;
}

/**
 * Options
 */
export interface IRenderOptions {
  /** handlers for fenced code blocks */
  blocks?: IFencedBlockRenderer[];
}

/**
 * Create a markdown parser
 *
 * @param languages Editor languages
 * @returns Markdown parser
 */
export function createMarkdownParser(
  languages: IEditorLanguageRegistry,
  options?: IRenderOptions
) {
  return {
    render: (content: string): Promise<string> => {
      return Private.render(content, languages, options);
    }
  };
}

/**
 * The markdown parser plugin.
 */
const plugin: JupyterFrontEndPlugin<IMarkdownParser> = {
  id: '@jupyterlab/markedparser-extension:plugin',
  description: 'Provides the Markdown parser.',
  autoStart: true,
  provides: IMarkdownParser,
  requires: [IEditorLanguageRegistry],
  optional: [IMermaidMarkdown],
  activate: (
    app: JupyterFrontEnd,
    languages: IEditorLanguageRegistry,
    mermaidMarkdown: IMermaidMarkdown | null
  ) => {
    return createMarkdownParser(languages, {
      blocks: mermaidMarkdown ? [mermaidMarkdown] : []
    });
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * A namespace for private marked functions
 */
namespace Private {
  let _initializing: PromiseDelegate<typeof marked> | null = null;
  let _marked: typeof marked | null = null;
  let _blocks: IFencedBlockRenderer[] = [];
  let _languages: IEditorLanguageRegistry | null = null;
  let _markedOptions: MarkedOptions = {};
  let _highlights = new LruCache<string, string>();

  export async function render(
    content: string,
    languages: IEditorLanguageRegistry,
    options?: IRenderOptions
  ): Promise<string> {
    _languages = languages;
    if (!_marked) {
      _marked = await initializeMarked(options);
    }
    return _marked(content, _markedOptions);
  }

  /**
   * Load marked lazily and exactly once.
   */
  export async function initializeMarked(
    options?: IRenderOptions
  ): Promise<typeof marked> {
    if (_marked) {
      return _marked;
    }

    if (_initializing) {
      return await _initializing.promise;
    }

    // order blocks by `rank`
    _blocks = options?.blocks || [];
    _blocks = _blocks.sort(
      (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
    );

    _initializing = new PromiseDelegate();

    // load marked lazily, and exactly once
    const [{ marked, Renderer }, plugins] = await Promise.all([
      import('marked'),
      loadMarkedPlugins()
    ]);

    // use load marked plugins
    for (const plugin of plugins) {
      marked.use(plugin);
    }

    // finish marked configuration
    _markedOptions = {
      // use the explicit async paradigm for `walkTokens`
      async: true,
      // enable all built-in GitHub-flavored Markdown opinions
      gfm: true,
      // asynchronously prepare for any special tokens, like highlighting and mermaid
      walkTokens,
      // use custom renderer
      renderer: makeRenderer(Renderer)
    };

    // complete initialization
    _marked = marked;
    _initializing.resolve(_marked);
    return _marked;
  }

  /**
   * Load and use marked plugins.
   *
   * As of writing, both of these features would work without plugins, but emit
   * deprecation warnings.
   */
  async function loadMarkedPlugins(): Promise<MarkedExtension[]> {
    // use loaded marked plugins
    return Promise.all([
      (async () => (await import('marked-gfm-heading-id')).gfmHeadingId())(),
      (async () => (await import('marked-mangle')).mangle())()
    ]);
  }

  /**
   * Build a custom marked renderer.
   */
  function makeRenderer(Renderer_: typeof Renderer): Renderer {
    const renderer = new Renderer_();
    const originalCode = renderer.code;

    renderer.code = ({ text, lang, escaped }) => {
      // handle block renderers
      for (const block of _blocks) {
        if (lang && block.languages.includes(lang)) {
          const rendered = block.render(text);
          if (rendered != null) {
            return rendered;
          }
        }
      }

      // handle known highlighting
      const key = `${lang}${FENCE}${text}${FENCE}`;
      const highlight = _highlights.get(key);
      if (highlight != null) {
        return highlight;
      }

      // fall back to calling with the renderer as `this`
      return originalCode.call(renderer, { text, lang, escaped });
    };

    return renderer;
  }

  /**
   * Apply and cache syntax highlighting for code blocks.
   */
  async function highlight(token: Tokens.Code): Promise<void> {
    const { lang, text } = token;
    if (!lang || !_languages) {
      // no language(s), no highlight
      return;
    }
    const key = `${lang}${FENCE}${text}${FENCE}`;
    if (_highlights.get(key)) {
      // already cached, don't make another DOM element
      return;
    }
    const el = document.createElement('div');
    try {
      await _languages.highlight(text, _languages.findBest(lang), el);
      const html = `<pre><code class="language-${lang}">${el.innerHTML}</code></pre>`;
      _highlights.set(key, html);
    } catch (err) {
      console.error(`Failed to highlight ${lang} code`, err);
    } finally {
      el.remove();
    }
  }

  /**
   * After parsing, lazily load and render or highlight code blocks
   */
  async function walkTokens(token: Token): Promise<void> {
    switch (token.type) {
      case 'code':
        if (token.lang) {
          for (const block of _blocks) {
            if (block.languages.includes(token.lang)) {
              await block.walk(token.text);
              return;
            }
          }
        }
        await highlight(token as Tokens.Code);
    }
  }
}
