// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEndPlugin, JupyterFrontEnd } from '@jupyterlab/application';

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
 * The MathJax 3 Typesetter.
 */
export class MathJax3Typesetter implements ILatexTypesetter {
  constructor(app: JupyterFrontEnd) {
    const chtml = new CHTML({
      font: new emptyFont(),
    });
    const tex = new TeX({
      packages: AllPackages.concat('require'),
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

    const { commands } = app;

    const mjclipboard: string = 'mathjax:clipboard';
    const mjzoom10: string = 'mathjax:zoom10';
    const mjzoom15: string = 'mathjax:zoom15';

    let that = this;


    app.commands.addCommand(mjclipboard, {
      execute: (args: any) => {
        const md = that._mathDocument;
        const oJax: any = md.outputJax;
        navigator.clipboard.writeText(oJax.math.math);
      },
      label: 'MathJax Copy Latex'
    });

    app.commands.addCommand(mjzoom10, {
      execute: (args: any) => {
        const md = that._mathDocument;
        md.outputJax.options.scale = 1.;
        md.rerender();
      },
      label: 'MathJax Zoom Reset'
    });

    app.commands.addCommand(mjzoom15, {
      execute: (args: any) => {
        const md = that._mathDocument;
        md.outputJax.options.scale = 1.5;
        md.rerender();
      },
      label: 'MathJax Zoom 1.5'
    });

    app.contextMenu.addItem({
      type: 'separator',
      selector: '.jp-Notebook .jp-Cell',
      rank: 12
    });

    app.contextMenu.addItem({
      command: mjclipboard,
      selector: '.MathJax',
      rank: 13
    });

    app.contextMenu.addItem({
      command: mjzoom10,
      selector: '.MathJax',
      rank: 13
    });

    app.contextMenu.addItem({
      command: mjzoom15,
      selector: '.MathJax',
      rank: 13
    });

    app.contextMenu.addItem({
      type: 'separator',
      selector: '.jp-Notebook .jp-Cell',
      rank: 13
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
  activate: (app: JupyterFrontEnd) => new MathJax3Typesetter(app),
  autoStart: true,
};

export default mathJax3Plugin;
