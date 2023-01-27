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

// MathJax core
import { mathjax } from 'mathjax-full/js/mathjax';

// TeX input
import { TeX } from 'mathjax-full/js/input/tex';

// HTML output
import { CHTML } from 'mathjax-full/js/output/chtml';

import { TeXFont } from 'mathjax-full/js/output/chtml/fonts/tex';

import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';

import { SafeHandler } from 'mathjax-full/js/ui/safe/SafeHandler';

import { HTMLHandler } from 'mathjax-full/js/handlers/html/HTMLHandler';

import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor';

import 'mathjax-full/js/input/tex/require/RequireConfiguration';

mathjax.handlers.register(SafeHandler(new HTMLHandler(browserAdaptor())));

// Override dynamically generated fonts in favor
// of our font css that is picked up by webpack.
class emptyFont extends TeXFont {}
(emptyFont as any).defaultFonts = {};

/**
 * The MathJax Typesetter.
 */
export class MathJaxTypesetter implements ILatexTypesetter {
  constructor(app: JupyterFrontEnd) {
    const chtml = new CHTML({
      font: new emptyFont()
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

    const mjclipboard = 'mathjax:clipboard';
    const mjscale = 'mathjax:scale';

    app.commands.addCommand(mjclipboard, {
      execute: (args: any) => {
        const md = this._mathDocument;
        const oJax: any = md.outputJax;
        navigator.clipboard.writeText(oJax.math.math);
      },
      label: 'MathJax Copy Latex'
    });

    app.commands.addCommand(mjscale, {
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

  /**
   * Typeset the math in a node.
   */
  typeset(node: HTMLElement): void {
    this._mathDocument.options.elements = [node];
    this._mathDocument.clear().render();
    delete this._mathDocument.options.elements;
  }

  private _mathDocument: ReturnType<typeof mathjax.document>;
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
