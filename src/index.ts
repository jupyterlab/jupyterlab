// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

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

mathjax.handlers.register(SafeHandler(new HTMLHandler(browserAdaptor())));

// Override dynamically generated fonts in favor
// of our font css that is picked up by webpack.
class emptyFont extends TeXFont {}
(emptyFont as any).defaultFonts = {};

/**
 * The MathJax 3 Typesetter.
 */
export class MathJax3Typesetter implements ILatexTypesetter {
  constructor() {
    const chtml = new CHTML({
      font: new emptyFont(),
    });
    const tex = new TeX({
      packages: AllPackages,
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\[', '\\]'],
      ],
      processEscapes: true,
      processEnvironments: true,
    });
    this._mathDocument = mathjax.document(window.document, {
      InputJax: tex,
      OutputJax: chtml,
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
 * The MathJax 3 extension.
 */
const mathJax3Plugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax3-extension:plugin',
  requires: [],
  provides: ILatexTypesetter,
  activate: () => new MathJax3Typesetter(),
  autoStart: true,
};

export default mathJax3Plugin;
