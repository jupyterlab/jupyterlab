// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import '../style/index.css';

// the MathJax core
import  {MathJax} from "mathjax3/mathjax3/mathjax.js";
// TeX input
import {TeX} from 'mathjax3/mathjax3/input/tex.js';

// HTML output
import {CHTML} from "mathjax3/mathjax3/output/chtml.js";

// handler for HTML documents
import {HTMLHandler} from "mathjax3/mathjax3/handlers/html/HTMLHandler.js";
MathJax.handlers.register(new HTMLHandler());



/**
 * The MathJax 3 Typesetter.
 */
export
class MathJax3Typesetter implements IRenderMime.ILatexTypesetter {

  constructor() {
    // initialize mathjax with with a DOM document (e.g., browser, jsdom); other documents are possible
    this._html = MathJax.document(window.document, {
      InputJax: new TeX({}),
      OutputJax: new CHTML()
    });
    }

  /**
   * Typeset the math in a node.
   */
  typeset(node: HTMLElement): void {
    this._html.findMath()
    .compile()
    .getMetrics()
    .typeset()
    .updateDocument();
  }
  private _html: any;
}

/**
 * The MathJax 3 extension.
 */
const mathJax3Plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.mathjax3',
  requires: [],
  activate: (app: JupyterLab) => {
    const typesetter = new MathJax3Typesetter();
    app.rendermime.latexTypesetter = typesetter;
  },
  autoStart: true
}

export default mathJax3Plugin;
