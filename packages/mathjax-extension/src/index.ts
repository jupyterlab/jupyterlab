// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mathjax-extension
 */

import { PromiseDelegate } from '@lumino/coreutils';

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILatexTypesetter } from '@jupyterlab/rendermime';

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
  protected async _ensureInitialized() {
    if (!this._initialized) {
      this._mathDocument = await Private.ensureMathDocument();
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
    this._mathDocument.clear().render();
    delete this._mathDocument.options.elements;
    Private.hardenAnchorLinks(node);
  }

  protected _initialized: boolean = false;
  protected _mathDocument: MathDocument<any, any, any>;
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
        const md = await typesetter.mathDocument();
        const scale = args['scale'] || 1.0;
        md.outputJax.options.scale = scale;
        md.rerender();

        // Harden only the re-rendered anchors
        for (const math of md.math) {
          const root = math.typesetRoot as HTMLElement | null;
          if (root) {
            Private.hardenAnchorLinks(root);
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
  let _loading: PromiseDelegate<MathDocument<any, any, any>> | null = null;

  export async function ensureMathDocument(): Promise<
    MathDocument<any, any, any>
  > {
    if (!_loading) {
      _loading = new PromiseDelegate();

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

      class EmptyFont extends TeXFont {
        protected static defaultFonts = {} as any;
      }

      const chtml = new CHTML({
        // Override dynamically generated fonts in favor of our font css
        font: new EmptyFont()
      });

      const tex = new TeX({
        packages: AllPackages.concat('require'),
        inlineMath: [
          ['$', '$'],
          ['\\(', '\\)']
        ],
        displayMath: [
          ['$$', '$$'],
          ['\\[', '\\]']
        ],
        processEscapes: true,
        processEnvironments: true
      });

      const mathDocument = mathjax.document(window.document, {
        InputJax: tex,
        OutputJax: chtml
      });

      _loading.resolve(mathDocument);
    }

    return _loading.promise;
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
