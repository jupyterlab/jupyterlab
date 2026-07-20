// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @packageDocumentation
 * @module mathjax-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILatexTypesetter } from '@jupyterlab/rendermime';

import type { IRenderMime } from '@jupyterlab/rendermime';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import type { MathDocument } from 'mathjax-full/js/core/MathDocument';

namespace CommandIDs {
  /**
   * Copy raw LaTeX to clipboard.
   */
  export const copy = 'mathjax:clipboard';
  /**
   * Scale MathJax elements.
   */
  export const scale = 'mathjax:scale';
}

namespace CommandArgs {
  export type scale = {
    scale: number;
  };
}

/**
 * The MathJax Typesetter.
 */
export class MathJaxTypesetter implements ILatexTypesetter {
  /**
   * Construct a new MathJax typesetter.
   *
   * @param options - Options describing how math is recognized in the source
   *   text (see {@link MathJaxTypesetter.IOptions}).
   */
  constructor(options: MathJaxTypesetter.IOptions = {}) {
    this.mathParseOptions = {
      dollarInlineMath: options.dollarInlineMath ?? true
    };
  }

  /**
   * The options describing how math is recognized in the source text.
   *
   * Exposed so that the Markdown pre-processor (`removeMath`) and this
   * typesetter agree on whether a single `$` introduces inline math.
   */
  readonly mathParseOptions: IRenderMime.ILatexTypesetter.IMathParseOptions;

  protected async _ensureInitialized() {
    if (!this._initialized) {
      this._mathDocument = await Private.ensureMathDocument(
        this.mathParseOptions.dollarInlineMath === false
          ? Private.INLINE_MATH_WITHOUT_DOLLAR
          : Private.DEFAULT_INLINE_MATH
      );
      this._initialized = true;
    }
  }

  /**
   * Get an instance of the MathDocument object.
   */
  async mathDocument(): Promise<MathDocument<any, any, any>> {
    await this._ensureInitialized();
    return this._mathDocument;
  }

  /**
   * Typeset the math in a node.
   */
  async typeset(node: HTMLElement): Promise<void> {
    try {
      await this._ensureInitialized();
    } catch (e) {
      console.error(e);
      return;
    }

    this._mathDocument.options.elements = [node];
    // `clear()` empties the document's math list before rendering, so that
    // memory retained per math expression (most notably the compiled internal
    // MathML tree) is bounded by the last typeset call rather than growing
    // with the total amount of math on the page.
    // This is also why we need to store the sources manually -
    // we cannot extract them from MathJax state after `clear()`.
    this._mathDocument.clear().render();
    delete this._mathDocument.options.elements;
    Private.recordTexSources(this._mathDocument);
    Private.hardenAnchorLinks(node);
  }

  protected _initialized: boolean = false;
  protected _mathDocument: MathDocument<any, any, any>;
}

/**
 * A namespace for `MathJaxTypesetter` statics.
 */
export namespace MathJaxTypesetter {
  // Extends the provider-agnostic math-parsing options; MathJax-specific
  // options can be added here later in backward-compatible fashion.
  /**
   * Options for constructing a {@link MathJaxTypesetter}.
   */
  export interface IOptions
    extends IRenderMime.ILatexTypesetter.IMathParseOptions {}
}

/**
 * The MathJax extension.
 */
const mathJaxPlugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax-extension:plugin',
  description: 'Provides the LaTeX mathematical expression interpreter.',
  provides: ILatexTypesetter,
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator | null) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    const typesetter = new MathJaxTypesetter();

    app.commands.addCommand(CommandIDs.copy, {
      execute: async () => {
        // Find the math expression the context menu was opened on; this works
        // across all typesetter instances (e.g. ones configured with
        // different delimiters), unlike the fallback below which reflects
        // whichever expression the default typesetter processed last.
        const root = app.contextMenuHitTest(node =>
          node.classList.contains('MathJax')
        );
        const tex = root ? Private.getTexSource(root) : undefined;
        if (tex !== undefined) {
          await navigator.clipboard.writeText(tex);
          return;
        }
        const md = await typesetter.mathDocument();
        const oJax: any = md.outputJax;
        await navigator.clipboard.writeText(oJax.math.math);
      },
      label: trans.__('MathJax Copy Latex'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    app.commands.addCommand(CommandIDs.scale, {
      execute: async (args: CommandArgs.scale) => {
        const scale = args['scale'] || 1.0;
        // Scale all documents so that every typesetter instance (e.g. ones
        // configured with different delimiters) is affected alike.
        for (const md of await Private.getMathDocuments()) {
          md.outputJax.options.scale = scale;
          md.rerender();

          // Harden only the re-rendered anchors
          for (const math of md.math) {
            const root = math.typesetRoot as HTMLElement | null;
            if (root) {
              Private.hardenAnchorLinks(root);
            }
          }
        }
      },
      label: args =>
        trans.__('Mathjax Scale ') +
        (args['scale'] ? `x${args['scale']}` : trans.__('Reset')),
      describedBy: {
        args: {
          type: 'object',
          properties: {
            scale: {
              type: 'number',
              description: trans.__('The scale factor for MathJax rendering')
            }
          }
        }
      }
    });

    return typesetter;
  },
  autoStart: true
};

export default mathJaxPlugin;

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * The default delimiters for inline math.
   */
  export const DEFAULT_INLINE_MATH: [string, string][] = [
    ['$', '$'],
    ['\\(', '\\)']
  ];

  /**
   * The inline math delimiters with the single `$` pair removed, so that `$`
   * is rendered literally.
   */
  export const INLINE_MATH_WITHOUT_DOLLAR: [string, string][] = [
    ['\\(', '\\)']
  ];

  /**
   * Load the MathJax modules and register the document handler.
   *
   * The heavy dynamic imports and the (global, one-time) handler registration
   * are shared across all typesetters; only the per-instance document is built
   * separately in {@link createMathDocument}. The returned bundle's type is
   * inferred so no MathJax types need to be imported explicitly.
   */
  async function loadModules() {
    void import('mathjax-full/js/input/tex/require/RequireConfiguration');

    const [
      { mathjax },
      { CHTML },
      { TeX },
      { TeXFont },
      { AllPackages },
      { SafeHandler },
      { HTMLHandler },
      { browserAdaptor },
      { AssistiveMmlHandler }
    ] = await Promise.all([
      import('mathjax-full/js/mathjax'),
      import('mathjax-full/js/output/chtml'),
      import('mathjax-full/js/input/tex'),
      import('mathjax-full/js/output/chtml/fonts/tex'),
      import('mathjax-full/js/input/tex/AllPackages'),
      import('mathjax-full/js/ui/safe/SafeHandler'),
      import('mathjax-full/js/handlers/html/HTMLHandler'),
      import('mathjax-full/js/adaptors/browserAdaptor'),
      import('mathjax-full/js/a11y/assistive-mml')
    ]);

    mathjax.handlers.register(
      AssistiveMmlHandler(SafeHandler(new HTMLHandler(browserAdaptor())))
    );

    return { mathjax, CHTML, TeX, TeXFont, AllPackages };
  }

  let _loading: ReturnType<typeof loadModules> | null = null;

  /**
   * Ensure the MathJax modules are loaded exactly once per page.
   */
  export function ensureMathModules(): ReturnType<typeof loadModules> {
    if (!_loading) {
      _loading = loadModules();
    }
    return _loading;
  }

  const _documents = new Map<string, Promise<MathDocument<any, any, any>>>();

  /**
   * Get (or lazily create) the MathDocument for the given inline delimiters.
   *
   * Building a MathDocument costs on the order of ~5 ms and retains memory for
   * the lifetime of the page. Caching one document per distinct delimiter
   * configuration keeps that bounded, so constructing many typesetters with
   * the same configuration (for example one per markdown cell across a large
   * notebook) reuses a single document instead of multiplying the time and
   * memory cost.
   */
  export function ensureMathDocument(
    inlineMath: [string, string][]
  ): Promise<MathDocument<any, any, any>> {
    const key = JSON.stringify(inlineMath);
    let document = _documents.get(key);
    if (!document) {
      document = createMathDocument(inlineMath);
      _documents.set(key, document);
    }
    return document;
  }

  /**
   * Get all MathDocuments created so far, so that document-wide commands
   * (e.g. scaling) can operate across every delimiter configuration in use.
   */
  export function getMathDocuments(): Promise<MathDocument<any, any, any>[]> {
    return Promise.all(_documents.values());
  }

  const _texSourceByRoot = new WeakMap<Element, string>();

  /**
   * Record the TeX source of each math expression typeset by `document`,
   * keyed by its rendered container element.
   *
   * A MathDocument only retains the math items from its most recent
   * `render()` call (each `typeset()` starts with `clear()`), so the source
   * of earlier expressions must be captured here for the copy command to
   * find the expression that was actually clicked. Unlike retaining the math
   * items themselves, this only keeps the source string, and the `WeakMap`
   * lets it be reclaimed as soon as the rendered node is garbage-collected.
   */
  export function recordTexSources(
    document: MathDocument<any, any, any>
  ): void {
    for (const item of document.math) {
      if (item.typesetRoot) {
        _texSourceByRoot.set(item.typesetRoot, item.math);
      }
    }
  }

  /**
   * Get the TeX source of the math expression rendered in `root`
   * (a `mjx-container` element), if known.
   */
  export function getTexSource(root: Element): string | undefined {
    return _texSourceByRoot.get(root);
  }

  /**
   * Build a MathDocument configured with the given inline delimiters.
   */
  async function createMathDocument(
    inlineMath: [string, string][]
  ): Promise<MathDocument<any, any, any>> {
    const { mathjax, CHTML, TeX, TeXFont, AllPackages } =
      await ensureMathModules();

    class EmptyFont extends TeXFont {
      protected static defaultFonts = {} as any;
    }

    const chtml = new CHTML({
      // Override dynamically generated fonts in favor of our font css
      font: new EmptyFont()
    });

    const tex = new TeX({
      packages: AllPackages.concat('require'),
      inlineMath,
      displayMath: [
        ['$$', '$$'],
        ['\\[', '\\]']
      ],
      processEscapes: true,
      processEnvironments: true
    });

    return mathjax.document(window.document, {
      InputJax: tex,
      OutputJax: chtml
    });
  }

  /**
   * Utility function to harden anchor links in a given element
   */
  export function hardenAnchorLinks(element: HTMLElement): void {
    const anchors = element.querySelectorAll<HTMLAnchorElement>('.MathJax a');
    anchors.forEach(anchor => {
      // Add rel="noopener" if not already present
      const existingRel = anchor.rel || '';
      const relValues = existingRel.split(/\s+/).filter(v => v.length > 0);

      if (!relValues.includes('noopener')) {
        relValues.push('noopener');
      }

      anchor.rel = relValues.join(' ');

      // Add target="_blank" if not already present
      if (anchor.target !== '_blank') {
        anchor.target = '_blank';
      }
    });
  }
}
