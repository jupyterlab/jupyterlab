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

enum CommandIDs {
  copy = 'mathjax:clipboard',
  scale = 'mathjax:scale'
}

/**
 * The MathJax Typesetter.
 */
export class MathJaxTypesetter implements ILatexTypesetter {
  constructor(app: JupyterFrontEnd) {
    app.commands.addCommand(CommandIDs.copy, {
      execute: (args: any) => {
        const md = this._mathDocument;
        const oJax: any = md.outputJax;
        navigator.clipboard.writeText(oJax.math.math);
      },
      label: 'MathJax Copy Latex'
    });

    app.commands.addCommand(CommandIDs.scale, {
      execute: (args: any) => {
        const scale = args['scale'] || 1.0;
        const md = this._mathDocument;
        md.outputJax.options.scale = scale;
        md.rerender();
      },
      label: args =>
        'Mathjax Scale ' + (args['scale'] ? `x${args['scale']}` : 'Reset')
    });
  }

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

    mathjax.handlers.register(SafeHandler(new HTMLHandler(browserAdaptor())));

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
  requires: [],
  provides: ILatexTypesetter,
  activate: (app: JupyterFrontEnd) => new MathJaxTypesetter(app),
  autoStart: true
};

export default mathJaxPlugin;
