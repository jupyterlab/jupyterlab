// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mathjax-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILatexTypesetter } from '@jupyterlab/rendermime';

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
    if (this._initialized) {
      return;
    }

    await import('mathjax-full/js/input/tex/require/RequireConfiguration');
    const { mathjax } = await import('mathjax-full/js/mathjax');
    const { CHTML } = await import('mathjax-full/js/output/chtml');
    const { TeX } = await import('mathjax-full/js/input/tex');
    const { TeXFont } = await import('mathjax-full/js/output/chtml/fonts/tex');
    const { AllPackages } = await import(
      'mathjax-full/js/input/tex/AllPackages'
    );
    const { SafeHandler } = await import('mathjax-full/js/ui/safe/SafeHandler');
    const { HTMLHandler } = await import(
      'mathjax-full/js/handlers/html/HTMLHandler'
    );
    const { browserAdaptor } = await import(
      'mathjax-full/js/adaptors/browserAdaptor'
    );
    const { AssistiveMmlHandler } = await import(
      'mathjax-full/js/a11y/assistive-mml'
    );

    mathjax.handlers.register(
      AssistiveMmlHandler(SafeHandler(new HTMLHandler(browserAdaptor())))
    );

    class EmptyFont extends TeXFont {
      defaultFonts = {};
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

    this._mathDocument = mathjax.document(window.document, {
      InputJax: tex,
      OutputJax: chtml
    });
    this._initialized = true;
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
  activate: (app: JupyterFrontEnd) => {
    const typesetter = new MathJaxTypesetter();

    app.commands.addCommand(CommandIDs.copy, {
      execute: async () => {
        const md = await typesetter.mathDocument();
        const oJax: any = md.outputJax;
        await navigator.clipboard.writeText(oJax.math.math);
      },
      label: 'MathJax Copy Latex'
    });

    app.commands.addCommand(CommandIDs.scale, {
      execute: async (args: CommandArgs.scale) => {
        const md = await typesetter.mathDocument();
        const scale = args['scale'] || 1.0;
        md.outputJax.options.scale = scale;
        md.rerender();
      },
      label: args =>
        'Mathjax Scale ' + (args['scale'] ? `x${args['scale']}` : 'Reset')
    });

    return typesetter;
  },
  autoStart: true
};

export default mathJaxPlugin;
